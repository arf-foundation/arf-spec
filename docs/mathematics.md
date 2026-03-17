
# Mathematical Foundations of ARF

ARF relies on Bayesian statistical models to estimate risk.

The framework intentionally prioritizes **uncertainty awareness** over deterministic predictions.

---

## Beta-Binomial Model

Each category maintains a posterior:

```math
p ~ Beta(alpha, beta)

Update rules:

alpha ← alpha + failures
beta ← beta + successes

Expected risk:

E[p] = alpha / (alpha + beta)

Variance:

Var(p) = alpha * beta / ((alpha+beta)^2 (alpha+beta+1))
```
---

## Hamiltonian Monte Carlo

Offline learning identifies patterns missed by the conjugate model.

```math
logit(p) = β0 + Σ βi xi
```

Sampling performed using NUTS (No-U-Turn Sampler).

Advantages:

- Efficient sampling
- Avoids random walk
- Scales to high-dimensional parameter spaces

---

## Hierarchical Shrinkage

Categories share statistical strength.

```math
p_c ~ Beta(alpha0, beta0)

alpha0, beta0 ~ Gamma(2,1)
```

This prevents overfitting when category data is sparse.

---

## Risk Fusion

Final risk:

```math
R = w_conj * p_conj + w_hmc * p_hmc + w_hyper * p_hyper
```

Weights depend on available data volume.

---

## Recommendations

- Use posterior predictive checks
- Monitor R-hat convergence
- Maintain reproducible training pipelines

