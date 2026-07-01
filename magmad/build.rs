// build.rs — magmad build script
//
// Compiles errant/runtime/errant.c → liberrant.a via the cc crate.
// Linked statically so magmad has zero runtime dep on errant.c.
//
// Proto types are hand-written in src/grpc/sovereign_types.rs and do not
// require protoc. When protoc is available, remove sovereign_types.rs and
// re-add: tonic_build::configure().compile(&["proto/sovereign.proto"],&["proto"])

fn main() {
    let target_env = std::env::var("CARGO_CFG_TARGET_ENV").unwrap_or_default();
    let is_msvc    = target_env == "msvc";

    let mut build = cc::Build::new();
    build
        .file("../errant/runtime/errant.c")
        .include("../errant/runtime");

    if is_msvc {
        // MSVC: suppress C4996 (deprecated strncpy/snprintf — debug labels only)
        build.flag("/wd4996");
    } else {
        // GCC/Clang: suppress debug-label truncation warnings (safe)
        build
            .flag("-std=c11")
            .flag("-O2")
            .flag("-Wno-stringop-truncation")
            .flag("-Wno-format-truncation");
    }

    build.compile("errant");

    println!("cargo:rustc-link-lib=static=errant");
    println!("cargo:rerun-if-changed=../errant/runtime/errant.c");
    println!("cargo:rerun-if-changed=../errant/runtime/errant.h");
}
