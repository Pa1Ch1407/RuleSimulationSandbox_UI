import { ConditionOperator } from './models';

// Client copy of src/RuleSimulation.Api/Rules/FieldCatalog.cs.
// Keep the two in sync: the server re-validates everything, so a mismatch shows up
// as a server error, never as bad data.

export type FieldType = 'numeric' | 'enum' | 'text' | 'boolean';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  /** Allowed values for enum fields. */
  members?: string[];
  /** Placeholder for the value box. */
  placeholder?: string;
}

export const FIELDS: FieldDef[] = [
  { name: 'declared_value', label: 'Declared value (USD)', type: 'numeric', placeholder: 'e.g. 10000' },
  { name: 'quantity', label: 'Quantity', type: 'numeric', placeholder: '1 to 500, e.g. 40' },
  { name: 'item_age_days', label: 'Item age (days)', type: 'numeric', placeholder: '0 to 1200, e.g. 365' },
  { name: 'prior_requests_90d', label: 'Prior requests (90 days)', type: 'numeric', placeholder: 'e.g. 10' },
  { name: 'channel', label: 'Channel', type: 'enum', members: ['PORTAL', 'EMAIL', 'API', 'PHONE'] },
  { name: 'region', label: 'Region', type: 'enum', members: ['NA', 'EMEA', 'APAC', 'LATAM'] },
  { name: 'account_tier', label: 'Account tier', type: 'enum', members: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] },
  { name: 'item_class', label: 'Item class', type: 'enum', members: ['CLASS_A', 'CLASS_B', 'CLASS_C', 'CLASS_D'] },
  { name: 'item_code', label: 'Item code', type: 'text', placeholder: 'e.g. ITM-4821' },
  { name: 'has_documentation', label: 'Has documentation', type: 'boolean' },
  { name: 'flagged_duplicate', label: 'Flagged as duplicate', type: 'boolean' },
];

export interface OperatorDef { op: ConditionOperator; label: string; }

const NUMERIC_OPS: OperatorDef[] = [
  { op: 'EQ', label: '=' }, { op: 'NEQ', label: '≠' },
  { op: 'GT', label: '>' }, { op: 'GTE', label: '≥' },
  { op: 'LT', label: '<' }, { op: 'LTE', label: '≤' },
];
const STRING_OPS: OperatorDef[] = [
  { op: 'EQUALS', label: 'equals' }, { op: 'NOT_EQUALS', label: 'does not equal' },
  { op: 'IN', label: 'is one of' }, { op: 'NOT_IN', label: 'is none of' },
];
const BOOLEAN_OPS: OperatorDef[] = [
  { op: 'IS_TRUE', label: 'is true' }, { op: 'IS_FALSE', label: 'is false' },
];

export const OPERATORS: Record<FieldType, OperatorDef[]> = {
  numeric: NUMERIC_OPS, enum: STRING_OPS, text: STRING_OPS, boolean: BOOLEAN_OPS,
};

export const ACTIONS = [
  { value: 'AUTO_APPROVE', label: 'Auto-approve' },
  { value: 'AUTO_DECLINE', label: 'Auto-decline' },
  { value: 'ROUTE_SPECIALIST', label: 'Route to specialist' },
  { value: 'MANUAL_REVIEW', label: 'Send to manual review' },
] as const;

export function fieldDef(name: string): FieldDef | undefined {
  return FIELDS.find(f => f.name === name);
}

/** How the value is entered for an operator. */
export type OperandKind = 'none' | 'single' | 'list';

export function operandKind(op: string): OperandKind {
  if (op === 'IS_TRUE' || op === 'IS_FALSE') return 'none';
  if (op === 'IN' || op === 'NOT_IN') return 'list';
  return 'single';
}

/** Same rule as the server: optional sign, optional decimal point, no thousands separators. */
export function isNumber(text: string): boolean {
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(text.trim());
}
