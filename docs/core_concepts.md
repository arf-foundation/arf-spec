# Core Concepts (Canonical)

This document defines the core entities, execution model, and escalation gates of the ARF Core Engine.  
All other specification pages link here for canonical definitions.

**Status:** Public specification – describes behaviour of the proprietary ARF Core Engine.  
The engine is access‑controlled and available under outcome‑based pricing.

---

## 1. Infrastructure Intent

`InfrastructureIntent` is an abstract base class representing a request to perform an infrastructure action.  
Concrete subclasses:

- `ProvisionResourceIntent` – create a cloud resource (VM, database, storage, etc.)
- `GrantAccessIntent` – grant permissions to a user or service
- `DeployConfigurationIntent` – change configuration of a service or infrastructure

All intents share common fields:

| Field | Type | Description |
|-------|------|-------------|
| `service_name` | `str` | Name of the affected service |
| `environment` | `str` | Deployment environment (`dev`, `staging`, `prod`) |
| `requester` | `str` | Identity of the user or agent making the request |
| `provenance` | `Optional[Dict]` | Optional tracing information (e.g., chain of parent intents) |

**Canonical reference:** This is the single source of truth for `InfrastructureIntent`.  
Implementations in the core engine follow this contract.

---

## 2. Healing Intent

`HealingIntent` is an immutable container for a governance recommendation, produced by `GovernanceLoop.run()`.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `action` | `str` | One of `"approve"`, `"deny"`, `"escalate"` |
| `component` | `str` | Affected service/component |
| `risk_score` | `float` | Calibrated failure probability (0–1) – see `RiskScore` below |
| `risk_factors` | `Dict[str, float]` | Additive contributions from each Bayesian component |
| `confidence` | `float` | Derived from epistemic uncertainty (1 – uncertainty) |
| `policy_violations` | `List[str]` | List of violated policy rules (empty if none) |
| `recommended_action` | `RecommendedAction` | Enum (`APPROVE`, `DENY`, `ESCALATE`) |
| `metadata` | `Dict` | Decision trace, forecasts, epistemic breakdown, etc. |
| `source` | `IntentSource` | Always `INFRASTRUCTURE_ANALYSIS` for core engine |
| `infrastructure_intent_id` | `str` | ID of the original `InfrastructureIntent` |
| `ancestor_chain` | `Tuple[str, ...]` | Full traceability chain |

### Methods

- `to_dict(include_oss_context: bool) -> Dict` – serialise to JSON‑compatible dict.
- `with_execution_result(...)` – create a new intent with execution outcome (enterprise only).
- `sign(private_key)` – optional cryptographic signing.

**Canonical reference:** This is the single source of truth for `HealingIntent`.

---

## 3. Risk Score

`RiskScore` is the calibrated failure probability computed by the `RiskEngine`.  
It is a `float` in the closed interval `[0.0, 1.0]`.

### Composition

The final risk score is a weighted blend of up to three Bayesian components:

- **Conjugate prior** – online Beta‑Binomial posterior mean (always present)
- **HMC prediction** – offline logistic regression with Hamiltonian Monte Carlo (optional)
- **Hyperprior** – hierarchical Beta shrinkage (optional)

Weights are dynamic based on data availability.  
The score includes uncertainty quantification (90% HDI) and a context multiplier.

### Explanation

Every risk score is accompanied by a human‑readable justification and a decomposition of contributions (`risk_factors`).

**Canonical reference:** The term “risk score” throughout this specification refers to this definition.

---

## 4. Governance Loop

`GovernanceLoop` is the main orchestrator that processes an `InfrastructureIntent` and returns a `HealingIntent`.

### Inputs

- `InfrastructureIntent` – the request to evaluate
- `context` – a dictionary containing runtime data (incident ID, telemetry, etc.)

### Outputs

- `HealingIntent` – contains decision, risk score, justification, and full trace

### Components (pluggable)

| Component | Purpose |
|-----------|---------|
| `PolicyEvaluator` | Evaluates policy rules; any violation forces `DENY` |
| `CostEstimator` | Estimates monthly cost of the intent |
| `RiskEngine` | Computes Bayesian risk score |
| `SimplePredictiveEngine` | (Optional) forecasts service health |
| `RAGGraphMemory` | (Optional) retrieves similar past incidents |
| `HallucinationRisk` | (Optional) ECLIPSE probe for epistemic uncertainty |

