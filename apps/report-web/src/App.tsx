import { useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  BROKER_PORTFOLIO_SUMMARY_REPORT_CODE,
  BrokerPortfolioSummaryResultSchema,
  type BrokerPortfolioSummaryResult,
} from '@report-definitions/broker-portfolio-summary';
import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SimpleSalesSummaryResultSchema,
  type SimpleSalesSummaryResult,
} from '@report-definitions/simple-sales-summary';
import {
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
  type ReportListItem,
  type ReportMetadata,
  type Role,
  type SharedSettingOption,
} from '@report-platform/contracts';

type UiError = {
  code: string;
  message: string;
};

type UiStep = 'select' | 'launch';
type CredentialMode = 'shared_setting' | 'manual';

type UiResult =
  | {
      kind: 'simple-sales-summary';
      data: SimpleSalesSummaryResult;
    }
  | {
      kind: 'broker-portfolio-summary';
      data: BrokerPortfolioSummaryResult;
    }
  | {
      kind: 'generic';
      data: unknown;
    };

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

  const [brokerAccountId, setBrokerAccountId] = useState('');
  const [credentialMode, setCredentialMode] =
    useState<CredentialMode>('manual');
  const [sharedSettings, setSharedSettings] = useState<SharedSettingOption[]>([]);
  const [sharedSettingsLoading, setSharedSettingsLoading] = useState(false);
  const [selectedSharedSettingId, setSelectedSharedSettingId] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [manualPassword, setManualPassword] = useState('');

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

  const isBrokerReport = selectedReportCode === BROKER_PORTFOLIO_SUMMARY_REPORT_CODE;
  const isSimpleReport = selectedReportCode === SIMPLE_SALES_SUMMARY_REPORT_CODE;

  const isBrokerLaunchDisabled =
    launching ||
    !brokerAccountId.trim() ||
    (credentialMode === 'shared_setting' && !selectedSharedSettingId) ||
    (credentialMode === 'manual' &&
      (!manualUsername.trim() || !manualPassword.trim()));

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
    setBrokerAccountId('');
    setCredentialMode('manual');
    setSharedSettings([]);
    setSharedSettingsLoading(false);
    setSelectedSharedSettingId('');
    setManualUsername('');
    setManualPassword('');
  }, [mockUserId, selectedReportCode]);

  useEffect(() => {
    let cancelled = false;

    if (
      step !== 'launch' ||
      !isBrokerReport ||
      credentialMode !== 'shared_setting'
    ) {
      return;
    }

    setSharedSettingsLoading(true);

    listSharedSettings(selectedReportCode, 'brokerApi', { mockUserId })
      .then((sharedSettingOptions) => {
        if (cancelled) {
          return;
        }

        setSharedSettings(sharedSettingOptions);
        setSelectedSharedSettingId((currentId) => {
          if (
            currentId &&
            sharedSettingOptions.some((sharedSettingOption) => sharedSettingOption.id === currentId)
          ) {
            return currentId;
          }

          return sharedSettingOptions[0]?.id ?? '';
        });
      })
      .catch((caughtError) => {
        if (cancelled) {
          return;
        }

        setSharedSettings([]);
        setSelectedSharedSettingId('');
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
  }, [credentialMode, isBrokerReport, mockUserId, selectedReportCode, step]);

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

  const handleLaunchSimpleReport = async () => {
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
      const parsedResult = SimpleSalesSummaryResultSchema.safeParse(reportPayload);

      if (!parsedResult.success) {
        throw new Error('API returned an invalid success payload.');
      }

      setResult({
        kind: SIMPLE_SALES_SUMMARY_REPORT_CODE,
        data: parsedResult.data,
      });
    } catch (caughtError) {
      setError(toUiError(caughtError));
    } finally {
      setLaunching(false);
    }
  };

  const handleLaunchBrokerReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    if (isBrokerLaunchDisabled) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Заполните обязательные поля для запуска broker отчета.',
      });
      return;
    }

    const params = {
      accountId: brokerAccountId.trim(),
      credentials:
        credentialMode === 'shared_setting'
          ? {
              mode: 'shared_setting' as const,
              sharedSettingId: selectedSharedSettingId,
            }
          : {
              mode: 'manual' as const,
              username: manualUsername.trim(),
              password: manualPassword,
            },
    };

    setLaunching(true);
    setResult(null);
    setError(null);

    try {
      const reportPayload = await launchReport(selectedReportCode, params, { mockUserId });
      const parsedResult = BrokerPortfolioSummaryResultSchema.safeParse(reportPayload);

      if (!parsedResult.success) {
        throw new Error('API returned an invalid success payload.');
      }

      setResult({
        kind: BROKER_PORTFOLIO_SUMMARY_REPORT_CODE,
        data: parsedResult.data,
      });
    } catch (caughtError) {
      setError(toUiError(caughtError));
    } finally {
      setManualPassword('');
      setLaunching(false);
    }
  };

  const renderResult = () => {
    if (!result) {
      return null;
    }

    if (result.kind === SIMPLE_SALES_SUMMARY_REPORT_CODE) {
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

    if (result.kind === BROKER_PORTFOLIO_SUMMARY_REPORT_CODE) {
      return (
        <section className="result-card">
          <h2>Результат</h2>
          <dl className="result-grid">
            <div>
              <dt>Owner</dt>
              <dd>{result.data.owner}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{result.data.accountId}</dd>
            </div>
            <div>
              <dt>Total market value</dt>
              <dd>{result.data.totalMarketValue.toLocaleString('en-US')}</dd>
            </div>
            <div>
              <dt>Trade count</dt>
              <dd>{result.data.tradeCount}</dd>
            </div>
          </dl>
        </section>
      );
    }

    return (
      <section className="result-card">
        <h2>Результат</h2>
        <pre className="result-json">{JSON.stringify(result.data, null, 2) ?? 'null'}</pre>
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

        {step === 'launch' && isSimpleReport ? (
          <section className="step-launch-block">
            <h2>{selectedReport?.title ?? 'Simple Sales Summary'}</h2>

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
                onClick={handleLaunchSimpleReport}
              >
                {launching ? 'Запуск...' : 'Запустить'}
              </button>
            </div>
          </section>
        ) : null}

        {step === 'launch' && isBrokerReport ? (
          <section className="step-launch-block">
            <h2>{selectedReport?.title ?? 'Broker Portfolio Summary'}</h2>

            {metadata && !hasLaunchAccess ? (
              <p className="access-denied">
                Нельзя сгенерировать отчет: недостаточно прав доступа.
              </p>
            ) : null}

            <form className="form" onSubmit={handleLaunchBrokerReport}>
              <label className="field">
                <span>Account ID</span>
                <input
                  value={brokerAccountId}
                  onChange={(event) => setBrokerAccountId(event.target.value)}
                  placeholder="Например, ACC-001"
                />
              </label>

              <div className="credentials-block">
                <p className="credentials-title">
                  Введите / выберите креды для сервиса brokerApi
                </p>

                <div className="mode-switch">
                  <label>
                    <input
                      type="radio"
                      name="credential-mode"
                      value="shared_setting"
                      checked={credentialMode === 'shared_setting'}
                      onChange={() => setCredentialMode('shared_setting')}
                    />
                    Use shared settings
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="credential-mode"
                      value="manual"
                      checked={credentialMode === 'manual'}
                      onChange={() => setCredentialMode('manual')}
                    />
                    Enter manually
                  </label>
                </div>

                {credentialMode === 'shared_setting' ? (
                  <div className="shared-settings-box">
                    {sharedSettingsLoading ? (
                      <p className="status-text">Загружаем shared settings...</p>
                    ) : null}

                    {!sharedSettingsLoading && sharedSettings.length === 0 ? (
                      <p className="status-text">
                        Нет доступных shared settings для этого пользователя и репорта.
                      </p>
                    ) : null}

                    {!sharedSettingsLoading && sharedSettings.length > 0 ? (
                      <label className="field">
                        <span>Shared setting</span>
                        <select
                          value={selectedSharedSettingId}
                          onChange={(event) =>
                            setSelectedSharedSettingId(event.target.value)
                          }
                        >
                          {sharedSettings.map((setting) => (
                            <option key={setting.id} value={setting.id}>
                              {setting.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                ) : (
                  <div className="manual-credentials-grid">
                    <label className="field">
                      <span>Username</span>
                      <input
                        value={manualUsername}
                        onChange={(event) => setManualUsername(event.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>Password</span>
                      <input
                        type="password"
                        value={manualPassword}
                        onChange={(event) => setManualPassword(event.target.value)}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="button-row">
                <button className="button button-secondary" type="button" onClick={handleBackStep}>
                  Назад
                </button>
                <button
                  className="button"
                  type="submit"
                  disabled={!hasLaunchAccess || isBrokerLaunchDisabled}
                >
                  {launching ? 'Запуск...' : 'Запустить'}
                </button>
              </div>
            </form>
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
