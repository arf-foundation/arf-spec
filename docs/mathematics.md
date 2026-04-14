# Mathematical Foundations

This document describes the Bayesian mathematics underlying the ARF Core Engine’s risk scoring.  
The canonical definition of the **risk score** used throughout this specification is the posterior mean of the conjugate Beta distribution, optionally blended with HMC and hyperprior components as described below.

> **Canonical reference:** See [`core_concepts.md`](core_concepts.md#3-risk-score) for the definition of `RiskScore`.

**Implementation status:** The mathematics defined here are implemented in the proprietary core engine.  
The engine is access‑controlled and available under outcome‑based pricing.

---

## 1. Conjugate Beta‑Binomial Model (Online Learning)

For each action category $c \in \mathcal{C}$, we maintain a Beta posterior:

$$
p_c \sim \text{Beta}(\alpha_c, \beta_c)
$$

where $(\alpha_c, \beta_c)$ start from expert‑elicited priors. Upon observing a binary outcome $y \in \{0,1\}$ ($y=1$ = failure), we update:

$$
(\alpha_c, \beta_c) \leftarrow (\alpha_c + y,\; \beta_c + (1-y))
$$

The predictive mean $\mathbb{E}[p_c] = \frac{\alpha_c}{\alpha_c + \beta_c}$ provides the baseline risk. The posterior variance:

$$
\text{Var}(p_c) = \frac{\alpha_c \beta_c}{(\alpha_c+\beta_c)^2(\alpha_c+\beta_c+1)}
$$

allows us to construct credible intervals (e.g., 90% HDI) and express uncertainty.

**Choice of Priors:** To encode domain expertise, we use informative priors that are **pessimistic** for high‑impact categories (e.g., database modifications: $\alpha=1.5, \beta=8.0$ gives prior mean $\approx 0.16$). This counteracts optimism bias and ensures safe early decisions.

---

## 2. Hamiltonian Monte Carlo for Offline Pattern Discovery

Complex interactions (time‑of‑day, user role, environment) are captured by a logistic regression with HMC sampling:

$$
\operatorname{logit}(p) = \beta_0 + \beta_{\text{role}} x_{\text{role}} + \beta_{\text{env}} x_{\text{env}} + \beta_{\sin}\sin\!\left(\frac{2\pi t}{24}\right) + \beta_{\cos}\cos\!\left(\frac{2\pi t}{24}\right) + \sum_{k}\beta_k x_k
$$

We place weakly informative priors on coefficients, e.g., $\beta_j \sim \operatorname{Normal}(0, 1)$. The posterior is sampled using the No‑U‑Turn Sampler (NUTS) implemented in PyMC. The resulting posterior over coefficients gives us not only point estimates but also full uncertainty about predictions, which we propagate into the final risk.

**Why HMC?** HMC efficiently explores high‑dimensional parameter spaces, avoids random‑walk behavior, and yields effective sample sizes orders of magnitude higher than Metropolis‑Hastings. This is critical for learning from sparse historical data.

---

## 3. Hierarchical Hyperpriors (Shrinkage)

To share statistical strength across categories, we introduce a hierarchical Beta model:

$$
p_c \sim \operatorname{Beta}(\alpha_0, \beta_0) \quad\text{for all }c
$$

with global hyperparameters $\alpha_0, \beta_0 \sim \operatorname{Gamma}(2,1)$. This model is fit via variational inference (SVI) in Pyro, yielding posterior summaries for each category that are shrunk toward the global mean. The hyperprior contribution is weighted by data availability:

$$
w_{\text{hyper}} = \min\!\left( \frac{n}{n_{\text{hyper}}},\, w_{\text{max}} \right)
$$

where $n$ is the total number of outcomes.

---

## 4. Hybrid Risk Fusion

The final risk $R$ for a given intent is a weighted combination:

$$
R = w_{\text{conj}} \cdot \frac{\alpha_c}{\alpha_c+\beta_c} + w_{\text{hmc}} \cdot p_{\text{hmc}} + w_{\text{hyper}} \cdot p_{\text{hyper}}
$$

Weights are dynamic:

$$
w_{\text{hmc}} = \min\!\left(1,\, \frac{n}{n_0}\right)
$$

$$
w_{\text{hyper}} = \min\!\left( w_{\text{hyper}}^{\text{base}},\, \frac{n}{n_{\text{hyper}}}\right)
$$

$$
w_{\text{conj}} = 1 - w_{\text{hmc}} - w_{\text{hyper}}
$$

with $n_0 = 1000$ and $n_{\text{hyper}} = 100$ as defaults. The final risk is then multiplied by a context factor $\kappa(\text{env}, \text{cost}, \text{violations})$ to account for external factors.

---

## 5. Uncertainty Quantification

Every risk prediction includes a **90% highest density interval** (HDI) computed via:

- For conjugate part: quantiles of Beta distribution.
- For HMC part: posterior predictive samples.
- For hyperprior part: quantiles from variational posterior.

These intervals are displayed in the frontend and used to trigger human‑in‑the‑loop escalation when uncertainty is high (e.g., interval width $>0.3$).

---

## 6. Expected Loss Minimisation (Summary)

The risk score feeds into the governance loop’s expected loss calculation:

$$
\begin{aligned}
L_{\text{approve}} &= \text{COST\_FP} \cdot R + \text{COST\_IMPACT} \cdot b_{\text{mean}} + \text{COST\_PREDICTIVE} \cdot \text{predictive\_risk} + \text{COST\_VARIANCE} \cdot \text{Var}(p_c) \\
L_{\text{deny}} &= \text{COST\_FN} \cdot (1 - R) + \text{COST\_OPP} \cdot v_{\text{mean}} \\
L_{\text{escalate}} &= \text{COST\_REVIEW} + \text{COST\_UNCERTAINTY} \cdot \psi_{\text{mean}}
\end{aligned}
$$

For a detailed explanation of the governance loop and constants, see [`governance.md`](governance.md).

---

## 7. References

- Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). *Bayesian Data Analysis* (3rd ed.). CRC Press.
- McElreath, R. (2020). *Statistical Rethinking: A Bayesian Course with Examples in R and Stan*. CRC Press.
- Hoffman, M. D., & Gelman, A. (2014). The No‑U‑Turn Sampler: Adaptively Setting Path Lengths in Hamiltonian Monte Carlo. *Journal of Machine Learning Research*, 15(1), 1593–1623.

---

## 8. See Also

- [`core_concepts.md`](core_concepts.md) – canonical definition of `RiskScore` and execution ladder
- [`governance.md`](governance.md) – governance loop flow and expected loss minimisation
- [`design.md`](design.md) – architectural decisions and trade‑offs
