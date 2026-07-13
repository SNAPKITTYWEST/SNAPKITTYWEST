#pragma once
// Goldilocks prime field: F_p where p = 2^64 - 2^32 + 1
// Optimized for STARK-friendly arithmetic with overflow-safe operations

#include "types.h"
#include <array>

namespace pmc {

class Goldilocks {
public:
    static constexpr uint64_t P = GOLDILOCKS_PRIME;

    // Field element — always reduced mod P
    struct Elem {
        uint64_t v;
        Elem() : v(0) {}
        explicit Elem(uint64_t x) : v(reduce(x)) {}
        bool operator==(const Elem& o) const { return v == o.v; }
        bool operator!=(const Elem& o) const { return v != o.v; }
    };

    // Arithmetic — all constant-time safe
    static Elem add(Elem a, Elem b);
    static Elem sub(Elem a, Elem b);
    static Elem mul(Elem a, Elem b);
    static Elem inv(Elem a);         // Fermat: a^(p-2) mod p
    static Elem pow(Elem a, uint64_t e);

    // Batch operations (SIMD-friendly layout)
    static void add_batch(Elem* out, const Elem* a, const Elem* b, size_t n);
    static void mul_batch(Elem* out, const Elem* a, const Elem* b, size_t n);

    // Montgomery / Barrett helpers
    static uint64_t reduce(uint64_t x);

    // 128-bit multiply → 64-bit result mod P
    static uint64_t mulmod(uint64_t a, uint64_t b);

    // SSE2/AVX2 dispatch
    static bool has_sse2();
    static bool has_avx2();
};

} // namespace pmc
