import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RuleSetList } from './rule-set-list';
import { RuleSetDto } from '../core/models';

const set = (id: number, name: string, updatedAtUtc = '2026-09-11T10:00:00'): RuleSetDto =>
  ({ id, name, enabled: id % 2 === 1, createdAtUtc: updatedAtUtc, updatedAtUtc, rules: [] });

describe('RuleSetList', () => {
  let fixture: ComponentFixture<RuleSetList>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => { fixture = TestBed.createComponent(RuleSetList); });

  it('invites the user to create one when empty', async () => {
    fixture.componentRef.setInput('ruleSets', []);
    await fixture.whenStable();
    expect(el().textContent).toContain('No saved rule sets yet');
  });

  it('lists saved rule sets and emits open and delete', async () => {
    const opened: number[] = [];
    const removed: string[] = [];
    fixture.componentInstance.open.subscribe(id => opened.push(id));
    fixture.componentInstance.remove.subscribe(s => removed.push(s.name));
    fixture.componentRef.setInput('ruleSets', [set(1, 'Duplicates'), set(2, 'Routing')]);
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Duplicates');
    expect(rows[1].textContent).toContain('Disabled');

    (rows[1].querySelectorAll('button')[0] as HTMLButtonElement).click();
    (rows[0].querySelectorAll('button')[1] as HTMLButtonElement).click();
    expect(opened).toEqual([2]);
    expect(removed).toEqual(['Duplicates']);
  });

  it('treats timestamps without a zone as UTC, and leaves zoned ones alone', () => {
    const c = fixture.componentInstance;
    expect(c.asUtc('2026-09-11T10:00:00')).toBe('2026-09-11T10:00:00Z');
    expect(c.asUtc('2026-09-11T10:00:00Z')).toBe('2026-09-11T10:00:00Z');
    expect(c.asUtc('2026-09-11T10:00:00+05:30')).toBe('2026-09-11T10:00:00+05:30');
  });
});
