# Feature Specification: WhatsApp Instance Control Dashboard

**Feature Branch**: `001-whatsapp-instance-dashboard`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Painel web de controle de instâncias WhatsApp para admin e clientes externos,
integrado ao WPP Connect. Admin vê todas as instâncias, status em tempo real, logs e gerencia tudo.
Cliente vê apenas a sua instância, histórico de logs e reconecta via QR Code sem acionar suporte.
Alertas automáticos por email/WhatsApp quando instância fica offline."

---

## Clarifications

### Session 2026-06-01

- Q: A plataforma armazena conteúdo de mensagens WhatsApp (disparadas ou recebidas via WPP Connect)? → A: Não. A plataforma usa o WPP Connect em sua totalidade — gerenciamento de conexão E dispatch de mensagens — mas nunca armazena conteúdo de mensagens. Apenas metadados de dispatch (timestamp, instância, contagem de destinatários, status de entrega) podem ser logados. O conteúdo e dados de destinatários ficam em sistema externo.
- Q: Quando admin e cliente acionam reconexão simultânea para a mesma instância, qual é o comportamento? → A: Ambos podem gerar QR Codes independentemente; o primeiro a escanear confirma a conexão e invalida os demais QR Codes ativos para aquela instância.
- Q: Quando uma instância cai e reconecta múltiplas vezes em sequência, quantas notificações de alerta são enviadas? → A: Uma notificação de "offline" por janela de 30 minutos por instância; eventos de queda dentro da mesma janela são silenciados. A notificação de recuperação ("online") é enviada uma vez ao fim do período de instabilidade.
- Q: Qual é a disponibilidade mínima aceitável para a plataforma (dashboard e API) em produção? → A: 99,9% de uptime mensal (~43 minutos de downtime tolerado por mês).
- Q: Existe limite máximo de instâncias por tenant, e como é controlado? → A: Limite por plano contratado (ex: Basic = 1 instância, Pro = 5, Enterprise = ilimitado); o admin configura o plano de cada tenant no dashboard.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin: Centralized Instance Overview (Priority: P1)

An admin logs into the dashboard and immediately sees all WhatsApp instances across
every client tenant in a single view. Each instance shows its current connection status
(Online / Offline / Reconnecting) with the last-updated timestamp. The admin can filter
by tenant, status, or search by phone number.

**Why this priority**: Real-time visibility over all instances is the core value proposition
for the admin team. Without it, no proactive management is possible.

**Independent Test**: Log in as admin → dashboard loads → instances from at least two
different tenants are visible with correct statuses. Changing an instance's state externally
causes the dashboard status to update within 30 seconds.

**Acceptance Scenarios**:

1. **Given** I am authenticated as an admin, **When** I open the main dashboard,
   **Then** I see a list of all WhatsApp instances from all tenants, each showing
   connection status, tenant name, phone number, and last-seen timestamp.
2. **Given** an instance transitions from Online to Offline, **When** up to 30 seconds
   have elapsed, **Then** the dashboard reflects the updated status without requiring
   a page reload.
3. **Given** I apply a filter by tenant or status, **When** the filter is applied,
   **Then** only matching instances are displayed.

---

### User Story 2 — Admin: Instance Lifecycle Management (Priority: P1)

An admin can create a new WhatsApp instance, assign it to a client tenant, and manage
its full lifecycle (restart, delete) directly from the dashboard without using external
tools or command-line access.

**Why this priority**: Instance provisioning and management is an operational necessity
that currently requires manual intervention; removing that dependency is critical for
team efficiency.

**Independent Test**: Log in as admin → create a new instance assigned to tenant "Acme Corp"
→ instance appears in dashboard → restart the instance → instance status cycles through
Reconnecting → Online → delete the instance → instance disappears from the list.

**Acceptance Scenarios**:

1. **Given** I click "New Instance", **When** I complete the form (tenant, phone number,
   display name), **Then** the instance is created and appears in the dashboard with
   status "Pending" or the initial QR code flow.
2. **Given** I click "Restart" on a connected instance, **When** I confirm the action,
   **Then** the instance status changes to "Reconnecting" and recovers to "Online" after
   QR code scanning (if required).
3. **Given** I click "Delete" on an instance, **When** I confirm the destructive action,
   **Then** the instance is permanently removed from the system and disappears from all
   admin and client views.

---

### User Story 3 — Client: Self-Service Status & Log Panel (Priority: P2)

A client logs into their own panel and sees only their WhatsApp instance(s). They can
view the current connection status, browse the event log history (filterable by date
and event type), and understand what is happening with their service without contacting
support.

**Why this priority**: Clients currently contact support for information that the system
can surface directly. Reducing support load and increasing client autonomy is high-impact
but secondary to the admin operational capability.

**Independent Test**: Log in as client for tenant "Acme Corp" → dashboard shows only
Acme Corp instances → event log displays entries from the last 30 days → attempting to
access a URL belonging to another tenant returns an access-denied screen.

