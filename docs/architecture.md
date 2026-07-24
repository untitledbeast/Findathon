# Findathon Architecture Specification

## Overview
Findathon is built on Next.js 14 App Router, TypeScript, and Supabase PostgreSQL following a strict **Layered Domain-Driven Architecture**.

## Layer Boundaries
```
Browser UI -> Custom Hooks -> API Routes (/api/v1/*) -> Domain Services -> Pure Repositories -> Supabase DB
```

- **UI & Hooks**: Exclusively consume API routes and services. Never query DB directly.
- **Domain Services**: Orchestrate business rules, tag cache, domain events, and repository access.
- **Pure Repositories**: Encapsulate parameterized database access. Never execute business workflows or event publishing.
- **Entities**: Encapsulate core domain state, invariants, and validation (`HackathonEntity.approve()`).
