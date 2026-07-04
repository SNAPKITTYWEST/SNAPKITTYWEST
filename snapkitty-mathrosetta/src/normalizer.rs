use crate::{MathIR, Constant, Variable, SymbolicConst};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct Normalizer {
    rules: Vec<RewriteRule>,
    max_iterations: usize,
}

#[derive(Debug, Clone)]
pub struct RewriteRule {
    pub name: String,
    pub pattern: MathIR,
    pub replacement: MathIR,
    pub priority: u32,
}

fn var_x() -> Variable {
    Variable { id: "__x".into(), ..Default::default() }
}

fn var_y() -> Variable {
    Variable { id: "__y".into(), ..Default::default() }
}

fn var_z() -> Variable {
    Variable { id: "__z".into(), ..Default::default() }
}

fn var_f() -> Variable {
    Variable { id: "__f".into(), ..Default::default() }
}

impl Normalizer {
    pub fn new() -> Self {
        let mut rules = Vec::new();
        Self::add_arithmetic_rules(&mut rules);
        Self::add_algebraic_rules(&mut rules);
        Self::add_transcendental_rules(&mut rules);
        Self::add_calculus_rules(&mut rules);
        Self {
            rules,
            max_iterations: 1000,
        }
    }

    fn add_arithmetic_rules(rules: &mut Vec<RewriteRule>) {
        rules.push(RewriteRule {
            name: "add_zero".to_string(),
            pattern: MathIR::Add(vec![MathIR::Var(Box::new(var_x())), MathIR::Const(Constant::Int(0))]),
            replacement: MathIR::Var(Box::new(var_x())),
            priority: 100,
        });

        rules.push(RewriteRule {
            name: "add_zero_left".to_string(),
            pattern: MathIR::Add(vec![MathIR::Const(Constant::Int(0)), MathIR::Var(Box::new(var_x()))]),
            replacement: MathIR::Var(Box::new(var_x())),
            priority: 100,
        });

        rules.push(RewriteRule {
            name: "mul_one".to_string(),
            pattern: MathIR::Mul(vec![MathIR::Var(Box::new(var_x())), MathIR::Const(Constant::Int(1))]),
            replacement: MathIR::Var(Box::new(var_x())),
            priority: 100,
        });

        rules.push(RewriteRule {
            name: "mul_zero".to_string(),
            pattern: MathIR::Mul(vec![MathIR::Var(Box::new(var_x())), MathIR::Const(Constant::Int(0))]),
            replacement: MathIR::Const(Constant::Int(0)),
            priority: 100,
        });

        rules.push(RewriteRule {
            name: "pow_zero".to_string(),
            pattern: MathIR::Pow(Box::new(MathIR::Var(Box::new(var_x()))), Box::new(MathIR::Const(Constant::Int(0)))),
            replacement: MathIR::Const(Constant::Int(1)),
            priority: 100,
        });

        rules.push(RewriteRule {
            name: "pow_one".to_string(),
            pattern: MathIR::Pow(Box::new(MathIR::Var(Box::new(var_x()))), Box::new(MathIR::Const(Constant::Int(1)))),
            replacement: MathIR::Var(Box::new(var_x())),
            priority: 100,
        });

        rules.push(RewriteRule {
            name: "one_pow".to_string(),
            pattern: MathIR::Pow(Box::new(MathIR::Const(Constant::Int(1))), Box::new(MathIR::Var(Box::new(var_x())))),
            replacement: MathIR::Const(Constant::Int(1)),
            priority: 100,
        });
    }

