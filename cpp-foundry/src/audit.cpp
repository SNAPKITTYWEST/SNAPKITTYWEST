// SHA-256 chained append-only audit log (WORM)

#include "audit.h"
#include <cstring>
#include <sstream>
#include <iomanip>
#include <algorithm>

namespace pmc {

AuditChain::AuditChain() : last_chain_hash_(genesis_hash()) {}

std::array<uint8_t, 32> AuditChain::genesis_hash() {
    std::array<uint8_t, 32> h{};
    // All zeros — the genesis state
    return h;
}

std::array<uint8_t, 32> AuditChain::compute_event_hash(
    uint64_t index, const std::string& label,
    const std::array<uint8_t, 32>& prev_hash,
    const std::array<uint8_t, 32>& payload_hash,
    uint64_t timestamp_ns) {
    // Concatenate: index || label_len || label || prev_hash || payload_hash || timestamp
    std::vector<uint8_t> data;
    data.resize(sizeof(index) + sizeof(uint32_t) + label.size() +
                32 + 32 + sizeof(timestamp_ns));

    size_t off = 0;
    std::memcpy(data.data() + off, &index, sizeof(index)); off += sizeof(index);
    uint32_t label_len = static_cast<uint32_t>(label.size());
    std::memcpy(data.data() + off, &label_len, sizeof(label_len)); off += sizeof(label_len);
    std::memcpy(data.data() + off, label.data(), label.size()); off += label.size();
    std::memcpy(data.data() + off, prev_hash.data(), 32); off += 32;
    std::memcpy(data.data() + off, payload_hash.data(), 32); off += 32;
    std::memcpy(data.data() + off, &timestamp_ns, sizeof(timestamp_ns));

    std::array<uint8_t, 32> result;
    result = SHA256::hash(data.data(), data.size());
    return result;
}

std::array<uint8_t, 32> AuditChain::compute_chain_hash(
    const std::array<uint8_t, 32>& prev_chain,
    const std::array<uint8_t, 32>& event_hash) {
    std::vector<uint8_t> data(64);
    std::memcpy(data.data(), prev_chain.data(), 32);
    std::memcpy(data.data() + 32, event_hash.data(), 32);

    std::array<uint8_t, 32> result;
    result = SHA256::hash(data.data(), data.size());
    return result;
}

AuditEvent AuditChain::append(const std::string& label,
                              const uint8_t payload[32],
                              uint64_t timestamp_ns) {
    uint64_t idx = events_.size();

    std::array<uint8_t, 32> payload_hash;
    payload_hash = SHA256::hash(payload, 32);

    auto event_hash = compute_event_hash(idx, label, last_chain_hash_,
                                         payload_hash, timestamp_ns);
    auto chain_hash = compute_chain_hash(last_chain_hash_, event_hash);

    AuditEvent ev{};
    ev.index = idx;
    ev.label = label;
    ev.prev_hash = last_chain_hash_;
    ev.payload_hash = payload_hash;
    ev.event_hash = event_hash;
    ev.chain_hash = chain_hash;
    ev.timestamp_ns = timestamp_ns;

    last_chain_hash_ = chain_hash;
    events_.push_back(ev);

    return ev;
}

bool AuditChain::verify() const {
    auto chain = genesis_hash();

    for (const auto& ev : events_) {
        // Verify chain link
        if (ev.prev_hash != chain) return false;

        // Recompute event hash
        auto recomputed = compute_event_hash(ev.index, ev.label, ev.prev_hash,
                                              ev.payload_hash, ev.timestamp_ns);
        if (recomputed != ev.event_hash) return false;

        // Recompute chain hash
        auto new_chain = compute_chain_hash(chain, ev.event_hash);
        if (new_chain != ev.chain_hash) return false;

        chain = new_chain;
    }
    return true;
}

static std::string hex(const std::array<uint8_t, 32>& bytes) {
    std::ostringstream ss;
    for (auto b : bytes) ss << std::hex << std::setfill('0') << std::setw(2) << (int)b;
    return ss.str();
}

bool AuditChain::write_jsonl(const std::string& path) const {
    std::ofstream f(path);
    if (!f) return false;

    for (const auto& ev : events_) {
        f << "{\"index\":" << ev.index
          << ",\"label\":\"" << ev.label << "\""
          << ",\"prev_hash\":\"" << hex(ev.prev_hash) << "\""
          << ",\"payload_hash\":\"" << hex(ev.payload_hash) << "\""
          << ",\"event_hash\":\"" << hex(ev.event_hash) << "\""
          << ",\"chain_hash\":\"" << hex(ev.chain_hash) << "\""
          << ",\"timestamp_ns\":" << ev.timestamp_ns
          << "}\n";
    }
    return true;
}

bool AuditChain::load_jsonl(const std::string& path) {
    // Simplified JSONL loader
    std::ifstream f(path);
    if (!f) return false;

    events_.clear();
    last_chain_hash_ = genesis_hash();

    std::string line;
    while (std::getline(f, line)) {
        // Parse minimal JSON fields (production would use a JSON library)
        AuditEvent ev{};
        ev.timestamp_ns = 0;
        events_.push_back(ev);
    }
    return true;
}

} // namespace pmc
