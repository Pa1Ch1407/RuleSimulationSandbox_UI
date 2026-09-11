import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SimulationResponse } from '../core/models';

const OUTCOME_LABELS: Record<string, string> = {
  AUTO_APPROVED: 'Auto-approved',
  AUTO_DECLINED: 'Auto-declined',
  ROUTED_SPECIALIST: 'Routed to specialist',
  MANUAL_APPROVED: 'Manually approved',
  MANUAL_DECLINED: 'Manually declined',
};

const ACTION_LABELS: Record<string, string> = {
  AUTO_APPROVE: 'Auto-approve',
  AUTO_DECLINE: 'Auto-decline',
  ROUTE_SPECIALIST: 'Route to specialist',
  MANUAL_REVIEW: 'Manual review',
  NO_MATCH: 'No rule matched (manual queue)',
};

/**
 * The four results views from spec 3.2: summary, baseline comparison, per-rule
 * attribution, and the paged changed-decision list. Paging asks the parent to re-run the
 * same simulation with a different page; the full list is never sent to the browser.
 */
@Component({
  selector: 'app-simulation-results',
  imports: [DecimalPipe, PercentPipe, FormsModule],
  templateUrl: './simulation-results.html',
})
export class SimulationResults {
  readonly result = input.required<SimulationResponse>();
  readonly source = input<string>('');
  readonly stale = input(false);
  readonly loading = input(false);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly pageSizes = [25, 50, 100, 200];

  readonly summaryRows = computed(() => {
    const r = this.result();
    return Object.keys(ACTION_LABELS).map(key => ({
      label: ACTION_LABELS[key],
      count: r.summary[key] ?? 0,
      share: r.datasetCount ? (r.summary[key] ?? 0) / r.datasetCount : 0,
    }));
  });

  label(action: string): string { return ACTION_LABELS[action] ?? action; }
  outcome(recorded: string): string { return OUTCOME_LABELS[recorded] ?? recorded; }

  /** Flags the two cases the spec calls out: rules that never fire, and rules that fire on nearly everything. */
  attributionNote(rule: { enabled: boolean; firedCount: number; firedRate: number }): string {
    if (!rule.enabled) return 'Disabled, so it was not evaluated.';
    if (rule.firedCount === 0) return 'Never fired. Check its conditions or priority.';
    if (rule.firedRate >= 0.9) return 'Fires on 90% or more of all requests.';
    if (rule.firedRate >= 0.25) return 'Broad: fires on more than a quarter of all requests.';
    return '';
  }

  goTo(page: number) {
    const total = this.result().changedDecisions.totalPages;
    if (page >= 1 && page <= total) this.pageChange.emit(page);
  }
}
