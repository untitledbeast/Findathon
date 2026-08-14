"""
Findathon Project Analysis → PDF Generator
Generates a beautifully styled HTML file that can be printed/saved as PDF.
"""

import re
import html
import os

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_HTML = os.path.join(OUTPUT_DIR, "Findathon_Project_Analysis.html")

# Read the markdown source
MD_SOURCE = r"C:\Users\Sagar\.gemini\antigravity-ide\brain\08f020e3-71bc-4eaa-8b7f-5d2326f74a19\findathon_project_analysis.md"

def md_to_html(md_text: str) -> str:
    """Very simple markdown to HTML converter for this specific document."""
    lines = md_text.split('\n')
    html_parts = []
    in_table = False
    in_code = False
    code_lang = ""
    code_lines = []
    in_list = False
    table_rows = []

    def flush_table():
        nonlocal table_rows, in_table
        if not table_rows:
            return ""
        result = '<div class="table-wrapper"><table>\n'
        for i, row in enumerate(table_rows):
            cells = [c.strip() for c in row.strip('|').split('|')]
            if i == 0:
                result += '<thead><tr>' + ''.join(f'<th>{c}</th>' for c in cells) + '</tr></thead>\n<tbody>\n'
            elif all(set(c.strip()) <= {'-', ':', ' '} for c in cells):
                continue  # separator row
            else:
                result += '<tr>' + ''.join(f'<td>{c}</td>' for c in cells) + '</tr>\n'
        result += '</tbody></table></div>\n'
        table_rows = []
        in_table = False
        return result

    def flush_list():
        nonlocal in_list
        if in_list:
            in_list = False
            return '</ul>\n'
        return ''

    i = 0
    while i < len(lines):
        line = lines[i]

        # Code blocks
        if line.strip().startswith('```'):
            if in_code:
                html_parts.append(f'<pre><code class="language-{code_lang}">{html.escape(chr(10).join(code_lines))}</code></pre>\n')
                code_lines = []
                in_code = False
                code_lang = ""
            else:
                html_parts.append(flush_table())
                html_parts.append(flush_list())
                in_code = True
                code_lang = line.strip().replace('```', '').strip()
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # Tables
        if '|' in line and line.strip().startswith('|'):
            if not in_table:
                html_parts.append(flush_list())
                in_table = True
            table_rows.append(line)
            i += 1
            continue
        elif in_table:
            html_parts.append(flush_table())

        # Empty lines
        if line.strip() == '':
            html_parts.append(flush_list())
            i += 1
            continue

        # Horizontal rules
        if line.strip() == '---':
            html_parts.append(flush_list())
            html_parts.append('<hr>\n')
            i += 1
            continue

        # Headings
        heading_match = re.match(r'^(#{1,6})\s+(.*)', line)
        if heading_match:
            html_parts.append(flush_list())
            level = len(heading_match.group(1))
            text = heading_match.group(2)
            html_parts.append(f'<h{level}>{text}</h{level}>\n')
            i += 1
            continue

        # Blockquotes / alerts
        if line.strip().startswith('>'):
            html_parts.append(flush_list())
            content = line.strip().lstrip('>').strip()
            if '[!IMPORTANT]' in content:
                # Collect next lines
                alert_lines = []
                i += 1
                while i < len(lines) and lines[i].strip().startswith('>'):
                    alert_lines.append(lines[i].strip().lstrip('>').strip())
                    i += 1
                html_parts.append(f'<div class="alert alert-important"><strong>⚠️ IMPORTANT</strong><br>{" ".join(alert_lines)}</div>\n')
                continue
            elif '[!CAUTION]' in content:
                alert_lines = []
                i += 1
                while i < len(lines) and lines[i].strip().startswith('>'):
                    alert_lines.append(lines[i].strip().lstrip('>').strip())
                    i += 1
                html_parts.append(f'<div class="alert alert-caution"><strong>🔴 CAUTION</strong><br>{" ".join(alert_lines)}</div>\n')
                continue
            else:
                html_parts.append(f'<blockquote>{content}</blockquote>\n')
                i += 1
                continue

        # List items
        if re.match(r'^[\s]*[-*]\s', line):
            if not in_list:
                in_list = True
                html_parts.append('<ul>\n')
            content = re.sub(r'^[\s]*[-*]\s', '', line)
            # Process inline formatting
            content = process_inline(content)
            html_parts.append(f'<li>{content}</li>\n')
            i += 1
            continue

        # Numbered list
        if re.match(r'^\d+\.\s', line.strip()):
            if not in_list:
                in_list = True
                html_parts.append('<ul>\n')
            content = re.sub(r'^\d+\.\s', '', line.strip())
            content = process_inline(content)
            html_parts.append(f'<li>{content}</li>\n')
            i += 1
            continue

        # Regular paragraph
        html_parts.append(flush_list())
        content = process_inline(line)
        html_parts.append(f'<p>{content}</p>\n')
        i += 1

    html_parts.append(flush_table())
    html_parts.append(flush_list())

    return ''.join(html_parts)


