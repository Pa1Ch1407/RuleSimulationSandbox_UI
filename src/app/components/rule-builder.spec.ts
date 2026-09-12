import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RuleBuilder } from './rule-builder';
import { EditableRuleSet, newRuleSet } from '../core/editable';

describe('RuleBuilder', () => {
  let fixture: ComponentFixture<RuleBuilder>;
  let model: EditableRuleSet;
  let changes: number;
  const el = () => fixture.nativeElement as HTMLElement;
  const q = <T extends Element>(sel: string) => el().querySelector(sel) as T;
  const qa = (sel: string) => Array.from(el().querySelectorAll(sel));
  const options = (sel: string) => Array.from(q<HTMLSelectElement>(sel).options).map(o => o.textContent!.trim());
  const button = (text: string, index = 0) =>
    qa('button').filter(b => b.textContent!.trim() === text)[index] as HTMLButtonElement;

  async function choose(sel: string, value: string) {
    const s = q<HTMLSelectElement>(sel);
    s.value = value;
    s.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
  }
  async function type(sel: string, value: string) {
    const i = q<HTMLInputElement>(sel);
    i.value = value;
    i.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }
  async function click(b: HTMLButtonElement) { b.click(); await fixture.whenStable(); }

  const FIELD = 'select[aria-label="Condition 1 field"]';
  const OPERATOR = 'select[aria-label="Condition 1 operator"]';
  const VALUE = '[aria-label="Condition 1 value"]';

  beforeEach(async () => {
    fixture = TestBed.createComponent(RuleBuilder);
    model = newRuleSet();
    changes = 0;
    fixture.componentRef.setInput('model', model);
    fixture.componentInstance.changed.subscribe(() => changes++);
    await fixture.whenStable();
  });

  it('starts with one rule and an empty condition', () => {
    expect(qa('fieldset.rule').length).toBe(1);
    expect(el().textContent).toContain('Choose a field and operator first');
    expect(q<HTMLSelectElement>(OPERATOR).disabled).toBe(true);
  });

  it('offers only numeric operators for a numeric field, with a placeholder', async () => {
    await choose(FIELD, 'declared_value');
    expect(options(OPERATOR)).toEqual(['Choose an operator', '=', '≠', '>', '≥', '<', '≤']);
    expect(model.rules[0].conditions[0].operator).toBe('EQ');
    expect(q<HTMLInputElement>(VALUE).placeholder).toBe('e.g. 10000');
  });

  it('offers a dropdown of allowed values for an enum field with "equals"', async () => {
    await choose(FIELD, 'region');
    expect(options(OPERATOR)).toEqual(['Choose an operator', 'equals', 'does not equal', 'is one of', 'is none of']);
    expect(options(`select${VALUE}`)).toEqual(['Choose a value', 'NA', 'EMEA', 'APAC', 'LATAM']);
  });

  it('offers checkboxes for "is one of" on an enum field, and records ticks', async () => {
    await choose(FIELD, 'account_tier');
    await choose(OPERATOR, 'IN');
    const boxes = qa('[aria-label="Condition 1 values"] input[type=checkbox]') as HTMLInputElement[];
    expect(boxes.length).toBe(4);
    boxes[2].click(); // GOLD
    boxes[3].click(); // PLATINUM
    await fixture.whenStable();
    expect(model.rules[0].conditions[0].values).toEqual(['GOLD', 'PLATINUM']);
  });

  it('offers a comma-separated box for "is one of" on item code', async () => {
    await choose(FIELD, 'item_code');
    await choose(OPERATOR, 'IN');
    expect(q<HTMLInputElement>('[aria-label="Condition 1 values, comma separated"]').placeholder).toBe('e.g. ITM-4821, ITM-1002');
  });

  it('asks for no value on a true/false field', async () => {
    await choose(FIELD, 'flagged_duplicate');
    expect(options(OPERATOR)).toEqual(['Choose an operator', 'is true', 'is false']);
    expect(el().textContent).toContain('No value needed');
  });

  it('clears the old value when the field changes', async () => {
    await choose(FIELD, 'quantity');
    await type(VALUE, '40');
    expect(model.rules[0].conditions[0].value).toBe('40');
    await choose(FIELD, 'channel');
    expect(model.rules[0].conditions[0]).toMatchObject({ field: 'channel', operator: 'EQUALS', value: '' });
  });

  it('clears the value when switching between single and list operators, but not within one kind', async () => {
    await choose(FIELD, 'region');
    await choose(`select${VALUE}`, 'EMEA');
    await choose(OPERATOR, 'NOT_EQUALS');
    expect(model.rules[0].conditions[0].value).toBe('EMEA');
    await choose(OPERATOR, 'IN');
    expect(model.rules[0].conditions[0].value).toBe('');
  });

  it('adds rules below the lowest priority, and can remove them', async () => {
    await click(button('Add rule'));
    expect(model.rules.map(r => r.priority)).toEqual([100, 90]);
    expect(qa('fieldset.rule').length).toBe(2);
    await click(button('Remove rule', 1));
    expect(model.rules.length).toBe(1);
  });

  it('reorders rules, and disables moves past either end', async () => {
    model.rules[0].name = 'A';
    await click(button('Add rule'));
    model.rules[1].name = 'B';
    await fixture.whenStable();
    expect(button('Move rule up', 0).disabled).toBe(true);
    expect(button('Move rule down', 1).disabled).toBe(true);
    await click(button('Move rule down', 0));
    expect(model.rules.map(r => r.name)).toEqual(['B', 'A']);
  });

  it('adds, reorders and removes conditions', async () => {
    model.rules[0].conditions[0].field = 'quantity';
    await click(button('Add condition'));
    model.rules[0].conditions[1].field = 'region';
    await fixture.whenStable();
    await click(qa('button[title="Move condition down"]')[0] as HTMLButtonElement);
    expect(model.rules[0].conditions.map(c => c.field)).toEqual(['region', 'quantity']);
    await click(button('Remove', 0));
    expect(model.rules[0].conditions.map(c => c.field)).toEqual(['quantity']);
  });

  it('tells the parent about every edit', async () => {
    await type('input[placeholder="e.g. Duplicate handling"]', 'My set');
    await choose(FIELD, 'quantity');
    await click(button('Add rule'));
    expect(model.name).toBe('My set');
    expect(changes).toBeGreaterThanOrEqual(3);
  });

  it('shows each error next to the input it belongs to', async () => {
    fixture.componentRef.setInput('errors', {
      name: ['Give the rule set a name.'],
      'rules[0].conditions[0].value': ['"abc" is not a number.'],
    });
    await fixture.whenStable();
    const errors = qa('.error').map(e => e.textContent!.trim());
    expect(errors).toEqual(['Give the rule set a name.', '"abc" is not a number.']);
    expect(q('.conditions').textContent).toContain('"abc" is not a number.');
  });
});
