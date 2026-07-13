#pragma once
// Portable SHA-256 implementation
// Based on FIPS 180-4

#include <cstdint>
#include <cstddef>
#include <array>

namespace pmc {

class SHA256 {
public:
    using Digest = std::array<uint8_t, 32>;

    SHA256();
    void update(const uint8_t* data, size_t len);
    Digest finalize();

    // One-shot convenience
    static Digest hash(const uint8_t* data, size_t len);

private:
    uint32_t h_[8];
    uint64_t total_len_;
    uint8_t  buffer_[64];
    size_t   buffer_len_;

    void process_block(const uint8_t block[64]);
};

} // namespace pmc
