# Design & Architectural Decisions

**Status:** Public specification of the proprietary ARF Core Engine.  
The engine is access‑controlled and available under outcome‑based pricing.  
Deployment architecture (databases, load balancers, scaling) is **not** specified here – only logical architecture and behavioural contracts.

---

## 1. Overview

The Agentic Reliability Framework (ARF) is a modular governance and reliability engine for AI agents operating in production environments. It provides a **deterministic decision boundary** around agent execution while preserving flexibility for experimentation, research, and enterprise deployment.

ARF is intentionally structured so that:

- Core scoring remains **session‑scoped**, **stateless**, and **auditable**.
- Optional layers may add persistence, longitudinal analysis, or enterprise controls **without changing the meaning** of the core runtime decision.

**Design goals:**

- ✅ Provide deterministic governance at execution time  
- ✅ Separate advisory reasoning from enforcement  
- ✅ Support Bayesian uncertainty modelling  
- ✅ Enable observability and auditability  
- ✅ Preserve a clean boundary between core logic and optional extensions  
- ✅ Allow enterprise‑grade capabilities without compromising core simplicity  

---

## 2. Design Philosophy

ARF is built around the principle that **reliability is not a single model output**. Reliability is a system property that emerges from:

- Clear boundaries  
- Structured policy evaluation  
- Strong observability  
- Careful separation of concerns  

The framework avoids collapsing multiple responsibilities into a single component. Instead, it separates:

| Concern | Component |
|---------|-----------|
| Risk estimation | `RiskEngine` (Bayesian) |
| Policy evaluation | `PolicyEvaluator` |
| Execution gating | Governance loop + expected loss |
| Advisory explanation | `HealingIntent.justification` |
| Persistence & audit | Enterprise layer (optional) |
| Temporal analysis | External adapter (see `temporal_reliability.md`) |

This separation makes the system easier to test, reason about, and adapt to different deployment environments.

---

## 3. Core Design Principles

### 3.1 Separation of Concerns

ARF separates runtime decision logic from governance enforcement, persistence, and longitudinal analysis.

| Layer | Responsibility |
|-------|----------------|
| **Runtime Engine** | Bayesian risk computation |
| **Governance Engine** | Policy evaluation and execution gating |
| **Persistence** | Audit trails, logs, outcome storage |
| **Advisory Layer** | Human‑readable remediation suggestions |
| **Temporal Layer** | Optional cross‑session reliability aggregation |

> ⚠️ The core runtime **must** remain session‑scoped and deterministic.  
> Optional layers may add history‑aware behaviour without changing the semantics of in‑session scoring.

### 3.2 Decision‑Theoretic Action Selection

Risk predictions are probabilistic, but the final action (`APPROVE`, `DENY`, `ESCALATE`) is chosen by **minimising expected loss**, not by fixed probability thresholds.

The expected loss for each action is:

$$
\begin{aligned}
L_{\text{approve}} &= c_{FP}\,\theta \;+\; c_{\text{impact}}\,\text{revenue\_loss} \;+\; c_{\text{pred}}\,\text{pred\_risk} \;+\; c_{\text{var}}\,\sigma^2 \\[4pt]
L_{\text{deny}} &= c_{FN}\,(1-\theta) \;+\; c_{\text{opp}}\,v_{\text{mean}} \\[4pt]
L_{\text{escalate}} &= c_{\text{review}} \;+\; c_{\text{unc}}\,\psi
\end{aligned}
$$

Where:

