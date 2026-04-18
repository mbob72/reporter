import { useEffect, useMemo, useState } from 'react';

import {
  getReportJobStatus,
  getReportMetadata,
  launchReport,
  listReports,
  listSharedSettings,
} from '@report-platform/api-client';
import {
  DEFAULT_MOCK_USER_ID,
  mockUserOptions,
  mockUsers,
  type MockUserId,
} from '@report-platform/auth';
import {
  ApiErrorSchema,
  type DownloadableFileResult,
  type ReportJobStatusResponse,
  type ReportListItem,
  type ReportMetadata,
  type Role,
  type SharedSettingOption,
} from '@report-platform/contracts';

type UiError = {
  code: string;
  message: string;
};

type UiStep = 'select' | 'launch' | 'progress';
type WeatherCredentialMode = 'manual' | 'shared_setting';
const SIMPLE_SALES_SUMMARY_REPORT_CODE = 'simple-sales-summary';

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

function isSimpleSalesSummary(reportCode: string): boolean {
  return reportCode === SIMPLE_SALES_SUMMARY_REPORT_CODE;
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
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ReportJobStatusResponse | null>(null);
  const [isPollingJob, setIsPollingJob] = useState(false);
  const [result, setResult] = useState<DownloadableFileResult | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  const [weatherCredentialMode, setWeatherCredentialMode] =
    useState<WeatherCredentialMode>('manual');
  const [weatherApiKey, setWeatherApiKey] = useState('');
  const [sharedSettingOptions, setSharedSettingOptions] = useState<SharedSettingOption[]>(
    [],
  );
  const [selectedSharedSettingId, setSelectedSharedSettingId] = useState('');
  const [sharedSettingsLoading, setSharedSettingsLoading] = useState(false);

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
    setActiveJobId(null);
    setJobStatus(null);
    setIsPollingJob(false);
    setResult(null);
    setError(null);
    setWeatherCredentialMode('manual');
    setWeatherApiKey('');
    setSharedSettingOptions([]);
    setSelectedSharedSettingId('');
    setSharedSettingsLoading(false);
  }, [mockUserId, selectedReportCode]);

  useEffect(() => {
    let cancelled = false;

    if (
      step !== 'launch' ||
      !isSimpleSalesSummary(selectedReportCode) ||
      weatherCredentialMode !== 'shared_setting'
    ) {
      return;
    }

    setSharedSettingsLoading(true);
    setSharedSettingOptions([]);
    setSelectedSharedSettingId('');

    listSharedSettings(SIMPLE_SALES_SUMMARY_REPORT_CODE, 'openWeather', { mockUserId })
      .then((options) => {
        if (cancelled) {
          return;
        }

        setSharedSettingOptions(options);
        setSelectedSharedSettingId(options[0]?.id ?? '');
      })
      .catch((caughtError) => {
        if (cancelled) {
          return;
        }

        setError(toUiError(caughtError));
      })
      .finally(() => {
        if (!cancelled) {
          setSharedSettingsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mockUserId, selectedReportCode, step, weatherCredentialMode]);

  useEffect(() => {
    if (step !== 'progress' || !activeJobId) {
      setIsPollingJob(false);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const pollJobStatus = async () => {
      try {
        const status = await getReportJobStatus(activeJobId, { mockUserId });

        if (cancelled) {
          return;
        }

        setJobStatus(status);

        if (status.status === 'completed') {
          setIsPollingJob(false);

          if (status.result) {
            setResult(status.result);
            setError(null);
          } else {
            setResult(null);
            setError({
              code: 'UNEXPECTED_ERROR',
              message: 'Job completed without downloadable result.',
            });
          }

          return;
        }

        if (status.status === 'failed') {
          setIsPollingJob(false);
          setResult(null);
          setError({
            code: 'REPORT_JOB_FAILED',
            message: status.errorMessage ?? 'Report job failed.',
          });
          return;
        }

        timeoutId = setTimeout(() => {
          void pollJobStatus();
        }, 1000);
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        setIsPollingJob(false);
        setError(toUiError(caughtError));
      }
    };

    setIsPollingJob(true);
    void pollJobStatus();

    return () => {
      cancelled = true;
      setIsPollingJob(false);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeJobId, mockUserId, step]);

  const handleNextStep = () => {
    if (!selectedReportCode || !metadata) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Сначала выберите отчет.',
      });
      return;
    }

    setStep('launch');
    setActiveJobId(null);
    setJobStatus(null);
    setIsPollingJob(false);
    setResult(null);
    setError(null);
  };

  const handleBackStep = () => {
    setStep('select');
    setActiveJobId(null);
    setJobStatus(null);
    setIsPollingJob(false);
    setResult(null);
    setError(null);
  };

  const handleBackFromProgress = () => {
    setStep('launch');
    setActiveJobId(null);
    setJobStatus(null);
    setIsPollingJob(false);
    setResult(null);
    setError(null);
  };

  const buildLaunchParams = (): Record<string, unknown> | null => {
    if (!isSimpleSalesSummary(selectedReportCode)) {
      return {};
    }

    if (weatherCredentialMode === 'manual') {
      const normalizedApiKey = weatherApiKey.trim();

      if (!normalizedApiKey) {
        setError({
          code: 'VALIDATION_ERROR',
          message: 'Введите OpenWeather API key для manual режима.',
        });

        return null;
      }

      return {
        credentials: {
          mode: 'manual',
          apiKey: normalizedApiKey,
        },
      };
    }

    if (!selectedSharedSettingId) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Выберите shared setting для OpenWeather.',
      });

      return null;
    }

    return {
      credentials: {
        mode: 'shared_setting',
        sharedSettingId: selectedSharedSettingId,
      },
    };
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

    const launchParams = buildLaunchParams();

    if (!launchParams) {
      return;
    }

    setLaunching(true);
    setActiveJobId(null);
    setJobStatus(null);
    setIsPollingJob(false);
    setResult(null);
    setError(null);

    try {
      const acceptedJob = await launchReport(selectedReportCode, launchParams, {
        mockUserId,
      });
      setActiveJobId(acceptedJob.jobId);
      setStep('progress');
    } catch (caughtError) {
      setError(toUiError(caughtError));
    } finally {
      setLaunching(false);
    }
  };

  const renderCredentialsBlock = () => {
    if (!isSimpleSalesSummary(selectedReportCode)) {
      return null;
    }

    return (
      <section className="credentials-block">
        <p className="credentials-title">OpenWeather credentials</p>

        <div className="mode-switch">
          <label>
            <input
              type="radio"
              checked={weatherCredentialMode === 'manual'}
              onChange={() => setWeatherCredentialMode('manual')}
            />
            Manual
          </label>

          <label>
            <input
              type="radio"
              checked={weatherCredentialMode === 'shared_setting'}
              onChange={() => setWeatherCredentialMode('shared_setting')}
            />
            Shared setting
          </label>
        </div>

        {weatherCredentialMode === 'manual' ? (
          <label className="field">
            <span>OpenWeather API key</span>
            <input
              type="password"
              value={weatherApiKey}
              onChange={(event) => setWeatherApiKey(event.target.value)}
              placeholder="Enter OpenWeather API key"
            />
          </label>
        ) : (
          <div className="shared-settings-box">
            {sharedSettingsLoading ? (
              <p className="status-text">Загружаем shared settings...</p>
            ) : null}

            <label className="field">
              <span>Shared setting</span>
              <select
                value={selectedSharedSettingId}
                disabled={sharedSettingsLoading || sharedSettingOptions.length === 0}
                onChange={(event) => setSelectedSharedSettingId(event.target.value)}
              >
                {sharedSettingOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {!sharedSettingsLoading && sharedSettingOptions.length === 0 ? (
              <p className="status-text">Нет доступных shared settings для OpenWeather.</p>
            ) : null}
          </div>
        )}
      </section>
    );
  };

  const renderResult = () => {
    if (!result) {
      return null;
    }

    return (
      <section className="result-card">
        <h2>Результат</h2>
        <dl className="result-grid">
          <div>
            <dt>File name</dt>
            <dd>{result.fileName}</dd>
          </div>
          <div>
            <dt>Byte length</dt>
            <dd>{result.byteLength.toLocaleString('en-US')}</dd>
          </div>
          <div>
            <dt>Download</dt>
            <dd>
              <a href={result.downloadUrl}>Download file</a>
            </dd>
          </div>
        </dl>
      </section>
    );
  };

  const renderProgressStep = () => {
    if (step !== 'progress') {
      return null;
    }

    const displayJobId = jobStatus?.jobId ?? activeJobId ?? '—';
    const displayStatus = jobStatus?.status ?? 'queued';
    const displayStage = jobStatus?.stage ?? 'queued';
    const displayProgress = jobStatus?.progressPercent ?? 0;

    return (
      <section className="step-progress-block">
        <h2>{selectedReport?.title ?? 'Report'}</h2>

        <div className="progress-card">
          <div className="job-meta">
            <p>
              <span>Job ID:</span> {displayJobId}
            </p>
            <p>
              <span>Status:</span> {displayStatus}
            </p>
            <p>
              <span>Stage:</span> {displayStage}
            </p>
            {jobStatus?.createdAt ? (
              <p>
                <span>Created:</span> {new Date(jobStatus.createdAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className="progress-bar-shell" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={displayProgress}>
            <div
              className="progress-bar-fill"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <p className="progress-value">{displayProgress.toFixed(0)}%</p>
          {isPollingJob ? <p className="status-text">Обновляем статус каждые 1s...</p> : null}
        </div>

        <div className="button-row">
          <button className="button button-secondary" type="button" onClick={handleBackFromProgress}>
            Назад
          </button>
        </div>
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
            Шаг 1: выбери пользователя и отчет. Шаг 2: настрой запуск. Шаг 3:
            отслеживай прогресс и получи результат.
          </p>
        </div>

        <div className="stepper-header">
          <p className={step === 'select' ? 'step-item is-active' : 'step-item'}>
            1. Выбор
          </p>
          <p className={step === 'launch' ? 'step-item is-active' : 'step-item'}>
            2. Запуск
          </p>
          <p className={step === 'progress' ? 'step-item is-active' : 'step-item'}>
            3. Прогресс
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

            {renderCredentialsBlock()}

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

        {renderProgressStep()}

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