def process_inline(text: str) -> str:
    """Process inline markdown formatting."""
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # Inline code
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    # Links
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    # Italic
    text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<em>\1</em>', text)
    return text


def generate_html(body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Findathon — Complete Project Analysis & Architecture Document</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

* {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}}

body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #0a0e1a;
    color: #e2e8f0;
    line-height: 1.7;
    font-size: 13px;
    padding: 0;
}}

.container {{
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 50px;
}}

/* Cover Page */
.cover {{
    text-align: center;
    padding: 100px 40px 80px;
    border-bottom: 2px solid rgba(139, 92, 246, 0.3);
    margin-bottom: 40px;
    background: linear-gradient(180deg, rgba(139,92,246,0.08) 0%, transparent 100%);
    page-break-after: always;
}}

.cover h1 {{
    font-size: 42px;
    font-weight: 900;
    background: linear-gradient(135deg, #8B5CF6, #4CC9F0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 16px;
    letter-spacing: -1px;
}}

.cover .subtitle {{
    font-size: 18px;
    color: #94a3b8;
    font-weight: 400;
    margin-bottom: 30px;
}}

.cover .meta {{
    font-size: 12px;
    color: #64748b;
    line-height: 2;
}}

.cover .badge {{
    display: inline-block;
    padding: 6px 16px;
    border-radius: 100px;
    background: rgba(139, 92, 246, 0.15);
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: #a78bfa;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 30px;
}}

/* Headings */
h1 {{
    font-size: 28px;
    font-weight: 900;
    color: #f1f5f9;
    margin: 48px 0 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid rgba(139, 92, 246, 0.25);
    letter-spacing: -0.5px;
    page-break-after: avoid;
}}

h2 {{
    font-size: 20px;
    font-weight: 800;
    color: #e2e8f0;
    margin: 36px 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.15);
    page-break-after: avoid;
}}

h3 {{
    font-size: 16px;
    font-weight: 700;
    color: #c4b5fd;
    margin: 24px 0 8px;
    page-break-after: avoid;
}}

h4 {{
    font-size: 14px;
    font-weight: 600;
    color: #a78bfa;
    margin: 16px 0 6px;
}}

/* Paragraphs */
p {{
    margin: 8px 0;
    color: #cbd5e1;
}}

/* Links */
a {{
    color: #818cf8;
    text-decoration: none;
}}

/* Lists */
ul {{
    margin: 8px 0 8px 24px;
    padding: 0;
}}

li {{
    margin: 4px 0;
    color: #cbd5e1;
    line-height: 1.7;
}}

li code {{
    background: rgba(139, 92, 246, 0.15);
    color: #c4b5fd;
}}

/* Tables */
.table-wrapper {{
    overflow-x: auto;
    margin: 16px 0;
    border-radius: 12px;
    border: 1px solid rgba(139, 92, 246, 0.2);
}}

table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}}

thead {{
    background: rgba(139, 92, 246, 0.12);
}}

th {{
    padding: 10px 14px;
    text-align: left;
    font-weight: 700;
    color: #a78bfa;
    border-bottom: 1px solid rgba(139, 92, 246, 0.2);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}}

td {{
    padding: 8px 14px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.08);
    color: #cbd5e1;
}}

tr:last-child td {{
    border-bottom: none;
}}

tr:hover {{
    background: rgba(139, 92, 246, 0.05);
}}

/* Code */
code {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(30, 41, 59, 0.8);
    color: #7dd3fc;
    border: 1px solid rgba(71, 85, 105, 0.3);
}}

pre {{
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 12px;
    padding: 18px 20px;
    overflow-x: auto;
    margin: 14px 0;
    page-break-inside: avoid;
}}

pre code {{
    padding: 0;
    background: none;
    border: none;
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.6;
}}

/* Blockquote */
blockquote {{
    border-left: 3px solid #8B5CF6;
    padding: 10px 16px;
    margin: 14px 0;
    background: rgba(139, 92, 246, 0.06);
    border-radius: 0 8px 8px 0;
    color: #94a3b8;
    font-style: italic;
}}

