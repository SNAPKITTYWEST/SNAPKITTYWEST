# SOVEREIGN LLM — ERRANT-GGML Architecture

> **The model runs only when the proof permits the memory to move.**

---

## Overview

A sovereign LLM where every tensor operation is a linear capability, every computation is proven by Prolog, and every artifact is sealed by WORM.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOVEREIGN LLM                                 │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5: INTERFACE                                              │
│  ERRANT syntax + WIT contract                                    │
│  User defines model as linear capabilities                       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: PROOF                                                  │
│  Prolog kernel + ERRANT typing rules                             │
│  Every tensor flow is proven correct                             │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: EXECUTION                                              │
│  WASM runtime + GGML kernels                                     │
│  Kernels load as linear capabilities                             │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: MoE                                                    │
│  Mixture of Experts with linear routing                          │
│  Each expert is a linear capability                              │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: FOUNDATION                                             │
│  ERRANT LFIS + WORM chain                                        │
│  Linear types + append-only audit trail                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Chain

```
User → ERRANT (define model as capabilities)
         ↓
    Prolog (prove tensor flow)
         ↓
    WASM (load kernels)
         ↓
    ERRANT (enforce linear types)
         ↓
    GGML (execute on GPU)
         ↓
    WORM (seal artifact)
```

---

## Tensor as Linear Resource

In ERRANT, a tensor is not a normal variable. It is a **linear resource**:

```errant
-- Allocate tensor (linear resource created)
: lin [Int] ⊸ lin String ⊸ lin Tensor
alloc shape dtype = ...

-- Free tensor (linear resource consumed)
: lin Tensor ⊸ lin ()
free tensor = ...

-- Matrix multiplication (consumes cap + both tensors)
: lin KernelCap ⊸ lin Tensor ⊸ lin Tensor ⊸ lin Tensor
matmul cap a b = ...
```

**Key properties:**
- No duplicate tensors
- No silent reuse
- No unsealed output
- Every operation consumes its inputs

---

## Kernel as Linear Capability

A GPU kernel is not a function. It is a **linear capability**:

```errant
-- Kernel capability
: lin KernelCap
matmul_cap = KernelCap
    { name = "matmul_fp16"
    , computeCap = "sm_80"
    , memoryReq = 1024 * 1024 * 1024  -- 1GB
    , kernelSeal = "abc123..."
    }

-- Use kernel (consumes capability)
: lin KernelCap ⊸ lin Tensor ⊸ lin Tensor ⊸ lin Tensor
matmul cap a b = ...
```

**Key properties:**
- Kernel is loaded once, used once
- Capability tracks memory requirements
- WORM seal proves kernel integrity

---

## MoE with Linear Routing

Mixture of Experts where each expert is a linear capability:

```errant
-- Expert capability
: lin Expert
reasoning_expert = Expert
    { id = 0
    , name = "reasoning"
    , weightsSeal = "abc123..."
    , activations = 0
    }

-- Router capability
: lin Router
top_k_router = Router
    { name = "top-k"
    , numExperts = 8
    , topK = 2
    }

-- Route input to experts (consumes router + input)
: lin Router ⊸ lin Tensor ⊸ lin [Expert] ⊸ lin [Expert]
route router input experts = ...

-- Execute expert (consumes expert + input + cap)
: lin Expert ⊸ lin Tensor ⊸ lin KernelCap ⊸ lin Tensor
executeExpert expert input cap = ...

-- Combine outputs (consumes all expert outputs)
: lin [Tensor] ⊸ lin Tensor ⊸ lin Tensor
combine outputs weights = ...
```

**Key properties:**
- Each expert is used exactly once
- Routing is proven by Prolog
- Expert weights are WORM-sealed

---

## Prolog Proof Rules

Every tensor operation has a Prolog typing rule:

```prolog
% Matrix multiplication: [M, K] x [K, N] -> [M, N]
type_op(matmul,
    [item(lin, cap(gpu_kernel)),
     item(lin, tensor([M, K])),
     item(lin, tensor([K, N])) | Stack],
    [item(lin, tensor([M, N])) | Stack]) :-
    compatible_matmul(tensor([M, K]), tensor([K, N]), tensor([M, N])).
```

