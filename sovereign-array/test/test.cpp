#include "sovereign_array.h"
#include <cassert>
#include <cmath>
#include <iostream>

using namespace sovarr;

static int passed = 0, failed = 0;
#define CHECK(cond) do { if (cond) { ++passed; } else { ++failed; std::cerr << "FAIL: " #cond "\n"; } } while(0)

int main() {
    // 1. pmap2 pointwise add
    Array<int> a({2, 2}, {1, 2, 3, 4});
    Array<int> b({2, 2}, {10, 20, 30, 40});
    Array<int> c = a.pmap2([](int x, int y) { return x + y; }, b);
    CHECK(c[0] == 11 && c[1] == 22 && c[2] == 33 && c[3] == 44);

    // 2. pmap2 commutativity
    Array<int> d = a.pmap2([](int x, int y) { return x * y; }, b);
    CHECK(d[0] == 10 && d[3] == 160);

    // 3. softmax sums to ~1 (Π-map normalization)
    Array<float> v({4}, {1.0f, 2.0f, 3.0f, 4.0f});
    Array<float> sm = softmax(v);
    float sum = 0.0f;
    for (size_t i = 0; i < sm.size(); ++i) sum += sm[i];
    CHECK(std::fabs(sum - 1.0f) < 1e-5f);

    // 4. softmax shift invariance (exp(v+c)/Σ exp(v+c) == exp(v)/Σ exp(v))
    Array<float> v2({3}, {0.0f, 1.0f, 2.0f});
    Array<float> sm2 = softmax(v2);
    Array<float> v3({3}, {5.0f, 6.0f, 7.0f});
    Array<float> sm3 = softmax(v3);
    CHECK(std::fabs(sm2[0] - sm3[0]) < 1e-5f && std::fabs(sm2[2] - sm3[2]) < 1e-5f);

    // 5. broadcast pullback: add a row vector to each row of a matrix
    Array<float> mat({2, 3}, {1, 2, 3, 4, 5, 6});
    Array<float> row({3}, {10, 20, 30});
    Array<float> bc = broadcast({2, 3}, mat, row);
    CHECK(bc[0] == 11 && bc[2] == 33 && bc[3] == 14 && bc[5] == 36);

    // 6. NAND universality
    CHECK(nand_gate(true, true) == false);
    CHECK(nand_gate(true, false) == true);
    CHECK(nand_gate(false, false) == true);
    // NOT via nand(a,a)
    CHECK(nand_gate(true, true) == !true);
    // AND via nand(nand(a,b),nand(a,b))
    auto andG = [](bool a, bool b) { return nand_gate(nand_gate(a, b), nand_gate(a, b)); };
    CHECK(andG(true, true) == true && andG(true, false) == false);

    // 7. attention spec runs
    Array<float> q({3}, {1, 0, 0});
    Array<float> k({3}, {1, 1, 1});
    Array<float> val({3}, {2, 4, 6});
    Array<float> att = nand_attention(q, k, val);
    CHECK(att.size() == 3);

    std::cout << "Sovereign Array tests: " << passed << " passed, " << failed << " failed\n";
    return failed == 0 ? 0 : 1;
}
