import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimulationResults } from './simulation-results';
import { SimulationResponse } from '../core/models';

function response(overrides: Partial<SimulationResponse['changedDecisions']> = {}): SimulationResponse {
  return {
    datasetCount: 25000,
    summary: { AUTO_APPROVE: 0, AUTO_DECLINE: 384, ROUTE_SPECIALIST: 0, MANUAL_REVIEW: 0, NO_MATCH: 24616 },
    baselineComparison: { agreementCount: 17450, agreementRate: 0.698, changedDecisionCount: 7550 },
    ruleAttribution: [
      { ruleId: 1, ruleName: 'Decline undocumented duplicates', enabled: true, firedCount: 384, firedRate: 0.0154 },
      { ruleId: 2, ruleName: 'Switched off', enabled: false, firedCount: 0, firedRate: 0 },
    ],
    changedDecisions: {
      page: 1, pageSize: 50, total: 7550, totalPages: 151,
      items: [{ requestId: 'REQ-100006', projectedAction: 'NO_MATCH', winningRule: null, recordedOutcome: 'AUTO_APPROVED',
                region: 'NA', accountTier: 'GOLD', channel: 'PORTAL', declaredValue: 39.36 }],
      ...overrides,
    },
  };
}

describe('SimulationResults', () => {
  let fixture: ComponentFixture<SimulationResults>;
  let pages: number[];
  const text = () => (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
  /** Every table row as its cells joined by single spaces, e.g. "Auto-decline 384 1.5%". */
  const rows = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tr')).map(tr =>
    Array.from(tr.children).map(c => c.textContent!.replace(/\s+/g, ' ').trim()).join(' '));
  const button = (label: string) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b => b.textContent!.trim() === label)!;

  async function render(r: SimulationResponse, source = 'unsaved draft "Test"') {
    fixture.componentRef.setInput('result', r);
    fixture.componentRef.setInput('source', source);
    await fixture.whenStable();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(SimulationResults);
    pages = [];
    fixture.componentInstance.pageChange.subscribe(p => pages.push(p));
  });

  it('shows the summary, baseline comparison and dataset size', async () => {
    await render(response());
    expect(text()).toContain('against 25,000 historical requests');
    expect(rows()).toContain('Auto-decline 384 1.5%');
    expect(rows()).toContain('No rule matched (manual queue) 24,616 98.5%');
    expect(rows()).toContain('Same decision as recorded 17,450');
    expect(rows()).toContain('Agreement rate 69.8%');
    expect(rows()).toContain('Decision would change 7,550');
  });

  it('shows changed decisions in plain words, side by side', async () => {
    await render(response());
    expect(rows()).toContain('REQ-100006 Auto-approved No rule matched (manual queue) (none) NA GOLD PORTAL 39.36');
    expect(text()).toContain('Page 1 of 151');
  });

  it('pages forward and back, and not past either end', async () => {
    await render(response());
    expect(button('Previous').disabled).toBe(true);
    button('Next').click();
    button('Last').click();
    expect(pages).toEqual([2, 151]);

    fixture.componentInstance.goTo(0);
    fixture.componentInstance.goTo(152);
    expect(pages).toEqual([2, 151]);
  });

  it('asks for a new page size', async () => {
    const sizes: number[] = [];
    fixture.componentInstance.pageSizeChange.subscribe(s => sizes.push(s));
    await render(response());
    const select = (fixture.nativeElement as HTMLElement).querySelector('select')!;
    select.value = '100';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(sizes).toEqual([100]);
  });

  it('says so when no decisions would change', async () => {
    await render(response({ total: 0, totalPages: 0, items: [] }));
    expect(text()).toContain('No decisions would change.');
    expect(button('Next')).toBeUndefined();
  });

  it('warns when the rules were edited after the run', async () => {
    await render(response());
    expect(text()).not.toContain('has been edited since this run');
    fixture.componentRef.setInput('stale', true);
    await fixture.whenStable();
    expect(text()).toContain('has been edited since this run');
  });

  describe('per-rule notes (the cases the spec says a manager must see)', () => {
    const note = (r: { enabled: boolean; firedCount: number; firedRate: number }) =>
      fixture.componentInstance.attributionNote(r);

    it('flags disabled rules', () => expect(note({ enabled: false, firedCount: 0, firedRate: 0 })).toContain('Disabled'));
    it('flags rules that never fire', () => expect(note({ enabled: true, firedCount: 0, firedRate: 0 })).toContain('Never fired'));
    it('flags rules firing on 90% or more', () => expect(note({ enabled: true, firedCount: 22500, firedRate: 0.9 })).toContain('90%'));
    it('flags broad rules', () => expect(note({ enabled: true, firedCount: 6798, firedRate: 0.2719 })).toContain('Broad'));
    it('says nothing about ordinary rules', () => expect(note({ enabled: true, firedCount: 384, firedRate: 0.0154 })).toBe(''));

    it('shows the note in the table', async () => {
      await render(response());
      expect(rows()).toContain('Switched off 0 0.0% Disabled, so it was not evaluated.');
    });
  });
});
