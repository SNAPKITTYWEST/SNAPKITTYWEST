#include "goldilocks.h"
#include <iostream>
using namespace pmc;

int main() {
    Goldilocks::Elem a(42);
    auto inv_a = Goldilocks::inv(a);
    auto one = Goldilocks::mul(a, inv_a);
    std::cout << "a = " << a.v << std::endl;
    std::cout << "inv = " << inv_a.v << std::endl;
    std::cout << "a * inv = " << one.v << std::endl;
    std::cout << "P = " << Goldilocks::P << std::endl;
    return 0;
}
