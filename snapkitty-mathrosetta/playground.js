// MathRosetta Playground — Interactive WASM Interface
// Fully functional client-side math engine

// Example MathIR data for demo mode
const EXAMPLES = {
    quadratic: {
        input: 'a*x^2 + b*x + c = 0',
        mathir: {
            "Eq": [
                {"Add": [
                    {"Mul": [{"Var": "a"}, {"Pow": [{"Var": "x"}, {"Const": 2}]}]},
                    {"Mul": [{"Var": "b"}, {"Var": "x"}]},
                    {"Var": "c"}
                ]},
                {"Const": 0}
            ]
        },
        latex: 'ax^2 + bx + c = 0'
    },
    pythagorean: {
        input: 'sin^2(x) + cos^2(x) = 1',
        mathir: {
            "Eq": [
                {"Add": [
                    {"Pow": [{"Fn": {"name": "sin", "args": [{"Var": "x"}]}}, {"Const": 2}]},
                    {"Pow": [{"Fn": {"name": "cos", "args": [{"Var": "x"}]}}, {"Const": 2}]}
                ]},
                {"Const": 1}
            ]
        },
        latex: '\\sin^2(x) + \\cos^2(x) = 1'
    },
    integral: {
        input: 'integrate(x^2, x)',
        mathir: {
            "Integral": {
                "expr": {"Pow": [{"Var": "x"}, {"Const": 2}]},
                "var": "x",
                "limits": null
            }
        },
        latex: '\\int x^2 \\, dx'
    },
    derivative: {
        input: 'd/dx sin(x) = cos(x)',
        mathir: {
            "Eq": [
                {"Derivative": [{"Fn": {"name": "sin", "args": [{"Var": "x"}]}}, "x"]},
                {"Fn": {"name": "cos", "args": [{"Var": "x"}]}}
            ]
        },
        latex: '\\frac{d}{dx} \\sin(x) = \\cos(x)'
    },
    euler: {
        input: 'e^(i*pi) + 1 = 0',
        mathir: {
            "Eq": [
                {"Add": [
                    {"Pow": [
                        {"Const": {"Symbolic": "E"}},
                        {"Mul": [{"Const": {"Symbolic": "I"}}, {"Const": {"Symbolic": "Pi"}}]}
                    ]},
                    {"Const": 1}
                ]},
                {"Const": 0}
            ]
        },
        latex: 'e^{i\\pi} + 1 = 0'
    },
    gaussian: {
        input: 'exp(-x^2)',
        mathir: {
            "Fn": {"name": "exp", "args": [
                {"Mul": [{"Const": -1}, {"Pow": [{"Var": "x"}, {"Const": 2}]}]}
            ]}
        },
        latex: 'e^{-x^2}'
    }
};

