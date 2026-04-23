# AGENTS.md

## Project Overview

This repository contains a reporting platform built in an Nx monorepo.

The goal is to provide a secure and scalable way to define and execute reports with strict data access control.

---

## Core Architecture Principles

### 1. Execution Context

The platform constructs a `ReportExecutionContext` and passes it to reports.

Reports must not construct this context themselves.

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
```
