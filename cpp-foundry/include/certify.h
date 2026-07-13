#pragma once
// AceCertificate generator — post-execution certification

#include "types.h"
#include <vector>

namespace pmc {

class Certifier {
public:
    explicit Certifier(double delta);

    // Generate certificate from step history
    AceCertificate certify(const std::vector<StepInfo>& steps) const;

    // Check if a single step is certifiable
    bool is_certifiable(const StepInfo& step) const;

    // Compute safety margin
    double safety_margin(double max_q, double epsilon) const;

    // Compute tail bound
    double tail_bound(double tail_norm, double max_q) const;

private:
    double delta_;  // minimum safety margin
};

} // namespace pmc
