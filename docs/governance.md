# Governance Loop – Flow & Configuration

This document describes the **step‑by‑step execution** of the ARF Core Engine’s governance loop, the **constants** that control its behaviour, and the **expected loss minimisation** decision rule.

> **Canonical definitions** of `InfrastructureIntent`, `HealingIntent`, `RiskScore`, and `GovernanceLoop` are in [`core_concepts.md`](core_concepts.md).  
> **Mathematical foundations** of risk scoring and expected loss are detailed in [`mathematics.md`](mathematics.md).

**Implementation status:** The behaviour described here is implemented in the **proprietary core engine**. The engine is access‑controlled and available under outcome‑based pricing. This public specification describes *what* the engine does, not *how* it is implemented internally.

---

## 1. Overview

The governance loop processes an `InfrastructureIntent` and returns a `HealingIntent` containing:

- A recommended action (`APPROVE`, `DENY`, or `ESCALATE`)
- A calibrated risk score (`RiskScore`) with component decomposition
- A detailed justification
- Full metadata for traceability (epistemic uncertainty, business impact, forecasts, etc.)

The loop is **deterministic** for a given input, ensuring reproducibility and auditability.

---

## 2. Step‑by‑Step Execution

```text
InfrastructureIntent
        ↓
   Cost Estimation
        ↓
   Policy Evaluation
        ↓
   Risk Calculation (Bayesian fusion)
        ↓
   Predictive Foresight (optional)
        ↓
   Business Impact Estimation
        ↓
   Epistemic Uncertainty (optional)
        ↓
   Expected Loss Minimisation
        ↓
   Decision Selection
        ↓
   Semantic Memory Retrieval (optional)
        ↓
     HealingIntent
```

### Step 1 – Cost Estimation

`cost_estimator.estimate_monthly_cost(intent)` returns a projected monthly cost (if available).  
Failures are logged but do not block evaluation.

### Step 2 – Policy Evaluation

`policy_evaluator.evaluate(intent, policy_context)` returns a list of policy violations (empty if none).  
**If any violations exist, the loop immediately sets the recommended action to `DENY`** – policy rules are hard constraints that override all other factors.

### Step 3 – Risk Calculation

`risk_engine.calculate_risk(intent, cost_estimate, policy_violations)` returns:

- `risk_score` – final Bayesian risk (posterior mean) in $[0,1]$
- `explanation` – human‑readable justification
- `contributions` – dictionary with per‑component means (`conjugate_mean`, `hyper_mean`, `hmc_prediction`) and their weights

Posterior variance $\text{Var}(p_c)$ is computed from the Beta parameters for the conjugate component.  
The raw risk is smoothed using exponential decay before loss calculation (see Section 7.1).

### Step 4 – Predictive Foresight (Optional)

If a `SimplePredictiveEngine` is configured, it forecasts service health for the next few time steps.  
Each forecast has a `risk_level` (`low`, `medium`, `high`, `critical`) and a `confidence` in $[0,1]$.  
Risk levels are mapped to numeric values:

| Risk Level | Numeric Risk |
|------------|--------------|
| `low`      | 0.1          |
| `medium`   | 0.4          |
| `high`     | 0.7          |
| `critical` | 0.95         |

The weighted average of these numeric risks, using softmax over confidences as weights, is multiplied by the mean confidence to yield a `predictive_risk` score.

### Step 5 – Business Impact

Using the `BusinessImpactCalculator`, the loop estimates potential revenue loss $b_{\text{mean}}$ based on current service telemetry (latency, error rate, throughput).

### Step 6 – Epistemic Uncertainty (Optional)

If `enable_epistemic` is `True`, the loop computes a composite epistemic uncertainty score $\psi_{\text{mean}}$ as:

$$
\psi_{\text{mean}} = 1 - (1 - \text{hallucination\_risk}) \cdot (1 - \text{forecast\_uncertainty}) \cdot (1 - \text{data\_sparsity})
$$

