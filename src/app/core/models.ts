// Shapes of the API's JSON. Mirrors src/RuleSimulation.Api/Contracts.

export type RuleAction = 'AUTO_APPROVE' | 'AUTO_DECLINE' | 'ROUTE_SPECIALIST' | 'MANUAL_REVIEW';
export type ConditionJoin = 'AND' | 'OR';
export type ConditionOperator =
  | 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE'
  | 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN'
  | 'IS_TRUE' | 'IS_FALSE';

export interface ConditionDto {
  field: string;
  operator: ConditionOperator;
  value: string | null;
  values: string[] | null;
}

export interface RuleRequest {
  name: string;
  priority: number;
  enabled: boolean;
  conditionJoin: ConditionJoin;
  action: RuleAction;
  displayOrder: number;
  conditions: ConditionDto[];
}

/** Body for POST/PUT /api/rule-sets, and the `draft` of a simulation. */
export interface RuleSetRequest {
  name: string;
  enabled: boolean;
  rules: RuleRequest[];
}

export interface RuleDto extends RuleRequest { id: number; }

export interface RuleSetDto {
  id: number;
  name: string;
  enabled: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
  rules: RuleDto[];
}

export interface SimulationRequest {
  ruleSetId: number | null;
  draft: RuleSetRequest | null;
  page: number;
  pageSize: number;
}

export interface ChangedDecision {
  requestId: string;
  projectedAction: string;
  winningRule: string | null;
  recordedOutcome: string;
  region: string | null;
  accountTier: string;
  channel: string;
  declaredValue: number;
}

export interface SimulationResponse {
  datasetCount: number;
  summary: Record<string, number>;
  baselineComparison: { agreementCount: number; agreementRate: number; changedDecisionCount: number };
  ruleAttribution: { ruleId: number; ruleName: string; enabled: boolean; firedCount: number; firedRate: number }[];
  changedDecisions: { page: number; pageSize: number; total: number; totalPages: number; items: ChangedDecision[] };
}

/** Validation errors keyed by JSON path, e.g. "rules[0].conditions[1].value". Same keys as the API. */
export type ErrorMap = Record<string, string[]>;
