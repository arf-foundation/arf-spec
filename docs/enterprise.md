# Enterprise Capabilities

**Status:** Proprietary – available only under outcome‑based pricing to qualified pilots and enterprise customers.  
This document describes the **enforcement layer** that builds on the core ARF engine.

> **Canonical definitions** of the Execution Ladder, escalation gates, `InfrastructureIntent`, `HealingIntent`, and `RiskScore` are in [`core_concepts.md`](core_concepts.md).  
> The governance loop flow and cost constants are in [`governance.md`](governance.md).

---

!!! warning "Specification Status"
    This document describes **planned** and **enterprise‑only** capabilities.  
    ✅ Implemented items are marked.  
    Enterprise features require a commercial license.

---

## 1. Overview

The ARF Enterprise layer adds **mechanical enforcement**, **audit trails**, **multi‑tenancy**, and **longitudinal governance** to the core engine. It transforms advisory recommendations into enforceable actions with full compliance and observability.

| Capability | Description |
|------------|-------------|
| **Execution Ladder Enforcement** | Mechanically enforce the ladder levels (advisory → autonomous → novel) based on license and policy |
| **Escalation Gates** | Code‑enforced validation of operator confirmation, risk assessment, rollback feasibility, license, admin approval, novel action review |
| **Audit Trails** | Immutable, cryptographically signed records of every decision, gate passage/failure, and override |
| **Multi‑tenancy & RBAC** | Isolated data per organisation, fine‑grained roles (admin, reviewer, operator, auditor) |
| **Outcome‑Based Pricing** | Pay only for successfully enforced autonomous actions – aligns cost with value delivered |

---

## 2. Execution Ladder Enforcement (Proprietary)

The Execution Ladder (defined in [`core_concepts.md`](core_concepts.md)) is **mechanically enforced** only in the enterprise layer.

| Level | Core Engine (Advisory) | Enterprise (Enforcement) |
|-------|------------------------|---------------------------|
| Advisory Only | ✅ Recommends | ✅ Blocks execution |
| Operator Review | ✅ Recommends | ✅ Requires human confirmation |
| Supervised | ✅ Recommends | ✅ Requires live oversight |
| Autonomous (Low Risk) | ✅ Recommends | ✅ Executes autonomously |
| Autonomous (High Risk) | ✅ Recommends | ✅ Executes only with license + admin approval |
| Novel Execution | ✅ Recommends | ✅ Executes only with review board approval |

**Enforcement mechanism:** The enterprise layer intercepts the `HealingIntent` from the core engine, validates the required escalation gates, checks the license, and either executes or blocks the action. All gate outcomes are logged to the audit trail.

---

## 3. Escalation Gates (Mechanical Validation)

The following gates (defined in [`core_concepts.md`](core_concepts.md)) are **validated in code** by the enterprise layer:

| Gate | Validation Logic | Failure Action |
|------|----------------|----------------|
| `operator_confirmation` | Check for explicit human approval token | Block, require approval |
| `risk_assessment` | Evaluate blast radius, danger patterns, business hours | Block, escalate to human |
| `rollback_feasibility` | Verify snapshot/undo capability | Block, require manual rollback plan |
| `license_validation` | Cryptographically verify license key and tier | Block, return licensing error |
| `admin_approval` | Check for executive or compliance officer approval | Block, require admin override |
| `novel_action_review` | Verify review board sign‑off | Block, require board review |

All gate validation results are **auditable** and **replayable**.

---

## 4. Audit Trails

Every enterprise decision generates an immutable audit record containing:

- `timestamp` (ISO 8601)
- `session_id` – unique identifier for the evaluation
- `infrastructure_intent` – the original request (sanitised if needed)
- `healing_intent` – the recommendation from core engine
- `escalation_gates_passed` – list of gates that succeeded
- `escalation_gates_failed` – list of gates that failed (with reasons)
- `license_tier` – the license used for enforcement
- `final_action` – what was actually executed (`APPROVE`, `DENY`, `ESCALATE`)
- `execution_result` – success/failure of the action (if executed)
- `human_overrides` – any manual overrides with justification
- `signature` – cryptographic hash for tamper‑proofing

Audit logs are stored in a **write‑once, append‑only** database with retention policies configurable per tenant.

---

## 5. Multi‑tenancy & RBAC

Enterprise deployments support **isolated tenants** (organisations, projects) with **fine‑grained roles**:

| Role | Permissions |
|------|-------------|
| Admin | Full control: configure policies, manage licenses, view all audits |
| Reviewer | Approve/deny escalation requests, view audits |
| Operator | Execute approved actions, view own audit trail |
| Auditor | Read‑only access to all audit logs |
| Agent | API key for autonomous agents (scoped to a project) |

Tenant isolation ensures that data from one organisation never leaks to another. All API calls require a valid JWT or API key with role claims.

