# arf-spec – Canonical Specification (Public)

This repository contains the **public specification** of the Agentic Reliability Framework (ARF) – including data models, API contracts, decision rules, and mathematical foundations.

> ⚠️ **Important** – This is a **specification only**. The core ARF engine (`agentic_reliability_framework`, `arf-api`, `enterprise`) is **not open source**. It is proprietary, access‑controlled, and offered to qualified pilots under outcome‑based pricing.

---

## Why ARF?

AI agents are moving from prototypes to production – but without proper governance, they become **unpredictable, unaccountable, and unsafe**. ARF provides a **deterministic safety layer** that:

- Quantifies risk using Bayesian inference (conjugate priors + HMC + hyperpriors)
- Selects actions by **minimising expected loss** (not arbitrary thresholds)
- Enforces **mechanical gates** (license, confidence, risk, rollback, causality)
- Produces **immutable audit trails** for compliance and debugging
- Supports **optional temporal reliability** for cross‑session trend analysis

The public specification describes **what** ARF does and **how** it works – without exposing proprietary implementation details.

---

## Specification Overview

The specification is organised as a **layered stack**, each building on the one before:

| Layer | Focus |
|-------|-------|
| **[Core Concepts](docs/core_concepts.md)** | Fundamental entities: `InfrastructureIntent`, `HealingIntent`, `RiskScore`, `GovernanceLoop`, Execution Ladder, escalation gates |
| **[Mathematics](docs/mathematics.md)** | Bayesian risk scoring (conjugate Beta, HMC, hyperprior shrinkage), expected loss minimisation, Lyapunov stability |
| **[Psychology](docs/psychology.md)** | Trust calibration, explainability, cognitive load reduction, human‑in‑the‑loop design |
| **[Governance](docs/governance.md)** | Step‑by‑step governance loop, cost estimation, policy evaluation, epistemic uncertainty |
| **[Enterprise](docs/enterprise.md)** | Mechanical enforcement, audit trails, multi‑tenancy, outcome‑based pricing |
| **[Temporal Reliability](docs/temporal_reliability.md)** | Optional cross‑session reliability aggregation (external to core engine) |
| **[Philosophy](docs/philosophy.md)** | Design principles, beliefs, and trade‑offs that guide ARF |
| **[Industry Use Cases](docs/industry_use_cases.md)** | Real‑world applications in fintech, healthcare, cloud, manufacturing, e‑commerce, government |
| **[Glossary](docs/glossary.md)** | Quick reference of terms, acronyms, and concept map |

Additional supporting documents:

- **[Roadmap](docs/roadmap.md)** – future direction and milestones
- **[Design](docs/design.md)** – architectural decisions, system dynamics, and component boundaries

---

## How to Use This Specification

- **Developers** – start with [Core Concepts](docs/core_concepts.md) to understand the data model, then read [Governance](docs/governance.md) to see the decision flow.
- **Architects** – review [Design](docs/design.md) and [Philosophy](docs/philosophy.md) to understand the system boundaries and trade‑offs.
- **Compliance / Security teams** – focus on [Enterprise](docs/enterprise.md) (audit trails, signing) and [Temporal Reliability](docs/temporal_reliability.md) (optional tracking).
- **Business stakeholders** – see [Industry Use Cases](docs/industry_use_cases.md) and the [Roadmap](docs/roadmap.md) for value and direction.

All documents are written in Markdown and rendered via [MkDocs Material](https://squidfunk.github.io/mkdocs-material/). The live site is available at [https://arf-foundation.github.io/arf-spec/](https://arf-foundation.github.io/arf-spec/).

---

## Public vs. Private (Honest Boundary)

| Component | Status | License / Access |
|-----------|--------|------------------|
| **This specification** (`arf-spec`) | ✅ Public | Apache 2.0 |
| **Demo frontend** (`arf-frontend`) | ✅ Public | Apache 2.0 |
| **Pitch deck** (`pitch-deck`) | ✅ Public | Apache 2.0 |
| **Core engine** (`agentic_reliability_framework`) | 🔒 Private | Pilot / outcome‑based pricing |
| **Production API** (`arf-api`) | 🔒 Private | Pilot / outcome‑based pricing |
| **Enterprise extensions** | 🔒 Private | Commercial license |

The public specification is **complete and accurate** for the public interfaces. The private engine implements exactly what is described here, but with additional safeguards, performance optimisations, and commercial support.

---

## Contributing to the Specification

We welcome contributions to the public specification (typos, clarifications, new use cases, examples). Please follow these steps:

1. Open an issue describing your proposed change.
2. Fork the repository and create a branch.
3. Submit a pull request referencing the issue.
4. Ensure your changes pass the MkDocs build locally (`mkdocs build`).

**Note:** We do **not** accept pull requests that attempt to expose proprietary engine internals or bypass the public/private boundary.

---

## Pilot Access & Contact

To request access to the protected core engine (time‑limited pilot or enterprise licensing), please email **petter2025us@outlook.com** with:

- Your organisation and use case
- Expected monthly evaluation volume
- Cloud environment(s) (AWS, Azure, GCP, on‑prem)

**Useful links:**

- GitHub organisation: [https://github.com/arf-foundation](https://github.com/arf-foundation)
- Public demo UI: [https://arf-frontend-sandy.vercel.app](https://arf-frontend-sandy.vercel.app)
- Live specification site: [https://arf-foundation.github.io/arf-spec/](https://arf-foundation.github.io/arf-spec/)

*Stewarded by the founder – pilot‑first, outcome‑based pricing.*

---

## License

This repository (`arf-spec`) is licensed under **Apache 2.0**.  
The license applies **only** to the specification content. The core ARF engine remains proprietary and access‑controlled.