- \(\theta\) = Bayesian posterior failure probability (`risk_score`)
- \(\sigma^2\) = posterior variance (from the conjugate Beta model)
- \(\psi\) = epistemic uncertainty (composite of hallucination, forecast, and sparsity)
- \(v_{\text{mean}}\) = estimated opportunity value of the action
- \(c_{*}\) = cost constants (see [`governance.md`](governance.md#4-configuration-constants))

**Decision rules:**

- Policy violations → force `DENY`
- If `USE_EPISTEMIC_GATE` is true and \(\psi > \psi_{\text{thresh}}\) → force `ESCALATE`
- Else → action with smallest \(L\)

This approach is strictly more expressive than fixed thresholds and provides a full audit trail.

### 3.3 Modularity

Each ARF capability should be independently testable and replaceable. Modules communicate through explicit interfaces rather than implicit side effects.

**Benefits:**

- Isolated unit testing
- Incremental development
- Safe replacement of components
- Easier external contribution
- Cleaner enterprise extension paths

### 3.4 Determinism at the Boundary

The same inputs must always produce the same decision under the same policy configuration. Where probabilistic methods are used, they serve as **advisory or scoring inputs**, not as sources of non‑deterministic enforcement.

### 3.5 Extensibility

ARF supports:

- Research modules
- Enterprise modules
- Optional adapters
- External scoring layers
- Additional observability tools

Extensibility must **not** degrade the predictability of the core engine.

---

## 4. System Architecture

### 4.1 Core Architecture (Logical)

```mermaid
graph TD
    A[User / Agent] --> B[Frontend (Next.js Dashboard)]
    B --> C[API Control Plane (FastAPI)]
    C --> D[Risk Engine]
    D --> D1[Conjugate Model]
    D --> D2[HMC Model]
    D --> D3[Hyperprior Model]
    D --> E[Policy Engine]
    E --> F[Audit / Storage]
```

### 4.2 Extended Architecture (with Optional Temporal Layer)

```mermaid
graph TD
    A[User / Agent] --> B[Frontend]
    B --> C[API Control Plane]
    C --> D[Core Risk Engine (session-scoped)]
    D --> E[Policy Engine / DPT]
    E --> F[Audit / Storage]
    D -.-> G[Temporal Reliability Adapter]
    G --> H[Cross-session Aggregator]
    H --> I[Enterprise Analytics / Governance]
```

### 4.3 Architectural Consequences

*   The core engine is optimised for **immediate, session‑level reliability scoring**.
    
*   Temporal or longitudinal analysis is **not assumed by default**.
    
*   Enterprise users may add higher‑order stateful capabilities **without altering the runtime contract**.
    
*   Contributors can extend ARF without modifying core execution semantics.
    

5\. Package Structure
---------------------

### 5.1 Core Package (Proprietary)

```text
agentic_reliability_framework/
├── runtime/
│   └── engine.py
├── governance/
│   ├── policy_engine.py
│   └── governance_loop.py
├── advisory/
│   └── advisory.py
├── persistence/
│   └── persistence.py
└── tests/
    └── test_advisory.py
```

### 5.2 Optional Enterprise or Extension Structure

```text
enterprise/
├── temporal/
│   ├── adapter.py
│   ├── aggregator.py
│   ├── decay.py
│   └── storage.py
├── audit/
│   └── audit_trail.py
├── governance/
│   └── longitudinal_controls.py
└── tests/
    └── test_temporal_reliability.py
```

## 5.3 Package Boundary Rules

The temporal layer must not be imported by the core runtime engine unless explicitly activated in an external integration layer.

Core runtime modules should not depend on:

- Session history databases
- Identity systems
- Cross‑session aggregation services
- Hidden stateful indicators

---

## 6. Runtime Model

### 6.1 Session‑Scoped Execution

The core runtime operates on a **single event or session at a time**. It evaluates the immediate context and produces a decision or advisory artifact based on current inputs. This is the default operating mode.

### 6.2 Advisory vs Enforcement

ARF distinguishes between:

- **Advisory reasoning** – what *should* happen  
- **Enforcement logic** – what *is allowed* to happen  

This distinction prevents uncertainty estimates from directly becoming execution side effects.

### 6.3 `ReliabilitySignal` Boundary

A `ReliabilitySignal` represents a **single‑session reliability assessment**. It remains pure with respect to session‑level inputs and is not mutated by longitudinal history. Any cross‑session extension must be implemented outside the core signal semantics.

---

## 7. Temporal Reliability Boundary

### 7.1 Purpose

Temporal reliability answers a **different question** from core ARF:

| Layer | Question |
|-------|----------|
| Core ARF | *Is this safe now?* |
| Temporal layer | *Has this been reliable over time?* |

### 7.2 Why It Is Separate

Cross‑session reliability introduces:

- Storage requirements  
- Identity linkage  
- Time window semantics  
- Decay functions  
- Aggregation policies  
- Data retention implications  

These concerns belong **outside** the core deterministic runtime.

### 7.3 Allowed Temporal Inputs

Temporal extensions **may** use:

- `session_id`
- `observed_at`
- Time windows
- Decay functions
- Cross‑session aggregation

### 7.4 Temporal Layer Constraints

Temporal layers **must not**:

- Alter in‑session scoring behaviour  
- Mutate the meaning of `ReliabilitySignal`  
- Force persistence into the core runtime path  
- Create hidden coupling to enterprise identity or analytics systems  

See [`temporal_reliability.md`](temporal_reliability.md) for the full contract.

---

## 8. Observability and Auditability

ARF is designed to be **inspectable**. Every decision path supports:

- ✅ Audit logging  
- ✅ Structured explanations  
- ✅ Trace IDs  
- ✅ Policy version tracking  
- ✅ Override recording  
- ✅ Replayability for analysis  

**Observability metrics** (exposed via Prometheus):

| Metric | Description |
|--------|-------------|
| `scoring_latency_seconds` | Time to compute risk score |
| `policy_evaluation_duration` | Time to evaluate policies |
| `escalation_total` | Count of `ESCALATE` decisions |
| `denial_total` | Count of `DENY` decisions |
| `confidence_distribution` | Histogram of `confidence` values |
| `longitudinal_trend` (optional) | External trend if temporal layer enabled |

> 🎯 Goal: Not just to know *what* happened, but to know *why* it happened and how the system reached that result.

---

## 9. Extensibility Strategy

### 9.1 Core Extension Model

Extensions attach through **explicit interfaces** and must not depend on undocumented internal assumptions.

### 9.2 Recommended Extension Types

- Adapters  
- Aggregators  
- Policy modules  
- Storage backends  
- Analysis services  
- Enterprise governance modules  

### 9.3 Extension Rules

Extensions **should**:

- ✅ Preserve core behaviour  
- ✅ Be optional  
- ✅ Have explicit configuration  
- ✅ Be independently testable  
- ✅ Fail safely (no hidden side effects)  

---

## 10. Enterprise Boundary

Enterprise capabilities **may** include:

| Capability | Description |
|------------|-------------|
| Multi‑tenancy | Organisations, projects, roles |
| RBAC | Role‑based access control |
| Audit compliance | SOC2, GDPR, HIPAA |
| Distributed infrastructure | Kubernetes, global replicas |
| Policy versioning | Immutable policy history |
| Temporal aggregation | Cross‑session reliability scores |
| Custom retention | Data lifecycle policies |
| Reporting & analytics | Dashboards, alerts |

Enterprise systems **should separate**:

- Core risk computation  
- Policy enforcement  
- Audit logging  
- Temporal aggregation  
- Analytics and reporting  

The enterprise layer may introduce **stateful longitudinal trust tracking**, but this must always be isolated from the core engine.

---

## 11. System Dynamics Model

To understand feedback loops and emergent behaviour, we model ARF as a **causal loop diagram**.

### 11.1 Core Feedback Loops

```mermaid
graph TD
    A[Agent Action Request] --> B[Risk Score θ]
    B --> C[Expected Loss L]
    C --> D[Decision: Approve/Deny/Escalate]
    D --> E[Outcome Success/Failure]
    E --> F[Update Beta Priors]
    F --> B
    B --> G[Epistemic Uncertainty ψ]
    G --> H{Escalation Gate?}
    H -->|ψ > threshold| D
    H -->|ψ low| C
    D --> I[Human Review (if escalate)]
    I --> E
```

**Reinforcing loops:**

- **Learning loop:** More outcomes → better priors → lower risk variance → more confident approvals (reinforcing, but bounded by data).
- **Trust erosion loop:** Failures → higher risk scores → more denials/escalations → less autonomy (balancing).

**Balancing loops:**

- **Uncertainty gate:** High ψ forces escalation, which adds human review → reduces risk of catastrophic failure.
- **Policy override:** Policy violations bypass risk entirely, forcing deny (hard constraint).

### 11.2 Stock‑and‑Flow (High‑Level)

| Stock | Inflows | Outflows |
|-------|---------|----------|
| `Posterior parameters (α,β)` | Outcome observations | Bayesian updates |
| `HMC model coefficients` | Periodic retraining | Prediction requests |
| `Audit log entries` | Each decision | Retention policy (enterprise) |
| `Trust capital` (enterprise) | Successful autonomous actions | Failures, escalations |

This dynamics model informs capacity planning and risk thresholds. Enterprises may simulate these loops to tune cost constants.

---

## 12. Design Recommendations

- ✅ Keep the runtime engine **stateless**  
- ✅ Store posterior parameters externally when persistence is needed  
- ✅ Use **versioned policies**  
- ✅ Implement **structured logging**  
- ✅ Treat temporal reliability as an **adapter or service**, not a core primitive  
- ✅ Preserve **deterministic scoring boundaries** in the core engine  
- ✅ Add longitudinal analysis only through **explicit extension points**  
- ✅ Avoid hidden state in execution paths  
- ✅ Ensure every extension has a **clear ownership boundary**  

---

## 13. Status

This document defines the **architectural boundary** of the ARF Core Engine.

- The core execution model remains **session‑scoped and deterministic**.
- Temporal reliability is intentionally **externalised** for optional enterprise or extension‑layer implementation.
- This preserves the current product direction while leaving room for more advanced longitudinal governance capabilities in the future.

---

## 14. See Also

- [`core_concepts.md`](core_concepts.md) – canonical definitions of intents, risk score, and execution ladder  
- [`mathematics.md`](mathematics.md) – Bayesian risk scoring formulas  
- [`governance.md`](governance.md) – governance loop flow and configuration constants  
- [`temporal_reliability.md`](temporal_reliability.md) – optional external layer contract  
- [`enterprise.md`](enterprise.md) – enterprise enforcement and audit trails  
