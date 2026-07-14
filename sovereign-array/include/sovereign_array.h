#pragma once
// Sovereign Array Language — C++ implementation
//
// Denotational model (valid isomorphisms only):
//   Array I α  ≃  I → α            (dependent function, row-major storage)
//   Shape      ≃  finite type I    (std::vector<size_t> index space)
//   Broadcast  ≃  pullback π : J → I
//   VecOp      ≃  Π-map over I
//
// No Abjad, no digital root, no NP-magic. Arithmetic is exact over T.

#include <vector>
#include <cstddef>
#include <cmath>
#include <stdexcept>
#include <functional>

namespace sovarr {

template <typename T>
class Array {
public:
    Array() = default;
    explicit Array(std::vector<size_t> shape)
        : shape_(std::move(shape)), data_(prod(shape_)) {}

    Array(std::vector<size_t> shape, std::vector<T> data)
        : shape_(std::move(shape)), data_(std::move(data)) {
        if (data_.size() != prod(shape_))
            throw std::invalid_argument("Array: data/shape size mismatch");
    }

    size_t rank() const { return shape_.size(); }
    const std::vector<size_t>& shape() const { return shape_; }
    size_t size() const { return data_.size(); }
    const std::vector<T>& data() const { return data_; }

    static size_t prod(const std::vector<size_t>& s) {
        size_t p = 1;
        for (size_t v : s) p *= v;
        return p;
    }

    const T& at(const std::vector<size_t>& idx) const { return data_[stride(idx)]; }
    T& at(const std::vector<size_t>& idx) { return data_[stride(idx)]; }

    const T& operator[](size_t i) const { return data_[i]; }
    T& operator[](size_t i) { return data_[i]; }

    // pmap₂: pointwise binary op (the Π-map over the index space I)
    Array<T> pmap2(std::function<T(T, T)> op, const Array<T>& other) const {
        if (shape_ != other.shape_)
            throw std::invalid_argument("pmap2: shape mismatch");
        std::vector<T> out(data_.size());
        for (size_t i = 0; i < data_.size(); ++i)
            out[i] = op(data_[i], other.data_[i]);
        return Array<T>(shape_, std::move(out));
    }

private:
    std::vector<size_t> shape_;
    std::vector<T> data_;

    size_t stride(const std::vector<size_t>& idx) const {
        if (idx.size() != shape_.size())
            throw std::invalid_argument("at: rank mismatch");
        size_t off = 0, stride = 1;
        for (size_t d = shape_.size(); d-- > 0; ) {
            off += idx[d] * stride;
            stride *= shape_[d];
        }
        return off;
    }
};

// Flatten a linear index into a multi-index given a shape (row-major).
std::vector<size_t> unravel(size_t flat, const std::vector<size_t>& shape);

// Broadcasting as pullback along projection π : J → I.
// `target_shape` is J; `v` is indexed by I; `w` by J.
template <typename T>
Array<T> broadcast(const std::vector<size_t>& target_shape,
                   const Array<T>& v, const Array<T>& w) {
    // Pull v forward to J via right-aligned (NumPy-style) projection, then add w.
    std::vector<size_t> shape = target_shape;
    std::vector<T> out(Array<T>::prod(shape), T{});
    size_t vRank = v.rank(), wRank = w.rank();
    for (size_t flat = 0; flat < out.size(); ++flat) {
        std::vector<size_t> idx = unravel(flat, shape);
        std::vector<size_t> vi(idx.size() - (shape.size() - vRank), 0);
        for (size_t d = 0; d < v.rank(); ++d)
            vi[d] = idx[shape.size() - vRank + d];
        std::vector<size_t> wi(idx.size() - (shape.size() - wRank), 0);
        for (size_t d = 0; d < w.rank(); ++d)
            wi[d] = idx[shape.size() - wRank + d];
        out[flat] = v.at(vi) + w.at(wi);
    }
    return Array<T>(shape, std::move(out));
}

// Softmax as Π-map: out_i = exp(v_i) / Σ_j exp(v_j)
Array<float> softmax(const Array<float>& v);

// NAND gate + attention spec
bool nand_gate(bool a, bool b);
Array<float> nand_attention(const Array<float>& q, const Array<float>& k, const Array<float>& v);

} // namespace sovarr
