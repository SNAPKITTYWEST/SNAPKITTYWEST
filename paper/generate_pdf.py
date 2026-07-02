#!/usr/bin/env python3
"""Convert SNAPKITTYWEST paper from Markdown to PDF for Zenodo upload."""

from fpdf import FPDF
import re
from pathlib import Path

class PaperPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 100, 100)
            self.cell(0, 10, "SNAPKITTYWEST Sovereign Compute Architecture", 0, 0, "C")
            self.ln(5)
            self.set_draw_color(100, 100, 100)
            self.line(10, 15, 200, 15)
            self.ln(10)
    
    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, str(self.page_no()), 0, 0, "C")

def sanitize_text(text):
    """Replace Unicode characters with ASCII equivalents."""
    # First, try to encode to latin-1 and decode back
    try:
        text = text.encode('latin-1', errors='replace').decode('latin-1')
    except:
        pass
    
    replacements = {
        '\u2014': '--',  # em dash
        '\u2013': '-',   # en dash
        '\u2018': "'",   # left single quote
        '\u2019': "'",   # right single quote
        '\u201c': '"',   # left double quote
        '\u201d': '"',   # right double quote
        '\u2026': '...', # ellipsis
        '\u2022': '*',   # bullet
        '\u2192': '->',  # right arrow
        '\u2190': '<-',  # left arrow
        '\u2264': '<=',  # less than or equal
        '\u2265': '>=',  # greater than or equal
        '\u2260': '!=',  # not equal
        '\u221e': 'inf', # infinity
        '\u03b1': 'alpha',
        '\u03b2': 'beta',
        '\u03b3': 'gamma',
        '\u03b4': 'delta',
        '\u03b5': 'epsilon',
        '\u03b6': 'zeta',
        '\u03b7': 'eta',
        '\u03b8': 'theta',
        '\u03b9': 'iota',
        '\u03ba': 'kappa',
        '\u03bb': 'lambda',
        '\u03bc': 'mu',
        '\u03bd': 'nu',
        '\u03be': 'xi',
        '\u03bf': 'omicron',
        '\u03c0': 'pi',
        '\u03c1': 'rho',
        '\u03c3': 'sigma',
        '\u03c4': 'tau',
        '\u03c5': 'upsilon',
        '\u03c6': 'phi',
        '\u03c7': 'chi',
        '\u03c8': 'psi',
        '\u03c9': 'omega',
        '\u0391': 'Alpha',
        '\u0392': 'Beta',
        '\u0393': 'Gamma',
        '\u0394': 'Delta',
        '\u0395': 'Epsilon',
        '\u0396': 'Zeta',
        '\u0397': 'Eta',
        '\u0398': 'Theta',
        '\u0399': 'Iota',
        '\u039a': 'Kappa',
        '\u039b': 'Lambda',
        '\u039c': 'Mu',
        '\u039d': 'Nu',
        '\u039e': 'Xi',
        '\u039f': 'Omicron',
        '\u03a0': 'Pi',
        '\u03a1': 'Rho',
        '\u03a3': 'Sigma',
        '\u03a4': 'Tau',
        '\u03a5': 'Upsilon',
        '\u03a6': 'Phi',
        '\u03a7': 'Chi',
        '\u03a8': 'Psi',
        '\u03a9': 'Omega',
        '\u2211': 'Sum',
        '\u220f': 'Prod',
        '\u222b': 'Integral',
        '\u2202': 'partial',
        '\u2207': 'nabla',
        '\u221a': 'sqrt',
        '\u221d': 'propto',
        '\u2248': 'approx',
        '\u2261': 'equiv',
        '\u22a5': 'perp',
        '\u22a4': 'top',
        '\u22a2': 'vdash',
        '\u22a3': 'dashv',
        '\u2234': 'therefore',
        '\u2235': 'because',
        '\u22c4': 'diamond',
        '\u25ca': 'lozenge',
        '\u25cb': 'circle',
        '\u25cf': 'bullet',
        '\u25a0': 'square',
        '\u25a1': 'square',
        '\u25b2': 'triangle',
        '\u25bc': 'triangle',
        '\u25b6': 'triangle',
        '\u25c0': 'triangle',
        '\u2020': '+',  # dagger
        '\u2021': '++', # double dagger
        '\u00b0': 'deg', # degree
        '\u00b1': '+/-', # plus-minus
        '\u00d7': 'x',   # multiplication
        '\u00f7': '/',   # division
        '\u00a0': ' ',   # non-breaking space
        '\u200b': '',    # zero-width space
        '\u200c': '',    # zero-width non-joiner
        '\u200d': '',    # zero-width joiner
        '\u200e': '',    # left-to-right mark
        '\u200f': '',    # right-to-left mark
        '\u2028': '\n',  # line separator
        '\u2029': '\n',  # paragraph separator
        '\ufeff': '',    # BOM
    }
    
    for unicode_char, ascii_equiv in replacements.items():
        text = text.replace(unicode_char, ascii_equiv)
    
    # Remove any remaining non-latin-1 characters
    result = ""
    for char in text:
        try:
            char.encode('latin-1')
            result += char
        except UnicodeEncodeError:
            result += "?"
    
    return result

