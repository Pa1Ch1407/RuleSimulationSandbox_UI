import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RuleSetDto } from '../core/models';

/** Table of saved rule sets, with open and delete. */
@Component({
  selector: 'app-rule-set-list',
  imports: [DatePipe],
  template: `
    @if (ruleSets().length === 0) {
      <p class="muted">No saved rule sets yet. Choose "Start a new rule set" to build one.</p>
    } @else {
      <table>
        <thead>
          <tr><th>Name</th><th class="num">Rules</th><th>Status</th><th>Last saved</th><th><span class="sr-only">Actions</span></th></tr>
        </thead>
        <tbody>
          @for (s of ruleSets(); track s.id) {
            <tr>
              <td>{{ s.name }}</td>
              <td class="num">{{ s.rules.length }}</td>
              <td>{{ s.enabled ? 'Enabled' : 'Disabled' }}</td>
              <td>{{ asUtc(s.updatedAtUtc) | date: 'medium' }}</td>
              <td class="nowrap">
                <button type="button" (click)="open.emit(s.id)">Open</button>
                <button type="button" (click)="remove.emit(s)">Delete</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class RuleSetList {
  readonly ruleSets = input.required<RuleSetDto[]>();
  readonly open = output<number>();
  readonly remove = output<RuleSetDto>();

  /** The API stores UTC; values read back from SQL Server arrive without a zone marker. */
  asUtc(value: string): string {
    return /(Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + 'Z';
  }
}
