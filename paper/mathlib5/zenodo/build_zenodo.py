"""Build the Zenodo technical paper for MATHLIB5 (anchored to crypto seals)."""
import os, json, datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, PageBreak, ListFlowable, ListItem,
                                Table, TableStyle, HRFlowable)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "mathlib5_zenodo.pdf")

SK_DARK = colors.HexColor("#1a1a2e")
SK_ACCENT = colors.HexColor("#e94560")
SK_BLUE = colors.HexColor("#0f3460")
SK_GRAY = colors.HexColor("#5a5a6e")
LIGHT = colors.HexColor("#f4f4f8")
INK = colors.HexColor("#1a1a2e")

FP = "88313c7cea5c462eec80069f12fc28d771465c3aebeec2a79f4661d502a03491"
PUB = "18d816694de0deae621e913177bdfa3547e5d4cc2f9d91dfdcc3a16d03d02141"
OP = "MATH5:88313c7cea5c462eec80069f12fc28d771465c3aebeec2a79f4661d502a03491"
SEALED = "2026-07-05"

styles = getSampleStyleSheet()
body = ParagraphStyle("body", parent=styles["BodyText"], fontName="Helvetica",
                      fontSize=10.5, leading=15, textColor=INK, spaceAfter=7,
                      alignment=TA_JUSTIFY)
h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontName="Helvetica-Bold",
                    fontSize=15, textColor=SK_ACCENT, spaceBefore=12, spaceAfter=6)
h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Helvetica-Bold",
                    fontSize=12, textColor=SK_BLUE, spaceBefore=8, spaceAfter=4)
title = ParagraphStyle("title", parent=styles["Title"], fontName="Helvetica-Bold",
                       fontSize=21, textColor=SK_DARK, alignment=TA_CENTER, leading=25)
sub = ParagraphStyle("sub", parent=styles["Normal"], fontName="Helvetica",
                     fontSize=11, textColor=SK_GRAY, alignment=TA_CENTER)
meta = ParagraphStyle("meta", parent=styles["Normal"], fontName="Helvetica",
                      fontSize=9.5, textColor=SK_GRAY, alignment=TA_CENTER)
mono = ParagraphStyle("mono", parent=styles["Code"], fontName="Courier",
                      fontSize=8, textColor=SK_BLUE, backColor=LIGHT,
                      borderPadding=4, leading=10)

def P(t, s=body): return Paragraph(t, s)
def bullets(items):
    return ListFlowable([ListItem(P(x), leftIndent=6) for x in items],
                        bulletType="bullet", start="square", leftIndent=14)

story = []
story += [
    P("MATHLIB5: An Immutable System of Safety Boundaries<br/>for Verified Symbolic Compute", title),
    Spacer(1, 6),
    HRFlowable(width="50%", color=SK_ACCENT, thickness=2, spaceAfter=8),
    P("Ahmad Ali Parr", sub),
    P("SnapKitty Collective &middot; SNAPKITTYWEST &middot; ORCID 0009-0006-1916-5245", meta),
    P("Technical Paper &middot; Sealed %s &middot; License CC-BY-4.0" % SEALED, meta),
    Spacer(1, 10),
]

story += [P("Abstract", h1)]
story += [P(
    "MATHLIB5 is a verified symbolic-compute substrate that evaluates summations "
    "and matrix contractions written in a small APL fragment and proves, at every "
    "stage of a ten-layer pipeline, that the emitted code matches its closed-form "
    "mathematics. Each layer is a safety boundary that stamps a signed receipt; "
    "receipts are appended to a write-once (WORM) chain whose head is anchored to "
    "the Bitcoin ledger through an OP_RETURN transaction. This paper states the "
    "architecture, the verification chain, and the cryptographic seals &mdash; a "
    "SHA-256 fingerprint, an Ed25519 signature (the Plasma Gate), and the "
    "MATH5:&lt;sha256&gt; anchor &mdash; by which any reader can independently "
    "confirm the authenticity of this document and its accompanying software.")]

story += [P("1. Architecture Overview", h1)]
story += [P(
    "The Verified Symbolic Compute Pipeline (VSCP) transforms an APL expression "
    "through ten sequentially certified layers: (1) APL frontend, (2) typed "
    "intermediate representation, (3) Liquid Haskell refinement types, (4) Lean 4 "
    "closed-form proofs, (5) C-- emission, (6) static analysis, (7) first-order "
    "policy/FOL, (8) a P/NP swarm for open proofs, (9) the WORM ledger, and (10) a "
    "completeness metric. The output contract of each layer is the input contract "
    "of the next, so a single broken boundary is caught before any artifact can "
    "propagate.")]

layers = [
    ("1. APL frontend", "Numeric expression entered in a small APL fragment."),
    ("2. IR", "Typed, shape-aware intermediate representation."),
    ("3. Liquid Haskell", "Refinement types prove values stay in promised bounds."),
    ("4. Lean 4", "Closed-form mathematical identity proven as a theorem."),
    ("5. C-- emission", "Verified expression lowered to C-- code."),
    ("6. Static analysis", "Checks bounds and initialization."),
    ("7. FOL / policy", "Correctness claim rendered as first-order logic."),
    ("8. P/NP swarm", "Open proof gaps posted as solvable problems."),
    ("9. WORM ledger", "Receipts appended to a write-once chain."),
    ("10. Completeness", "Honest score of how much is proven."),
]
lrows = [[P("<b>%s</b>" % a, body), P(b, body)] for a, b in layers]
lt = Table(lrows, colWidths=[1.7*inch, 4.6*inch])
lt.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (0,-1), LIGHT),
    ("LINEBELOW", (0,0), (-1,-1), 0.4, SK_GRAY),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story += [Spacer(1, 4), lt, Spacer(1, 6)]

