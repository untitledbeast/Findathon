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

## Search Engine Consolidation
- **Sole Search Engine**: `lib/discovery-engine.ts` (`StatelessDiscoveryEngine`) is the unified single discovery engine powering `/api/v1/search`, Spotlight search modal (`Cmd+K`), Compare drawer, and Curated collections.
- **Removed Duplicate Engines**: The unused parallel `lib/search/` directory (`SupabaseSearchProvider`, `SearchIndexService`, `RankingService`) has been deleted to prevent parallel search system drift.

## Inert Infrastructure Contracts & Future Feature Mapping
The following modules exist as typed contracts and are explicitly marked as `INERT` until their target features are implemented:

| Inert Module | Target Feature | Future Implementation Phase |
| :--- | :--- | :--- |
| `lib/domain/events/event-bus.ts` | Review & Bookmark domain event publishing | Phase 3B / 3C |
| `lib/notifications/notification-dispatcher.ts` | Review activity alerts & organizer notification triggers | Phase 3D |
| `lib/storage/image-pipeline.service.ts` | Image optimization & WebP CDN variant generation | Phase 3D |
| `lib/features/local-feature-flag.provider.ts` | Dynamic feature toggle evaluations | Phase 3C |
