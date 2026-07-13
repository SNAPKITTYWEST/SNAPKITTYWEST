// AceCertificate generator

#include "certify.h"
#include <algorithm>
#include <numeric>

namespace pmc {

Certifier::Certifier(double delta) : delta_(delta) {}

AceCertificate Certifier::certify(const std::vector<StepInfo>& steps) const {
    if (steps.empty()) {
        return {0.0, 0.0, 0.0, false, 0};
    }

    double max_q = 0.0;
    double max_residual = 0.0;
    for (const auto& s : steps) {
        max_q = std::max(max_q, s.q);
        max_residual = std::max(max_residual, s.residual);
    }

    double epsilon = steps.front().epsilon;
    double margin = safety_margin(max_q, epsilon);
    double tail = tail_bound(max_residual, max_q);

    auto now = std::chrono::steady_clock::now();
    uint64_t ts = std::chrono::duration_cast<std::chrono::nanoseconds>(
        now.time_since_epoch()).count();

    return {
        max_q,
        margin,
        tail,
        margin >= delta_,
        ts
    };
}

bool Certifier::is_certifiable(const StepInfo& step) const {
    return safety_margin(step.q, step.epsilon) >= delta_;
}

double Certifier::safety_margin(double max_q, double epsilon) const {
    return (1.0 - epsilon) - max_q;
}

double Certifier::tail_bound(double tail_norm, double max_q) const {
    if (max_q >= 1.0) return std::numeric_limits<double>::infinity();
    return tail_norm / (1.0 - max_q);
}

} // namespace pmc
