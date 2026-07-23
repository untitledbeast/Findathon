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
        # Top line header
        self.setStrokeColor(colors.HexColor('#8B5CF6'))
        self.setLineWidth(1.5)
        self.line(54, 745, 558, 745)
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor('#6B7280'))
        self.drawString(54, 752, "FINDATHON — Project Status Report & Strategic Roadmap")
        self.drawRightString(558, 752, "July 2026")
        
        # Bottom line footer
        self.setStrokeColor(colors.HexColor('#E5E7EB'))
        self.setLineWidth(0.8)
        self.line(54, 45, 558, 45)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor('#9CA3AF'))
        self.drawString(54, 32, "Findathon Project Document • Next.js 16 & Supabase Stack")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()

def build_pdf(filename="Findathon_Project_Status_and_Roadmap.pdf"):
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
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#060816'),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#8B5CF6'),
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#475569'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
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

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    badge_complete = ParagraphStyle(
        'BadgeComplete',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#15803D')
    )

    story = []

    # Title Banner Block
    story.append(Paragraph("FINDATHON", title_style))
    story.append(Paragraph("Current Project Status & Strategic Execution Roadmap", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    # Executive Overview
    story.append(Paragraph("1. Executive Summary & Current Phase", h1_style))
    story.append(Paragraph(
        "<b>Findathon</b> is a modern discovery and submission platform for global hackathons. "
        "Built using <b>Next.js 16 (App Router)</b>, <b>React 19</b>, <b>Tailwind CSS v4</b>, and <b>Supabase</b>, "
        "the application has achieved <b>Phase 1 MVP Completion</b> with full client-side routing, glassmorphic design system, "
        "spotlight search, sub-tag filtering, multi-step submission wizard, and interactive profile dashboard.",
        body_style
    ))

    # Key Metrics Table
    summary_data = [
        [Paragraph("Metric / Indicator", table_header_style), Paragraph("Status / Value", table_header_style), Paragraph("Notes & Verification", table_header_style)],
        [Paragraph("Current Project Phase", table_cell_style), Paragraph("Phase 1 Complete (MVP)", badge_complete), Paragraph("Fully operational client application", table_cell_style)],
        [Paragraph("TypeScript Compilation", table_cell_style), Paragraph("100% Clean (0 Errors)", badge_complete), Paragraph("Verified via npx tsc --noEmit", table_cell_style)],
        [Paragraph("Core Page Routes", table_cell_style), Paragraph("6 / 6 Implemented", badge_complete), Paragraph("Home, Categories, Cat Detail, Hack Detail, Submit, Account", table_cell_style)],
        [Paragraph("Database Architecture", table_cell_style), Paragraph("Supabase + Seed Fallback", badge_complete), Paragraph("Dual-mode (Postgres DB + MOCK_HACKATHONS)", table_cell_style)],
        [Paragraph("Authentication Flow", table_cell_style), Paragraph("Google OAuth + AuthContext", badge_complete), Paragraph("Callback handler at /auth/callback", table_cell_style)]
    ]
    t_summary = Table(summary_data, colWidths=[130, 140, 234])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F8FAFC'), colors.white])
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 10))

    # Detailed Feature Implementation Matrix
    story.append(Paragraph("2. Detailed Feature Implementation Breakdown", h1_style))

    features_data = [
        [Paragraph("Feature Component", table_header_style), Paragraph("Key Functionalities", table_header_style), Paragraph("State", table_header_style)],
        
        [Paragraph("Landing Page & Hero", table_cell_style), 
         Paragraph("Mouse parallax 3D floating glowing spheres, animated stats counters, hero spotlight trigger.", table_cell_style),
         Paragraph("COMPLETE", badge_complete)],
        
        [Paragraph("Hackathon Filter & Grid", table_cell_style), 
         Paragraph("Category filter bar (All, Online, In-Person, AI, Web3, Saved), real-time search filtering, result counts.", table_cell_style),
         Paragraph("COMPLETE", badge_complete)],
        
        [Paragraph("Category Directory", table_cell_style), 
         Paragraph("10 tech domain categories (AI/ML, Web3, Cyber, Cloud, Robotics, etc.) with custom neon glow themes and event counts.", table_cell_style),
         Paragraph("COMPLETE", badge_complete)],
        
        [Paragraph("Category Detail View", table_cell_style), 
         Paragraph("Sub-tag chips filter (#LLM, #Solidity), multi-criteria sorting (Latest, Earliest, Prize Pool, Deadline).", table_cell_style),
         Paragraph("COMPLETE", badge_complete)],

        [Paragraph("Hackathon Single View", table_cell_style), 
         Paragraph("Complete details, organizer info, venue map address, live countdown timer component to deadline, share link.", table_cell_style),
         Paragraph("COMPLETE", badge_complete)],

        [Paragraph("4-Step Submit Wizard", table_cell_style), 
         Paragraph("Step 1 (Info), Step 2 (Dates/Location), Step 3 (Rules/Team), Step 4 (Contact/Socials). Auto-draft local storage.", table_cell_style),
         Paragraph("COMPLETE", badge_complete)],

        [Paragraph("Account Dashboard", table_cell_style), 
         Paragraph("Tabs: Overview, Submissions, Saved, Edit Profile, Settings. SVG Completion Ring, full profile editor.", table_cell_style),
         Paragraph("COMPLETE", badge_complete)],

        [Paragraph("Spotlight Search Modal", table_cell_style), 
         Paragraph("Command palette (Cmd+K / Ctrl+K), fuzzy search over titles/cities/colleges/tags, arrow key navigation.", table_cell_style),
         Paragraph("COMPLETE", badge_complete)],

        [Paragraph("Auth & Session Flow", table_cell_style), 
         Paragraph("Supabase Auth context provider, Auth modal dialog, Google OAuth callback route handler.", table_cell_style),
         Paragraph("COMPLETE", badge_complete)]
    ]

    t_features = Table(features_data, colWidths=[120, 314, 70])
    t_features.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#8B5CF6')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(t_features)
    story.append(Spacer(1, 10))

    # Project Strategic Roadmap
    story.append(Paragraph("3. Strategic Multi-Phase Development Roadmap", h1_style))
    story.append(Paragraph("The project execution plan is structured into four distinct strategic phases:", body_style))

    # Phase 1
    story.append(Paragraph("Phase 1: Feature-Complete MVP & Discovery Engine", h2_style))
    story.append(Paragraph("• Status: <b>100% COMPLETED (July 2026)</b>", bullet_style))
    story.append(Paragraph("• Full glassmorphic UI design system with dynamic ambient aurora glow background.", bullet_style))
    story.append(Paragraph("• Next.js 16 App Router navigation, responsive layouts, and multi-filter discovery engine.", bullet_style))
    story.append(Paragraph("• Command Palette (Cmd+K) Spotlight search with fuzzy matching and keyboard controls.", bullet_style))
    story.append(Paragraph("• 4-step event submission wizard with local draft persistence and input pre-filling.", bullet_style))
    story.append(Paragraph("• User account dashboard with profile completion tracking and bookmark management.", bullet_style))

    story.append(Spacer(1, 4))

    # Phase 2
    story.append(Paragraph("Phase 2: Database Hardening & Live Supabase Migration", h2_style))
    story.append(Paragraph("• Target Timeline: <b>Weeks 1 – 4 (Next Phase)</b>", bullet_style))
    story.append(Paragraph("• Provision production Supabase PostgreSQL instance and configure environment keys.", bullet_style))
    story.append(Paragraph("• Deploy strict Row-Level Security (RLS) policies for hackathons and profiles tables.", bullet_style))
    story.append(Paragraph("• Implement server-side admin dashboard for reviewing and approving pending submissions.", bullet_style))
    story.append(Paragraph("• Resolve minor React 19 ESLint hook warnings and optimize image loading performance.", bullet_style))

    story.append(Spacer(1, 4))

    # Phase 3
    story.append(Paragraph("Phase 3: Team Matching & Community Engagement", h2_style))
    story.append(Paragraph("• Target Timeline: <b>Month 2</b>", bullet_style))
    story.append(Paragraph("• <b>Find-a-Teammate Hub</b>: Match solo developers based on skills, timezones, and hackathon interest.", bullet_style))
    story.append(Paragraph("• <b>Automated Reminders</b>: Email & browser notifications when saved hackathon deadlines approach.", bullet_style))
    story.append(Paragraph("• <b>Event Calendar Export</b>: One-click export to Google Calendar, Apple iCal, and Outlook (.ics).", bullet_style))
    story.append(Paragraph("• <b>Interactive Campus Map</b>: Mapbox / Leaflet visualization for in-person college hackathons.", bullet_style))

    story.append(Spacer(1, 4))

    # Phase 4
    story.append(Paragraph("Phase 4: Monetization & Enterprise Organizer Portal", h2_style))
    story.append(Paragraph("• Target Timeline: <b>Month 3 – 4</b>", bullet_style))
    story.append(Paragraph("• <b>Featured Listings & Sponsorships</b>: Premium placement badges for top organizers.", bullet_style))
    story.append(Paragraph("• <b>Organizer Analytics Dashboard</b>: Live impressions, click-through rates, and participant analytics.", bullet_style))
    story.append(Paragraph("• <b>API & Webhook Platform</b>: Expose developer APIs for university clubs and hackathon aggregators.", bullet_style))

    story.append(Spacer(1, 10))

    # Technical Quality & Verification
    story.append(Paragraph("4. Technical Quality & System Verification", h1_style))
    story.append(Paragraph(
        "The application has undergone technical validation across key dimensions:", body_style
    ))
    story.append(Paragraph("• <b>TypeScript Type Safety</b>: Passed with 0 errors via <code>npx tsc --noEmit</code>.", bullet_style))
    story.append(Paragraph("• <b>Fallback Architecture</b>: Verified offline resilience using <code>MOCK_HACKATHONS</code> seed data.", bullet_style))
    story.append(Paragraph("• <b>User Experience & Aesthetics</b>: Implemented high-contrast dark theme (#060816), violet gradients (#8B5CF6), and responsive grid systems.", bullet_style))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Findathon_Project_Status_and_Roadmap.pdf"
    build_pdf(out_file)
