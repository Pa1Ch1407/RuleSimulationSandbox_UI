import { ConditionJoin, RuleAction, RuleSetDto, RuleSetRequest } from './models';
import { fieldDef, operandKind } from './field-catalog';

// The builder edits these, then converts to the API shape. Kept separate from the
// API types because the form needs extras: stable ids for @for tracking, text for
// numbers while typing, and a comma-separated box for list values on free-text fields.

let nextId = 1;
const uid = () => nextId++;

export interface EditableCondition {
  uid: number;
  field: string;
  operator: string;
  value: string;        // single-value operators
  values: string[];     // IN / NOT_IN on enum fields (checkboxes)
  valuesText: string;   // IN / NOT_IN on free-text fields (comma separated)
}

export interface EditableRule {
  uid: number;
  name: string;
  priority: number | null;
  enabled: boolean;
  conditionJoin: ConditionJoin;
  action: RuleAction | '';
  conditions: EditableCondition[];
}

export interface EditableRuleSet {
  name: string;
  enabled: boolean;
  rules: EditableRule[];
}

export function newCondition(): EditableCondition {
  return { uid: uid(), field: '', operator: '', value: '', values: [], valuesText: '' };
}

export function newRule(priority = 100): EditableRule {
  return { uid: uid(), name: '', priority, enabled: true, conditionJoin: 'AND', action: '', conditions: [newCondition()] };
}

export function newRuleSet(): EditableRuleSet {
  return { name: '', enabled: true, rules: [newRule()] };
}

/**
 * Builder → API body. Rule order on screen becomes displayOrder (1, 2, 3...), so the
 * equal-priority tie-break always matches what the user sees.
 */
export function toRequest(set: EditableRuleSet): RuleSetRequest {
  return {
    name: set.name.trim(),
    enabled: set.enabled,
    rules: set.rules.map((r, i) => ({
      name: r.name.trim(),
      priority: r.priority ?? NaN, // empty box → fails validation instead of silently becoming 0
      enabled: r.enabled,
      conditionJoin: r.conditionJoin,
      action: r.action as RuleAction,
      displayOrder: i + 1,
      conditions: r.conditions.map(c => {
        const kind = operandKind(c.operator);
        const isText = fieldDef(c.field)?.type === 'text';
        return {
          field: c.field,
          operator: c.operator as any,
          value: kind === 'single' ? c.value.trim() : null,
          values: kind !== 'list' ? null
            : isText ? c.valuesText.split(',').map(v => v.trim()).filter(v => v.length > 0)
            : [...c.values],
        };
      }),
    })),
  };
}

/** API → builder, for loading a saved rule set. */
export function fromDto(dto: RuleSetDto | RuleSetRequest): EditableRuleSet {
  return {
    name: dto.name,
    enabled: dto.enabled,
    rules: [...dto.rules]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(r => ({
        uid: uid(),
        name: r.name,
        priority: r.priority,
        enabled: r.enabled,
        conditionJoin: r.conditionJoin,
        action: r.action,
        conditions: r.conditions.map(c => ({
          uid: uid(),
          field: c.field,
          operator: c.operator,
          value: c.value ?? '',
          values: fieldDef(c.field)?.type === 'enum' ? [...(c.values ?? [])] : [],
          valuesText: fieldDef(c.field)?.type === 'text' ? (c.values ?? []).join(', ') : '',
        })),
      })),
  };
}
