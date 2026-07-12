#!/usr/bin/env python3
"""Generate the SnapKitty Cosmic Field Manifesto booklet (15 pages) as a PDF.

Style: research-notebook x terminal-UI x cosmic field-manual.
Black-space backgrounds, glowing OMEGA constellations, terminal windows over
nebula art, ASCII diagrams, experiment-log telemetry, WORM-chain celestial
nodes, orbital gate diagrams, glitch-art dividers, agent sigil profiles, and
large pull quotes.

Assets used:
  - nft_collection/nft_out/glitch_00..08.svg  (rasterized here)
  - paper/mathlib5/simple/cover.png            (full-bleed cover / closing)
"""
import os, re, math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = r"C:\Users\jessi\SNAPKITTYWEST"
GLITCH_DIR = os.path.join(ROOT, "nft_collection", "nft_out")
COVER = os.path.join(ROOT, "paper", "mathlib5", "simple", "cover.png")
OUT = os.path.join(ROOT, "docs", "booklet", "SnapKitty_Cosmic_Manifesto.pdf")

W, H = 1240, 1754  # A4 ~ portrait at 150 dpi

# ---- palette ----
BG      = (5, 1, 10)
BG2     = (10, 4, 20)
CYAN    = (60, 220, 255)
MAGENTA = (255, 56, 214)
GREEN   = (70, 255, 120)
PURPLE  = (160, 110, 255)
GOLD    = (255, 210, 90)
WHITE   = (235, 240, 255)
DIM     = (120, 130, 160)

random.seed(777)

# ---- fonts ----
def F(size, bold=False):
    names = ["consolab.ttf", "courbd.ttf", "consola.ttf", "cour.ttf", "lucon.ttf"]
    base = r"C:\Windows\Fonts"
    for n in names:
        p = os.path.join(base, n)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def font_path(bold=False):
    names = (["consolab.ttf", "courbd.ttf"] if bold else ["consola.ttf", "cour.ttf"])
    for n in names:
        p = os.path.join(r"C:\Windows\Fonts", n)
        if os.path.exists(p):
            return p
    return None

