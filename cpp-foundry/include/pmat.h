#pragma once
// Prime Monomial Matrix — sparse graded matrix where each entry is (sign, monomial)
// Grading condition: tgt_sig - src_sig = monomial (enforced on insertion)

#include "types.h"
#include <vector>

namespace pmc {

struct PMatEntry {
    int8_t     sign;     // ±1
    Signature  monomial; // grading monomial
    size_t     row;
    size_t     col;
};

class PMat {
public:
    PMat(size_t rows, size_t cols);

    // Insert with grading check — returns false if grading violated
    bool insert(size_t row, size_t col, int8_t sign, Signature monomial);

    // Validate global grading consistency
    bool validate_grading() const;

    // Conservation theorem: product of all monomials = grading(target_total, source_total)
    Signature conservation() const;

    // Matrix composition — preserves grading (proved in Lean)
    PMat compose(const PMat& other) const;

    // Frobenius norm (operator norm bound)
    double frobenius_norm() const;

    size_t rows() const { return rows_; }
    size_t cols() const { return cols_; }
    const std::vector<PMatEntry>& entries() const { return entries_; }

private:
    size_t rows_, cols_;
    std::vector<PMatEntry> entries_;
};

} // namespace pmc
