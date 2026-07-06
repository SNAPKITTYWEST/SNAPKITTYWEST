import re
import sys

def extract_pdf_text(path):
    """Very basic PDF text extraction."""
    with open(path, "rb") as f:
        raw = f.read()
    
    # Find all text strings in parentheses: (text)
    texts = []
    for match in re.finditer(rb'\(([^\)]{2,})\)', raw):
        try:
            t = match.group(1).decode('latin-1')
            if any(c.isalpha() for c in t):
                texts.append(t)
        except:
            pass
    return texts

print("=== SNAPKITTYWEST_ZENODO.pdf ===")
texts = extract_pdf_text("paper/SNAPKITTYWEST_ZENODO.pdf")
print(f"Total text segments: {len(texts)}")
print("First 30 segments:")
for i, t in enumerate(texts[:30]):
    safe = t.encode('ascii', errors='replace').decode('ascii')
    print(f"  [{i}] {safe[:100]}")

print("\nLast 10 segments:")
for i, t in enumerate(texts[-10:]):
    safe = t.encode('ascii', errors='replace').decode('ascii')
    print(f"  [{len(texts)-10+i}] {safe[:100]}")

# Check for key sections
all_text = " ".join(texts)
all_text_ascii = all_text.encode('ascii', errors='replace').decode('ascii')
sections = ["Introduction", "Prior Art", "Architecture", "Linear Types", 
            "Goldilocks", "PIRTM", "EmojiScript", "WORM", "Conclusion",
            "sovereign-addr", "sovereign-prism", "sovereign-pirtm",
            "sovereign-agt", "sovereign-compiler", "sovereign-multiplicity",
            "sovereign-adr", "Claude Intel"]
print("\n=== Section Coverage ===")
for s in sections:
    found = s.lower() in all_text_ascii.lower()
    print(f"  {'[OK]' if found else '[MISSING]'} {s}")
