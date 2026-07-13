#include "goldilocks.h"
#include <iostream>
using namespace pmc;

int main() {
    // Test basic operations
    Goldilocks::Elem a(42);
    Goldilocks::Elem one(1);
    
    std::cout << "P = " << Goldilocks::P << std::endl;
    std::cout << "a = " << a.v << std::endl;
    
    // Test mul: a * 1 should be a
    auto a1 = Goldilocks::mul(a, one);
    std::cout << "a * 1 = " << a1.v << " (should be " << a.v << ")" << std::endl;
    
    // Test sub: a - a should be 0
    auto a0 = Goldilocks::sub(a, a);
    std::cout << "a - a = " << a0.v << " (should be 0)" << std::endl;
    
    // Test mulmod directly
    auto product = Goldilocks::mulmod(42, Goldilocks::P - 2);
    std::cout << "mulmod(42, P-2) = " << product << std::endl;
    
    // Test inv
    auto inv_a = Goldilocks::inv(a);
    std::cout << "inv(42) = " << inv_a.v << std::endl;
    
    // Test a * inv(a)
    auto check = Goldilocks::mul(a, inv_a);
    std::cout << "42 * inv(42) = " << check.v << " (should be 1)" << std::endl;
    
    // Verify: 42 * inv(42) mod P
    __uint128_t raw = static_cast<__uint128_t>(42) * inv_a.v;
    std::cout << "raw product = " << static_cast<uint64_t>(raw) << " (low 64 bits)" << std::endl;
    std::cout << "raw product high = " << static_cast<uint64_t>(raw >> 64) << std::endl;
    
    return 0;
}
