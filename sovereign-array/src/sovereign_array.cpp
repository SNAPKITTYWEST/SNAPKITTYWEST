#include "sovereign_array.h"
#include <numeric>

namespace sovarr {

std::vector<size_t> unravel(size_t flat, const std::vector<size_t>& shape) {
    std::vector<size_t> idx(shape.size());
    size_t stride = 1;
    for (size_t d = shape.size(); d-- > 0; ) {
        idx[d] = (flat / stride) % shape[d];
        stride *= shape[d];
    }
    return idx;
}

Array<float> softmax(const Array<float>& v) {
    float s = 0.0f;
    for (size_t i = 0; i < v.size(); ++i) s += std::exp(v[i]);
    std::vector<float> out(v.size());
    for (size_t i = 0; i < v.size(); ++i) out[i] = std::exp(v[i]) / s;
    return Array<float>(v.shape(), std::move(out));
}

bool nand_gate(bool a, bool b) { return !(a && b); }

Array<float> nand_attention(const Array<float>& q, const Array<float>& k, const Array<float>& v) {
    size_t n = q.shape()[0];
    // scores_i = Σ_j q_i * k_j
    std::vector<float> scores(n, 0.0f);
    for (size_t i = 0; i < n; ++i)
        for (size_t j = 0; j < n; ++j)
            scores[i] += q[i] * k[j];
    Array<float> scoresArr({n}, std::move(scores));
    Array<float> w = softmax(scoresArr);
    // out_i = Σ_j w_i * v_j
    std::vector<float> out(n, 0.0f);
    for (size_t i = 0; i < n; ++i)
        for (size_t j = 0; j < n; ++j)
            out[i] += w[i] * v[j];
    return Array<float>({n}, std::move(out));
}

} // namespace sovarr
