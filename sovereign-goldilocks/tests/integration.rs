//! Sovereign Goldilocks Compute — Integration Tests
//!
//! Tests the reverse-engineered sovereign compute stack.

use sovereign_goldilocks::{
    GoldilocksField, LatticeElement, LatticeCertificate,
    ResonanceWord, URef, WormSeal, WormChain,
};

#[test]
fn test_goldilocks_field_arithmetic() {
    let a = GoldilocksField::new(12345);
    let b = GoldilocksField::new(67890);
    
    // Addition
    let c = a.add(&b);
    assert_eq!(c.0, 12345 + 67890);
    
    // Multiplication
    let d = a.mul(&b);
    assert_eq!(d.0, 12345 * 67890);
    
    // Inverse
    let a_inv = a.inv().unwrap();
    let product = a.mul(&a_inv);
    assert_eq!(product, GoldilocksField::ONE);
}

#[test]
fn test_boundary_lattice() {
    let elem = LatticeElement::new(5, 100);
    assert_eq!(elem.p, 5);
    assert_eq!(elem.b, 100);
    assert_eq!(elem.to_index(), 5 * 256 + 100);
    
    // Roundtrip
    let index = elem.to_index();
    let elem2 = LatticeElement::from_index(index);
    assert_eq!(elem, elem2);
    
    // All elements
    for i in 0..12288 {
        let e = LatticeElement::from_index(i);
        assert_eq!(e.to_index(), i);
    }
}

#[test]
fn test_lattice_certificate() {
    let cert = LatticeCertificate::verify();
    assert_eq!(cert.total_elements, 12288);
    assert_eq!(cert.orbit_sizes.len(), 6);
    assert!(cert.is_free_action);
}

#[test]
fn test_resonance_word() {
    let word = ResonanceWord::pack(0x0A, 12345);
    assert_eq!(word.class(), 0x0A);
    assert_eq!(word.payload(), 12345);
    
    let hash = word.hash();
    assert_eq!(hash.len(), 32);
}

#[test]
fn test_uref_subgroup() {
    let uref = URef::canonical();
    let elem = LatticeElement::new(0, 0);
    
    // Orbit size
    let orbit = uref.orbit(elem);
    assert_eq!(orbit.len(), 2048);
    
    // Involution property
    let mask = 1u16 << 3;
    let result1 = uref.apply(elem, mask);
    let result2 = uref.apply(result1, mask);
    assert_eq!(elem, result2);
    
    // Fixed point check
    assert!(!uref.has_fixed_point(elem));
}

#[test]
fn test_worm_seal() {
    let seal = WormSeal::seal("TEST", "payload", 100);
    assert_eq!(seal.hash.len(), 64);
    assert_eq!(seal.steps, 100);
    assert!(seal.verify());
}

#[test]
fn test_worm_chain() {
    let mut chain = WormChain::new();
    
    chain.append("EVENT_1", "data1", 10);
    chain.append("EVENT_2", "data2", 20);
    chain.append("EVENT_3", "data3", 30);
    
    assert_eq!(chain.len(), 3);
    assert!(chain.verify());
    
    let last = chain.last_seal().unwrap();
    assert_eq!(last.steps, 30);
}

#[test]
fn test_sovereign_compute_flow() {
    // 1. Create field elements
    let x = GoldilocksField::new(42);
    let y = GoldilocksField::new(58);
    let z = x.add(&y);
    assert_eq!(z.0, 100);
    
    // 2. Create lattice element
    let elem = LatticeElement::new(7, 200);
    assert_eq!(elem.to_index(), 7 * 256 + 200);
    
    // 3. Create resonance word
    let resonance = ResonanceWord::pack(0x01, elem.to_index() as u64);
    assert_eq!(resonance.class(), 0x01);
    
    // 4. Apply URef transformation
    let uref = URef::canonical();
    let transformed = uref.apply(elem, 0b10101010101);
    assert_ne!(elem, transformed);
    
    // 5. Seal the computation
    let mut chain = WormChain::new();
    chain.append("COMPUTE", &format!("{}+{}={}", x.0, y.0, z.0), 1);
    chain.append("TRANSFORM", &format!("{:?} -> {:?}", elem, transformed), 2);
    
    assert!(chain.verify());
    assert_eq!(chain.len(), 2);
}