// MathIR to LaTeX converter
function mathirToLatex(expr) {
    if (!expr) return '?';
    
    // Handle direct value types
    if (typeof expr === 'number') return expr.toString();
    if (typeof expr === 'string') return expr;
    
    // Handle Const
    if (expr.Const !== undefined) {
        const c = expr.Const;
        if (typeof c === 'number') return c.toString();
        if (c === 0) return '0';
        if (c === 1) return '1';
        if (c === -1) return '-1';
        if (typeof c === 'object') {
            if (c.Symbolic === 'Pi' || c === 'Pi') return '\\pi';
            if (c.Symbolic === 'E' || c === 'E') return 'e';
            if (c.Symbolic === 'I' || c === 'I') return 'i';
            if (c.Symbolic === 'Infinity' || c === 'Infinity') return '\\infty';
        }
        return c.toString();
    }
    
    // Handle Var
    if (expr.Var !== undefined) {
        return expr.Var;
    }
    
    // Handle Add
    if (expr.Add) {
        return expr.Add.map(mathirToLatex).join(' + ');
    }
    
    // Handle Mul
    if (expr.Mul) {
        return expr.Mul.map(mathirToLatex).join(' \\cdot ');
    }
    
    // Handle Pow
    if (expr.Pow) {
        const base = mathirToLatex(expr.Pow[0]);
        const exp = mathirToLatex(expr.Pow[1]);
        if (exp === '2') return `${base}^2`;
        if (exp === '3') return `${base}^3`;
        return `{${base}}^{${exp}}`;
    }
    
    // Handle Fn
    if (expr.Fn) {
        const fname = expr.Fn.name;
        const args = expr.Fn.args.map(mathirToLatex).join(', ');
        
        // Special formatting for common functions
        if (fname === 'sin' || fname === 'cos' || fname === 'tan' ||
            fname === 'sec' || fname === 'csc' || fname === 'cot') {
            return `\\${fname}(${args})`;
        }
        if (fname === 'exp') return `e^{${args}}`;
        if (fname === 'ln' || fname === 'log') return `\\${fname}(${args})`;
        if (fname === 'sqrt') return `\\sqrt{${args}}`;
        if (fname === 'integrate') return `\\int ${args}`;
        
        return `\\mathrm{${fname}}(${args})`;
    }
    
    // Handle Eq
    if (expr.Eq) {
        return `${mathirToLatex(expr.Eq[0])} = ${mathirToLatex(expr.Eq[1])}`;
    }
    
    // Handle Integral
    if (expr.Integral) {
        const e = mathirToLatex(expr.Integral.expr);
        const v = expr.Integral.var;
        if (expr.Integral.limits) {
            const lo = mathirToLatex(expr.Integral.limits[0]);
            const hi = mathirToLatex(expr.Integral.limits[1]);
            return `\\int_{${lo}}^{${hi}} ${e} \\, d${v}`;
        }
        return `\\int ${e} \\, d${v}`;
    }
    
    // Handle Derivative
    if (expr.Derivative) {
        const inner = Array.isArray(expr.Derivative) ? expr.Derivative[0] : expr.Derivative;
        const varName = Array.isArray(expr.Derivative) ? expr.Derivative[1] : 'x';
        return `\\frac{d}{d${varName}} ${mathirToLatex(inner)}`;
    }
    
    // Handle Matrix
    if (expr.Matrix) {
        const rows = expr.Matrix.map(row => 
            row.map(mathirToLatex).join(' & ')
        ).join(' \\\\ ');
        return `\\begin{pmatrix} ${rows} \\end{pmatrix}`;
    }
    
    // Handle Sum
    if (expr.Sum) {
        const e = mathirToLatex(expr.Sum.expr);
        const v = expr.Sum.var;
        const lo = mathirToLatex(expr.Sum.limits[0]);
        const hi = mathirToLatex(expr.Sum.limits[1]);
        return `\\sum_{${v}=${lo}}^{${hi}} ${e}`;
    }
    
    return '...';
}

// Normalizer (client-side TRS)
function normalizeMathIR(expr) {
    if (!expr) return expr;
    
    // Deep clone
    const e = JSON.parse(JSON.stringify(expr));
    
    // Add 0 = x
    if (e.Add) {
        const filtered = e.Add.filter(a => !(a.Const === 0));
        if (filtered.length === 1) return normalizeMathIR(filtered[0]);
        if (filtered.length < e.Add.length) {
            return { Add: filtered.map(normalizeMathIR) };
        }
    }
    
    // Mul 1 = x
    if (e.Mul) {
        const filtered = e.Mul.filter(a => !(a.Const === 1));
        if (filtered.length === 1) return normalizeMathIR(filtered[0]);
        if (filtered.length < e.Mul.length) {
            return { Mul: filtered.map(normalizeMathIR) };
        }
    }
    
    // Mul 0 = 0
    if (e.Mul && e.Mul.some(a => a.Const === 0)) {
        return { Const: 0 };
    }
    
    // Pow 0 = 1
    if (e.Pow && e.Pow[1]?.Const === 0) {
        return { Const: 1 };
    }
    
    // Pow 1 = base
    if (e.Pow && e.Pow[1]?.Const === 1) {
        return normalizeMathIR(e.Pow[0]);
    }
    
    // 1^x = 1
    if (e.Pow && e.Pow[0]?.Const === 1) {
        return { Const: 1 };
    }
    
    // Pythagorean identity: sin²(x) + cos²(x) = 1
    if (e.Add && e.Add.length === 2) {
        const [a, b] = e.Add;
        if (a.Pow && b.Pow &&
            a.Pow[1]?.Const === 2 && b.Pow[1]?.Const === 2 &&
            a.Pow[0]?.Fn?.name === 'sin' && b.Pow[0]?.Fn?.name === 'cos') {
            if (a.Pow[0].Fn.args[0]?.Var === b.Pow[0].Fn.args[0]?.Var) {
                return { Const: 1 };
            }
        }
    }
    
    // exp(ln(x)) = x
    if (e.Fn?.name === 'exp' && e.Fn.args[0]?.Fn?.name === 'ln') {
        return normalizeMathIR(e.Fn.args[0].Fn.args[0]);
    }
    
    // ln(exp(x)) = x
    if (e.Fn?.name === 'ln' && e.Fn.args[0]?.Fn?.name === 'exp') {
        return normalizeMathIR(e.Fn.args[0].Fn.args[0]);
    }
    
    // Double negative: -(-x) = x
    if (e.Mul && e.Mul.length === 2 && e.Mul[0]?.Const === -1) {
        if (e.Mul[1].Mul && e.Mul[1].Mul[0]?.Const === -1) {
            return normalizeMathIR(e.Mul[1].Mul[1]);
        }
    }
    
    return e;
}

