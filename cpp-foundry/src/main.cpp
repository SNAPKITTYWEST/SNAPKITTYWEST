// Prime Materia Commons v2 — CLI entry point
// Clean C++ reverse engineering of foundry-intel-2026-07-11

#include "types.h"
#include "goldilocks.h"
#include "pmat.h"
#include "spectral.h"
#include "recurrence.h"
#include "gate.h"
#include "certify.h"
#include "audit.h"

#include <iostream>
#include <iomanip>
#include <cmath>
#include <chrono>

using namespace pmc;

static void print_header() {
    std::cout << R"(
╔══════════════════════════════════════════════════════════════╗
║          Prime Materia Commons v2 — Foundry Intel           ║
║     Deterministic Orchestration Substrate for Agents        ║
║            Ω ← TRUST ∧ CODE  ·  No sorry remains           ║
╚══════════════════════════════════════════════════════════════╝
)" << std::endl;
}

// ── Demo: Goldilocks field arithmetic ────────────────────────────────────────

static void demo_goldilocks() {
    std::cout << "─── Goldilocks Field F_p (p = 2^64 - 2^32 + 1) ───\n";

    Goldilocks::Elem a(42);
    Goldilocks::Elem b(1337);

    auto sum = Goldilocks::add(a, b);
    auto prod = Goldilocks::mul(a, b);
    auto inv_a = Goldilocks::inv(a);
    auto check = Goldilocks::mul(a, inv_a);

    std::cout << "  a = " << a.v << "\n";
    std::cout << "  b = " << b.v << "\n";
    std::cout << "  a + b = " << sum.v << "\n";
    std::cout << "  a * b = " << prod.v << "\n";
    std::cout << "  a^-1 = " << inv_a.v << "\n";
    std::cout << "  a * a^-1 = " << check.v << " (should be 1)\n";
    std::cout << "  SSE2: " << (Goldilocks::has_sse2() ? "yes" : "no") << "\n";
    std::cout << "  AVX2: " << (Goldilocks::has_avx2() ? "yes" : "no") << "\n\n";
}

// ── Demo: Banach contraction recurrence ──────────────────────────────────────

static void demo_recurrence() {
    std::cout << "─── Banach Contraction Recurrence ───\n";

    RecurrenceConfig cfg{};
    cfg.epsilon = 0.1;
    cfg.tier = Tier::T1;
    cfg.profile = WeightProfile::Uniform;
    cfg.max_steps = 100;
    cfg.convergence_tol = 1e-8;

    Recurrence rec(cfg);
    rec.synthesize_weights({2, 3, 5, 7, 11, 13});

    // Fixed point of T(x) = 0.5*x + 0.3
    auto T = [](const std::vector<double>& x) -> std::vector<double> {
        return {0.5 * x[0] + 0.3};
    };
    auto project = [](const std::vector<double>& x) -> std::vector<double> {
        return {std::clamp(x[0], -1.0, 1.0)};
    };

    auto steps = rec.run({1.0}, T, project);

    std::cout << "  Steps: " << steps.size() << "\n";
    if (!steps.empty()) {
        const auto& last = steps.back();
        std::cout << "  Final residual: " << std::scientific << last.residual << "\n";
        std::cout << "  Final q: " << last.q << "\n";
        std::cout << "  Converged: " << (last.residual < cfg.convergence_tol ? "yes" : "no") << "\n";
        std::cout << "  Final state: " << rec.state().x_current[0] << "\n";
    }
    std::cout << "\n";
}

// ── Demo: Spectral governor ──────────────────────────────────────────────────

static void demo_spectral() {
    std::cout << "─── Spectral Governor ───\n";

    // Contractive Jacobian (spectral radius < 1)
    std::vector<std::vector<double>> J_contractive = {
        {0.3, 0.1},
        {0.05, 0.2}
    };

    auto result = SpectralGovernor::analyze(J_contractive, 0.1);
    std::cout << "  Contractive Jacobian:\n";
    std::cout << "    Gershgorin bound: " << result.gershgorin_bound << "\n";
    std::cout << "    Power iter bound: " << result.power_iter_bound << "\n";
    std::cout << "    Contractive: " << (result.contractive ? "yes" : "no") << "\n\n";

    // Non-contractive Jacobian
    std::vector<std::vector<double>> J_expansive = {
        {0.8, 0.3},
        {0.3, 0.9}
    };

    result = SpectralGovernor::analyze(J_expansive, 0.1);
    std::cout << "  Expansive Jacobian:\n";
    std::cout << "    Gershgorin bound: " << result.gershgorin_bound << "\n";
    std::cout << "    Contractive: " << (result.contractive ? "yes" : "no") << "\n\n";
}

