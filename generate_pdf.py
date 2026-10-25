import os
import re

def build_pdf():
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Preformatted, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    
    pdf_path = "RHEO_INTERVIEW_COMPREHENSIVE_GUIDE.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        alignment=1,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        alignment=1,
        spaceAfter=12
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1d4ed8'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14.5,
        textColor=colors.HexColor('#0f172a'),
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
        spaceAfter=4
    )
    
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#334155'),
        leftIndent=12,
        spaceAfter=2.5
    )
    
    quote_style = ParagraphStyle(
        'Quote_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#1e293b'),
        leftIndent=15,
        borderPadding=4,
        spaceBefore=3,
        spaceAfter=5
    )
    
    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f8fafc'),
        borderPadding=5,
        spaceBefore=3,
        spaceAfter=5
    )

    def clean_md_inline(text):
        # Escape XML entities first
        text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        # Bold: **text**
        text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
        # Italic: *text*
        text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
        # Inline code: `text`
        text = re.sub(r'`(.*?)`', r"<font face='Courier' color='#0f172a'>\1</font>", text)
        return text

    story = []
    
    with open("RHEO_INTERVIEW_COMPREHENSIVE_GUIDE.md", "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    in_code_block = False
    code_lines = []
    
    for line in lines:
        raw = line.rstrip('\r\n')
        stripped = raw.strip()
        
        if stripped.startswith("```"):
            if in_code_block:
                code_text = "\n".join(code_lines)
                story.append(Preformatted(code_text, code_style))
                code_lines = []
                in_code_block = False
            else:
                in_code_block = True
            continue
            
        if in_code_block:
            code_lines.append(raw)
            continue
            
        if not stripped:
            story.append(Spacer(1, 3))
            continue
            
        if stripped.startswith("# RHEO —"):
            story.append(Paragraph(clean_md_inline(stripped.replace("# ", "")), title_style))
        elif stripped.startswith("**Real-Time") or stripped.startswith("*Author:"):
            story.append(Paragraph(clean_md_inline(stripped.replace("**", "").replace("*", "")), subtitle_style))
        elif stripped.startswith("## "):
            story.append(Paragraph(clean_md_inline(stripped.replace("## ", "")), h1_style))
        elif stripped.startswith("### "):
            story.append(Paragraph(clean_md_inline(stripped.replace("### ", "")), h2_style))
        elif stripped.startswith("- ") or stripped.startswith("* "):
            content = clean_md_inline(stripped[2:])
            story.append(Paragraph(f"&bull; {content}", bullet_style))
        elif re.match(r'^\d+\.\s', stripped):
            content = clean_md_inline(re.sub(r'^\d+\.\s', '', stripped))
            num = stripped.split('.')[0]
            story.append(Paragraph(f"<b>{num}.</b> {content}", bullet_style))
        elif stripped.startswith("> "):
            content = clean_md_inline(stripped[2:])
            story.append(Paragraph(f"{content}", quote_style))
        elif stripped == "---":
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceBefore=6, spaceAfter=6))
        else:
            story.append(Paragraph(clean_md_inline(stripped), body_style))
            
    doc.build(story)
    print(f"Successfully generated PDF: {pdf_path}")

if __name__ == "__main__":
    build_pdf()
