import { useEffect, useMemo, useState } from 'react';

import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SimpleSalesSummaryResultSchema,
  type SimpleSalesSummaryResult,
} from '@report-definitions/simple-sales-summary';
import {
  getReportMetadata,
  launchReport,
  listReports,
} from '@report-platform/api-client';
import {
  DEFAULT_MOCK_USER_ID,
  mockUserOptions,
  mockUsers,
  type MockUserId,
} from '@report-platform/auth';
import {
  ApiErrorSchema,
  DownloadableFileResultSchema,
  type DownloadableFileResult,
  type ReportListItem,
  type ReportMetadata,
  type Role,
} from '@report-platform/contracts';

type UiError = {
  code: string;
  message: string;
};

type UiStep = 'select' | 'launch';

type UiResult =
  | {
      kind: 'simple-sales-summary';
      data: SimpleSalesSummaryResult;
    }
  | {
      kind: 'downloadable-file';
      data: DownloadableFileResult;
    };

const SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE = 'simple-sales-summary-xlsx';

const roleRank: Record<Role, number> = {
  Auditor: 0,
  Member: 1,
  TenantAdmin: 2,
  Admin: 3,
};

function hasRoleAccess(currentRole: Role, minRole: Role): boolean {
  return roleRank[currentRole] >= roleRank[minRole];
}

function toUiError(caughtError: unknown): UiError {
  const parsedError = ApiErrorSchema.safeParse(caughtError);

  if (parsedError.success) {
    return parsedError.data;
  }

  if (caughtError instanceof Error) {
    if (caughtError.message.includes('Failed to fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Сервер недоступен. Проверьте, что запущен start:api.',
      };
    }

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
  const [step, setStep] = useState<UiStep>('select');
  const [mockUserId, setMockUserId] = useState<MockUserId>(DEFAULT_MOCK_USER_ID);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedReportCode, setSelectedReportCode] = useState('');
  const [metadata, setMetadata] = useState<ReportMetadata | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<UiResult | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  const currentUser = mockUsers[mockUserId];

  const selectedReport = useMemo(
    () => reports.find((report) => report.code === selectedReportCode) ?? null,
    [reports, selectedReportCode],
  );

  const hasLaunchAccess = useMemo(() => {
    if (!metadata) {
      return false;
    }

    return hasRoleAccess(currentUser.role, metadata.minRoleToLaunch);
  }, [currentUser.role, metadata]);

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/report-launch');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    setListLoading(true);
    setReports([]);
    setSelectedReportCode('');
    setMetadata(null);
    setError(null);

    listReports({ mockUserId })
      .then((reportList) => {
        if (cancelled) {
          return;
        }

        setReports(reportList);
        setSelectedReportCode(reportList[0]?.code ?? '');
      })
      .catch((caughtError) => {
        if (cancelled) {
          return;
        }

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

  useEffect(() => {
    let cancelled = false;

    if (!selectedReportCode) {
      setMetadata(null);
      return;
    }

    setMetadataLoading(true);
    setMetadata(null);

    getReportMetadata(selectedReportCode, { mockUserId })
      .then((reportMetadata) => {
        if (cancelled) {
          return;
        }

        setMetadata(reportMetadata);
      })
      .catch((caughtError) => {
        if (cancelled) {
          return;
        }

        setError(toUiError(caughtError));
      })
      .finally(() => {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mockUserId, selectedReportCode]);

  useEffect(() => {
    setStep('select');
    setResult(null);
    setError(null);
  }, [mockUserId, selectedReportCode]);

  const handleNextStep = () => {
    if (!selectedReportCode || !metadata) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Сначала выберите отчет.',
      });
      return;
    }

    setStep('launch');
    setResult(null);
    setError(null);
  };

  const handleBackStep = () => {
    setStep('select');
    setResult(null);
    setError(null);
  };

  const handleLaunchReport = async () => {
    if (!selectedReportCode || !metadata) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Сначала выберите отчет.',
      });
      return;
    }

    if (!hasLaunchAccess) {
      setError({
        code: 'FORBIDDEN',
        message: 'Нельзя сгенерировать отчет: недостаточно прав доступа.',
      });
      return;
    }

    setLaunching(true);
    setResult(null);
    setError(null);

    try {
      const reportPayload = await launchReport(selectedReportCode, {}, { mockUserId });

      if (selectedReportCode === SIMPLE_SALES_SUMMARY_REPORT_CODE) {
        const parsedResult = SimpleSalesSummaryResultSchema.safeParse(reportPayload);

        if (!parsedResult.success) {
          throw new Error('API returned an invalid success payload.');
        }

        setResult({
          kind: 'simple-sales-summary',
          data: parsedResult.data,
        });
      } else if (selectedReportCode === SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE) {
        const parsedResult = DownloadableFileResultSchema.safeParse(reportPayload);

        if (!parsedResult.success) {
          throw new Error('API returned an invalid downloadable file payload.');
        }

        setResult({
          kind: 'downloadable-file',
          data: parsedResult.data,
        });
      } else {
        throw new Error('Report is not available in the active launch scenario.');
      }
    } catch (caughtError) {
      setError(toUiError(caughtError));
    } finally {
      setLaunching(false);
    }
  };

  const renderResult = () => {
    if (!result) {
      return null;
    }

    if (result.kind === 'simple-sales-summary') {
      return (
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
      );
    }

    return (
      <section className="result-card">
        <h2>Результат</h2>
        <dl className="result-grid">
          <div>
            <dt>File name</dt>
            <dd>{result.data.fileName}</dd>
          </div>
          <div>
            <dt>MIME type</dt>
            <dd>{result.data.mimeType}</dd>
          </div>
          <div>
            <dt>Byte length</dt>
            <dd>{result.data.byteLength.toLocaleString('en-US')}</dd>
          </div>
          <div>
            <dt>Download</dt>
            <dd>
              <a href={result.data.downloadUrl}>Download file</a>
            </dd>
          </div>
        </dl>
      </section>
    );
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Reporting Prototype</p>
          <h1>Запуск отчета</h1>
          <p className="description">
            Шаг 1: выбери пользователя и отчет. Шаг 2: запусти выбранный отчет.
          </p>
        </div>

        <div className="stepper-header">
          <p className={step === 'select' ? 'step-item is-active' : 'step-item'}>
            1. Выбор
          </p>
          <p className={step === 'launch' ? 'step-item is-active' : 'step-item'}>
            2. Запуск
          </p>
        </div>

        {step === 'select' ? (
          <section>
            <div className="form">
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

              <button
                className="button"
                type="button"
                disabled={listLoading || metadataLoading || !selectedReportCode || !metadata}
                onClick={handleNextStep}
              >
                Далее
              </button>
            </div>
          </section>
        ) : null}

        {step === 'launch' ? (
          <section className="step-launch-block">
            <h2>{selectedReport?.title ?? 'Report'}</h2>

            {metadata && !hasLaunchAccess ? (
              <p className="access-denied">
                Нельзя сгенерировать отчет: недостаточно прав доступа.
              </p>
            ) : null}

            <div className="button-row">
              <button className="button button-secondary" type="button" onClick={handleBackStep}>
                Назад
              </button>
              <button
                className="button"
                type="button"
                disabled={launching || !hasLaunchAccess}
                onClick={handleLaunchReport}
              >
                {launching ? 'Запуск...' : 'Запустить'}
              </button>
            </div>
          </section>
        ) : null}

        {listLoading ? <p className="status-text">Загружаем список отчетов...</p> : null}
        {metadataLoading ? <p className="status-text">Загружаем metadata отчета...</p> : null}

        {renderResult()}

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
