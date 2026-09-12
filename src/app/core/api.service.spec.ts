import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiError, ApiService } from './api.service';
import { RuleSetRequest } from './models';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;
  const body: RuleSetRequest = { name: 'S', enabled: true, rules: [] };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the API\'s rule set endpoints', () => {
    api.listRuleSets().subscribe();
    http.expectOne({ method: 'GET', url: '/api/rule-sets' }).flush([]);

    api.getRuleSet(3).subscribe();
    http.expectOne({ method: 'GET', url: '/api/rule-sets/3' }).flush({});

    api.createRuleSet(body).subscribe();
    const post = http.expectOne({ method: 'POST', url: '/api/rule-sets' });
    expect(post.request.body).toEqual(body);
    post.flush({});

    api.updateRuleSet(3, body).subscribe();
    http.expectOne({ method: 'PUT', url: '/api/rule-sets/3' }).flush({});

    api.deleteRuleSet(3).subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/rule-sets/3' }).flush(null, { status: 204, statusText: 'No Content' });
  });

  it('posts simulations with the page to fetch', () => {
    api.simulate({ ruleSetId: 7, draft: null, page: 2, pageSize: 50 }).subscribe();
    const req = http.expectOne({ method: 'POST', url: '/api/simulations' });
    expect(req.request.body).toEqual({ ruleSetId: 7, draft: null, page: 2, pageSize: 50 });
    req.flush({});
  });

  it('turns ValidationProblemDetails into per-field errors', () => {
    let error: ApiError | undefined;
    api.createRuleSet(body).subscribe({ error: e => (error = e) });
    http.expectOne('/api/rule-sets').flush(
      { title: 'One or more validation errors occurred.', status: 400, errors: { 'rules[0].conditions[0].value': ["'abc' is not a number."] } },
      { status: 400, statusText: 'Bad Request' });
    expect(error!.message).toBe('One or more validation errors occurred.');
    expect(error!.fieldErrors).toEqual({ 'rules[0].conditions[0].value': ["'abc' is not a number."] });
  });

  it('prefers the ProblemDetails detail when there is one', () => {
    let error: ApiError | undefined;
    api.simulate({ ruleSetId: 99, draft: null, page: 1, pageSize: 50 }).subscribe({ error: e => (error = e) });
    http.expectOne('/api/simulations').flush({ title: 'Rule set not found.', status: 404, detail: 'Rule set 99 was not found.' },
      { status: 404, statusText: 'Not Found' });
    expect(error!.message).toBe('Rule set 99 was not found.');
    expect(error!.fieldErrors).toEqual({});
  });

  it('explains how to fix it when the API is not running', () => {
    let error: ApiError | undefined;
    api.listRuleSets().subscribe({ error: e => (error = e) });
    http.expectOne('/api/rule-sets').error(new ProgressEvent('error'), { status: 0 });
    expect(error!.message).toContain("Can't reach the API");
    expect(error!.message).toContain('dotnet run');
  });
});
