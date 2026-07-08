#!/usr/bin/env python3
"""
MathRosetta AXIOM Translator — LaTeX → AXIOM Proof Syntax

Translates LaTeX mathematical notation into AXIOM proof assistant syntax.
Supports theorem statements, quantifiers, and proof skeletons.
"""

import re
import time
from typing import Optional


# ── Domain Mapping ────────────────────────────────────────────────────────────

DOMAIN_MAP = {
    "N": "Nat",
    "Z": "Int",
    "Q": "Rat",
    "R": "Real",
    "C": "Complex",
}


# ── LaTeX → AXIOM Translator ─────────────────────────────────────────────────

class AXIOMTranslator:
    """Translate LaTeX mathematical notation to AXIOM proof syntax."""
    
    def translate_forall(self, var: str, domain: str, body: str) -> str:
        """Translate ∀x ∈ D, body."""
        axiom_domain = DOMAIN_MAP.get(domain, domain)
        return f"∀ ({var} : {axiom_domain}), {body}"
    
    def translate_exists(self, var: str, domain: str, body: str) -> str:
        """Translate ∃x ∈ D, body."""
        axiom_domain = DOMAIN_MAP.get(domain, domain)
        return f"∃ ({var} : {axiom_domain}), {body}"
    
    def translate_theorem(self, name: str, statement: str) -> str:
        """Translate theorem statement to AXIOM."""
        return f"theorem {name} : {statement} := by\n  sorry"
    
    def translate_lemma(self, name: str, statement: str) -> str:
        """Translate lemma statement to AXIOM."""
        return f"lemma {name} : {statement} := by\n  sorry"
    
    def translate_latex_expr(self, latex: str) -> str:
        """Translate a LaTeX math expression to AXIOM syntax."""
        result = latex
        
        # Replace \mathbb{X} with domain names
        for tex_domain, axiom_domain in DOMAIN_MAP.items():
            result = re.sub(rf'\\mathbb{{{tex_domain}}}', axiom_domain, result)
        
        # Replace \forall x \in D, with ∀ (x : D),
        result = re.sub(
            r'\\forall\s+(\w+)\s*\\in\s*(\w+|\\mathbb\{\w+\})\s*,',
            lambda m: f"∀ ({m.group(1)} : {DOMAIN_MAP.get(m.group(2).replace('\\mathbb{', '').replace('}', ''), m.group(2))}),",
            result
        )
        
        # Replace \exists x \in D, with ∃ (x : D),
        result = re.sub(
            r'\\exists\s+(\w+)\s*\\in\s*(\w+|\\mathbb\{\w+\})\s*,',
            lambda m: f"∃ ({m.group(1)} : {DOMAIN_MAP.get(m.group(2).replace('\\mathbb{', '').replace('}', ''), m.group(2))}),",
            result
        )
        
        # Replace \to and \rightarrow with →
        result = re.sub(r'\\(to|rightarrow|implies)', '→', result)
        
        # Replace \land with ∧
        result = result.replace(r'\land', '∧')
        
        # Replace \lor with ∨
        result = result.replace(r'\lor', '∨')
        
        # Replace \lnot and \neg with ¬
        result = re.sub(r'\\(lnot|neg)', '¬', result)
        
        # Replace \leq with ≤
        result = result.replace(r'\leq', '≤')
        
        # Replace \geq with ≥
        result = result.replace(r'\geq', '≥')
        
        # Replace \neq with ≠
        result = result.replace(r'\neq', '≠')
        
        # Replace x^{n} with x^n (simplify braces)
        result = re.sub(r'(\w)\^{(\w+)}', r'\1^\2', result)
        
        # Replace \frac{a}{b} with a/b
        result = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1)/(\2)', result)
        
        # Replace \sqrt{x} with √x
        result = re.sub(r'\\sqrt\{([^}]+)\}', r'√(\1)', result)
        
        # Replace \sum with Σ
        result = result.replace(r'\sum', 'Σ')
        
        # Replace \prod with Π
        result = result.replace(r'\prod', 'Π')
        
        # Replace \int with ∫
        result = result.replace(r'\int', '∫')
        
        # Replace Greek letters
        greek = {
            r'\alpha': 'α', r'\beta': 'β', r'\gamma': 'γ', r'\delta': 'δ',
            r'\phi': 'φ', r'\varphi': 'φ', r'\pi': 'π', r'\sigma': 'σ',
            r'\omega': 'ω', r'\Omega': 'Ω', r'\varepsilon': 'ε', r'\epsilon': 'ε',
            r'\lambda': 'λ', r'\mu': 'μ', r'\nu': 'ν', r'\xi': 'ξ',
            r'\rho': 'ρ', r'\tau': 'τ', r'\chi': 'χ', r'\psi': 'ψ',
        }
        for tex, axiom in greek.items():
            result = result.replace(tex, axiom)
        
        # Clean up remaining backslashes from unknown commands
        result = re.sub(r'\\(\w+)', r'\1', result)
        
        # Remove remaining braces
        result = result.replace('{', '').replace('}', '')
        
        return result.strip()
    
    def translate(self, latex: str) -> str:
        """Full LaTeX → AXIOM translation."""
        return self.translate_latex_expr(latex)


