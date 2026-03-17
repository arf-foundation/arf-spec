
# Enterprise & Startup Deployment

ARF can scale from startups to global enterprises.

---

# Startup Mode

For small teams:

Recommended architecture:

Frontend: Vercel
Backend: FastAPI
Database: Postgres
Vector Store: FAISS

Benefits:

- simple deployment
- minimal infrastructure
- rapid experimentation

---

# Enterprise Mode

Large organizations require:

- multi-tenancy
- RBAC
- audit compliance
- distributed infrastructure

---

## Infrastructure Example

Kubernetes cluster

Services:

- API service
- model workers
- retraining workers
- monitoring stack

---

## Observability

Recommended stack:

Prometheus
Grafana
OpenTelemetry

---

## Compliance

Enterprise features include:

- immutable audit trails
- encryption
- retention policies

---

## Recommendations

- separate inference and training workloads
- implement rate limits
- maintain incident review processes

