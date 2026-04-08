# Mathematical Foundations of ARF

ARF relies on Bayesian statistical models to estimate risk, combining **online conjugate updates**, **optional hierarchical shrinkage**, and **offline Hamiltonian Monte Carlo** into a single fused risk score. The framework intentionally prioritizes **uncertainty awareness** over deterministic predictions.

---

## Expected Loss Minimisation

The governance loop does **not** use fixed probability thresholds (e.g., 0.2, 0.8). Instead, it selects the optimal action (APPROVE, DENY, or ESCALATE) by **minimising expected loss**, with two key enhancements:

1. **Time‑decaying risk** – the risk score is exponentially smoothed across consecutive evaluations for the same component, making the system sensitive to recent incidents.
2. **Conditional Value at Risk (CVaR)** – for the approve loss, the expected value can be replaced by the average of the worst‑case tail of the posterior distribution, providing robustness against extreme uncertainty.

---

### Time‑Decaying Risk

For each component, a smoothed risk score \(\tilde{\theta}_t\) is maintained:

\[
\tilde{\theta}_t = \gamma \cdot \tilde{\theta}_{t-1} + (1 - \gamma) \cdot \theta_t,\qquad \gamma = 0.9\ \text{(default)},
\]

with initial value \(\tilde{\theta}_0 = 0.5\). Here \(\theta_t\) is the Bayesian posterior failure probability (risk score) at time \(t\). This smoothed value replaces \(\theta\) in all loss calculations (except the variance term, which already quantifies uncertainty).

---

### Standard Expected Loss (default)

\[
\begin{aligned}
L_{\text{approve}}^{\text{mean}} &= c_{FP}\,\tilde{\theta} \;+\; c_{\text{impact}}\,\text{revenue\_loss} \;+\; c_{\text{pred}}\,\text{pred\_risk} \;+\; c_{\text{var}}\,\sigma^2,\\[4pt]
L_{\text{deny}} &= c_{FN}\,(1-\tilde{\theta}) \;+\; c_{\text{opp}}\,v_{\text{mean}},\\[4pt]
L_{\text{escalate}} &= c_{\text{review}} \;+\; c_{\text{unc}}\,\psi,
\end{aligned}
\]

where:

- \(\tilde{\theta}\) = decayed risk score,
- \(\sigma^2\) = posterior variance (from conjugate Beta model),
- \(\psi\) = composite epistemic uncertainty,
- \(v_{\text{mean}}\) = estimated opportunity value,
- all \(c\) constants are defined below.

---

### CVaR‑Based Approve Loss (optional, enabled by `USE_CVAR = True`)

When `USE_CVAR` is enabled, the approve loss is computed as the average of the worst \(\alpha\) fraction of per‑sample losses from the posterior distribution, plus the variance penalty:

1. Draw \(N\) samples from the posterior Beta distribution: \(p_i \sim \operatorname{Beta}(\alpha, \beta)\) (posterior parameters of the conjugate model).
2. Compute per‑sample approve loss (without variance term):
   \[
   L_{\text{approve}}^{(i)} = c_{FP}\,p_i + c_{\text{impact}}\,\text{revenue\_loss} + c_{\text{pred}}\,\text{pred\_risk}.
   \]
3. Sort the losses and take the mean of the smallest \(k = \lceil \alpha N \rceil\) values:
   \[
   L_{\text{approve}}^{\text{CVaR}} = \frac{1}{k}\sum_{i=1}^{k} L_{\text{approve}}^{([i])} + c_{\text{var}}\,\sigma^2.
   \]
   Here \(\alpha = \text{CVAR\_ALPHA}\) (default \(0.05\), i.e., 95% CVaR) and \(N = 1000\) samples.

The deny and escalate losses remain unchanged, as they are linear in risk (or constant).

---

### Decision Rule

1. If policy violations exist → `DENY`.
2. Else if `USE_EPISTEMIC_GATE` and \(\psi > \psi_{\text{thresh}}\) (default \(\psi_{\text{thresh}} = 0.5\)) → `ESCALATE`.
3. Else → action with the smallest expected loss (using the chosen approve loss variant).

