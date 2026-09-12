Rule Simulation Sandbox UI

Angular 21 app for building rule sets and running simulations against the .NET API.
Works with Node 20.19+, 22.12+ or 24+.


npm install
npm start          
http://localhost:4200


The API must be running at `https://localhost:7001` (`dotnet run --project src/RuleSimulation.Api`
from the repo root). `proxy.conf.json` forwards `/api` there, so no CORS setup is needed.
If your API runs on another port, change `target` in `proxy.conf.json`.

Tests

npm test            # runs once
npx ng test         # watch mode, reruns on save


110 unit tests run with Vitest in jsdom (no browser needed), using Angular's `@angular/build:unit-test` runner.

| File | What it covers |
|---|---|
| `core/field-catalog.spec.ts` | Fields, operators per type, operand kinds, number format (same rule as the API) |
| `core/validation.spec.ts` | The spec's three nonsense examples, required fields, enum members, list values, API-matching error paths, live vs on-submit errors |
| `core/editable.spec.ts` | Builder ↔ API conversion: displayOrder from screen order, value/values per operator, comma lists, round trip |
| `core/api.service.spec.ts` | Endpoints and bodies, ProblemDetails → field errors, "API not running" message |
| `components/rule-builder.spec.ts` | Field → operator → value inputs (placeholder, dropdown, checkboxes, comma box, none), clearing on change, add/remove/reorder, errors next to inputs |
| `components/simulation-results.spec.ts` | Summary, comparison, changed list, paging bounds, page size, empty list, stale notice, per-rule warnings |
| `components/rule-set-list.spec.ts` | List, open, delete, UTC timestamps |
| `pages/dashboard.page.spec.ts` | Loading, errors, new/open navigation, delete with confirmation |
| `pages/rule-set-editor.page.spec.ts` | Loading by URL, not found, draft vs saved runs, paging what was run, create/update/save-as-new, server errors, unsaved-changes checks |
| `app.routes.spec.ts` | Routes, input binding, and the unsaved-changes guard through the real router |

`src/app/testing/api-mock.ts` provides a spy-based `ApiService` and sample API responses for the page tests.

If `npm install` fails with `Cannot read properties of null (reading 'edgesOut')`, that's an npm bug with
jsdom's optional dependencies; `.npmrc` sets `legacy-peer-deps=true` to avoid it.

Pages

| URL | Page |
|---|---|
| `/` | Dashboard: all saved rule sets, with Open, Delete and "Start a new rule set" |
| `/rule-sets/new` | New rule set |
| `/rule-sets/new?example=2` | New rule set pre-filled from one of the documented examples (unsaved) |
| `/rule-sets/7` | Edit saved rule set 7 |

On the editor page, "Run simulation" shows the results below the builder. Saving a new rule set
moves the URL to its id without clearing the page. Leaving the editor with unsaved changes asks
for confirmation.

Structure

- `src/app/app.routes.ts` — the routes above, and the unsaved-changes guard.
- `src/app/pages/dashboard.page.ts` — the dashboard.
- `src/app/pages/rule-set-editor.page.*` — create or edit a rule set, run it, see results.

- `src/app/core/field-catalog.ts` — fields, their types, allowed operators and enum values.
  A copy of the API's `FieldCatalog.cs`; keep the two in sync.
- `src/app/core/validation.ts` — client validation, same rules and error paths as the API's `RuleSetValidator`.
- `src/app/core/editable.ts` — the builder's editable model and conversion to and from the API shape.
- `src/app/core/examples.ts` — the rule sets from `docs/TEST_RULE_SETS.md`.
- `src/app/components/rule-builder.*` — add, remove and reorder rules and conditions.
- `src/app/components/simulation-results.*` — summary, baseline comparison, attribution, paged changed list.
- `src/app/components/rule-set-list.ts` — the saved rule sets table used on the dashboard.