story += [P("2. The Verified Kernel and Bridge", h1)]
story += [P(
    "A small Coq-like verified kernel stores polynomials as tagged values and "
    "reduces them by the rules of arithmetic. A foreign-function bridge lets this "
    "kernel call audited C and Lean code across one confined, tag-checked boundary, "
    "bounding the trusted surface of the heterogeneous stack.")]

story += [P("3. Cryptographic Seals", h1)]
story += [P(
    "Authenticity rests on three independently checkable artifacts. Their values "
    "for this release are fixed below and are reproduced by "
    "<font face='Courier'>verify_anchors.py</font> in the repository.")]

story += [P("3.1 SHA-256 fingerprint", h2)]
story += [P("The fingerprint covers the LaTeX source tree of the full monograph "
            "and the verification receipt:", body)]
story += [P(FP, mono)]

story += [P("3.2 Ed25519 public key (Plasma Gate)", h2)]
story += [P(PUB, mono)]

story += [P("3.3 Bitcoin OP_RETURN anchor", h2)]
story += [P("A Bitcoin transaction embeds the payload below (70 bytes, within the "
            "80-byte standard limit). The 6-byte <font face='Courier'>MATH5:</font> "
            "prefix namespaces MATHLIB5 anchors:", body)]
story += [P(OP, mono)]

story += [P("4. Independent Verification", h1)]
story += [P("A verifier performs the following, with no trust placed in the authors:")]
story += [bullets([
    "Fetch the Bitcoin transaction carrying the MATH5: OP_RETURN and recover the expected hash.",
    "Recompute SHA-256 over the local document; it must equal the recovered hash.",
    "Verify the Ed25519 signature over that hash under the published public key.",
    "Confirm the OP_RETURN prefix is MATH5: and the hash matches.",
])]
story += [P("All four must hold for the document to be accepted as the anchored "
            "release. Tampering with any intermediate artifact forces either an "
            "Ed25519 forgery (assumed hard) or a rewrite of the Bitcoin anchor "
            "(economically bounded by proof-of-work).")]

story += [P("5. Reproducibility", h1)]
story += [P("The software is bit-for-bit reproducible from a pinned commit. The "
            "verification gate aborts on any unverified artifact, so a published "
            "artifact is always accompanied by a complete certificate chain or does "
            "not exist at all. Unproven lemmas are recorded as open debt in "
            "<font face='Courier'>sorrydb</font> and exposed to the P/NP swarm, "
            "keeping the completeness score honest.")]

story += [P("6. Scope and Relation to Other Systems", h1)]
story += [P(
    "MATHLIB5 is domain-specific: it certifies summation and matrix contraction for "
    "a small APL fragment, and does not aim to replace general proof libraries or "
    "production C compilers. Its distinguishing combination is an end-to-end "
    "verified pipeline together with public, on-chain provenance &mdash; a property "
    "not provided by CompCert, CertiCoq, Lean mathlib, or Isabelle.")]

story += [P("7. Metadata and Citation", h1)]
story += [P("This record is accompanied by <font face='Courier'>.zenodo.json</font> "
            "describing authors, license (CC-BY-4.0), keywords, and the related "
            "software repository. To cite: A. A. Parr, &ldquo;MATHLIB5: An Immutable "
            "System of Safety Boundaries for Verified Symbolic Compute,&rdquo; "
            "SnapKitty Collective, 2026, sealed under SHA-256 "
            "%s." % FP[:16] + "&hellip;")]

story += [Spacer(1, 8), HRFlowable(width="100%", color=SK_GRAY, thickness=0.5)]
story += [P("Repository: https://github.com/SNAPKITTYWEST/mathlib5 &nbsp;&middot;&nbsp; "
            "ORCID: 0009-0006-1916-5245 &nbsp;&middot;&nbsp; Sealed %s" % SEALED, meta)]

def deco(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(SK_ACCENT)
    canvas.rect(0, letter[1]-5, letter[0], 5, fill=1, stroke=0)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(SK_GRAY)
    canvas.drawString(0.75*inch, 0.5*inch, "MATHLIB5 - Zenodo Technical Paper")
    canvas.drawRightString(letter[0]-0.75*inch, 0.5*inch, "Page %d" % doc.page)
    canvas.restoreState()

doc = BaseDocTemplate(OUT, pagesize=letter,
                      leftMargin=0.85*inch, rightMargin=0.85*inch,
                      topMargin=0.85*inch, bottomMargin=0.75*inch,
                      title="MATHLIB5: An Immutable System of Safety Boundaries for Verified Symbolic Compute",
                      author="Ahmad Ali Parr")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=deco)])
doc.build(story)
print("wrote", OUT)
