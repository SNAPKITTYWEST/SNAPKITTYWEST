"""
Sanitize Unicode in the MATHLIB5 LaTeX sources so pdflatex (with inputenc utf8)
builds cleanly:
  - Inside lstlisting environments -> ASCII-safe tokens.
  - Outside (text/verbatim/title) -> LaTeX math/replacement commands.
"""
import os, re

ROOT = r"C:\Users\jessi\SNAPKITTYWEST\paper\mathlib5\full"

inside_map = {
    '←': '<-', '⍳': 'iota', '⍵': 'omega', '⍝': '#', '÷': '/', 'Σ': 'Sum',
    '²': '^2', '³': '^3',
    'Ω': 'Omega', '∧': 'and', '○': 'o', '◇': '<>', '△': '^', '⬡': 'hex',
    '⌹': '[]', '☉': '(*)', '·': '.', '—': '--', '→': '->', 'λ': 'lambda',
    '∀': 'forall', '∃': 'exists', '⇒': '=>', '⇐': '<=', '⊢': '|-', '⊨': '|=',
    '×': '*', '≤': '<=', '≥': '>=', '≠': '!=', '≈': '~=', '∞': 'inf',
    '•': '.', '✓': 'OK', '✗': 'XX', '‘': "'", '’': "'", '“': '"', '”': '"',
    '…': '...', '′': "'", '⟦': '[[', '⟧': ']]',
}
outside_map = {
    'Ω': r'$\Omega$', '∧': r'$\wedge$', '○': r'$\circ$', '◇': r'$\Diamond$',
    '△': r'$\triangle$', '⬡': r'$\hexagon$', '⌹': r'$\Box$', '☉': r'$\odot$',
    '←': r'$\leftarrow$', '⍳': r'$\iota$', '⍵': r'$\omega$', '·': r'$\cdot$',
    '—': '---', 'Σ': r'$\Sigma$', '²': r'$^{2}$', '³': r'$^{3}$', '→': r'$\rightarrow$',
    'λ': r'$\lambda$', '∀': r'$\forall$', '∃': r'$\exists$', '⇒': r'$\Rightarrow$',
    '⇐': r'$\Leftarrow$', '⊢': r'$\vdash$', '⊨': r'$\models$', '×': r'$\times$',
    '≤': r'$\leq$', '≥': r'$\geq$', '≠': r'$\neq$', '≈': r'$\approx$', '∞': r'$\infty$',
    '•': r'$\bullet$', '✓': r'$\checkmark$', '✗': r'$\xmark$', '‘': '`', '’': "'",
    '“': '``', '”': "''", '…': r'$\dots$', '′': "'", '⟦': '[[', '⟧': ']]',
}

lst_re = re.compile(r'(\\begin\{lstlisting\}.*?\\end\{lstlisting\})', re.DOTALL)

def sanitize(text):
    # protect listing bodies
    listings = []
    def stash(m):
        body = m.group(1)
        for k, v in inside_map.items():
            body = body.replace(k, v)
        listings.append(body)
        return "\x00LST%d\x00" % (len(listings) - 1)
    text = lst_re.sub(stash, text)
    # outside map
    for k, v in outside_map.items():
        text = text.replace(k, v)
    # restore listings
    def restore(m):
        idx = int(m.group(1))
        return listings[idx]
    text = re.sub(r'\x00LST(\d+)\x00', restore, text)
    return text

count = 0
for dirpath, _, files in os.walk(ROOT):
    if os.path.normpath(dirpath).endswith('figs'):
        continue
    for fn in files:
        if not fn.endswith('.tex'):
            continue
        p = os.path.join(dirpath, fn)
        with open(p, 'r', encoding='utf-8') as f:
            orig = f.read()
        new = sanitize(orig)
        if new != orig:
            with open(p, 'w', encoding='utf-8') as f:
                f.write(new)
            count += 1
            print("sanitized:", os.path.relpath(p, ROOT))
print("done; files changed:", count)
