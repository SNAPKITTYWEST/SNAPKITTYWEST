; SHA-256 hash implementation in x86-64 NASM assembly
; Windows x64 calling convention (Microsoft): RCX, RDX, R8, R9
; void sha256_hash(const uint8_t* data, size_t len, uint8_t out[32])
;
; This is a clean, readable implementation optimized for correctness.
; For production, use BLAKE3 AVX2 from the original foundry-intel repo.

bits 64
default rel

section .data
align 64
K256:
    dd 0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5
    dd 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5
    dd 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3
    dd 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174
    dd 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc
    dd 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da
    dd 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7
    dd 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967
    dd 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13
    dd 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85
    dd 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3
    dd 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070
    dd 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5
    dd 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3
    dd 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208
    dd 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2

align 16
H_INIT:
    dd 0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a
    dd 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19

MASK_32:
    dd 0xFFFFFFFF

section .bss
align 16
W: resd 64
H: resd 8
block: resb 64

section .text

; ── Macros ────────────────────────────────────────────────────────────────────

%macro ROTR 2
    ; %1 = result, %2 = value, %3 = bits (immediate)
    ; Note: only works with immediate rotate amounts
    ror %2, %1
%endmacro

%macro CH 4
    ; %1 = x, %2 = y, %3 = z, %4 = temp
    mov %4, %2
    and %4, %3
    mov eax, %1
    not eax
    and eax, %3
    xor %4, eax
%endmacro

%macro MAJ 4
    ; %1 = x, %2 = y, %3 = z, %4 = temp
    mov %4, %1
    and %4, %2
    mov eax, %1
    and eax, %3
    xor %4, eax
    mov eax, %2
    and eax, %3
    xor %4, eax
%endmacro

%macro BSIG0 2
    ; %1 = x, %2 = temp
    mov %2, %1
    ror %2, 2
    mov eax, %1
    ror eax, 13
    xor %2, eax
    mov eax, %1
    ror eax, 22
    xor %2, eax
%endmacro

%macro BSIG1 2
    ; %1 = x, %2 = temp
    mov %2, %1
    ror %2, 6
    mov eax, %1
    ror eax, 11
    xor %2, eax
    mov eax, %1
    ror eax, 25
    xor %2, eax
%endmacro

%macro SSIG0 2
    ; %1 = x, %2 = temp
    mov %2, %1
    ror %2, 7
    mov eax, %1
    ror eax, 18
    xor %2, eax
    shr %2, 3
%endmacro

%macro SSIG1 2
    ; %1 = x, %2 = temp
    mov %2, %1
    ror %2, 17
    mov eax, %1
    ror eax, 19
    xor %2, eax
    shr %2, 10
%endmacro

; ── SHA-256 transform (processes one 64-byte block) ──────────────────────────

sha256_transform:
    ; RCX = pointer to 64-byte block
    ; Updates global H[0..7]
    push rbp
    mov rbp, rsp
    sub rsp, 320        ; space for W[64] + temp vars
    push rbx
    push rsi
    push rdi
    push r12
    push r13
    push r14
    push r15

    mov rsi, rcx        ; rsi = block pointer

    ; Load current hash state
    lea rdi, [rel H]
    mov eax, [rdi + 0*4]
    mov [rbp - 32 + 0*4], eax   ; a
    mov eax, [rdi + 1*4]
    mov [rbp - 32 + 1*4], eax   ; b
    mov eax, [rdi + 2*4]
    mov [rbp - 32 + 2*4], eax   ; c
    mov eax, [rdi + 3*4]
    mov [rbp - 32 + 3*4], eax   ; d
    mov eax, [rdi + 4*4]
    mov [rbp - 32 + 4*4], eax   ; e
    mov eax, [rdi + 5*4]
    mov [rbp - 32 + 5*4], eax   ; f
    mov eax, [rdi + 6*4]
    mov [rbp - 32 + 6*4], eax   ; g
    mov eax, [rdi + 7*4]
    mov [rbp - 32 + 7*4], eax   ; h

    ; Prepare message schedule W[0..63]
    xor eax, eax
.W_PREP:
    cmp eax, 16
    jge .W_DONE
    mov edx, [rsi + rax*4]
    bswap edx
    mov [rel W + rax*4], edx
    inc eax
    jmp .W_PREP

.W_LOOP:
    cmp eax, 64
    jge .W_DONE
    ; W[i] = SSIG1(W[i-2]) + W[i-7] + SSIG0(W[i-15]) + W[i-16]
    mov ecx, eax
    sub ecx, 2
    mov edx, [rel W + rcx*4]
    SSIG1 edx, ecx
    mov ebx, edx

    mov ecx, eax
    sub ecx, 7
    add ebx, [rel W + rcx*4]

    mov ecx, eax
    sub ecx, 15
    mov edx, [rel W + rcx*4]
    SSIG0 edx, ecx
    add ebx, edx

    mov ecx, eax
    sub ecx, 16
    add ebx, [rel W + rcx*4]

    mov [rel W + rax*4], ebx
    inc eax
    jmp .W_LOOP

.W_DONE:
    ; Load working variables
    mov eax, [rbp - 32 + 0*4]  ; a
    mov ebx, [rbp - 32 + 1*4]  ; b
    mov ecx, [rbp - 32 + 2*4]  ; c
    mov edx, [rbp - 32 + 3*4]  ; d
    mov esi, [rbp - 32 + 4*4]  ; e
    mov edi, [rbp - 32 + 5*4]  ; f
    mov r8d, [rbp - 32 + 6*4]  ; g
    mov r9d, [rbp - 32 + 7*4]  ; h

    ; 64 rounds
    xor r10d, r10d
