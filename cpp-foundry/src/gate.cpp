// Emission Gate + CSL Gate + Triple-Lock Gateway

#include "gate.h"
#include <cmath>
#include <algorithm>

namespace pmc {

// ── Emission Gate ────────────────────────────────────────────────────────────

EmissionGate::EmissionGate(GatePolicy policy, double epsilon)
    : policy_(policy), epsilon_(epsilon) {}

std::vector<double> EmissionGate::apply(const std::vector<double>& output,
                                        const std::vector<double>& prev_output,
                                        double q) const {
    switch (policy_) {
        case GatePolicy::PassThrough:
            return output;

        case GatePolicy::Suppress: {
            if (q >= 1.0 - epsilon_) {
                return std::vector<double>(output.size(), 0.0);
            }
            return output;
        }

        case GatePolicy::Hold:
            if (q >= 1.0 - epsilon_) {
                return prev_output;
            }
            return output;

        case GatePolicy::Attenuate: {
            double scale = std::max(0.0, 1.0 - epsilon_ - q);
            std::vector<double> result(output.size());
            for (size_t i = 0; i < output.size(); ++i) {
                result[i] = output[i] * scale;
            }
            return result;
        }
    }
    return output;
}

// ── CSL Gate ─────────────────────────────────────────────────────────────────

CSLGate::CSLGate(double epsilon) : epsilon_(epsilon) {}

CSLVerdict CSLGate::check_neutrality(const std::vector<double>& x,
                                     const std::vector<double>& T_x) const {
    // Pairwise deviation: for all i,j: |T(x)_i - T(x)_j| < epsilon * |x_i - x_j|
    for (size_t i = 0; i < x.size(); ++i) {
        for (size_t j = i + 1; j < x.size(); ++j) {
            double dx = std::abs(x[i] - x[j]);
            double dT = std::abs(T_x[i] - T_x[j]);
            if (dx > 1e-15 && dT / dx > 1.0 + epsilon_) {
                return CSLVerdict::FailNeutrality;
            }
        }
    }
    return CSLVerdict::Pass;
}

CSLVerdict CSLGate::check_beneficence(const std::vector<double>& x,
                                      const std::vector<double>& T_x,
                                      double residual) const {
    // Norm growth bounded: ‖T(x)‖ ≤ (1 + epsilon) * ‖x‖
    double norm_x = 0.0, norm_Tx = 0.0;
    for (size_t i = 0; i < x.size(); ++i) {
        norm_x += x[i] * x[i];
        norm_Tx += T_x[i] * T_x[i];
    }
    norm_x = std::sqrt(norm_x);
    norm_Tx = std::sqrt(norm_Tx);

    if (norm_x > 1e-15 && norm_Tx > (1.0 + epsilon_) * norm_x) {
        return CSLVerdict::FailBeneficence;
    }

    // Residual bounded
    if (residual > (1.0 + epsilon_) * norm_x) {
        return CSLVerdict::FailBeneficence;
    }

    return CSLVerdict::Pass;
}

CSLVerdict CSLGate::check_commutation(
    const std::vector<double>& x,
    std::function<std::vector<double>(const std::vector<double>&)> T,
    std::function<std::vector<double>(const std::vector<double>&)> filter) const {
    // filter(T(x)) ≈ T(filter(x))
    auto Tx = T(x);
    auto fTx = filter(Tx);
    auto fx = filter(x);
    auto Tfx = T(fx);

    for (size_t i = 0; i < x.size(); ++i) {
        if (std::abs(fTx[i] - Tfx[i]) > epsilon_) {
            return CSLVerdict::FailCommutation;
        }
    }
    return CSLVerdict::Pass;
}

CSLVerdict CSLGate::check_all(const std::vector<double>& x,
                              const std::vector<double>& T_x,
                              double residual) const {
    auto v = check_neutrality(x, T_x);
    if (v != CSLVerdict::Pass) return v;

    v = check_beneficence(x, T_x, residual);
    return v;
}

// ── Triple-Lock ──────────────────────────────────────────────────────────────

TripleLock::TripleLock(const Config& cfg) : config_(cfg) {}

WormSeal TripleLock::compute_seal(
    const std::string& verdict,
    const WormSeal& prev_seal,
    const std::string& payload,
    uint64_t ts) const {
    // Deterministic WORM seal: SHA-256(verdict || prev_hash || payload || ts)
    // Using a simplified hash for the engine; production uses SHA-256 via OpenSSL.
    WormSeal seal;
    seal.prev_seal = prev_seal.hash;
    seal.timestamp_ns = ts;

    // Fold inputs into 32-byte seal (simplified djb2+fnv hybrid for engine use)
    uint64_t h1 = 5381, h2 = 14695981039346656037ULL;
    for (char c : verdict) { h1 = ((h1 << 5) + h1) ^ static_cast<unsigned char>(c); h2 ^= static_cast<unsigned char>(c); h2 *= 1099511628211ULL; }
    for (uint8_t b : prev_seal.hash) { h1 = ((h1 << 5) + h1) ^ b; h2 ^= b; h2 *= 1099511628211ULL; }
    for (char c : payload) { h1 = ((h1 << 5) + h1) ^ static_cast<unsigned char>(c); h2 ^= static_cast<unsigned char>(c); h2 *= 1099511628211ULL; }
    h1 ^= static_cast<uint64_t>(ts); h2 ^= static_cast<uint64_t>(ts); h2 *= 1099511628211ULL;

    // Pack into 32 bytes (two 64-bit halves + zeros)
    for (int i = 0; i < 8; ++i) {
        seal.hash[i]     = static_cast<uint8_t>((h1 >> (i * 8)) & 0xFF);
        seal.hash[i + 8] = static_cast<uint8_t>((h2 >> (i * 8)) & 0xFF);
    }
    for (int i = 16; i < 32; ++i) {
        seal.hash[i] = static_cast<uint8_t>((h1 ^ h2) >> ((i - 16) * 8)) & 0xFF;
    }
    return seal;
}

GuardianDecision TripleLock::guardian_check(
    const std::vector<double>& x,
    const std::vector<double>& x_next,
    double spectral_radius,
    const std::string& status,
    const WormSeal& prev_seal) const {
    uint64_t ts = static_cast<uint64_t>(
        std::chrono::steady_clock::now().time_since_epoch().count());

    // SYNTH-006: PROVISIONAL status rejected at Lock 1
    if (status == "PROVISIONAL") {
        auto seal = compute_seal("SILENCE", prev_seal, "provisional-rejected", ts);
        return {false, "SYNTH-006: PROVISIONAL status rejected at Guardian", seal};
    }

    // Mathematical legality: spectral radius must be < 1
    if (spectral_radius >= 1.0) {
        auto seal = compute_seal("SILENCE", prev_seal, "spectral-radius-exceeds", ts);
        return {false, "spectral radius >= 1.0", seal};
    }

    // State must be finite
    for (size_t i = 0; i < x_next.size(); ++i) {
        if (!std::isfinite(x_next[i])) {
            auto seal = compute_seal("SILENCE", prev_seal, "non-finite-state", ts);
            return {false, "non-finite state component", seal};
        }
    }

    // Compute payload for seal binding
    std::string payload;
    for (double v : x_next) payload += std::to_string(v) + ":";
    auto seal = compute_seal("EVIDENCE", prev_seal, payload, ts);
    return {true, "mathematically admissible", seal};
}

ExaminerDecision TripleLock::examiner_check(
    double current_drift,
    double resource_usage,
    const std::vector<ConflictLog>& conflicts,
    const WormSeal& prev_seal) const {
    uint64_t ts = static_cast<uint64_t>(
        std::chrono::steady_clock::now().time_since_epoch().count());

    // Drift within budget
    if (current_drift > config_.max_drift) {
        auto seal = compute_seal("SILENCE", prev_seal, "drift-exceeds-budget", ts);
        return {false, current_drift, "drift exceeds budget", seal};
    }

    // No active conflicts
    for (const auto& c : conflicts) {
        if (c.severity > 0.8) {
            auto seal = compute_seal("SILENCE", prev_seal, "high-severity-conflict", ts);
            return {false, current_drift, "active high-severity conflict", seal};
        }
    }

    // Chain binding: prev_seal must be non-zero (Guardian must have issued EVIDENCE)
    bool prev_zero = true;
    for (uint8_t b : prev_seal.hash) { if (b != 0) { prev_zero = false; break; } }
    if (prev_zero) {
        auto seal = compute_seal("SILENCE", prev_seal, "broken-chain-no-guardian-seal", ts);
        return {false, current_drift, "SYNTH-006: Guardian did not issue EVIDENCE — chain broken", seal};
    }

    auto seal = compute_seal("EVIDENCE", prev_seal, std::to_string(current_drift), ts);
    return {true, current_drift, "reality within bounds", seal};
}

PublisherDecision TripleLock::publisher_check(
    const GuardianDecision& g,
    const ExaminerDecision& e,
    size_t retry_nonce,
    const std::string& status) const {
    uint64_t ts = static_cast<uint64_t>(
        std::chrono::steady_clock::now().time_since_epoch().count());

    // Both must be approved
    if (!g.approved) {
        auto seal = compute_seal("SILENCE", e.seal, "guardian-rejected", ts);
        return {false, "guardian rejected", seal};
    }
    if (!e.approved) {
        auto seal = compute_seal("SILENCE", g.seal, "examiner-rejected", ts);
        return {false, "examiner rejected", seal};
    }

    // SYNTH-006: PROVISIONAL status rejected at Publisher
    if (status == "PROVISIONAL") {
        auto seal = compute_seal("SILENCE", e.seal, "provisional-at-publisher", ts);
        return {false, "SYNTH-006: PROVISIONAL status rejected at Publisher — cannot ratify unresolved state", seal};
    }

    // Retry bound (prevents adversarial exhaustion)
    if (retry_nonce > MAX_RETRY_NONCE) {
        auto seal = compute_seal("SILENCE", e.seal, "retry-exceeded", ts);
        return {false, "retry nonce exceeded", seal};
    }

    // Chain integrity: Guardian seal must be non-zero
    bool guardian_zero = true;
    for (uint8_t b : g.seal.hash) { if (b != 0) { guardian_zero = false; break; } }
    if (guardian_zero) {
        auto seal = compute_seal("SILENCE", e.seal, "no-guardian-seal", ts);
        return {false, "SYNTH-006: Guardian seal missing — chain incomplete", seal};
    }

    // Chain integrity: Examiner seal must chain from Guardian
    bool examiner_chains = true;
    for (int i = 0; i < 32; ++i) {
        if (e.seal.prev_seal[i] != g.seal.hash[i]) { examiner_chains = false; break; } }
    if (!examiner_chains) {
        auto seal = compute_seal("SILENCE", e.seal, "seal-chain-broken", ts);
        return {false, "SYNTH-006: Examiner seal does not chain from Guardian — forgery detected", seal};
    }

    // Compute final manifest seal binding all three locks
    std::string payload = "guardian:" + g.reason + "|examiner:" + e.reason;
    auto seal = compute_seal("EVIDENCE", e.seal, payload, ts);
    return {true, "ready for immutability", seal};
}

bool TripleLock::verify(const GuardianDecision& g,
                        const ExaminerDecision& e,
                        const PublisherDecision& p) const {
    return g.approved && e.approved && p.approved;
}

} // namespace pmc