where:

- `hallucination_risk` is obtained from an **ECLIPSE probe** (if available) using `entropy`, `evidence_lift`, and `contradiction` signals.
- `forecast_uncertainty` $= 1 - \text{mean}(\text{confidence})$ of the forecasts.
- `data_sparsity` $= \exp(-0.05 \cdot \text{len}(\text{history}))$ – decays exponentially with more historical data.

If any component is unavailable, it defaults to 0.

### Step 7 – Expected Loss Calculation

For each possible action $a \in \{\text{approve}, \text{deny}, \text{escalate}\}$, the loop computes an expected loss using configurable cost constants.

#### 7.1 Risk Decay (Exponential Smoothing)

To avoid single‑session outliers dominating decisions, the raw risk score $R_t$ is smoothed using a per‑component exponential moving average:

$$
\tilde{R}_t = \gamma \cdot \tilde{R}_{t-1} + (1-\gamma) \cdot R_t
$$

with default $\gamma = 0.9$ (configurable via `RISK_DECAY_FACTOR`). For the first evaluation of a component, $\tilde{R}_0 = R_0$.  
The decayed risk $\tilde{R}$ is used in the loss formulas below.

#### 7.2 Expected Loss Formulas

$$
\begin{aligned}
L_{\text{approve}} &= \text{COST\_FP} \cdot \tilde{R} + \text{COST\_IMPACT} \cdot b_{\text{mean}} + \text{COST\_PREDICTIVE} \cdot \text{predictive\_risk} + \text{COST\_VARIANCE} \cdot \text{Var}(p_c) \\[4pt]
L_{\text{deny}} &= \text{COST\_FN} \cdot (1 - \tilde{R}) + \text{COST\_OPP} \cdot v_{\text{mean}} \\[4pt]
L_{\text{escalate}} &= \text{COST\_REVIEW} + \text{COST\_UNCERTAINTY} \cdot \psi_{\text{mean}}
\end{aligned}
$$

where:

- $\tilde{R}$ = decayed risk (Section 7.1)
- $\text{Var}(p_c)$ = posterior variance of the conjugate Beta distribution
- $\psi_{\text{mean}}$ = epistemic uncertainty composite (Step 6)
- $b_{\text{mean}}$ = estimated revenue loss from business impact
- $v_{\text{mean}}$ = estimated opportunity value of the action (optional, default 0)
- $\text{COST\_*}$ are configuration constants (see Section 3)

#### 7.3 Enterprise Extension: CVaR for Tail Risk

When `USE_CVAR` is `True` (default: `False`), the approve loss is computed using Conditional Value at Risk (CVaR) instead of expectation. Posterior samples of the failure probability $\tilde{p} \sim \text{Beta}(\alpha_c, \beta_c)$ are drawn, and the average of the worst $\alpha$ fraction (typically $\alpha = 0.05$) of per‑sample losses is used:

$$
L_{\text{approve}}^{\text{CVaR}} = \text{CVaR}_\alpha\!\left[ \text{COST\_FP} \cdot \tilde{p} + \text{COST\_IMPACT} \cdot b_{\text{mean}} + \text{COST\_PREDICTIVE} \cdot \text{predictive\_risk} \right] + \text{COST\_VARIANCE} \cdot \text{Var}(p_c)
$$

This feature is **disabled by default** in the core engine and may be enabled by enterprise customers.

### Step 8 – Decision Selection

The recommended action $a^*$ is chosen in the following order of precedence:

1. **If any policy violation exists:** $a^* = \text{DENY}$ (hard constraint)
2. **Else if** `USE_EPISTEMIC_GATE` is `True` **and** $\psi_{\text{mean}} > \text{EPISTEMIC\_ESCALATION\_THRESHOLD}$: $a^* = \text{ESCALATE}$
3. **Else:** $a^* = \arg\min_{a} L_a$

By default, `USE_EPISTEMIC_GATE = True` and `EPISTEMIC_ESCALATION_THRESHOLD = 0.5`.

