import { Routes } from '@angular/router';
import { DashboardPage } from './pages/dashboard.page';
import { RuleSetEditorPage } from './pages/rule-set-editor.page';

export const routes: Routes = [
  { path: '', component: DashboardPage, title: 'Rule sets · Rule Simulation Sandbox' },
  {
    // One route for both "new" and an existing id, so saving a new rule set only changes the
    // URL (/rule-sets/new → /rule-sets/7) and keeps the page, including any results, in place.
    path: 'rule-sets/:id',
    component: RuleSetEditorPage,
    title: 'Rule set · Rule Simulation Sandbox',
    // Run the unsaved-changes check on every navigation away, including switching examples.
    runGuardsAndResolvers: 'always',
    canDeactivate: [(page: RuleSetEditorPage) => page.canLeave()],
  },
  { path: '**', redirectTo: '' },
];