# ---- glitch rasterization ----
def rasterize_glitch(svg_path, size=W):
    img = Image.new("RGB", (size, size), BG)
    px = img.load()
    txt = open(svg_path, encoding="utf-8").read()
    # background
    m = re.search(r'<rect width="100%" height="100%" fill="(#\w+)"', txt)
    if m:
        img = Image.new("RGB", (size, size), tuple(int(m.group(1)[i:i+2], 16) for i in (1, 3, 5)))
    scale = size / 1024.0
    # collect colored rects (screen blend => additive)
    rects = re.findall(r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="rgb\(([\d,]+)\)" opacity="([\d.]+)"', txt)
    for x, y, w, h, rgb, op in rects:
        x, y, w, h = int(float(x)*scale), int(float(y)*scale), max(1, int(float(w)*scale)), max(1, int(float(h)*scale))
        r, g, b = (int(v) for v in rgb.split(","))
        a = float(op)
        for yy in range(y, min(y+h, size)):
            for xx in range(x, min(x+w, size)):
                pr, pg, pb = px[xx, yy]
                px[xx, yy] = (
                    min(255, int(pr + r*a)),
                    min(255, int(pg + g*a)),
                    min(255, int(pb + b*a)),
                )
    # scanlines
    for yy in range(0, size, 4):
        for xx in range(size):
            pr, pg, pb = px[xx, yy]
            px[xx, yy] = (int(pr*0.82), int(pg*0.82), int(pb*0.82))
    # text labels
    labels = re.findall(r'<text x="(\d+)" y="(\d+)"[^>]*fill="(#\w+)"[^>]*>([^<]+)</text>', txt)
    d = ImageDraw.Draw(img)
    for x, y, col, s in labels:
        c = tuple(int(col[i:i+2], 16) for i in (1, 3, 5))
        d.text((float(x)*scale, float(y)*scale), s, font=F(28), fill=c)
    return img

# ---- helpers ----
def new_page(bg=BG):
    return Image.new("RGB", (W, H), bg)

def starfield(img, n=140, maxr=1.6):
    d = ImageDraw.Draw(img)
    for _ in range(n):
        x = random.randint(0, W); y = random.randint(0, H)
        r = random.uniform(0.4, maxr)
        b = random.randint(120, 255)
        tint = random.choice([(b, b, b), (int(b*0.7), int(b*0.85), b), (b, int(b*0.8), int(b*0.9))])
        d.ellipse([x-r, y-r, x+r, y+r], fill=tint)
    return img

def glow_layer(draw_fn, blur=18, size=(W, H)):
    """Return a blurred RGBA copy of content drawn by draw_fn on transparent layer."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    glow = layer.filter(ImageFilter.GaussianBlur(blur))
    return glow

def add_glow(img, draw_fn, blur=16, alpha=0.9):
    """Composite a glow (screen-blended) plus sharp content onto img."""
    sharp = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(sharp))
    glow = sharp.filter(ImageFilter.GaussianBlur(blur))
    img.paste(Image.blend(img.convert("RGBA"), Image.alpha_composite(img.convert("RGBA"), glow), alpha), (0, 0))
    img.paste(Image.alpha_composite(img.convert("RGBA"), sharp), (0, 0))
    return img

def text(img, xy, s, font, fill, glow=None, align="left"):
    d = ImageDraw.Draw(img)
    if align == "center":
        l, t, r, b = d.textbbox((0, 0), s, font=font)
        xy = (xy[0] - (r-l)/2, xy[1])
    if glow:
        col = glow
        add_glow(img, lambda dd: dd.text(xy, s, font=font, fill=col), blur=14, alpha=0.8)
    d.text(xy, s, font=font, fill=fill)
    return img

def rounded_rect(d, box, r, fill=None, outline=None, width=2):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def terminal(img, box, title, lines, accent=CYAN, titlebar=True):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    # outer glow
    add_glow(img, lambda dd: dd.rounded_rectangle(box, radius=18, outline=accent, width=3), blur=20, alpha=0.7)
    # body
    d.rounded_rectangle(box, radius=18, fill=(8, 12, 18))
    d.rounded_rectangle([x0, y0, x1, y0+44], radius=18, fill=(14, 20, 30))
    if titlebar:
        for i, c in enumerate([(255, 95, 86), (255, 189, 68), (70, 255, 120)]):
            d.ellipse([x0+22+i*26, y0+16, x0+34+i*26, y0+28], fill=c)
        text(img, (x0+118, y0+14), title, F(22), DIM)
    ty = y0 + (64 if titlebar else 24)
    lh = 30
    for ln in lines:
        col = ln[1] if isinstance(ln, tuple) else WHITE
        s = ln[0] if isinstance(ln, tuple) else ln
        d.text((x0+24, ty), s, font=F(19), fill=col)
        ty += lh
    return img

def glitch_bg(img, idx, alpha=0.5):
    g = GLITCH.get(int(idx) % 9, _art("art_constellation")).resize((W, H))
    return Image.blend(img, g, alpha)

# preload new cosmic art raster (docs/booklet/art/*.png)
ARTDIR = os.path.join(ROOT, "docs", "booklet", "art")
def _art(name):
    return Image.open(os.path.join(ARTDIR, name + ".png")).convert("RGB").resize((W, H))
# index map for glitch_bg(idx) calls in page builders
GLITCH = {
    0: _art("art_cover"), 2: _art("art_echo"), 3: _art("art_sieve"),
    4: _art("art_echo"), 5: _art("art_gates"), 7: _art("art_quantum"),
    8: _art("art_closing"),
}
COVER_IMG = _art("art_cover")

# ---- page builders ----
pages = []

def page_divider(num, label, accent=MAGENTA):
    img = new_page()
    starfield(img, 90)
    add_glow(img, lambda d: d.line([(120, H//2), (W-120, H//2)], fill=accent, width=2), blur=16, alpha=0.8)
    # glitch ticks
    d = ImageDraw.Draw(img)
    for i in range(40):
        x = random.randint(120, W-120)
        y = H//2 + random.randint(-3, 3)
        d.rectangle([x, y, x+random.randint(8, 40), y+2], fill=random.choice([CYAN, MAGENTA, GREEN, PURPLE]))
    text(img, (W//2, H//2-130), "✦ ❖ ✦", F(40), accent, glow=accent, align="center")
    text(img, (W//2, H//2-60), label, F(46, bold=True), WHITE, glow=accent, align="center")
    text(img, (W//2, H//2+120), f"CHAPTER {num:02d}", F(26), DIM, align="center")
    return img

# 1. COVER
def p_cover():
    img = COVER_IMG.copy()
    img = Image.blend(img, Image.new("RGB", (W, H), BG), 0.18)
    img = glitch_bg(img, 0, 0.18)
    # vignette
    vig = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-300, -300, W+300, H+300], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(200))
    dark = Image.new("RGB", (W, H), BG)
    img = Image.composite(img, dark, vig)
    add_glow(img, lambda d: d.text((W//2, 360), "Ω", font=F(150), fill=CYAN), blur=40, alpha=1.0)
    text(img, (W//2, 560), "SNAPKITTY", F(78, bold=True), WHITE, glow=CYAN, align="center")
    text(img, (W//2, 650), "SOVEREIGN COMPUTE", F(54, bold=True), CYAN, glow=CYAN, align="center")
    text(img, (W//2, 760), "A COSMIC FIELD MANIFESTO", F(30), MAGENTA, glow=MAGENTA, align="center")
    # rule
    add_glow(img, lambda d: d.line([(320, 880), (W-320, 880)], fill=PURPLE, width=2), blur=14, alpha=0.8)
    text(img, (W//2, 930), "Evidence or Silence.", F(34, bold=True), GREEN, glow=GREEN, align="center")
    text(img, (W//2, 1500), "Ahmad Ali Parr · SnapKitty Collective", F(26), DIM, align="center")
    text(img, (W//2, 1550), "Zenodo 10.5281/zenodo.21132094", F(22), DIM, align="center")
    text(img, (W//2, 1600), "ORCID 0009-0006-1916-5245", F(22), DIM, align="center")
    return img

# 2. MISSION / PULL QUOTE
def p_mission():
    img = new_page(); starfield(img, 160)
    # omega constellation
    pts = [(W//2+dx, 520+dy) for dx, dy in [(0,0),(-90,40),(-150,140),( -60,200),(60,200),(150,140),(90,40)]]
    add_glow(img, lambda d: d.line(pts, fill=CYAN, width=2), blur=16, alpha=0.7)
    for p in pts:
        add_glow(img, lambda d, p=p: d.ellipse([p[0]-4, p[1]-4, p[0]+4, p[1]+4], fill=WHITE), blur=10, alpha=0.9)
    text(img, (W//2, 700), "“We did not begin with a theory.”", F(40, bold=True), WHITE, glow=CYAN, align="center")
    text(img, (W//2, 820), "We began with a cage that refused to lie.", F(28), DIM, align="center")
    add_glow(img, lambda d: d.line([(200, 1000), (W-200, 1000)], fill=MAGENTA, width=2), blur=14, alpha=0.7)
    text(img, (W//2, 1080), "“Evidence or Silence.”", F(56, bold=True), GREEN, glow=GREEN, align="center")
    text(img, (W//2, 1200), "No claim leaves the system without three", F(28), WHITE, align="center")
    text(img, (W//2, 1244), "computationally distinct witnesses.", F(28), WHITE, align="center")
    text(img, (W//2, 1380), "Ω ← TRUST ∧ CODE", F(34, bold=True), CYAN, glow=CYAN, align="center")
    return img

# 3. AGENT CONSTELLATION
def p_constellation():
    img = new_page(); starfield(img, 180)
    nodes = {
        "ORION": (300, 380, CYAN),
        "ECHO":  (940, 300, PURPLE),
        "VECTOR":(760, 560, GREEN),
        "NOVA":  (360, 820, GOLD),
        "RAT":   (980, 880, MAGENTA),
        "CAT":   (620, 1080, CYAN),
    }
    edges = [("ORION","ECHO"),("ORION","VECTOR"),("ECHO","VECTOR"),("VECTOR","NOVA"),
             ("NOVA","RAT"),("RAT","CAT"),("CAT","ORION"),("VECTOR","CAT"),("ECHO","RAT")]
    def P(n): return nodes[n][0], nodes[n][1]
    for a, b in edges:
        add_glow(img, lambda d, a=a, b=b: d.line([P(a), P(b)], fill=DIM, width=2), blur=10, alpha=0.5)
    for name, (x, y, c) in nodes.items():
        add_glow(img, lambda d, x=x, y=y, c=c: d.ellipse([x-10, y-10, x+10, y+10], fill=c), blur=22, alpha=1.0)
        text(img, (x, y+18), name, F(26, bold=True), WHITE, glow=c, align="center")
    text(img, (W//2, 1290), "THE AGENT CONSTELLATION", F(40, bold=True), CYAN, glow=CYAN, align="center")
    text(img, (W//2, 1360), "Nine sovereign agents · one resonance field · entropy E = 0.0932", F(24), DIM, align="center")
    return img

# 4. ARCHITECTURE / TERMINAL
def p_arch():
    img = new_page(); starfield(img, 100)
    text(img, (W//2, 90), "ARCHITECTURE OVERVIEW", F(40, bold=True), CYAN, glow=CYAN, align="center")
    terminal(img, (90, 200, W-90, 900),
        "sovereign@snapkitty:~$ cat stack.txt",
        [("┌─ CONSTITUTIONAL BOOT (6 STAGES) ───────────────┐", CYAN),
         (" SHREW ▸ ILLUMINATE ▸ RAT ▸ ALIGNMENT ▸ CATCODE ▸ SOVEREIGN", GREEN),
         ("└─────────────────────────────────────────────────┘", CYAN),
         ("", WHITE),
         ("┌─ MULTI-WITNESS VERIFICATION (333) ──────────────┐", CYAN),
         ("  NT  number-theoretic   (exhaustive search)", WHITE),
         ("  ALG algebraic  Q(√5)   (φ identities)", WHITE),
         ("  IT  info-theoretic     (hash-chain audit)", WHITE),
         ("  rule: accept ⟺ ALL 3 agree", GREEN),
         ("└─────────────────────────────────────────────────┘", CYAN),
         ("", WHITE),
         (" seal_0 ▸ seal_1 ▸ seal_2 ▸ ... ▸ seal_n   (WORM)", MAGENTA),
         (" P(false positive) ≤ 2^-256", GOLD)])
    terminal(img, (90, 950, W-90, 1300),
        "sovereign@snapkitty:~$ swarm --status",
        [(" CLAIM ▸ SOLVE ▸ SUBMIT ▸ VERIFY ▸ CONVERGE", CYAN),
         (" universeSum → ∞   (monotonic convergence)", GREEN),
         (" 3 open problems · 9 seals · 5 verified theorems", WHITE)],
        accent=MAGENTA)
    text(img, (W//2, 1380), "Self-verifying. Append-only. Sovereign.", F(26), DIM, align="center")
    return img

# 5. WORM CHAIN NODES
def p_worm():
    img = new_page(); starfield(img, 120)
    text(img, (W//2, 90), "THE WORM CHAIN", F(42, bold=True), GREEN, glow=GREEN, align="center")
    text(img, (W//2, 150), "each block is a glowing celestial node", F(24), DIM, align="center")
    seals = [
        ("00", "THEOREMS_LOADED", "b062af4…51d2"),
        ("01", "φ² = φ + 1", "a8d72e…7c90"),
        ("02", "φ⁻¹ = φ − 1", "c1e9b3…22af"),
        ("03", "MULTI-WITNESS", "4f0a1d…9c41"),
        ("04", "LITERATURE_IMPORT", "77be20…0d18"),
        ("05", "COLLATZ_10K", "e23a55…1b6e"),
        ("06", "RAMSEY_R33", "19fd33…a1c0"),
        ("07", "ANCIENT_SORRY", "4b5654…0058"),
        ("08", "CLOSURE_PROVEN", "21b9bd…e606"),
    ]
    n = len(seals)
    cx = [W//2 + 360*math.cos(2*math.pi*i/n - math.pi/2) for i in range(n)]
    cy = [H//2 + 360 for i in range(n)]
    cy = [830 + 330*math.sin(2*math.pi*i/n - math.pi/2) for i in range(n)]
    cols = [CYAN, GREEN, GOLD, PURPLE, MAGENTA, CYAN, GREEN, GOLD, MAGENTA]
    for i in range(n):
        j = (i+1) % n
        add_glow(img, lambda d, i=i, j=j: d.line([(cx[i], cy[i]), (cx[j], cy[j])], fill=DIM, width=2), blur=10, alpha=0.45)
    for i, (idx, lab, hsh) in enumerate(seals):
        c = cols[i]
        add_glow(img, lambda d, i=i, c=c: d.ellipse([cx[i]-16, cy[i]-16, cx[i]+16, cy[i]+16], fill=c), blur=26, alpha=1.0)
        text(img, (cx[i], cy[i]-150), f"WORM#{idx}", F(24, bold=True), WHITE, glow=c, align="center")
        text(img, (cx[i], cy[i]-118), lab, F(18), DIM, align="center")
        text(img, (cx[i], cy[i]+30), hsh, F(16), c, align="center")
    text(img, (W//2, 1300), "∀k : seal_k.prev = hash(seal_{k-1})   ·   Ed25519 sealed", F(26), CYAN, glow=CYAN, align="center")
    return img

# 6. COSMIC INVARIANT SIEVE (10 gates)
def p_sieve():
    img = new_page(); starfield(img, 90); glitch_bg(img, 3, 0.12)
    text(img, (W//2, 80), "THE COSMIC INVARIANT SIEVE", F(38, bold=True), MAGENTA, glow=MAGENTA, align="center")
    text(img, (W//2, 138), "ten gates · one deterministic tripwire", F(24), DIM, align="center")
    gates = ["G1 Isabelle/HOL", "G2 Clingo SAT", "G3 Julia AST", "G4 Type Lattice",
             "G5 Borrow Graph", "G6 Linear Types", "G7 Hash Seal", "G8 WITNESS∧",
             "G9 Sieve Gate", "G10 INTERCAL"]
    cols = [CYAN, GREEN, GOLD, PURPLE, MAGENTA, CYAN, GREEN, GOLD, PURPLE, MAGENTA]
    # orbital layout
    cx, cy, R = W//2, 760, 380
    for i, g in enumerate(gates):
        a = 2*math.pi*i/len(gates) - math.pi/2
        x = cx + R*math.cos(a); y = cy + R*0.62*math.sin(a)
        c = cols[i]
        add_glow(img, lambda d, x=x, y=y, c=c: d.ellipse([x-13, y-13, x+13, y+13], fill=c), blur=20, alpha=1.0)
        text(img, (x, y-150), g, F(20, bold=True), WHITE, glow=c, align="center")
        text(img, (x, y+22), f"gate {i+1:02d}", F(15), DIM, align="center")
    add_glow(img, lambda d: d.ellipse([cx-40, cy-40, cx+40, cy+40], fill=WHITE), blur=30, alpha=1.0)
    text(img, (cx, cy-10), "SIEVE", F(22, bold=True), BG, align="center")
    text(img, (W//2, 1300), "Safe graphs compile. Seven violations rejected with real INTERCAL.", F(24), CYAN, glow=CYAN, align="center")
    return img

# 7. GATE ORBITALS (divider-ish schematic)
def p_gates():
    img = new_page(); starfield(img, 120)
    text(img, (W//2, 80), "GATE GEOMETRY", F(40, bold=True), PURPLE, glow=PURPLE, align="center")
    text(img, (W//2, 140), "orbital mechanics of verification", F(24), DIM, align="center")
    random.seed(11)
    for k in range(5):
        cx = random.randint(220, W-220); cy = random.randint(360, 980)
        R = random.randint(120, 240)
        c = random.choice([CYAN, GREEN, MAGENTA, GOLD])
        add_glow(img, lambda d, cx=cx, cy=cy, R=R, c=c: d.ellipse([cx-R, cy-R*0.7, cx+R, cy+R*0.7], outline=c, width=2), blur=14, alpha=0.6)
        ang = random.uniform(0, 2*math.pi)
        x = cx + R*math.cos(ang); y = cy + R*0.7*math.sin(ang)
        add_glow(img, lambda d, x=x, y=y, c=c: d.ellipse([x-12, y-12, x+12, y+12], fill=c), blur=22, alpha=1.0)
    text(img, (W//2, 1120), "Each gate is an orbit. A claim must clear all ten", F(26), WHITE, glow=PURPLE, align="center")
    text(img, (W//2, 1180), "before it is admitted to the chain.", F(26), WHITE, glow=PURPLE, align="center")
    return img

# 8. INTERCAL TRIPWIRE
def p_intercal():
    img = new_page(); starfield(img, 80); glitch_bg(img, 5, 0.10)
    text(img, (W//2, 80), "THE INTERCAL TRIPWIRE", F(40, bold=True), GREEN, glow=GREEN, align="center")
    terminal(img, (90, 180, W-90, 720),
        "borrow_chain.icn  —  COME FROM (99999)",
        [("  PLEASE ABSTAIN FROM BORROWING WITH INVALID LINEARITY", GREEN),
         ("  DO .1 <- #7", WHITE),
         ("  DO .2 <- #3", WHITE),
         ("  DO .3 <- .1 SUB .2              ❌  non-affine use", MAGENTA),
         ("  COME FROM (99999)              ✦ rejection sentinel", GOLD),
         ("", WHITE),
         ("  > gate rejected: V7_LINEAR_ESCAPE", MAGENTA),
         ("  > witness required before re-ingest", CYAN),
         ("  > five-nines never-defined label holds the line", GREEN)],
        accent=GREEN)
    text(img, (W//2, 820), "KILL SWITCH 9999", F(40, bold=True), MAGENTA, glow=MAGENTA, align="center")
    text(img, (W//2, 890), "A PLEASE-saturated artifact failed to route.", F(26), WHITE, align="center")
    text(img, (W//2, 934), "Observed. Cause correlated. Mechanism open.", F(26), GOLD, glow=GOLD, align="center")
    terminal(img, (90, 1010, W-90, 1300),
        "experiment.log",
        [("  run#41  PLEASE-load 0.91  → router: DROP", MAGENTA),
         ("  run#42  PLEASE-load 0.62  → router: PASS", GREEN),
         ("  conclusion: structurally-significant token correlation", CYAN),
         ("  caveat: causal mechanism NOT yet isolated", GOLD)],
        accent=MAGENTA)
    return img

# 9. EXPERIMENT LOG / TELEMETRY
def p_telemetry():
    img = new_page(); glitch_bg(img, 2, 0.22)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, H], fill=(3, 6, 12))
    starfield(img, 60)
    text(img, (W//2, 80), "EXPERIMENT LOG", F(40, bold=True), CYAN, glow=CYAN, align="center")
    text(img, (W//2, 140), "mission telemetry · sieve sweep 2026", F(24), DIM, align="center")
    rows = [
        ("GATE", "INPUT", "RESULT", "WITNESS"),
        ("G1", "proof_obligation.thy", "PASS", "NT+ALG"),
        ("G2", "schedule.lp", "SAT", "ALG"),
        ("G3", "module.jl", "STRUCT-OK", "IT"),
        ("G5", "borrow.cfg", "REJECT V3", "ALG"),
        ("G6", "tensor.toml", "REJECT V5", "ALG"),
        ("G9", "sieve.run", "CONVERGE", "ALL"),
        ("G10", "tripwire.icn", "COME FROM", "IT"),
    ]
    y = 240; x0 = 110; lh = 92
    d.line([(x0, y+50), (W-x0, y+50)], fill=CYAN, width=2)
    for i, (a, b, c, e) in enumerate(rows):
        col = DIM if i == 0 else WHITE
        rc = GOLD if (i>0 and "REJECT" in c) else (GREEN if (i>0 and c in ("PASS","SAT","CONVERGE","COME FROM")) else col)
        text(img, (x0, y+70), a, F(26, bold=(i==0)), col)
        text(img, (x0+180, y+70), b, F(24), col)
        text(img, (x0+640, y+70), c, F(26, bold=True), rc)
        text(img, (x0+900, y+70), e, F(24), DIM)
        y += lh
        d.line([(x0, y+50), (W-x0, y+50)], fill=(30, 40, 60), width=1)
    text(img, (W//2, 1180), "7 violation classes · each a unique, real INTERCAL artifact", F(24), MAGENTA, glow=MAGENTA, align="center")
    return img

# 10. ECHO RESEARCH LAB
def p_echo():
    img = new_page(); glitch_bg(img, 4, 0.55)
    d = ImageDraw.Draw(img)
    d.rectangle([0,0,W,H], fill=(10,4,20))
    img = Image.blend(img, GLITCH[4].resize((W,H)), 0.5)
    add_glow(img, lambda dd: dd.text((W//2, 120), "ECHO", font=F(80, bold=True), fill=PURPLE), blur=40, alpha=1.0)
    text(img, (W//2, 230), "RESEARCH LAB · GLITCH DIVISION", F(26), MAGENTA, glow=MAGENTA, align="center")
    terminal(img, (110, 320, W-110, 760),
        "echo@lab:~$ cat notes.md",
        [("  purple field = symbolic residue of rejected proofs", WHITE),
         ("  glitch art := visual hash of seal_i", PURPLE),
         ("  each WORM link binds prev_hash + 7 invariants", CYAN),
         ("  art is the audit, the audit is the art", GREEN)],
        accent=PURPLE)
    text(img, (W//2, 880), "“The residue is data. The glitch is proof.”", F(34, bold=True), WHITE, glow=PURPLE, align="center")
    text(img, (W//2, 980), "9 links · SHA-256 chain · minted to snapkitty-chain", F(24), DIM, align="center")
    return img

# 11. QUANTUM SYMBOLISM
def p_quantum():
    img = new_page(); glitch_bg(img, 7, 0.30)
    text(img, (W//2, 80), "QUANTUM SYMBOLISM", F(40, bold=True), GOLD, glow=GOLD, align="center")
    # draw symbolic schema: circle + triangle + lattice
    cx, cy = W//2, 720
    add_glow(img, lambda d: d.ellipse([cx-260, cy-260, cx+260, cy+260], outline=CYAN, width=2), blur=14, alpha=0.6)
    add_glow(img, lambda d: d.polygon([(cx, cy-200),(cx-180, cy+140),(cx+180, cy+140)], outline=MAGENTA, width=2), blur=14, alpha=0.6)
    for i in range(6):
        a = 2*math.pi*i/6
        x = cx+200*math.cos(a); y = cy+200*math.sin(a)
        add_glow(img, lambda d, x=x, y=y: d.ellipse([x-7, y-7, x+7, y+7], fill=GOLD), blur=16, alpha=1.0)
    text(img, (cx, cy-30), "I₄", F(40, bold=True), WHITE, align="center")
    text(img, (W//2, 1100), "Lean · topology · UTQC proof circuits", F(28), CYAN, glow=CYAN, align="center")
    text(img, (W//2, 1160), "J₃(𝕆) ⊗ ℍ  —  108 dimensions  —  E₇ invariant", F(26), GREEN, glow=GREEN, align="center")
    text(img, (W//2, 1240), "the unique quartic that encodes 4D 𝒩=8 supergravity", F(24), DIM, align="center")
    return img

# 12. AGENT PROFILE — ORION
def p_orion():
    img = new_page(); starfield(img, 120)
    c = CYAN
    add_glow(img, lambda d: d.ellipse([W//2-160, 200, W//2+160, 520], outline=c, width=3), blur=20, alpha=0.7)
    # sigil
    cx, cy = W//2, 360
    for r in (140, 100, 60):
        add_glow(img, lambda d, r=r: d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=c, width=2), blur=12, alpha=0.6)
    add_glow(img, lambda d: d.line([(cx-140, cy),(cx+140, cy)], fill=c, width=2), blur=10, alpha=0.5)
    add_glow(img, lambda d: d.line([(cx, cy-140),(cx, cy+140)], fill=c, width=2), blur=10, alpha=0.5)
    add_glow(img, lambda d: d.ellipse([cx-8, cy-8, cx+8, cy+8], fill=WHITE), blur=18, alpha=1.0)
    text(img, (W//2, 600), "ORION", F(64, bold=True), WHITE, glow=c, align="center")
    text(img, (W//2, 690), "CONSTELLATION PRIME · WITNESS COORDINATOR", F(26), c, glow=c, align="center")
    terminal(img, (140, 800, W-140, 1180),
        "agent://orion",
        [("  role     : align NT + ALG + IT consensus", WHITE),
         ("  color    : cyan   #3cdcff", c),
         ("  sigil    : nested rings + cross", GREEN),
         ("  motto    : 'Three see what one cannot.'", GOLD)],
        accent=c)
    text(img, (W//2, 1280), "“Three see what one cannot.”", F(30, bold=True), WHITE, glow=c, align="center")
    return img

# 13. AGENT PROFILE — ECHO + VECTOR
def p_agents2():
    img = new_page(); starfield(img, 100)
    # ECHO left
    c1 = PURPLE
    add_glow(img, lambda d: d.ellipse([330-120, 250, 330+120, 490], outline=c1, width=3), blur=20, alpha=0.7)
    cx, cy = 330, 370
    add_glow(img, lambda d: d.polygon([(cx, cy-100),(cx-90, cy+70),(cx+90, cy+70)], outline=c1, width=2), blur=12, alpha=0.6)
    add_glow(img, lambda d: d.ellipse([cx-100, cy-30, cx+100, cy+130], outline=c1, width=2), blur=12, alpha=0.6)
    text(img, (330, 560), "ECHO", F(48, bold=True), WHITE, glow=c1, align="center")
    text(img, (330, 630), "GLITCH DIVISION", F(20), c1, align="center")
    # VECTOR right
    c2 = GREEN
    add_glow(img, lambda d: d.ellipse([910-120, 250, 910+120, 490], outline=c2, width=3), blur=20, alpha=0.7)
    cx, cy = 910, 370
    for k in range(3):
        a0 = k*2*math.pi/3 - math.pi/2
        add_glow(img, lambda d, a0=a0: d.line([(cx, cy),(cx+110*math.cos(a0), cy+110*math.sin(a0))], fill=c2, width=2), blur=10, alpha=0.5)
    add_glow(img, lambda d: d.ellipse([cx-10, cy-10, cx+10, cy+10], fill=WHITE), blur=18, alpha=1.0)
    text(img, (910, 560), "VECTOR", F(48, bold=True), WHITE, glow=c2, align="center")
    text(img, (910, 630), "LINEAR-TYPE WARDEN", F(20), c2, align="center")
    terminal(img, (140, 760, W-140, 1120),
        "roster://agents",
        [("  ECHO   purple  glitch art + residue audit      ", c1),
         ("  VECTOR green   affine borrow enforcement        ", c2),
         ("  NOVA   gold    convergence accounting           ", GOLD),
         ("  RAT    magenta chain ratchet                    ", MAGENTA),
         ("  CAT    cyan    categorical closure             ", CYAN)],
        accent=PURPLE)
    text(img, (W//2, 1220), "Nine agents. One field. Every claim watched.", F(26), WHITE, glow=PURPLE, align="center")
    return img

# 14. ROADMAP — proven / observed / hypothesized
def p_roadmap():
    img = new_page(); starfield(img, 90)
    text(img, (W//2, 90), "ROADMAP", F(44, bold=True), GREEN, glow=GREEN, align="center")
    text(img, (W//2, 150), "honesty is the protocol", F(26), DIM, align="center")
    colw = (W-260)//3
    headers = [("PROVEN", GREEN), ("OBSERVED", GOLD), ("HYPOTHESIZED", MAGENTA)]
    proven = ["φ² = φ + 1", "φ⁻¹ = φ − 1", "Collatz ≤ 10,000", "Ramsey R(3,3)=6", "Ancient Sorry closure", "WORM seal ≤ 2^-256"]
    observed = ["router drop on PLEASE-load", "agent codegen failures", "INTERCAL ingest outcomes", "9-link chain mints", "entropy E = 0.0932"]
    hyp = ["invariant-centered AI", "router token sensitivity", "witness logical-error bound", "I₄ E₇ uniqueness (axiom)"]
    for i, (ht, hc) in enumerate(headers):
        x = 130 + i*colw
        add_glow(img, lambda d, x=x, hc=hc: d.line([(x, 250),(x+colw-30, 250)], fill=hc, width=2), blur=12, alpha=0.7)
        text(img, (x, 270), ht, F(28, bold=True), WHITE, glow=hc)
        items = [proven, observed, hyp][i]
        y = 340
        for it in items:
            text(img, (x, y), "• " + it, F(22), WHITE)
            y += 70
    text(img, (W//2, 1300), "The seal bounds forgery. It does not bound correlated error — yet.", F(24), GOLD, glow=GOLD, align="center")
    return img

# 15. CLOSING
def p_closing():
    img = COVER_IMG.copy()
    img = Image.blend(img, Image.new("RGB", (W, H), BG), 0.30)
    img = glitch_bg(img, 8, 0.20)
    vig = Image.new("L", (W, H), 0); vd = ImageDraw.Draw(vig)
    vd.ellipse([-300, -300, W+300, H+300], fill=255); vig = vig.filter(ImageFilter.GaussianBlur(200))
    img = Image.composite(img, Image.new("RGB", (W, H), BG), vig)
    add_glow(img, lambda d: d.text((W//2, 560), "Ω", font=F(140), fill=CYAN), blur=40, alpha=1.0)
    text(img, (W//2, 760), "THE CAGE HOLDS.", F(64, bold=True), GREEN, glow=GREEN, align="center")
    text(img, (W//2, 860), "No sorry remains.", F(44, bold=True), WHITE, glow=CYAN, align="center")
    add_glow(img, lambda d: d.line([(300, 1000), (W-300, 1000)], fill=MAGENTA, width=2), blur=14, alpha=0.7)
    text(img, (W//2, 1060), "Evidence or Silence.", F(38, bold=True), MAGENTA, glow=MAGENTA, align="center")
    text(img, (W//2, 1240), "SNAPKITTYWEST · Sovereign Compute · 2026", F(26), DIM, align="center")
    text(img, (W//2, 1290), "github.com/SNAPKITTYWEST", F(22), DIM, align="center")
    text(img, (W//2, 1330), "doi.org/10.5281/zenodo.21132094", F(22), DIM, align="center")
    return img

# ---- assemble ----
builders = [
    p_cover, p_mission, p_constellation, p_arch, p_worm,
    p_sieve, p_gates, p_intercal, p_telemetry, p_echo,
    p_quantum, p_orion, p_agents2, p_roadmap, p_closing,
]
os.makedirs(os.path.dirname(OUT), exist_ok=True)
imgs = [b() for b in builders]

from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
PW, PH = W/150.0*72.0, H/150.0*72.0  # points
c = canvas.Canvas(OUT, pagesize=(PW, PH))
for im in imgs:
    c.setFillColorRGB(0, 0, 0)
    c.rect(0, 0, PW, PH, fill=1, stroke=0)
    c.drawImage(ImageReader(im), 0, 0, width=PW, height=PH, mask="auto")
    c.showPage()
c.setTitle("SnapKitty Cosmic Field Manifesto")
c.save()
print("WROTE", OUT, "pages", len(imgs))