All cost constants are configurable in `core/config/constants.py`. The default values (as of ARF v4) are:

| Constant | Value | Description |
|----------|-------|-------------|
| \(c_{FP}\) | 10.0 | False positive cost |
| \(c_{FN}\) | 8.0  | False negative cost |
| \(c_{\text{impact}}\) | 5.0 | Business impact weight |
| \(c_{\text{pred}}\) | 2.0 | Predictive risk weight |
| \(c_{\text{var}}\) | 5.0 | Variance penalty weight |
| \(c_{\text{opp}}\) | 3.0 | Opportunity cost weight |
| \(c_{\text{review}}\) | 2.0 | Human review cost |
| \(c_{\text{unc}}\) | 4.0 | Epistemic uncertainty weight |
| \(\psi_{\text{thresh}}\) | 0.5 | Epistemic escalation threshold |
| \(\gamma\) (RISK_DECAY_FACTOR) | 0.9 | Smoothing factor for time‑decaying risk |
| `USE_CVAR` | False | Enable CVaR (tail risk) for approve loss |
| `CVAR_ALPHA` | 0.05 | Tail probability for CVaR (0.05 = 95%) |

---

### Interactive Expected Loss Simulator

Use the sliders below to adjust the key parameters and see how the expected losses change in real time. The decision (minimum expected loss action) is highlighted. *(The simulator currently shows the standard mean loss; CVaR behaviour is not yet visualised but can be enabled in the code.)*

<div id="elm-simulator">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px,1fr)); gap: 15px;">
    <div><label>Risk score (θ): <span id="risk-val">0.38</span></label><input type="range" id="risk-slider" min="0" max="1" step="0.01" value="0.38"></div>
    <div><label>Posterior variance (σ²): <span id="var-val">0.05</span></label><input type="range" id="var-slider" min="0" max="0.25" step="0.005" value="0.05"></div>
    <div><label>Epistemic uncertainty (ψ): <span id="psi-val">0.45</span></label><input type="range" id="psi-slider" min="0" max="1" step="0.01" value="0.45"></div>
    <div><label>Revenue loss ($): <span id="rev-val">1000</span></label><input type="range" id="rev-slider" min="0" max="5000" step="100" value="1000"></div>
    <div><label>Predictive risk: <span id="pred-val">0.25</span></label><input type="range" id="pred-slider" min="0" max="1" step="0.01" value="0.25"></div>
    <div><label>Opportunity value ($): <span id="opp-val">2000</span></label><input type="range" id="opp-slider" min="0" max="5000" step="100" value="2000"></div>
  </div>
  <div style="margin-top: 20px;">
    <button id="reset-defaults">Reset to Defaults</button>
  </div>
  <div id="elm-plot" style="width:100%; height:500px; margin-top:20px;"></div>
  <div id="elm-decision" style="font-weight: bold; text-align: center; margin-top: 10px;"></div>
</div>

