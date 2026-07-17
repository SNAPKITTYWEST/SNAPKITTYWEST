//! Code generation

pub struct CodeGen;

impl CodeGen {
    pub fn generate(statements: &[String]) -> String {
        let mut output = String::new();
        for stmt in statements {
            output.push_str(stmt);
            output.push('\n');
        }
        output
    }
}
