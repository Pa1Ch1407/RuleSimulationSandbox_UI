import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { routes } from './app.routes';
import { ApiService } from './core/api.service';
import { DashboardPage } from './pages/dashboard.page';
import { RuleSetEditorPage } from './pages/rule-set-editor.page';
import { mockApi } from './testing/api-mock';

describe('routes', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: mockApi() }, provideRouter(routes, withComponentInputBinding())],
    });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the dashboard at /', async () => {
    expect(await harness.navigateByUrl('/', DashboardPage)).toBeInstanceOf(DashboardPage);
  });

  it('opens the editor for new and saved rule sets, passing the id and example through', async () => {
    const page = await harness.navigateByUrl('/rule-sets/new?example=2', RuleSetEditorPage);
    expect(page.id()).toBe('new');
    expect(page.example()).toBe('2');
    const saved = await harness.navigateByUrl('/rule-sets/7', RuleSetEditorPage);
    expect(saved.id()).toBe('7');
  });

  it('sends unknown URLs to the dashboard', async () => {
    await harness.navigateByUrl('/nowhere');
    expect(router.url).toBe('/');
  });

  it('keeps the user on the editor when they cancel leaving with unsaved changes', async () => {
    const page = await harness.navigateByUrl('/rule-sets/7', RuleSetEditorPage);
    page.model().name = 'Edited';
    page.onEdit();

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/rule-sets/7');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/');
  });

  it('also asks when switching to an example from an edited rule set', async () => {
    const page = await harness.navigateByUrl('/rule-sets/new', RuleSetEditorPage);
    page.model().name = 'Unsaved draft';
    page.onEdit();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await harness.navigateByUrl('/rule-sets/new?example=1');
    expect(confirm).toHaveBeenCalled();
    expect(router.url).toBe('/rule-sets/new');
  });
});