<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
<script>
  // Constants (defaults) – same as before, but includes decay and CVaR flags only in text.
  const constants = {
    cFP: 10.0,
    cFN: 8.0,
    cImpact: 5.0,
    cPred: 2.0,
    cVar: 5.0,
    cOpp: 3.0,
    cReview: 2.0,
    cUnc: 4.0,
    psiThresh: 0.5
  };

  // DOM elements – unchanged
  const riskSlider = document.getElementById('risk-slider');
  const riskVal = document.getElementById('risk-val');
  const varSlider = document.getElementById('var-slider');
  const varVal = document.getElementById('var-val');
  const psiSlider = document.getElementById('psi-slider');
  const psiVal = document.getElementById('psi-val');
  const revSlider = document.getElementById('rev-slider');
  const revVal = document.getElementById('rev-val');
  const predSlider = document.getElementById('pred-slider');
  const predVal = document.getElementById('pred-val');
  const oppSlider = document.getElementById('opp-slider');
  const oppVal = document.getElementById('opp-val');
  const resetBtn = document.getElementById('reset-defaults');

  function computeLosses(theta, variance, psi, revenueLoss, predRisk, oppValue) {
    const L_approve = constants.cFP * theta + constants.cImpact * revenueLoss / 1000 + constants.cPred * predRisk + constants.cVar * variance;
    const L_deny = constants.cFN * (1 - theta) + constants.cOpp * oppValue / 1000;
    const L_escalate = constants.cReview + constants.cUnc * psi;
    return { L_approve, L_deny, L_escalate };
  }

  function updatePlot() {
    const theta = parseFloat(riskSlider.value);
    const variance = parseFloat(varSlider.value);
    const psi = parseFloat(psiSlider.value);
    const revenueLoss = parseFloat(revSlider.value);
    const predRisk = parseFloat(predSlider.value);
    const oppValue = parseFloat(oppSlider.value);

    riskVal.innerText = theta.toFixed(3);
    varVal.innerText = variance.toFixed(3);
    psiVal.innerText = psi.toFixed(3);
    revVal.innerText = revenueLoss;
    predVal.innerText = predRisk.toFixed(3);
    oppVal.innerText = oppValue;

    const losses = computeLosses(theta, variance, psi, revenueLoss, predRisk, oppValue);
    const actions = ['APPROVE', 'DENY', 'ESCALATE'];
    const values = [losses.L_approve, losses.L_deny, losses.L_escalate];
    const minIdx = values.indexOf(Math.min(...values));
    const decision = actions[minIdx];

    const trace = {
      x: actions,
      y: values,
      type: 'bar',
      marker: { color: values.map((_, i) => i === minIdx ? 'green' : 'steelblue') },
      text: values.map(v => v.toFixed(2)),
      textposition: 'auto'
    };
    const layout = {
      title: 'Expected Loss by Action',
      xaxis: { title: 'Action' },
      yaxis: { title: 'Expected Loss' },
      shapes: []
    };
    Plotly.newPlot('elm-plot', [trace], layout);
    document.getElementById('elm-decision').innerHTML = `✅ Recommended action: <span style="color:green">${decision}</span> (lowest expected loss = ${Math.min(...values).toFixed(2)})`;
  }

  function resetDefaults() {
    riskSlider.value = '0.38';
    varSlider.value = '0.05';
    psiSlider.value = '0.45';
    revSlider.value = '1000';
    predSlider.value = '0.25';
    oppSlider.value = '2000';
    updatePlot();
  }

  riskSlider.addEventListener('input', updatePlot);
  varSlider.addEventListener('input', updatePlot);
  psiSlider.addEventListener('input', updatePlot);
  revSlider.addEventListener('input', updatePlot);
  predSlider.addEventListener('input', updatePlot);
  oppSlider.addEventListener('input', updatePlot);
  resetBtn.addEventListener('click', resetDefaults);

  updatePlot();
</script>
---

## Beta‑Binomial Model (Online Conjugate Prior)

Each action category maintains a **Beta posterior** derived from a fixed prior.

Let $(\alpha_0, \beta_0)$ be the fixed prior parameters for a category (e.g., $\alpha_0=1.5,\beta_0=8.0$ for `database`). After observing $f$ failures and $s$ successes, the posterior is:

$$
p \sim \operatorname{Beta}(\alpha_0 + f,\; \beta_0 + s)
$$

**Posterior mean** (expected risk):

$$
\mathbb{E}[p] = \frac{\alpha_0 + f}{\alpha_0 + f + \beta_0 + s}
$$

**Posterior variance**:

$$
\operatorname{Var}(p) = \frac{(\alpha_0 + f)(\beta_0 + s)}{(\alpha_0 + f + \beta_0 + s)^2 (\alpha_0 + f + \beta_0 + s + 1)}
$$

This model is always active and updates in real time as outcomes are recorded.

---

## Hierarchical Beta Model (Optional Hyperpriors)

When enabled (`use_hyperpriors=True`), the framework adds a second layer of Bayesian inference: a **beta prior on the beta parameters**. This allows statistical strength to be shared across categories, improving estimates for categories with little data.

Hierarchical model:

$$
p_c \sim \operatorname{Beta}(\alpha_0, \beta_0), \qquad
\alpha_0 \sim \operatorname{Gamma}(2,1), \qquad
\beta_0 \sim \operatorname{Gamma}(2,1)
$$