// ── Demo: Triple-Lock gateway ────────────────────────────────────────────────

static void demo_triple_lock() {
    std::cout << "─── Triple-Lock Gateway ───\n";

    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    cfg.min_prime_index = 0;

    TripleLock lock(cfg);

    GuardianDecision g = lock.guardian_check({0.5}, {0.6}, 0.3);
    ExaminerDecision e = lock.examiner_check(1e14, 0.5, {});
    PublisherDecision p = lock.publisher_check(g, e, 0);

    std::cout << "  Guardian: " << (g.approved ? "PASS" : "FAIL") << " — " << g.reason << "\n";
    std::cout << "  Examiner: " << (e.approved ? "PASS" : "FAIL") << " — " << e.reason << "\n";
    std::cout << "  Publisher: " << (p.approved ? "PASS" : "FAIL") << " — " << p.reason << "\n";
    std::cout << "  All locks: " << (lock.verify(g, e, p) ? "PASS" : "FAIL") << "\n\n";
}

// ── Demo: CSL gate ───────────────────────────────────────────────────────────

static void demo_csl() {
    std::cout << "─── CSL Gate (Conscious Sovereignty) ───\n";

    CSLGate csl(0.1);

    std::vector<double> x = {0.3, 0.7, 0.5};
    std::vector<double> T_x = {0.31, 0.69, 0.51};
    double residual = 0.02;

    auto verdict = csl.check_all(x, T_x, residual);
    std::cout << "  Neutrality: " << (csl.check_neutrality(x, T_x) == CSLVerdict::Pass ? "PASS" : "FAIL") << "\n";
    std::cout << "  Beneficence: " << (csl.check_beneficence(x, T_x, residual) == CSLVerdict::Pass ? "PASS" : "FAIL") << "\n";
    std::cout << "  Full check: " << (verdict == CSLVerdict::Pass ? "PASS" : "FAIL") << "\n\n";
}

// ── Demo: Audit chain ────────────────────────────────────────────────────────

static void demo_audit() {
    std::cout << "─── WORM Audit Chain ───\n";

    AuditChain chain;

    // Simulate three events
    uint8_t payload1[32] = {1, 2, 3};
    uint8_t payload2[32] = {4, 5, 6};
    uint8_t payload3[32] = {7, 8, 9};

    auto now = std::chrono::steady_clock::now().time_since_epoch().count();

    chain.append("BOOT_COMPLETE", payload1, now);
    chain.append("TRANSITION_VERIFIED", payload2, now + 1000);
    chain.append("WITNESS_SEALED", payload3, now + 2000);

    std::cout << "  Chain size: " << chain.size() << " events\n";
    std::cout << "  Chain valid: " << (chain.verify() ? "yes" : "no") << "\n\n";
}

// ── Demo: Certification ──────────────────────────────────────────────────────

static void demo_certify() {
    std::cout << "─── AceCertificate ───\n";

    Certifier cert(0.01);

    std::vector<StepInfo> steps;
    for (size_t i = 0; i < 10; ++i) {
        StepInfo s{};
        s.step = i;
        s.q = 0.3 + 0.05 * i;
        s.epsilon = 0.1;
        s.residual = 1.0 / (i + 1);
        steps.push_back(s);
    }

    auto ac = cert.certify(steps);
    std::cout << "  Lipschitz upper: " << ac.lipschitz_upper << "\n";
    std::cout << "  Safety margin: " << ac.safety_margin << "\n";
    std::cout << "  Tail bound: " << ac.tail_bound << "\n";
    std::cout << "  Certified: " << (ac.certified ? "yes" : "no") << "\n\n";
}

// ── Demo: Prime Monomial Matrix ──────────────────────────────────────────────

static void demo_pmat() {
    std::cout << "─── Prime Monomial Matrix ───\n";

    PMat m(3, 3);
    m.insert(0, 0, 1, {1, 1});
    m.insert(0, 1, -1, {0, 1});
    m.insert(1, 2, 1, {1, 0});
    m.insert(2, 0, -1, {0, 1});

    auto cons = m.conservation();
    std::cout << "  Entries: " << m.entries().size() << "\n";
    std::cout << "  Conservation (delta_source, delta_target): ("
              << cons.delta_source << ", " << cons.delta_target << ")\n";
    std::cout << "  Frobenius norm: " << m.frobenius_norm() << "\n\n";
}

int main(int argc, char* argv[]) {
    print_header();

    demo_goldilocks();
    demo_spectral();
    demo_recurrence();
    demo_triple_lock();
    demo_csl();
    demo_certify();
    demo_audit();
    demo_pmat();

    std::cout << "All demos complete. No sorry remains.\n";
    return 0;
}
