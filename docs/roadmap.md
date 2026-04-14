# ARF Core Engine – Roadmap

**Status:** Public specification of planned development for the proprietary ARF Core Engine.  
The engine is access‑controlled and available under outcome‑based pricing.  
This roadmap does **not** imply open source availability.

---

## 1. Executive Summary

The ARF Core Engine provides mathematically grounded, deterministic governance for AI agents. It combines:

- Bayesian probabilistic models (conjugate priors + Hamiltonian Monte Carlo)
- Composable policy algebra
- Semantic memory (FAISS + embeddings)
- Expected loss minimisation

The engine operates in two modes:

- **Advisory** – returns risk scores, explanations, and recommendations (no execution).
- **Enforcement (Enterprise)** – mechanically enforces decisions, gates execution, and provides audit trails.

This roadmap tracks the evolution of the **proprietary core engine** from its current MVP to a full‑featured enterprise control plane.

---

## 2. Vision

The ARF Core Engine becomes the default **execution authority layer** for autonomous AI in production – where every action is provably safe, auditable, and aligned with enterprise risk policies.

---

## 3. Core Concepts (Canonical)

For canonical definitions of `InfrastructureIntent`, `HealingIntent`, `RiskScore`, `ExecutionLadder`, and escalation gates, see [`core_concepts.md`](core_concepts.md).

---

## 4. Roadmap Phases

### Phase 1: Foundation (✅ Implemented)

Delivered in MVP:

- Conjugate Beta store (thread‑safe, per‑category priors)
- HMC model loading and prediction (PyMC/NUTS)
- Basic REST API (FastAPI) with CORS, rate limiting, Prometheus
- Frontend dashboard (Next.js) with real‑risk display
- Basic explainability (text summaries)
- Governance loop with expected loss minimisation (approve/deny/escalate)

---

### Phase 2: Mathematical Rigor (📅 Next 3 Months)

| Epic | Deliverables |
|------|---------------|
| **Uncertainty Quantification** | 90% HDI for all predictions; expose interval width in API; display error bars in frontend |
| **Hierarchical Hyperpriors** | Fully enable Pyro hyperprior model (optional); automatic SVI retraining; configuration toggle |
| **Online Model Retraining** | Scheduled periodic HMC retraining from accumulated outcomes; background worker with convergence diagnostics |
| **Policy Algebra** | AND/OR/NOT combinators; probabilistic policy evaluation (violation probability) |
| **Contextual Multipliers** | Learn environment‑specific multipliers from data; Bayesian regression for multiplier estimation |

---

### Phase 3: Psychological Alignment (📅 Months 4–6)

| Epic | Deliverables |
|------|---------------|
| **Explainability 2.0** | Counterfactual explanations; highlight main contributing factor |
| **Trust Dashboard** | Historical calibration curve; accuracy over time; alerts on model drift |
| **Bias Auditing** | Log decisions with metadata; periodic bias checks across user roles; fairness reports |
| **Human‑in‑the‑Loop** | Escalate uncertain decisions; store human feedback for retraining; override justification interface |

---

### Phase 4: Enterprise Readiness (📅 Months 7–12) – 🔒 Enterprise only

| Epic | Deliverables |
|------|---------------|
| **Multi‑Tenancy & RBAC** | Organisations, projects, roles; isolated data stores per tenant |
| **High Availability** | Kubernetes deployment; auto‑scaling, rolling updates; global read replicas |
| **Compliance & Auditing** | Immutable audit trail; SOC2‑ready logging; data retention policies |
| **Advanced Monitoring** | Custom Prometheus dashboards; alerting on model drift; Datadog/Splunk integration |
| **Enterprise Integration** | Plugins for AWS/Azure/GCP; webhook notifications; Terraform provider |

---

### Phase 5: Community & Ecosystem (📅 Year 2+)

| Epic | Deliverables |
|------|---------------|
| **Open Governance** | Technical steering committee; contribution ladder (for public spec & demos) |
| **Plugin Architecture** | Custom risk models; pluggable policy stores; extension marketplace (for enterprise customers) |
| **Research Collaborations** | University partnerships on ML robustness; published papers |
| **Certification Program** | Train and certify ARF practitioners |

---

## 5. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Prediction accuracy | <0.05 avg error | Calibration plot |
| Time to first decision | <100ms | Prometheus latency |
| Uptime (Enterprise) | 99.9% | Status page |
| Bias disparity | <0.1 across groups | Statistical test |

---

## 6. References

See `mathematics.md`, `psychology.md`, and `governance.md` for detailed specifications.  
For business model and licensing, refer to the [ARF Business Plan](https://github.com/arf-foundation/business-plan).