**The proof:**
1. User defines tensor shapes
2. Prolog checks dimension compatibility
3. ERRANT enforces linear consumption
4. WASM executes the kernel
5. WORM seals the artifact

---

## WORM Sealing

Every operation produces a WORM artifact:

```errant
-- Seal operation
: lin Tensor ⊸ lin Verdict
sealTensor input = do
    hash <- computeSeal input
    steps <- computeSteps input
    artifact <- computeArtifact input
    timestamp <- getCurrentTimestamp
    signature <- computeSignature input
    return $ Evidence Seal
        { hash = hash
        , steps = steps
        , artifact = artifact
        , timestamp = timestamp
        , signature = signature
        }
```

**The seal contains:**
- SHA-256 hash of the operation
- Number of compute steps
- WORM artifact path
- ISO 8601 timestamp
- Operation signature

---

## Model Definition

A sovereign model is defined as linear capabilities:

```errant
-- Load model (consumes WASM module, produces model capability)
: lin String ⊸ lin String ⊸ lin Model
loadModel wasmPath weightsPath = ...

-- Forward pass (consumes model + input, produces output)
: lin Model ⊸ lin Tensor ⊸ lin KernelCap ⊸ lin (Tensor, Verdict)
forward model input cap = ...

-- Generate text (consumes model + prompt, produces completion)
: lin Model ⊸ lin Tensor ⊸ lin KernelCap ⊸ lin Int ⊸ lin (Tensor, Verdict)
generate model prompt cap maxTokens = ...

-- Seal model (produces WORM artifact)
: lin Model ⊸ lin Verdict
sealModel model = ...
```

---

## Complete Example

```errant
-- 1. Load model (consumes WASM + weights)
model <- loadModel "model.wasm" "weights.gguf"

-- 2. Allocate input tensor
input <- alloc [1, 512] "f32"

-- 3. Load kernel capability
cap <- loadKernel "matmul_fp16"

-- 4. Forward pass (consumes model + input + cap)
(output, verdict) <- forward model input cap

-- 5. Seal output (produces WORM artifact)
result <- sealTensor output

-- 6. Verify seal
valid <- verifySeal output expectedSeal
```

**The flow:**
1. WASM loads the kernel
2. ERRANT owns the capability
3. Prolog proves the tensor flow
4. WORM seals the artifact

---

## BOB Integration

The sovereign LLM integrates with BOB's state machine:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOB STATE MACHINE                              │
├─────────────────────────────────────────────────────────────────┤
│  STATE 1: LOAD                                                  │
│  Load WASM module + weights                                      │
│  ERRANT validates linear resources                               │
├─────────────────────────────────────────────────────────────────┤
│  STATE 2: PROVE                                                 │
│  Prolog proves tensor flow                                       │
│  ERRANT enforces linear consumption                              │
├─────────────────────────────────────────────────────────────────┤
│  STATE 3: EXECUTE                                               │
│  WASM executes GGML kernels                                      │
│  Linear capabilities consumed                                    │
├─────────────────────────────────────────────────────────────────┤
│  STATE 4: SEAL                                                  │
│  WORM seals the artifact                                         │
│  Chain integrity verified                                        │
├─────────────────────────────────────────────────────────────────┤
│  STATE 5: CERTIFY                                               │
│  METATRON certifies the operation                                │
│  Evidence is produced                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tagline

> **The model runs only when the proof permits the memory to move.**

---

## Files

| File | Purpose |
|------|---------|
| `tensor-ops.wit` | WIT contract for tensor operations |
| `tensor-flow.pl` | Prolog typing rules for tensor flow |
| `errant-ggml.hs` | ERRANT integration for tensor kernels |
| `SOVEREIGN-LLM.md` | This architecture document |

---

## Next Steps

1. Implement WASM runtime for tensor operations
2. Create GGML kernel bindings
3. Build MoE routing with linear capabilities
4. Integrate with BOB state machine
5. Deploy to sovereign infrastructure

---

*Ahmad Ali Parr · SNAPKITTYWEST · ERRANT-GENESIS-001*
