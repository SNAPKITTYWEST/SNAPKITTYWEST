// Portable SHA-256 implementation — FIPS 180-4

#include "sha256.h"
#include <cstring>

namespace pmc {

static const uint32_t K[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

static inline uint32_t rotr(uint32_t x, uint32_t n) { return (x >> n) | (x << (32 - n)); }
static inline uint32_t ch(uint32_t x, uint32_t y, uint32_t z) { return (x & y) ^ (~x & z); }
static inline uint32_t maj(uint32_t x, uint32_t y, uint32_t z) { return (x & y) ^ (x & z) ^ (y & z); }
static inline uint32_t bsig0(uint32_t x) { return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22); }
static inline uint32_t bsig1(uint32_t x) { return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25); }
static inline uint32_t ssig0(uint32_t x) { return rotr(x, 7) ^ rotr(x, 18) ^ (x >> 3); }
static inline uint32_t ssig1(uint32_t x) { return rotr(x, 17) ^ rotr(x, 19) ^ (x >> 10); }

static inline uint32_t load_be32(const uint8_t* p) {
    return ((uint32_t)p[0] << 24) | ((uint32_t)p[1] << 16) |
           ((uint32_t)p[2] << 8)  | ((uint32_t)p[3]);
}

static inline void store_be32(uint8_t* p, uint32_t v) {
    p[0] = (uint8_t)(v >> 24);
    p[1] = (uint8_t)(v >> 16);
    p[2] = (uint8_t)(v >> 8);
    p[3] = (uint8_t)(v);
}

SHA256::SHA256() : total_len_(0), buffer_len_(0) {
    h_[0] = 0x6a09e667; h_[1] = 0xbb67ae85;
    h_[2] = 0x3c6ef372; h_[3] = 0xa54ff53a;
    h_[4] = 0x510e527f; h_[5] = 0x9b05688c;
    h_[6] = 0x1f83d9ab; h_[7] = 0x5be0cd19;
}

void SHA256::process_block(const uint8_t block[64]) {
    uint32_t W[64];
    for (int i = 0; i < 16; ++i)
        W[i] = load_be32(block + i * 4);
    for (int i = 16; i < 64; ++i)
        W[i] = ssig1(W[i-2]) + W[i-7] + ssig0(W[i-15]) + W[i-16];

    uint32_t a = h_[0], b = h_[1], c = h_[2], d = h_[3];
    uint32_t e = h_[4], f = h_[5], g = h_[6], h = h_[7];

    for (int i = 0; i < 64; ++i) {
        uint32_t T1 = h + bsig1(e) + ch(e, f, g) + K[i] + W[i];
        uint32_t T2 = bsig0(a) + maj(a, b, c);
        h = g; g = f; f = e; e = d + T1;
        d = c; c = b; b = a; a = T1 + T2;
    }

    h_[0] += a; h_[1] += b; h_[2] += c; h_[3] += d;
    h_[4] += e; h_[5] += f; h_[6] += g; h_[7] += h;
}

void SHA256::update(const uint8_t* data, size_t len) {
    total_len_ += len;
    size_t offset = 0;

    if (buffer_len_ > 0) {
        size_t to_copy = 64 - buffer_len_;
        if (to_copy > len) to_copy = len;
        std::memcpy(buffer_ + buffer_len_, data, to_copy);
        buffer_len_ += to_copy;
        offset += to_copy;
        if (buffer_len_ == 64) {
            process_block(buffer_);
            buffer_len_ = 0;
        }
    }

    while (offset + 64 <= len) {
        process_block(data + offset);
        offset += 64;
    }

    if (offset < len) {
        std::memcpy(buffer_, data + offset, len - offset);
        buffer_len_ = len - offset;
    }
}

SHA256::Digest SHA256::finalize() {
    uint8_t pad[64];
    std::memset(pad, 0, sizeof(pad));

    uint64_t bit_len = total_len_ * 8;
    pad[0] = 0x80;

    size_t pad_len = (total_len_ % 64 < 56) ? (56 - total_len_ % 64) : (120 - total_len_ % 64);
    update(pad, pad_len);

    uint8_t len_be[8];
    for (int i = 7; i >= 0; --i) {
        len_be[i] = (uint8_t)(bit_len & 0xff);
        bit_len >>= 8;
    }
    update(len_be, 8);

    Digest digest;
    for (int i = 0; i < 8; ++i)
        store_be32(digest.data() + i * 4, h_[i]);
    return digest;
}

SHA256::Digest SHA256::hash(const uint8_t* data, size_t len) {
    SHA256 ctx;
    ctx.update(data, len);
    return ctx.finalize();
}

} // namespace pmc
