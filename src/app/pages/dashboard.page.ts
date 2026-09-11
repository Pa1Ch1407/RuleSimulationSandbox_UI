import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError, ApiService } from '../core/api.service';
import { RuleSetDto } from '../core/models';
import { RuleSetList } from '../components/rule-set-list';

/** Dashboard: every saved rule set, with a way to start a new one. */
@Component({
  selector: 'app-dashboard-page',
  imports: [RuleSetList],
  template: `
    <section>
      <div class="section-head">
        <h2>Rule sets</h2>
        <button type="button" class="primary" (click)="startNew()">Start a new rule set</button>
      </div>

      @if (message(); as m) {
        <p [class]="m.kind === 'error' ? 'error banner' : 'ok banner'" role="status">{{ m.text }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading rule sets…</p>
      } @else {
        <app-rule-set-list [ruleSets]="ruleSets()" (open)="open($event)" (remove)="remove($event)" />
      }
    </section>
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly ruleSets = signal<RuleSetDto[]>([]);
  readonly loading = signal(true);
  readonly message = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.api.listRuleSets().subscribe({
      next: sets => { this.ruleSets.set(sets); this.loading.set(false); },
      error: (e: ApiError) => { this.loading.set(false); this.message.set({ kind: 'error', text: e.message }); },
    });
  }

  startNew() { this.router.navigate(['/rule-sets', 'new']); }

  open(id: number) { this.router.navigate(['/rule-sets', id]); }

  remove(set: RuleSetDto) {
    if (!confirm(`Delete "${set.name}"? This can't be undone.`)) return;
    this.api.deleteRuleSet(set.id).subscribe({
      next: () => { this.message.set({ kind: 'ok', text: `Deleted "${set.name}".` }); this.load(); },
      error: (e: ApiError) => this.message.set({ kind: 'error', text: e.message }),
    });
  }
}
