#pragma once
// Prime Materia Commons v2 — Core Types
// Clean C++ reverse engineering of foundry-intel-2026-07-11
// WORM anchor: Zenodo DOI 10.5281/zenodo.21268911

#include <cstdint>
#include <array>
#include <vector>
#include <string>
#include <optional>
#include <chrono>

namespace pmc {

// ── Constants ────────────────────────────────────────────────────────────────

constexpr uint64_t GOLDILOCKS_PRIME = 0xFFFFFFFF00000001ULL; // 2^64 - 2^32 + 1
constexpr size_t  K_MAX             = 133144;
constexpr uint64_t MAX_DRIFT        = 300000000000000000ULL;  // 0.3Ξ in wei
constexpr size_t  PIRTM_MAGIC       = 0x7F504952;             // \x7FPIR
constexpr double  PHI               = 1.618033988749895;
constexpr size_t  GENESIS_HASH_SIZE = 32;

// First 64 primes for prime-gated identity
inline constexpr std::array<uint64_t, 64> P_64 = {
    2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,
    59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,
    137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,
    227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311
};

// ── Tier-based epsilon margins ───────────────────────────────────────────────

enum class Tier : uint8_t {
    T1 = 1,  // epsilon = 0.10
    T2 = 2,  // epsilon = 0.05
    T3 = 3,  // epsilon = 0.02
    T4 = 4,  // epsilon = 0.01
};

constexpr double tier_epsilon(Tier t) {
    switch (t) {
        case Tier::T1: return 0.10;
        case Tier::T2: return 0.05;
        case Tier::T3: return 0.02;
        case Tier::T4: return 0.01;
    }
    return 0.10;
}

// ── Weight Profile ───────────────────────────────────────────────────────────

enum class WeightProfile : uint8_t {
    Uniform,
    Harmonic,
    LogDecay,
};

// ── Emission Gate Policy ─────────────────────────────────────────────────────

enum class GatePolicy : uint8_t {
    PassThrough,  // emit regardless
    Suppress,     // output zeros if contraction violated
    Hold,         // output previous state
    Attenuate,    // scale output by (1 - epsilon - q)
};

// ── CSL Check Result ─────────────────────────────────────────────────────────

enum class CSLVerdict : uint8_t {
    Pass,
    FailNeutrality,
    FailBeneficence,
    FailCommutation,
};

// ── ResonanceWord: 64-bit packed ────────────────────────────────────────────
// bits [0:6]   = class (0-95)
// bits [7:63]  = 57-bit payload

struct ResonanceWord {
    uint64_t raw;

    static ResonanceWord pack(uint8_t cls, uint64_t payload) {
        return { (static_cast<uint64_t>(cls) & 0x7F) | ((payload & 0x1FFFFFFFFFFFFFFULL) << 7) };
    }
    uint8_t  cls()     const { return static_cast<uint8_t>(raw & 0x7F); }
    uint64_t payload() const { return (raw >> 7) & 0x1FFFFFFFFFFFFFFULL; }
};

// ── PrimeMask: 64-bit bitmask of attached primes ────────────────────────────

struct PrimeMask {
    uint64_t bits;

    bool has_prime(size_t idx) const { return (bits >> idx) & 1; }
    void attach_prime(size_t idx)    { bits |= (1ULL << idx); }
    uint32_t popcount() const;
};

// ── Signature: grading monomial for PMat ────────────────────────────────────

struct Signature {
    int32_t delta_source;
    int32_t delta_target;

    Signature operator-(const Signature& o) const {
        return { delta_source - o.delta_source, delta_target - o.delta_target };
    }
    bool operator==(const Signature& o) const {
        return delta_source == o.delta_source && delta_target == o.delta_target;
    }
};

// ── StepInfo: per-iteration snapshot ─────────────────────────────────────────

struct StepInfo {
    size_t             step;
    double             q;          // effective Lipschitz constant (< 1.0 - epsilon)
    double             epsilon;    // contraction margin
    double             n_xi;      // ‖Xi‖
    double             n_lam;     // ‖Lambda‖
    bool               projected;  // soft projection triggered
    double             residual;   // ‖x_next - x_t‖
    std::optional<ResonanceWord> resonance_word;
    std::optional<PrimeMask>     prime_mask;
    std::chrono::nanoseconds     wall_time{0};
};

// ── AceCertificate ──────────────────────────────────────────────────────────

struct AceCertificate {
    double  lipschitz_upper;   // max_q
    double  safety_margin;     // (1 - epsilon) - max_q
    double  tail_bound;        // tail_norm / (1 - max_q)
    bool    certified;         // margin >= delta
    uint64_t timestamp_ns;
};

// ── Audit Event ──────────────────────────────────────────────────────────────

struct AuditEvent {
    uint64_t    index;
    std::string label;
    std::array<uint8_t, 32> prev_hash;
    std::array<uint8_t, 32> payload_hash;
    std::array<uint8_t, 32> event_hash;
    std::array<uint8_t, 32> chain_hash;
    uint64_t    timestamp_ns;
};

// ── Unified Witness (Layer 7) ───────────────────────────────────────────────

struct UnifiedWitness {
    std::array<uint8_t, 32> state_before;
    std::array<uint8_t, 32> state_after;
    std::string             transition;
    std::array<uint8_t, 32> proof_hash;
    std::array<uint8_t, 32> policy_hash;
    std::array<uint8_t, 32> guardian_hash;
    std::array<uint8_t, 32> examiner_hash;
    std::array<uint8_t, 32> publisher_hash;
    uint64_t                timestamp_ns;
    std::array<uint8_t, 32> prev_witness_hash;
    std::array<uint8_t, 32> curr_witness_hash;
};

// ── ConflictLogSchema ────────────────────────────────────────────────────────

struct ConflictLog {
    enum class Kind : uint8_t {
        ResourceExhaustion,
        CyclicDependency,
        ContradictoryWitness,
        SchedulerConflict,
        ProofDrift,
        MemoryCorruption,
        PolicyDivergence,
    };
    Kind   kind;
    double severity;  // [0, 1]
    std::string detail;
    uint64_t timestamp_ns;
};

// ── Guardian / Examiner / Publisher decisions ────────────────────────────────

struct GuardianDecision {
    bool approved;
    std::string reason;
};

struct ExaminerDecision {
    bool approved;
    double drift_magnitude;
    std::string reason;
};

struct PublisherDecision {
    bool approved;
    std::string reason;
};

} // namespace pmc
