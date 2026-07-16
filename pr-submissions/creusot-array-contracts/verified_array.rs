use creusot_contracts::*;

/// Pearlite logic function: sum of arr[lo..hi].
#[logic]
fn sum_of(arr: Seq<u32>, lo: usize, hi: usize) -> u32 {
    pearlite! {
        if lo >= hi { 0u32 }
        else { arr[lo] + sum_of(arr, lo + 1, hi) }
    }
}

#[requires(index < arr.len())]
#[ensures(result == arr[index])]
pub fn verified_get<T: Copy>(arr: &[T], index: usize) -> T {
    arr[index]
}

#[requires(index < arr.len())]
#[ensures(*result == old(arr[index]))]
#[ensures(forall<i: usize> i != index && i < arr.len() ==> arr[i] == old(arr[i]))]
pub fn verified_get_mut<T>(arr: &mut [T], index: usize) -> &mut T {
    &mut arr[index]
}

#[ensures(match result {
    Some(idx) => idx < arr.len() && arr[idx] == value &&
        forall<j: usize> j < idx ==> arr[j] != value,
    None => forall<i: usize> i < arr.len() ==> arr[i] != value,
})]
pub fn verified_find<T: PartialEq>(arr: &[T], value: T) -> Option<usize> {
    let mut i = 0;
    #[invariant(i <= arr.len())]
    #[invariant(forall<j: usize> j < i ==> arr[j] != value)]
    while i < arr.len() {
        if arr[i] == value {
            return Some(i);
        }
        i += 1;
    }
    None
}

#[ensures(result == sum_of(arr@, 0, arr.len()))]
pub fn verified_sum(arr: &[u32]) -> u32 {
    let mut sum: u32 = 0;
    let mut i = 0;
    #[invariant(i <= arr.len())]
    #[invariant(sum == sum_of(arr@, 0, i))]
    while i < arr.len() {
        sum = sum.wrapping_add(arr[i]);
        i += 1;
    }
    sum
}

#[requires(src_start + count <= src.len())]
#[requires(dst_start + count <= dst.len())]
#[ensures(forall<i: usize> i < count ==> dst[dst_start + i] == src[src_start + i])]
#[ensures(forall<j: usize>
    (j < dst_start || j >= dst_start + count) && j < dst.len()
    ==> dst[j] == old(dst[j])
)]
pub fn verified_copy_range(
    src: &[u8],
    src_start: usize,
    dst: &mut [u8],
    dst_start: usize,
    count: usize,
) {
    let mut i = 0;
    #[invariant(i <= count)]
    #[invariant(forall<j: usize> j < i ==> dst[dst_start + j] == src[src_start + j])]
    while i < count {
        dst[dst_start + i] = src[src_start + i];
        i += 1;
    }
}

#[ensures(result ==> forall<i: usize> i < arr.len() ==> predicate(&arr[i]))]
pub fn verified_all<T, F: Fn(&T) -> bool>(arr: &[T], predicate: F) -> bool {
    let mut i = 0;
    #[invariant(i <= arr.len())]
    #[invariant(forall<j: usize> j < i ==> predicate(&arr[j]))]
    while i < arr.len() {
        if !predicate(&arr[i]) {
            return false;
        }
        i += 1;
    }
    true
}

#[ensures(result <= arr.len())]
#[ensures(forall<i: usize> i < result ==> predicate(&arr[i]))]
#[ensures(forall<i: usize> i >= result && i < arr.len() ==> !predicate(&arr[i]))]
pub fn verified_partition<T, F: Fn(&T) -> bool>(arr: &mut [T], predicate: F) -> usize {
    let mut i = 0;
    let mut j = arr.len();
    #[invariant(i <= j)]
    #[invariant(j <= arr.len())]
    #[invariant(forall<k: usize> k < i ==> predicate(&arr[k]))]
    #[invariant(forall<k: usize> k >= j && k < arr.len() ==> !predicate(&arr[k]))]
    while i < j {
        if predicate(&arr[i]) {
            i += 1;
        } else {
            j -= 1;
            arr.swap(i, j);
        }
    }
    i
}
