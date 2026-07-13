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

GuardianDecision TripleLock::guardian_check(
    const std::vector<double>& x,
    const std::vector<double>& x_next,
    double spectral_radius) const {
    // Mathematical legality: spectral radius must be < 1
    if (spectral_radius >= 1.0) {
        return {false, "spectral radius >= 1.0"};
    }

    // State must be finite
    for (size_t i = 0; i < x_next.size(); ++i) {
        if (!std::isfinite(x_next[i])) {
            return {false, "non-finite state component"};
        }
    }

    return {true, "mathematically admissible"};
}

ExaminerDecision TripleLock::examiner_check(
    double current_drift,
    double resource_usage,
    const std::vector<ConflictLog>& conflicts) const {
    // Drift within budget
    if (current_drift > config_.max_drift) {
        return {false, current_drift, "drift exceeds budget"};
    }

    // No active conflicts
    for (const auto& c : conflicts) {
        if (c.severity > 0.8) {
            return {false, current_drift, "active high-severity conflict"};
        }
    }

    return {true, current_drift, "reality within bounds"};
}

PublisherDecision TripleLock::publisher_check(
    const GuardianDecision& g,
    const ExaminerDecision& e,
    size_t retry_nonce) const {
    // Both must be approved
    if (!g.approved) {
        return {false, "guardian rejected"};
    }
    if (!e.approved) {
        return {false, "examiner rejected"};
    }

    // Retry bound (prevents adversarial exhaustion)
    if (retry_nonce > MAX_RETRY_NONCE) {
        return {false, "retry nonce exceeded"};
    }

    return {true, "ready for immutability"};
}

bool TripleLock::verify(const GuardianDecision& g,
                        const ExaminerDecision& e,
                        const PublisherDecision& p) const {
    return g.approved && e.approved && p.approved;
}

} // namespace pmc