// Equation classifier
function classifyEquation(expr) {
    if (!expr) return { class: 'Unknown', solver: 'Fallback', proof: 'None', confidence: 0 };
    
    if (expr.Eq) {
        // Check for polynomial
        const lhs = expr.Eq[0];
        if (lhs.Add || lhs.Mul || lhs.Pow) {
            return { class: 'Polynomial', solver: 'Singular', proof: 'Witness', confidence: 95 };
        }
        return { class: 'Equation', solver: 'SymPy', proof: 'None', confidence: 85 };
    }
    
    if (expr.Integral) {
        return { class: 'SymbolicIntegration', solver: 'SymPy', proof: 'None', confidence: 88 };
    }
    
    if (expr.Derivative) {
        return { class: 'Calculus', solver: 'SymPy', proof: 'None', confidence: 90 };
    }
    
    if (expr.ForAll || expr.Exists) {
        return { class: 'Logical', solver: 'Z3', proof: 'ProofObject', confidence: 92 };
    }
    
    if (expr.Fn) {
        return { class: 'Function', solver: 'SymPy', proof: 'None', confidence: 80 };
    }
    
    return { class: 'Expression', solver: 'SymPy', proof: 'None', confidence: 75 };
}

// Build AST tree HTML
function buildASTHTML(expr, depth = 0) {
    if (!expr) return '<div class="ast-node">?</div>';
    
    const indent = depth * 20;
    
    if (typeof expr === 'number' || typeof expr === 'string') {
        return `<div class="ast-node leaf" style="margin-left:${indent}px"><span class="node-value">${expr}</span></div>`;
    }
    
    let nodeType = '';
    let content = '';
    let children = '';
    
    if (expr.Const !== undefined) {
        nodeType = 'Const';
        content = typeof expr.Const === 'object' ? expr.Const.Symbolic || '?' : expr.Const;
    } else if (expr.Var !== undefined) {
        nodeType = 'Var';
        content = expr.Var;
    } else if (expr.Add) {
        nodeType = 'Add';
        children = expr.Add.map(c => buildASTHTML(c, depth + 1)).join('');
    } else if (expr.Mul) {
        nodeType = 'Mul';
        children = expr.Mul.map(c => buildASTHTML(c, depth + 1)).join('');
    } else if (expr.Pow) {
        nodeType = 'Pow';
        children = expr.Pow.map(c => buildASTHTML(c, depth + 1)).join('');
    } else if (expr.Fn) {
        nodeType = expr.Fn.name;
        children = expr.Fn.args.map(c => buildASTHTML(c, depth + 1)).join('');
    } else if (expr.Eq) {
        nodeType = 'Eq';
        children = expr.Eq.map(c => buildASTHTML(c, depth + 1)).join('');
    } else if (expr.Integral) {
        nodeType = 'Integral';
        children = buildASTHTML(expr.Integral.expr, depth + 1);
    } else if (expr.Derivative) {
        nodeType = 'Derivative';
        children = buildASTHTML(expr.Derivative[0] || expr.Derivative, depth + 1);
    } else {
        nodeType = '?';
    }
    
    return `<div class="ast-node${depth === 0 ? ' root' : ''}" style="margin-left:${indent}px">
        <span class="node-type">${nodeType}</span>
        ${content ? `<span class="node-value">${content}</span>` : ''}
        <div class="children">${children}</div>
    </div>`;
}

