# ARF Mathematical Foundations

ARF leverages **Bayesian statistics, hierarchical models, and probabilistic programming** to quantify reliability risk in agentic systems.

---

## 1. Online Risk Modeling (Beta-Binomial)

- Each action category \(c\) maintains a conjugate Beta posterior:
$$
p_c \sim \text{Beta}(\alpha_c, \beta_c)
$$
- Update rule for outcome \(y\):
$$
\alpha_c \leftarrow \alpha_c + y, \quad \beta_c \leftarrow \beta_c + (1-y)
$$
- Predictive mean: \(\mathbb{E}[p_c] = \frac{\alpha_c}{\alpha_c+\beta_c}\)
- Posterior variance for confidence intervals.

---

## 2. Offline Pattern Discovery (HMC)

- Logistic regression with cyclical time encoding:
$$
\text{logit}(p) = \beta_0 + \sum_j \beta_j x_j + \beta_\sin \sin(2\pi t/24) + \beta_\cos \cos(2\pi t/24)
$$
- NUTS/HMC used to obtain posterior distributions for \(\beta\) coefficients.
- Enables quantification of uncertainty and detection of interactions.

---

## 3. Hierarchical Hyperpriors

- Global hyperparameters \(\alpha_0, \beta_0 \sim \text{Gamma}(\cdot)\)
- Category posteriors shrink toward global mean:
$$
p_c \sim \text{Beta}(\alpha_0, \beta_0)
$$
- Weighting by data availability ensures safe generalization across sparse categories.

---

## 4. Risk Fusion

- Combine online, HMC, and hyperprior predictions:
$$
R = w_\text{conj} \cdot p_\text{conj} + w_\text{hmc} \cdot p_\text{hmc} + w_\text{hyper} \cdot p_\text{hyper}
$$
- Contextual multipliers \(\kappa\) scale risk based on environment, cost, violations.
