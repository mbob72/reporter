import { useEffect, useState, type FormEvent } from 'react';

import {
  DEFAULT_MOCK_USER_ID,
  mockUserOptions,
  type MockUserId,
} from '@auth';
import { launchSimpleReport } from '@api-client';
import { ApiErrorSchema, type SimpleReportResponse } from '@contracts';

type UiError = {
  code: string;
  message: string;
};

export function App() {
  const [mockUserId, setMockUserId] = useState<MockUserId>(DEFAULT_MOCK_USER_ID);
  const [tenantId, setTenantId] = useState('tenant-1');
  const [organizationId, setOrganizationId] = useState('org-1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimpleReportResponse | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/report-launch');
    }
  }, []);

  const handleLaunch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const report = await launchSimpleReport(
        {
          tenantId,
          organizationId,
        },
        { mockUserId },
      );

      setResult(report);
    } catch (caughtError) {
      const parsedError = ApiErrorSchema.safeParse(caughtError);

      if (parsedError.success) {
        setError(parsedError.data);
      } else if (caughtError instanceof Error) {
        setError({
          code: 'UNEXPECTED_ERROR',
          message: caughtError.message,
        });
      } else {
        setError({
          code: 'UNEXPECTED_ERROR',
          message: 'Unexpected client error.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Reporting Prototype</p>
          <h1>Запуск отчета</h1>
          <p className="description">
            Выбери mock пользователя, tenant и organization, затем запусти отчет.
          </p>
        </div>

        <form className="form" onSubmit={handleLaunch}>
          <label className="field">
            <span>Mock пользователь</span>
            <select
              value={mockUserId}
              onChange={(event) => setMockUserId(event.target.value as MockUserId)}
            >
              {mockUserOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>tenantId</span>
            <input
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="tenant-1"
            />
          </label>

          <label className="field">
            <span>organizationId</span>
            <input
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              placeholder="org-1"
            />
          </label>

          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Запуск...' : 'Запустить отчет'}
          </button>
        </form>

        {result ? (
          <section className="result-card">
            <h2>Результат</h2>
            <dl className="result-grid">
              <div>
                <dt>Tenant</dt>
                <dd>{result.tenantName}</dd>
              </div>
              <div>
                <dt>Organization</dt>
                <dd>{result.organizationName}</dd>
              </div>
              <div>
                <dt>Current sales</dt>
                <dd>{result.currentSalesAmount.toLocaleString('en-US')}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        {error ? (
          <section className="error-card">
            <h2>Ошибка</h2>
            <p className="error-code">{error.code}</p>
            <p>{error.message}</p>
          </section>
        ) : null}
      </section>
    </main>
  );
}