**Acceptance Scenarios**:

1. **Given** I am authenticated as a client, **When** I open the dashboard, **Then** I
   see only the instance(s) belonging to my tenant — no other tenant's data is visible.
2. **Given** I open my instance detail page, **When** the page loads, **Then** I see
   the current connection status and an event log with entries from at least the last
   30 days, filterable by date range and event type.
3. **Given** I attempt to access a URL for another tenant's instance, **When** the
   request is processed, **Then** I receive an "Access Denied" response and am not
   shown any data.

---

### User Story 4 — Client: QR Code Self-Reconnection (Priority: P2)

A client whose instance shows "Offline" can initiate a reconnection flow directly
from the dashboard, scan the displayed QR code with their WhatsApp mobile app, and
restore the connection — all without contacting support.

**Why this priority**: QR code reconnection is the most common support request today.
Enabling self-service reduces support tickets and improves client satisfaction immediately.

**Independent Test**: Set an instance to Offline → log in as the corresponding
client → click "Reconnect" → QR code appears → scan with WhatsApp mobile app →
instance status changes to "Online" within 60 seconds of scan.

**Acceptance Scenarios**:

1. **Given** my instance status is "Offline", **When** I click "Reconnect",
   **Then** a QR code is displayed on the dashboard for me to scan.
2. **Given** the QR code is displayed, **When** I scan it with my WhatsApp mobile app
   within the valid time window, **Then** the instance status changes to "Online"
   and the QR code is hidden.
3. **Given** the QR code expires before I scan it, **When** I request a new one,
   **Then** a fresh QR code is generated and displayed.
4. **Given** two reconnection sessions are active simultaneously (e.g., admin and client),
   **When** one user scans their QR code and the instance goes Online, **Then** the other
   user's QR code is immediately invalidated and their view shows the instance as "Online".

---

### User Story 5 — Automated Offline Alert Notifications (Priority: P3)

When a WhatsApp instance goes offline, both the admin team and the client registered
for that instance are automatically notified via email and/or WhatsApp message. When
the instance reconnects, a recovery notification is sent to the same recipients.

**Why this priority**: Proactive alerting prevents silent failures. It is lower priority
than core dashboard functionality but MUST ship before the product is considered
production-ready.

**Independent Test**: Simulate an instance going offline → within 5 minutes, a
notification is delivered to the admin email list and the client's registered
notification contact → simulate reconnection → recovery notification is delivered
to the same recipients.

**Acceptance Scenarios**:

