import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiError, ApiService } from '../core/api.service';
import { EditableRuleSet, fromDto, newRuleSet, toRequest } from '../core/editable';
import { EXAMPLES } from '../core/examples';
import { ErrorMap, SimulationRequest, SimulationResponse } from '../core/models';
import { errorCount, validateRuleSet } from '../core/validation';
import { RuleBuilder } from '../components/rule-builder';
import { SimulationResults } from '../components/simulation-results';

interface LastRun {
  request: Omit<SimulationRequest, 'page' | 'pageSize'>;
  /** What was simulated, to detect edits made after the run. */
  snapshot: string;
  source: string;
}

/**
 * Create or edit one rule set, run it, and see the results below.
 *   /rule-sets/new             blank rule set
 *   /rule-sets/new?example=2   one of the documented example rule sets (unsaved)
 *   /rule-sets/7               saved rule set 7
 */
@Component({
  selector: 'app-rule-set-editor-page',
  imports: [FormsModule, RouterLink, RuleBuilder, SimulationResults],
  templateUrl: './rule-set-editor.page.html',
})
export class RuleSetEditorPage {
  private api = inject(ApiService);
  private router = inject(Router);

  /** Route param: "new" or a rule set id. */
  readonly id = input.required<string>();
  /** Query param: index into EXAMPLES, only with id "new". */
  readonly example = input<string | undefined>(undefined);

  readonly examples = EXAMPLES;
  readonly currentId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly notFound = signal(false);

  // Builder. The model is a plain object edited in place by the form; `version` is bumped
  // on every edit so the computed values below re-run.
  readonly model = signal<EditableRuleSet>(newRuleSet());
  private readonly version = signal(0);
  /** The builder's content when it was last loaded or saved. Differs from `snapshot` after an edit. */
  private readonly baseline = signal<string>(JSON.stringify(toRequest(newRuleSet())));
  readonly attempted = signal(false);
  private readonly serverErrors = signal<ErrorMap>({});

  // Simulation
  readonly result = signal<SimulationResponse | null>(null);
  readonly lastRun = signal<LastRun | null>(null);
  readonly pageSize = signal(50);

  // Status
  readonly busy = signal(false);
  readonly message = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  readonly snapshot = computed(() => { this.version(); return JSON.stringify(toRequest(this.model())); });
  readonly validation = computed(() => { this.version(); return validateRuleSet(toRequest(this.model())); });
  readonly problemCount = computed(() => errorCount(this.validation().all));
  readonly dirty = computed(() => this.snapshot() !== this.baseline());
  readonly stale = computed(() => !!this.lastRun() && this.lastRun()!.snapshot !== this.snapshot());

  /** Errors shown in the builder: live problems while typing, everything after a save/run attempt, plus server errors. */
  readonly visibleErrors = computed<ErrorMap>(() => {
    const client = this.attempted() ? this.validation().all : this.validation().live;
    const merged: ErrorMap = { ...client };
    for (const [k, v] of Object.entries(this.serverErrors())) merged[k] = [...(merged[k] ?? []), ...v];
    return merged;
  });

  constructor() {
    // Load whatever the URL points at, whenever it changes.
    effect(() => {
      const id = this.id();
      const example = this.example();
      untracked(() => this.loadFromUrl(id, example));
    });
  }

  /** Used by the route's canDeactivate guard. */
  canLeave(): boolean {
    return !this.dirty() || confirm('You have unsaved changes to this rule set. Leave without saving?');
  }

  onEdit() {
    this.version.update(v => v + 1);
    this.serverErrors.set({});
  }

  // --- loading ---

  private loadFromUrl(id: string, example: string | undefined) {
    // Just saved a new rule set and the URL moved to its id: the page already shows it,
    // along with the "Saved" message and any results, so leave everything as it is.
    if (id !== 'new' && Number(id) === this.currentId()) return;

    this.notFound.set(false);
    this.message.set(null);

    if (id === 'new') {
      const ex = example !== undefined ? this.examples[+example] : undefined;
      this.setModel(ex ? fromDto(ex.ruleSet) : newRuleSet(), null, null);
      if (ex) this.message.set({ kind: 'ok', text: `Loaded the "${ex.label}" example. It isn't saved; run it as a draft or save it.` });
      return;
    }

    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) { this.notFound.set(true); return; }

