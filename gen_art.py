#!/usr/bin/env python3
"""Generate the SnapKitty cosmic art set.

Each scene emits BOTH:
  - an SVG file (vector, real feGaussianBlur glow filters -> crisp on LinkedIn)
  - a matching PNG raster (for the booklet PDF)

A tiny scene-graph keeps the two renderers in sync.
"""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter

ROOT = r"C:\Users\jessi\SNAPKITTYWEST"
ART = os.path.join(ROOT, "docs", "booklet", "art")
os.makedirs(ART, exist_ok=True)

W, H = 1240, 1754
BG = (5, 2, 12)
CYAN = (60, 220, 255)
MAGENTA = (255, 56, 214)
GREEN = (70, 255, 120)
PURPLE = (165, 110, 255)
GOLD = (255, 210, 90)
WHITE = (235, 242, 255)
DIM = (120, 132, 165)

random.seed(2026)

class Scene:
    def __init__(self, bg=BG):
        self.items = []
        self.bg = bg
    def stars(self, n=160, maxr=1.8, pal=None):
        pal = pal or [WHITE, (180, 210, 255), (255, 220, 240)]
        self.items.append(("stars", n, maxr, pal)); return self
    def rect(self, x, y, w, h, color, opacity=1.0):
        self.items.append(("rect", x, y, w, h, color, opacity)); return self
    def glow_circle(self, cx, cy, r, color, halo=2.4):
        self.items.append(("gcircle", cx, cy, r, color, halo)); return self
    def glow_line(self, x1, y1, x2, y2, color, w=2, halo=4):
        self.items.append(("gline", x1, y1, x2, y2, color, w, halo)); return self
    def glow_poly(self, pts, color, w=2, halo=4):
        self.items.append(("gpoly", pts, color, w, halo)); return self
    def ring(self, cx, cy, r, color, w=2):
        self.items.append(("ring", cx, cy, r, color, w)); return self
    def label(self, x, y, s, size, color, anchor="middle", bold=False, glow=None):
        self.items.append(("label", x, y, s, size, color, anchor, bold, glow)); return self

    def render_png(self):
        img = Image.new("RGB", (W, H), self.bg)
        d = ImageDraw.Draw(img)
        for it in self.items:
            t = it[0]
            if t == "stars":
                _, n, maxr, pal = it
                for _ in range(n):
                    x = random.randint(0, W); y = random.randint(0, H)
                    r = random.uniform(0.4, maxr)
                    c = random.choice(pal)
                    d.ellipse([x-r, y-r, x+r, y+r], fill=c)
            elif t == "rect":
                _, x, y, w, h, c, op = it
                d.rectangle([x, y, x+w, y+h], fill=c)
        for it in self.items:
            t = it[0]
            if t in ("gcircle", "gline", "gpoly"):
                sharp = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                sd = ImageDraw.Draw(sharp)
                if t == "gcircle":
                    _, cx, cy, r, c, halo = it
                    sd.ellipse([cx-r, cy-r, cx+r, cy+r], fill=c)
                    blur = sharp.filter(ImageFilter.GaussianBlur(max(2, r*halo*0.4)))
                    img.paste(Image.alpha_composite(img.convert("RGBA"), blur), (0, 0))
                    img.paste(Image.alpha_composite(img.convert("RGBA"), sharp), (0, 0))
                elif t == "gline":
                    _, x1, y1, x2, y2, c, w, halo = it
                    sd.line([x1, y1, x2, y2], fill=c, width=w)
                    blur = sharp.filter(ImageFilter.GaussianBlur(halo))
                    img.paste(Image.alpha_composite(img.convert("RGBA"), blur), (0, 0))
                    img.paste(Image.alpha_composite(img.convert("RGBA"), sharp), (0, 0))
                elif t == "gpoly":
                    _, pts, c, w, halo = it
                    sd.line(pts, fill=c, width=w, joint="curve")
                    blur = sharp.filter(ImageFilter.GaussianBlur(halo))
                    img.paste(Image.alpha_composite(img.convert("RGBA"), blur), (0, 0))
                    img.paste(Image.alpha_composite(img.convert("RGBA"), sharp), (0, 0))
            elif t == "ring":
                _, cx, cy, r, c, w = it
                d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=c, width=w)
            elif t == "label":
                _, x, y, s, size, c, anchor, bold, glow = it
                fp = r"C:\Windows\Fonts\%s" % ("consolab.ttf" if bold else "consola.ttf")
                try:
                    from PIL import ImageFont
                    font = ImageFont.truetype(fp, size) if os.path.exists(fp) else ImageFont.load_default()
                except Exception:
                    font = ImageDraw.getfont()
                panchor = {"middle": "mm", "left": "lm", "right": "rm"}[anchor]
                if glow:
                    add = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                    ImageDraw.Draw(add).text((x, y), s, font=font, fill=glow, anchor=panchor)
                    blur = add.filter(ImageFilter.GaussianBlur(14))
                    img.paste(Image.alpha_composite(img.convert("RGBA"), blur), (0, 0))
                d.text((x, y), s, font=font, fill=c, anchor=panchor)
        return img

    def to_svg(self):
        s = ['<?xml version="1.0" encoding="UTF-8"?>']
        s.append('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H))
        s.append('<defs><filter id="glow" x="-60%%" y="-60%%" width="220%%" height="220%%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>')
        s.append('<radialGradient id="vig" cx="50%%" cy="42%%" r="75%%"><stop offset="0%%" stop-color="#0a0420"/><stop offset="100%%" stop-color="#05010c"/></radialGradient></defs>')
        s.append('<rect width="%d" height="%d" fill="url(#vig)"/>' % (W, H))
        for it in self.items:
            t = it[0]
            if t == "stars":
                _, n, maxr, pal = it
                for _ in range(n):
                    x = random.randint(0, W); y = random.randint(0, H)
                    r = round(random.uniform(0.4, maxr), 2)
                    c = "#%02x%02x%02x" % random.choice(pal)
                    s.append('<circle cx="%d" cy="%d" r="%s" fill="%s" opacity="%.2f"/>' % (x, y, r, c, random.uniform(0.4, 1.0)))
            elif t == "rect":
                _, x, y, w, h, c, op = it
                s.append('<rect x="%d" y="%d" width="%d" height="%d" fill="#%02x%02x%02x" opacity="%.2f"/>' % (x, y, w, h, c[0], c[1], c[2], op))
            elif t == "gcircle":
                _, cx, cy, r, c, halo = it
                s.append('<g filter="url(#glow)"><circle cx="%d" cy="%d" r="%d" fill="#%02x%02x%02x"/></g>' % (cx, cy, r, c[0], c[1], c[2]))
            elif t == "gline":
                _, x1, y1, x2, y2, c, w, halo = it
                s.append('<g filter="url(#glow)"><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#%02x%02x%02x" stroke-width="%d" stroke-linecap="round"/></g>' % (x1, y1, x2, y2, c[0], c[1], c[2], w))
            elif t == "gpoly":
                _, pts, c, w, halo = it
                pp = " ".join("%d,%d" % (px, py) for px, py in pts)
                s.append('<g filter="url(#glow)"><polyline points="%s" fill="none" stroke="#%02x%02x%02x" stroke-width="%d" stroke-linecap="round" stroke-linejoin="round"/></g>' % (pp, c[0], c[1], c[2], w))
            elif t == "ring":
                _, cx, cy, r, c, w = it
                s.append('<circle cx="%d" cy="%d" r="%d" fill="none" stroke="#%02x%02x%02x" stroke-width="%d" opacity="0.8"/>' % (cx, cy, r, c[0], c[1], c[2], w))
            elif t == "label":
                _, x, y, txt, size, c, anchor, bold, glow = it
                anc = {"middle": "middle", "left": "start", "right": "end"}[anchor]
                wt = "bold" if bold else "normal"
                g = ' filter="url(#glow)"' if glow else ''
                s.append('<text x="%d" y="%d" font-family="Consolas, monospace" font-size="%d" font-weight="%s" fill="#%02x%02x%02x" text-anchor="%s"%s>%s</text>' % (x, y, size, wt, c[0], c[1], c[2], anc, g, txt))
        s.append('</svg>')
        return "\n".join(s)

    def save(self, name):
        png = os.path.join(ART, name + ".png")
        svg = os.path.join(ART, name + ".svg")
        self.render_png().save(png)
        open(svg, "w", encoding="utf-8").write(self.to_svg())
        return png, svg

def sc_cover():
    s = Scene(); s.stars(220, 2.0)
    s.glow_circle(W//2, int(H*0.30), 26, CYAN, 3)
    s.ring(W//2, int(H*0.30), 120, CYAN, 2)
    s.ring(W//2, int(H*0.30), 200, PURPLE, 1)
    pts = [(W//2, int(H*0.30))]
    for _ in range(26):
        a = random.uniform(0, 2*math.pi); r = random.uniform(260, 620)
        pts.append((W//2 + r*math.cos(a), int(H*0.30) + r*0.7*math.sin(a)))
    for i in range(1, len(pts)):
        if random.random() < 0.6:
            s.glow_line(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1], DIM, 1, 3)
    for p in pts[1:]:
        s.glow_circle(p[0], p[1], 4, random.choice([CYAN, PURPLE, MAGENTA]), 2)
    s.label(W//2, int(H*0.30), "\u03a9", 200, CYAN, glow=CYAN)
    s.label(W//2, int(H*0.62), "SNAPKITTY", 78, WHITE, bold=True, glow=CYAN)
    s.label(W//2, int(H*0.69), "SOVEREIGN COMPUTE", 50, CYAN, bold=True, glow=CYAN)
    s.label(W//2, int(H*0.76), "A COSMIC FIELD MANIFESTO", 30, MAGENTA, glow=MAGENTA)
    return s

def sc_constellation():
    s = Scene(); s.stars(200, 1.8)
    nodes = {"ORION":(320,360,CYAN),"ECHO":(940,300,PURPLE),"VECTOR":(780,560,GREEN),
             "NOVA":(360,820,GOLD),"RAT":(980,880,MAGENTA),"CAT":(620,1080,CYAN)}
    def P(n): return nodes[n][0], nodes[n][1]
    edges=[("ORION","ECHO"),("ORION","VECTOR"),("ECHO","VECTOR"),("VECTOR","NOVA"),
           ("NOVA","RAT"),("RAT","CAT"),("CAT","ORION"),("VECTOR","CAT"),("ECHO","RAT")]
    for a,b in edges:
        s.glow_line(P(a)[0],P(a)[1],P(b)[0],P(b)[1],DIM,2,4)
    for nm,(x,y,c) in nodes.items():
        s.glow_circle(x,y,12,c,3)
        s.label(x,y+34,nm,26,WHITE,bold=True,glow=c)
    s.label(W//2,1500,"THE AGENT CONSTELLATION",40,CYAN,bold=True,glow=CYAN)
    return s

def sc_worm():
    s = Scene(); s.stars(150, 1.6)
    cols=[CYAN,GREEN,GOLD,PURPLE,MAGENTA,CYAN,GREEN,GOLD,MAGENTA]
    n=9; cx=W//2; cy=H//2+40; R=470
    for i in range(n):
        a=2*math.pi*i/n-math.pi/2
        x=cx+R*math.cos(a); y=cy+R*0.66*math.sin(a)
        j=(i+1)%n
        a2=2*math.pi*j/n-math.pi/2
        x2=cx+R*math.cos(a2); y2=cy+R*0.66*math.sin(a2)
        s.glow_line(x,y,x2,y2,DIM,2,4)
    for i in range(n):
        a=2*math.pi*i/n-math.pi/2
        x=cx+R*math.cos(a); y=cy+R*0.66*math.sin(a)
        c=cols[i]
        s.glow_circle(x,y,16,c,3)
        s.label(x,y-70,"WORM#%02d"%i,24,WHITE,bold=True,glow=c)
    s.label(cx,cy,"CHAIN",30,WHITE,bold=True)
    s.label(W//2,H-120,"THE WORM CHAIN \u00b7 9 CELESTIAL NODES",36,GREEN,bold=True,glow=GREEN)
    return s

def sc_sieve():
    s = Scene(); s.stars(130,1.5)
    cx,cy=W//2,H//2-40; R=520
    cols=[CYAN,GREEN,GOLD,PURPLE,MAGENTA,CYAN,GREEN,GOLD,PURPLE,MAGENTA]
    for i in range(10):
        a=2*math.pi*i/10-math.pi/2
        x=cx+R*math.cos(a); y=cy+R*0.7*math.sin(a)
        c=cols[i]
        s.glow_line(cx,cy,x,y,DIM,1,3)
        s.glow_circle(x,y,14,c,3)
        s.label(x,y-60,"G%d"%(i+1),24,WHITE,bold=True,glow=c)
    s.glow_circle(cx,cy,44,WHITE,3)
    s.label(cx,cy,"SIEVE",30,BG,bold=True)
    s.label(W//2,H-120,"THE COSMIC INVARIANT SIEVE",38,MAGENTA,bold=True,glow=MAGENTA)
    return s

def sc_gates():
    s = Scene(); s.stars(160,1.6)
    random.seed(7)
    for _ in range(6):
        cx=random.randint(220,W-220); cy=random.randint(300,H-500)
        R=random.randint(140,260); c=random.choice([CYAN,GREEN,MAGENTA,GOLD])
        s.ring(cx,cy,R,c,2); s.ring(cx,cy,int(R*0.6),c,1)
        a=random.uniform(0,2*math.pi)
        s.glow_circle(cx+int(R*math.cos(a)),cy+int(R*0.7*math.sin(a)),12,c,3)
    s.label(W//2,H-120,"GATE GEOMETRY \u00b7 ORBITAL VERIFICATION",36,PURPLE,bold=True,glow=PURPLE)
    return s

def sc_intercal():
    s = Scene(); s.stars(120,1.4)
    pts=[(300,400),(520,300),(760,460),(900,640),(640,760),(380,720),(300,400)]
    s.glow_poly(pts,GREEN,3,5)
    s.glow_circle(760,460,18,MAGENTA,3)
    s.glow_circle(520,300,12,CYAN,2)
    s.glow_circle(900,640,12,GOLD,2)
    s.glow_line(760,460,640,760,MAGENTA,3,6)
    s.label(W//2,1200,"COME FROM (99999)",44,WHITE,bold=True,glow=GOLD)
    s.label(W//2,1280,"THE INTERCAL TRIPWIRE",34,GREEN,bold=True,glow=GREEN)
    return s

def sc_echo():
    s = Scene(); s.stars(90,1.3)
    random.seed(3)
    for _ in range(70):
        x=random.randint(0,W); y=random.randint(0,H)
        w=random.randint(20,160); h=random.randint(6,40)
        c=random.choice([PURPLE,MAGENTA,CYAN,GOLD])
        s.rect(x,y,w,h,c,random.uniform(0.10,0.45))
    s.glow_circle(W//2,300,60,PURPLE,4)
    s.label(W//2,300,"ECHO",90,WHITE,bold=True,glow=PURPLE)
    s.label(W//2,430,"RESEARCH LAB \u00b7 GLITCH DIVISION",28,MAGENTA,glow=MAGENTA)
    return s

def sc_quantum():
    s = Scene(); s.stars(140,1.5)
    cx,cy=W//2,H//2
    s.ring(cx,cy,300,CYAN,2); s.ring(cx,cy,210,MAGENTA,2); s.ring(cx,cy,120,GREEN,2)
    s.glow_poly([(cx,cy-200),(cx-175,cy+140),(cx+175,cy+140)],MAGENTA,3,5)
    for i in range(6):
        a=2*math.pi*i/6
        s.glow_circle(cx+int(250*math.cos(a)),cy+int(250*math.sin(a)),10,GOLD,2)
    s.glow_circle(cx,cy,16,WHITE,3)
    s.label(cx,cy-10,"I\u2084",44,WHITE,bold=True)
    s.label(W//2,H-120,"QUANTUM SYMBOLISM \u00b7 J\u2083(\u2115)\u2297\u210d",34,GOLD,bold=True,glow=GOLD)
    return s

def sc_orion():
    s = Scene(); s.stars(140,1.6)
    cx,cy=W//2,520
    for r in (200,150,100):
        s.ring(cx,cy,r,CYAN,2)
    s.glow_line(cx-200,cy,cx+200,cy,CYAN,2,4)
    s.glow_line(cx,cy-200,cx,cy+200,CYAN,2,4)
    s.glow_circle(cx,cy,14,WHITE,3)
    s.label(cx,cy+260,"ORION",70,WHITE,bold=True,glow=CYAN)
    s.label(cx,cy+340,"CONSTELLATION PRIME",28,CYAN,glow=CYAN)
    return s

def sc_agents2():
    s = Scene(); s.stars(120,1.5)
    cx,cy=360,500
    s.glow_poly([(cx,cy-120),(cx-110,cy+90),(cx+110,cy+90)],PURPLE,3,5)
    s.ring(cx,cy-10,120,PURPLE,2)
    s.label(cx,cy+240,"ECHO",52,WHITE,bold=True,glow=PURPLE)
    cx2,cy2=880,500
    for k in range(3):
        a0=k*2*math.pi/3-math.pi/2
        s.glow_line(cx2,cy2,cx2+int(140*math.cos(a0)),cy2+int(140*math.sin(a0)),GREEN,3,5)
    s.glow_circle(cx2,cy2,14,WHITE,3)
    s.label(cx2,cy2+240,"VECTOR",52,WHITE,bold=True,glow=GREEN)
    s.label(W//2,H-120,"AGENT ROSTER \u00b7 NINE WATCHERS",34,PURPLE,bold=True,glow=PURPLE)
    return s

def sc_closing():
    s = Scene(); s.stars(220,2.0)
    s.glow_circle(W//2,int(H*0.42),30,CYAN,3)
    s.ring(W//2,int(H*0.42),140,CYAN,2)
    for _ in range(22):
        a=random.uniform(0,2*math.pi); r=random.uniform(220,560)
        x=W//2+int(r*math.cos(a)); y=int(H*0.42)+int(r*0.7*math.sin(a))
        s.glow_circle(x,y,4,random.choice([CYAN,PURPLE,MAGENTA]),2)
    s.label(W//2,int(H*0.42),"\u03a9",170,CYAN,glow=CYAN)
    s.label(W//2,int(H*0.66),"THE CAGE HOLDS",70,GREEN,bold=True,glow=GREEN)
    s.label(W//2,int(H*0.73),"No sorry remains.",46,WHITE,bold=True,glow=CYAN)
    return s

SCENES = {
    "art_cover": sc_cover, "art_constellation": sc_constellation, "art_worm": sc_worm,
    "art_sieve": sc_sieve, "art_gates": sc_gates, "art_intercal": sc_intercal,
    "art_echo": sc_echo, "art_quantum": sc_quantum, "art_orion": sc_orion,
    "art_agents2": sc_agents2, "art_closing": sc_closing,
}

if __name__ == "__main__":
    for name, fn in SCENES.items():
        fn().save(name)
        print("saved", name)
    print("DONE", len(SCENES), "scenes")
