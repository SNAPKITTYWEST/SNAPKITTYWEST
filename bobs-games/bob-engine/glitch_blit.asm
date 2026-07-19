; ══════════════════════════════════════════════════════════════════════════════
; BOB ENGINE — Glitch Blit + ANSI Emit  —  NASM (Linux x86-64, AVX2)
; ══════════════════════════════════════════════════════════════════════════════
;
; Frameless · Buffer-Centric · Zero-GC · Deterministic
;
; Calling convention (System V AMD64):
;   rdi = Avatars*        (RO array of AgentAvatar)
;   rsi = AgentCount      (u32)
;   rdx = FrameIdx        (u32, monotonically increasing)
;   rcx = OutIov*         (ptr to struct iovec array)
; Returns: total bytes queued in iovecs (rax), -1 on error
;
; SNAPKITTYWEST · BOB's Games · 2026
; ══════════════════════════════════════════════════════════════════════════════

%define SYS_WRITEV     20
%define SYS_STDOUT     1
%define AVATAR_W       16          ; bytes per row (128-bit)
%define AVATAR_H       4           ; rows per avatar
%define GLITCH_GLYPHS  16          ; size of replacement glyph table
%define FRAME_CYCLE    64          ; precomputed mask cycle length
%define IOV_BASE_OFF   0
%define IOV_LEN_OFF    8
%define IOV_SIZE       16          ; sizeof(struct iovec)

section .rodata align=32
    ; ANSI: CSI H (cursor home) + CSI 2J (clear screen)
    ansi_header:   db 27,'[H',27,'[2J'
    ansi_hdr_len:  equ $ - ansi_header

    ; Glitch glyph palette (index = mask_byte & 0xF)
    glitch_glyphs: db '@','#','%','&','?','!','*',';',':','+','=','~','^','`','|','/'

    ; Mask helpers
    mask_low_nibble: times 32 db 0x0F
    zero_ymm:        times 32 db 0

section .bss align=4096
    ; Double-buffered avatar slots: [agent][buffer][row][AVATAR_W]
    avatar_slots: resb 256 * 2 * AVATAR_H * AVATAR_W

section .text align=32
    global glitch_blit_ansi

; ══════════════════════════════════════════════════════════════════════════════
; glitch_blit_ansi — Main entry point
; ══════════════════════════════════════════════════════════════════════════════
glitch_blit_ansi:
    ; ── Prologue ──────────────────────────────────────────────────────────
    push rbx
    push r12
    push r13
    push r14
    push r15
    sub  rsp, 32                 ; shadow space + alignment

    mov  r12, rdi                ; Avatars*
    mov  r13d, esi               ; AgentCount
    mov  r14d, edx               ; FrameIdx
    mov  r15, rcx                ; OutIov*

    ; ── Build iovec[0] = ANSI header ─────────────────────────────────────
    mov  qword [r15 + IOV_BASE_OFF], ansi_header
    mov  qword [r15 + IOV_LEN_OFF],  ansi_hdr_len
    add  r15, IOV_SIZE           ; advance to next iovec

    ; ── Compute frame cycle index ────────────────────────────────────────
    mov  eax, r14d               ; FrameIdx
    xor  edx, edx
    mov  ecx, FRAME_CYCLE
    div  ecx                     ; eax = frame_mod_cycle
    mov  r8d, eax                ; r8d = mask_cycle_index

    ; ── Precompute base pointers ─────────────────────────────────────────
    lea  r9,  [rel glitch_glyphs]      ; r9 = glyph table
    lea  r10, [rel avatar_slots]       ; r10 = double-buffer base
    mov  r11d, AVATAR_H * AVATAR_W     ; bytes per avatar frame

    ; ── Save iovec base for writev ───────────────────────────────────────
    mov  rbp, r15                ; rbp = iovec base (after header)

    ; ══════════════════════════════════════════════════════════════════════
    ; Main agent loop
    ; ══════════════════════════════════════════════════════════════════════
    xor  ebx, ebx                ; agent index = 0

