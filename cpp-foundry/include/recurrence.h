#pragma once
// Banach Contraction Recurrence — the core computation engine
// x_{t+1} = Xi_t * x_t + Lambda_t * T(x_t) + g_t
// Constraint: q_t = ‖Xi‖ + ‖Lambda‖ * ‖T‖ < 1 - epsilon

#include "types.h"
#include <vector>
#include <functional>

namespace pmc {

// Transform operator T(x) — the nonlinear map being contracted
using TransformFn = std::function<std::vector<double>(const std::vector<double>&)>;

// Projector p_op — e.g., clipping to [-1, 1]
using ProjectorFn = std::function<std::vector<double>(const std::vector<double>&)>;

struct RecurrenceConfig {
    double          epsilon;
    Tier            tier;
    WeightProfile   profile;
    size_t          max_steps;
    double          convergence_tol;
};

struct RecurrenceState {
    std::vector<double> x_current;
    std::vector<double> x_next;
    std::vector<double> g_bias;          // constant drift term
    StepInfo            last_step;
    bool                converged;
};

class Recurrence {
public:
    explicit Recurrence(const RecurrenceConfig& cfg);

    // Generate weight schedules (Xi_t, Lambda_t matrices)
    void synthesize_weights(const std::vector<uint64_t>& primes);

    // Execute one step: returns step info
    StepInfo step(const std::vector<double>& x_t,
                  TransformFn T,
                  ProjectorFn p_op);

    // Run full recurrence until convergence or max_steps
    std::vector<StepInfo> run(std::vector<double> x0,
                              TransformFn T,
                              ProjectorFn p_op);

    const RecurrenceState& state() const { return state_; }

private:
    RecurrenceConfig config_;
    RecurrenceState  state_;
    std::vector<std::vector<double>> xi_schedule_;
    std::vector<std::vector<double>> lambda_schedule_;
    size_t step_idx_ = 0;

    // Soft projection: scale Xi, Lambda when q > 1 - epsilon
    void soft_project(std::vector<double>& xi,
                      std::vector<double>& lam,
                      double q);
};

} // namespace pmc
