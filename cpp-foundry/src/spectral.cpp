// Spectral Governor — Gershgorin disks + power iteration

#include "spectral.h"
#include <cmath>
#include <numeric>
#include <algorithm>

namespace pmc {

double SpectralGovernor::gershgorin_bound(
    const std::vector<std::vector<double>>& J) {
    double max_bound = 0.0;
    size_t n = J.size();

    for (size_t i = 0; i < n; ++i) {
        double row_sum = 0.0;
        for (size_t j = 0; j < n; ++j) {
            if (i != j) row_sum += std::abs(J[i][j]);
        }
        // Gershgorin disk: center = J[i][i], radius = row_sum
        double disk_max = std::abs(J[i][i]) + row_sum;
        max_bound = std::max(max_bound, disk_max);
    }
    return max_bound;
}

SpectralGovernor::Result SpectralGovernor::gershgorin_check(
    const std::vector<std::vector<double>>& J, double epsilon) {
    double bound = gershgorin_bound(J);
    return {
        bound,
        bound < (1.0 - epsilon),
        bound,
        bound,
        false
    };
}

double SpectralGovernor::power_iteration(
    const std::vector<std::vector<double>>& J,
    size_t max_iters, double tolerance) {
    size_t n = J.size();
    if (n == 0) return 0.0;

    // Start with random vector
    std::vector<double> v(n, 1.0 / std::sqrt(static_cast<double>(n)));
    std::vector<double> Jv(n);

    double eigenvalue = 0.0;

    for (size_t iter = 0; iter < max_iters; ++iter) {
        // Jv = J * v
        for (size_t i = 0; i < n; ++i) {
            Jv[i] = 0.0;
            for (size_t j = 0; j < n; ++j) {
                Jv[i] += J[i][j] * v[j];
            }
        }

        // Rayleigh quotient: v^T J v
        double new_eigenvalue = 0.0;
        for (size_t i = 0; i < n; ++i) {
            new_eigenvalue += v[i] * Jv[i];
        }

        // Check convergence
        if (std::abs(new_eigenvalue - eigenvalue) < tolerance) {
            return std::abs(new_eigenvalue);
        }
        eigenvalue = new_eigenvalue;

        // Normalize: v = Jv / ‖Jv‖
        double norm = 0.0;
        for (size_t i = 0; i < n; ++i) {
            norm += Jv[i] * Jv[i];
        }
        norm = std::sqrt(norm);
        if (norm < 1e-15) break;

        for (size_t i = 0; i < n; ++i) {
            v[i] = Jv[i] / norm;
        }
    }

    return std::abs(eigenvalue);
}

SpectralGovernor::Result SpectralGovernor::power_iteration_check(
    const std::vector<std::vector<double>>& J, double epsilon, size_t max_iters) {
    double bound = power_iteration(J, max_iters);
    double gersho = gershgorin_bound(J);
    return {
        bound,
        bound < (1.0 - epsilon),
        gersho,
        bound,
        true
    };
}

SpectralGovernor::Result SpectralGovernor::analyze(
    const std::vector<std::vector<double>>& J, double epsilon) {
    // Try Gershgorin first (fast, conservative)
    auto result = gershgorin_check(J, epsilon);

    // If Gershgorin is borderline, use power iteration (tighter)
    if (result.contractive && result.gershgorin_bound > (1.0 - epsilon) * 0.95) {
        result = power_iteration_check(J, epsilon);
    }

    return result;
}

} // namespace pmc