The hyperparameters $\alpha_0, \beta_0$ are learned from all categories simultaneously using variational inference (Pyro). The resulting posterior mean for a category is a **shrunk estimate** that borrows information from other categories.

> **Note:** This model is *optional* and incurs additional computational overhead. It is intended for scenarios where categories have varying amounts of data and you want to avoid overfitting.

---

## Hamiltonian Monte Carlo (Offline Logistic Regression)

For complex patterns (time of day, user role, environment), a logistic regression is trained offline using the No‑U‑Turn Sampler:

$$
\operatorname{logit}(p) = \beta_0 + \sum_{i} \beta_i x_i
$$

where $x_i$ include cyclical time encodings ($\sin(2\pi t/24)$, $\cos(2\pi t/24)$), environment indicators, and one‑hot encoded categories.

---

## Risk Fusion (Dynamic Weighted Average)

The final risk score is a weighted combination of the three components:

$$
R = w_{\text{conj}} \cdot p_{\text{conj}} + w_{\text{hyper}} \cdot p_{\text{hyper}} + w_{\text{hmc}} \cdot p_{\text{hmc}}
$$

Weights depend on the amount of observed data ($n$) and are computed as follows:

| Available components | Weight formulas |
|----------------------|-----------------|
| Only conjugate | $w_{\text{conj}} = 1.0$ |
| Conjugate + HMC | $w_{\text{hmc}} = \min\left(1.0, \frac{n}{n_0}\right)$, $w_{\text{conj}} = 1 - w_{\text{hmc}}$ |
| Conjugate + hyperprior | $w_{\text{hyper}} = \min\left(w_{\text{hyper\_base}}, \frac{n}{100}\right)$, $w_{\text{conj}} = 1 - w_{\text{hyper}}$ |
| All three | $w_{\text{hmc}} = \min\left(0.6, \frac{n}{n_0}\right)$<br>$w_{\text{hyper}} = \min\left(w_{\text{hyper\_base}}, \frac{n}{100}\right) \cdot (1 - w_{\text{hmc}})$<br>$w_{\text{conj}} = 1 - w_{\text{hmc}} - w_{\text{hyper}}$ |

where $n_0 = 1000$ is the threshold for HMC confidence and $w_{\text{hyper\_base}} = 0.3$ is the base hyperprior weight.

---

## Context Multiplier

Before finalising the risk, a **context multiplier** $m$ may be applied to account for environmental risk factors (e.g., production vs. development):

$$
R_{\text{final}} = \min(R \cdot m, 1.0)
$$

In the OSS code, $m = 1.5$ for production environments; otherwise $m = 1.0$.

---

## Posterior Variance for Decision‑Theoretic Loss

The governance loop uses the **posterior variance** of the conjugate component as a measure of statistical uncertainty in the expected loss calculations:

$$
\sigma^2 = \operatorname{Var}(p) = \frac{(\alpha_0 + f)(\beta_0 + s)}{(\alpha_0 + f + \beta_0 + s)^2 (\alpha_0 + f + \beta_0 + s + 1)}
$$

This variance is combined with other uncertainty terms (epistemic, predictive) to compute the expected loss of each possible action.

---

## Implementation Notes

- The formulas above match the implementation in:
  ```python
  agentic_reliability_framework/core/governance/risk_engine.py
  ```

*   Hyperpriors are disabled by default and must be explicitly enabled with use\_hyperpriors=True
    
*   The HMC model must be pre‑trained and loaded from a JSON file (hmc\_model.json by default)

- Time‑decaying risk is always active (with default \(\gamma = 0.9\)). It can be disabled by setting `RISK_DECAY_FACTOR = 1.0` in `constants.py`.
- CVaR is disabled by default (`USE_CVAR = False`). To enable robust approval decisions, set `USE_CVAR = True` and optionally adjust `CVAR_ALPHA`.
    
References
----------

*   Gelman, A. et al. (2013). _Bayesian Data Analysis_. Chapman & Hall.
    
*   Betancourt, M. (2017). _A Conceptual Introduction to Hamiltonian Monte Carlo_. [arXiv:1701.02434](https://arxiv.org/abs/1701.02434)
    
*   McElreath, R. (2020). _Statistical Rethinking_. CRC Press.