---

## 6. Outcome‑Based Pricing

The enterprise layer is offered under **outcome‑based pricing**: customers pay only for successfully enforced autonomous actions that provide business value.

**Pricing tiers (indicative):**

| Tier | Price | Capability |
|------|-------|------------|
| Pilot | Free (time‑limited) | Up to 1,000 evaluations/month, advisory only |
| Pro | $2,000–5,000/month | Supervised + low‑risk autonomous execution |
| Enterprise | $15,000–50,000+/month | High‑risk autonomous, novel execution, audit trails, SLA |

**Metering:** The enterprise layer counts every `HealingIntent` that results in an enforced execution (not advisory). Usage is reported via a secure telemetry channel (opt‑out for on‑premises).

For detailed licensing terms, contact the founder (see `README.md`).

---

## 7. Deployment Architectures (Examples)

The enterprise layer supports multiple deployment models:

### 7.1 Cloud (SaaS)

- **Control plane** hosted by ARF Foundation
- **Data plane** customer‑managed or ARF‑managed
- **Audit logs** stored in customer’s cloud (AWS S3, Azure Blob, GCS) with encryption

### 7.2 On‑Premises / VPC

- **Docker containers** or **Helm charts** for Kubernetes
- **License validation** offline (cryptographic key file)
- **Audit logs** stored locally, exportable to SIEM

### 7.3 Hybrid

- Core engine runs on‑premises
- License validation and audit aggregation in ARF cloud (optional)

> ⚠️ These are **example architectures** – actual deployment details are proprietary and provided under NDA to enterprise customers.

---

## 8. Longitudinal Trust Tracking (Enterprise Optional)

The enterprise layer may include a **temporal reliability module** that builds on the contract defined in [`temporal_reliability.md`](temporal_reliability.md). This module:

- Aggregates `ReliabilitySignal` outputs across sessions
- Applies exponential decay and time windows
- Computes `WindowedReliabilityResult` with trend and sample count
- Feeds longitudinal scores back into policy decisions (e.g., lower autonomy for degrading trust)

**Boundary:** This module is **external** to the core engine and respects the isolation rules defined in [`design.md`](design.md) and [`temporal_reliability.md`](temporal_reliability.md).

---

## 9. Compliance & Certifications

Enterprise customers may require compliance with:

- **SOC2 Type II** – audit controls, security, availability
- **GDPR** – data deletion, portability, consent
- **HIPAA** – business associate agreements (BAA) for healthcare workloads
- **FedRAMP** – for US government (on request)

ARF Enterprise provides **evidence packages** and **auditor access** to support certification efforts.

---

## 10. Integration with Existing Systems

Enterprise layer provides adapters for:

| System | Integration Point |
|--------|-------------------|
| **Kubernetes** | Admission controller (validating webhook) |
| **Terraform** | Provider plugin to gate `apply` |
| **AWS/Azure/GCP** | Policy as code hooks (e.g., AWS Config, Azure Policy) |
| **PagerDuty** | Escalation notifications |
| **Slack/Teams** | Human‑in‑the‑loop approval requests |
| **SIEM (Splunk, Datadog)** | Audit log forwarding |

---

## 11. Public vs. Proprietary Boundary (Enterprise)

| Concept | Public Spec | Enterprise Implementation |
|---------|-------------|----------------------------|
| Execution Ladder levels | ✅ Defined | 🔒 Mechanically enforced |
| Escalation gate definitions | ✅ Defined | 🔒 Validated in code |
| Audit trail schema | ✅ Defined (conceptual) | 🔒 Implemented with crypto signing |
| Outcome‑based pricing | ❌ Not defined | 🔒 Proprietary metering |
| License validation logic | ❌ Not defined | 🔒 Cryptographic keys, offline/online |
| Deployment architectures | ❌ Not specified | 🔒 Under NDA |
| Multi‑tenancy RBAC | ❌ Not defined | 🔒 Implemented |

---

## 12. See Also

- [`core_concepts.md`](core_concepts.md) – Execution Ladder and escalation gates (canonical)
- [`governance.md`](governance.md) – governance loop flow and cost constants
- [`design.md`](design.md) – architectural decisions and system dynamics
- [`temporal_reliability.md`](temporal_reliability.md) – optional longitudinal extension contract
- [`mathematics.md`](mathematics.md) – Bayesian risk scoring formulas

---

## 13. Contact for Enterprise Access

To request pilot access or an enterprise license, contact:

- **Email:** `petter2025us@outlook.com`
- **LinkedIn:** [Juan Petter](https://www.linkedin.com/in/petterjuan/)
- **Book a call:** [Calendly – 30‑min consultation](https://calendly.com/petter2025us/30min)

Please provide:
- Organisation name and use case
- Expected monthly autonomous action volume
- Cloud environment(s)
- Compliance requirements (if any)