1. **Given** an instance transitions to Offline, **When** up to 5 minutes have elapsed,
   **Then** an alert notification is delivered to all configured recipients for that
   instance (admin team + the client's registered contact).
2. **Given** the notification is sent, **Then** it is delivered via at least one
   configured channel (email, WhatsApp message, or both) per recipient.
3. **Given** the instance recovers to Online after being Offline, **When** the status
   change is detected, **Then** a "recovered" notification is sent to the same
   recipients within 5 minutes.

---

### Edge Cases

- **[Resolved]** Reconexão simultânea por admin e cliente: cada sessão gera um QR Code
  independente para a mesma instância; o primeiro usuário a escanear confirma a conexão
  e todos os demais QR Codes ativos para aquela instância são imediatamente invalidados.
  O segundo usuário verá seu QR Code expirado e a instância já como "Online".
- How does the system behave when the WPP Connect backend is unreachable (webhook
  delivery failures, status polling timeouts)?
- What happens if the client has no registered notification contact when an alert fires?
- How are notification delivery failures surfaced (e.g., invalid email address,
  WhatsApp number not reachable)?
- What happens when an external system attempts a message dispatch via an instance
  that is currently Offline or Reconnecting?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate all users and enforce role-based access control
  with at minimum two roles: `admin` and `client`.
- **FR-002**: Admin users MUST be able to view all WhatsApp instances from all tenants
  on a single dashboard page.
- **FR-003**: Instance connection status MUST reflect the actual state within 30 seconds
  of a status change, without requiring a full page reload.
- **FR-004**: Admin users MUST be able to create a new WhatsApp instance and assign it
  to an existing tenant.
- **FR-005**: Admin users MUST be able to restart or permanently delete any instance.
- **FR-006**: Client users MUST be restricted to viewing and managing only the instances
  belonging to their own tenant — cross-tenant access MUST return an error.
- **FR-007**: Client users MUST be able to view their instance's connection status and
  event log history for a minimum of the last 90 days.
- **FR-008**: Client users MUST be able to initiate a QR code reconnection flow from
  the dashboard without admin assistance.
- **FR-009**: Event logs MUST be filterable by date range and event type.
- **FR-010**: The system MUST send automatic alert notifications to configured recipients
  when an instance transitions to Offline. Alerts for the same instance MUST be
  rate-limited to one "offline" notification per 30-minute window; additional
  offline events within the same window MUST be suppressed.
- **FR-011**: The system MUST send a recovery notification when a previously Offline
  instance returns to Online and has been stable for at least 2 minutes (to avoid
  sending recovery alerts during rapid cycling).
- **FR-012**: Notification delivery MUST support at least two channels: email and WhatsApp
  message. Recipients may configure one or both channels.
- **FR-013**: Each instance MUST have configurable notification recipients (admin team
  addresses are global; client contact is per-instance).
- **FR-014**: System MUST retain event log entries for a minimum of 90 days.
- **FR-015**: The system MUST expose the WPP Connect message dispatch API per instance,
  allowing external systems to send messages through a managed instance.
- **FR-016**: The system MUST NEVER store the content of messages dispatched or received
  via WPP Connect. Only dispatch metadata MAY be logged: timestamp, instance identifier,
  recipient count, delivery status, and error codes — never message body or recipient
  phone numbers in plain text.
- **FR-017**: Each tenant MUST be assigned a plan (e.g., Basic, Pro, Enterprise) that
  defines the maximum number of WhatsApp instances they may create. The system MUST
  prevent instance creation beyond the tenant's plan limit.
- **FR-018**: Admin users MUST be able to view and change a tenant's plan from the
  dashboard, with the new limit taking effect immediately.

### Key Entities

- **Tenant**: An organization (customer account) that owns one or more WhatsApp instances.
  Key attributes: name, status (active/suspended), primary contact, plan (Basic/Pro/Enterprise),
  instance quota (max instances allowed by plan).
- **WhatsApp Instance**: A managed WhatsApp connection tied to a specific tenant.
  Key attributes: tenant, phone number, display name, connection status, created date,
  last-seen timestamp, notification recipients.
- **Event Log Entry**: A timestamped record of a connection-state event or dispatch
  event for a specific instance. Key attributes: instance, event type, timestamp,
  description, severity. MUST NOT contain message content or recipient identifiers
  in plain text.
- **Dispatch Event**: A log record produced when an external system sends messages
  through an instance. Key attributes: instance, timestamp, recipient count, delivery
  status, error code (if any). Message content and individual recipient numbers are
  excluded.
- **Alert**: A notification triggered by an instance status change. Key attributes:
  instance, trigger event, delivery channel, recipients, delivery status, timestamp.
- **User**: A platform user with a role (admin or client) and association to a tenant
  (clients are scoped to one tenant; admins are global).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can open the dashboard and view all instances with current statuses
  within 5 seconds of login.
- **SC-002**: Instance status updates are reflected on the dashboard within 30 seconds of
  the actual state change, without a page reload.
- **SC-003**: A client can complete the full QR code reconnection flow (initiate → scan →
  confirmed connected) in under 3 minutes.
- **SC-004**: Offline alert notifications reach all configured recipients within 5 minutes
  of an instance going offline, measured end-to-end from status change to delivery.
- **SC-005**: Zero cross-tenant data leakage: clients MUST NEVER see another tenant's
  instances, logs, or alert history. This is verified by automated access-control tests.
- **SC-006**: Event log searches over 90 days of data return results in under 3 seconds.
- **SC-007**: The dashboard remains responsive with at least 200 instances displayed
  simultaneously.
- **SC-008**: The platform (dashboard and API) maintains 99.9% monthly uptime
  (~43 minutes of tolerated downtime per month), measured by external health checks.

---

## Assumptions

- Each tenant (client) may own one or more WhatsApp instances, up to the limit defined
  by their contracted plan (Basic = 1, Pro = 5, Enterprise = unlimited by default).
  Exact plan tiers and quotas are configurable by the admin.
- Admin users are internal team members with unrestricted, cross-tenant access.
- Notification recipients per instance are configured at instance creation or edit time
  by an admin.
- QR code scanning is performed by the end-user on their personal mobile WhatsApp app;
  the platform only displays the code.
- Alertas de "offline" são limitados a uma notificação por janela de 30 minutos por
  instância. Eventos de queda dentro da mesma janela são silenciados. A notificação de
  recuperação ("online") é enviada apenas quando a instância permanece estável por pelo
  menos 2 minutos após reconexão.
- The WPP Connect integration is used in full: connection lifecycle management (QR code,
  status, reconnection) AND message dispatch API (sending messages on behalf of tenants).
  Content of messages dispatched or received via WPP Connect is never stored in this
  platform — that responsibility belongs to a separate, external system.
- The platform exposes WPP Connect's per-instance dispatch API to external systems;
  it acts as a managed gateway, not as a message content store.
- **Stack context** (for downstream planning, not part of the spec constraints):
  Next.js 14 (frontend), Supabase (auth + database), Vercel (frontend hosting),
  Google Cloud (WPP Connect runtime). API: WPP Connect.
