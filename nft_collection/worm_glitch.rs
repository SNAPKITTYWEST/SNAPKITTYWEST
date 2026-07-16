// worm_glitch.rs — Sovereign WORM-chain NFT collection generator (pure std, no deps)
//
// Build:  rustc worm_glitch.rs -O -o worm_glitch
// Run:    ./worm_glitch [link_count] [output_dir]
//
// Produces:
//   <out>/worm_chain.json   — append-only SHA-256 hash chain (the "worm")
//   <out>/glitch_<i>.svg    — procedural glitch art, one per worm link
//   <out>/cover.svg         — the glitch-art "front" of the worm
//   <out>/collection.json   — ERC-721-style metadata for the whole collection
//
// The glitch art is embedded as the COVER (front) of the worm, and every link
// of the chain carries its own art derived from its own hash. Nothing here
// touches a network or a wallet; minting is a separate, gated step.

use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

// ----------------------------- SHA-256 (pure) -----------------------------

const K: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

fn sha256(msg: &[u8]) -> [u8; 32] {
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    let bit_len = (msg.len() as u64).wrapping_mul(8);
    let mut padded = msg.to_vec();
    padded.push(0x80);
    while padded.len() % 64 != 56 {
        padded.push(0x00);
    }
    padded.extend_from_slice(&bit_len.to_be_bytes());

    for chunk in padded.chunks(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([chunk[4 * i], chunk[4 * i + 1], chunk[4 * i + 2], chunk[4 * i + 3]]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh) =
            (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let t1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let t2 = s0.wrapping_add(maj);
            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(t1);
            d = c;
            c = b;
            b = a;
            a = t1.wrapping_add(t2);
        }
        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }
    let mut out = [0u8; 32];
    for i in 0..8 {
        out[4 * i..4 * i + 4].copy_from_slice(&h[i].to_be_bytes());
    }
    out
}

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{:02x}", x)).collect()
}

// --------------------------- tiny deterministic PRNG ---------------------------

fn lcg(state: &mut u64) -> u64 {
    *state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
    *state >> 16
}

// ------------------------------ glitch art (SVG) ------------------------------

// Returns an SVG document seeded by `seed`. Pure text, no external deps, valid
// image format, embeddable as a data URI in NFT metadata.
fn glitch_svg(seed: u64, label: &str) -> String {
    let mut s: u64 = seed;
    let w = 1024u32;
    let h = 1024u32;
    let mut rects = String::new();
    // RGB-split noise blocks
    for _ in 0..60 {
        let x = (lcg(&mut s) % w as u64) as u32;
        let y = (lcg(&mut s) % h as u64) as u32;
        let rw = 20 + (lcg(&mut s) % 220) as u32;
        let rh = 4 + (lcg(&mut s) % 60) as u32;
        let r = (lcg(&mut s) % 256) as u8;
        let g = (lcg(&mut s) % 256) as u8;
        let b = (lcg(&mut s) % 256) as u8;
        let op = 0.25 + (lcg(&mut s) % 60) as f32 / 100.0;
        rects.push_str(&format!(
            "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"rgb({},{},{})\" opacity=\"{:.2}\"/>\n",
            x, y, rw, rh, r, g, b, op
        ));
    }
    // scanlines
    let mut scan = String::new();
    for y in (0..h).step_by(4) {
        scan.push_str(&format!(
            "<rect x=\"0\" y=\"{}\" width=\"{}\" height=\"2\" fill=\"#000\" opacity=\"0.18\"/>\n",
            y, w
        ));
    }
    format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{}\" height=\"{}\" viewBox=\"0 0 {} {}\">\n\
         <rect width=\"100%\" height=\"100%\" fill=\"#05010a\"/>\n\
         <g style=\"mix-blend-mode:screen\">\n{}\n</g>\n\
         {}\n\
         <text x=\"40\" y=\"980\" font-family=\"monospace\" font-size=\"34\" fill=\"#39ff14\" opacity=\"0.9\">{}</text>\n\
         <text x=\"44\" y=\"984\" font-family=\"monospace\" font-size=\"34\" fill=\"#ff2bd6\" opacity=\"0.5\">{}</text>\n\
         </svg>",
        w, h, w, h, rects, scan, label, label
    )
}

fn svg_data_uri(svg: &str) -> String {
    let b64 = base64_encode(svg.as_bytes());
    format!("data:image/svg+xml;base64,{}", b64)
}