.agent_loop:
    cmp  ebx, r13d
    jge  .done_agents

    ; ── Load AgentAvatar metadata (RO, 8 bytes each) ─────────────────────
    ;   +0: w (u8), +1: h (u8), +2: glyph_off (u16), +4: mask_seed (u16)
    movzx eax, byte [r12 + rbx*8 + 0]   ; w
    movzx ecx, byte [r12 + rbx*8 + 1]   ; h (rows)
    movzx edx, word [r12 + rbx*8 + 2]   ; glyph_off
    movzx edi, word [r12 + rbx*8 + 4]   ; mask_seed

    ; ── Select active buffer (ping-pong on frame LSB) ────────────────────
    test r14b, 1
    jz   .buf0
    lea  rsi, [r10 + rbx*2*r11d + r11d] ; buffer 1
    jmp  .buf_ready
.buf0:
    lea  rsi, [r10 + rbx*2*r11d]        ; buffer 0
.buf_ready:

    ; ── Source glyph data (RO) ───────────────────────────────────────────
    lea  rdi, [rel avatar_glyph_data]
    add  rdi, rdx                ; glyph_off into glyph data

    ; ══════════════════════════════════════════════════════════════════════
    ; Per-row SIMD glitch blit
    ; ══════════════════════════════════════════════════════════════════════
    xor  eax, eax                ; row index = 0

.row_loop:
    cmp  al, cl
    jge  .row_done

    ; ── Load clean row (16 bytes) → ymm0 ─────────────────────────────────
    vmovdqu ymm0, [rdi + rax*AVATAR_W]

    ; ── Compute mask pointer ─────────────────────────────────────────────
    ; mask = GLITCH_MASKS[frame_cycle][row][0]
    mov  edx, edi                ; mask_seed
    add  edx, r8d                ; + frame_cycle
    add  edx, eax                ; + row
    and  edx, FRAME_CYCLE - 1
    imul edx, AVATAR_H * AVATAR_W
    lea  rdx, [rel glitch_masks + rdx + rax*AVATAR_W]

    ; ── Load mask row → ymm1 ─────────────────────────────────────────────
    vmovdqu ymm1, [rdx]

    ; ── Expand mask bytes to 16-bit words ────────────────────────────────
    vpmovzxbw ymm2, xmm1

    ; ── Mask & 0xF for glyph table lookup ────────────────────────────────
    vpand     ymm2, ymm2, [rel mask_low_nibble]

    ; ── Lookup glitch glyph via vpshufb ──────────────────────────────────
    ; Note: vpshufb works on 128-bit lanes; we process low 16 bytes
    vextractf128 xmm3, ymm2, 0
    vpshufb   xmm3, xmm3, [rel glitch_glyphs]
    vinsertf128 ymm3, ymm3, xmm3, 1

    ; ── Blend: mask==0 → original, else → glitch ─────────────────────────
    vpcmpeqb  ymm4, ymm1, [rel zero_ymm]
    vpblendvb ymm0, ymm3, ymm0, ymm4

    ; ── Store to active buffer ───────────────────────────────────────────
    vmovdqu [rsi + rax*AVATAR_W], ymm0

    inc  eax
    jmp  .row_loop

.row_done:

    ; ══════════════════════════════════════════════════════════════════════
    ; Emit ANSI cursor move + glyph rows into iovec
    ; ══════════════════════════════════════════════════════════════════════
    mov  ecx, AVATAR_H
    xor  edx, edx                ; row within avatar

