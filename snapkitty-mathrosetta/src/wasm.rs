use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

use crate::{MathIR, Variable, Constant, Domain, AssumptionSet, SymbolicConst};
use crate::normalizer::Normalizer;
use crate::dispatcher::{Dispatcher, DispatchResult, EquationClass, SolverSpec, ProofRequirement};

#[wasm_bindgen]
pub struct MathRosetta {
    normalizer: Normalizer,
    dispatcher: Dispatcher,
}

#[derive(Serialize, Deserialize)]
pub struct ParseResult {
    pub success: bool,
    pub mathir: Option<MathIR>,
    pub error: Option<String>,
    pub json: String,
}

#[derive(Serialize, Deserialize)]
pub struct NormalizeResult {
    pub original: MathIR,
    pub normalized: MathIR,
    pub json: String,
}

#[derive(Serialize, Deserialize)]
pub struct SolveResult {
    pub mathir: MathIR,
    pub normalized: MathIR,
    pub dispatch: DispatchResult,
    pub json: String,
}

#[derive(Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

#[wasm_bindgen]
impl MathRosetta {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            normalizer: Normalizer::new(),
            dispatcher: Dispatcher::new(),
        }
    }

    #[wasm_bindgen(js_name = parse)]
    pub fn parse_js(&self, input: &str, format: &str) -> JsValue {
        let result = self.parse(input, format);
        serde_wasm_bindgen::to_value(&result).unwrap()
    }

    #[wasm_bindgen(js_name = normalize)]
    pub fn normalize_js(&self, json: &str) -> JsValue {
        let result = self.normalize(json);
        serde_wasm_bindgen::to_value(&result).unwrap()
    }

    #[wasm_bindgen(js_name = solve)]
    pub fn solve_js(&self, input: &str, format: &str) -> JsValue {
        let result = self.solve(input, format);
        serde_wasm_bindgen::to_value(&result).unwrap()
    }

    #[wasm_bindgen(js_name = dispatch)]
    pub fn dispatch_js(&self, json: &str) -> JsValue {
        let result = self.dispatch(json);
        serde_wasm_bindgen::to_value(&result).unwrap()
    }

    #[wasm_bindgen(js_name = validate)]
    pub fn validate_js(&self, json: &str) -> JsValue {
        let result = self.validate(json);
        serde_wasm_bindgen::to_value(&result).unwrap()
    }

    #[wasm_bindgen(js_name = toLatex)]
    pub fn to_latex_js(&self, json: &str) -> String {
        let expr: MathIR = match serde_json::from_str(json) {
            Ok(e) => e,
            Err(e) => return format!("Error: {}", e),
        };
        mathir_to_latex(&expr)
    }

    #[wasm_bindgen(js_name = example)]
    pub fn example(&self, name: &str) -> String {
        match name {
            "quadratic" => r#"{"Eq":[{"Add":[{"Mul":[{"Var":"a"},{"Pow":[{"Var":"x"},{"Const":2}]}]},{"Mul":[{"Var":"b"},{"Var":"x"}]},{"Var":"c"}]},{"Const":0}]}"#.to_string(),
            "pythagorean" => r#"{"Eq":[{"Add":[{"Pow":[{"Fn":{"name":"sin","args":[{"Var":"x"}]}},{"Const":2}]},{"Pow":[{"Fn":{"name":"cos","args":[{"Var":"x"}]}},{"Const":2}]}]},{"Const":1}]}"#.to_string(),
            "integral" => r#"{"Integral":{"expr":{"Pow":[{"Var":"x"},{"Const":2}]},"var":"x","limits":null}}"#.to_string(),
            "derivative" => r#"{"Eq":[{"Derivative":[{"Fn":{"name":"sin","args":[{"Var":"x"}]}},"x"]},{"Fn":{"name":"cos","args":[{"Var":"x"}]}}]}"#.to_string(),
            _ => r#"{"Add":[{"Var":"x"},{"Const":1}]}"#.to_string(),
        }
    }
}

