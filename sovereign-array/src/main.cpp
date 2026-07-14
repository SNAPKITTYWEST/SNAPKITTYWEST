#include "sovereign_array.h"
#include <iostream>

using namespace sovarr;

int main() {
    std::cout << "Sovereign Array Language — sovereign kernel demo\n";
    std::cout << "Model: Array I alpha = I -> alpha (dependent function)\n";

    // pmap2: pointwise add of two 2x2 arrays (a Π-map over the index space)
    Array<int> a({2, 2}, {1, 2, 3, 4});
    Array<int> b({2, 2}, {10, 20, 30, 40});
    Array<int> c = a.pmap2([](int x, int y) { return x + y; }, b);
    std::cout << "pmap2 add: ";
    for (size_t i = 0; i < c.size(); ++i) std::cout << c[i] << " ";
    std::cout << "\n";

    // softmax as Π-map
    Array<float> v({4}, {1.0f, 2.0f, 3.0f, 4.0f});
    Array<float> sm = softmax(v);
    std::cout << "softmax: ";
    for (size_t i = 0; i < sm.size(); ++i) std::cout << sm[i] << " ";
    std::cout << "\n";

    // NAND universality check
    std::cout << "nand(T,T)=" << nand_gate(true, true)
              << " nand(T,F)=" << nand_gate(true, false) << "\n";

    return 0;
}
