import base64, json, subprocess, tempfile, os

pushes = [
    (
        "SNAPKITTYWEST/Sweeter16",
        "docs/LLM_TRANSLATION_GATE.md",
        "edaulc-sweet16-gate",
        "docs: LLM logit gate for Sweet16 to modern target translation",
        "# Sweet16 to Modern Target: LLM Translation Gate\n\nSweet16 is a 16-bit virtual machine squeezed into ~300 bytes of 6502 assembly.\nIts instruction encoding (4-bit opcode | 4-bit register) maps directly\nto token-constrained LLM translation via GBNF grammar-constrained decoding.\n\n## Why Sweet16 maps cleanly to logit gating\n\nEach Sweet16 instruction is exactly one byte: high nibble = opcode, low nibble = register.\nThis is isomorphic to a constrained vocabulary over 256 tokens.\n\n```\nSweet16 byte:  [opcode:4][register:4]\nGBNF token:    [valid_op][valid_reg]\nLogit mask:    P(invalid_token) = 0\n```\n\n## Register mapping\n\n| Sweet16 | Role | Rust equivalent |\n|---------|------|-----------------|\n| R0 | Accumulator | `let mut acc: u16` |\n| R12 | Subroutine stack | `let mut sp: u16` |\n| R14 low | Status (carry + index) | `let mut status: u8` |\n| R15 | Instruction pointer | `let mut ip: u16` |\n| R1-R11 | General purpose | `let mut r: [u16; 16]` |\n\n## Translation gate schema\n\n```xml\n<compiler_gate>\n  <source>Sweet16 6502 assembly</source>\n  <target>Rust kernel function</target>\n  <instruction>\n    Map R0-R15 zero page registers to Rust locals.\n    Preserve post-increment semantics for LD@/ST@ memory ops.\n    ADD/SUB set inverted carry (6502 convention). All other ops clear carry.\n    RTN must return to caller cleanly.\n  </instruction>\n</compiler_gate>\n```\n\n## Connection to Gates Normalization\n\nThe Sweet16 opcode space (256 values) forms a probability simplex.\nGrammar-constrained decoding masks invalid opcodes to probability 0.\nThe normalization constraint holds over the valid subset: sum(P) = 1.\n\nSee: https://github.com/SNAPKITTYWEST/sovereign-xml-compiler\n"
    ),
    (
        "SNAPKITTYWEST/apple1",
        "docs/SOVEREIGN_CORPUS_ANNOTATION.md",
        "edaulc-corpus",
        "docs: sovereign corpus annotation for WozMon 6502 primitives",
        "# WozMon 6502 Primitives: Sovereign Corpus Annotation\n\nThe Woz Monitor is 256 bytes of hand-optimized 6502 assembly.\nThis document annotates key primitives for LLM-based translation.\n\n## Key primitives\n\n### GETLINE\nReads chars into input buffer until CR. Uses X register as buffer index.\nTerminates on $8D (high-bit CR -- Apple 1 used 7-bit ASCII with high bit as flag).\nMaps to: `read_line() -> Vec<u8>` in Rust.\n\n### PRHEX\nPrints A register as two hex digits via nibble extraction + $B0/$B9 offset.\nConverts 0-9/A-F in 2 instructions. Maps to: `format!(\"{:02X}\", byte)`.\n\n### XAML/XAMB (memory examine)\nDumps memory in hex+ASCII, 8 bytes per line using Y register inner loop.\nMaps to: `hexdump -C` semantics, `.chunks(8)` iterator pattern.\n\n## Why register reuse is hard to translate\n\nWozniak's code achieves density through:\n1. Register reuse -- A/X/Y carry persistent state across subroutine calls\n2. Self-modifying memory pointers -- address bytes patched in place\n3. Flag arithmetic -- carry/overflow used as free boolean registers\n\nA translation gate must explicitly model the register file as mutable state\npassed through every function boundary.\n\nSee: https://github.com/SNAPKITTYWEST/twin-o-matic for the RSI loop\nthat iteratively improves translation quality across generations.\n"
    ),
    (
        "SNAPKITTYWEST/Apple-Sources-Codes",
        "docs/WOZBASIC_CORPUS_NOTES.md",
        "edaulc-basic",
        "docs: WozBASIC interpreter structure notes for corpus annotation",
        "# WozBASIC: Interpreter Structure Notes\n\nApple 1 BASIC is a complete interpreter (tokenizer, parser, evaluator, runtime)\nhand-written by Wozniak in ~4KB of 6502 assembly.\n\n## Interpreter phases\n\n| Phase | Entry | Description |\n|-------|-------|-------------|\n| Tokenizer | CRNCH | Keywords compressed to single-byte tokens |\n| Parser | NEWSTT | Statement dispatcher via token jump table |\n| Expression eval | FRMEVL | Recursive descent, operator precedence |\n| Runtime | RUNC | Program execution loop |\n\n## The token table IS the vocabulary\n\nWozBASIC uses keyword compression (CRNCH) + jump table dispatch (NEWSTT).\nThis is structurally identical to an LLM vocabulary:\n\n  Keyword string -> token byte  (tokenizer = BPE encoding)\n  Token byte -> handler address (embedding = jump table lookup)\n  Handler executes              (forward pass = subroutine)\n\nWozniak discovered transformer architecture in 1976.\n\n## Expression evaluator (FRMEVL)\n\nUses recursive descent with the 6502 hardware stack as the call stack.\nDirect translation target: `eval_expr(tokens: &[Token]) -> f32` in Rust.\n\nFloating point: 5-byte format (1 sign/exp + 4 mantissa).\nTranslation target: f32 with explicit rounding at each op boundary.\n\nSee: https://github.com/SNAPKITTYWEST/lean-llm-starter for zero-sorry\nformal verification of interpreter correctness properties.\n"
    ),
    (
        "SNAPKITTYWEST/Historical-Source-Code-Apple-II-DOS-Repository",
        "docs/DISK_TIMING_ANALYSIS.md",
        "edaulc-timing",
        "docs: cycle-accurate disk timing analysis for LLM translation corpus",
        "# Apple II DOS Disk Timing: Cycle-Accurate Analysis\n\nThe Apple II DOS read/write routines (Wozniak, May 1978) are cycle-accurate\nhardware programming. The floppy controller has no buffer -- the CPU must\nread/write bits in exact 32-cycle windows or data is lost.\n\n## The constraint\n\n  Apple II floppy: 256us per bit cell at 300 RPM\n  6502 at 1MHz: 1us per cycle\n  Window: read loop must execute in exactly 32 cycles per bit\n\nEvery instruction was chosen for its exact cycle count.\nNOP (2 cycles) is used as a timing pad. The algorithm IS the timing.\n\n## Why LLM translation fails here\n\nModern hardware has DMA, FIFO buffers, interrupt-driven I/O.\nNaive translation produces correct logic but wrong timing --\npasses unit tests, fails on real hardware.\n\n## Translation gate requirement\n\n```xml\n<compiler_gate>\n  <constraint>cycle_accurate</constraint>\n  <instruction>\n    Preserve all NOP padding. Document cycle counts in comments.\n    Flag any instruction whose translated cycle count differs from original.\n    Mark timing-critical loops with volatile memory access.\n  </instruction>\n</compiler_gate>\n```\n\n## Open formal verification problem\n\nA Lean 4 proof of timing correctness would model the 6502 cycle counter\nas a dependent type. The loop invariant: sum_cycles(loop) = 32.\nThis is an open problem in formal verification of real-time systems.\n\nSee: https://huggingface.co/datasets/Snapkitty/papers for related formal math.\n"
    ),
]

for repo, path, branch, msg, content in pushes:
    encoded = base64.b64encode(content.encode()).decode()
    payload = {"message": msg, "content": encoded, "branch": branch}
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(payload, f)
        fname = f.name
    result = subprocess.run(
        ['gh', 'api', f'repos/{repo}/contents/{path}', '-X', 'PUT', '--input', fname],
        capture_output=True, text=True
    )
    os.unlink(fname)
    print(f'{repo}: {"OK" if result.returncode == 0 else result.stderr[:200]}')
