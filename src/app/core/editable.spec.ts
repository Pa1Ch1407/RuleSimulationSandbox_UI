import { fromDto, newCondition, newRule, newRuleSet, toRequest } from './editable';
import { RuleSetRequest } from './models';

describe('editable model', () => {
  it('starts a new rule set with one rule and one empty condition', () => {
    const s = newRuleSet();
    expect(s.rules.length).toBe(1);
    expect(s.rules[0].conditions.length).toBe(1);
    expect(s.rules[0].priority).toBe(100);
    expect(s.rules[0].conditions[0].field).toBe('');
  });

  it('gives every rule and condition a unique id for list tracking', () => {
    const ids = [newRule().uid, newRule().uid, newCondition().uid, newCondition().uid];
    expect(new Set(ids).size).toBe(4);
  });

  describe('toRequest', () => {
    it('sets displayOrder from on-screen position, so order is the tie-break', () => {
      const s = newRuleSet();
      s.rules.push(newRule(), newRule());
      expect(toRequest(s).rules.map(r => r.displayOrder)).toEqual([1, 2, 3]);
    });

    it('trims names', () => {
      const s = newRuleSet();
      s.name = '  My set  ';
      s.rules[0].name = ' Rule ';
      const r = toRequest(s);
      expect(r.name).toBe('My set');
      expect(r.rules[0].name).toBe('Rule');
    });

    it('turns an empty priority into NaN so validation catches it instead of sending 0', () => {
      const s = newRuleSet();
      s.rules[0].priority = null;
      expect(toRequest(s).rules[0].priority).toBeNaN();
    });

    it('sends value only for single-value operators', () => {
      const s = newRuleSet();
      Object.assign(s.rules[0].conditions[0], { field: 'declared_value', operator: 'GTE', value: ' 10000 ' });
      expect(toRequest(s).rules[0].conditions[0]).toEqual({ field: 'declared_value', operator: 'GTE', value: '10000', values: null });
    });

    it('sends nothing for boolean operators', () => {
      const s = newRuleSet();
      Object.assign(s.rules[0].conditions[0], { field: 'flagged_duplicate', operator: 'IS_TRUE', value: 'leftover' });
      expect(toRequest(s).rules[0].conditions[0]).toEqual({ field: 'flagged_duplicate', operator: 'IS_TRUE', value: null, values: null });
    });

    it('sends the ticked values for list operators on enum fields', () => {
      const s = newRuleSet();
      Object.assign(s.rules[0].conditions[0], { field: 'region', operator: 'IN', values: ['EMEA', 'APAC'] });
      expect(toRequest(s).rules[0].conditions[0].values).toEqual(['EMEA', 'APAC']);
    });

    it('splits the comma-separated box for list operators on free-text fields', () => {
      const s = newRuleSet();
      Object.assign(s.rules[0].conditions[0], { field: 'item_code', operator: 'NOT_IN', valuesText: ' ITM-1, ITM-2 ,, ' });
      expect(toRequest(s).rules[0].conditions[0].values).toEqual(['ITM-1', 'ITM-2']);
    });
  });

  describe('fromDto', () => {
    const dto: RuleSetRequest = {
      name: 'Saved', enabled: false,
      rules: [
        { name: 'Second', priority: 5, enabled: true, conditionJoin: 'OR', action: 'AUTO_APPROVE', displayOrder: 2,
          conditions: [{ field: 'item_code', operator: 'IN', value: null, values: ['ITM-1', 'ITM-2'] }] },
        { name: 'First', priority: 5, enabled: false, conditionJoin: 'AND', action: 'AUTO_DECLINE', displayOrder: 1,
          conditions: [{ field: 'region', operator: 'NOT_IN', value: null, values: ['NA'] }] },
      ],
    };

    it('orders rules by displayOrder', () => {
      expect(fromDto(dto).rules.map(r => r.name)).toEqual(['First', 'Second']);
    });

    it('puts enum lists into checkboxes and text lists into the comma box', () => {
      const s = fromDto(dto);
      expect(s.rules[0].conditions[0].values).toEqual(['NA']);
      expect(s.rules[1].conditions[0].valuesText).toBe('ITM-1, ITM-2');
    });

    it('round-trips through toRequest unchanged', () => {
      const sorted = { ...dto, rules: [dto.rules[1], dto.rules[0]] };
      expect(toRequest(fromDto(dto))).toEqual(sorted);
    });
  });
});