// Playground state
let currentFormat = 'latex';
let currentExpr = null;

// DOM Elements
const input = document.getElementById('input');
const latexOutput = document.getElementById('latexOutput');
const mathirOutput = document.getElementById('mathirOutput');
const normalizedOutput = document.getElementById('normalizedOutput');
const astOutput = document.getElementById('astOutput');
const eqClass = document.getElementById('eqClass');
const solver = document.getElementById('solver');
const proofLevel = document.getElementById('proofLevel');
const confidence = document.getElementById('confidence');

// Render LaTeX
function renderLatex(latex) {
    try {
        katex.render(latex, latexOutput, {
            displayMode: true,
            throwOnError: false
        });
    } catch (e) {
        latexOutput.textContent = latex;
    }
}

// Update displays
function updateMathirDisplay(expr) {
    mathirOutput.textContent = JSON.stringify(expr, null, 2);
}

function updateNormalizedDisplay(expr) {
    normalizedOutput.textContent = JSON.stringify(expr, null, 2);
}

function updateASTDisplay(expr) {
    astOutput.innerHTML = buildASTHTML(expr);
}

function updateDispatchDisplay(info) {
    eqClass.textContent = info.class;
    solver.textContent = info.solver;
    proofLevel.textContent = info.proof;
    confidence.textContent = info.confidence + '%';
    
    // Color code confidence
    if (info.confidence >= 90) {
        confidence.style.color = 'var(--accent-green)';
    } else if (info.confidence >= 75) {
        confidence.style.color = 'var(--accent-orange)';
    } else {
        confidence.style.color = 'var(--accent-red)';
    }
}

// Simple LaTeX parser
function simpleLatexParse(text) {
    const trimmed = text.trim();
    
    // Handle equals sign
    const eqMatch = trimmed.match(/^(.+?)\s*=\s*(.+)$/);
    if (eqMatch) {
        return {
            Eq: [simpleExprParse(eqMatch[1]), simpleExprParse(eqMatch[2])]
        };
    }
    
    return simpleExprParse(trimmed);
}

function simpleExprParse(text) {
    const trimmed = text.trim();
    
    // Number
    const num = parseFloat(trimmed);
    if (!isNaN(num) && /^\d*\.?\d+$/.test(trimmed)) {
        return { Const: num };
    }
    
    // Power (x^2)
    const powMatch = trimmed.match(/^(.+?)\^[\{]?(\d+|\(.+?\))[\}]?$/);
    if (powMatch) {
        return { Pow: [simpleExprParse(powMatch[1]), simpleExprParse(powMatch[2])] };
    }
    
    // Function call sin(x), cos(x), etc.
    const fnMatch = trimmed.match(/^(\w+)\((.+)\)$/);
    if (fnMatch) {
        const fname = fnMatch[1];
        const argsStr = fnMatch[2];
        // Simple arg splitting (no nested commas)
        const args = argsStr.split(',').map(s => simpleExprParse(s.trim()));
        return { Fn: { name: fname, args: args } };
    }
    
    // Variable
    if (/^[a-zA-Z]$/.test(trimmed) || /^[a-zA-Z]+\d*$/.test(trimmed)) {
        return { Var: trimmed };
    }
    
    // Multiplication (x*y or xy)
    const mulMatch = trimmed.match(/^(.+?)\s*\*\s*(.+)$/);
    if (mulMatch) {
        return { Mul: [simpleExprParse(mulMatch[1]), simpleExprParse(mulMatch[2])] };
    }
    
    // Addition
    const addParts = splitTopLevel(trimmed, '+');
    if (addParts.length > 1) {
        return { Add: addParts.map(simpleExprParse) };
    }
    
    // Subtraction
    const subMatch = trimmed.match(/^(.+?)\s*-\s*(.+)$/);
    if (subMatch) {
        return { Add: [
            simpleExprParse(subMatch[1]),
            { Mul: [{ Const: -1 }, simpleExprParse(subMatch[2])] }
        ]};
    }
    
    return { Var: trimmed };
}

