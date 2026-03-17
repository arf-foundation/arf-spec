# ARF Governance Framework

ARF governance enforces policies, compliance, and reliability standards on agentic workflows.

---

## 1. Policy Engine

- Implements composable logic: AND, OR, NOT.
- Supports probabilistic evaluation using risk scores.
- Determines advisory vs enforcement actions.

## 2. Governance Loop

1. Event processed by EnhancedReliabilityEngine.
2. Compute risk via Bayesian/HMC/hyperprior fusion.
3. Apply DPT thresholds:
   - P(failure) < 0.2 → APPROVE
   - 0.2 ≤ P(failure) ≤ 0.8 → ESCALATE
   - P(failure) > 0.8 → DENY
4. Generate `HealingIntent` advisory JSON.
5. Persist outcome in audit log.

## 3. Audit & Compliance

- Thread-safe audit logs (`persistence.py`) ensure reproducibility.
- Immutable `_audit_ts` timestamps.
- Enterprise mode includes RBAC, multi-tenancy, and SOC2-ready logging.
