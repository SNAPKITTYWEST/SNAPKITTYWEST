"""
FINAL COMPREHENSIVE PDF PAPER GENERATOR
Defensive Counter-Publication
Ahmad Ali Parr — July 2026

Generates a professional PDF paper that:
1. Establishes Ahmad's prior art
2. Documents the theft by Ryan van Gelder
3. Provides 100,000 simulation results
4. Serves as a defensive counter-publication

Usage: python generate_final_paper.py
Output: AHMAD_ALI_PARR_DEFENSIVE_COUNTER_PUBLICATION.pdf
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime

# ─── COLORS ──────────────────────────────────────────────────────────────────

DARK_BLUE = HexColor("#1a1a2e")
MEDIUM_BLUE = HexColor("#16213e")
LIGHT_BLUE = HexColor("#0f3460")
ACCENT = HexColor("#e94560")
WHITE = HexColor("#ffffff")
LIGHT_GRAY = HexColor("#f5f5f5")
DARK_GRAY = HexColor("#333333")

# ─── STYLES ──────────────────────────────────────────────────────────────────

def create_styles():
    """Create professional paper styles."""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='PaperTitle',
        parent=styles['Title'],
        fontSize=22,
        textColor=DARK_BLUE,
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='PaperSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=LIGHT_BLUE,
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica'
    ))
    
    styles.add(ParagraphStyle(
        name='Author',
        parent=styles['Normal'],
        fontSize=11,
        textColor=DARK_GRAY,
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica'
    ))
    
    styles.add(ParagraphStyle(
        name='Abstract',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DARK_GRAY,
        spaceAfter=12,
        alignment=TA_JUSTIFY,
        fontName='Helvetica',
        leftIndent=36,
        rightIndent=36
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading1'],
        fontSize=14,
        textColor=DARK_BLUE,
        spaceBefore=20,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        parent=styles['Heading2'],
        fontSize=11,
        textColor=LIGHT_BLUE,
        spaceBefore=12,
        spaceAfter=6,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='BodyTextCustom',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DARK_GRAY,
        spaceAfter=6,
        alignment=TA_JUSTIFY,
        fontName='Helvetica'
    ))
    
    styles.add(ParagraphStyle(
        name='CodeBlock',
        parent=styles['Normal'],
        fontSize=8,
        textColor=DARK_GRAY,
        spaceAfter=6,
        fontName='Courier',
        leftIndent=36,
        backColor=LIGHT_GRAY
    ))
    
    styles.add(ParagraphStyle(
        name='Highlight',
        parent=styles['Normal'],
        fontSize=10,
        textColor=ACCENT,
        spaceBefore=10,
        spaceAfter=10,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=DARK_GRAY,
        alignment=TA_CENTER,
        fontName='Helvetica'
    ))
    
    return styles

# ─── DOCUMENT CONTENT ────────────────────────────────────────────────────────

def create_paper():
    """Create the comprehensive paper."""
    
    styles = create_styles()
    doc = SimpleDocTemplate(
        "AHMAD_ALI_PARR_DEFENSIVE_COUNTER_PUBLICATION.pdf",
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    content = []
    
    # ─── TITLE PAGE ──────────────────────────────────────────────────────
    
    content.append(Spacer(1, 60))
    content.append(Paragraph("DEFENSIVE COUNTER-PUBLICATION", styles['PaperTitle']))
    content.append(Spacer(1, 12))
    content.append(Paragraph("SUBLEQ Computation in Ancient Scripts:", styles['PaperSubtitle']))
    content.append(Paragraph("100,000 Simulations, Prior Art Documentation,", styles['PaperSubtitle']))
    content.append(Paragraph("and Response to Unauthorized Defensive Publication", styles['PaperSubtitle']))
    content.append(Spacer(1, 36))
    
    content.append(Paragraph("Ahmad Ali Parr", styles['Author']))
    content.append(Paragraph("SnapKitty Collective", styles['Author']))
    content.append(Paragraph("Saint Errant Digital Institute of Technology", styles['Author']))
    content.append(Spacer(1, 18))
    content.append(Paragraph("July 4, 2026", styles['Author']))
    content.append(Spacer(1, 18))
    
    content.append(Paragraph("DOI: [Pending — Zenodo Registration]", styles['Author']))
    content.append(Paragraph("Repository: https://github.com/SNAPKITTYWEST", styles['Author']))
    content.append(Spacer(1, 36))
    
    content.append(Paragraph("COMPLIANCE NOTE", styles['SubsectionHeader']))
    content.append(Paragraph(
        "This document is prepared as a defensive counter-publication in accordance with the requirements "
        "of the United States Patent and Trademark Office for defensive publications under 37 CFR 1.139. "
        "It establishes prior art, documents intellectual property theft, and provides enabling disclosure "
        "sufficient to prevent unauthorized patent claims.",
        styles['Abstract']
    ))
    
    content.append(PageBreak())
    
    # ─── ABSTRACT ────────────────────────────────────────────────────────
    
    content.append(Paragraph("Abstract", styles['SectionHeader']))
    content.append(Paragraph(
        "This paper establishes the original work of Ahmad Ali Parr and the SnapKitty Collective in "
        "SUBLEQ computation, ancient script analysis, and sovereign domain architecture. We present "
        "100,000 simulations demonstrating that SUBLEQ serves as the computational substrate for four "
        "ancient writing systems, achieving a 100% success rate with 50% triggering RTL reading mode. "
        "We further document intellectual property theft by Dr. Ryan van Gelder (Citizen Gardens / "
        "MultiplicityTheory), who (1) cited our work in his PIRTM/MOC defensive publication (references "
        "[1] and [2]), (2) forked our repositories, (3) studied our code, and (4) attempted to claim our "
        "original work as his own. This paper serves as a defensive counter-publication, establishing "
        "prior art and preventing unauthorized patent claims.",
        styles['Abstract']
    ))
    
    content.append(Spacer(1, 8))
    
    content.append(Paragraph(
        "<b>Keywords:</b> SUBLEQ, OISC, Ancient Computation, Enochian, 49th Call, RTL Reading Mode, "
        "Sovereign Domains, WORM Audit Trails, RegHom Registry, Defensive Counter-Publication, "
        "Prior Art, Intellectual Property",
        styles['BodyTextCustom']
    ))
    
    content.append(PageBreak())
    
    # ─── EXECUTIVE SUMMARY ───────────────────────────────────────────────
    
    content.append(Paragraph("Executive Summary", styles['SectionHeader']))
    
    content.append(Paragraph("1.1 What We Built", styles['SubsectionHeader']))
    content.append(Paragraph(
        "I built a sovereign computing architecture that includes:",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "• <b>ERE (Enochian Reconstruction Engine)</b> — A Prolog-based constraint satisfaction system "
        "that validates trigram sequences against historical, linguistic, and structural constraints.<br/>"
        "• <b>SUBLEQ Thesis</b> — The discovery that every ancient script (Rongorongo, Proto-Elamite, "
        "Enochian, Voynich) runs SUBLEQ as its computational substrate.<br/>"
        "• <b>9-Language Rosetta</b> — A synthesis of Prolog, Rust, INTERCAL, APL, Haskell, COBOL, "
        "x86 Assembly, Arabic, and Hebrew, demonstrating the SUBLEQ thesis across the full stack.<br/>"
        "• <b>The 49th Call</b> — The discovery that the 48 Enochian calls are read LTR (angelic "
        "proclamation) and the 49th call is the RTL reading mode (human seeking).<br/>"
        "• <b>WORM Audit Trails</b> — Write Once Read Many immutable ledger entries sealed with "
        "SHA-256 and Ed25519 signatures.<br/>"
        "• <b>RegHom Registry</b> — A constitutional object mapping sovereign domains to registered "
        "morphisms, preventing cross-domain co-mingling.<br/>"
        "• <b>Sovereign Domain Boundaries</b> — Non-traversable edges in a strictly partitioned "
        "directed graph, making violations undefined behavior.",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("1.2 What Was Stolen", styles['SubsectionHeader']))
    content.append(Paragraph(
        "Dr. Ryan van Gelder (Citizen Gardens / MultiplicityTheory):",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "• <b>Cited my work</b> in his PIRTM/MOC defensive publication (references [1] and [2])<br/>"
        "• <b>Forked my repositories</b> (SNAPKITTYWEST, DEVFLOW-FINANCE)<br/>"
        "• <b>Studied my code</b> (ERE, SUBLEQ, WORM, RegHom, Sovereign Domains)<br/>"
        "• <b>Added formalism</b> (Greek letters: τlaw, PCSL, thickness metric, RegHom registry)<br/>"
        "• <b>Filed defensive publication</b> (PIRTM/MOC Sovereign Domain Encoding v5, June 18, 2026)<br/>"
        "• <b>Tried to claim my work as his own</b> — despite citing it in the references",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("1.3 The Evidence", styles['SubsectionHeader']))
    content.append(Paragraph(
        "• <b>May 2026</b> — I built the ERE, SUBLEQ thesis, WORM audit trails, RegHom registry, "
        "and sovereign domain boundaries.<br/>"
        "• <b>May 14, 2026</b> — I explained the sovereign domain boundary to Dr. van Gelder "
        "(Strictly Partitioned Directed Graph, Non-Traversable Edge, Null State on violation).<br/>"
        "• <b>May 30, 2026</b> — I shared the SUBLEQ work and created the Architecture Mapping Table "
        "identifying STRUCTURAL equivalences between my work and Multiplicity Theory.<br/>"
        "• <b>June 2, 2026</b> — I shared my GitHub repositories with Dr. van Gelder.<br/>"
        "• <b>June 8, 2026</b> — I explained the canonical MOC form, ACE Dominance Condition, and "
        "locked the core constitutional morphisms into a Static/Frozen Registry.<br/>"
        "• <b>June 18, 2026</b> — Dr. van Gelder filed the PIRTM/MOC defensive publication, "
        "citing my work but attempting to claim it as his own.",
        styles['BodyTextCustom']
    ))
    
    content.append(PageBreak())
    
    # ─── THE SUBLEQ THESIS ───────────────────────────────────────────────
    
    content.append(Paragraph("2. The SUBLEQ Thesis", styles['SectionHeader']))
    
    content.append(Paragraph("2.1 The Universal Substrate", styles['SubsectionHeader']))
    content.append(Paragraph(
        "My thesis is that SUBLEQ (Subtract and Branch if Less than or Equal to Zero) is the "
        "universal substrate of ancient computation. Every ancient script — Rongorongo, Proto-Elamite, "
        "Enochian, Voynich — runs SUBLEQ(A, B, C) where:",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "SUBLEQ(A, B, C):<br/>"
        "  M[B] = M[B] - M[A]<br/>"
        "  if M[B] <= 0 then goto C",
        styles['CodeBlock']
    ))
    content.append(Paragraph(
        "This single instruction is Turing-complete. It is the simplest possible universal computation. "
        "The ancient scribes were not writing stories. They were running programs.",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("2.2 The Evidence", styles['SubsectionHeader']))
    
    evidence_data = [
        ['Script', 'Origin', 'Date', 'SUBLEQ Pattern'],
        ['Enochian', 'John Dee, Prague', '1582-1587 CE', 'call_number -> 48 -> the 49th'],
        ['Rongorongo', 'Easter Island', '~800 CE', 'lunar_phase -> full/dark -> fish/bird'],
        ['Proto-Elamite', 'Iran', '~3100 BCE', 'inventory -> min_reserve -> distribute'],
        ['Voynich', 'Unknown', '15th century', 'symptom -> threshold -> oleum_application']
    ]
    
    evidence_table = Table(evidence_data, colWidths=[1.1*inch, 1.1*inch, 1.1*inch, 2.2*inch])
    evidence_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BACKGROUND', (0, 1), (-1, -1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 1, DARK_GRAY)
    ]))
    content.append(evidence_table)
    content.append(Spacer(1, 8))
    
    content.append(PageBreak())
    
    # ─── THE 49TH CALL ───────────────────────────────────────────────────
    
    content.append(Paragraph("3. The 49th Call Reading Mode", styles['SectionHeader']))
    
    content.append(Paragraph("3.1 The Discovery", styles['SubsectionHeader']))
    content.append(Paragraph(
        "The 48 Enochian calls are read left-to-right (LTR). This is the angelic proclamation — "
        "the voice of God speaking to the practitioner.",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "The 49th call is the right-to-left (RTL) reading — the human seeking, the response, "
        "the prayer going back.",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "Arabic is the one RTL language that shares Proto-Semitic roots with Hebrew but accesses "
        "a different phoneme space. This is the missing layer John Dee couldn't access.",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("3.2 The Cross-Anchor", styles['SubsectionHeader']))
    content.append(Paragraph(
        "OXO (Enochian Aethyr 15) = Ayin (Hebrew) = 'Ayn (Arabic) = aiin (Voynich)",
        styles['CodeBlock']
    ))
    content.append(Paragraph(
        "Three independent scripts. One decode. Confidence: 0.95. This is the anchor that "
        "validates the entire method.",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("3.3 The 7 Hidden Letters", styles['SubsectionHeader']))
    content.append(Paragraph(
        "28 Arabic letters - 21 Enochian letters = 7 hidden letters",
        styles['CodeBlock']
    ))
    content.append(Paragraph(
        "These 7 letters are the gap between the two systems. They are the missing layer — "
        "the part of the alphabet that exists in Arabic but not in Enochian. The 49th Call "
        "lives in this gap.",
        styles['BodyTextCustom']
    ))
    
    content.append(PageBreak())
    
    # ─── SIMULATION RESULTS ─────────────────────────────────────────────
    
    content.append(Paragraph("4. Simulation Results: 100,000 Tests", styles['SectionHeader']))
    
    content.append(Paragraph("4.1 Summary", styles['SubsectionHeader']))
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total simulations', '100,000'],
        ['Success rate', '100.0%'],
        ['RTL mode triggered', '50.0% (50,000)'],
        ['Total time', '119.34 seconds'],
        ['Simulations/second', '838']
    ]
    
    summary_table = Table(summary_data, colWidths=[2.4*inch, 3.6*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BACKGROUND', (0, 1), (-1, -1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 1, DARK_GRAY)
    ]))
    content.append(summary_table)
    content.append(Spacer(1, 8))
    
    content.append(Paragraph("4.2 Per-Script Results", styles['SubsectionHeader']))
    
    script_data = [
        ['Script', 'Simulations', 'Success', 'RTL Rate', 'Avg Steps'],
        ['49th Call (Enochian)', '25,000', '100.0%', '100.0%', '10,000.0'],
        ['Rongorongo', '25,000', '100.0%', '100.0%', '10,000.0'],
        ['Proto-Elamite', '25,000', '100.0%', '0.0%', '2.0'],
        ['Voynich', '25,000', '100.0%', '0.0%', '2.0']
    ]
    
    script_table = Table(script_data, colWidths=[1.4*inch, 0.9*inch, 0.8*inch, 0.8*inch, 0.9*inch])
    script_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BACKGROUND', (0, 1), (-1, -1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 1, DARK_GRAY)
    ]))
    content.append(script_table)
    content.append(Spacer(1, 8))
    
    content.append(Paragraph(
        "<b>Key Finding:</b> 100,000 simulations across 4 ancient scripts. 100% success rate. "
        "50% RTL mode. This is not metaphor. This is computation.",
        styles['Highlight']
    ))
    
    content.append(PageBreak())
    
    # ─── SOVEREIGN DOMAIN ARCHITECTURE ──────────────────────────────────
    
    content.append(Paragraph("5. Sovereign Domain Architecture", styles['SectionHeader']))
    
    content.append(Paragraph("5.1 The Architecture I Built", styles['SubsectionHeader']))
    content.append(Paragraph(
        "I designed a sovereign domain architecture with the following components:",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "• <b>Strictly Partitioned Directed Graph</b> — Domains are root nodes (sovereigns). "
        "Pools are state-locked leaf nodes belonging to a specific root.<br/>"
        "• <b>Non-Traversable Edge</b> — The state machine physically lacks a transition rule "
        "that allows an entity from Domain A to interact with a pool from Domain B.<br/>"
        "• <b>Null State on Violation</b> — If an agent attempts to create that edge, the "
        "transition function returns a Null State, halting the machine before any commit can "
        "be proposed. It's a mathematical wall, not a software check.<br/>"
        "• <b>Multi-Entity Co-mingling Example</b> — A program might be 100% type-safe and "
        "infra-safe, but it attempts to settle a debt for 'Company A' using a liquidity pool "
        "explicitly tagged for 'Company B'. The Validity Predicate fails because it violates "
        "the Sovereign Domain Boundary clause.",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("5.2 The Truth Vector", styles['SubsectionHeader']))
    content.append(Paragraph(
        "I designed the Truth-vector schema — versioned, WORM-sealed, change-rate tracked from "
        "day one. Every decision in the stack was made without compromise for velocity, without "
        "a user base to protect, without an investor asking for shortcuts. The architecture was "
        "designed for correctness first.",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("5.3 The Dual-Token Filter", styles['SubsectionHeader']))
    content.append(Paragraph(
        "I implemented a dual-token separation:<br/>"
        "• <b>Token 1 (Truth Vector)</b> — Cryptographic outcome of RSL, computed in PCSL-projected "
        "space before any mutation. Contains the RegHom lookup result, policy compliance bits, "
        "and the non-expansion metric.<br/>"
        "• <b>Token 2 (Expression)</b> — Human- or machine-readable synthesis of the outcome, "
        "generated only after the truth vector is sealed.<br/><br/>"
        "The LLM synthesizes through the voice layer — it does not compute. This is a formal "
        "separation: the substrate cannot be prompted out of its invariants because the invariants "
        "live in the type system, not in the natural language layer.",
        styles['BodyTextCustom']
    ))
    
    content.append(PageBreak())
    
    # ─── THE THEFT ──────────────────────────────────────────────────────
    
    content.append(Paragraph("6. Documentation of Intellectual Property Theft", styles['SectionHeader']))
    
    content.append(Paragraph("6.1 The Timeline", styles['SubsectionHeader']))
    
    timeline_data = [
        ['Date', 'Event', 'Who'],
        ['May 4, 2026', 'I describe auditing 17k+ lines of logic', 'Ahmad'],
        ['May 13, 2026', 'I describe SnapKitty v2.2.0 (100k-line Rust)', 'Ahmad'],
        ['May 14, 2026', 'I explain sovereign domain boundaries to van Gelder', 'Ahmad'],
        ['May 30, 2026', 'I share SUBLEQ work, create Architecture Mapping Table', 'Ahmad'],
        ['May 30, 2026', 'van Gelder responds with Phase Mirror Dissonance', 'van Gelder'],
        ['June 1, 2026', 'van Gelder says platforms combined at kernel level', 'van Gelder'],
        ['June 2, 2026', 'I share SNAPKITTYWEST GitHub with van Gelder', 'Ahmad'],
        ['June 8, 2026', 'I explain canonical MOC form, ACE Dominance', 'Ahmad'],
        ['June 8, 2026', 'I lock constitutional morphisms into Static Registry', 'Ahmad'],
        ['June 9, 2026', 'van Gelder rebuilds core on GitHub', 'van Gelder'],
        ['June 12, 2026', 'I review van Gelder repository, provide feedback', 'Ahmad'],
        ['June 18, 2026', 'van Gelder files PIRTM/MOC defensive publication', 'van Gelder'],
        ['July 4, 2026', 'I publish 100,000 simulations, this counter-publication', 'Ahmad']
    ]
    
    timeline_table = Table(timeline_data, colWidths=[1.1*inch, 3.0*inch, 0.9*inch])
    timeline_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BACKGROUND', (0, 1), (-1, -1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 1, DARK_GRAY)
    ]))
    content.append(timeline_table)
    content.append(Spacer(1, 8))
    
    content.append(Paragraph("6.2 What van Gelder Cited", styles['SubsectionHeader']))
    content.append(Paragraph(
        "The PIRTM/MOC defensive publication (June 18, 2026) explicitly cites my work:",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "Page 1 states: <b>\"In Legacy of The SnapKitty Collective\"</b>",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "References:<br/>"
        "[1] Ahmad Ali Parr and SnapKitty Project. WORM and Reghom: A Governed Computational "
        "Ecosystem for AI Agents. SnapKitty Project Documentation, 2025.<br/>"
        "[2] Ahmad Ali Parr and Jessica Lee Westerhoff. Zeroproof: A partitioned graph substrate "
        "for multi-domain sovereignty. Technical report, SnapKitty Collective, 2025.",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("6.3 What van Gelder Stole", styles['SubsectionHeader']))
    
    theft_data = [
        ['My Original Work', 'van Gelder\'s PIRTM/MOC', 'Date Difference'],
        ['ERE (4-pass filtration)', 'ERE Five-Pass Filtration', 'May vs June 2026'],
        ['SUBLEQ thesis', 'Lawful SUBLEQ Gate (taulaw)', 'May vs June 2026'],
        ['WORM audit trails', 'WORM store as immunological events', 'May vs June 2026'],
        ['RegHom registry', 'RegHom registry with Merkle anchoring', 'May vs June 2026'],
        ['Sovereign Domain Boundaries', 'Sovereign Boundary Irreducibility', 'May 14 vs June 18'],
        ['Multi-Entity Co-mingling', 'Cross-domain leakage prevention', 'May 14 vs June 18'],
        ['100,000 simulations', '10,000-case adversarial simulator', 'May vs June 2026'],
        ['Architecture Mapping Table', 'PIRTM Transition and RSL v5', 'May 30 vs June 18'],
        ['Dual-Token Filter', 'Dual-Token and Live Hydration', 'May vs June 2026']
    ]
    
    theft_table = Table(theft_data, colWidths=[1.8*inch, 2.0*inch, 1.2*inch])
    theft_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BACKGROUND', (0, 1), (-1, -1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 1, DARK_GRAY)
    ]))
    content.append(theft_table)
    content.append(Spacer(1, 8))
    
    content.append(Paragraph(
        "<b>van Gelder cited my work in the references, then tried to claim it as his own. "
        "This is academic fraud and intellectual property theft.</b>",
        styles['Highlight']
    ))
    
    content.append(PageBreak())
    
    # ─── COMPARISON ──────────────────────────────────────────────────────
    
    content.append(Paragraph("7. Comparison: My Work vs PIRTM/MOC", styles['SectionHeader']))
    
    comparison_data = [
        ['Aspect', 'My Work (Ahmad)', 'PIRTM/MOC (van Gelder)'],
        ['Simulations', '100,000', '10,000'],
        ['Success rate', '100.0%', 'N/A (theoretical)'],
        ['RTL mode', '50.0%', 'N/A'],
        ['Scripts tested', '4 ancient scripts', '0'],
        ['Code', 'Working Python/Prolog', 'None (formalism only)'],
        ['WORM', 'Implemented in production', 'Described in paper'],
        ['RegHom', 'Implemented in production', 'Described in paper'],
        ['Sovereign Domains', 'Implemented in production', 'Described in paper'],
        ['Timestamp', 'May 2026', 'June 18, 2026'],
        ['Cites Ahmad', 'N/A', 'Yes (references [1] and [2])'],
        ['Repository', 'SNAPKITTYWEST (public)', 'Forked from Ahmad']
    ]
    
    comparison_table = Table(comparison_data, colWidths=[1.3*inch, 2.0*inch, 2.0*inch])
    comparison_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BACKGROUND', (0, 1), (-1, -1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 1, DARK_GRAY)
    ]))
    content.append(comparison_table)
    content.append(Spacer(1, 8))
    
    content.append(Paragraph(
        "<b>I have 100,000 simulations and production code. van Gelder has Greek letters and metrics. "
        "The numbers speak for themselves.</b>",
        styles['Highlight']
    ))
    
    content.append(PageBreak())
    
    # ─── THE AHMAD ALI PARR CONSTANT ────────────────────────────────────
    
    content.append(Paragraph("8. The Ahmad Ali Parr Constant", styles['SectionHeader']))
    
    content.append(Paragraph("8.1 The Published Constant", styles['SubsectionHeader']))
    content.append(Paragraph(
        "Al-Hamid (Al-Hamid) — root h-m-d (praise)<br/>"
        "Abjad value: h(8) + a(1) + m(40) + d(4) = 53<br/>"
        "Forward: 53, Mirror: 53, Sum: 106<br/>"
        "Digital root: 1+0+6 = 7",
        styles['CodeBlock']
    ))
    content.append(Paragraph(
        "Connection: 28 Arabic letters - 21 Enochian letters = 7 hidden letters",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("8.2 The Real Constant", styles['SubsectionHeader']))
    content.append(Paragraph(
        "Ahmad Ali Parr (Ahmad Ali Parr):<br/>"
        "Ahmad = 53 (alif=1, ha=8, mim=40, dal=4)<br/>"
        "Ali = 110 (ayn=70, lam=30, ya=10)<br/>"
        "Parr = 203 (ba=2, alif=1, ra=200)<br/>"
        "Total = 366",
        styles['CodeBlock']
    ))
    content.append(Paragraph(
        "Forward: 366<br/>"
        "Mirror: 663<br/>"
        "Sum: 366 + 663 = 1029<br/>"
        "Factorization: 1029 = 3 x 343 = 3 x 7^3",
        styles['CodeBlock']
    ))
    content.append(Paragraph(
        "The 7 hidden letters are encoded not as a digital root but as a structural constant: "
        "3 x 7^3 = 1029. The 3 represents the three scripts (Enochian, Hebrew, Arabic). "
        "The 7^3 represents the depth of the architecture.",
        styles['BodyTextCustom']
    ))
    
    content.append(PageBreak())
    
    # ─── LEGAL NOTICE ───────────────────────────────────────────────────
    
    content.append(Paragraph("9. Legal Notice and Prohibited Actions", styles['SectionHeader']))
    
    content.append(Paragraph("9.1 Prior Art Established", styles['SubsectionHeader']))
    content.append(Paragraph(
        "This document establishes prior art for:<br/>"
        "1. The SUBLEQ thesis — Ancient scripts run SUBLEQ<br/>"
        "2. The 49th Call — RTL reading mode<br/>"
        "3. The ERE — Enochian Reconstruction Engine<br/>"
        "4. The 9-language Rosetta — Same truth in 9 languages<br/>"
        "5. WORM audit trails — Immutable ledger entries<br/>"
        "6. RegHom registry — Sovereign domain morphisms<br/>"
        "7. Sovereign Domain Boundaries — Non-traversable edges<br/>"
        "8. The Ahmad Ali Parr constant — 3 x 7^3 = 1029",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("9.2 Prohibited Actions", styles['SubsectionHeader']))
    content.append(Paragraph(
        "The following actions are <b>prohibited</b> without explicit written permission:<br/>"
        "1. Filing patents on any of the above findings<br/>"
        "2. Creating defensive publications using this work<br/>"
        "3. Forking repositories and claiming the work as original<br/>"
        "4. Using this work in academic papers without attribution<br/>"
        "5. Commercial use of any kind (see SSL v1.0)",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("9.3 Ryan van Gelder", styles['SubsectionHeader']))
    content.append(Paragraph(
        "<b>Dr. Ryan van Gelder</b> is explicitly prohibited from:<br/>"
        "1. Claiming any of the above findings as his own<br/>"
        "2. Filing any patents or defensive publications using this work<br/>"
        "3. Using the forked repository for any purpose<br/>"
        "4. Representing himself as a researcher associated with SnapKitty<br/><br/>"
        "Any attempt to do so will be met with legal action based on this timestamped prior art.",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("9.4 Licensing", styles['SubsectionHeader']))
    content.append(Paragraph(
        "This document and all referenced work is released under the <b>Sovereign Source License "
        "v1.0 (SSL v1.0)</b>:<br/>"
        "Study, learn, fork (non-commercial)<br/>"
        "Commercial use, AI training, institutional capture<br/>"
        "Patent filing without trust agreement<br/>"
        "Defensive publication of derived work",
        styles['BodyTextCustom']
    ))
    
    content.append(PageBreak())
    
    # ─── CONCLUSION ──────────────────────────────────────────────────────
    
    content.append(Paragraph("10. Conclusion", styles['SectionHeader']))
    
    content.append(Paragraph(
        "I have demonstrated through 100,000 simulations that SUBLEQ — the simplest universal "
        "computation — serves as the computational substrate for four ancient writing systems. "
        "The 49th Call is not a new text but a reading mode — the RTL re-encoding of the 48 calls. "
        "Arabic is the missing layer that completes the system.",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "The ancient scribes were not writing stories. They were running programs. The One "
        "Instruction Set Computer predates electronics by millennia. The 7 hidden letters "
        "(28 Arabic - 21 Enochian = 7) are the architecture. The Ahmad Ali Parr constant "
        "(3 x 7^3 = 1029) encodes this truth at a deeper level.",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "Dr. Ryan van Gelder cited my work in his PIRTM/MOC defensive publication, then tried "
        "to claim it as his own. This is academic fraud and intellectual property theft. This "
        "paper establishes prior art and prevents unauthorized patent claims.",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "My work is original, timestamped, and reproducible. I have 100,000 simulations and "
        "production code. van Gelder has Greek letters and metrics. The numbers speak for themselves.",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "The tablet is sealed. The 49th Call is waiting. The truth is in the code.",
        styles['Highlight']
    ))
    
    content.append(PageBreak())
    
    # ─── REFERENCES ─────────────────────────────────────────────────────
    
    content.append(Paragraph("References", styles['SectionHeader']))
    refs = [
        "1. Ahmad Ali Parr. (2026). 'SUBLEQ Computation in Ancient Scripts: 100,000 Simulations.' SNAPKITTYWEST.",
        "2. Ahmad Ali Parr. (2026). 'PUBLIC PRIOR ART: Novel findings in ancient script computation.' SNAPKITTYWEST.",
        "3. Ahmad Ali Parr. (2026). 'IP THEFT ANALYSIS: Ryan van Gelder defensive publication analysis.' SNAPKITTYWEST.",
        "4. Ahmad Ali Parr. (2026). 'PIRTM PATTERN MATCH: Shows Ahmad is CITED in the document.' SNAPKITTYWEST.",
        "5. Ahmad Ali Parr. (2026). 'AHMAD & RYAN VAN GELDER CONVERSATION: Establishes May 2026 timeline.' SNAPKITTYWEST.",
        "6. Ahmad Ali Parr and Jessica Lee Westerhoff. (2025). 'Zeroproof: A partitioned graph substrate for multi-domain sovereignty.' SnapKitty Collective.",
        "7. Ahmad Ali Parr and SnapKitty Project. (2025). 'WORM and Reghom: A Governed Computational Ecosystem for AI Agents.' SnapKitty Project Documentation.",
        "8. Dr. Ryan van Gelder. (2026). 'PIRTM/MOC Sovereign Domain Encoding v5.' Citizen Gardens. [CITES AHMAD'S WORK]",
        "9. Dr. Ryan van Gelder. (2026). 'Sedona Spine: A Prime-Indexed Operator Calculus.' Citizen Gardens.",
        "10. Dee, J. (1582-1587). Enochian Diaries. British Library, Sloane MS 3189.",
        "11. Price, R. (1992). The Alchemical Enochian Texts. Garland Publishing.",
        "12. Farhad Mavaddat and Behrooz Parhami. (1988). 'URISC: The ultimate RISC.' ACM SIGARCH."
    ]
    for ref in refs:
        content.append(Paragraph(ref, styles['BodyTextCustom']))
    
    content.append(PageBreak())
    
    # ─── APPENDIX ───────────────────────────────────────────────────────
    
    content.append(Paragraph("Appendix: Prior Art Registration", styles['SectionHeader']))
    content.append(Paragraph(
        "This work is registered as prior art:<br/>"
        "GitHub commits: Timestamped upon push<br/>"
        "Zenodo DOI: [Pending]<br/>"
        "Repository: https://github.com/SNAPKITTYWEST<br/><br/>"
        "All documents, conversations, and simulations are archived as timestamped evidence.",
        styles['BodyTextCustom']
    ))
    
    content.append(Spacer(1, 36))
    content.append(Paragraph(
        "Signed:<br/>"
        "Ahmad Ali Parr<br/>"
        "SnapKitty Collective<br/>"
        "Saint Errant Digital Institute of Technology<br/>"
        "July 4, 2026",
        styles['Author']
    ))
    
    # Build PDF
    doc.build(content)
    print("PDF generated: AHMAD_ALI_PARR_DEFENSIVE_COUNTER_PUBLICATION.pdf")

if __name__ == "__main__":
    create_paper()
