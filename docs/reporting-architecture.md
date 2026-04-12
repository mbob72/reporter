2. Credentials
ServiceCredentialRef is a reference, not actual credentials
Only the platform resolves it (e.g. via Vault / Secrets Manager)
Reports must never access raw credentials
3. Data Access Rules (CRITICAL)

Reports must NEVER:

access raw DB clients
execute arbitrary SQL
access external APIs directly

Reports may ONLY access data via:

repositories
approved query gateway
datasource adapters

These components must enforce:

tenant scoping
role-based restrictions
allowed fields/queries
4. Layering
libs/
  report-platform/
    contracts/     → types & interfaces only
    runtime/       → runtime factory & orchestration
    data-access/   → repositories, query gateway, adapters

  report-definitions/
    <domain>/      → report implementations
5. Dependency Rules
report-definitions:
CAN depend on: contracts, runtime APIs
MUST NOT depend on: data-access implementations, DB clients, infra
data-access:
implements contracts
can depend on infra (DB, APIs)
runtime:
wires everything together
6. Nx Constraints

Use Nx tags to enforce boundaries:

type:platform
type:data-access
type:report
type:shared

Reports must not import infra or internal implementations.

Engineering Guidelines
Prefer small, composable abstractions
Always pass ReportExecutionContext explicitly
All data access must be scoped via context
Avoid hidden side effects
Code should be testable with mocked runtime
What to do when implementing features

When adding new functionality:

Define interfaces in contracts
Implement logic in data-access
Wire dependencies in runtime
Use them in report definitions

Never bypass this flow.

Testing

Reports must be testable with mocked runtime:

mock repositories
mock query gateway
mock adapters
Goal

The platform must guarantee that:
even if a report is implemented incorrectly,
it cannot access unauthorized data.


---

# 📄 2. `docs/reporting-architecture.md`

(создай папку `docs/` если нет)

```md
# Reporting Platform Architecture

## Motivation

We are building a reporting platform that:

- supports multi-tenant data access
- enforces strict security boundaries
- separates report logic from infrastructure
- allows independent release cycles for:
  - platform
  - data-access
  - report definitions

---

## Key Idea

Reports are **pure business logic**.

They do NOT:
- connect to databases
- access credentials
- construct queries freely

They operate on a controlled runtime provided by the platform.

---

## Execution Flow

1. User triggers report execution
2. Platform:
   - authenticates user
   - determines role
   - builds `ReportExecutionContext`
   - determines allowed access scope
   - selects credential references
3. Platform builds runtime:
   - resolves credentials
   - creates repositories / gateways / adapters
4. Report executes using runtime only

---

## ReportExecutionContext

```ts
type ReportExecutionContext = {
  initiator: {
    userId: string;
    role: Role;
    tenantId: string;
  };
  accessScope: {
    tenantIds: string[];
    mode: 'tenant' | 'global';
  };
  credentials: {
    reportingDb: ServiceCredentialRef;
  };
};
Controlled Data Access
Problem

If reports receive raw DB access:

developer may forget tenant filter
developer may access unauthorized tables
developer may leak cross-tenant data
Solution

Reports do NOT receive DB client.

Instead they receive controlled abstractions:

Option 1: Repositories

High-level, domain-oriented access.

runtime.repositories.revenue.getRevenueByPeriod(...)

Responsibilities:

apply tenant scope
restrict fields
enforce access rules

Best for:

standard queries
well-defined domain logic
Option 2: Query Gateway

Controlled query execution.

runtime.queryGateway.run('revenue-summary', params)

Characteristics:

only predefined queries allowed
parameters validated
scope injected automatically

Best for:

analytical reports
flexible aggregations
Option 3: Datasource Adapters

Source-specific access.

runtime.dataSources.crm.loadCustomers()

Characteristics:

wraps external systems or DBs
applies scope internally
hides connection details

Best for:

multiple data sources
external APIs
data warehouse integrations
Runtime Composition
type ReportRuntime = {
  context: ReportExecutionContext;

  repositories: {
    revenue: RevenueRepository;
  };

  queryGateway: QueryGateway;

  dataSources: {
    crm: CrmAdapter;
  };
};
Runtime Factory

Platform builds runtime per execution:

class ReportRuntimeFactory {
  async create(ctx: ReportExecutionContext): Promise<ReportRuntime> {
    const db = await resolveDb(ctx.credentials.reportingDb);

    return {
      context: ctx,
      repositories: {
        revenue: new RevenueRepository(db, ctx),
      },
      queryGateway: new QueryGateway(db, ctx),
      dataSources: {
        crm: new CrmAdapter(ctx),
      },
    };
  }
}
Security Model

Security is enforced at multiple levels:

Role-based access (who can run report)
Access scope (which tenants are visible)
Credential selection (technical user)
Data access layer (repositories/gateway/adapters)

Even if report code is incorrect,
data access must still be safe.

Nx Structure
apps/
  report-api/
  report-runner/

libs/
  report-platform/
    contracts/
    runtime/
    data-access/

  report-definitions/
    sales/
    finance/
Release Strategy

Independent release cycles:

platform (slow, stable)
data-access (moderate)
report-definitions (fast)
Design Constraints
No raw DB access in reports
No credential leakage
All data access must go through controlled interfaces
Context must be explicitly passed
All abstractions must be testable
Example Report
const revenueReport = {
  code: 'revenue',

  async run(runtime, params) {
    return runtime.repositories.revenue.getRevenueByPeriod(params);
  },
};
Testing Strategy

Reports are tested using mocked runtime:

const mockRuntime = {
  repositories: {
    revenue: {
      getRevenueByPeriod: async () => [{ total: 1000 }],
    },
  },
};
Long-Term Vision
add audit logging
add query tracing
support async/long-running reports
support caching
support report versioning
support UI-driven report configuration

---

# 🚀 Как дальше использовать это с агентом

В IDE (Codex / любой AI-плагин) просто пиши:

**Стартовый промпт:**
```text
Read AGENTS.md and docs/reporting-architecture.md.

Create initial Nx structure:
- libs/report-platform/contracts
- libs/report-platform/runtime
- libs/report-platform/data-access
- libs/report-definitions/sales

Define minimal types for:
- ReportExecutionContext
- ReportRuntime
- RevenueRepository

Keep implementation minimal and consistent with architecture.