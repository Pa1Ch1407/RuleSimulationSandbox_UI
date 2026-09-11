import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ACTIONS, FIELDS, OPERATORS, fieldDef, operandKind } from '../core/field-catalog';
import { EditableCondition, EditableRule, EditableRuleSet, newCondition, newRule } from '../core/editable';
import { ErrorMap } from '../core/models';

/**
 * Rule builder: add, remove and reorder rules and conditions; pick field, operator and
 * value; set priority; toggle enabled. Edits the EditableRuleSet in place and emits
 * `changed` after every edit so the parent can re-validate.
 */
@Component({
  selector: 'app-rule-builder',
  imports: [FormsModule],
  templateUrl: './rule-builder.html',
})
export class RuleBuilder {
  readonly model = input.required<EditableRuleSet>();
  readonly errors = input<ErrorMap>({});
  readonly changed = output<void>();

  readonly fields = FIELDS;
  readonly actions = ACTIONS;
  readonly operandKind = operandKind;
  readonly fieldDef = fieldDef;

  operatorsFor(field: string) {
    const def = fieldDef(field);
    return def ? OPERATORS[def.type] : [];
  }

  err(path: string): string[] { return this.errors()[path] ?? []; }

  // --- rules ---
  addRule() {
    const rules = this.model().rules;
    // New rules default to just below the lowest existing priority, so they run last.
    const lowest = rules.length ? Math.min(...rules.map(r => r.priority ?? 0)) : 110;
    rules.push(newRule(Math.max(lowest - 10, 0)));
    this.changed.emit();
  }
  removeRule(i: number) { this.model().rules.splice(i, 1); this.changed.emit(); }
  moveRule(i: number, delta: number) { move(this.model().rules, i, delta); this.changed.emit(); }

  // --- conditions ---
  addCondition(rule: EditableRule) { rule.conditions.push(newCondition()); this.changed.emit(); }
  removeCondition(rule: EditableRule, j: number) { rule.conditions.splice(j, 1); this.changed.emit(); }
  moveCondition(rule: EditableRule, j: number, delta: number) { move(rule.conditions, j, delta); this.changed.emit(); }

  /** A new field may not support the old operator or value, so start the row over. */
  setField(c: EditableCondition, field: string) {
    c.field = field;
    const ops = this.operatorsFor(field);
    c.operator = ops[0]?.op ?? '';
    clearValue(c);
    this.changed.emit();
  }

  /** Switching between single-value and list operators changes the value input. */
  setOperator(c: EditableCondition, operator: string) {
    if (operandKind(c.operator) !== operandKind(operator)) clearValue(c);
    c.operator = operator;
    this.changed.emit();
  }

  toggleValue(c: EditableCondition, member: string, checked: boolean) {
    c.values = checked ? [...c.values, member] : c.values.filter(v => v !== member);
    this.changed.emit();
  }
}

function move<T>(list: T[], i: number, delta: number) {
  const j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}

function clearValue(c: EditableCondition) { c.value = ''; c.values = []; c.valuesText = ''; }
