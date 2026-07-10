"""Build the simplified MATHLIB5 paper (glitch cover + plain-language content)."""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Image,
                                Paragraph, Spacer, PageBreak, ListFlowable,
                                ListItem, Table, TableStyle, HRFlowable,
                                NextPageTemplate)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "mathlib5_simple.pdf")

SK_DARK = colors.HexColor("#1a1a2e")
SK_MID = colors.HexColor("#16213e")
SK_ACCENT = colors.HexColor("#e94560")
SK_MINT = colors.HexColor("#40c8b4")
SK_BLUE = colors.HexColor("#0f3460")
SK_GRAY = colors.HexColor("#5a5a6e")
LIGHT = colors.HexColor("#f4f4f8")
INK = colors.HexColor("#1a1a2e")

FP = "88313c7cea5c462eec80069f12fc28d771465c3aebeec2a79f4661d502a03491"
PUB = "18d816694de0deae621e913177bdfa3547e5d4cc2f9d91dfdcc3a16d03d02141"
OP = "MATH5:88313c7cea5c462eec80069f12fc28d771465c3aebeec2a79f4661d502a03491"

styles = getSampleStyleSheet()
body = ParagraphStyle("body", parent=styles["BodyText"], fontName="Helvetica",
                      fontSize=11, leading=16, textColor=INK, spaceAfter=8)
h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontName="Helvetica-Bold",
                    fontSize=18, textColor=SK_ACCENT, spaceBefore=14, spaceAfter=8)
h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Helvetica-Bold",
                    fontSize=13.5, textColor=SK_BLUE, spaceBefore=10, spaceAfter=5)
title = ParagraphStyle("title", parent=styles["Title"], fontName="Helvetica-Bold",
                       fontSize=26, textColor=SK_DARK, alignment=TA_CENTER)
sub = ParagraphStyle("sub", parent=styles["Normal"], fontName="Helvetica",
                     fontSize=12, textColor=SK_GRAY, alignment=TA_CENTER)
mono = ParagraphStyle("mono", parent=styles["Code"], fontName="Courier",
                      fontSize=8.5, textColor=SK_BLUE, backColor=LIGHT,
                      borderPadding=4, leading=11)
quote = ParagraphStyle("quote", parent=body, leftIndent=14, textColor=SK_MID,
                       fontName="Helvetica-Oblique", fontSize=10.5, leading=15)

def P(t, s=body): return Paragraph(t, s)

def bullets(items, s=body):
    return ListFlowable([ListItem(P(x, s), leftIndent=6) for x in items],
                        bulletType="bullet", start="square", leftIndent=14)

def sec(t): return P(t, h1)
def subsec(t): return P(t, h2)

story = []

# ---- Cover (drawn on its own full-bleed page template) ----
story += [NextPageTemplate("content"), PageBreak()]

# ---- Title block ----
story += [
    P("MATHLIB5", title),
    P("An Immutable System of Safety Boundaries for Verified Symbolic Compute", sub),
    Spacer(1, 6),
    HRFlowable(width="60%", color=SK_ACCENT, thickness=2, spaceAfter=10),
    P("Ahmad Ali Parr &nbsp;&middot;&nbsp; SnapKitty Collective &nbsp;&middot;&nbsp; SNAPKITTYWEST", sub),
    P("Simplified Edition &mdash; for engineers, reviewers, and the curious", sub),
    Spacer(1, 14),
]

story += [sec("1. What MATHLIB5 Is")]
story += [P(
    "MATHLIB5 is a system that <b>computes summations and matrix algebra</b> "
    "while proving, at every step, that the answer is correct. You write a small "
    "APL expression; the system transforms it through ten checked stages and "
    "produces both a fast C program <i>and</i> a machine-checked certificate that "
    "the program does exactly what the math says.")]
story += [P(
    "The point is not speed. The point is <b>trust you can verify</b>. Every "
    "artifact the system emits carries a receipt, and every receipt is sealed into "
    "an append-only chain anchored to the Bitcoin ledger.")]

story += [subsec("Why &quot;safety boundaries&quot;?")]
story += [P(
    "We think of the system as a sequence of doors. To pass through a door, an "
    "artifact must satisfy a contract. If it does, the door stamps a receipt and "
    "lets it through. If it does not, the build stops. No unverified artifact can "
    "silently slip through &mdash; the system is <i>fail-loud</i> by design.")]

story += [sec("2. The Big Idea in One Paragraph")]
story += [P(
    "A summation like 1+2+3+4 has a closed form: n(n+1)/2. MATHLIB5 proves that "
    "closed form inside the Lean proof assistant, then generates a C program that "
    "computes the same thing. It checks that the generated program matches the "
    "proof, signs the result, and writes the signature to a chain that the public "
    "Bitcoin network timestamps. A stranger on another continent can confirm the "
    "whole story without trusting us.")]

story += [sec("3. The Pipeline in Plain Language")]
layers = [
    ("1. APL frontend", "You write the numeric expression in APL, a concise array language."),
    ("2. Intermediate representation", "The expression becomes a typed, shape-aware tree the rest of the system can reason about."),
    ("3. Liquid Haskell", "A refinement type checker proves the values stay inside their promised bounds."),
    ("4. Lean 4", "The closed-form mathematical identity is proven as a theorem."),
    ("5. C-- emission", "The verified expression is turned into low-level C-- code."),
    ("6. Static analysis", "The code is checked for out-of-bounds reads and uninitialized values."),
    ("7. Policy / FOL", "The correctness claim is written as a first-order-logic formula."),
    ("8. P/NP swarm", "Open proof gaps are posted as solvable problems that agents compete to close."),
    ("9. WORM ledger", "Every receipt is appended to a write-once chain that cannot be rewritten."),
    ("10. Completeness", "A score reports how much of the system is actually proven, honestly."),
]
rows = [[P("<b>%s</b>" % a, body), P(b, body)] for a, b in layers]
t = Table(rows, colWidths=[1.7*inch, 4.8*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (0,-1), LIGHT),
    ("LINEBELOW", (0,0), (-1,-1), 0.4, SK_GRAY),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
]))
story += [t, Spacer(1, 6)]
story += [P("Each layer is a <b>safety boundary</b>. The output contract of one becomes the input contract of the next, so a break at any single layer is caught before it can propagate.", quote)]

