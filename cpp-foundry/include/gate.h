#pragma once
// Emission Gate + CSL Gate + Triple-Lock Gateway

#include "types.h"
#include <vector>
#include <functional>

namespace pmc {

// ── Emission Gate (Layer 3.5) ────────────────────────────────────────────────

class EmissionGate {
public:
    explicit EmissionGate(GatePolicy policy, double epsilon);

    // Apply gate to output vector
    std::vector<double> apply(const std::vector<double>& output,
                              const std::vector<double>& prev_output,
                              double q) const;

    GatePolicy policy() const { return policy_; }

private:
    GatePolicy policy_;
    double     epsilon_;
};

// ── CSL Gate (Conscious Sovereignty Layer) ───────────────────────────────────

class CSLGate {
public:
    explicit CSLGate(double epsilon);

    // Neutrality: transformation treats all subjects equally
    // Pairwise deviation < epsilon
    CSLVerdict check_neutrality(const std::vector<double>& x,
                                const std::vector<double>& T_x) const;

    // Beneficence: norm growth bounded, residual bounded
    CSLVerdict check_beneficence(const std::vector<double>& x,
                                 const std::vector<double>& T_x,
                                 double residual) const;

    // Commutation: filter(T(x)) ≈ T(filter(x))
    CSLVerdict check_commutation(
        const std::vector<double>& x,
        std::function<std::vector<double>(const std::vector<double>&)> T,
        std::function<std::vector<double>(const std::vector<double>&)> filter) const;

    // Full CSL check
    CSLVerdict check_all(const std::vector<double>& x,
                         const std::vector<double>& T_x,
                         double residual) const;

private:
    double epsilon_;
};

// ── Triple-Lock Gateway (Layer 5) ───────────────────────────────────────────

class TripleLock {
public:
    struct Config {
        double max_drift;
        double min_prime_index;
        std::array<uint8_t, 32> constitution_hash;
    };

    explicit TripleLock(const Config& cfg);

    // Guardian: is it mathematically legal?
    GuardianDecision guardian_check(const std::vector<double>& x,
                                    const std::vector<double>& x_next,
                                    double spectral_radius) const;

    // Examiner: has reality drifted?
    ExaminerDecision examiner_check(double current_drift,
                                    double resource_usage,
                                    const std::vector<ConflictLog>& conflicts) const;

    // Publisher: can this become immutable?
    PublisherDecision publisher_check(const GuardianDecision& g,
                                     const ExaminerDecision& e,
                                     size_t retry_nonce) const;

    // Full triple-lock: all three must pass
    bool verify(const GuardianDecision& g,
                const ExaminerDecision& e,
                const PublisherDecision& p) const;

private:
    Config config_;
    static constexpr size_t MAX_RETRY_NONCE = 1000;
};

} // namespace pmc
