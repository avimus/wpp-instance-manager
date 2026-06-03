<!--
SYNC IMPACT REPORT
==================
Version change: (placeholder template) → 1.0.0
Constitution established from scratch based on project description.

Modified principles: N/A (initial creation)

Added sections:
  - Core Principles (6 principles)
  - Security & Compliance
  - Development Workflow
  - Governance

Removed sections: N/A

Templates requiring updates:
  - .specify/templates/plan-template.md ✅ — Constitution Check gates align with principles below
  - .specify/templates/spec-template.md ✅ — No structural changes required; FR/SC fields are compatible
  - .specify/templates/tasks-template.md ✅ — Observability and typed-code tasks should be included in Phase 2 (Foundational)
  - .specify/templates/commands/ ⚠ pending — Directory does not exist yet; no command files to update

Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Date set to 2026-06-01 (today); update if project was started earlier.
  - TODO(STACK_LOCK): Technology stack (Node/Python/Go, framework, DB) not yet locked — defer to first /speckit-plan.
-->

# WPP Instance Manager Constitution

## Core Principles

### I. Multi-Tenancy by Design

Every feature, data model, API endpoint, and background job MUST be designed with
tenant isolation as a first-class constraint. No cross-tenant data access is permitted
at any layer — database queries, cache keys, message queues, and log entries MUST
carry a tenant identifier. Tenant boundaries MUST be enforced at the service layer,
not just at the UI.

**Rationale**: A breach of tenant isolation is a critical security and compliance
incident. Retrofitting isolation into existing code is prohibitively costly; it
MUST be built in from day one.

### II. Reliability First

The availability and health of WhatsApp instances IS the product. The system MUST
implement automatic reconnection for disconnected instances, health-check polling,
and circuit-breaker patterns for WPP Connect interactions. Degraded-state recovery
MUST be handled gracefully without requiring manual admin intervention. SLOs (e.g.,
>99.5% instance uptime per tenant) MUST be defined before a feature ships to
production.

**Rationale**: Customers pay for their WhatsApp instances to stay connected. Any
downtime is a direct revenue and trust impact. Reliability cannot be a follow-up
concern.

### III. Observability as a Feature

Structured JSON logs (with `tenant_id`, `instance_id`, `trace_id`, `level`,
`timestamp`, and `message` fields at minimum) MUST be emitted for every significant
operation. Google Cloud Logging is the target sink. Proactive alerts (via Cloud
Monitoring or equivalent) MUST be configured for: instance disconnection, error-rate
spikes, and quota exhaustion. Dashboards and alert policies are deliverables, not
afterthoughts.

**Rationale**: Silent failures in async WhatsApp workflows are impossible to debug
without structured telemetry. Proactive alerting reduces MTTR and allows the team to
act before customers report issues.

### IV. Simplicity Over Premature Abstraction

No layer of abstraction, pattern, or framework may be introduced unless it solves a
concrete, present problem. YAGNI (You Aren't Gonna Need It) is enforced. Three
similar functions are acceptable; a generic framework wrapping them is not, unless
the fourth use case actually arrives. Every "architectural" decision that adds
complexity MUST be documented with the specific problem it solves and the simpler
alternative that was rejected.

**Rationale**: Over-engineered code is the primary source of maintenance debt in
early-stage SaaS products. The project MUST remain understandable to a new developer
within one day. Complexity budget is finite and MUST be spent on reliability and
correctness, not abstraction elegance.

### V. Clean, Typed Code

All source code MUST use static typing enforced by the compiler/linter (e.g.,
TypeScript strict mode, Python with mypy strict, Go's native type system). Type
`any` / `object` / untyped generics are forbidden in production code without an
inline justification comment. Public module APIs MUST be documented with types and
a one-line purpose description. Code MUST pass linting and type-checking in CI
before merge.

**Rationale**: WhatsApp webhook payloads and WPP Connect responses are complex and
error-prone. Strong typing catches integration bugs at compile time, not at 2 AM
in production.

### VI. Cloud-Native on Google Cloud

The system MUST leverage GCP managed services as the default choice over
self-managed infrastructure: Cloud Run for stateless compute, Cloud Pub/Sub or
Cloud Tasks for async work, Cloud SQL or Firestore for persistence, Secret Manager
for credentials, and Cloud Logging + Cloud Monitoring for observability. A managed
service MUST be rejected only when cost, latency, or capability constraints are
explicitly documented.

**Rationale**: Google Cloud managed services reduce operational burden and align with
the "prepared for scale, no over-engineering" mandate. The team MUST focus on product
logic, not infrastructure maintenance.

## Security & Compliance

All API endpoints MUST require authentication (JWT or service-account tokens).
WPP Connect session credentials and WhatsApp pairing codes MUST be stored in
Secret Manager — never in environment variables, config files, or databases in
plaintext. Tenant data MUST be logically isolated at the database level (row-level
security or separate schemas per tenant). Dependency security scans MUST run in CI.
Any external webhook receiver MUST validate signatures before processing payloads.
PII present in WhatsApp messages MUST NOT be logged in plaintext.

## Development Workflow

- Feature branches follow the convention `###-short-description` (e.g., `001-instance-manager`).
- All changes require a pull request with at least one review before merging to `main`.
- CI MUST enforce: type-checking, linting, unit tests (if present), and a build step.
- Deployments to production MUST go through a staging environment first.
- Infrastructure changes (Cloud Run services, IAM policies, Pub/Sub topics) MUST be
  managed as code (Terraform or equivalent) and reviewed like application code.
- Breaking API changes MUST be versioned (`/v1/`, `/v2/`) and the previous version
  MUST remain available for a documented deprecation window.

## Governance

This constitution supersedes all other practices, coding standards, and verbal
agreements. Any amendment requires: (1) a written proposal describing the principle
change and its motivation, (2) review and approval by at least one other engineer,
and (3) a migration plan for code that violates the amended principle.

Version numbering follows semantic versioning:
- **MAJOR**: Principle removed, renamed, or fundamentally redefined.
- **MINOR**: New principle or section added, or materially expanded guidance.
- **PATCH**: Clarifications, wording improvements, or non-semantic refinements.

All pull requests and code reviews MUST verify compliance with the principles above.
Complexity violations MUST be documented in the plan's Complexity Tracking table
before the feature is implemented. This constitution is reviewed at each major
milestone (MVP, public beta, GA).

**Version**: 1.0.0 | **Ratified**: 2026-06-01 | **Last Amended**: 2026-06-01