/* Alerts */
.alert {{
    padding: 14px 18px;
    border-radius: 10px;
    margin: 16px 0;
    font-size: 12px;
    line-height: 1.6;
    page-break-inside: avoid;
}}

.alert-important {{
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.25);
    color: #fbbf24;
}}

.alert-caution {{
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #fca5a5;
}}

/* Horizontal Rule */
hr {{
    border: none;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent);
    margin: 32px 0;
}}

/* Strong */
strong {{
    color: #f1f5f9;
    font-weight: 700;
}}

/* Emoji */
em {{
    font-style: italic;
    color: #94a3b8;
}}

/* Print styles */
@media print {{
    body {{
        background: white;
        color: #1e293b;
        font-size: 11px;
    }}

    .container {{
        padding: 20px 30px;
    }}

    .cover {{
        background: none;
        border-bottom: 2px solid #8B5CF6;
    }}

    .cover h1 {{
        -webkit-text-fill-color: #8B5CF6;
        color: #8B5CF6;
    }}

    .cover .subtitle {{
        color: #64748b;
    }}

    h1 {{
        color: #1e293b;
        border-bottom-color: #8B5CF6;
    }}

    h2 {{
        color: #334155;
        border-bottom-color: #c4b5fd;
    }}

    h3 {{
        color: #7c3aed;
    }}

    h4 {{
        color: #7c3aed;
    }}

    p, li, td {{
        color: #475569;
    }}

    code {{
        background: #f1f5f9;
        color: #7c3aed;
        border-color: #e2e8f0;
    }}

    pre {{
        background: #f8fafc;
        border-color: #e2e8f0;
    }}

    pre code {{
        color: #475569;
    }}

    th {{
        color: #7c3aed;
        background: #f5f3ff;
    }}

    .table-wrapper {{
        border-color: #e2e8f0;
    }}

    td {{
        border-bottom-color: #f1f5f9;
    }}

    .alert-important {{
        background: #fffbeb;
        border-color: #f59e0b;
        color: #92400e;
    }}

    .alert-caution {{
        background: #fef2f2;
        border-color: #ef4444;
        color: #991b1b;
    }}

    blockquote {{
        background: #f5f3ff;
        color: #64748b;
    }}

    strong {{
        color: #1e293b;
    }}

    a {{
        color: #7c3aed;
    }}

    .cover .badge {{
        background: #f5f3ff;
        border-color: #c4b5fd;
        color: #7c3aed;
    }}
}}

@page {{
    size: A4;
    margin: 15mm 12mm;
}}
</style>
</head>
<body>
<div class="container">

<!-- Cover Page -->
<div class="cover">
    <div class="badge">Confidential • AI Agent Handoff Document</div>
    <h1 style="font-size: 42px; margin-bottom: 16px;">✦ Findathon</h1>
    <div class="subtitle">Complete Project Analysis & Architecture Document</div>
    <div class="meta">
        <strong>Generated:</strong> August 14, 2026<br>
        <strong>Purpose:</strong> Comprehensive context for AI agent handoff (Claude / ChatGPT / Gemini)<br>
        <strong>Project URL:</strong> <a href="https://findathon.vercel.app">findathon.vercel.app</a><br>
        <strong>Tech Stack:</strong> Next.js 16 • React 19 • Supabase • TypeScript • Leaflet • Tailwind CSS 4<br>
        <strong>Total Files:</strong> ~120+ source files • 20+ database tables • 16 API endpoints<br>
        <strong>Current Phase:</strong> Late Phase 2 / Early Phase 3 (DDD Architecture Refactor)
    </div>
</div>

{body_html}

</div>
</body>
</html>"""


def main():
    print("[1/4] Reading markdown source...")
    with open(MD_SOURCE, 'r', encoding='utf-8') as f:
        md_text = f.read()

    print("[2/4] Converting to HTML...")
    body_html = md_to_html(md_text)

    print("[3/4] Generating styled HTML document...")
    full_html = generate_html(body_html)

    print(f"[4/4] Writing to {OUTPUT_HTML}...")
    with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
        f.write(full_html)

    print(f"\nDone! HTML file created at:\n   {OUTPUT_HTML}")
    print(f"\nTo create PDF:")
    print(f"   1. Open the HTML file in your browser")
    print(f"   2. Press Ctrl+P (Print)")
    print(f"   3. Select 'Save as PDF'")
    print(f"   4. Click Save")

if __name__ == '__main__':
    main()