# ── Batch Import ──────────────────────────────────────────────────────────────

def import_from_latex(latex_content: str) -> str:
    """Import LaTeX theorems and convert to AXIOM syntax."""
    translator = AXIOMTranslator()
    
    results = []
    results.append("-- AXIOM proofs imported from LaTeX")
    results.append(f"-- Generated: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")
    results.append("")
    
    # Find theorem/lemma declarations with balanced braces
    pattern = r'\\(theorem|lemma)\{([^}]+)\}\{'
    for match in re.finditer(pattern, latex_content):
        kind = match.group(1)
        name = match.group(2)
        
        # Find the matching closing brace for the statement
        start = match.end()
        depth = 1
        pos = start
        while pos < len(latex_content) and depth > 0:
            if latex_content[pos] == '{':
                depth += 1
            elif latex_content[pos] == '}':
                depth -= 1
            pos += 1
        
        statement = latex_content[start:pos-1]
        axiom_statement = translator.translate(statement)
        
        if kind == "theorem":
            results.append(translator.translate_theorem(name, axiom_statement))
        else:
            results.append(translator.translate_lemma(name, axiom_statement))
        results.append("")
    
    if len(results) <= 3:
        results.append("-- No theorems found in input")
    
    return "\n".join(results)


def import_from_file(filepath: str) -> str:
    """Import LaTeX file and convert to AXIOM syntax."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    return import_from_latex(content)


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  MATHROSETTA AXIOM TRANSLATOR                            ║")
    print("║  LaTeX → AXIOM Proof Syntax                              ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()
    
    translator = AXIOMTranslator()
    
    # Test translations
    tests = [
        (r"\forall n \in \mathbb{N}, n + 0 = n", "add_zero"),
        (r"\forall x \in \mathbb{R}, x^2 \geq 0", "square_nonneg"),
        (r"\forall n \in \mathbb{N}, n > 0 \to n + 0 = n", "add_zero_pos"),
        (r"\forall a b \in \mathbb{R}, a + b = b + a", "add_comm"),
        (r"\exists x \in \mathbb{R}, x^2 = 2", "sqrt2_exists"),
    ]
    
    print("▶ Individual translations:")
    print()
    for latex, name in tests:
        axiom = translator.translate(latex)
        print(f"  LaTeX:   {latex}")
        print(f"  AXIOM:   {axiom}")
        print(f"  Theorem: theorem {name} : {axiom} := by")
        print(f"             sorry")
        print()
    
    # Batch import test
    print("▶ Batch import:")
    print()
    sample_latex = r"""
    \theorem{phi_sq}{\forall x \in \mathbb{R}, x^2 = x + 1}
    \theorem{phi_inv}{\forall x \in \mathbb{R}, x = x - 1}
    \theorem{collatz_reaches_one}{\forall n \in \mathbb{N}, n > 0 \to collatz(n) = 1}
    """
    
    print(import_from_latex(sample_latex))
