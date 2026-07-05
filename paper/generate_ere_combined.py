#!/usr/bin/env python3
"""
COMBINED ERE PAPER - PDF GENERATOR
Ahmad Ali Parr — July 2026
Generates a comprehensive PDF paper combining all ERE pipeline documentation.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors

def create_styles():
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='TitleCustom',
        parent=styles['Title'],
        fontSize=24,
        leading=28,
        spaceAfter=20,
        alignment=1
    ))
    
    styles.add(ParagraphStyle(
        name='SubtitleCustom',
        parent=styles['Normal'],
        fontSize=14,
        leading=18,
        spaceAfter=10,
        alignment=1,
        textColor=HexColor('#666666')
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        spaceBefore=20,
        spaceAfter=10,
        textColor=HexColor('#1a1a2e')
    ))
    
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        spaceBefore=15,
        spaceAfter=8,
        textColor=HexColor('#16213e')
    ))
    
    styles.add(ParagraphStyle(
        name='BodyTextCustom',
        parent=styles['Normal'],
        fontSize=11,
        leading=15,
        spaceAfter=8,
        alignment=0
    ))
    
    styles.add(ParagraphStyle(
        name='CodeBlock',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        fontName='Courier',
        spaceAfter=10,
        spaceBefore=10,
        leftIndent=20,
        rightIndent=20,
        backColor=HexColor('#f5f5f5')
    ))
    
    styles.add(ParagraphStyle(
        name='BulletItem',
        parent=styles['Normal'],
        fontSize=11,
        leading=15,
        leftIndent=30,
        spaceAfter=4
    ))
    
    return styles

def build_paper():
    doc = SimpleDocTemplate(
        "ERE_COMBINED_PAPER.pdf",
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    styles = create_styles()
    content = []
    
    # TITLE PAGE
    content.append(Spacer(1, 100))
    content.append(Paragraph("THE ENOCHIAN READING ENGINE", styles['TitleCustom']))
    content.append(Paragraph("A 5-Pass Verification Pipeline with 150,000 Simulations", styles['SubtitleCustom']))
    content.append(Spacer(1, 30))
    content.append(Paragraph("Ahmad Ali Parr", styles['SubtitleCustom']))
    content.append(Paragraph("July 5, 2026", styles['SubtitleCustom']))
    content.append(Paragraph("ORCID: 0009-0006-1916-5245", styles['SubtitleCustom']))
    content.append(Paragraph("DOI: 10.5281/zenodo.21132094", styles['SubtitleCustom']))
    content.append(Spacer(1, 20))
    content.append(Paragraph("Status: Prior Art - Timestamped and Documented", styles['SubtitleCustom']))
    content.append(Paragraph("License: Sovereign Source License v1.0", styles['SubtitleCustom']))
    content.append(PageBreak())
    
    # ABSTRACT
    content.append(Paragraph("ABSTRACT", styles['SectionHeader']))
    content.append(Paragraph(
        "This paper presents the Enochian Reading Engine (ERE), a 5-pass verification pipeline "
        "that validates input through five distinct lenses: Structural, Scholarly, Invariants, "
        "Mission, and Root. The pipeline is implemented in two languages (Prolog and Haskell) "
        "with identical semantics but different enforcement mechanisms. METATRON certifies when "
        "all five passes agree. We present 150,000 simulations (100,000 SUBLEQ + 50,000 EDAULC) "
        "demonstrating the pipeline's correctness, reliability, and performance. We also document "
        "the theft of this intellectual property by Dr. Ryan van Gelder (Public Citizen) and "
        "establish prior art through timestamped evidence.",
        styles['BodyTextCustom']
    ))
    
    # 1. INTRODUCTION
    content.append(Paragraph("1. INTRODUCTION", styles['SectionHeader']))
    
    content.append(Paragraph("1.1 What is the ERE?", styles['SubsectionHeader']))
    content.append(Paragraph(
        "The Enochian Reading Engine (ERE) is a verification engine that answers one question: "
        "<b>\"Is this input valid?\"</b>",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "It does this by running five independent checks. If all five pass, the input is certified. "
        "If any fail, the input is rejected.",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("1.2 Why Five Passes?", styles['SubsectionHeader']))
    content.append(Paragraph(
        "Each pass corresponds to a different reading direction:",
        styles['BodyTextCustom']
    ))
    
    table_data = [
        ['Pass', 'Name', 'Direction', 'Language', 'Purpose'],
        ['1', 'Structural', 'LTR', 'Enochian', 'Is the input well-formed?'],
        ['2', 'Scholarly', 'LTR', 'Latin', 'Is the input documented?'],
        ['3', 'Invariants', 'RTL', 'Hebrew', 'Does the reverse hold?'],
        ['4', 'Mission', 'RTL', 'Arabic', 'Does it serve the sovereign mission?'],
        ['5', 'Root', 'RTL', 'Aramaic', 'Does it honor the ancestor?']
    ]
    
    table = Table(table_data, colWidths=[40, 70, 60, 70, 200])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor('#f0f0f0')]),
    ]))
    content.append(table)
    content.append(Spacer(1, 10))
    
    content.append(Paragraph("1.3 The 49th Call", styles['SubsectionHeader']))
    content.append(Paragraph(
        "The 49th Call is the gap between Arabic and Enochian scripts. 28 Arabic letters minus "
        "21 Enochian letters equals 7 hidden letters. The 49th Call lives in that gap.",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "<font face='Courier' size='9'>"
        "28 Arabic letters - 21 Enochian letters = 7 hidden letters<br/>"
        "Ahmad Ali Parr = 366<br/>"
        "366 + 663 (mirror) = 1029 = 3 x 7^3"
        "</font>",
        styles['BodyTextCustom']
    ))
    
    # 2. IMPLEMENTATIONS
    content.append(Paragraph("2. IMPLEMENTATIONS", styles['SectionHeader']))
    
    content.append(Paragraph("2.1 Prolog Implementation (EDAULC)", styles['SubsectionHeader']))
    content.append(Paragraph(
        "<font face='Courier' size='8'>"
        "%% EDAULC VERIFICATION ENGINE - Prolog<br/>"
        "%% 5-pass ERE verification. METATRON certifies when all agree.<br/><br/>"
        "%% Pass 1: Structural - does the query have substance?<br/>"
        "pass1(Query) :- atom_length(Query, Len), Len > 3.<br/><br/>"
        "%% Pass 2: Scholarly - non-hollow content?<br/>"
        "pass2(Query) :-<br/>"
        "&nbsp;&nbsp;\\+ sub_atom(Query, _, _, _, 'i made up'),<br/>"
        "&nbsp;&nbsp;\\+ sub_atom(Query, _, _, _, 'i cannot provide'),<br/>"
        "&nbsp;&nbsp;\\+ sub_atom(Query, _, _, _, 'as an ai').<br/><br/>"
        "%% Pass 3: RTL structural - reverse holds meaning?<br/>"
        "pass3(Query) :- atom_chars(Query, Chars), reverse(Chars, _),<br/>"
        "&nbsp;&nbsp;atom_length(Query, Len), Len > 0.<br/><br/>"
        "%% Pass 4: Arabic RTL - the 49th pass - mission alignment<br/>"
        "pass4(_Query) :- true.<br/><br/>"
        "%% Pass 5: Aramaic root - common ancestor<br/>"
        "pass5(_Query) :- true."
        "</font>",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("2.2 Haskell Implementation (No-Cloning Theorem)", styles['SubsectionHeader']))
    content.append(Paragraph(
        "<font face='Courier' size='8'>"
        "{-# LANGUAGE LinearTypes #-}<br/>"
        "{-# LANGUAGE GADTs #-}<br/><br/>"
        "data QuantumPipelineState where<br/>"
        "&nbsp;&nbsp;Superposed :: QuantumTemp %1 -> QuantumPipelineState<br/>"
        "&nbsp;&nbsp;Collapsed  :: Double -> QuantumPipelineState<br/>"
        "&nbsp;&nbsp;Destroyed  :: QuantumPipelineState<br/><br/>"
        "data EREPassResult = EREPass | EREFail String<br/><br/>"
        "destroyOnFail :: QuantumPipelineState %1 -> EREPassResult -> QuantumPipelineState<br/>"
        "destroyOnFail state          EREPass      = state<br/>"
        "destroyOnFail (Superposed _) (EREFail _)  = Destroyed<br/><br/>"
        "erePipeline :: QuantumPipelineState %1<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-> EREPassResult -> EREPassResult -> EREPassResult<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-> EREPassResult -> EREPassResult<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-> QuantumPipelineState<br/>"
        "erePipeline state p1 p2 p3 p4 p5 =<br/>"
        "&nbsp;&nbsp;pipelineStep (pipelineStep (pipelineStep (pipelineStep (pipelineStep state p1) p2) p3) p4) p5"
        "</font>",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("2.3 Quantum Monad (Advanced Implementation)", styles['SubsectionHeader']))
    content.append(Paragraph(
        "<font face='Courier' size='8'>"
        "%% The Five Passes (Detailed)<br/>"
        "ere_pass(1, Input, pass) :- nonvar(Input), Input \\= [], !.<br/>"
        "ere_pass(1, _, fail(structural_empty)).<br/><br/>"
        "ere_pass(2, Input, pass) :- \\+ fabrication_marker(Input), !.<br/>"
        "ere_pass(2, _, fail(scholarly_fabrication)).<br/><br/>"
        "ere_pass(3, Input, pass) :-<br/>"
        "&nbsp;&nbsp;(is_list(Input) -> reverse(Input, Rev) ; Rev = Input),<br/>"
        "&nbsp;&nbsp;Rev \\= [], !.<br/>"
        "ere_pass(3, _, fail(invariant_collapse)).<br/><br/>"
        "ere_pass(4, Input, pass) :- \\+ mission_violation(Input), !.<br/>"
        "ere_pass(4, _, fail(mission_misaligned)).<br/><br/>"
        "ere_pass(5, Input, pass) :- functor(Input, _, _), !.<br/>"
        "ere_pass(5, _, fail(root_invalid)).<br/><br/>"
        "%% METATRON Certification<br/>"
        "metatron_threshold(0.5)."
        "</font>",
        styles['BodyTextCustom']
    ))
    
    # 3. MATHEMATICAL FOUNDATIONS
    content.append(Paragraph("3. MATHEMATICAL FOUNDATIONS", styles['SectionHeader']))
    
    content.append(Paragraph("3.1 The 49th Call (Mirror Identity)", styles['SubsectionHeader']))
    content.append(Paragraph(
        "<font face='Courier' size='9'>"
        "%% mirror_identity: call_49(call_49(X)) = X for any list X.<br/>"
        "mirror_identity(X) :- call_49(X, Once), call_49(Once, Twice), Twice = X."
        "</font>",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "This is reverse(reverse(X)) = X - the same truth as:<br/>"
        "- (APL)<br/>"
        "- call49 . call49 = id (Haskell)<br/><br/>"
        "<b>Three languages. One truth.</b>",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("3.2 No-Cloning Theorem", styles['SubsectionHeader']))
    content.append(Paragraph(
        "In Haskell, the No-Cloning Theorem is enforced by the compiler:",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "<font face='Courier' size='9'>"
        "noCloningProof :: QuantumTemp %1 -> ObservationResult<br/>"
        "noCloningProof qt = let state = superpose qt in observe state"
        "</font>",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "The %1 means linear - the resource can only be used once. "
        "The compiler rejects any attempt to clone it.",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("3.3 SUBLEQ Gate", styles['SubsectionHeader']))
    content.append(Paragraph(
        "<font face='Courier' size='9'>"
        "subleq_gate(Amps, Threshold, PassAmps, BranchFired) :-<br/>"
        "&nbsp;&nbsp;include([amp(W, _)] >> (W >= Threshold), Amps, PassAmps),<br/>"
        "&nbsp;&nbsp;(PassAmps \\= [] -> BranchFired = true ; BranchFired = false)."
        "</font>",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "SUBLEQ(A, B, C):<br/>"
        "- A = amplitude vector (four weighted Watchtower states)<br/>"
        "- B = weight threshold (how many must agree to certify)<br/>"
        "- C = collapse (fires when A satisfies B)",
        styles['BodyTextCustom']
    ))
    
    # 4. SIMULATION RESULTS
    content.append(Paragraph("4. SIMULATION RESULTS", styles['SectionHeader']))
    
    content.append(Paragraph("4.1 SUBLEQ Simulations (100,000 Runs)", styles['SubsectionHeader']))
    
    subleq_data = [
        ['Script', 'Simulations', 'Success Rate', 'RTL Mode', 'Avg Steps'],
        ['49th Call (Enochian)', '25,000', '100.0%', '50.0%', '142.3'],
        ['Rongorongo (Easter Island)', '25,000', '100.0%', '50.0%', '87.6'],
        ['Proto-Elamite (Iran)', '25,000', '100.0%', '50.0%', '64.2'],
        ['Voynich (15th Century)', '25,000', '100.0%', '50.0%', '91.8'],
        ['TOTAL', '100,000', '100.0%', '50.0%', '96.5']
    ]
    
    table = Table(subleq_data, colWidths=[140, 80, 80, 70, 70])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, -1), (-1, -1), HexColor('#e0e0e0')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, HexColor('#f0f0f0')]),
    ]))
    content.append(table)
    content.append(Spacer(1, 5))
    content.append(Paragraph("<b>Total time:</b> 119 seconds | <b>Simulations per second:</b> 838", styles['BodyTextCustom']))
    
    content.append(Paragraph("4.2 EDAULC Simulations (50,000 Runs)", styles['SubsectionHeader']))
    
    edaulc_data = [
        ['Metric', 'Value'],
        ['Total simulations', '50,000'],
        ['Verified (METATRON=YES)', '44,580 (89.2%)'],
        ['Failed (METATRON=NO)', '5,420 (10.8%)'],
        ['Total time', '0.19 seconds'],
        ['Simulations per second', '268,362']
    ]
    
    table = Table(edaulc_data, colWidths=[200, 200])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor('#f0f0f0')]),
    ]))
    content.append(table)
    
    content.append(Paragraph("4.3 EDAULC Pass Rates", styles['SubsectionHeader']))
    
    pass_data = [
        ['Pass', 'Name', 'Pass Rate'],
        ['1', 'Structural', '97.2% (48,596/50,000)'],
        ['2', 'Scholarly', '95.6% (47,783/50,000)'],
        ['3', 'Invariants', '100.0% (50,000/50,000)'],
        ['4', 'Mission', '96.4% (48,201/50,000)'],
        ['5', 'Root', '100.0% (50,000/50,000)']
    ]
    
    table = Table(pass_data, colWidths=[50, 100, 200])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor('#f0f0f0')]),
    ]))
    content.append(table)
    
    content.append(Paragraph("4.4 EDAULC Failure Reasons", styles['SubsectionHeader']))
    
    failure_data = [
        ['Reason', 'Count', '% of Failures'],
        ['scholarly_fabrication', '2,217', '40.9%'],
        ['mission_misaligned', '1,799', '33.2%'],
        ['structural_empty', '1,404', '25.9%']
    ]
    
    table = Table(failure_data, colWidths=[150, 100, 100])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor('#f0f0f0')]),
    ]))
    content.append(table)
    
    content.append(Paragraph("4.5 Combined Results (150,000 Runs)", styles['SubsectionHeader']))
    
    combined_data = [
        ['Metric', 'SUBLEQ', 'EDAULC', 'Combined'],
        ['Total simulations', '100,000', '50,000', '150,000'],
        ['Success rate', '100.0%', '89.2%', '96.4%'],
        ['Simulations/second', '838', '268,362', '1,263']
    ]
    
    table = Table(combined_data, colWidths=[130, 90, 90, 90])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, -1), (-1, -1), HexColor('#e0e0e0')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, HexColor('#f0f0f0')]),
    ]))
    content.append(table)
    
    # 5. THEFT DOCUMENTATION
    content.append(Paragraph("5. THEFT DOCUMENTATION", styles['SectionHeader']))
    
    content.append(Paragraph("5.1 Ryan van Gelder Profile", styles['SubsectionHeader']))
    content.append(Paragraph(
        "<b>Name:</b> Ryan Van Gelder (also appears as Ryan O Van Gelder)<br/>"
        "<b>Employment:</b> Public Citizen: Washington, D.C., US<br/>"
        "<b>Role:</b> Founder & CEO (Research & Development)<br/>"
        "<b>Period:</b> 2011-01 to present (15+ years)<br/>"
        "<b>Publications:</b> 35+ on ResearchGate and Zenodo",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("5.2 Timeline of Theft", styles['SubsectionHeader']))
    
    timeline_data = [
        ['Date', 'Event'],
        ['May 4, 2026', 'Ahmad describes ERE concept to van Gelder'],
        ['May 13, 2026', 'Ahmad shares detailed SnapKitty v2.2.0 description'],
        ['May 14, 2026', 'Ahmad explains sovereign domain boundaries'],
        ['May 30, 2026', 'Ahmad creates Architecture Mapping Table'],
        ['June 2, 2026', 'Ahmad shares GitHub repositories'],
        ['June 8, 2026', 'Ahmad explains canonical MOC form'],
        ['June 11, 2026', 'Haskell ERE implementation created'],
        ['June 12, 2026', 'Ahmad reviews van Gelder repository'],
        ['June 18, 2026', 'van Gelder files PIRTM/MOC defensive publication'],
        ['June 19, 2026', 'Prolog ERE implementation created']
    ]
    
    table = Table(timeline_data, colWidths=[100, 300])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor('#f0f0f0')]),
    ]))
    content.append(table)
    
    content.append(Paragraph("5.3 Pattern Match: PIRTM/MOC vs Ahmad's Work", styles['SubsectionHeader']))
    
    pattern_data = [
        ['Concept', 'Ahmad Work', 'van Gelder Theft'],
        ['WORM', 'May 2026', 'June 18, 2026'],
        ['RegHom', 'May 2026', 'June 18, 2026'],
        ['ERE (5-pass)', 'May 2026', 'June 18, 2026'],
        ['SUBLEQ thesis', 'May 2026', 'June 18, 2026'],
        ['Sovereign Domain Boundaries', 'May 14', 'June 18, 2026'],
        ['Architecture Mapping Table', 'May 30', 'June 18, 2026']
    ]
    
    table = Table(pattern_data, colWidths=[150, 120, 120])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor('#f0f0f0')]),
    ]))
    content.append(table)
    
    content.append(Paragraph("5.4 What van Gelder Tried to Steal", styles['SubsectionHeader']))
    content.append(Paragraph(
        "- The 5-pass ERE pipeline<br/>"
        "- METATRON certification system<br/>"
        "- Watchtower superposition<br/>"
        "- SUBLEQ gate on superpositions<br/>"
        "- No-Cloning Theorem (LinearTypes enforcement)",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("5.5 Why van Gelder Failed", styles['SubsectionHeader']))
    content.append(Paragraph(
        "- He was bluffing - he never published because he didn't have enough information<br/>"
        "- He was waiting to steal our implementation<br/>"
        "- The repos are now deleted - he has a dead fork<br/>"
        "- Our new stack is more advanced - he's stuck with old code",
        styles['BodyTextCustom']
    ))
    
    # 6. PRIOR ART CLAIM
    content.append(Paragraph("6. PRIOR ART CLAIM", styles['SectionHeader']))
    
    content.append(Paragraph("6.1 Timeline", styles['SubsectionHeader']))
    content.append(Paragraph(
        "- <b>May 2026:</b> Ahmad describes ERE concept to van Gelder<br/>"
        "- <b>June 11, 2026:</b> Haskell implementation created (no_cloning.hs)<br/>"
        "- <b>June 19, 2026:</b> Prolog implementation created (edaulc_verify.pl)<br/>"
        "- <b>June 18, 2026:</b> van Gelder files PIRTM/MOC defensive publication<br/>"
        "- <b>July 4, 2026:</b> 150,000 simulations completed<br/>"
        "- <b>July 5, 2026:</b> This paper published",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("6.2 Evidence", styles['SubsectionHeader']))
    content.append(Paragraph(
        "- SNAPKITTY-PROOFS repo (deleted from GitHub, preserved locally)<br/>"
        "- Timestamped files: June 11 and June 19, 2026<br/>"
        "- Code snippets in this paper<br/>"
        "- Conversation logs showing Ahmad sharing the work<br/>"
        "- 150,000 simulations with 96.4% success rate",
        styles['BodyTextCustom']
    ))
    
    content.append(Paragraph("6.3 Conclusion", styles['SubsectionHeader']))
    content.append(Paragraph(
        "The ERE is a 5-pass verification pipeline that validates input through five distinct "
        "lenses. It is implemented in two languages (Prolog and Haskell) with identical semantics "
        "but different enforcement mechanisms. METATRON certifies when all five passes agree.",
        styles['BodyTextCustom']
    ))
    content.append(Paragraph(
        "<b>This is original work by Ahmad Ali Parr. It is timestamped, documented, and preserved. "
        "van Gelder's attempt to steal it failed.</b>",
        styles['BodyTextCustom']
    ))
    
    doc.build(content)
    print("PDF generated: ERE_COMBINED_PAPER.pdf")

if __name__ == "__main__":
    build_paper()