impl MathRosetta {
    pub fn parse(&self, input: &str, format: &str) -> ParseResult {
        let trimmed = input.trim();

        if let Ok(expr) = serde_json::from_str::<MathIR>(trimmed) {
            let json = serde_json::to_string_pretty(&expr).unwrap_or_default();
            return ParseResult {
                success: true,
                mathir: Some(expr),
                error: None,
                json,
            };
        }

        let result = match format {
            "latex" => parse_latex_simple(trimmed),
            "python" | "sympy" => parse_sympy_simple(trimmed),
            "natural" => parse_natural_simple(trimmed),
            _ => parse_latex_simple(trimmed),
        };

        match result {
            Ok(expr) => {
                let json = serde_json::to_string_pretty(&expr).unwrap_or_default();
                ParseResult {
                    success: true,
                    mathir: Some(expr),
                    error: None,
                    json,
                }
            }
            Err(e) => ParseResult {
                success: false,
                mathir: None,
                error: Some(e),
                json: "{}".to_string(),
            },
        }
    }

    pub fn normalize(&self, json: &str) -> NormalizeResult {
        match serde_json::from_str::<MathIR>(json) {
            Ok(expr) => {
                let normalized = self.normalizer.normalize(&expr);
                let json = serde_json::to_string_pretty(&normalized).unwrap_or_default();
                NormalizeResult {
                    original: expr.clone(),
                    normalized,
                    json,
                }
            }
            Err(e) => NormalizeResult {
                original: MathIR::Const(Constant::Int(0)),
                normalized: MathIR::Const(Constant::Int(0)),
                json: format!("{{\"error\": \"{}\"}}", e),
            },
        }
    }

    pub fn solve(&self, input: &str, format: &str) -> SolveResult {
        let parse_result = self.parse(input, format);
        match parse_result.mathir {
            Some(expr) => {
                let normalized = self.normalizer.normalize(&expr);
                let dispatch = self.dispatcher.dispatch(&normalized);
                let json = serde_json::to_string_pretty(&serde_json::json!({
                    "original": expr,
                    "normalized": normalized,
                    "dispatch": dispatch,
                })).unwrap_or_default();
                SolveResult {
                    mathir: expr,
                    normalized,
                    dispatch,
                    json,
                }
            }
            None => SolveResult {
                mathir: MathIR::Const(Constant::Int(0)),
                normalized: MathIR::Const(Constant::Int(0)),
                dispatch: DispatchResult {
                    solver: SolverSpec {
                        solver: crate::dispatcher::SolverBackend::Fallback,
                        capabilities: vec![],
                        params: Default::default(),
                    },
                    proof: ProofRequirement {
                        level: crate::dispatcher::ProofLevel::None,
                        backends: vec![],
                    },
                    equation_class: EquationClass::Fallback,
                    confidence: 0.0,
                },
                json: "{{}}".to_string(),
            },
        }
    }

    pub fn dispatch(&self, json: &str) -> DispatchResult {
        match serde_json::from_str::<MathIR>(json) {
            Ok(expr) => self.dispatcher.dispatch(&expr),
            Err(_) => DispatchResult {
                solver: SolverSpec {
                    solver: crate::dispatcher::SolverBackend::Fallback,
                    capabilities: vec![],
                    params: Default::default(),
                },
                proof: ProofRequirement {
                    level: crate::dispatcher::ProofLevel::None,
                    backends: vec![],
                },
                equation_class: EquationClass::Fallback,
                confidence: 0.0,
            },
        }
    }

    pub fn validate(&self, json: &str) -> ValidationResult {
        match serde_json::from_str::<MathIR>(json) {
            Ok(_) => ValidationResult {
                valid: true,
                errors: vec![],
            },
            Err(e) => ValidationResult {
                valid: false,
                errors: vec![e.to_string()],
            },
        }
    }
}

fn parse_latex_simple(input: &str) -> Result<MathIR, String> {
    let trimmed = input.trim();
    if let Some(eq_pos) = find_latex_equals(trimmed) {
        let lhs = parse_latex_expr(&trimmed[..eq_pos])?;
        let rhs = parse_latex_expr(&trimmed[eq_pos + 1..])?;
        return Ok(MathIR::Eq(Box::new(lhs), Box::new(rhs)));
    }
    parse_latex_expr(trimmed)
}

