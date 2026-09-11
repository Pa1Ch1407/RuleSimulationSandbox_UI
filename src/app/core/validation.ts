import { ErrorMap, RuleSetRequest } from './models';
import { OPERATORS, fieldDef, isNumber, operandKind } from './field-catalog';

export interface ValidationResult {
  /** Every problem. Shown once the user has tried to save or run. */
  all: ErrorMap;
  /** Only "this value is wrong" problems, not "this is empty". Shown immediately while typing. */
  live: ErrorMap;
}

/**
 * Client-side mirror of RuleSetValidator.cs, producing the same error paths as the API,
 * so client and server errors appear in the same place. Catches nonsense before anything
 * is sent (spec 3.3): a numeric field with a list operator, an empty condition, a
 * non-numeric value in a comparison.
 */
export function validateRuleSet(set: RuleSetRequest): ValidationResult {
  const all: ErrorMap = {};
  const live: ErrorMap = {};
  const add = (path: string, msg: string, isLive = false) => {
    (all[path] ??= []).push(msg);
    if (isLive) (live[path] ??= []).push(msg);
  };

  if (!set.name) add('name', 'Give the rule set a name.');
  if (set.rules.length === 0) add('rules', 'Add at least one rule.');

  set.rules.forEach((rule, i) => {
    const rp = `rules[${i}]`;
    if (!rule.name) add(`${rp}.name`, 'Give the rule a name.');
    if (!Number.isInteger(rule.priority)) add(`${rp}.priority`, 'Priority must be a whole number, e.g. 100.', true);
    if (!rule.action) add(`${rp}.action`, 'Choose what the rule does.');
    if (rule.conditions.length === 0) add(`${rp}.conditions`, 'Add at least one condition.', true);

    rule.conditions.forEach((c, j) => {
      const cp = `${rp}.conditions[${j}]`;
      const def = fieldDef(c.field);
      if (!def) { add(`${cp}.field`, 'Choose a field.'); return; }
      if (!c.operator) { add(`${cp}.operator`, 'Choose an operator.'); return; }
      if (!OPERATORS[def.type].some(o => o.op === c.operator)) {
        add(`${cp}.operator`, `This operator can't be used with ${def.label.toLowerCase()}.`, true);
        return;
      }

      const kind = operandKind(c.operator);
      if (kind === 'single') {
        const v = c.value ?? '';
        if (!v) add(`${cp}.value`, def.type === 'enum' ? 'Choose a value.' : 'Enter a value.');
        else if (def.type === 'numeric' && !isNumber(v))
          add(`${cp}.value`, `"${v}" is not a number. Use digits only, e.g. 10000 or 99.5.`, true);
        else if (def.type === 'enum' && !def.members!.includes(v))
          add(`${cp}.value`, `Choose one of: ${def.members!.join(', ')}.`, true);
      }
      if (kind === 'list' && (c.values ?? []).length === 0) {
        add(`${cp}.values`, def.type === 'enum' ? 'Tick at least one value.' : 'Enter at least one value, separated by commas.');
      }
    });
  });

  return { all, live };
}

export function errorCount(errors: ErrorMap): number {
  return Object.values(errors).reduce((n, list) => n + list.length, 0);
}
