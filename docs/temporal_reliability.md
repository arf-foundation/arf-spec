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

### 3.4 `ReliabilityDimensions`

`ReliabilityDimensions` specifies the scored axes available for temporal aggregation.
This is an optional envelope. Implementations MAY use a subset of these axes or add custom axes;
the three named axes (`delivery_score`, `calibration_delta`, `adaptation_score`) are canonical but not mandatory.

Three dimensions are specified here for concrete reference; they are not the only valid ones.

```python
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class ReliabilityDimensions:
    delivery_score: Optional[float] = None
    # Task completion ratio for the session (closed interval [0.0, 1.0]).
    # Example: fraction of committed actions that were executed and verified.

    calibration_delta: Optional[float] = None
    # Absolute deviation between predicted and observed outcomes for the session.
    # Lower is better. Example: |confidence_score - empirical_success_rate|.

    adaptation_score: Optional[float] = None
    # Response quality to changed conditions within the session (closed interval [0.0, 1.0]).
    # Example: recovery rate after tool failure or context shift.
```

Temporal layers MAY aggregate each dimension independently or combine them into a composite score.
The combination strategy is an implementation concern, not a spec constraint.

### 3.5 `WindowedReliabilityResult`

`compute_windowed_reliability` MUST return a `WindowedReliabilityResult` rather than a bare `float`.
A bare numeric score is insufficient for governance use: it provides no signal about trend direction,
no indication of how many sessions contributed, and no machine-readable window boundary for auditability.

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass(frozen=True)
class WindowedReliabilityResult:
    score: float
    # Composite reliability score in the closed interval [0.0, 1.0].

    trend_slope: Optional[float] = None
    # Linear regression slope over ordered session scores within the window.
    # Positive: improving. Negative: degrading. None if fewer than 2 sessions.

    sample_count: int
    # Number of sessions contributing to this result after window filtering and decay.
    # MUST be provided explicitly by the implementation. There is no valid default.

    window_start: Optional[datetime] = None
    # Earliest observed_at timestamp contributing to this result.

    window_end: Optional[datetime] = None
    # Latest observed_at timestamp contributing to this result.

    decay_half_life_days: Optional[float] = None
    # Half-life used for exponential decay weighting, if applied.
    # Reproduced here so the result is self-describing for audit consumers.
```

The `score` field MUST be in the closed interval `[0.0, 1.0]`.

The `trend_slope` field is advisory. It MUST NOT be used as an enforcement gate by core ARF.
It MAY be used by enterprise governance layers for alerting or escalation.

## 4. Interface Contract

The temporal layer MUST expose a non-core adapter interface.

```python
from abc import ABC, abstractmethod

class TemporalReliabilityAdapter(ABC):
    @abstractmethod
    def ingest(self, signal: 'ReliabilitySignal', metadata: 'SessionMetadata') -> None:
        pass

    @abstractmethod
    def compute_windowed_reliability(
        self,
        agent_id: str,
        window: 'TimeWindow',
    ) -> 'WindowedReliabilityResult':
        pass
```

### 4.1 Interface requirements

An implementation of `TemporalReliabilityAdapter`:

- MUST accept a `ReliabilitySignal` plus metadata.
- MUST support computation over a defined time window.
- MUST return a `WindowedReliabilityResult` with `score` in the closed interval `[0.0, 1.0]`.
- MUST be deterministic for identical stored inputs and identical window parameters.
- MUST remain separable from core in-session evaluation logic.
- MUST set `sample_count` to reflect the number of sessions that contributed after filtering.

### 4.2 Optional weighting and decay

Implementations MAY apply:
- exponential decay (with `decay_half_life_days` encoded in the result)
- sliding windows
- deployment-aware weighting
- confidence weighting
- anomaly-weighted trust accumulation
- per-dimension aggregation using `ReliabilityDimensions`

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

- `arf-spec`: canonical interface and data contract (this document)
- `enterprise`: longitudinal scoring implementation, if productized
- separate extension repository: optional OSS adapter implementation

## 8. Acceptance Criteria

A conforming implementation MUST be able to:

1. Store temporal reliability inputs with `session_id` and `observed_at`
2. Compute a windowed reliability result over multiple sessions, returning `WindowedReliabilityResult`
3. Leave core ARF in-session scoring unchanged
4. Operate with temporal features disabled
5. Return `sample_count` that accurately reflects how many sessions contributed to the result
6. Return `trend_slope` when two or more sessions are available in the window
7. If `window_start` and `window_end` are provided in a `WindowedReliabilityResult`, they MUST be valid ISO 8601 timestamps with `window_start <= window_end`. Consumers MAY reject results that violate this constraint.

## 9. Reference Implementations

The exact placement of the first implementation is currently open.

The following OSS projects implement cross-session reliability scoring that aligns with this boundary spec and may serve as reference implementations or integration targets:

- **PDR (Probabilistic Delegation Reliability)** — longitudinal behavioral reliability scoring with exponential decay, multi-axis scoring (`delivery_score`, `calibration_delta`, `adaptation_score`), and production data from 6,342 autonomous cycles. DOI: [10.5281/zenodo.19339671](https://zenodo.org/record/19339671). PDR's three-axis model maps directly to `ReliabilityDimensions` in §3.4. PDR can function as a `TemporalReliabilityAdapter` consumer that ingests `ReliabilitySignal` outputs from ARF core and computes cross-session trends.

Listing a reference implementation here does not constitute endorsement by ARF Foundation or imply architectural dependency. It records known implementations that conform to this boundary.
