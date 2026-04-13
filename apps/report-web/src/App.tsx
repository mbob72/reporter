import { useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SimpleSalesSummaryResultSchema,
  type SimpleSalesSummaryResult,
} from '@report-definitions/simple-sales-summary';
import {
  getReportMetadata,
  launchReport,
  listOrganizations,
  listReports,
  listTenants,
  type OrganizationOption,
  type TenantOption,
} from '@report-platform/api-client';
import {
  DEFAULT_MOCK_USER_ID,
  mockUserOptions,
  mockUsers,
  type MockUserId,
} from '@report-platform/auth';
import {
  ApiErrorSchema,
  type ReportFieldMetadata,
  type ReportListItem,
  type ReportMetadata,
  type Role,
} from '@report-platform/contracts';

type UiError = {
  code: string;
  message: string;
};

type FieldValues = Record<string, string>;

type UiResult =
  | {
      kind: 'simple-sales-summary';
      data: SimpleSalesSummaryResult;
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

function resolveUserContextValue(
  field: ReportFieldMetadata,
  tenantId: string | null,
  organizationId: string | null,
): string {
  if (field.kind === 'tenant') {
    return tenantId ?? '';
  }

  if (field.kind === 'organization') {
    return organizationId ?? '';
  }

  return '';
}

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
  const [metadata, setMetadata] = useState<ReportMetadata | null>(null);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UiResult | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  const currentUser = mockUsers[mockUserId];

  const selectedReport = useMemo(
    () => reports.find((reportDefinition) => reportDefinition.code === selectedReportCode) ?? null,
    [reports, selectedReportCode],
  );

  const tenantField = useMemo(
    () => metadata?.fields.find((field) => field.kind === 'tenant') ?? null,
    [metadata],
  );

  const organizationField = useMemo(
    () => metadata?.fields.find((field) => field.kind === 'organization') ?? null,
    [metadata],
  );

  const tenantValue = useMemo(() => {
    if (!tenantField) {
      return '';
    }

    if (tenantField.source === 'user-context') {
      return resolveUserContextValue(
        tenantField,
        currentUser.tenantId,
        currentUser.organizationId,
      );
    }

    return fieldValues[tenantField.name] ?? '';
  }, [currentUser.organizationId, currentUser.tenantId, fieldValues, tenantField]);

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
    setMetadata(null);
    setFieldValues({});
    setTenants([]);
    setOrganizations([]);
    setResult(null);
    setError(null);

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

  useEffect(() => {
    let cancelled = false;

    if (!selectedReportCode) {
      setMetadata(null);
      setFieldValues({});
      setTenants([]);
      setOrganizations([]);
      return;
    }

    setMetadataLoading(true);
    setMetadata(null);
    setFieldValues({});
    setTenants([]);
    setOrganizations([]);
    setResult(null);
    setError(null);

    getReportMetadata(selectedReportCode, { mockUserId })
      .then((reportMetadata) => {
        if (cancelled) {
          return;
        }

        setMetadata(reportMetadata);
        setFieldValues(() => {
          const initialValues: FieldValues = {};

          for (const field of reportMetadata.fields) {
            if (field.source === 'user-context') {
              initialValues[field.name] = resolveUserContextValue(
                field,
                currentUser.tenantId,
                currentUser.organizationId,
              );
            } else {
              initialValues[field.name] = '';
            }
          }

          return initialValues;
        });
      })
      .catch((caughtError) => {
        if (cancelled) {
          return;
        }

        setMetadata(null);
        setFieldValues({});
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
  }, [currentUser.organizationId, currentUser.tenantId, mockUserId, selectedReportCode]);

  useEffect(() => {
    let cancelled = false;

    if (!metadata || !hasLaunchAccess) {
      setTenants([]);
      return;
    }

    if (!tenantField) {
      setTenants([]);
      return;
    }

    if (tenantField.source === 'user-context') {
      const userContextTenant = resolveUserContextValue(
        tenantField,
        currentUser.tenantId,
        currentUser.organizationId,
      );
      setTenants([]);
      setFieldValues((currentValues) => {
        if (currentValues[tenantField.name] === userContextTenant) {
          return currentValues;
        }

        return {
          ...currentValues,
          [tenantField.name]: userContextTenant,
        };
      });
      return;
    }

    if (tenantField.source !== 'select') {
      return;
    }

    setOptionsLoading(true);

    listTenants({ mockUserId })
      .then((tenantOptions) => {
        if (cancelled) {
          return;
        }

        setTenants(tenantOptions);
        setFieldValues((currentValues) => {
          const currentTenant = currentValues[tenantField.name] ?? '';
          const fallbackTenant = tenantOptions[0]?.id ?? '';
          const nextTenant = tenantOptions.some((option) => option.id === currentTenant)
            ? currentTenant
            : fallbackTenant;

          if (nextTenant === currentTenant) {
            return currentValues;
          }

          return {
            ...currentValues,
            [tenantField.name]: nextTenant,
          };
        });
      })
      .catch((caughtError) => {
        if (cancelled) {
          return;
        }

        setTenants([]);
        setError(toUiError(caughtError));
      })
      .finally(() => {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentUser.organizationId,
    currentUser.tenantId,
    hasLaunchAccess,
    metadata,
    mockUserId,
    tenantField,
  ]);

  useEffect(() => {
    let cancelled = false;

    if (!metadata || !hasLaunchAccess) {
      setOrganizations([]);
      return;
    }

    if (!organizationField) {
      setOrganizations([]);
      return;
    }

    if (organizationField.source === 'user-context') {
      const userContextOrganization = resolveUserContextValue(
        organizationField,
        currentUser.tenantId,
        currentUser.organizationId,
      );
      setOrganizations([]);
      setFieldValues((currentValues) => {
        if (currentValues[organizationField.name] === userContextOrganization) {
          return currentValues;
        }

        return {
          ...currentValues,
          [organizationField.name]: userContextOrganization,
        };
      });
      return;
    }

    if (organizationField.source !== 'select') {
      return;
    }

    if (!tenantValue) {
      setOrganizations([]);
      setFieldValues((currentValues) => {
        if (!currentValues[organizationField.name]) {
          return currentValues;
        }

        return {
          ...currentValues,
          [organizationField.name]: '',
        };
      });
      return;
    }

    setOptionsLoading(true);

    listOrganizations(tenantValue, { mockUserId })
      .then((organizationOptions) => {
        if (cancelled) {
          return;
        }

        setOrganizations(organizationOptions);
        setFieldValues((currentValues) => {
          const currentOrganization = currentValues[organizationField.name] ?? '';
          const fallbackOrganization = organizationOptions[0]?.id ?? '';
          const nextOrganization = organizationOptions.some(
            (option) => option.id === currentOrganization,
          )
            ? currentOrganization
            : fallbackOrganization;

          if (nextOrganization === currentOrganization) {
            return currentValues;
          }

          return {
            ...currentValues,
            [organizationField.name]: nextOrganization,
          };
        });
      })
      .catch((caughtError) => {
        if (cancelled) {
          return;
        }

        setOrganizations([]);
        setError(toUiError(caughtError));
      })
      .finally(() => {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentUser.organizationId,
    currentUser.tenantId,
    hasLaunchAccess,
    metadata,
    mockUserId,
    organizationField,
    tenantValue,
  ]);

  const handleLaunch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedReportCode || !metadata) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Select a report before launching.',
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

    const params: Record<string, unknown> = {};

    for (const field of metadata.fields) {
      const value = (fieldValues[field.name] ?? '').trim();

      if (field.required && !value) {
        setError({
          code: 'VALIDATION_ERROR',
          message: `Поле "${field.label}" обязательно для заполнения.`,
        });
        return;
      }

      params[field.name] = value;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const reportPayload = await launchReport(selectedReportCode, params, {
        mockUserId,
      });

      if (selectedReportCode === SIMPLE_SALES_SUMMARY_REPORT_CODE) {
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

  const renderField = (field: ReportFieldMetadata) => {
    const fieldValue = fieldValues[field.name] ?? '';

    if (field.source === 'user-context') {
      return (
        <label className="field" key={field.name}>
          <span>{field.label}</span>
          <input className="readonly-input" value={fieldValue} readOnly />
        </label>
      );
    }

    if (field.source === 'select') {
      const options =
        field.kind === 'tenant'
          ? tenants.map((tenantOption) => ({
              id: tenantOption.id,
              label: tenantOption.name,
            }))
          : field.kind === 'organization'
            ? organizations.map((organizationOption) => ({
                id: organizationOption.id,
                label: organizationOption.name,
              }))
            : [];

      return (
        <label className="field" key={field.name}>
          <span>{field.label}</span>
          <select
            value={fieldValue}
            disabled={optionsLoading || options.length === 0}
            onChange={(event) =>
              setFieldValues((currentValues) => ({
                ...currentValues,
                [field.name]: event.target.value,
              }))
            }
          >
            {options.length === 0 ? (
              <option value="">Нет доступных опций</option>
            ) : null}
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label className="field" key={field.name}>
        <span>{field.label}</span>
        <input
          value={fieldValue}
          onChange={(event) =>
            setFieldValues((currentValues) => ({
              ...currentValues,
              [field.name]: event.target.value,
            }))
          }
        />
      </label>
    );
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Reporting Prototype</p>
          <h1>Запуск отчета</h1>
          <p className="description">
            Выбери mock пользователя и отчет, затем запусти его через metadata-driven форму.
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

          {metadata && !hasLaunchAccess ? (
            <p className="access-denied">
              Нельзя сгенерировать отчет: недостаточно прав доступа.
            </p>
          ) : null}

          {metadata && hasLaunchAccess ? metadata.fields.map((field) => renderField(field)) : null}

          <button
            className="button"
            type="submit"
            disabled={
              loading ||
              listLoading ||
              metadataLoading ||
              optionsLoading ||
              !selectedReportCode ||
              !metadata ||
              !hasLaunchAccess
            }
          >
            {loading ? 'Запуск...' : 'Запустить отчет'}
          </button>
        </form>

        {listLoading ? <p className="status-text">Загружаем список отчетов...</p> : null}

        {metadataLoading ? <p className="status-text">Загружаем metadata отчета...</p> : null}

        {optionsLoading ? <p className="status-text">Загружаем опции полей...</p> : null}

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
            <pre className="result-json">{JSON.stringify(result.data, null, 2) ?? 'null'}</pre>
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