### Step 9 – Semantic Memory Retrieval (Optional)

If a `RAGGraphMemory` is available, the loop retrieves similar past incidents and adds them to the metadata for contextual explanation.

### Step 10 – Build the `HealingIntent`

All data (risk factors, expected losses, epistemic breakdown, forecasts, business impact, etc.) are stored in the `metadata` field.  
The `risk_factors` field contains **additive contributions** from each Bayesian component (conjugate, hyperprior, HMC), using the weights returned by the risk engine, providing full explainability of the final risk score.

---

## 3. Configuration Constants

The following constants control the behaviour of expected loss minimisation and epistemic gating. **Exact values are proprietary** and may be tuned per deployment. The values shown below are the **defaults implemented in the proprietary core engine** (as of the current release) and are provided for transparency.

| Constant | Description | Default Value |
|----------|-------------|---------------|
| `COST_FP` | Cost of a false positive (approving a risky action) | 10.0 |
| `COST_FN` | Cost of a false negative (denying a safe action) | 8.0 |
| `COST_IMPACT` | Weight for business impact in approve loss | 5.0 |
| `COST_PREDICTIVE` | Weight for predictive risk | 2.0 |
| `COST_VARIANCE` | Weight for posterior variance | 5.0 |
| `COST_OPP` | Opportunity cost weight (used in deny loss) | 3.0 |
| `COST_REVIEW` | Cost of human review (escalate loss) | 2.0 |
| `COST_UNCERTAINTY` | Weight for epistemic uncertainty in escalate loss | 4.0 |
| `EPISTEMIC_ESCALATION_THRESHOLD` | If $\psi_{\text{mean}}$ exceeds this, force escalate | 0.5 |
| `USE_EPISTEMIC_GATE` | Boolean to enable/disable epistemic‑based escalation | `True` |
| `RISK_DECAY_FACTOR` ($\gamma$) | Exponential smoothing factor for risk | 0.9 |
| `USE_CVAR` | Enable CVaR for approve loss | `False` |
| `CVAR_ALPHA` | Tail probability for CVaR | 0.05 |

**Note:** Enterprise customers may override these values via configuration to align with their business risk tolerance.

---

## 4. Example Output (`HealingIntent`)

```json
{
  "action": "ESCALATE",
  "justification": "Risk score 0.38, epistemic uncertainty 0.45, expected losses: approve=18.2, deny=12.7, escalate=11.5",
  "risk_score": 0.38,
  "risk_factors": {
    "conjugate": 0.22,
    "hmc": 0.16
  },
  "metadata": {
    "predictive_risk": 0.25,
    "epistemic_breakdown": {
      "hallucination": 0.1,
      "forecast_uncertainty": 0.3,
      "data_sparsity": 0.2
    },
    "decision_trace": {
      "expected_losses": { "APPROVE": 18.2, "DENY": 12.7, "ESCALATE": 11.5 },
      "selected_action": "ESCALATE"
    }
  }
}
```

5\. Calibration Diagnostics (Proprietary)
-----------------------------------------

The core engine maintains internal calibration metrics (reliability diagrams, Expected Calibration Error) to validate that the risk score can be interpreted as a calibrated probability. These diagnostics are used for model monitoring and are not exposed in the public API.

6\. Related Code (Proprietary)
------------------------------

The governance loop is implemented in the proprietary core engine at:agentic\_reliability\_framework/core/governance/governance\_loop.py

Configuration constants are defined in:agentic\_reliability\_framework/core/config/constants.py

These files are **not public**, but the behaviour described here matches their implementation.

7\. See Also
------------

*   [core\_concepts.md](https://core_concepts.md/) – canonical definitions of intents, risk score, and execution ladder
    
*   [mathematics.md](https://mathematics.md/) – Bayesian risk scoring and expected loss minimisation formulas
    
*   [design.md](https://design.md/) – architectural decisions and trade‑offs