.ROUND:
    cmp r10d, 64
    jge .ROUND_DONE

    ; T1 = h + BSIG1(e) + CH(e,f,g) + K[i] + W[i]
    mov r11d, r9d              ; T1 = h
    BSIG1 esi, r12d
    add r11d, r12d             ; T1 += BSIG1(e)
    CH esi, edi, r8d, r12d
    add r11d, r12d             ; T1 += CH(e,f,g)
    mov r12d, r10d
    and r12d, 63               ; i mod 64
    lea r13, [rel K256]
    add r11d, [r13 + r12*4]   ; T1 += K[i]
    lea r13, [rel W]
    add r11d, [r13 + r12*4]   ; T1 += W[i]

    ; T2 = BSIG0(a) + MAJ(a,b,c)
    BSIG0 eax, r12d
    MAJ eax, ebx, ecx, r13d
    add r12d, r13d             ; T2 = BSIG0(a) + MAJ(a,b,c)

    ; Update state
    mov r9d, r8d               ; h = g
    mov r8d, edi               ; g = f
    mov edi, esi               ; f = e
    add edx, r11d              ; d += T1
    mov esi, edx               ; e = d (no, e = d + T1, which we just did)
    ; Actually: e = d + T1 (already in edx after add)
    mov edx, ecx               ; d = c
    mov ecx, ebx               ; c = b
    mov ebx, eax               ; b = a
    add eax, r12d              ; a = T1 + T2

    inc r10d
    jmp .ROUND

.ROUND_DONE:
    ; Add compressed chunk to hash state
    lea r10, [rel H]
    add [r10 + 0*4], eax
    add [r10 + 1*4], ebx
    add [r10 + 2*4], ecx
    add [r10 + 3*4], edx
    add [r10 + 4*4], esi
    add [r10 + 5*4], edi
    add [r10 + 6*4], r8d
    add [r10 + 7*4], r9d

    pop r15
    pop r14
    pop r13
    pop r12
    pop rdi
    pop rsi
    pop rbx
    leave
    ret

; ── Public API ────────────────────────────────────────────────────────────────

global sha256_hash
sha256_hash:
    ; RCX = data pointer
    ; RDX = length
    ; R8  = output pointer (32 bytes)
    push rbx
    push rsi
    push rdi
    push r12
    push r13
    push r14
    push r15

    mov rsi, rcx        ; rsi = data
    mov r12, rdx        ; r12 = length
    mov r13, r8         ; r13 = output

    ; Initialize hash state
    lea rdi, [rel H]
    lea r14, [rel H_INIT]
    mov eax, [r14 + 0*4]
    mov [rdi + 0*4], eax
    mov eax, [r14 + 1*4]
    mov [rdi + 1*4], eax
    mov eax, [r14 + 2*4]
    mov [rdi + 2*4], eax
    mov eax, [r14 + 3*4]
    mov [rdi + 3*4], eax
    mov eax, [r14 + 4*4]
    mov [rdi + 4*4], eax
    mov eax, [r14 + 5*4]
    mov [rdi + 5*4], eax
    mov eax, [r14 + 6*4]
    mov [rdi + 6*4], eax
    mov eax, [r14 + 7*4]
    mov [rdi + 7*4], eax

    ; Process full 64-byte blocks
    cmp r12, 64
    jb .PAD_BLOCK

.BLOCK_LOOP:
    lea rcx, [rel block]
    ; Copy 64 bytes from data
    xor eax, eax
.COPY:
    cmp eax, 64
    jge .COPY_DONE
    movzx edx, byte [rsi + rax]
    mov [rcx + rax], dl
    inc eax
    jmp .COPY
.COPY_DONE:
    call sha256_transform
    add rsi, 64
    sub r12, 64
    cmp r12, 64
    jae .BLOCK_LOOP

.PAD_BLOCK:
    ; Pad remaining bytes into block
    lea rcx, [rel block]
    xor eax, eax
.CLEAR:
    cmp eax, 64
    jge .CLEAR_DONE
    mov byte [rcx + rax], 0
    inc eax
    jmp .CLEAR
.CLEAR_DONE:

    ; Copy remaining data
    xor eax, eax
.COPY_REMAIN:
    cmp eax, r12d
    jge .COPY_REMAIN_DONE
    movzx edx, byte [rsi + rax]
    mov [rcx + rax], dl
    inc eax
    jmp .COPY_REMAIN
.COPY_REMAIN_DONE:

    ; Append bit '1'
    mov byte [rcx + rax], 0x80

    ; If remaining space < 8 bytes, add extra block
    cmp rax, 56
    jae .EXTRA_BLOCK

    ; Append length in bits (big-endian, only low 64 bits)
    mov rax, r12
    shl rax, 3            ; bits = bytes * 8
    bswap rax
    mov [rcx + 56], rax
    call sha256_transform
    jmp .OUTPUT

.EXTRA_BLOCK:
    call sha256_transform
    lea rcx, [rel block]
    xor eax, eax
.CLEAR2:
    cmp eax, 64
    jge .CLEAR2_DONE
    mov byte [rcx + rax], 0
    inc eax
    jmp .CLEAR2
.CLEAR2_DONE:
    mov rax, r12
    shl rax, 3
    bswap rax
    mov [rcx + 56], rax
    call sha256_transform

.OUTPUT:
    ; Write final hash state to output (big-endian)
    lea rsi, [rel H]
    xor eax, eax
.OUTPUT_LOOP:
    cmp eax, 8
    jge .DONE
    mov edx, [rsi + rax*4]
    bswap edx
    mov [r13 + rax*4], edx
    inc eax
    jmp .OUTPUT_LOOP

.DONE:
    pop r15
    pop r14
    pop r13
    pop r12
    pop rdi
    pop rsi
    pop rbx
    ret
