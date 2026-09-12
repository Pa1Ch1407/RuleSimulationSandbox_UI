import { FIELDS, OPERATORS, fieldDef, isNumber, operandKind } from './field-catalog';

describe('field catalog', () => {
  it('lists every condition field from the dataset', () => {
    expect(FIELDS.map(f => f.name).sort()).toEqual([
      'account_tier', 'channel', 'declared_value', 'flagged_duplicate', 'has_documentation',
      'item_age_days', 'item_class', 'item_code', 'prior_requests_90d', 'quantity', 'region',
    ]);
  });

  it('allows only the spec operators for each field type', () => {
    expect(OPERATORS.numeric.map(o => o.op)).toEqual(['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE']);
    expect(OPERATORS.enum.map(o => o.op)).toEqual(['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN']);
    expect(OPERATORS.text.map(o => o.op)).toEqual(['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN']);
    expect(OPERATORS.boolean.map(o => o.op)).toEqual(['IS_TRUE', 'IS_FALSE']);
  });

  it('knows the allowed values of enum fields', () => {
    expect(fieldDef('region')?.members).toEqual(['NA', 'EMEA', 'APAC', 'LATAM']);
    expect(fieldDef('unknown')).toBeUndefined();
  });

  it('classifies how each operator takes its value', () => {
    expect(operandKind('IS_TRUE')).toBe('none');
    expect(operandKind('IS_FALSE')).toBe('none');
    expect(operandKind('IN')).toBe('list');
    expect(operandKind('NOT_IN')).toBe('list');
    expect(operandKind('GTE')).toBe('single');
    expect(operandKind('EQUALS')).toBe('single');
  });

  describe('isNumber (same rule as the API)', () => {
    it.each(['10000', '99.5', '-1', '+3', '0', '.5', ' 42 '])('accepts %s', v => expect(isNumber(v)).toBe(true));
    it.each(['abc', '1,000', '', '1e5', '10k', '1.2.3', '-'])('rejects "%s"', v => expect(isNumber(v)).toBe(false));
  });
});
