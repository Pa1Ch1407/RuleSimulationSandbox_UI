import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ErrorMap, RuleSetDto, RuleSetRequest, SimulationRequest, SimulationResponse } from './models';

/** A failed call, reduced to what the screen needs: a message and any per-field errors. */
export interface ApiError { message: string; fieldErrors: ErrorMap; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  // Relative URL: in development, proxy.conf.json forwards /api to the .NET API.
  private base = '/api';

  listRuleSets(): Observable<RuleSetDto[]> {
    return this.http.get<RuleSetDto[]>(`${this.base}/rule-sets`).pipe(catchError(toApiError));
  }
  getRuleSet(id: number): Observable<RuleSetDto> {
    return this.http.get<RuleSetDto>(`${this.base}/rule-sets/${id}`).pipe(catchError(toApiError));
  }
  createRuleSet(body: RuleSetRequest): Observable<RuleSetDto> {
    return this.http.post<RuleSetDto>(`${this.base}/rule-sets`, body).pipe(catchError(toApiError));
  }
  updateRuleSet(id: number, body: RuleSetRequest): Observable<RuleSetDto> {
    return this.http.put<RuleSetDto>(`${this.base}/rule-sets/${id}`, body).pipe(catchError(toApiError));
  }
  deleteRuleSet(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/rule-sets/${id}`).pipe(catchError(toApiError));
  }
  simulate(body: SimulationRequest): Observable<SimulationResponse> {
    return this.http.post<SimulationResponse>(`${this.base}/simulations`, body).pipe(catchError(toApiError));
  }
}

/** Turns ProblemDetails (or a network failure) into an ApiError. */
function toApiError(err: HttpErrorResponse): Observable<never> {
  if (err.status === 0) {
    return throwError(() => ({
      message: 'Can\'t reach the API. Start it with "dotnet run --project src/RuleSimulation.Api" and try again.',
      fieldErrors: {},
    } as ApiError));
  }
  const body = err.error ?? {};
  const fieldErrors: ErrorMap = body.errors ?? {};
  const message = body.detail ?? body.title ?? `Request failed (${err.status}).`;
  return throwError(() => ({ message, fieldErrors } as ApiError));
}
