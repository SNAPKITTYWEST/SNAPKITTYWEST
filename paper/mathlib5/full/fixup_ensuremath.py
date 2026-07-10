"""
Fixup pass: wrap bare Greek/symbol control sequences (produced by the
unicode sanitizer) in \ensuremath{} so they compile inside \texttt{} and
verbatim contexts as well as ordinary text.
"""
import os, re

ROOT = r"C:\Users\jessi\SNAPKITTYWEST\paper\mathlib5\full"
cmds = ['Omega','wedge','circ','Diamond','triangle','hexagon','Box','odot',
        'leftarrow','iota','omega','cdot','Sigma','rightarrow','lambda',
        'forall','exists','Rightarrow','Leftarrow','vdash','models','times',
        'leq','geq','neq','approx','infty','bullet','checkmark','xmark','dots']
pat = re.compile(r'\\(' + '|'.join(cmds) + r')')

def fixup(text):
    return pat.sub(r'\\ensuremath{\1}', text)

n = 0
for dp, _, fns in os.walk(ROOT):
    if os.path.normpath(dp).endswith('figs'):
        continue
    for fn in fns:
        if not fn.endswith('.tex'):
            continue
        if fn == 'mathlib5_full.tex':
            continue
        p = os.path.join(dp, fn)
        s = open(p, encoding='utf-8').read()
        t = fixup(s)
        if t != s:
            open(p, 'w', encoding='utf-8').write(t)
            n += 1
            print('fixed', os.path.relpath(p, ROOT))
print('done', n)
