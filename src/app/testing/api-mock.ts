import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../core/api.service';
import { RuleSetDto, SimulationResponse } from '../core/models';

/** A saved rule set as the API returns it: "Safer duplicate handling", id 7. */
export function savedRuleSet(overrides: Partial<RuleSetDto> = {}): RuleSetDto {
  return {
    id: 7, name: 'Safer duplicate handling', enabled: true,
    createdAtUtc: '2026-09-11T10:00:00', updatedAtUtc: '2026-09-11T10:00:00',
    rules: [{
      id: 70, name: 'Decline undocumented duplicates', priority: 100, enabled: true, conditionJoin: 'AND',
      action: 'AUTO_DECLINE', displayOrder: 1,
      conditions: [
        { field: 'flagged_duplicate', operator: 'IS_TRUE', value: null, values: null },
        { field: 'has_documentation', operator: 'IS_FALSE', value: null, values: null },
      ],
    }],
    ...overrides,
  };
}

export function simulationResult(page = 1): SimulationResponse {
  return {
    datasetCount: 25000,
    summary: { AUTO_APPROVE: 0, AUTO_DECLINE: 384, ROUTE_SPECIALIST: 0, MANUAL_REVIEW: 0, NO_MATCH: 24616 },
    baselineComparison: { agreementCount: 17450, agreementRate: 0.698, changedDecisionCount: 7550 },
    ruleAttribution: [{ ruleId: 70, ruleName: 'Decline undocumented duplicates', enabled: true, firedCount: 384, firedRate: 0.0154 }],
    changedDecisions: { page, pageSize: 50, total: 7550, totalPages: 151, items: [] },
  };
}

/** An ApiService whose every method is a spy that succeeds by default. */
export function mockApi() {
  return {
    listRuleSets: vi.fn(() => of([savedRuleSet()])),
    getRuleSet: vi.fn((id: number) => of(savedRuleSet({ id }))),
    createRuleSet: vi.fn((body: any) => of(savedRuleSet({ ...body, id: 9, rules: body.rules.map((r: any, i: number) => ({ ...r, id: 90 + i })) }))),
    updateRuleSet: vi.fn((id: number, body: any) => of(savedRuleSet({ ...body, id, rules: body.rules.map((r: any, i: number) => ({ ...r, id: 70 + i })) }))),
    deleteRuleSet: vi.fn(() => of(undefined)),
    simulate: vi.fn((req: any) => of(simulationResult(req.page))),
  } satisfies Record<keyof ApiService, unknown>;
}
export type ApiMock = ReturnType<typeof mockApi>;
