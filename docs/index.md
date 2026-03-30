# ARF Specification

Welcome to the canonical specification of the Agentic Reliability Framework.

ARF is organized as a layered specification:

- Core reliability and governance concepts
- Mathematical foundations for probabilistic scoring and control
- Psychological principles for trust calibration and explanation
- Enterprise boundary definitions for higher-order capabilities
- Temporal reliability as a separate extension boundary

## Specification sections

- [Roadmap](roadmap.md)
- [Design](design.md)
- [Mathematics](mathematics.md)
- [Psychology](psychology.md)
- [Governance](governance.md)
- [Enterprise](enterprise.md)
- [Temporal Reliability](temporal_reliability.md)

## Boundary note

Temporal reliability is intentionally defined as a separate specification layer.

It must remain:
- optional
- external to in-session scoring
- outside the core ARF execution path
- suitable for implementation in enterprise or extension layers

This keeps the core deterministic, session-scoped, and easy to audit.