fn parse_latex_expr(input: &str) -> Result<MathIR, String> {
    let trimmed = input.trim();
    if let Some(caret_pos) = find_latex_caret(trimmed) {
        let base = parse_latex_primary(&trimmed[..caret_pos])?;
        let exp = parse_latex_expr(&trimmed[caret_pos + 1..])?;
        return Ok(MathIR::Pow(Box::new(base), Box::new(exp)));
    }
    if let Some(plus_pos) = find_latex_plus(trimmed) {
        let lhs = parse_latex_expr(&trimmed[..plus_pos])?;
        let rhs = parse_latex_expr(&trimmed[plus_pos + 1..])?;
        return Ok(MathIR::Add(vec![lhs, rhs]));
    }
    parse_latex_primary(trimmed)
}

fn parse_latex_primary(input: &str) -> Result<MathIR, String> {
    let trimmed = input.trim();
    if let Ok(n) = trimmed.parse::<i64>() {
        return Ok(MathIR::Const(Constant::Int(n)));
    }
    if trimmed.len() == 1 && trimmed.chars().next().unwrap().is_alphabetic() {
        return Ok(MathIR::Var(Box::new(Variable {
            id: trimmed.to_string(),
            domain: Domain::Real,
            assumptions: AssumptionSet::default(),
        })));
    }
    if let Some(paren_pos) = trimmed.find('(') {
        let fname = &trimmed[..paren_pos];
        if fname.chars().all(|c| c.is_alphabetic()) {
            let args_str = &trimmed[paren_pos + 1..trimmed.len() - 1];
            let arg = parse_latex_expr(args_str)?;
            return Ok(MathIR::Fn { name: fname.into(), args: vec![arg] });
        }
    }
    match trimmed {
        "\\pi" | "π" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::Pi))),
        "e" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::E))),
        "\\infty" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::Infinity))),
        _ => Err(format!("Cannot parse: {}", trimmed)),
    }
}

fn find_latex_equals(input: &str) -> Option<usize> {
    let mut depth = 0;
    for (i, c) in input.chars().enumerate() {
        match c {
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth -= 1,
            '=' if depth == 0 => return Some(i),
            _ => {}
        }
    }
    None
}

fn find_latex_caret(input: &str) -> Option<usize> {
    let mut depth = 0;
    for (i, c) in input.chars().enumerate() {
        match c {
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth -= 1,
            '^' if depth == 0 => return Some(i),
            _ => {}
        }
    }
    None
}

fn find_latex_plus(input: &str) -> Option<usize> {
    let mut depth = 0;
    let mut last = None;
    for (i, c) in input.chars().enumerate() {
        match c {
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth -= 1,
            '+' if depth == 0 => last = Some(i),
            _ => {}
        }
    }
    last
}

fn parse_sympy_simple(input: &str) -> Result<MathIR, String> {
    let trimmed = input.trim();
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
        return parse_sympy_json_value(&value);
    }
    parse_latex_simple(trimmed)
}