    fn add_algebraic_rules(rules: &mut Vec<RewriteRule>) {
        // sin²(x) + cos²(x) = 1
        rules.push(RewriteRule {
            name: "pythagorean".to_string(),
            pattern: MathIR::Add(vec![
                MathIR::Pow(
                    Box::new(MathIR::Fn { name: "sin".into(), args: vec![MathIR::Var(Box::new(var_x()))] }),
                    Box::new(MathIR::Const(Constant::Int(2))),
                ),
                MathIR::Pow(
                    Box::new(MathIR::Fn { name: "cos".into(), args: vec![MathIR::Var(Box::new(var_x()))] }),
                    Box::new(MathIR::Const(Constant::Int(2))),
                ),
            ]),
            replacement: MathIR::Const(Constant::Int(1)),
            priority: 80,
        });

        // pow(pow(a, b), c) = pow(a, b*c)
        rules.push(RewriteRule {
            name: "pow_nested".to_string(),
            pattern: MathIR::Pow(
                Box::new(MathIR::Pow(
                    Box::new(MathIR::Var(Box::new(var_x()))),
                    Box::new(MathIR::Var(Box::new(var_y()))),
                )),
                Box::new(MathIR::Var(Box::new(var_z()))),
            ),
            replacement: MathIR::Pow(
                Box::new(MathIR::Var(Box::new(var_x()))),
                Box::new(MathIR::Mul(vec![
                    MathIR::Var(Box::new(var_y())),
                    MathIR::Var(Box::new(var_z())),
                ])),
            ),
            priority: 85,
        });

        // x^2 = x*x (for simplification when squaring)
        rules.push(RewriteRule {
            name: "pow_to_mul".to_string(),
            pattern: MathIR::Pow(
                Box::new(MathIR::Var(Box::new(var_x()))),
                Box::new(MathIR::Const(Constant::Int(2))),
            ),
            replacement: MathIR::Mul(vec![
                MathIR::Var(Box::new(var_x())),
                MathIR::Var(Box::new(var_x())),
            ]),
            priority: 30,
        });

        // pow(e, x) = exp(x)
        rules.push(RewriteRule {
            name: "pow_e_to_exp".to_string(),
            pattern: MathIR::Pow(
                Box::new(MathIR::Const(Constant::Symbolic(SymbolicConst::E))),
                Box::new(MathIR::Var(Box::new(var_x()))),
            ),
            replacement: MathIR::Fn { name: "exp".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            priority: 85,
        });

        // (-1)*((-1)*x) = x (double negation)
        rules.push(RewriteRule {
            name: "double_neg".to_string(),
            pattern: MathIR::Mul(vec![
                MathIR::Const(Constant::Int(-1)),
                MathIR::Mul(vec![
                    MathIR::Const(Constant::Int(-1)),
                    MathIR::Var(Box::new(var_x())),
                ]),
            ]),
            replacement: MathIR::Var(Box::new(var_x())),
            priority: 95,
        });

        // (-1)*0 = 0
        rules.push(RewriteRule {
            name: "neg_zero".to_string(),
            pattern: MathIR::Mul(vec![
                MathIR::Const(Constant::Int(-1)),
                MathIR::Const(Constant::Int(0)),
            ]),
            replacement: MathIR::Const(Constant::Int(0)),
            priority: 100,
        });

        // (-x)^2 = x^2
        rules.push(RewriteRule {
            name: "neg_pow_even".to_string(),
            pattern: MathIR::Pow(
                Box::new(MathIR::Mul(vec![
                    MathIR::Const(Constant::Int(-1)),
                    MathIR::Var(Box::new(var_x())),
                ])),
                Box::new(MathIR::Const(Constant::Int(2))),
            ),
            replacement: MathIR::Pow(
                Box::new(MathIR::Var(Box::new(var_x()))),
                Box::new(MathIR::Const(Constant::Int(2))),
            ),
            priority: 85,
        });

        // a^b * a^c = a^(b+c) when args are [Mul([Pow(a,b), Pow(a,c)])]
        rules.push(RewriteRule {
            name: "mul_pow_same_base".to_string(),
            pattern: MathIR::Mul(vec![
                MathIR::Pow(
                    Box::new(MathIR::Var(Box::new(var_x()))),
                    Box::new(MathIR::Var(Box::new(var_y()))),
                ),
                MathIR::Pow(
                    Box::new(MathIR::Var(Box::new(var_x()))),
                    Box::new(MathIR::Var(Box::new(var_z()))),
                ),
            ]),
            replacement: MathIR::Pow(
                Box::new(MathIR::Var(Box::new(var_x()))),
                Box::new(MathIR::Add(vec![
                    MathIR::Var(Box::new(var_y())),
                    MathIR::Var(Box::new(var_z())),
                ])),
            ),
            priority: 80,
        });
    }

    fn add_transcendental_rules(rules: &mut Vec<RewriteRule>) {
        rules.push(RewriteRule {
            name: "exp_zero".to_string(),
            pattern: MathIR::Fn { name: "exp".into(), args: vec![MathIR::Const(Constant::Int(0))] },
            replacement: MathIR::Const(Constant::Int(1)),
            priority: 95,
        });

        rules.push(RewriteRule {
            name: "ln_one".to_string(),
            pattern: MathIR::Fn { name: "ln".into(), args: vec![MathIR::Const(Constant::Int(1))] },
            replacement: MathIR::Const(Constant::Int(0)),
            priority: 95,
        });

        rules.push(RewriteRule {
            name: "exp_ln_cancel".to_string(),
            pattern: MathIR::Fn { name: "exp".into(), args: vec![
                MathIR::Fn { name: "ln".into(), args: vec![MathIR::Var(Box::new(var_x()))] }
            ] },
            replacement: MathIR::Var(Box::new(var_x())),
            priority: 95,
        });

        rules.push(RewriteRule {
            name: "ln_exp_cancel".to_string(),
            pattern: MathIR::Fn { name: "ln".into(), args: vec![
                MathIR::Fn { name: "exp".into(), args: vec![MathIR::Var(Box::new(var_x()))] }
            ] },
            replacement: MathIR::Var(Box::new(var_x())),
            priority: 95,
        });

        // ln(0) = -infinity
        rules.push(RewriteRule {
            name: "ln_zero".to_string(),
            pattern: MathIR::Fn { name: "ln".into(), args: vec![MathIR::Const(Constant::Int(0))] },
            replacement: MathIR::Const(Constant::Symbolic(SymbolicConst::NegInfinity)),
            priority: 90,
        });

        // sin(0) = 0
        rules.push(RewriteRule {
            name: "sin_zero".to_string(),
            pattern: MathIR::Fn { name: "sin".into(), args: vec![MathIR::Const(Constant::Int(0))] },
            replacement: MathIR::Const(Constant::Int(0)),
            priority: 95,
        });

        // cos(0) = 1
        rules.push(RewriteRule {
            name: "cos_zero".to_string(),
            pattern: MathIR::Fn { name: "cos".into(), args: vec![MathIR::Const(Constant::Int(0))] },
            replacement: MathIR::Const(Constant::Int(1)),
            priority: 95,
        });

        // sin(pi) = 0
        rules.push(RewriteRule {
            name: "sin_pi".to_string(),
            pattern: MathIR::Fn { name: "sin".into(), args: vec![MathIR::Const(Constant::Symbolic(SymbolicConst::Pi))] },
            replacement: MathIR::Const(Constant::Int(0)),
            priority: 95,
        });

        // cos(pi) = -1
        rules.push(RewriteRule {
            name: "cos_pi".to_string(),
            pattern: MathIR::Fn { name: "cos".into(), args: vec![MathIR::Const(Constant::Symbolic(SymbolicConst::Pi))] },
            replacement: MathIR::Const(Constant::Int(-1)),
            priority: 95,
        });

        // sin(-x) = -sin(x) via pattern: (-1) * sin(x)
        rules.push(RewriteRule {
            name: "sin_neg".to_string(),
            pattern: MathIR::Mul(vec![
                MathIR::Const(Constant::Int(-1)),
                MathIR::Fn { name: "sin".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            ]),
            replacement: MathIR::Mul(vec![
                MathIR::Const(Constant::Int(-1)),
                MathIR::Fn { name: "sin".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            ]),
            priority: 0, // disabled — placeholder for future proper matching
        });

        // exp(a) * exp(b) = exp(a+b) when Mul([exp(a), exp(b)])
        rules.push(RewriteRule {
            name: "exp_mul".to_string(),
            pattern: MathIR::Mul(vec![
                MathIR::Fn { name: "exp".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
                MathIR::Fn { name: "exp".into(), args: vec![MathIR::Var(Box::new(var_y()))] },
            ]),
            replacement: MathIR::Fn {
                name: "exp".into(),
                args: vec![MathIR::Add(vec![
                    MathIR::Var(Box::new(var_x())),
                    MathIR::Var(Box::new(var_y())),
                ])],
            },
            priority: 80,
        });

        // log rules: ln(a*b) via ln(Mul([a, b]))
        rules.push(RewriteRule {
            name: "ln_mul".to_string(),
            pattern: MathIR::Fn { name: "ln".into(), args: vec![
                MathIR::Mul(vec![
                    MathIR::Var(Box::new(var_x())),
                    MathIR::Var(Box::new(var_y())),
                ])
            ] },
            replacement: MathIR::Add(vec![
                MathIR::Fn { name: "ln".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
                MathIR::Fn { name: "ln".into(), args: vec![MathIR::Var(Box::new(var_y()))] },
            ]),
            priority: 80,
        });

        // ln(a^b) = b*ln(a)
        rules.push(RewriteRule {
            name: "ln_pow".to_string(),
            pattern: MathIR::Fn { name: "ln".into(), args: vec![
                MathIR::Pow(
                    Box::new(MathIR::Var(Box::new(var_x()))),
                    Box::new(MathIR::Var(Box::new(var_y()))),
                )
            ] },
            replacement: MathIR::Mul(vec![
                MathIR::Var(Box::new(var_y())),
                MathIR::Fn { name: "ln".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            ]),
            priority: 80,
        });
    }

    fn add_calculus_rules(rules: &mut Vec<RewriteRule>) {
        // ∫ f'(x) dx = f(x)
        rules.push(RewriteRule {
            name: "int_deriv_cancel".to_string(),
            pattern: MathIR::Integral {
                expr: Box::new(MathIR::Derivative(Box::new(MathIR::Var(Box::new(var_f()))), var_y())),
                var: var_y(),
                limits: None,
            },
            replacement: MathIR::Var(Box::new(var_f())),
            priority: 90,
        });

        // d/dx exp(x) = exp(x)
        rules.push(RewriteRule {
            name: "deriv_exp".to_string(),
            pattern: MathIR::Derivative(
                Box::new(MathIR::Fn { name: "exp".into(), args: vec![MathIR::Var(Box::new(var_x()))] }),
                var_y(),
            ),
            replacement: MathIR::Fn { name: "exp".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            priority: 90,
        });

        // d/dx sin(x) = cos(x)
        rules.push(RewriteRule {
            name: "deriv_sin".to_string(),
            pattern: MathIR::Derivative(
                Box::new(MathIR::Fn { name: "sin".into(), args: vec![MathIR::Var(Box::new(var_x()))] }),
                var_y(),
            ),
            replacement: MathIR::Fn { name: "cos".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            priority: 90,
        });

        // d/dx cos(x) = -sin(x)
        rules.push(RewriteRule {
            name: "deriv_cos".to_string(),
            pattern: MathIR::Derivative(
                Box::new(MathIR::Fn { name: "cos".into(), args: vec![MathIR::Var(Box::new(var_x()))] }),
                var_y(),
            ),
            replacement: MathIR::Mul(vec![
                MathIR::Const(Constant::Int(-1)),
                MathIR::Fn { name: "sin".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            ]),
            priority: 90,
        });

        // d/dx ln(x) = 1/x
        rules.push(RewriteRule {
            name: "deriv_ln".to_string(),
            pattern: MathIR::Derivative(
                Box::new(MathIR::Fn { name: "ln".into(), args: vec![MathIR::Var(Box::new(var_x()))] }),
                var_y(),
            ),
            replacement: MathIR::Pow(
                Box::new(MathIR::Var(Box::new(var_x()))),
                Box::new(MathIR::Const(Constant::Int(-1))),
            ),
            priority: 90,
        });

        // ∫ 0 dx = c (constant)
        rules.push(RewriteRule {
            name: "int_zero".to_string(),
            pattern: MathIR::Integral {
                expr: Box::new(MathIR::Const(Constant::Int(0))),
                var: var_y(),
                limits: None,
            },
            replacement: MathIR::Const(Constant::Int(0)),
            priority: 90,
        });

        // ∫ 1 dx = x (uses __y bound to integration variable)
        rules.push(RewriteRule {
            name: "int_one".to_string(),
            pattern: MathIR::Integral {
                expr: Box::new(MathIR::Const(Constant::Int(1))),
                var: var_y(),
                limits: None,
            },
            replacement: MathIR::Var(Box::new(var_y())),
            priority: 90,
        });

        // ∫ exp(x) dx = exp(x)
        rules.push(RewriteRule {
            name: "int_exp".to_string(),
            pattern: MathIR::Integral {
                expr: Box::new(MathIR::Fn { name: "exp".into(), args: vec![MathIR::Var(Box::new(var_x()))] }),
                var: var_y(),
                limits: None,
            },
            replacement: MathIR::Fn { name: "exp".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            priority: 85,
        });

        // ∫ sin(x) dx = -cos(x)
        rules.push(RewriteRule {
            name: "int_sin".to_string(),
            pattern: MathIR::Integral {
                expr: Box::new(MathIR::Fn { name: "sin".into(), args: vec![MathIR::Var(Box::new(var_x()))] }),
                var: var_y(),
                limits: None,
            },
            replacement: MathIR::Mul(vec![
                MathIR::Const(Constant::Int(-1)),
                MathIR::Fn { name: "cos".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            ]),
            priority: 85,
        });

        // ∫ cos(x) dx = sin(x)
        rules.push(RewriteRule {
            name: "int_cos".to_string(),
            pattern: MathIR::Integral {
                expr: Box::new(MathIR::Fn { name: "cos".into(), args: vec![MathIR::Var(Box::new(var_x()))] }),
                var: var_y(),
                limits: None,
            },
            replacement: MathIR::Fn { name: "sin".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            priority: 85,
        });

        // ∫ 1/x dx = ln(x)
        rules.push(RewriteRule {
            name: "int_reciprocal".to_string(),
            pattern: MathIR::Integral {
                expr: Box::new(MathIR::Pow(
                    Box::new(MathIR::Var(Box::new(var_x()))),
                    Box::new(MathIR::Const(Constant::Int(-1))),
                )),
                var: var_y(),
                limits: None,
            },
            replacement: MathIR::Fn { name: "ln".into(), args: vec![MathIR::Var(Box::new(var_x()))] },
            priority: 85,
        });
    }

    pub fn normalize(&self, expr: &MathIR) -> MathIR {
        let mut current = expr.clone();
        for _ in 0..self.max_iterations {
            let mut changed = false;
            for rule in &self.rules {
                if self.matches(&rule.pattern, &current) {
                    current = self.apply_rule(&rule.pattern, &rule.replacement, &current);
                    changed = true;
                    break;
                }
            }
            if !changed {
                break;
            }
        }
        current
    }

    fn matches(&self, pattern: &MathIR, expr: &MathIR) -> bool {
        match (pattern, expr) {
            (MathIR::Var(p), _) if p.id.starts_with("__") => true,
            (MathIR::Var(p), MathIR::Var(e)) => p.id == e.id,
            (MathIR::Const(pc), MathIR::Const(ec)) => pc == ec,
            (MathIR::Add(pa), MathIR::Add(ea)) => {
                pa.len() == ea.len() && pa.iter().zip(ea.iter()).all(|(p, e)| self.matches(p, e))
            }
            (MathIR::Mul(pa), MathIR::Mul(ea)) => {
                pa.len() == ea.len() && pa.iter().zip(ea.iter()).all(|(p, e)| self.matches(p, e))
            }
            (MathIR::Pow(pa, pb), MathIR::Pow(ea, eb)) => {
                self.matches(pa, ea) && self.matches(pb, eb)
            }
            (MathIR::Fn { name: pn, args: pa }, MathIR::Fn { name: en, args: ea }) => {
                pn == en && pa.len() == ea.len() && pa.iter().zip(ea.iter()).all(|(p, e)| self.matches(p, e))
            }
            (MathIR::Eq(pa, pb), MathIR::Eq(ea, eb)) => {
                self.matches(pa, ea) && self.matches(pb, eb)
            }
            (MathIR::Neq(pa, pb), MathIR::Neq(ea, eb)) => {
                self.matches(pa, ea) && self.matches(pb, eb)
            }
            (MathIR::Lt(pa, pb), MathIR::Lt(ea, eb)) => {
                self.matches(pa, ea) && self.matches(pb, eb)
            }
            (MathIR::Not(pa), MathIR::Not(ea)) => self.matches(pa, ea),
            (MathIR::Derivative(pa, pv), MathIR::Derivative(ea, ev)) => {
                self.matches(pa, ea) && (pv.id.starts_with("__") || pv == ev)
            }
            (MathIR::Integral { expr: pe, var: pv, limits: pl },
             MathIR::Integral { expr: ee, var: ev, limits: el }) => {
                let var_match = pv.id.starts_with("__") || pv == ev;
                let limits_match = match (pl, el) {
                    (None, None) => true,
                    (Some((pl_lo, pl_hi)), Some((el_lo, el_hi))) => {
                        self.matches(pl_lo, el_lo) && self.matches(pl_hi, el_hi)
                    }
                    _ => false,
                };
                self.matches(pe, ee) && var_match && limits_match
            }
            (MathIR::Limit { expr: pe, var: pv, target: pt, dir: pd },
             MathIR::Limit { expr: ee, var: ev, target: et, dir: ed }) => {
                let var_match = pv.id.starts_with("__") || pv == ev;
                self.matches(pe, ee) && var_match && self.matches(pt, et) && pd == ed
            }
            (MathIR::Sum { expr: pe, var: pv, limits: (pl_lo, pl_hi) },
             MathIR::Sum { expr: ee, var: ev, limits: (el_lo, el_hi) }) => {
                let var_match = pv.id.starts_with("__") || pv == ev;
                self.matches(pe, ee) && var_match && self.matches(pl_lo, el_lo) && self.matches(pl_hi, el_hi)
            }
            (MathIR::Product { expr: pe, var: pv, limits: (pl_lo, pl_hi) },
             MathIR::Product { expr: ee, var: ev, limits: (el_lo, el_hi) }) => {
                let var_match = pv.id.starts_with("__") || pv == ev;
                self.matches(pe, ee) && var_match && self.matches(pl_lo, el_lo) && self.matches(pl_hi, el_hi)
            }
            (MathIR::And(pa), MathIR::And(ea)) => {
                pa.len() == ea.len() && pa.iter().zip(ea.iter()).all(|(p, e)| self.matches(p, e))
            }
            (MathIR::Or(pa), MathIR::Or(ea)) => {
                pa.len() == ea.len() && pa.iter().zip(ea.iter()).all(|(p, e)| self.matches(p, e))
            }
            (MathIR::Implies(pa, pb), MathIR::Implies(ea, eb)) => {
                self.matches(pa, ea) && self.matches(pb, eb)
            }
            _ => false,
        }
    }

    fn apply_rule(&self, pattern: &MathIR, replacement: &MathIR, expr: &MathIR) -> MathIR {
        let mut bindings: HashMap<String, MathIR> = HashMap::new();
        self.collect_bindings(pattern, expr, &mut bindings);
        self.substitute(replacement, &bindings)
    }

    fn collect_bindings(&self, pattern: &MathIR, expr: &MathIR, bindings: &mut HashMap<String, MathIR>) {
        match pattern {
            MathIR::Var(p) if p.id.starts_with("__") => {
                bindings.insert(p.id.clone(), expr.clone());
                return;
            }
            MathIR::Derivative(pa, pv) => {
                if let MathIR::Derivative(ea, _) = expr {
                    self.collect_bindings(pa, ea, bindings);
                    if pv.id.starts_with("__") {
                        bindings.insert(pv.id.clone(), expr.clone());
                    }
                }
                return;
            }
            MathIR::Integral { expr: pe, var: pv, limits: pl } => {
                if let MathIR::Integral { expr: ee, var: ev, limits: el } = expr {
                    self.collect_bindings(pe, ee, bindings);
                    if pv.id.starts_with("__") {
                        bindings.insert(pv.id.clone(), MathIR::Var(Box::new(ev.clone())));
                    }
                    if let (Some((plo, phi)), Some((elo, ehi))) = (pl, el) {
                        self.collect_bindings(plo, elo, bindings);
                        self.collect_bindings(phi, ehi, bindings);
                    }
                }
                return;
            }
            MathIR::Limit { expr: pe, var: pv, target: pt, dir: _ } => {
                if let MathIR::Limit { expr: ee, var: ev, target: et, dir: _ } = expr {
                    self.collect_bindings(pe, ee, bindings);
                    if pv.id.starts_with("__") {
                        bindings.insert(pv.id.clone(), MathIR::Var(Box::new(ev.clone())));
                    }
                    self.collect_bindings(pt, et, bindings);
                }
                return;
            }
            MathIR::Sum { expr: pe, var: pv, limits: (plo, phi) } => {
                if let MathIR::Sum { expr: ee, var: ev, limits: (elo, ehi) } = expr {
                    self.collect_bindings(pe, ee, bindings);
                    if pv.id.starts_with("__") {
                        bindings.insert(pv.id.clone(), MathIR::Var(Box::new(ev.clone())));
                    }
                    self.collect_bindings(plo, elo, bindings);
                    self.collect_bindings(phi, ehi, bindings);
                }
                return;
            }
            MathIR::Product { expr: pe, var: pv, limits: (plo, phi) } => {
                if let MathIR::Product { expr: ee, var: ev, limits: (elo, ehi) } = expr {
                    self.collect_bindings(pe, ee, bindings);
                    if pv.id.starts_with("__") {
                        bindings.insert(pv.id.clone(), MathIR::Var(Box::new(ev.clone())));
                    }
                    self.collect_bindings(plo, elo, bindings);
                    self.collect_bindings(phi, ehi, bindings);
                }
                return;
            }
            _ => {}
        }
        let p_children = pattern.children();
        let e_children = expr.children();
        for (p, e) in p_children.iter().zip(e_children.iter()) {
            self.collect_bindings(p, e, bindings);
        }
    }

    fn substitute(&self, expr: &MathIR, bindings: &HashMap<String, MathIR>) -> MathIR {
        match expr {
            MathIR::Var(v) if v.id.starts_with("__") => {
                bindings.get(&v.id).cloned().unwrap_or_else(|| expr.clone())
            }
            MathIR::Add(args) => MathIR::Add(args.iter().map(|a| self.substitute(a, bindings)).collect()),
            MathIR::Mul(args) => MathIR::Mul(args.iter().map(|a| self.substitute(a, bindings)).collect()),
            MathIR::Pow(a, b) => MathIR::Pow(
                Box::new(self.substitute(a, bindings)),
                Box::new(self.substitute(b, bindings)),
            ),
            MathIR::Fn { name, args } => MathIR::Fn {
                name: name.clone(),
                args: args.iter().map(|a| self.substitute(a, bindings)).collect(),
            },
            MathIR::Eq(a, b) => MathIR::Eq(
                Box::new(self.substitute(a, bindings)),
                Box::new(self.substitute(b, bindings)),
            ),
            MathIR::Derivative(a, v) => MathIR::Derivative(
                Box::new(self.substitute(a, bindings)),
                v.clone(),
            ),
            MathIR::Integral { expr, var, limits } => MathIR::Integral {
                expr: Box::new(self.substitute(expr, bindings)),
                var: var.clone(),
                limits: limits.as_ref().map(|(lo, hi)| (
                    Box::new(self.substitute(lo, bindings)),
                    Box::new(self.substitute(hi, bindings)),
                )),
            },
            MathIR::And(args) => MathIR::And(args.iter().map(|a| self.substitute(a, bindings)).collect()),
            MathIR::Or(args) => MathIR::Or(args.iter().map(|a| self.substitute(a, bindings)).collect()),
            MathIR::Not(a) => MathIR::Not(Box::new(self.substitute(a, bindings))),
            MathIR::Implies(a, b) => MathIR::Implies(
                Box::new(self.substitute(a, bindings)),
                Box::new(self.substitute(b, bindings)),
            ),
            other => other.clone(),
        }
    }
}

impl Default for Normalizer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn x() -> MathIR {
        MathIR::Var(Box::new(Variable { id: "x".into(), ..Default::default() }))
    }

    fn y() -> MathIR {
        MathIR::Var(Box::new(Variable { id: "y".into(), ..Default::default() }))
    }

    fn int(n: i64) -> MathIR {
        MathIR::Const(Constant::Int(n))
    }

    fn pi() -> MathIR {
        MathIR::Const(Constant::Symbolic(SymbolicConst::Pi))
    }

    fn sin(arg: MathIR) -> MathIR {
        MathIR::Fn { name: "sin".into(), args: vec![arg] }
    }

    fn cos(arg: MathIR) -> MathIR {
        MathIR::Fn { name: "cos".into(), args: vec![arg] }
    }

    fn ln(arg: MathIR) -> MathIR {
        MathIR::Fn { name: "ln".into(), args: vec![arg] }
    }

    fn exp(arg: MathIR) -> MathIR {
        MathIR::Fn { name: "exp".into(), args: vec![arg] }
    }

    fn pow(base: MathIR, exp: MathIR) -> MathIR {
        MathIR::Pow(Box::new(base), Box::new(exp))
    }

    fn norm(expr: &MathIR) -> MathIR {
        Normalizer::new().normalize(expr)
    }

    #[test]
    fn test_add_zero() {
        assert_eq!(norm(&MathIR::Add(vec![x(), int(0)])), x());
        assert_eq!(norm(&MathIR::Add(vec![int(0), x()])), x());
    }

    #[test]
    fn test_exp_zero() {
        assert_eq!(norm(&exp(int(0))), int(1));
    }

    #[test]
    fn test_ln_one() {
        assert_eq!(norm(&ln(int(1))), int(0));
    }

    #[test]
    fn test_exp_ln_cancel() {
        assert_eq!(norm(&exp(ln(x()))), x());
        assert_eq!(norm(&ln(exp(x()))), x());
    }

    #[test]
    fn test_sin_zero() {
        assert_eq!(norm(&sin(int(0))), int(0));
    }

    #[test]
    fn test_cos_zero() {
        assert_eq!(norm(&cos(int(0))), int(1));
    }

    #[test]
    fn test_sin_pi() {
        assert_eq!(norm(&sin(pi())), int(0));
    }

    #[test]
    fn test_cos_pi() {
        assert_eq!(norm(&cos(pi())), int(-1));
    }

    #[test]
    fn test_exp_mul() {
        // exp(x) * exp(y) = exp(x+y)
        let expr = MathIR::Mul(vec![exp(x()), exp(y())]);
        let result = norm(&expr);
        assert_eq!(result, exp(MathIR::Add(vec![x(), y()])));
    }

    #[test]
    fn test_ln_mul() {
        // ln(x*y) = ln(x) + ln(y)
        let expr = ln(MathIR::Mul(vec![x(), y()]));
        let result = norm(&expr);
        assert_eq!(result, MathIR::Add(vec![ln(x()), ln(y())]));
    }

    #[test]
    fn test_ln_pow() {
        // ln(x^y) = y*ln(x)
        let expr = ln(pow(x(), y()));
        let result = norm(&expr);
        assert_eq!(result, MathIR::Mul(vec![y(), ln(x())]));
    }

    #[test]
    fn test_deriv_exp() {
        let var = Variable { id: "x".into(), ..Default::default() };
        let expr = MathIR::Derivative(Box::new(exp(x())), var);
        assert_eq!(norm(&expr), exp(x()));
    }

    #[test]
    fn test_deriv_sin() {
        let var = Variable { id: "x".into(), ..Default::default() };
        let expr = MathIR::Derivative(Box::new(sin(x())), var);
        assert_eq!(norm(&expr), cos(x()));
    }

    #[test]
    fn test_deriv_cos() {
        let var = Variable { id: "x".into(), ..Default::default() };
        let expr = MathIR::Derivative(Box::new(cos(x())), var);
        assert_eq!(norm(&expr), MathIR::Mul(vec![int(-1), sin(x())]));
    }

    #[test]
    fn test_deriv_ln() {
        let var = Variable { id: "x".into(), ..Default::default() };
        let expr = MathIR::Derivative(Box::new(ln(x())), var);
        assert_eq!(norm(&expr), pow(x(), int(-1)));
    }

    #[test]
    fn test_int_deriv_cancel() {
        let var = Variable { id: "x".into(), ..Default::default() };
        let f = MathIR::Var(Box::new(Variable { id: "f".into(), ..Default::default() }));
        let expr = MathIR::Integral {
            expr: Box::new(MathIR::Derivative(Box::new(f.clone()), var.clone())),
            var,
            limits: None,
        };
        assert_eq!(norm(&expr), f);
    }

    #[test]
    fn test_int_one() {
        let var = Variable { id: "x".into(), ..Default::default() };
        let expr = MathIR::Integral { expr: Box::new(int(1)), var, limits: None };
        assert_eq!(norm(&expr), x());
    }

    #[test]
    fn test_int_exp() {
        let var = Variable { id: "x".into(), ..Default::default() };
        let expr = MathIR::Integral { expr: Box::new(exp(x())), var, limits: None };
        assert_eq!(norm(&expr), exp(x()));
    }

    #[test]
    fn test_int_sin() {
        let var = Variable { id: "x".into(), ..Default::default() };
        let expr = MathIR::Integral { expr: Box::new(sin(x())), var, limits: None };
        assert_eq!(norm(&expr), MathIR::Mul(vec![int(-1), cos(x())]));
    }

    #[test]
    fn test_int_cos() {
        let var = Variable { id: "x".into(), ..Default::default() };
        let expr = MathIR::Integral { expr: Box::new(cos(x())), var, limits: None };
        assert_eq!(norm(&expr), sin(x()));
    }

    #[test]
    fn test_complex_composition() {
        // exp(ln(x^2)) — exp_ln_cancel fires first: exp(ln(x^2)) -> x^2
        // then pow_to_mul: x^2 -> x*x
        let expr = exp(ln(pow(x(), int(2))));
        let result = norm(&expr);
        assert_eq!(result, MathIR::Mul(vec![x(), x()]));
    }

    #[test]
    fn test_ln_reciprocal() {
        // ln(1/x) = ln(x^(-1)) = (-1)*ln(x)
        let expr = ln(pow(x(), int(-1)));
        let result = norm(&expr);
        assert_eq!(result, MathIR::Mul(vec![int(-1), ln(x())]));
    }

    #[test]
    fn test_idempotent() {
        // Normalize twice should give same result
        let expr = MathIR::Add(vec![pow(sin(x()), int(2)), pow(cos(x()), int(2))]);
        let once = norm(&expr);
        let twice = norm(&once);
        assert_eq!(once, twice);
    }
}
