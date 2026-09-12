import { ConditionDto, RuleRequest, RuleSetRequest } from './models';
import { errorCount, validateRuleSet } from './validation';

const C0 = 'rules[0].conditions[0]';

function set(conditions: ConditionDto[], rule: Partial<RuleRequest> = {}): RuleSetRequest {
  return {
    name: 'Set', enabled: true,
    rules: [{ name: 'R', priority: 100, enabled: true, conditionJoin: 'AND', action: 'AUTO_DECLINE', displayOrder: 1, conditions, ...rule }],
  };
}
const cond = (field: string, operator: string, value: string | null = null, values: string[] | null = null) =>
  ({ field, operator, value, values }) as ConditionDto;

describe('validateRuleSet', () => {
  it('accepts a valid rule set', () => {
    const r = validateRuleSet(set([
      cond('declared_value', 'GTE', '10000'),
      cond('region', 'IN', null, ['NA', 'EMEA']),
      cond('item_code', 'EQUALS', 'ITM-4821'),
      cond('flagged_duplicate', 'IS_TRUE'),
    ]));
    expect(r.all).toEqual({});
  });

  describe('the spec\'s nonsense examples', () => {
    it('rejects declared_value in [NA, EMEA]', () => {
      const r = validateRuleSet(set([cond('declared_value', 'IN', null, ['NA', 'EMEA'])]));
      expect(r.all[`${C0}.operator`]).toBeDefined();
    });

    it('rejects a rule with no conditions', () => {
      expect(validateRuleSet(set([])).all['rules[0].conditions']).toBeDefined();
    });

    it('rejects a non-numeric value in a > comparison', () => {
      const r = validateRuleSet(set([cond('quantity', 'GT', 'abc')]));
      expect(r.all[`${C0}.value`][0]).toContain('is not a number');
    });
  });

  it('requires a rule set name, rule name and action', () => {
    const r = validateRuleSet({ ...set([cond('quantity', 'GT', '1')], { name: '', action: '' as never }), name: '' });
    expect(Object.keys(r.all)).toEqual(expect.arrayContaining(['name', 'rules[0].name', 'rules[0].action']));
  });

  it('requires at least one rule', () => {
    expect(validateRuleSet({ name: 'Set', enabled: true, rules: [] }).all['rules']).toBeDefined();
  });

  it('requires a whole-number priority', () => {
    expect(validateRuleSet(set([cond('quantity', 'GT', '1')], { priority: NaN })).all['rules[0].priority']).toBeDefined();
    expect(validateRuleSet(set([cond('quantity', 'GT', '1')], { priority: 1.5 })).all['rules[0].priority']).toBeDefined();
  });

  it('requires a field, then an operator', () => {
    expect(validateRuleSet(set([cond('', '')])).all[`${C0}.field`]).toBeDefined();
    expect(validateRuleSet(set([cond('quantity', '')])).all[`${C0}.operator`]).toBeDefined();
  });

  it('rejects an enum value that is not a member', () => {
    expect(validateRuleSet(set([cond('region', 'EQUALS', 'MARS')])).all[`${C0}.value`]).toBeDefined();
  });

  it('requires at least one value for list operators', () => {
    expect(validateRuleSet(set([cond('region', 'IN', null, [])])).all[`${C0}.values`]).toBeDefined();
    expect(validateRuleSet(set([cond('item_code', 'NOT_IN', null, [])])).all[`${C0}.values`]).toBeDefined();
  });

  it('uses the same error paths as the API for later rules and conditions', () => {
    const s = set([cond('quantity', 'GT', '1')]);
    s.rules.push({ ...s.rules[0], displayOrder: 2, conditions: [cond('quantity', 'GT', '1'), cond('quantity', 'GT', 'x')] });
    expect(Object.keys(validateRuleSet(s).all)).toEqual(['rules[1].conditions[1].value']);
  });

  describe('live vs all', () => {
    it('shows wrong values immediately', () => {
      const r = validateRuleSet(set([cond('quantity', 'GT', 'abc')]));
      expect(r.live[`${C0}.value`]).toBeDefined();
    });

    it('holds back "missing" errors until the user tries to save or run', () => {
      const r = validateRuleSet(set([cond('quantity', 'GT', '')], { name: '' }));
      expect(r.all[`${C0}.value`]).toBeDefined();
      expect(r.all['rules[0].name']).toBeDefined();
      expect(r.live).toEqual({});
    });
  });

  it('counts every message', () => {
    expect(errorCount({ a: ['x', 'y'], b: ['z'] })).toBe(3);
    expect(errorCount({})).toBe(0);
  });
  describe('live vs all', () => {
    it('shows wrong values immediately', () => {
      const r = validateRuleSet(set([cond('quantity', 'GT', 'abc')]));
      expect(r.live[`${C0}.value`]).toBeDefined();
    });

    it('holds back "missing" errors until the user tries to save or run', () => {
      const r = validateRuleSet(set([cond('quantity', 'GT', '')], { name: '' }));
      expect(r.all[`${C0}.value`]).toBeDefined();
      expect(r.all['rules[0].name']).toBeDefined();
      expect(r.live).toEqual({});
    });

    it('rejects item_code with GT operator', () => {
      const r = validateRuleSet(set([cond('item_code', 'GT', 'abc')]));
      expect(r.live[`${C0}.operator`]).toBeDefined();
    });

    it('accepts item_code with EQUALS operator', () => {
      const r = validateRuleSet(set([cond('item_code', 'EQUALS', 'ITM-123')]));
      expect(r.live).toEqual({});
    });
  });
});