fn parse_sympy_json_value(value: &serde_json::Value) -> Result<MathIR, String> {
    match value {
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Ok(MathIR::Const(Constant::Int(i)))
            } else if let Some(f) = n.as_f64() {
                Ok(MathIR::Const(Constant::Float(f)))
            } else {
                Err("Invalid number".into())
            }
        }
        serde_json::Value::String(s) => match s.as_str() {
            "pi" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::Pi))),
            "E" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::E))),
            "oo" => Ok(MathIR::Const(Constant::Symbolic(SymbolicConst::Infinity))),
            _ => Ok(MathIR::Var(Box::new(Variable {
                id: s.clone(),
                domain: Domain::Real,
                assumptions: AssumptionSet::default(),
            }))),
        },
        serde_json::Value::Array(arr) => {
            if arr.len() == 3 && arr[0].as_str() == Some("Add") {
                let a = parse_sympy_json_value(&arr[1])?;
                let b = parse_sympy_json_value(&arr[2])?;
                Ok(MathIR::Add(vec![a, b]))
            } else if arr.len() == 3 && arr[0].as_str() == Some("Mul") {
                let a = parse_sympy_json_value(&arr[1])?;
                let b = parse_sympy_json_value(&arr[2])?;
                Ok(MathIR::Mul(vec![a, b]))
            } else if arr.len() == 3 && arr[0].as_str() == Some("Pow") {
                let base = parse_sympy_json_value(&arr[1])?;
                let exp = parse_sympy_json_value(&arr[2])?;
                Ok(MathIR::Pow(Box::new(base), Box::new(exp)))
            } else if arr.len() >= 2 && arr[0].as_str() == Some("Symbol") {
                let id = arr[1].as_str().ok_or("Invalid symbol")?;
                Ok(MathIR::Var(Box::new(Variable {
                    id: id.to_string(),
                    domain: Domain::Real,
                    assumptions: AssumptionSet::default(),
                })))
            } else {
                Err(format!("Unsupported SymPy: {:?}", arr[0]))
            }
        }
        _ => Err("Invalid SymPy JSON".into()),
    }
}

fn parse_natural_simple(input: &str) -> Result<MathIR, String> {
    let trimmed = input.trim().to_lowercase();
    let converted = trimmed
        .replace("squared", "^2")
        .replace("cubed", "^3")
        .replace("times", "*")
        .replace("plus", "+")
        .replace("minus", "-")
        .replace("equals", "=")
        .replace("pi", "\\pi");

    if let Some(eq_pos) = converted.find('=') {
        let lhs = parse_latex_simple(&converted[..eq_pos])?;
        let rhs = parse_latex_simple(&converted[eq_pos + 1..])?;
        return Ok(MathIR::Eq(Box::new(lhs), Box::new(rhs)));
    }

    parse_latex_simple(&converted)
}

pub fn mathir_to_latex(expr: &MathIR) -> String {
    match expr {
        MathIR::Const(c) => match c {
            Constant::Int(n) => n.to_string(),
            Constant::Float(f) => format!("{:.6}", f),
            Constant::Symbolic(s) => match s {
                SymbolicConst::Pi => "\\pi".to_string(),
                SymbolicConst::E => "e".to_string(),
                SymbolicConst::Infinity => "\\infty".to_string(),
                _ => "?".to_string(),
            },
            _ => "?".to_string(),
        },
        MathIR::Var(v) => v.id.clone(),
        MathIR::Add(args) => {
            let parts: Vec<String> = args.iter().map(mathir_to_latex).collect();
            parts.join(" + ")
        }
        MathIR::Mul(args) => {
            let parts: Vec<String> = args.iter().map(mathir_to_latex).collect();
            parts.join(" \\cdot ")
        }
        MathIR::Pow(base, exp) => {
            format!("{{{}}}^{{{}}}", mathir_to_latex(base), mathir_to_latex(exp))
        }
        MathIR::Fn { name, args } => {
            let args_str: Vec<String> = args.iter().map(mathir_to_latex).collect();
            format!("\\{}({})", name.as_str(), args_str.join(", "))
        }
        MathIR::Eq(lhs, rhs) => {
            format!("{} = {}", mathir_to_latex(lhs), mathir_to_latex(rhs))
        }
        MathIR::Derivative(expr, var) => {
            format!("\\frac{{d}}{{d{}}} {}", var.id, mathir_to_latex(expr))
        }
        MathIR::Integral { expr, var, limits } => {
            match limits {
                Some((lo, hi)) => {
                    format!("\\int_{{{}}}^{{{}}} {} \\, d{}", 
                        mathir_to_latex(lo), mathir_to_latex(hi), 
                        mathir_to_latex(expr), var.id)
                }
                None => {
                    format!("\\int {} \\, d{}", mathir_to_latex(expr), var.id)
                }
            }
        }
        _ => "...".to_string(),
    }
}

#[wasm_bindgen]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