    this.loading.set(true);
    this.api.getRuleSet(numericId).subscribe({
      next: dto => { this.loading.set(false); this.setModel(fromDto(dto), dto.id, null); },
      error: (e: ApiError) => {
        this.loading.set(false);
        this.notFound.set(true);
        this.message.set({ kind: 'error', text: e.message });
      },
    });
  }

  startNew() {
    // Already on a blank new rule set: the URL won't change, so reset in place.
    if (this.id() === 'new' && this.example() === undefined) {
      if (this.canLeave()) { this.setModel(newRuleSet(), null, null); this.message.set(null); }
      return;
    }
    this.router.navigate(['/rule-sets', 'new']);
  }

  loadExample(index: string) {
    if (index === '') return;
    this.router.navigate(['/rule-sets', 'new'], { queryParams: { example: index } });
  }

  // --- saving ---

  save(asNew = false) {
    if (!this.checkValid('saving')) return;
    const body = toRequest(this.model());
    const id = this.currentId();
    const isUpdate = id !== null && !asNew;
    const call = isUpdate ? this.api.updateRuleSet(id, body) : this.api.createRuleSet(body);
    this.busy.set(true);
    call.subscribe({
      next: dto => {
        this.busy.set(false);
        this.setModel(fromDto(dto), dto.id, this.lastRun());
        this.message.set({ kind: 'ok', text: `Saved "${dto.name}".` });
        // A newly created rule set gets its own URL. The page stays as it is (see loadFromUrl).
        if (!isUpdate) this.router.navigate(['/rule-sets', dto.id], { replaceUrl: this.id() === 'new' });
      },
      error: (e: ApiError) => this.fail(e),
    });
  }

  // --- simulation ---

  run() {
    if (!this.checkValid('running')) return;
    const id = this.currentId();
    // An unchanged saved rule set runs by id; anything else runs as an unsaved draft.
    const useSaved = id !== null && !this.dirty();
    this.lastRun.set({
      request: useSaved ? { ruleSetId: id, draft: null } : { ruleSetId: null, draft: toRequest(this.model()) },
      snapshot: this.snapshot(),
      source: useSaved ? `saved rule set "${this.model().name}"` : `unsaved draft "${this.model().name}"`,
    });
    this.fetchPage(1);
  }

  /** Paging re-runs exactly what was last simulated, even if the builder has changed since. */
  fetchPage(page: number) {
    const last = this.lastRun();
    if (!last) return;
    this.busy.set(true);
    this.api.simulate({ ...last.request, page, pageSize: this.pageSize() }).subscribe({
      next: res => {
        this.busy.set(false);
        this.result.set(res);
        this.message.set(null);
        if (page === 1) setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }));
      },
      error: (e: ApiError) => this.fail(e),
    });
  }

  changePageSize(size: number) {
    this.pageSize.set(size);
    this.fetchPage(1);
  }

  // --- helpers ---

  private setModel(model: EditableRuleSet, id: number | null, keepRun: LastRun | null) {
    this.model.set(model);
    this.currentId.set(id);
    this.attempted.set(false);
    this.serverErrors.set({});
    if (!keepRun) { this.lastRun.set(null); this.result.set(null); }
    this.version.update(v => v + 1);
    this.baseline.set(this.snapshot());
  }

  private checkValid(action: string): boolean {
    this.attempted.set(true);
    const n = this.problemCount();
    if (n > 0) {
      this.message.set({ kind: 'error', text: `Fix ${n} ${n === 1 ? 'problem' : 'problems'} in the rule set before ${action}. They're marked in red.` });
      return false;
    }
    return true;
  }

  private fail(e: ApiError) {
    this.busy.set(false);
    this.serverErrors.set(e.fieldErrors);
    const n = errorCount(e.fieldErrors);
    this.message.set({ kind: 'error', text: n ? `${e.message} ${n} ${n === 1 ? 'problem is' : 'problems are'} marked in red.` : e.message });
  }
}
