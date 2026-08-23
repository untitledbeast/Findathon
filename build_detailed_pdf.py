import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Top header line
        self.setStrokeColor(colors.HexColor('#8B5CF6'))
        self.setLineWidth(1.5)
        self.line(54, 745, 558, 745)
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor('#475569'))
        self.drawString(54, 752, "FINDATHON — Comprehensive Technical Analysis & Strategic Improvement Plan")
        self.drawRightString(558, 752, "August 2026")
        
        # Bottom footer line
        self.setStrokeColor(colors.HexColor('#E2E8F0'))
        self.setLineWidth(0.8)
        self.line(54, 45, 558, 45)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor('#94A3B8'))
        self.drawString(54, 32, "Confidential • Architectural Review & Technical Roadmap")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()

def build_pdf(filename="Findathon_Detailed_Analysis_and_Improvements.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=64,
        bottomMargin=64
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#7C3AED'),
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#6D28D9'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        leftIndent=10,
        spaceAfter=3
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    badge_crit = ParagraphStyle('BadgeCrit', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor('#DC2626'))
    badge_high = ParagraphStyle('BadgeHigh', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor('#D97706'))
    badge_med = ParagraphStyle('BadgeMed', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor('#2563EB'))
    badge_done = ParagraphStyle('BadgeDone', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor('#16A34A'))

    story = []

    # Title Banner Block
    story.append(Paragraph("FINDATHON", title_style))
    story.append(Paragraph("Full-Stack Architecture Audit & Comprehensive Project Improvement Report", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    # SECTION 1: EXECUTIVE SUMMARY & CURRENT ARCHITECTURE
    story.append(Paragraph("1. Executive Summary & Tech Stack Audit", h1_style))
    story.append(Paragraph(
        "<b>Findathon</b> is an enterprise-structured hackathon discovery platform built with <b>Next.js 16 (App Router)</b>, "
        "<b>React 19</b>, <b>Tailwind CSS 4</b>, and <b>Supabase (PostgreSQL + PostGIS)</b>. "
        "The codebase encompasses over <b>130+ TypeScript/TSX source files</b>, structured around Domain-Driven Design (DDD), "
        "Command-Query Responsibility Segregation (CQRS), and clean Repository abstractions with resilient mock fallbacks.",
        body_style
    ))

    stack_summary_data = [
        [Paragraph("Layer / System", table_header_style), Paragraph("Technologies & Version", table_header_style), Paragraph("Architectural Patterns", table_header_style)],
        [Paragraph("Frontend Framework", table_cell_bold), Paragraph("Next.js 16.2.12 + React 19.2.8", table_cell_style), Paragraph("App Router, Server Actions, Client Components", table_cell_style)],
        [Paragraph("UI & Aesthetics", table_cell_bold), Paragraph("TailwindCSS 4 + Lucide Icons", table_cell_style), Paragraph("Dark glassmorphism, Aurora glow, CSS animations", table_cell_style)],
        [Paragraph("Database & Search", table_cell_bold), Paragraph("Supabase PostgreSQL + PostGIS", table_cell_style), Paragraph("Full-Text Search (tsvector), Trigram GIN, RLS", table_cell_style)],
        [Paragraph("Backend Logic", table_cell_bold), Paragraph("TypeScript 5 (Strict Mode)", table_cell_style), Paragraph("CQRS, Domain Entities, Value Objects, Specs", table_cell_style)],
        [Paragraph("Caching & Resilience", table_cell_bold), Paragraph("In-Memory Cache + Singleflight", table_cell_style), Paragraph("TTL caching, stampede prevention, Mock fallback", table_cell_style)],
        [Paragraph("Authentication", table_cell_bold), Paragraph("Supabase SSR Auth 0.12.4", table_cell_style), Paragraph("Google OAuth, Cookie session, Role RBAC", table_cell_style)]
    ]
    t_stack = Table(stack_summary_data, colWidths=[120, 160, 224])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F8FAFC'), colors.white])
    ]))
    story.append(t_stack)
    story.append(Spacer(1, 8))

    # SECTION 2: FILE & COMPONENT DISTRIBUTION
    story.append(Paragraph("2. Full Codebase Inventory & Component Distribution", h1_style))
    story.append(Paragraph(
        "The project is partitioned into distinct modular domains to decouple UI rendering, API orchestration, and domain logic:", body_style
    ))

    inv_data = [
        [Paragraph("Module / Directory", table_header_style), Paragraph("File Count", table_header_style), Paragraph("Primary Responsibilities & Key Files", table_header_style)],
        [Paragraph("app/ (Pages & API)", table_cell_bold), Paragraph("14 Pages / 16 APIs", table_cell_style), Paragraph("Homepage, Map, Hackathon Detail, Account, Admin, Submit, API v1", table_cell_style)],
        [Paragraph("components/", table_cell_bold), Paragraph("28 Components", table_cell_style), Paragraph("Navbar, HackathonCard, UniversalSearch, FiltersPanel, ReviewSection", table_cell_style)],
        [Paragraph("hooks/", table_cell_bold), Paragraph("16 Custom Hooks", table_cell_style), Paragraph("useSearch (state machine), useHomepageData, useDiscovery, useAuth", table_cell_style)],
        [Paragraph("lib/domain/", table_cell_bold), Paragraph("25+ TS Files", table_cell_style), Paragraph("Entities (Hackathon, Review), Value Objects, Specifications, Policies", table_cell_style)],
        [Paragraph("lib/services/", table_cell_bold), Paragraph("13 CQRS Services", table_cell_style), Paragraph("HackathonQuery/Command, ReviewService, Deduplication, Factories", table_cell_style)],
        [Paragraph("lib/repositories/", table_cell_bold), Paragraph("5 Repositories", table_cell_style), Paragraph("Supabase implementations for Hackathons, Reviews, Bookmarks, Profiles", table_cell_style)],
        [Paragraph("supabase/ & jobs/", table_cell_bold), Paragraph("Schema + 6 Jobs", table_cell_style), Paragraph("schema.sql (423 lines), computeQuality, computeTrending, cron jobs", table_cell_style)]
    ]
    t_inv = Table(inv_data, colWidths=[130, 90, 284])
    t_inv.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6D28D9')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(t_inv)
    story.append(Spacer(1, 10))

    # SECTION 3: COMPREHENSIVE PROJECT IMPROVEMENTS (SEPARATE DETAILED SECTIONS)
    story.append(Paragraph("3. Deep-Dive Project Improvement Analysis", h1_style))
    story.append(Paragraph(
        "While Findathon possesses exceptional architectural foundations, a thorough audit reveals key areas where the project "
        "can be significantly enhanced across performance, backend reliability, user experience, AI capability, and testing.",
        body_style
    ))

    # Improvement Category 3.1: Database & Backend Infrastructure
    story.append(Paragraph("3.1 Database & Backend Infrastructure Enhancements", h2_style))
    story.append(Paragraph("• <b>Live Supabase Sync & Auto-Migration Pipeline</b>: Currently, the repository layer falls back to <code>MOCK_HACKATHONS</code> when Supabase keys are default placeholders. Establish automated CI/CD schema migration scripts using Supabase CLI and enforce live database connection checks.", bullet_style))
    story.append(Paragraph("• <b>Distributed Redis Caching (Upstash/Redis)</b>: The current <code>MemoryCacheProvider</code> uses an in-memory <code>Map</code>. In serverless environments like Vercel, memory is not shared across lambda instances. Replacing this with Redis will maintain global cache consistency for search queries and hackathon details.", bullet_style))
    story.append(Paragraph("• <b>Transactional Unit-of-Work Pattern</b>: When creating or updating complex hackathons with media, timeline milestones, and tags, multiple repository queries execute separately. Implementing a formal Unit-of-Work with PostgreSQL database transactions will prevent partial data commits.", bullet_style))
    story.append(Paragraph("• <b>Distributed Rate Limiting</b>: Replace the single-node memory map in <code>lib/middleware/rate-limit.ts</code> with a Redis sliding-window algorithm to properly prevent API abuse across serverless instances.", bullet_style))

    story.append(Spacer(1, 4))

    # Improvement Category 3.2: Frontend Performance & UX Optimizations
    story.append(Paragraph("3.2 Frontend Performance & User Experience Optimizations", h2_style))
    story.append(Paragraph("• <b>Virtualization for Hackathon Grids</b>: In the main discovery feed (<code>app/page.tsx</code>), rendering dozens of heavy <code>HackathonCard</code> components can degrade DOM frame rates on mobile devices. Integrating <code>@tanstack/react-virtual</code> will virtualize non-visible cards.", bullet_style))
    story.append(Paragraph("• <b>SSR / ISR Strategy for Hackathon Detail Pages</b>: Shift hackathon detail pages (<code>/hackathons/[id]</code>) from pure client-side fetching to Next.js Incremental Static Regeneration (ISR) with revalidation tags. This will dramatically improve Google SEO indexing and initial page load speed.", bullet_style))
    story.append(Paragraph("• <b>Accessibility (a11y) & Focus Traps</b>: Enhance keyboard navigation in modal dialogs (<code>AuthModal</code>, <code>SpotlightSearch</code>, <code>CompareDrawer</code>) by adding formal WAI-ARIA focus traps and missing screen-reader labels.", bullet_style))
    story.append(Paragraph("• <b>Image Optimization & Micro-Animations</b>: Add dynamic WebP blur placeholders for cover images in <code>HackathonCard</code> and optimize Leaflet map icon rendering to avoid main-thread blocking.", bullet_style))

    story.append(Spacer(1, 4))

    # Improvement Category 3.3: Search, AI & Community Features
    story.append(Paragraph("3.3 Search Engine, AI Embeddings & Community Features", h2_style))
    story.append(Paragraph("• <b>Hybrid AI Search (Vector Embeddings + pgvector)</b>: While the current NLP intent parser (<code>intent-parser.ts</code>) is fast for keyword/regex extraction, integrating vector embeddings via Google Gemini API + <code>pgvector</code> will enable true semantic search (e.g. searching 'beginner friendly sustainability hackathons with cash prizes').", bullet_style))
    story.append(Paragraph("• <b>AI Teammate Matchmaker Hub</b>: Build a dedicated 'Find-a-Teammate' hub where developers can auto-match with teams based on complementary skill sets (e.g., Frontend Developer + ML Engineer), timezones, and hackathon goals.", bullet_style))
    story.append(Paragraph("• <b>One-Click Calendar Integration</b>: Add instant sync buttons for Google Calendar, Apple iCal, and Outlook (.ics) directly on hackathon detail pages.", bullet_style))
    story.append(Paragraph("• <b>Real-Time Push & Email Reminders</b>: Trigger web push notifications and automated email alerts 24 hours before registration deadlines close.", bullet_style))

    story.append(Spacer(1, 4))

    # Improvement Category 3.4: Testing, Security & DevOps
    story.append(Paragraph("3.4 Testing Framework, Security & DevOps Pipeline", h2_style))
    story.append(Paragraph("• <b>Automated Test Suite (Vitest + Playwright)</b>: Currently, automated test files are minimal. Implement unit tests for domain entities/value objects, integration tests for API routes, and end-to-end (E2E) user flow tests using Playwright.", bullet_style))
    story.append(Paragraph("• <b>Automated CI/CD Pipeline</b>: Configure GitHub Actions to run <code>tsc --noEmit</code>, ESLint, security vulnerability scans, and Vitest test suites on every pull request.", bullet_style))
    story.append(Paragraph("• <b>Sentry Error Telemetry & Performance Monitoring</b>: Expand Sentry instrumentation to track client-side Web Vitals (LCP, CLS, FID) and log unhandled API exceptions in real-time.", bullet_style))

    story.append(Spacer(1, 10))

    # SECTION 4: STRATEGIC ACTION MATRIX & ROADMAP
    story.append(Paragraph("4. Prioritized Improvement Action Matrix", h1_style))
    story.append(Paragraph(
        "Below is a structured roadmap categorizing improvements by priority tier, technical impact, and estimated implementation complexity:", body_style
    ))

    action_matrix_data = [
        [Paragraph("Refinement Initiative", table_header_style), Paragraph("Category", table_header_style), Paragraph("Priority", table_header_style), Paragraph("Impact", table_header_style), Paragraph("Target Phase", table_header_style)],
        
        [Paragraph("Live Supabase Production Sync", table_cell_bold), Paragraph("Database", table_cell_style), Paragraph("P0 - CRITICAL", badge_crit), Paragraph("High", table_cell_style), Paragraph("Immediate (Phase 2)", table_cell_style)],
        [Paragraph("Vitest + Playwright Test Suite", table_cell_bold), Paragraph("DevOps/QA", table_cell_style), Paragraph("P0 - CRITICAL", badge_crit), Paragraph("High", table_cell_style), Paragraph("Immediate (Phase 2)", table_cell_style)],
        [Paragraph("SSR / ISR for Detail Pages", table_cell_bold), Paragraph("Frontend/SEO", table_cell_style), Paragraph("P1 - HIGH", badge_high), Paragraph("High", table_cell_style), Paragraph("Next Sprint", table_cell_style)],
        [Paragraph("Upstash Redis Distributed Cache", table_cell_bold), Paragraph("Infrastructure", table_cell_style), Paragraph("P1 - HIGH", badge_high), Paragraph("High", table_cell_style), Paragraph("Next Sprint", table_cell_style)],
        [Paragraph("Vector Semantic Search (pgvector)", table_cell_bold), Paragraph("AI Engine", table_cell_style), Paragraph("P1 - HIGH", badge_high), Paragraph("Medium-High", table_cell_style), Paragraph("Phase 3", table_cell_style)],
        [Paragraph("Virtualization for Grid Feed", table_cell_bold), Paragraph("Frontend", table_cell_style), Paragraph("P2 - MEDIUM", badge_med), Paragraph("Medium", table_cell_style), Paragraph("Phase 3", table_cell_style)],
        [Paragraph("AI Teammate Matchmaker Hub", table_cell_bold), Paragraph("Feature", table_cell_style), Paragraph("P2 - MEDIUM", badge_med), Paragraph("High", table_cell_style), Paragraph("Phase 3", table_cell_style)],
        [Paragraph("Calendar Sync & Deadline Push", table_cell_bold), Paragraph("Feature", table_cell_style), Paragraph("P2 - MEDIUM", badge_med), Paragraph("Medium", table_cell_style), Paragraph("Phase 4", table_cell_style)]
    ]

    t_matrix = Table(action_matrix_data, colWidths=[140, 75, 85, 74, 130])
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F8FAFC'), colors.white])
    ]))
    story.append(t_matrix)
    story.append(Spacer(1, 10))

    # SECTION 5: CONCLUSION & VERIFICATION SUMMARY
    story.append(Paragraph("5. Conclusion & Technical Verification", h1_style))
    story.append(Paragraph(
        "Findathon stands out as a highly polished, beautifully styled, and architecturally robust hackathon discovery platform. "
        "With 100% TypeScript compilation cleanliness and an modular DDD/CQRS architecture, executing the prioritized improvement plan "
        "will elevate the platform from MVP status to a world-class production system supporting millions of developer interactions globally.",
        body_style
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Findathon_Detailed_Analysis_and_Improvements.pdf"
    build_pdf(out_file)
