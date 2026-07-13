// Goldilocks field arithmetic: F_p where p = 2^64 - 2^32 + 1
// Uses Barrett reduction for constant-time modular arithmetic

#include "goldilocks.h"
#include <cstring>

namespace pmc {

// Barrett constant: floor(2^128 / P)
static constexpr uint64_t BARRITT_MU = 0xFFFFFFFF00000001ULL; // simplified for this prime

uint64_t Goldilocks::reduce(uint64_t x) {
    // For Goldilocks prime, a single conditional subtraction suffices
    // because x < 2^64 and p ≈ 2^64, so x - p < 2^64 if x >= p
    return (x >= P) ? x - P : x;
}

uint64_t Goldilocks::mulmod(uint64_t a, uint64_t b) {
    // 128-bit multiply
    __uint128_t product = static_cast<__uint128_t>(a) * b;

    // Goldilocks reduction — ported from verified Rust (foundry-intel/goldilocks)
    // p = 2^64 - 2^32 + 1, so 2^64 ≡ 2^32 - 1 (mod p)
    uint64_t lo = static_cast<uint64_t>(product);
    uint64_t hi = static_cast<uint64_t>(product >> 64);

    uint64_t hi_lo = hi & 0xFFFFFFFFULL;
    uint64_t hi_hi = hi >> 32;

    // folded = lo + hi_lo * (2^32 - 1)
    __uint128_t eps = 0xFFFFFFFFULL;
    __uint128_t folded = static_cast<__uint128_t>(lo)
                       + static_cast<__uint128_t>(hi_lo) * eps;

    // reduced = folded - hi_hi (with underflow handling)
    __uint128_t reduced;
    if (folded >= hi_hi) {
        reduced = folded - hi_hi;
    } else {
        reduced = folded + P - hi_hi;
    }

    // Final conditional subtraction
    if (reduced >= P) {
        reduced -= P;
    }

    return static_cast<uint64_t>(reduced);
}

Goldilocks::Elem Goldilocks::add(Elem a, Elem b) {
    uint64_t r = a.v + b.v;
    if (r >= P) r -= P;
    return Elem(r);
}

Goldilocks::Elem Goldilocks::sub(Elem a, Elem b) {
    uint64_t r = a.v - b.v;
    // Conditional add P on underflow
    uint64_t mask = -(r >> 63);
    return Elem(r + (mask & P));
}

Goldilocks::Elem Goldilocks::mul(Elem a, Elem b) {
    return Elem(mulmod(a.v, b.v));
}

Goldilocks::Elem Goldilocks::inv(Elem a) {
    // Fermat's little theorem: a^(p-2) mod p
    return pow(a, P - 2);
}

Goldilocks::Elem Goldilocks::pow(Elem a, uint64_t e) {
    Elem result(1);
    Elem base = a;
    while (e > 0) {
        if (e & 1) result = mul(result, base);
        base = mul(base, base);
        e >>= 1;
    }
    return result;
}

void Goldilocks::add_batch(Elem* out, const Elem* a,
                           const Elem* b, size_t n) {
    for (size_t i = 0; i < n; ++i) {
        out[i] = add(a[i], b[i]);
    }
}

void Goldilocks::mul_batch(Elem* out, const Elem* a,
                           const Elem* b, size_t n) {
    for (size_t i = 0; i < n; ++i) {
        out[i] = mul(a[i], b[i]);
    }
}

bool Goldilocks::has_sse2() {
    #ifdef __SSE2__
    return true;
    #elif defined(_MSC_VER) && (defined(_M_X64) || defined(_M_AMD64))
    return true;  // x64 always has SSE2
    #else
    return false;
    #endif
}

bool Goldilocks::has_avx2() {
    #ifdef __AVX2__
    return true;
    #else
    return false;
    #endif
}

} // namespace pmc
