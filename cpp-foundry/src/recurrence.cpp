// Banach Contraction Recurrence — the core computation engine

#include "recurrence.h"
#include <cmath>
#include <numeric>
#include <algorithm>

namespace pmc {

Recurrence::Recurrence(const RecurrenceConfig& cfg) : config_(cfg) {}

void Recurrence::synthesize_weights(const std::vector<uint64_t>& primes) {
    size_t n = config_.max_steps;
    xi_schedule_.resize(n);
    lambda_schedule_.resize(n);

    for (size_t t = 0; t < n; ++t) {
        xi_schedule_[t].resize(2, 0.0);
        lambda_schedule_[t].resize(2, 0.0);

        double factor;
        switch (config_.profile) {
            case WeightProfile::Uniform:
                factor = 1.0;
                break;
            case WeightProfile::Harmonic:
                factor = 1.0 / (t + 1.0);
                break;
            case WeightProfile::LogDecay:
                factor = 1.0 / std::log(t + 2.0);
                break;
        }

        // Budget: q_star = 1 - epsilon
        double q_star = 1.0 - tier_epsilon(config_.tier);
        double xi_val = q_star * factor * 0.7;
        double lam_val = q_star * factor * 0.3;

        xi_schedule_[t][0] = xi_val;
        xi_schedule_[t][1] = 0.0;
        lambda_schedule_[t][0] = 0.0;
        lambda_schedule_[t][1] = lam_val;
    }
}

void Recurrence::soft_project(std::vector<double>& xi,
                              std::vector<double>& lam,
                              double q) {
    double target = 1.0 - tier_epsilon(config_.tier);
    if (q <= target) return;

    double scale = target / q;
    for (auto& v : xi) v *= scale;
    for (auto& v : lam) v *= scale;
}

StepInfo Recurrence::step(const std::vector<double>& x_t,
                          TransformFn T,
                          ProjectorFn p_op) {
    auto t_start = std::chrono::steady_clock::now();

    size_t dim = x_t.size();
    const auto& xi = xi_schedule_[step_idx_];
    const auto& lam = lambda_schedule_[step_idx_];

    // Compute q = ‖Xi‖ + ‖Lambda‖ * ‖T‖ (simplified: use max norms)
    double n_xi = 0.0, n_lam = 0.0;
    for (size_t i = 0; i < 2; ++i) {
        n_xi = std::max(n_xi, std::abs(xi[i]));
        n_lam = std::max(n_lam, std::abs(lam[i]));
    }

    // Compute T(x_t)
    auto Tx = T(x_t);

    // Check if T has expanded — use a simple norm estimate
    double n_T = 0.0;
    for (size_t i = 0; i < dim; ++i) {
        n_T = std::max(n_T, std::abs(Tx[i]));
    }
    double n_x = 0.0;
    for (size_t i = 0; i < dim; ++i) {
        n_x = std::max(n_x, std::abs(x_t[i]));
    }
    if (n_x > 1e-15) n_T /= n_x;

    double q = n_xi + n_lam * n_T;

    // Soft projection if needed
    bool projected = false;
    if (q > 1.0 - tier_epsilon(config_.tier)) {
        auto xi_mutable = xi_schedule_[step_idx_];
        auto lam_mutable = lambda_schedule_[step_idx_];
        soft_project(xi_mutable, lam_mutable, q);
        // Recompute with projected values
        n_xi = 0.0; n_lam = 0.0;
        for (size_t i = 0; i < 2; ++i) {
            n_xi = std::max(n_xi, std::abs(xi_mutable[i]));
            n_lam = std::max(n_lam, std::abs(lam_mutable[i]));
        }
        q = n_xi + n_lam * n_T;
        projected = true;
    }

    // x_next = Xi * x_t + Lambda * T(x_t) + g
    state_.x_next.resize(dim);
    for (size_t i = 0; i < dim; ++i) {
        state_.x_next[i] = xi[std::min(i, 1ULL)] * x_t[i]
                         + lam[std::min(i, 1ULL)] * Tx[i]
                         + state_.g_bias[i];
    }

    // Apply projector
    state_.x_next = p_op(state_.x_next);

    // Compute residual
    double residual = 0.0;
    for (size_t i = 0; i < dim; ++i) {
        double d = state_.x_next[i] - x_t[i];
        residual += d * d;
    }
    residual = std::sqrt(residual);

    auto t_end = std::chrono::steady_clock::now();

    StepInfo info{};
    info.step = step_idx_;
    info.q = q;
    info.epsilon = tier_epsilon(config_.tier);
    info.n_xi = n_xi;
    info.n_lam = n_lam;
    info.projected = projected;
    info.residual = residual;
    info.wall_time = std::chrono::duration_cast<std::chrono::nanoseconds>(t_end - t_start);

    // Pack resonance word (class 1 = contraction step)
    info.resonance_word = ResonanceWord::pack(1, static_cast<uint64_t>(residual * 1e12));

    state_.last_step = info;
    state_.x_current = state_.x_next;
    step_idx_++;

    return info;
}

std::vector<StepInfo> Recurrence::run(std::vector<double> x0,
                                      TransformFn T,
                                      ProjectorFn p_op) {
    state_.x_current = x0;
    state_.g_bias.resize(x0.size(), 0.0);
    state_.converged = false;

    std::vector<StepInfo> history;

    for (size_t t = 0; t < config_.max_steps; ++t) {
        auto info = step(state_.x_current, T, p_op);
        history.push_back(info);

        if (info.residual < config_.convergence_tol) {
            state_.converged = true;
            break;
        }
    }

    return history;
}

} // namespace pmc
