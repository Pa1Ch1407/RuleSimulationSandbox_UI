import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { DashboardPage } from './dashboard.page';
import { ApiService } from '../core/api.service';
import { ApiMock, mockApi, savedRuleSet } from '../testing/api-mock';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let api: ApiMock;
  let navigate: ReturnType<typeof vi.spyOn>;
  const el = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) => Array.from(el().querySelectorAll('button')).find(b => b.textContent!.trim() === label)!;

  async function create() {
    fixture = TestBed.createComponent(DashboardPage);
    await fixture.whenStable();
  }

  beforeEach(() => {
    api = mockApi();
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }, provideRouter([])] });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the "Rule sets" heading with the new button beside it', async () => {
    await create();
    const head = el().querySelector('.section-head')!;
    expect(head.querySelector('h2')!.textContent).toBe('Rule sets');
    expect(head.querySelector('button')!.textContent!.trim()).toBe('Start a new rule set');
  });

  it('lists the saved rule sets from the API', async () => {
    api.listRuleSets.mockReturnValue(of([savedRuleSet(), savedRuleSet({ id: 8, name: 'Specialist routing' })]));
    await create();
    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[1].textContent).toContain('Specialist routing');
  });

  it('shows why the list could not load', async () => {
    api.listRuleSets.mockReturnValue(throwError(() => ({ message: "Can't reach the API.", fieldErrors: {} })));
    await create();
    expect(el().querySelector('.error.banner')!.textContent).toContain("Can't reach the API.");
  });

  it('goes to the new rule set page', async () => {
    await create();
    button('Start a new rule set').click();
    expect(navigate).toHaveBeenCalledWith(['/rule-sets', 'new']);
  });

  it('opens a saved rule set', async () => {
    await create();
    button('Open').click();
    expect(navigate).toHaveBeenCalledWith(['/rule-sets', 7]);
  });

  it('deletes after confirmation, then reloads the list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await create();
    button('Delete').click();
    await fixture.whenStable();
    expect(api.deleteRuleSet).toHaveBeenCalledWith(7);
    expect(api.listRuleSets).toHaveBeenCalledTimes(2);
    expect(el().querySelector('.ok.banner')!.textContent).toContain('Deleted "Safer duplicate handling"');
  });

  it('does not delete when the user cancels', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await create();
    button('Delete').click();
    expect(api.deleteRuleSet).not.toHaveBeenCalled();
  });
});
