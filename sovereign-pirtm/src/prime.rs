//! Prime number utilities

pub struct Primes;

impl Primes {
    pub fn is_prime(n: usize) -> bool {
        if n < 2 { return false; }
        if n < 4 { return true; }
        if n % 2 == 0 || n % 3 == 0 { return false; }
        let mut i = 5;
        while i * i <= n {
            if n % i == 0 || n % (i + 2) == 0 { return false; }
            i += 6;
        }
        true
    }

    pub fn nth(n: usize) -> usize {
        let mut count = 0;
        let mut num = 2;
        loop {
            if Self::is_prime(num) {
                count += 1;
                if count == n { return num; }
            }
            num += 1;
        }
    }

    pub fn sieve(limit: usize) -> Vec<usize> {
        let mut sieve = vec![true; limit + 1];
        sieve[0] = false;
        if limit > 0 { sieve[1] = false; }
        let mut i = 2;
        while i * i <= limit {
            if sieve[i] {
                let mut j = i * i;
                while j <= limit {
                    sieve[j] = false;
                    j += i;
                }
            }
            i += 1;
        }
        sieve.iter().enumerate().filter(|(_, &p)| p).map(|(i, _)| i).collect()
    }
}

pub fn prime_at(index: usize) -> usize {
    Primes::nth(index)
}
