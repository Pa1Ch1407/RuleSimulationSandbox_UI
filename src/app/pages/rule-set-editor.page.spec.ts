import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { throwError } from 'rxjs';
import { vi } from 'vitest';
import { RuleSetEditorPage } from './rule-set-editor.page';
import { ApiService } from '../core/api.service';
import { EXAMPLES } from '../core/examples';
import { ApiMock, mockApi } from '../testing/api-mock';

describe('RuleSetEditorPage', () => {
  let fixture: ComponentFixture<RuleSetEditorPage>;
  let page: RuleSetEditorPage;
  let api: ApiMock;
  let navigate: ReturnType<typeof vi.spyOn>;
  const el = () => fixture.nativeElement as HTMLElement;
  const heading = () => el().querySelector('h2')!.textContent!.replace(/\s+/g, ' ').trim();
  const button = (label: string) => Array.from(el().querySelectorAll('button')).find(b => b.textContent!.trim() === label);

  /** Opens the page as the router would, at /rule-sets/:id[?example=]. */
  async function open(id: string, example?: string) {
    fixture = TestBed.createComponent(RuleSetEditorPage);
    page = fixture.componentInstance;
    fixture.componentRef.setInput('id', id);
    if (example !== undefined) fixture.componentRef.setInput('example', example);
    await fixture.whenStable();
  }

  /** Simulates the user editing something in the builder. */
  async function edit(change: () => void) {
    change();
    page.onEdit();
    await fixture.whenStable();
  }

  beforeEach(() => {
    api = mockApi();
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }, provideRouter([])] });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('loading from the URL', () => {
    it('/rule-sets/new starts a blank rule set without calling the API', async () => {
      await open('new');
      expect(heading()).toBe('New rule set');
      expect(page.model().rules.length).toBe(1);
      expect(button('Save')).toBeDefined();
      expect(button('Save as a new rule set')).toBeUndefined();
      expect(api.getRuleSet).not.toHaveBeenCalled();
    });

    it('/rule-sets/new?example=1 loads that example, unsaved', async () => {
      await open('new', '1');
      expect(page.model().name).toBe(EXAMPLES[1].ruleSet.name);
      expect(page.currentId()).toBeNull();
      expect(el().textContent).toContain('It isn\'t saved');
    });

    it('/rule-sets/7 loads the saved rule set for editing', async () => {
      await open('7');
      expect(api.getRuleSet).toHaveBeenCalledWith(7);
      expect(heading()).toBe('Editing "Safer duplicate handling"');
      expect(page.model().rules[0].conditions.map(c => c.field)).toEqual(['flagged_duplicate', 'has_documentation']);
      expect(button('Save changes')).toBeDefined();
      expect(button('Save as a new rule set')).toBeDefined();
    });

    it('shows "not found" for an id the API does not know', async () => {
      api.getRuleSet.mockReturnValue(throwError(() => ({ message: 'Not Found', fieldErrors: {} })));
      await open('999');
      expect(heading()).toBe('Rule set not found');
    });

    it('shows "not found" for an id that is not a number, without calling the API', async () => {
      await open('abc');
      expect(heading()).toBe('Rule set not found');
      expect(api.getRuleSet).not.toHaveBeenCalled();
    });
  });

  describe('running a simulation', () => {
    it('refuses to run an invalid rule set and says how many problems there are', async () => {
      await open('new');
      page.run();
      await fixture.whenStable();
      expect(api.simulate).not.toHaveBeenCalled();
      expect(el().querySelector('.error.banner')!.textContent).toMatch(/Fix \d+ problems in the rule set before running/);
    });

    it('runs an unsaved rule set as a draft, and shows the results below', async () => {
      await open('new', '1');
      page.run();
      await fixture.whenStable();
      expect(api.simulate).toHaveBeenCalledWith(expect.objectContaining({ ruleSetId: null, page: 1, pageSize: 50 }));
      expect(api.simulate.mock.calls[0][0].draft.name).toBe(EXAMPLES[1].ruleSet.name);
      expect(el().querySelector('#results app-simulation-results')).not.toBeNull();
    });

    it('runs an unchanged saved rule set by id', async () => {
      await open('7');
      page.run();
      expect(api.simulate).toHaveBeenCalledWith({ ruleSetId: 7, draft: null, page: 1, pageSize: 50 });
    });

    it('runs a saved rule set with unsaved edits as a draft', async () => {
      await open('7');
      await edit(() => (page.model().name = 'Edited'));
      page.run();
      expect(api.simulate.mock.calls[0][0]).toMatchObject({ ruleSetId: null, draft: { name: 'Edited' } });
    });

    it('pages through what was run, even after later edits, and flags the results as out of date', async () => {
      await open('7');
      page.run();
      await edit(() => (page.model().name = 'Edited later'));
      expect(page.stale()).toBe(true);
      page.fetchPage(2);
      expect(api.simulate).toHaveBeenLastCalledWith({ ruleSetId: 7, draft: null, page: 2, pageSize: 50 });
    });

    it('goes back to page 1 when the page size changes', async () => {
      await open('7');
      page.run();
      page.changePageSize(100);
      expect(api.simulate).toHaveBeenLastCalledWith({ ruleSetId: 7, draft: null, page: 1, pageSize: 100 });
    });
  });

  describe('saving', () => {
    it('creates a new rule set and moves the URL to its id without reloading the page', async () => {
      await open('new', '1');
      page.run();
      page.save();
      await fixture.whenStable();
      expect(api.createRuleSet).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/rule-sets', 9], { replaceUrl: true });

      // The router then sets the new id: the page keeps its message and results, and doesn't refetch.
      fixture.componentRef.setInput('id', '9');
      await fixture.whenStable();
      expect(api.getRuleSet).not.toHaveBeenCalled();
      expect(el().querySelector('.ok.banner')!.textContent).toContain('Saved');
      expect(page.result()).not.toBeNull();
      expect(heading()).toContain('Editing');
    });

    it('updates an existing rule set in place', async () => {
      await open('7');
      await edit(() => (page.model().name = 'Renamed'));
      page.save();
      await fixture.whenStable();
      expect(api.updateRuleSet).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Renamed' }));
      expect(navigate).not.toHaveBeenCalled();
      expect(page.dirty()).toBe(false);
    });

    it('"Save as a new rule set" creates a copy and opens it', async () => {
      await open('7');
      page.save(true);
      expect(api.createRuleSet).toHaveBeenCalled();
      expect(api.updateRuleSet).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/rule-sets', 9], { replaceUrl: false });
    });

    it('does not send an invalid rule set', async () => {
      await open('new');
      page.save();
      expect(api.createRuleSet).not.toHaveBeenCalled();
    });

    it('shows server validation errors next to the right input', async () => {
      api.updateRuleSet.mockReturnValue(throwError(() => ({
        message: 'One or more validation errors occurred.',
        fieldErrors: { 'rules[0].name': ['Rule name is already used.'] },
      })));
      await open('7');
      page.save();
      await fixture.whenStable();
      expect(el().querySelector('.error.banner')!.textContent).toContain('1 problem is marked in red');
      expect(el().querySelector('fieldset.rule')!.textContent).toContain('Rule name is already used.');
    });
  });

  describe('unsaved changes', () => {
    it('lets the user leave freely when nothing changed', async () => {
      const confirm = vi.spyOn(window, 'confirm');
      await open('7');
      expect(page.canLeave()).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('asks before leaving with edits, and respects the answer', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      await open('7');
      await edit(() => (page.model().name = 'Edited'));
      expect(el().textContent).toContain('(unsaved changes)');
      expect(page.canLeave()).toBe(false);
      confirm.mockReturnValue(true);
      expect(page.canLeave()).toBe(true);
    });

    it('"Start a new rule set" on a blank new page resets in place', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      await open('new');
      await edit(() => (page.model().name = 'Draft'));
      page.startNew();
      await fixture.whenStable();
      expect(page.model().name).toBe('');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('"Start a new rule set" from a saved rule set goes to /rule-sets/new', async () => {
      await open('7');
      page.startNew();
      expect(navigate).toHaveBeenCalledWith(['/rule-sets', 'new']);
    });

    it('choosing an example goes to its URL', async () => {
      await open('new');
      page.loadExample('3');
      expect(navigate).toHaveBeenCalledWith(['/rule-sets', 'new'], { queryParams: { example: '3' } });
    });
  });
});