.emit_rows:
    ; ── Build CSI sequence on stack ──────────────────────────────────────
    lea  rdi, [rsp - 32]
    mov  byte [rdi], 27          ; ESC
    mov  byte [rdi+1], '['       ; [

    ; row = agent*AVATAR_H + row_idx + 1 (1-based)
    lea  eax, [rbx*AVATAR_H + edx + 1]
    call u32_to_ascii
    mov  byte [rdi + 2 + rax], ';'

    ; col = agent*AVATAR_W + 1
    lea  eax, [rbx*AVATAR_W + 1]
    lea  rdi, [rsp - 32 + 3 + rax]
    call u32_to_ascii
    mov  word [rdi + rax], 'H'
    add  rax, 2                  ; total CSI len

    ; ── iovec for CSI ────────────────────────────────────────────────────
    lea  rcx, [rsp - 32]
    mov  qword [rbp + IOV_BASE_OFF], rcx
    mov  qword [rbp + IOV_LEN_OFF], rax
    add  rbp, IOV_SIZE

    ; ── iovec for glyph row (from buffer) ────────────────────────────────
    mov  qword [rbp + IOV_BASE_OFF], rsi
    mov  qword [rbp + IOV_LEN_OFF], AVATAR_W
    add  rbp, IOV_SIZE

    add  rsi, AVATAR_W
    inc  edx
    dec  ecx
    jnz  .emit_rows

    inc  ebx
    jmp  .agent_loop

.done_agents:

    ; ══════════════════════════════════════════════════════════════════════
    ; Final syscall: writev(1, iovec_array, iovec_count)
    ; ══════════════════════════════════════════════════════════════════════
    mov  rax, SYS_WRITEV
    mov  rdi, SYS_STDOUT         ; stdout
    mov  rsi, r15                ; iovec base (was saved before rbp)
    mov  rdx, rbp
    sub  rdx, r15
    shr  rdx, 4                  ; iovec count = bytes / 16
    syscall

    ; ── Return ───────────────────────────────────────────────────────────
    mov  rax, rbp
    sub  rax, r15
    shr  rax, 4                  ; return iovec count

    ; ── Epilogue ─────────────────────────────────────────────────────────
    add  rsp, 32
    pop  r15
    pop  r14
    pop  r13
    pop  r12
    pop  rbx
    vzeroupper
    ret

; ══════════════════════════════════════════════════════════════════════════════
; u32_to_ascii — Helper: convert u32 to ASCII decimal string
; Input: rdi = buffer, eax = value
; Output: rax = length written
; ══════════════════════════════════════════════════════════════════════════════
u32_to_ascii:
    push rbx
    mov  ebx, eax
    mov  ecx, 10
    lea  rsi, [rdi + 10]
    mov  byte [rsi], 0
    dec  rsi

.loop:
    xor  edx, edx
    div  ecx
    add  dl, '0'
    mov  [rsi], dl
    dec  rsi
    test eax, eax
    jnz  .loop

    inc  rsi
    mov  rax, rdi
    add  rax, 10
    sub  rax, rsi
    mov  rcx, rax
    rep  movsb
    mov  rax, rcx
    pop  rbx
    ret

; ══════════════════════════════════════════════════════════════════════════════
; Data sections
; ══════════════════════════════════════════════════════════════════════════════
section .rodata

; glitch_masks[FRAME_CYCLE][AVATAR_H][AVATAR_W] — precomputed offline
glitch_masks:
    ; Filled by build-time tooling (deterministic PRNG per agent seed)
    ; Example: incbin "glitch_masks.bin"

; Avatar glyph data (concatenated clean frames, 16 bytes * 4 rows per agent)
avatar_glyph_data:
    ; [o-o] robot
    db '  [o-o]        '
    db '  /| |\        '
    db '  _/ \_        '
    db '               '
    ; ^_^ happy robot
    db '   ^_^         '
    db '  /O O\        '
    db '  \___/        '
    db '   | |         '
    ; >_< angry robot
    db '  >_<          '
    db '  /X X\        '
    db '  \===/        '
    db '  / \ /        '
    ; O_O surprised robot
    db '   O_O         '
    db '  /0 0\        '
    db '  \ooo/        '
    db '   | |         '
    ; B-) cool robot
    db ' B-)           '
    db '  /O O\        '
    db '  \___/        '
    db '  / \ /        '
