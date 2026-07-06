import re

files = [
    r"C:\Users\jessi\Downloads\SNAP_OS_Working_Paper_Full.pdf",
    r"C:\Users\jessi\Downloads\Untitled Project.pdf",
    r"C:\Users\jessi\Downloads\Book Jun 24, 2026.pdf",
    r"C:\Users\jessi\Downloads\10,000.pdf",
    r"C:\Users\jessi\Desktop\bobs control repo\RANSOM-WORM-FULL-DECK.pdf",
]

for path in files:
    try:
        with open(path, "rb") as f:
            content = f.read()
            pages = len(re.findall(rb'/Type\s*/Page[^s]', content))
            size_mb = len(content) / (1024*1024)
            print(f"{size_mb:.1f} MB, ~{pages} pages: {path}")
    except Exception as e:
        print(f"Error: {path} - {e}")