story += [sec("4. The Verified Kernel")]
story += [P(
    "At the core sits a small verified kernel (written in a Coq-like language) that "
    "stores a polynomial as a tagged value and reduces it by the rules of arithmetic. "
    "Because the kernel is tiny and proven, the rest of the system can rely on it the "
    "way a building relies on its foundation. A foreign-function bridge then lets this "
    "verified kernel call ordinary C code and Lean code across a single, audited "
    "boundary.")]

story += [sec("5. Provenance You Can Check")]
story += [P(
    "MATHLIB5 does not ask you to trust a server. It publishes three things you can "
    "verify yourself:")]
story += [bullets([
    "<b>SHA-256 fingerprint</b> of the published document and the repository receipt.",
    "<b>Ed25519 signature</b> (the &quot;Plasma Gate&quot;) over that fingerprint, using a published public key.",
    "<b>Bitcoin OP_RETURN</b> message embedding the fingerprint on the public ledger, giving a tamper-resistant timestamp.",
])]
story += [P("Fingerprint (SHA-256):", h2)]
story += [P(FP, mono)]
story += [P("Ed25519 public key:", h2)]
story += [P(PUB, mono)]
story += [P("Bitcoin OP_RETURN payload:", h2)]
story += [P(OP + "  (70 bytes)", mono)]

story += [sec("6. Security and Honesty")]
story += [P(
    "If an attacker tampered with an intermediate artifact, they would have to forge "
    "an Ed25519 signature (assumed hard) or rewrite the Bitcoin anchor (economically "
    "expensive). Even a fully compromised build machine cannot produce a fake receipt "
    "that passes the public check. And because unproven lemmas are recorded as open "
    "debt rather than hidden, you always know exactly how much of the system rests on "
    "certified ground.")]

story += [sec("7. How to Verify It Yourself")]
story += [P("Clone the repository and run the built-in verification gate:")]
story += [P("git clone https://github.com/SNAPKITTYWEST/mathlib5<br/>"
            "cd mathlib5 &amp;&amp; npm ci<br/>"
            "npm run verify:all<br/>"
            "python paper/mathlib5/full/anchors/verify_anchors.py", mono)]
story += [P("The last command checks the fingerprint, the signature, and the "
            "OP_RETURN anchor, and prints <b>VERIFIED</b> when all three agree.")]

story += [sec("8. A Note on Scope")]
story += [P(
    "MATHLIB5 is deliberately narrow: it certifies summation and matrix contraction "
    "for a small APL fragment. It is not trying to replace general mathematical "
    "libraries or production C compilers. Within its domain, however, it is fully "
    "certified end-to-end, and that certificate is publicly anchorable.")]

story += [sec("9. Glossary")]
gloss = [
    ("Closed form", "A direct formula (e.g. n(n+1)/2) instead of a step-by-step sum."),
    ("Receipt", "A signed record that a boundary was passed."),
    ("WORM", "Write-Once-Read-Many: a ledger that can only be appended to."),
    ("Plasma Gate", "The Ed25519 signing authority that seals receipts."),
    ("OP_RETURN", "A Bitcoin transaction field used to embed arbitrary data."),
    ("P/NP swarm", "A crowd of agents that compete to solve and verify open proofs."),
]
grows = [[P("<b>%s</b>" % a, body), P(b, body)] for a, b in gloss]
gt = Table(grows, colWidths=[1.5*inch, 5.0*inch])
gt.setStyle(TableStyle([
    ("LINEBELOW", (0,0), (-1,-1), 0.3, SK_GRAY),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story += [gt]
story += [Spacer(1, 10)]
story += [P("Repository: github.com/SNAPKITTYWEST/mathlib5 &nbsp;&middot;&nbsp; "
            "ORCID: 0009-0006-1916-5245", sub)]

# ---- Build ----
def deco(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(SK_ACCENT)
    canvas.rect(0, letter[1]-6, letter[0], 6, fill=1, stroke=0)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(SK_GRAY)
    canvas.drawString(0.75*inch, 0.5*inch, "MATHLIB5 - Simplified Edition")
    canvas.drawRightString(letter[0]-0.75*inch, 0.5*inch, "Page %d" % doc.page)
    canvas.restoreState()

def draw_cover(canvas, doc):
    canvas.saveState()
    cover = Image(os.path.join(HERE, "cover.png"))
    cover.drawWidth = letter[0]
    cover.drawHeight = letter[1]
    cover.drawOn(canvas, 0, 0)
    canvas.restoreState()

doc = BaseDocTemplate(OUT, pagesize=letter,
                      leftMargin=0.75*inch, rightMargin=0.75*inch,
                      topMargin=0.9*inch, bottomMargin=0.8*inch,
                      title="MATHLIB5 (Simplified Edition)",
                      author="Ahmad Ali Parr")
frame = Frame(doc.leftMargin, doc.bottomMargin,
              doc.width, doc.height, id="main")
doc.addPageTemplates([
    PageTemplate(id="cover", frames=[Frame(0, 0, letter[0], letter[1], id="c")],
                 onPage=draw_cover, pagesize=letter),
    PageTemplate(id="content", frames=[frame], onPage=deco, pagesize=letter),
])
doc.build(story)
print("wrote", OUT)
