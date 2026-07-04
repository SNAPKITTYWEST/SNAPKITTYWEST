use crate::{MathIR, Constant, Variable};
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
    }

    fn add_calculus_rules(rules: &mut Vec<RewriteRule>) {
        rules.push(RewriteRule {
            name: "deriv_var".to_string(),
            pattern: MathIR::Derivative(Box::new(MathIR::Var(Box::new(var_x()))), var_x()),
            replacement: MathIR::Const(Constant::Int(1)),
            priority: 90,
        });

        rules.push(RewriteRule {
            name: "int_deriv_cancel".to_string(),
            pattern: MathIR::Integral {
                expr: Box::new(MathIR::Derivative(Box::new(MathIR::Var(Box::new(var_f()))), var_x())),
                var: var_x(),
                limits: None,
            },
            replacement: MathIR::Var(Box::new(var_f())),
            priority: 90,
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
            (MathIR::Const(pc), MathIR::Const(ec)) => pc == ec,
            (MathIR::Derivative(pa, pv), MathIR::Derivative(ea, ev)) => {
                self.matches(pa, ea) && pv == ev
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
        if let MathIR::Var(p) = pattern {
            if p.id.starts_with("__") {
                bindings.insert(p.id.clone(), expr.clone());
                return;
            }
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
            other => other.clone(),
        }
    }
}

impl Default for Normalizer {
    fn default() -> Self {
        Self::new()
    }
}
