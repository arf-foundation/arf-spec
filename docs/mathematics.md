# Mathematical Foundations of ARF

ARF relies on Bayesian statistical models to estimate risk, combining **online conjugate updates**, **optional hierarchical shrinkage**, and **offline Hamiltonian Monte Carlo** into a single fused risk score. The framework intentionally prioritizes **uncertainty awareness** over deterministic predictions.

---

## Interactive Threshold Simulator

Use the sliders below to see how the **Deterministic Probability Thresholding** (DPT) zones change. The risk gauge updates in real time.

<div id="dpt-simulator">
  <label>Low Threshold (Approve): <span id="low-val">0.2</span></label>
  <input type="range" id="low-slider" min="0" max="1" step="0.01" value="0.2">
  <label>High Threshold (Deny): <span id="high-val">0.8</span></label>
  <input type="range" id="high-slider" min="0" max="1" step="0.01" value="0.8">
  <div id="dpt-plot" style="width:100%; height:400px;"></div>
</div>

<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
<script>
  function updatePlot(low, high) {
    var x = [];
    var y = [];
    for (var i = 0; i <= 100; i++) {
      var risk = i / 100;
      x.push(risk);
      y.push(0);
    }
    var trace = {
      x: x,
      y: y,
      marker: {
        color: x.map(v => v < low ? 'green' : (v > high ? 'red' : 'orange')),
        size: 10,
        symbol: 'circle'
      },
      mode: 'markers',
      type: 'scatter',
      text: x.map(v => `Risk: ${v.toFixed(2)}`),
      hoverinfo: 'text'
    };
    var layout = {
      title: 'DPT Zones',
      xaxis: { title: 'Risk Score', range: [0,1] },
      yaxis: { title: '', visible: false },
      shapes: [
        { type: 'rect', x0: 0, x1: low, y0: -0.5, y1: 0.5, fillcolor: 'rgba(0,255,0,0.2)', line: { width: 0 } },
        { type: 'rect', x0: low, x1: high, y0: -0.5, y1: 0.5, fillcolor: 'rgba(255,165,0,0.2)', line: { width: 0 } },
        { type: 'rect', x0: high, x1: 1, y0: -0.5, y1: 0.5, fillcolor: 'rgba(255,0,0,0.2)', line: { width: 0 } }
      ]
    };
    Plotly.newPlot('dpt-plot', [trace], layout);
  }
  document.getElementById('low-slider').addEventListener('input', function() {
    var low = parseFloat(this.value);
    var high = parseFloat(document.getElementById('high-slider').value);
    if (low >= high) {
      low = high - 0.01;
      if (low < 0) low = 0;
      this.value = low;
    }
    document.getElementById('low-val').innerText = low.toFixed(2);
    document.getElementById('high-val').innerText = high.toFixed(2);
    updatePlot(low, high);
  });
  document.getElementById('high-slider').addEventListener('input', function() {
    var high = parseFloat(this.value);
    var low = parseFloat(document.getElementById('low-slider').value);
    if (high <= low) {
      high = low + 0.01;
      if (high > 1) high = 1;
      this.value = high;
    }
    document.getElementById('low-val').innerText = low.toFixed(2);
    document.getElementById('high-val').innerText = high.toFixed(2);
    updatePlot(low, high);
  });
  updatePlot(0.2, 0.8);
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
    

References
----------

*   Gelman, A. et al. (2013). _Bayesian Data Analysis_. Chapman & Hall.
    
*   Betancourt, M. (2017). _A Conceptual Introduction to Hamiltonian Monte Carlo_. [arXiv:1701.02434](https://arxiv.org/abs/1701.02434)
    
*   McElreath, R. (2020). _Statistical Rethinking_. CRC Press.
