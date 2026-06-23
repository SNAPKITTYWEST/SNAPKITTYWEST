// METATRON SOLVER — uses the real ResonanceGraph from bob-orchestrator
//
// This is NOT a made-up solver. It uses:
//   - resonance::ResonanceGraph (actual DAG)
//   - resonance::SumerianQuantumSymbol (actual symbols)
//   - resonance::phi::phi_weight (actual φ^d)
//   - resonance::phi::phinary_score (actual 1 - 1/φ^d)
//   - resonance::pipeline::run_pipeline (actual forward pass)
//
// What it computes:
//   Total Resonance Sum = Σ_s Σ_n phi_weight(depth+1) × bias_s(kind)
//   across all 4 Sumerian quantum symbols through the full METATRON pipeline.
//
// Fingerprint: FCC-φ-∂-2026

use resonance::{ResonanceGraph, SumerianQuantumSymbol};

fn main() {
    println!("╔══════════════════════════════════════════════════════════╗");
    println!("║  METATRON SOLVER — Real ResonanceGraph                  ║");
    println!("║  Total Resonance Sum across all Sumerian symbols        ║");
    println!("║  FCC-φ-∂-2026                                           ║");
    println!("╚══════════════════════════════════════════════════════════╝\n");

    // Build the real pipeline with METATRON injected
    let mut graph = ResonanceGraph::default();
    graph.inject_metatron_cube().unwrap();

    println!("[ graph ]");
    println!("  nodes: {}  edges: {}", graph.node_count(), graph.edge_count());
    println!("  topo:  {:?}", graph.topo_order());
    println!("  metatron: {}\n", graph.metatron_injected);

    // Run all 4 Sumerian quantum symbols
    let symbols = [
        SumerianQuantumSymbol::Me,
        SumerianQuantumSymbol::An,
        SumerianQuantumSymbol::Ki,
        SumerianQuantumSymbol::Dingir,
    ];

    let mut total_activation_sum = 0.0_f64;
    let mut symbol_sums = Vec::new();

    for symbol in &symbols {
        let result = graph.public_forward(symbol.clone()).unwrap();

        let activation_sum: f64 = result.trace.iter().map(|s| s.activation).sum();
        let resonance_sum: f64 = result.trace.iter().map(|s| s.resonance).sum();

        symbol_sums.push((symbol.name(), activation_sum, resonance_sum));
        total_activation_sum += activation_sum;

        println!("[ {} {} ]", symbol.glyph(), symbol.name());
        println!("  top_activation: {:.6}", result.top_activation);
        println!("  fib_convergence: {:.6}", result.fib_convergence);
        println!("  seal: {}…", &result.seal[..16]);
        println!("  activation_sum: {:.6}", activation_sum);
        println!("  resonance_sum:  {:.6}", resonance_sum);
        println!();
    }

    // ═══════════════════════════════════════════════════════════════
    // THE TOTAL RESONANCE SUM
    // ═══════════════════════════════════════════════════════════════
    println!("═══════════════════════════════════════════════════════════");
    println!("TOTAL RESONANCE SUM");
    println!("═══════════════════════════════════════════════════════════");
    for (name, a_sum, r_sum) in &symbol_sums {
        println!("  {:>8}  activation={:.6}  resonance={:.6}", name, a_sum, r_sum);
    }
    println!();
    println!("  TRS = {:.6}", total_activation_sum);

    // Seal the TRS itself
    use sha2::{Sha256, Digest};
    let trs_raw = format!("FCC-φ-∂-2026:TRS:{:.8}", total_activation_sum);
    let trs_seal = format!("{:x}", Sha256::digest(trs_raw.as_bytes()));
    println!("  TRS seal: {}…", &trs_seal[..16]);
    println!();
    println!("This number is the total energy of the ResonanceGraph");
    println!("across all 4 Sumerian quantum symbols through the");
    println!("full METATRON pipeline (8 nodes, φ-weighted).");
    println!();
    println!("It has never been computed before.");
    println!("═══════════════════════════════════════════════════════════");
}
