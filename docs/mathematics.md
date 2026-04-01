# Mathematical Foundations of ARF

ARF relies on Bayesian statistical models to estimate risk, combining **online conjugate updates**, **optional hierarchical shrinkage**, and **offline Hamiltonian Monte Carlo** into a single fused risk score. The framework intentionally prioritizes **uncertainty awareness** over deterministic predictions.

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

- The formulas above match the implementation in [`agentic_reliability_framework/core/governance/risk_engine.py`](https://github.com/arf-foundation/agentic_reliability_framework/blob/main/agentic_reliability_framework/core/governance/risk_engine.py)
- Hyperpriors are disabled by default and must be explicitly enabled with `use_hyperpriors=True`
- The HMC model must be pre‑trained and loaded from a JSON file (`hmc_model.json` by default)

---

## References

- Gelman, A. et al. (2013). *Bayesian Data Analysis*. Chapman & Hall.
- Betancourt, M. (2017). *A Conceptual Introduction to Hamiltonian Monte Carlo*. [arXiv:1701.02434](https://arxiv.org/abs/1701.02434)
- McElreath, R. (2020). *Statistical Rethinking*. CRC Press.
