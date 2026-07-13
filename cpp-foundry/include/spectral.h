#pragma once
// Spectral Governor — verifies Banach contraction before execution
// Uses Gershgorin disks (fast) or power iteration (fallback)

#include "types.h"
#include <vector>
#include <functional>

namespace pmc {

// Jacobian matrix as a function pointer or callback
using JacobianFn = std::function<std::vector<std::vector<double>>(const std::vector<double>&)>;

class SpectralGovernor {
public:
    struct Result {
        double spectral_radius;
        bool   contractive;   // spectral_radius < 1.0
        double gershgorin_bound; // upper bound from Gershgorin
        double power_iter_bound; // tighter bound from power iteration (if computed)
        bool   used_power_iteration;
    };

    // Fast check: Gershgorin disk theorem
    static Result gershgorin_check(const std::vector<std::vector<double>>& jacobian,
                                   double epsilon);

    // Tighter check: power iteration (computes dominant eigenvalue)
    static Result power_iteration_check(const std::vector<std::vector<double>>& jacobian,
                                        double epsilon, size_t max_iters = 100);

    // Combined: try Gershgorin first, fall back to power iteration
    static Result analyze(const std::vector<std::vector<double>>& jacobian,
                          double epsilon);

    // Compute Gershgorin upper bound
    static double gershgorin_bound(const std::vector<std::vector<double>>& jacobian);

    // Power iteration: returns dominant eigenvalue
    static double power_iteration(const std::vector<std::vector<double>>& jacobian,
                                  size_t max_iters, double tolerance = 1e-12);
};

} // namespace pmc
