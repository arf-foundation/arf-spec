# Temporal Reliability Boundary

Status: Draft  
Repository: `arf-spec`  
Scope: Specification boundary only  
Implementation status: None in core ARF

## 1. Purpose

This document defines the contract for longitudinal reliability tracking in ARF without changing the behavior of the core in-session scoring path.

ARF core remains session-scoped, deterministic, and stateless with respect to cross-session history.

Temporal reliability is an external layer that may ingest ARF outputs and compute windowed, decayed reliability metrics across sessions, deployments, or time windows.

## 2. Normative Scope

This specification uses normative language:

- **MUST** means required.
- **SHOULD** means recommended.
- **MAY** means optional.

### 2.1 Required boundaries

1. Temporal reliability MUST be optional.
2. Temporal reliability MUST NOT affect in-session scoring.
3. Temporal reliability MUST remain external to the core ARF execution path.
4. Core ARF scoring MUST continue to operate correctly when temporal reliability is absent.
5. Any implementation MAY live in a separate extension repository or in the enterprise repository, but it MUST respect this boundary.

## 3. Data Model Extensions

### 3.1 `ReliabilitySignal` metadata extension

The following metadata fields are introduced for temporal layers only:

- `session_id: str`
- `observed_at: datetime` encoded as ISO 8601

These fields are optional. They are not required for core ARF scoring.

#### Semantics

- `session_id` identifies a logical evaluation session or run.
- `observed_at` records when the signal was observed.
- If either field is missing, the temporal layer MAY ignore the record, infer defaults, or reject it depending on implementation policy.
- Core ARF MUST NOT depend on these fields.

### 3.2 `SessionMetadata`

`SessionMetadata` is the input envelope for temporal aggregation.

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass(frozen=True)
class SessionMetadata:
    session_id: Optional[str] = None
    observed_at: Optional[datetime] = None  # ISO 8601 at serialization boundaries
```

### 3.3 `TimeWindow`

`TimeWindow` defines the temporal interval used for windowed aggregation.

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass(frozen=True)
class TimeWindow:
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    max_age_days: Optional[int] = None
    decay_half_life_days: Optional[float] = None
```

Implementations MAY choose one or more windowing strategies. The spec only requires that the semantics be explicit and deterministic.

## 4. Interface Contract

The temporal layer MUST expose a non-core adapter interface.

```python
from abc import ABC, abstractmethod

class TemporalReliabilityAdapter(ABC):
    @abstractmethod
    def ingest(self, signal: 'ReliabilitySignal', metadata: 'SessionMetadata') -> None:
        pass

    @abstractmethod
    def compute_windowed_reliability(self, agent_id: str, window: 'TimeWindow') -> float:
        pass
```

### 4.1 Interface requirements

An implementation of `TemporalReliabilityAdapter`:

- MUST accept a `ReliabilitySignal` plus metadata.
- MUST support computation over a defined time window.
- MUST return a numeric reliability score in the closed interval `[0.0, 1.0]`.
- MUST be deterministic for identical stored inputs and identical window parameters.
- MUST remain separable from core in-session evaluation logic.

### 4.2 Optional weighting and decay

Implementations MAY apply:
- exponential decay
- sliding windows
- deployment-aware weighting
- confidence weighting
- anomaly-weighted trust accumulation

These are implementation details. They are not part of the core contract.

## 5. Core Isolation Requirements

The following are prohibited in the core execution path:

- cross-session state reads
- temporal aggregation during in-session scoring
- mandatory persistence of historical reliability state
- coupling of execution gating to longitudinal history

The temporal layer MAY consume core outputs after scoring is complete.

## 6. Non-Goals

This document does not define:

- database schema
- persistence backend
- identity provider integration
- multi-tenant retention policy
- dashboard visualization
- API routes
- enterprise authorization model

Those concerns belong to implementation layers, not to this boundary document.

## 7. Recommended Repository Placement

This spec is intended for `arf-spec`.

Recommended follow-on placements:

- `arf-spec`: canonical interface and data contract
- `enterprise`: longitudinal scoring implementation, if productized
- separate extension repository: optional OSS adapter implementation

## 8. Acceptance Criteria

A conforming implementation MUST be able to:

1. Store temporal reliability inputs with `session_id` and `observed_at`
2. Compute a windowed reliability score over multiple sessions
3. Leave core ARF in-session scoring unchanged
4. Operate with temporal features disabled

## 9. Open Question

The exact placement of the first implementation is intentionally left open. This spec only establishes the boundary.
