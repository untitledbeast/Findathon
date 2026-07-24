# ADR 001: Layered Domain-Driven Architecture

## Context
Findathon requires a scalable backend architecture that isolates UI components from database schema changes and supports future intelligence, personalization, reviews, and search layers without major refactoring.

## Decision
We adopt a clean **Layered Domain-Driven Architecture**:
1. Business state logic lives inside rich domain entities (`HackathonEntity`).
2. Data transfer objects (DTOs) and mappers isolate external API surfaces from database tables.
3. Factory functions instantiate services cleanly without heavyweight DI containers.
4. Services return `Result<T, AppError>` objects avoiding unhandled exceptions.
5. All backend timestamps are strictly in UTC.

## Status
Accepted and Implemented.