### Execution Flow (summary)

1. Cost estimation
2. Policy evaluation (violations → immediate `DENY`)
3. Risk calculation
4. Predictive foresight (optional)
5. Business impact calculation
6. Epistemic uncertainty (optional)
7. Expected loss minimisation
8. Decision selection (approve/deny/escalate)
9. Semantic memory retrieval (optional)
10. Build and return `HealingIntent`

For the detailed step‑by‑step flow, see [`governance.md`](governance.md).

**Canonical reference:** This is the single source of truth for `GovernanceLoop`.

---

## 5. Execution Ladder

The Execution Ladder defines graduated levels of autonomy that the core engine can recommend or (in enterprise mode) enforce.  
The ladder is **code‑enforced** in the proprietary engine.

| Level | Capability | Typical Use |
|-------|------------|--------------|
| **Advisory Only** | No execution; returns recommendation only | Default for unlicensed use |
| **Operator Review** | Requires explicit human confirmation before execution | High‑risk first‑time actions |
| **Supervised** | Real‑time human oversight; AI acts with continuous supervision | Critical production changes |
| **Autonomous (Low Risk)** | Bounded automation for low‑risk actions; no human in the loop | Routine, well‑understood tasks |
| **Autonomous (High Risk)** | High‑risk actions gated by license and administrative approval | Infrastructure mutations with rollback |
| **Novel Execution** | Protocol‑driven execution for first‑of‑its‑kind actions; requires review board | Experimental or unprecedented actions |

**Boundary note:** The core engine **recommends** a ladder level based on risk, confidence, and policy.  
Enterprise enforcement **mechanically enforces** the ladder, blocking actions that exceed the licensed level.

---

## 6. Escalation Gates

Escalation gates are **mechanical validation functions** that must pass for an action to proceed at a given ladder level.  
They are implemented in code, not as policies or guidelines.

| Gate | Description | Required For |
|------|-------------|--------------|
| `operator_confirmation` | Explicit human approval tracked in context | Operator Review and above |
| `risk_assessment` | Evaluates blast radius, danger patterns, business hours | Autonomous (High Risk), Novel Execution |
| `rollback_feasibility` | Ensures action can be reversed; checks system snapshots | Any state‑changing action |
| `license_validation` | Programmatic license check for autonomy level | Autonomous (Low/High), Novel Execution |
| `admin_approval` | Executive or compliance officer approval | Autonomous (High Risk), Novel Execution |
| `novel_action_review` | Review board approval for unprecedented actions | Novel Execution only |

**Mechanical enforcement:** If a gate fails, the action is **blocked** (enterprise mode) or **downgraded to advisory** (core engine without enforcement).  
The core engine always evaluates gates; only enterprise customers can enforce them.

---

## 7. Public vs. Proprietary Boundary

| Concept | Public Specification | Proprietary Engine |
|---------|----------------------|---------------------|
| `InfrastructureIntent` | ✅ Defined | ✅ Implemented |
| `HealingIntent` | ✅ Defined | ✅ Implemented |
| `RiskScore` | ✅ Defined | ✅ Implemented |
| `GovernanceLoop` flow | ✅ Defined | ✅ Implemented |
| Execution Ladder levels | ✅ Defined | ✅ Implemented (recommendation) |
| Escalation gates | ✅ Defined | ✅ Implemented (evaluation) |
| **Mechanical enforcement** | ❌ Not defined | 🔒 Enterprise only |
| License validation logic | ❌ Not defined | 🔒 Proprietary |
| Audit trail persistence | ❌ Not defined | 🔒 Enterprise only |

All public documentation references these canonical definitions.  
For implementation details, refer to the proprietary engine’s internal documentation (not public).

---

## 8. Related Documents

- [`governance.md`](governance.md) – detailed step‑by‑step flow and configuration constants
- [`mathematics.md`](mathematics.md) – Bayesian risk scoring formulas
- [`design.md`](design.md) – architectural decisions and trade‑offs
- [`temporal_reliability.md`](temporal_reliability.md) – optional time‑series extension
