# Philosophy of ARF

ARF is not just a set of algorithms or a policy engine. It is a **coherent design philosophy** for making autonomous AI safe, accountable, and commercially viable. This page captures the underlying beliefs, trade‑offs, and first principles that guide every architectural decision. Wherever possible, we link to the actual code that embodies these ideas (the core engine is proprietary, but its behaviour is exactly as described in the public specification).

---

## 1. Core Beliefs

### 1.1 Reliability is a system property, not a model output

No single number (accuracy, F1, etc.) can capture operational reliability. Reliability emerges from clear boundaries, structured policy evaluation, strong observability, and careful separation of concerns. ARF therefore separates:

- **Risk estimation** – `RiskEngine` (in `risk_engine.py`) combines conjugate Beta priors, HMC logistic regression, and optional hyperpriors.
- **Policy enforcement** – `PolicyEvaluator` (used in `governance_loop.py`) returns a list of violations; any violation forces `DENY`.
- **Advisory reasoning** – the `HealingIntent` contains a human‑readable `justification` and `risk_factors` breakdown.
- **Execution gating** – the enterprise layer (Rust `ExecutionLadder`) validates gates (license, confidence, risk, rollback, causal).

### 1.2 Probabilistic inputs, deterministic actions

AI models are inherently probabilistic, but production systems require deterministic, auditable actions. ARF therefore:

- Uses Bayesian risk scores **only as advisory inputs** – the risk score is a posterior mean (`conjugate_risk` in `risk_engine.py`), but the final action is chosen by **expected loss minimisation** (see `governance_loop.py`, lines where `L_approve`, `L_deny`, `L_escalate` are computed).
- Never uses fixed probability thresholds. Instead, it computes `expected_losses` and selects the action with the **minimum expected loss** (or overrides via policy or epistemic gate).
- Applies **epistemic uncertainty** (`psi_mean` in `governance_loop.py`) to escalate, not to guess.

### 1.3 Trust through transparency, not black‑boxes

Explainability is a first‑class requirement. Every decision must answer: *What happened? Why? What would change the outcome?* ARF provides:

- Structured justifications (the `explanation` string from `risk_engine.calculate_risk()`).
- Confidence intervals (derived from Beta posterior variance).
- Causal explanations (via the enterprise `CausalExplainer`).

### 1.4 Pilot‑first, honest boundaries

The core engine is **proprietary and access‑controlled**, offered under outcome‑based pricing. This is not a restriction – it is a commitment to sustainability and continuous improvement. The public specification, demo UI, and pitch deck are fully open source (Apache 2.0). This clear boundary ensures:

- Enterprises can evaluate ARF without operational risk.
- The core engine remains focused, fast, and commercially supported.
- The open‑source community can contribute to the spec and demos.

---

## 2. Design Tenets (with code evidence)

| Tenet | Implementation in Code |
|-------|------------------------|
| **Determinism at the boundary** | `GovernanceLoop.run()` (same inputs → same decision) – no hidden randomness. The only “random” part is Monte Carlo sampling for CVaR, which is advisory. |
| **Separation of concerns** | `GovernanceLoop` orchestrates independent modules: `RiskEngine`, `PolicyEvaluator`, `CostEstimator`, `RAGGraphMemory`, etc. |
| **Extensibility without corruption** | Optional components (hyperpriors, epistemic gate, predictive engine) are enabled via configuration flags (`use_hyperpriors`, `enable_epistemic`). |
| **Safety by default** | When uncertain, `USE_EPISTEMIC_GATE` and `psi_mean > EPISTEMIC_ESCALATION_THRESHOLD` force `ESCALATE` (see `governance_loop.py`). Policy violations always force `DENY`. |
| **Economic alignment** | Outcome‑based pricing is enforced in the enterprise layer; the OSS constants (`COST_FP`, `COST_FN`, etc.) reflect real business trade‑offs (e.g., `COST_FP` > `COST_FN` penalises false positives more). |

---

## 3. Human‑Centric AI

Psychological principles (see [`psychology.md`](psychology.md)) are not “nice to have” – they are **mechanically enforced**:

- **Trust calibration** – the `confidence` field in `HealingIntent` is set to `1.0 - psi_mean`, and the frontend displays credible intervals.
- **Cognitive load reduction** – the dashboard prioritises critical alerts, then system status, then trends.
- **Bias mitigation** – pessimistic priors are hardcoded in `PRIORS` (e.g., database actions have `Beta(1.5, 8.0)` – prior mean ≈0.16). Periodic fairness audits can be run on enterprise audit logs.
- **Human‑in‑the‑loop** – automatic escalation when `psi_mean > EPISTEMIC_ESCALATION_THRESHOLD` or when policy violations occur.

---

## 4. Mathematical Minimalism

ARF uses the **minimum mathematics necessary** for safety and explainability:

- **Conjugate Beta‑Binomial priors** – fast, interpretable, updateable (`BetaStore` in `risk_engine.py`).
- **HMC (offline)** – captures complex interactions (time, role, environment) without over‑engineering (`HMCModel`).
- **Hyperprior shrinkage** – shares strength across sparse categories (`HyperpriorBetaStore` uses Pyro SVI).
- **Expected loss minimisation** – chooses action by balancing risk, cost, and uncertainty (formulas in `governance_loop.py` using constants like `COST_FP`, `COST_IMPACT`, etc.).
- **Lyapunov stability** – provides local asymptotic guarantees for healing actions (enterprise layer, not in OSS, but described in [`mathematics.md`](mathematics.md)).

We do not add complexity for its own sake. Every formula serves a clear operational purpose.

---

## 5. Commercial Realism

ARF is not a research project – it is a **product**. The philosophy acknowledges that:

- **Open source does not mean free infrastructure** – the core engine is proprietary to ensure sustained development, support, and security.
- **Pilot‑first, outcome‑based pricing** aligns incentives: customers pay when ARF reduces risk, not for idle evaluations.
- **Transparency about limitations** – the public spec honestly states what is public vs. private, what is implemented vs. planned. The constants file (`constants.py`) explicitly defines OSS boundaries (`EXECUTION_ALLOWED = False`, `MCP_MODES_ALLOWED = ("advisory",)`).

---

## 6. Where Philosophy Meets Code (Concrete File References)

The principles above are not abstract – they are enforced in the actual implementation:

- **`governance_loop.py`** – deterministic expected loss minimisation, policy override, epistemic gate, and creation of `HealingIntent`.
- **`risk_engine.py`** – hybrid Bayesian fusion with caps: `w_hmc = min(0.6, n/n0)`, `w_hyper = min(0.3, ...)`, ensuring weights sum to 1.
- **`constants.py`** – cost coefficients (`COST_FP`, `COST_FN`, `COST_REVIEW`, etc.) and OSS boundaries (`EXECUTION_ALLOWED = False`, `MAX_INCIDENT_NODES = 1000`, etc.).

These files are proprietary, but their behaviour is exactly as described in the public specification. The philosophy tab serves as a bridge between high‑level principles and the actual code.

---

## 7. See Also

- [`design.md`](design.md) – architectural decisions that implement these principles.
- [`psychology.md`](psychology.md) – psychological foundations of trust and explainability.
- [`governance.md`](governance.md) – the governance loop that turns philosophy into action.
- [`mathematics.md`](mathematics.md) – mathematical formulations referenced here.
