import { useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SimpleSalesSummaryResultSchema,
  type SimpleSalesSummaryResult,
} from '@report-definitions/simple-sales-summary';
import { launchReport, listReports } from '@report-platform/api-client';
import {
  DEFAULT_MOCK_USER_ID,
  mockUserOptions,
  type MockUserId,
} from '@report-platform/auth';
import { ApiErrorSchema, type ReportListItem } from '@report-platform/contracts';

type UiError = {
  code: string;
  message: string;
};

type UiResult =
  | {
      kind: 'simple-sales-summary';
      data: SimpleSalesSummaryResult;
    }
  | {
      kind: 'generic';
      data: unknown;
    };

function toUiError(caughtError: unknown): UiError {
  const parsedError = ApiErrorSchema.safeParse(caughtError);

  if (parsedError.success) {
    return parsedError.data;
  }

  if (caughtError instanceof Error) {
    return {
      code: 'UNEXPECTED_ERROR',
      message: caughtError.message,
    };
  }

  return {
    code: 'UNEXPECTED_ERROR',
    message: 'Unexpected client error.',
  };
}

export function App() {
  const [mockUserId, setMockUserId] = useState<MockUserId>(DEFAULT_MOCK_USER_ID);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedReportCode, setSelectedReportCode] = useState('');
  const [tenantId, setTenantId] = useState('tenant-1');
  const [organizationId, setOrganizationId] = useState('org-1');
  const [listLoading, setListLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UiResult | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/report-launch');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    setListLoading(true);
    setError(null);
    setResult(null);

    listReports({ mockUserId })
      .then((reportList) => {
        if (cancelled) {
          return;
        }

        setReports(reportList);
        setSelectedReportCode((currentValue) => {
          if (
            currentValue &&
            reportList.some((reportDefinition) => reportDefinition.code === currentValue)
          ) {
            return currentValue;
          }

          return reportList[0]?.code ?? '';
        });
      })
      .catch((caughtError) => {
        if (cancelled) {
          return;
        }

        setReports([]);
        setSelectedReportCode('');
        setError(toUiError(caughtError));
      })
      .finally(() => {
        if (!cancelled) {
          setListLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mockUserId]);

  const selectedReport = useMemo(
    () => reports.find((reportDefinition) => reportDefinition.code === selectedReportCode) ?? null,
    [reports, selectedReportCode],
  );

  const handleLaunch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedReportCode) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Select a report before launching.',
      });
      return;
    }

    const launchReportCode = selectedReportCode;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const reportPayload = await launchReport(
        launchReportCode,
        {
          tenantId,
          organizationId,
        },
        { mockUserId },
      );

      if (launchReportCode === SIMPLE_SALES_SUMMARY_REPORT_CODE) {
        const parsedSimpleResult = SimpleSalesSummaryResultSchema.safeParse(reportPayload);

        if (!parsedSimpleResult.success) {
          throw new Error('API returned an invalid success payload.');
        }

        setResult({
          kind: 'simple-sales-summary',
          data: parsedSimpleResult.data,
        });
      } else {
        setResult({
          kind: 'generic',
          data: reportPayload,
        });
      }
    } catch (caughtError) {
      setError(toUiError(caughtError));
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
            Выбери mock пользователя, отчет, tenant и organization, затем запусти отчет.
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
            <span>Отчет</span>
            <select
              value={selectedReportCode}
              disabled={listLoading || reports.length === 0}
              onChange={(event) => setSelectedReportCode(event.target.value)}
            >
              {reports.map((reportDefinition) => (
                <option key={reportDefinition.code} value={reportDefinition.code}>
                  {reportDefinition.title}
                </option>
              ))}
            </select>
          </label>

          {selectedReport ? (
            <p className="report-description">{selectedReport.description}</p>
          ) : null}

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

          <button
            className="button"
            type="submit"
            disabled={loading || listLoading || !selectedReportCode}
          >
            {loading ? 'Запуск...' : 'Запустить отчет'}
          </button>
        </form>

        {listLoading ? (
          <p className="status-text">Загружаем список отчетов...</p>
        ) : null}

        {!listLoading && reports.length === 0 ? (
          <p className="status-text">Нет доступных отчетов.</p>
        ) : null}

        {result?.kind === 'simple-sales-summary' ? (
          <section className="result-card">
            <h2>Результат</h2>
            <dl className="result-grid">
              <div>
                <dt>Tenant</dt>
                <dd>{result.data.tenantName}</dd>
              </div>
              <div>
                <dt>Organization</dt>
                <dd>{result.data.organizationName}</dd>
              </div>
              <div>
                <dt>Current sales</dt>
                <dd>{result.data.currentSalesAmount.toLocaleString('en-US')}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        {result?.kind === 'generic' ? (
          <section className="result-card">
            <h2>Результат</h2>
            <pre className="result-json">
              {JSON.stringify(result.data, null, 2) ?? 'null'}
            </pre>
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
