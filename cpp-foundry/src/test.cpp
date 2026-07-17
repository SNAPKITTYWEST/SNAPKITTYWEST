// Prime Materia Commons v2 — Test suite

#include "types.h"
#include "goldilocks.h"
#include "pmat.h"
#include "spectral.h"
#include "recurrence.h"
#include "gate.h"
#include "certify.h"
#include "audit.h"
#include "linker.h"

#include <iostream>
#include <cassert>
#include <cmath>

using namespace pmc;

static int tests_run = 0;
static int tests_passed = 0;

#define TEST(name) \
    do { tests_run++; std::cout << "  TEST " << #name << "... "; } while(0)
#define PASS() \
    do { tests_passed++; std::cout << "PASS\n"; } while(0)
#define FAIL(msg) \
    do { std::cout << "FAIL: " << msg << "\n"; } while(0)
#define ASSERT(cond, msg) \
    do { if (!(cond)) { FAIL(msg); return; } } while(0)

// ── Goldilocks tests ─────────────────────────────────────────────────────────

static void test_goldilocks_add() {
    TEST(goldilocks_add);
    Goldilocks::Elem a(100);
    Goldilocks::Elem b(200);
    auto r = Goldilocks::add(a, b);
    ASSERT(r.v == 300, "100 + 200 != 300");
    PASS();
}

static void test_goldilocks_mul() {
    TEST(goldilocks_mul);
    Goldilocks::Elem a(7);
    Goldilocks::Elem b(6);
    auto r = Goldilocks::mul(a, b);
    ASSERT(r.v == 42, "7 * 6 != 42");
    PASS();
}

static void test_goldilocks_inv() {
    TEST(goldilocks_inv);
    Goldilocks::Elem a(42);
    auto inv = Goldilocks::inv(a);
    auto one = Goldilocks::mul(a, inv);
    ASSERT(one.v == 1, "a * a^-1 != 1");
    PASS();
}

static void test_goldilocks_sub() {
    TEST(goldilocks_sub);
    Goldilocks::Elem a(100);
    Goldilocks::Elem b(50);
    auto r = Goldilocks::sub(a, b);
    ASSERT(r.v == 50, "100 - 50 != 50");
    PASS();
}

// ── PMat tests ───────────────────────────────────────────────────────────────

static void test_pmat_insert() {
    TEST(pmat_insert);
    PMat m(3, 3);
    ASSERT(m.insert(0, 0, 1, {1, 1}), "insert failed");
    ASSERT(m.insert(0, 1, -1, {0, 1}), "insert failed");
    ASSERT(m.entries().size() == 2, "wrong entry count");
    PASS();
}

static void test_pmat_conservation() {
    TEST(pmat_conservation);
    PMat m(2, 2);
    m.insert(0, 0, 1, {3, 5});
    m.insert(0, 1, -1, {1, 2});
    m.insert(1, 0, 1, {2, 1});
    auto cons = m.conservation();
    ASSERT(cons.delta_source == 6, "wrong delta_source");
    ASSERT(cons.delta_target == 8, "wrong delta_target");
    PASS();
}

// ── Spectral tests ───────────────────────────────────────────────────────────

static void test_spectral_contractive() {
    TEST(spectral_contractive);
    std::vector<std::vector<double>> J = {
        {0.2, 0.1},
        {0.05, 0.15}
    };
    auto r = SpectralGovernor::analyze(J, 0.1);
    ASSERT(r.contractive, "should be contractive");
    PASS();
}

static void test_spectral_expansive() {
    TEST(spectral_expansive);
    std::vector<std::vector<double>> J = {
        {0.9, 0.3},
        {0.3, 0.95}
    };
    auto r = SpectralGovernor::analyze(J, 0.1);
    ASSERT(!r.contractive, "should not be contractive");
    PASS();
}

// ── Recurrence tests ─────────────────────────────────────────────────────────

static void test_recurrence_converges() {
    TEST(recurrence_converges);
    RecurrenceConfig cfg{};
    cfg.epsilon = 0.1;
    cfg.tier = Tier::T1;
    cfg.profile = WeightProfile::Uniform;
    cfg.max_steps = 200;
    cfg.convergence_tol = 1e-6;

    Recurrence rec(cfg);
    rec.synthesize_weights({2, 3, 5});

    auto T = [](const std::vector<double>& x) -> std::vector<double> {
        return {0.5 * x[0] + 0.3};
    };
    auto proj = [](const std::vector<double>& x) -> std::vector<double> {
        return {std::clamp(x[0], -1.0, 1.0)};
    };

    auto steps = rec.run({1.0}, T, proj);
    ASSERT(rec.state().converged, "should converge");
    ASSERT(steps.back().residual < cfg.convergence_tol, "residual too large");
    PASS();
}

// ── Gate tests ───────────────────────────────────────────────────────────────

static void test_emission_gate_suppress() {
    TEST(emission_gate_suppress);
    EmissionGate gate(GatePolicy::Suppress, 0.1);
    auto out = gate.apply({1.0}, {0.5}, 0.95); // q > 1 - epsilon
    ASSERT(out[0] == 0.0, "should suppress");
    PASS();
}

static void test_emission_gate_passthrough() {
    TEST(emission_gate_passthrough);
    EmissionGate gate(GatePolicy::PassThrough, 0.1);
    auto out = gate.apply({1.0}, {0.5}, 0.95);
    ASSERT(out[0] == 1.0, "should pass through");
    PASS();
}

// ── CSL tests ────────────────────────────────────────────────────────────────

static void test_csl_neutrality() {
    TEST(csl_neutrality);
    CSLGate csl(0.1);
    std::vector<double> x = {0.3, 0.7};
    std::vector<double> T_x = {0.31, 0.69};
    auto v = csl.check_neutrality(x, T_x);
    ASSERT(v == CSLVerdict::Pass, "should pass neutrality");
    PASS();
}

// ── Triple-Lock tests ────────────────────────────────────────────────────────

static WormSeal genesis_seal() { return WormSeal::zero(); }

static void test_triple_lock_all_pass() {
    TEST(triple_lock_all_pass);
    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    TripleLock lock(cfg);

    auto g = lock.guardian_check({0.5}, {0.6}, 0.3, "ACTIVE", genesis_seal());
    ASSERT(g.approved, "guardian should pass");
    auto e = lock.examiner_check(1e14, 0.5, {}, g.seal);
    ASSERT(e.approved, "examiner should pass");
    auto p = lock.publisher_check(g, e, 0, "ACTIVE");
    ASSERT(p.approved, "publisher should pass");
    ASSERT(lock.verify(g, e, p), "all should pass");
    PASS();
}

static void test_triple_lock_guardian_rejects() {
    TEST(triple_lock_guardian_rejects);
    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    TripleLock lock(cfg);

    auto g = lock.guardian_check({0.5}, {0.6}, 1.5, "ACTIVE", genesis_seal());
    ASSERT(!g.approved, "guardian should reject");
    PASS();
}

static void test_triple_lock_examiner_rejects_drift() {
    TEST(triple_lock_examiner_rejects_drift);
    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    TripleLock lock(cfg);

    auto g = lock.guardian_check({0.5}, {0.6}, 0.3, "ACTIVE", genesis_seal());
    ASSERT(g.approved, "guardian should pass");
    // Use a drift value clearly above max_drift (double precision: MAX_DRIFT*2)
    auto e = lock.examiner_check(static_cast<double>(MAX_DRIFT) * 2.0, 0.5, {}, g.seal);
    ASSERT(!e.approved, "examiner should reject drift");
    PASS();
}

static void test_triple_lock_examiner_rejects_conflict() {
    TEST(triple_lock_examiner_rejects_conflict);
    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    TripleLock lock(cfg);

    auto g = lock.guardian_check({0.5}, {0.6}, 0.3, "ACTIVE", genesis_seal());
    ASSERT(g.approved, "guardian should pass");
    ConflictLog c{};
    c.kind = ConflictLog::Kind::ProofDrift;
    c.severity = 0.95;
    auto e = lock.examiner_check(1e10, 0.5, {c}, g.seal);
    ASSERT(!e.approved, "examiner should reject high-severity conflict");
    PASS();
}

static void test_triple_lock_publisher_rejects_guardian_fail() {
    TEST(triple_lock_publisher_rejects_guardian_fail);
    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    TripleLock lock(cfg);

    auto g = lock.guardian_check({0.5}, {0.6}, 1.5, "ACTIVE", genesis_seal());
    ASSERT(!g.approved, "guardian should reject");
    auto e = lock.examiner_check(1e10, 0.5, {}, g.seal);
    auto p = lock.publisher_check(g, e, 0, "ACTIVE");
    ASSERT(!p.approved, "publisher should reject when guardian failed");
    PASS();
}

static void test_triple_lock_publisher_rejects_examiner_fail() {
    TEST(triple_lock_publisher_rejects_examiner_fail);
    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    TripleLock lock(cfg);

    auto g = lock.guardian_check({0.5}, {0.6}, 0.3, "ACTIVE", genesis_seal());
    ASSERT(g.approved, "guardian should pass");
    auto e = lock.examiner_check(static_cast<double>(MAX_DRIFT) * 2.0, 0.5, {}, g.seal);
    ASSERT(!e.approved, "examiner should reject drift");
    auto p = lock.publisher_check(g, e, 0, "ACTIVE");
    ASSERT(!p.approved, "publisher should reject when examiner failed");
    PASS();
}

static void test_triple_lock_publisher_rejects_retry_exceeded() {
    TEST(triple_lock_publisher_rejects_retry_exceeded);
    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    TripleLock lock(cfg);

    auto g = lock.guardian_check({0.5}, {0.6}, 0.3, "ACTIVE", genesis_seal());
    auto e = lock.examiner_check(1e10, 0.5, {}, g.seal);
    auto p = lock.publisher_check(g, e, 9999, "ACTIVE");
    ASSERT(!p.approved, "publisher should reject retry exceeded");
    PASS();
}

static void test_triple_lock_provisional_rejected_at_guardian() {
    TEST(triple_lock_provisional_rejected_at_guardian);
    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    TripleLock lock(cfg);

    auto g = lock.guardian_check({0.5}, {0.6}, 0.3, "PROVISIONAL", genesis_seal());
    ASSERT(!g.approved, "guardian should reject PROVISIONAL");
    PASS();
}

static void test_triple_lock_provisional_rejected_at_publisher() {
    TEST(triple_lock_provisional_rejected_at_publisher);
    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    TripleLock lock(cfg);

    auto g = lock.guardian_check({0.5}, {0.6}, 0.3, "ACTIVE", genesis_seal());
    auto e = lock.examiner_check(1e10, 0.5, {}, g.seal);
    auto p = lock.publisher_check(g, e, 0, "PROVISIONAL");
    ASSERT(!p.approved, "publisher should reject PROVISIONAL");
    PASS();
}

static void test_triple_lock_seal_chain_integrity() {
    TEST(triple_lock_seal_chain_integrity);
    TripleLock::Config cfg{};
    cfg.max_drift = MAX_DRIFT;
    TripleLock lock(cfg);

    auto g = lock.guardian_check({0.5}, {0.6}, 0.3, "ACTIVE", genesis_seal());
    ASSERT(g.approved, "guardian should pass");

    auto e = lock.examiner_check(1e10, 0.5, {}, g.seal);
    ASSERT(e.approved, "examiner should pass");
    for (int i = 0; i < 32; ++i) {
        ASSERT(e.seal.prev_seal[i] == g.seal.hash[i],
               "examiner seal must chain from guardian seal");
    }

    auto p = lock.publisher_check(g, e, 0, "ACTIVE");
    ASSERT(p.approved, "publisher should pass");
    // Publisher seal must chain from Examiner seal
    for (int i = 0; i < 32; ++i) {
        ASSERT(p.seal.prev_seal[i] == e.seal.hash[i],
               "publisher seal must chain from examiner seal");
    }

    PASS();
}

// ── Certification tests ──────────────────────────────────────────────────────

static void test_certify() {
    TEST(certify);
    Certifier cert(0.01);
    std::vector<StepInfo> steps;
    for (size_t i = 0; i < 5; ++i) {
        StepInfo s{};
        s.step = i;
        s.q = 0.3;
        s.epsilon = 0.1;
        s.residual = 1e-9;
        steps.push_back(s);
    }
    auto ac = cert.certify(steps);
    ASSERT(ac.certified, "should be certified");
    ASSERT(ac.safety_margin > 0, "margin should be positive");
    PASS();
}

// ── Audit tests ──────────────────────────────────────────────────────────────

static void test_audit_chain() {
    TEST(audit_chain);
    AuditChain chain;
    uint8_t p1[32] = {1};
    uint8_t p2[32] = {2};
    chain.append("event1", p1, 1000);
    chain.append("event2", p2, 2000);
    ASSERT(chain.size() == 2, "wrong size");
    ASSERT(chain.verify(), "chain should be valid");
    PASS();
}

// ── Linker tests ─────────────────────────────────────────────────────────────

static void test_linker() {
    TEST(linker);
    LinkerConfig cfg{};
    cfg.max_identity_duplicates = 0;
    cfg.spectral_coupling_bound = 1.0;
    Linker linker(cfg);

    std::vector<std::vector<uint8_t>> arts = {
        {0x7F, 0x50, 0x49, 0x52, 0x01},  // PIRTM magic + version
        {0x7F, 0x50, 0x49, 0x52, 0x02}
    };

    auto linked = linker.link(arts);
    ASSERT(linked.size() == 2, "wrong count");
    ASSERT(linked[0].spectral_ok, "should pass spectral");
    PASS();
}

int main() {
    std::cout << "Prime Materia Commons v2 — Test Suite\n";
    std::cout << "═══════════════════════════════════════\n\n";

    // Goldilocks
    test_goldilocks_add();
    test_goldilocks_mul();
    test_goldilocks_inv();
    test_goldilocks_sub();

    // PMat
    test_pmat_insert();
    test_pmat_conservation();

    // Spectral
    test_spectral_contractive();
    test_spectral_expansive();

    // Recurrence
    test_recurrence_converges();

    // Gates
    test_emission_gate_suppress();
    test_emission_gate_passthrough();

    // CSL
    test_csl_neutrality();

    // Triple-Lock
    test_triple_lock_all_pass();
    test_triple_lock_guardian_rejects();
    test_triple_lock_examiner_rejects_drift();
    test_triple_lock_examiner_rejects_conflict();
    test_triple_lock_publisher_rejects_guardian_fail();
    test_triple_lock_publisher_rejects_examiner_fail();
    test_triple_lock_publisher_rejects_retry_exceeded();
    test_triple_lock_provisional_rejected_at_guardian();
    test_triple_lock_provisional_rejected_at_publisher();
    test_triple_lock_seal_chain_integrity();

    // Certification
    test_certify();

    // Audit
    test_audit_chain();

    // Linker
    test_linker();

    std::cout << "\n═══════════════════════════════════════\n";
    std::cout << "Results: " << tests_passed << "/" << tests_run << " passed\n";

    return (tests_passed == tests_run) ? 0 : 1;
}