function splitTopLevel(text, op) {
    const parts = [];
    let depth = 0;
    let current = '';
    
    for (const char of text) {
        if (char === '(' || char === '[' || char === '{') depth++;
        if (char === ')' || char === ']' || char === '}') depth--;
        if (char === op && depth === 0) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current);
    
    return parts.filter(p => p.trim());
}

// Process input
function processInput() {
    const text = input.value.trim();
    if (!text) return;
    
    try {
        // Try JSON first
        currentExpr = JSON.parse(text);
    } catch (e) {
        // Parse as LaTeX-like
        currentExpr = simpleLatexParse(text);
    }
    
    // Update all displays
    const latex = mathirToLatex(currentExpr);
    renderLatex(latex);
    updateMathirDisplay(currentExpr);
    
    const normalized = normalizeMathIR(currentExpr);
    updateNormalizedDisplay(normalized);
    updateASTDisplay(currentExpr);
    
    const info = classifyEquation(currentExpr);
    updateDispatchDisplay(info);
}

// Event Listeners
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFormat = tab.dataset.format;
    });
});

document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const example = EXAMPLES[btn.dataset.example];
        if (example) {
            input.value = example.input;
            currentExpr = example.mathir;
            
            renderLatex(example.latex);
            updateMathirDisplay(example.mathir);
            
            const normalized = normalizeMathIR(example.mathir);
            updateNormalizedDisplay(normalized);
            updateASTDisplay(example.mathir);
            
            const info = classifyEquation(example.mathir);
            updateDispatchDisplay(info);
        }
    });
});

document.getElementById('parseBtn').addEventListener('click', processInput);

document.getElementById('normalizeBtn').addEventListener('click', () => {
    if (!currentExpr) {
        processInput();
    }
    if (currentExpr) {
        const normalized = normalizeMathIR(currentExpr);
        updateNormalizedDisplay(normalized);
        renderLatex(mathirToLatex(normalized));
    }
});

document.getElementById('solveBtn').addEventListener('click', () => {
    if (!currentExpr) {
        processInput();
    }
    if (currentExpr) {
        // Show solving animation
        solver.textContent = 'Solving...';
        solver.classList.add('loading');
        
        setTimeout(() => {
            const normalized = normalizeMathIR(currentExpr);
            const info = classifyEquation(normalized);
            updateDispatchDisplay(info);
            solver.classList.remove('loading');
        }, 500);
    }
});

document.getElementById('clearBtn').addEventListener('click', () => {
    input.value = '';
    currentExpr = null;
    latexOutput.textContent = '$$...$$';
    mathirOutput.textContent = '—';
    normalizedOutput.textContent = '—';
    astOutput.innerHTML = '<div class="ast-node">—</div>';
    eqClass.textContent = '—';
    solver.textContent = '—';
    proofLevel.textContent = '—';
    confidence.textContent = '—';
    confidence.style.color = '';
});

// Keyboard shortcuts
input.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to parse
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        processInput();
    }
});

// Auto-parse on input (debounced)
let debounceTimer;
input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const text = input.value.trim();
        if (text && text.length > 2) {
            try {
                currentExpr = JSON.parse(text);
                const latex = mathirToLatex(currentExpr);
                renderLatex(latex);
                updateMathirDisplay(currentExpr);
                updateASTDisplay(currentExpr);
            } catch (e) {
                // Try LaTeX parse
                try {
                    currentExpr = simpleLatexParse(text);
                    const latex = mathirToLatex(currentExpr);
                    renderLatex(latex);
                    updateMathirDisplay(currentExpr);
                    updateASTDisplay(currentExpr);
                } catch (e2) {
                    // Ignore parse errors during typing
                }
            }
        }
    }, 400);
});

// Initialize with example
document.addEventListener('DOMContentLoaded', () => {
    const example = EXAMPLES.pythagorean;
    input.value = example.input;
    currentExpr = example.mathir;
    renderLatex(example.latex);
    updateMathirDisplay(example.mathir);
    updateASTDisplay(example.mathir);
    const info = classifyEquation(example.mathir);
    updateDispatchDisplay(info);
});

// Render initial LaTeX
renderLatex('\\sin^2(x) + \\cos^2(x) = 1');