def safe_text(text):
    """Ensure text is safe for PDF rendering."""
    # Sanitize
    text = sanitize_text(text)
    # Remove any control characters except newline and tab
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    # Replace multiple spaces with single space
    text = re.sub(r'  +', ' ', text)
    return text

def parse_markdown_to_pdf(md_file, pdf_file):
    """Parse markdown and create PDF."""
    
    # Read markdown
    with open(md_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Create PDF
    pdf = PaperPDF()
    pdf.set_compression(False)  # Disable compression for readable text
    pdf.set_auto_page_break(auto=True, margin=25)
    pdf.add_page()
    
    # Title page
    pdf.set_font("Helvetica", "B", 24)
    pdf.ln(40)
    pdf.cell(0, 12, "SNAPKITTYWEST", 0, 1, "C")
    pdf.set_font("Helvetica", "B", 16)
    pdf.ln(5)
    pdf.multi_cell(0, 10, "Sovereign Compute Architecture with\nLinear Types, WORM Seals, Goldilocks\nField Arithmetic, and Settlement Witnesses", 0, "C")
    pdf.ln(20)
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, "SnapKitty Collective", 0, 1, "C")
    pdf.ln(5)
    pdf.cell(0, 8, "2026-07-02", 0, 1, "C")
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 10)
    pdf.cell(0, 8, "DOI: 10.5281/zenodo.21132094", 0, 1, "C")
    pdf.ln(3)
    pdf.cell(0, 8, "ORCID: 0009-0006-1916-5245", 0, 1, "C")
    pdf.ln(3)
    pdf.cell(0, 8, "Zenodo-ready corrected technical paper", 0, 1, "C")
    
    # Process content line by line
    pdf.add_page()
    
    lines = content.split("\n")
    i = 0
    in_code_block = False
    code_buffer = []
    
    while i < len(lines):
        line = lines[i]
        
        # Skip frontmatter
        if i == 0 and line.strip() == "---":
            i += 1
            while i < len(lines) and lines[i].strip() != "---":
                i += 1
            i += 1
            continue
        
        # Handle code blocks
        if line.strip().startswith("```"):
            if in_code_block:
                # End code block
                pdf.set_font("Courier", "", 8)
                pdf.set_fill_color(240, 240, 240)
                code_text = "\n".join(code_buffer)
                # Print each code line using cell (not multi_cell) to avoid width issues
                for code_line in code_text.split("\n"):
                    code_line = safe_text(code_line)
                    # Strip leading whitespace
                    code_line_stripped = code_line.lstrip()
                    if not code_line_stripped:
                        # Empty line in code block - just add a small line
                        pdf.set_font("Courier", "", 8)
                        pdf.cell(0, 3.5, "", 0, 1, "L", True)
                        continue
                    # Limit line length to 80 chars
                    display_line = code_line_stripped[:80]
                    pdf.set_font("Courier", "", 8)
                    pdf.cell(0, 3.5, "  " + display_line, 0, 1, "L", True)
                pdf.ln(3)
                code_buffer = []
                in_code_block = False
            else:
                # Start code block
                in_code_block = True
            i += 1
            continue
        
        if in_code_block:
            code_buffer.append(line)
            i += 1
            continue
        
        # Sanitize line
        line = safe_text(line)
        
        # Handle headings
        if line.startswith("# "):
            pdf.set_font("Helvetica", "B", 18)
            pdf.ln(8)
            pdf.set_x(10)
            pdf.cell(0, 10, line[2:].strip(), 0, 1, "L")
            pdf.ln(4)
        elif line.startswith("## "):
            pdf.set_font("Helvetica", "B", 14)
            pdf.ln(6)
            pdf.set_x(10)
            pdf.cell(0, 8, line[3:].strip(), 0, 1, "L")
            pdf.ln(3)
        elif line.startswith("### "):
            pdf.set_font("Helvetica", "B", 12)
            pdf.ln(4)
            pdf.set_x(10)
            pdf.cell(0, 7, line[4:].strip(), 0, 1, "L")
            pdf.ln(2)
        # Handle blockquotes
        elif line.strip().startswith("> "):
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(80, 80, 80)
            pdf.set_x(15)
            pdf.cell(0, 6, line.strip()[2:], 0, 1, "L")
            pdf.set_text_color(0, 0, 0)
            pdf.set_x(10)
            pdf.ln(2)
        # Handle horizontal rules
        elif line.strip() == "---":
            pdf.ln(5)
            pdf.set_draw_color(100, 100, 100)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(5)
        # Handle empty lines
        elif line.strip() == "":
            pdf.set_x(10)  # Reset to left margin
            pdf.ln(3)
        # Handle table rows
        elif line.strip().startswith("|"):
            # Skip table separator lines
            if re.match(r'^\|[\s\-\|]+\|$', line.strip()):
                i += 1
                continue
            # Parse table cells
            cells = [c.strip() for c in line.strip().split("|")[1:-1]]
            pdf.set_font("Helvetica", "", 9)
            row_text = " | ".join(cells)
            if len(row_text) > 90:
                row_text = row_text[:87] + "..."
            pdf.set_x(10)
            pdf.cell(0, 5, row_text, 0, 1, "L")
        # Handle regular text
        else:
            # Clean up markdown formatting
            clean_line = line
            clean_line = re.sub(r'\*\*(.+?)\*\*', r'\1', clean_line)  # Remove bold
            clean_line = re.sub(r'\*(.+?)\*', r'\1', clean_line)  # Remove italic
            clean_line = re.sub(r'`(.+?)`', r'\1', clean_line)  # Remove inline code
            
            pdf.set_font("Helvetica", "", 10)
            pdf.set_x(10)
            # Split long lines using cell instead of multi_cell
            if len(clean_line) > 95:
                words = clean_line.split()
                current_line = ""
                for word in words:
                    if len(current_line) + len(word) + 1 > 95:
                        pdf.cell(0, 5, current_line, 0, 1, "L")
                        current_line = word
                    else:
                        current_line = current_line + " " + word if current_line else word
                if current_line:
                    pdf.cell(0, 5, current_line, 0, 1, "L")
            else:
                pdf.cell(0, 5, clean_line, 0, 1, "L")
        
        i += 1
    
    # Save PDF
    pdf.output(str(pdf_file))
    print(f"PDF saved to: {pdf_file}")
    print(f"PDF size: {pdf_file.stat().st_size / 1024:.1f} KB")

if __name__ == "__main__":
    md_path = Path("paper/PAPER.md")
    pdf_path = Path("paper/SNAPKITTYWEST_ZENODO.pdf")
    
    parse_markdown_to_pdf(md_path, pdf_path)