// minimal base64 (no deps)
fn base64_encode(input: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in input.chunks(3) {
        let b = match chunk.len() {
            1 => [chunk[0], 0, 0],
            2 => [chunk[0], chunk[1], 0],
            _ => [chunk[0], chunk[1], chunk[2]],
        };
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | (b[2] as u32);
        out.push(T[((n >> 18) & 63) as usize] as char);
        out.push(T[((n >> 12) & 63) as usize] as char);
        if chunk.len() > 1 {
            out.push(T[((n >> 6) & 63) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(T[(n & 63) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

// ------------------------------- WORM link ----------------------------------

struct Link {
    index: u64,
    prev_hash: String,
    payload: String, // JSON of invariants + glitch art ref
    timestamp: u64,
    hash: String,
    signature: String, // ed25519:<pending> until minted
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let n: usize = args.get(1).and_then(|s| s.parse().ok()).unwrap_or(9);
    let out = args.get(2).cloned().unwrap_or_else(|| "nft_out".to_string());
    fs::create_dir_all(&out).expect("mkdir");

    // Recurring invariants from the paper (Section 18.4)
    let invariants = ["normalization", "ownership", "provenance", "append-only history",
                      "bounded effects", "deterministic verification", "failure closure"];

    let mut prev = "0".repeat(64); // genesis
    let mut links: Vec<Link> = Vec::new();
    let mut items: Vec<BTreeMap<String, String>> = Vec::new();

    for i in 0..n {
        // payload binds the chain to the paper's invariants + this link's hash seed
        let mut payload = BTreeMap::new();
        payload.insert("worm_index".to_string(), i.to_string());
        payload.insert("prev_hash".to_string(), prev.clone());
        for (k, inv) in invariants.iter().enumerate() {
            payload.insert(format!("invariant_{}", k), inv.to_string());
        }
        let payload_json = ser_map(&payload);

        let seed = u64::from_str_radix(&prev[0..16], 16).unwrap_or(i as u64 + 1);
        let label = format!("WORM#{:02} · KILL-SWITCH-9999", i);
        let art = glitch_svg(seed ^ (i as u64).wrapping_mul(0x9e3779b97), &label);
        let art_path = format!("{}/glitch_{:02}.svg", out, i);
        fs::write(&art_path, &art).expect("write svg");

        // hash binds previous hash + payload + art
        let mut blob = Vec::new();
        blob.extend_from_slice(prev.as_bytes());
        blob.extend_from_slice(payload_json.as_bytes());
        blob.extend_from_slice(art.as_bytes());
        let hash = hex(&sha256(&blob));

        links.push(Link {
            index: i as u64,
            prev_hash: prev.clone(),
            payload: payload_json,
            timestamp: now(),
            hash: hash.clone(),
            signature: "ed25519:<pending-mint>".to_string(),
        });

        let mut item = BTreeMap::new();
        item.insert("tokenId".to_string(), i.to_string());
        item.insert("name".to_string(), format!("Cosmic Sieve WORM #{}", i));
        item.insert("description".to_string(),
            "A link in the Sovereign WORM chain behind the Cosmic Invariant Sieve / Kill Switch 9999. Glitch art embedded as the front of the worm.".to_string());
        item.insert("image".to_string(), svg_data_uri(&art));
        item.insert("worm_prev_hash".to_string(), prev.clone());
        item.insert("worm_hash".to_string(), hash.clone());
        items.push(item);

        prev = hash;
    }

    // cover = glitch art of link 0 (the "front" of the worm)
    let cover = glitch_svg(0xC0FFEE, "KILL SWITCH 9999 · COVER");
    fs::write(format!("{}/cover.svg", out), &cover).expect("write cover");

    // worm_chain.json
    let chain_json = ser_links(&links);
    fs::write(format!("{}/worm_chain.json", out), chain_json).expect("write chain");

    // collection.json (ERC-721-style)
    let mut collection = BTreeMap::new();
    collection.insert("name".to_string(), "Cosmic Invariant Sieve — WORM Chain".to_string());
    collection.insert("description".to_string(),
        "On-chain-ready NFT collection: a Sovereign WORM (append-only SHA-256) chain, each link carrying glitch art and the seven recurring invariants of the SnapKitty proof system. Minting is a gated, separate step.".to_string());
    collection.insert("cover_image".to_string(), svg_data_uri(&cover));
    collection.insert("attributes".to_string(), "sovereign-worm,intercal-tripwire,kill-switch-9999".to_string());
    collection.insert("items".to_string(), ser_items(&items));
    fs::write(format!("{}/collection.json", out), ser_map(&collection)).expect("write collection");

    println!("Wrote {} worm links + glitch art + collection.json to `{}`", n, out);
    println!("Chain tip (last hash): {}", prev);
}

// --------------------------- minimal JSON serializers ---------------------------

fn ser_map(m: &BTreeMap<String, String>) -> String {
    let mut s = String::from("{");
    let mut first = true;
    for (k, v) in m {
        if !first {
            s.push(',');
        }
        first = false;
        s.push_str(&format!("\"{}\":\"{}\"", escape(k), escape(v)));
    }
    s.push('}');
    s
}

fn ser_links(links: &[Link]) -> String {
    let mut s = String::from("[");
    for (i, l) in links.iter().enumerate() {
        if i > 0 {
            s.push(',');
        }
        s.push_str(&format!(
            "{{\"index\":{},\"prev_hash\":\"{}\",\"payload\":{},\"timestamp\":{},\"hash\":\"{}\",\"signature\":\"{}\"}}",
            l.index, l.prev_hash, l.payload, l.timestamp, l.hash, l.signature
        ));
    }
    s.push(']');
    s
}

fn ser_items(items: &[BTreeMap<String, String>]) -> String {
    let mut s = String::from("[");
    for (i, it) in items.iter().enumerate() {
        if i > 0 {
            s.push(',');
        }
        s.push_str(&ser_map(it));
    }
    s.push(']');
    s
}

fn escape(t: &str) -> String {
    t.replace('\\', "\\\\").replace('"', "\\\"")
}
