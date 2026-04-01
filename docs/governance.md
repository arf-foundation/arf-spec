# Governance Loop

The core of ARF’s decision‑making is the **governance loop**, an orchestrator that combines multiple analytical modules to produce a single, auditable recommendation.

---

## Overview

The governance loop processes an `InfrastructureIntent` and returns a `HealingIntent` containing:

- A recommended action (`APPROVE`, `DENY`, or `ESCALATE`)
- A risk score and its decomposition
- A detailed justification
- Full metadata for traceability (epistemic uncertainty, business impact, forecasts, etc.)

The loop is designed to be **deterministic** for a given input, ensuring reproducibility and auditability.

---

## Step‑by‑Step Execution

```python
def run(intent, context) -> HealingIntent:
```

1.  cost\_estimator.estimate\_monthly\_cost(intent) returns a projected monthly cost (if available). Failures are logged but do not block evaluation.
    
2.  **Policy evaluation**policy\_evaluator.evaluate(intent, policy\_context) returns a list of policy violations (empty if none). If any violations exist, the loop immediately sets the recommended action to DENY (policy overrides all other factors).
    
3.  **Risk calculation**risk\_engine.calculate\_risk(intent, cost\_estimate, policy\_violations) returns:
    
    *   risk\_score: the final Bayesian risk (posterior mean)
        
    *   explanation: human‑readable justification
        
    *   contributions: dictionary containing per‑component means (conjugate\_mean, hyper\_mean, hmc\_prediction) and their weights
        
    *   Posterior variance is computed from the Beta parameters for the conjugate component.
        
4.  **Predictive foresight** (optional)If a SimplePredictiveEngine is configured, it forecasts service health for the next few time steps. A weighted average of risk levels (mapped to numeric values) gives a predictive\_risk score.
    
5.  **Business impact**Using the BusinessImpactCalculator, the loop estimates potential revenue loss (b\_mean) based on the current service telemetry.
    
6.  **Epistemic uncertainty** (optional)If enable\_epistemic is True, the loop computes a composite epistemic uncertainty score psi\_mean as:

```text
psi_mean = 1 - (1 - hallucination_risk) * (1 - forecast_uncertainty) * (1 - data_sparsity)
```
    *   hallucination\_risk comes from an ECLIPSE probe (if provided)
        
    *   forecast\_uncertainty = 1 - mean(confidence) of the forecasts
        
    *   data\_sparsity = exp(-0.05 \* len(history)) – decays with more data

        
7. **Expected loss calculation**For each possible action, the loop computes an expected loss using configurable cost constants:

```python
L_approve = (COST_FP * risk_score +
             COST_IMPACT * b_mean +
             COST_PREDICTIVE * predictive_risk +
             COST_VARIANCE * variance)

L_deny = COST_FN * (1 - risk_score) + COST_OPP * v_mean   # v_mean = estimated value (optional)

L_escalate = COST_REVIEW + COST_UNCERTAINTY * psi_mean
```
    
8.  **Decision selection**
    
    *   If policy violations exist → DENY
        
    *   Else if USE\_EPISTEMIC\_GATE is True **and** psi\_mean > EPISTEMIC\_ESCALATION\_THRESHOLD → ESCALATE
        
    *   Else → action with the **minimum expected loss**
        
9.  **Semantic memory retrieval** (optional)If a RAGGraphMemory is available, the loop retrieves similar past incidents and adds them to the metadata.
    
10.  **Build the HealingIntent**All data (risk factors, expected losses, epistemic breakdown, forecasts, business impact, etc.) are stored in the metadata field. The risk\_factors field contains additive contributions from each Bayesian component (conjugate, hyperprior, hmc), using the weights returned by the risk engine.
    

Constants and Configuration
---------------------------

The following constants are defined in core.config.constants:

| Constant | Description |
|----------|-------------|
| `COST_FP` | Cost of a false positive (approving a risky action) |
| `COST_FN` | Cost of a false negative (denying a safe action) |
| `COST_IMPACT` | Weight for business impact in approve loss |
| `COST_PREDICTIVE` | Weight for predictive risk |
| `COST_VARIANCE` | Weight for posterior variance |
| `COST_OPP` | Opportunity cost weight (used in deny loss) |
| `COST_REVIEW` | Cost of human review (escalate loss) |
| `COST_UNCERTAINTY` | Weight for epistemic uncertainty in escalate loss |
| `EPISTEMIC_ESCALATION_THRESHOLD` | If `psi_mean` > threshold, force escalate |
| `USE_EPISTEMIC_GATE` | Boolean to enable/disable epistemic‑based escalation |

Example Output (HealingIntent)
------------------------------

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

Related Code
------------

*   Implementation: [agentic\_reliability\_framework/core/governance/governance\_loop.py](https://github.com/arf-foundation/agentic_reliability_framework/blob/main/agentic_reliability_framework/core/governance/governance_loop.py)
    
*   Constants: [agentic\_reliability\_framework/core/config/constants.py](https://github.com/arf-foundation/agentic_reliability_framework/blob/main/agentic_reliability_framework/core/config/constants.py)
    
