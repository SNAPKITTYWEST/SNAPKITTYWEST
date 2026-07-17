% ════════════════════════════════════════════════════════════════
% ERRANT-GGML PROLOG KERNEL — Tensor Flow Typing Rules
%
% WASM loads the kernel.
% ERRANT owns the capability.
% Prolog proves the tensor flow.
% WORM seals the artifact.
%
% The model runs only when the proof permits the memory to move.
%
% Ahmad Ali Parr · SNAPKITTYWEST · ERRANT-GENESIS-001
% ════════════════════════════════════════════════════════════════

% ════════════════════════════════════════════════════════════════
% TENSOR TYPES — Linear resources
% ════════════════════════════════════════════════════════════════

% Tensor: item(lin, tensor(Shape, Dtype, Seal))
% Shape: list of dimensions (e.g., [3, 512, 4096])
% Dtype: data type (e.g., f32, f16, fp8, q4_0)
% Seal: WORM hash (computed on allocation)

tensor_shape(tensor(Shape, _, _), Shape).
tensor_dtype(tensor(_, Dtype, _), Dtype).
tensor_seal(tensor(_, _, Seal), Seal).

% ════════════════════════════════════════════════════════════════
% KERNEL CAPABILITIES — Linear capabilities for GPU operations
% ════════════════════════════════════════════════════════════════

% Kernel capability: item(lin, cap(kernel(Name, ComputeCap, MemoryReq, KernelSeal)))
% Must be consumed exactly once per operation

kernel_name(cap(kernel(Name, _, _, _)), Name).
kernel_compute_cap(cap(kernel(_, ComputeCap, _, _)), ComputeCap).
kernel_memory_req(cap(kernel(_, _, MemoryReq, _)), MemoryReq).
kernel_seal(cap(kernel(_, _, _, KernelSeal)), KernelSeal).

% ════════════════════════════════════════════════════════════════
% DIMENSION COMPATIBILITY — Shape checking rules
% ════════════════════════════════════════════════════════════════

% Matrix multiplication: [M, K] x [K, N] -> [M, N]
compatible_matmul(tensor([M, K], _, _), tensor([K, N], _, _), tensor([M, N], f32, _)).

% Batched matrix multiplication: [B, M, K] x [B, K, N] -> [B, M, N]
compatible_batch_matmul(tensor([B, M, K], _, _), tensor([B, K, N], _, _), tensor([B, M, N], f32, _)).

% Flash attention: [B, H, S, D] x [B, H, S, D] x [B, H, S, D] -> [B, H, S, D]
compatible_flash_attn(
    tensor([B, H, S, D], _, _),
    tensor([B, H, S, D], _, _),
    tensor([B, H, S, D], _, _),
    tensor([B, H, S, D], f32, _)
).

% Quantization: any shape -> same shape, different dtype
compatible_quantize(tensor(Shape, _, _), tensor(Shape, fp8, _)).
compatible_quantize_int4(tensor(Shape, _, _), tensor(Shape, q4_0, _)).

% RMS normalization: [B, S, D] x [D] -> [B, S, D]
compatible_rms_norm(tensor([B, S, D], _, _), tensor([D], _, _), tensor([B, S, D], f32, _)).

% RoPE: [B, S, D] x [D] -> [B, S, D]
compatible_rope(tensor([B, S, D], _, _), tensor([D], _, _), tensor([B, S, D], f32, _)).

% SiLU: [B, S, D] -> [B, S, D]
compatible_silu(tensor(Shape, _, _), tensor(Shape, f32, _)).

% Softmax: [B, S, D] -> [B, S, D]
compatible_softmax(tensor(Shape, _, _), tensor(Shape, f32, _)).

% ════════════════════════════════════════════════════════════════
% ERRANT TYPE RULES — Linear tensor flow
% ════════════════════════════════════════════════════════════════

% ALLOC — Create tensor (linear resource created)
type_op(alloc, Stack, [item(lin, tensor(Shape, Dtype, seal(Hash))) | Stack]) :-
    valid_shape(Shape),
    valid_dtype(Dtype),
    compute_seal(Shape, Dtype, Hash).

% FREE — Consume tensor (linear resource consumed)
type_op(free, [item(lin, tensor(_, _, _)) | Stack], Stack).

% MATMUL — Consume cap + both tensors, produce result
type_op(matmul,
    [item(lin, cap(gpu_kernel)),
     item(lin, tensor(A)),
     item(lin, tensor(B)) | Stack],
    [item(lin, tensor(C)) | Stack]) :-
    compatible_matmul(tensor(A, _, _), tensor(B, _, _), tensor(C, _, _)).

% BATCH MATMUL — Consume cap + both tensors, produce result
type_op(batch_matmul,
    [item(lin, cap(gpu_kernel)),
     item(lin, tensor(A)),
     item(lin, tensor(B)) | Stack],
    [item(lin, tensor(C)) | Stack]) :-
    compatible_batch_matmul(tensor(A, _, _), tensor(B, _, _), tensor(C, _, _)).

% FLASH ATTN — Consume cap + q, k, v tensors, produce result
type_op(flash_attn,
    [item(lin, cap(gpu_kernel)),
     item(lin, tensor(Q)),
     item(lin, tensor(K)),
     item(lin, tensor(V)) | Stack],
    [item(lin, tensor(O)) | Stack]) :-
    compatible_flash_attn(
        tensor(Q, _, _),
        tensor(K, _, _),
        tensor(V, _, _),
        tensor(O, _, _)
    ).

% QUANTIZE FP8 — Consume cap + input, produce quantized
type_op(quantize_fp8,
    [item(lin, cap(gpu_kernel)),
     item(lin, tensor(Input)) | Stack],
    [item(lin, tensor(Output)) | Stack]) :-
    compatible_quantize(tensor(Input, _, _), tensor(Output, _, _)).

% QUANTIZE INT4 — Consume cap + input, produce quantized
type_op(quantize_int4,
    [item(lin, cap(gpu_kernel)),
     item(lin, tensor(Input)) | Stack],
    [item(lin, tensor(Output)) | Stack]) :-
    compatible_quantize_int4(tensor(Input, _, _), tensor(Output, _, _)).

% RMS NORM — Consume cap + input + weight, produce normalized
type_op(rms_norm,
    [item(lin, cap(gpu_kernel)),
     item(lin, tensor(Input)),
     item(lin, tensor(Weight)) | Stack],
    [item(lin, tensor(Output)) | Stack]) :-
    compatible_rms_norm(
        tensor(Input, _, _),
        tensor(Weight, _, _),
        tensor(Output, _, _)
    ).

% ROPE — Consume cap + input + freqs, produce rotated
type_op(rope,
    [item(lin, cap(gpu_kernel)),
     item(lin, tensor(Input)),
     item(lin, tensor(Freqs)) | Stack],
    [item(lin, tensor(Output)) | Stack]) :-
    compatible_rope(
        tensor(Input, _, _),
        tensor(Freqs, _, _),
        tensor(Output, _, _)
    ).

% SiLU — Consume cap + input, produce activated
type_op(silu,
    [item(lin, cap(gpu_kernel)),
     item(lin, tensor(Input)) | Stack],
    [item(lin, tensor(Output)) | Stack]) :-
    compatible_silu(tensor(Input, _, _), tensor(Output, _, _)).

% SOFTMAX — Consume cap + input, produce normalized
type_op(softmax,
    [item(lin, cap(gpu_kernel)),
     item(lin, tensor(Input)) | Stack],
    [item(lin, tensor(Output)) | Stack]) :-
    compatible_softmax(tensor(Input, _, _), tensor(Output, _, _)).

% SEAL TENSOR — Consume tensor, produce WORM artifact
type_op(seal_tensor,
    [item(lin, tensor(Input)) | Stack],
    [item(lin, verdict(evidence(seal(Hash, Steps, Artifact, Timestamp, Signature)))) | Stack]) :-
    compute_seal(Input, Hash),
    compute_steps(Input, Steps),
    compute_artifact(Input, Artifact),
    current_timestamp(Timestamp),
    compute_signature(Input, Signature).

% VERIFY SEAL — Consume tensor + expected seal, produce bool
type_op(verify_seal,
    [item(lin, tensor(Input)),
     item(lin, seal(Expected)) | Stack],
    [item(lin, bool(Valid)) | Stack]) :-
    compute_seal(Input, Actual),
    Valid = (Actual == Expected).

% ════════════════════════════════════════════════════════════════
% MoE TYPE RULES — Mixture of Experts with linear capabilities
% ════════════════════════════════════════════════════════════════

% ROUTE — Consume router + input, produce expert list
type_op(route,
    [item(lin, router(Name, NumExperts, TopK)),
     item(lin, tensor(Input)) | Stack],
    [item(lin, list(item(lin, expert(_, _, _, _)))) | Stack]) :-
    valid_router(Name, NumExperts, TopK),
    select_experts(Input, NumExperts, TopK, Selected),
    length(Selected, TopK).

% EXECUTE EXPERT — Consume expert + input + cap, produce output
type_op(execute_expert,
    [item(lin, expert(Id, Name, WeightsSeal, Activations)),
     item(lin, tensor(Input)),
     item(lin, cap(gpu_kernel)) | Stack],
    [item(lin, tensor(Output)) | Stack]) :-
    valid_expert(Id, Name, WeightsSeal, Activations),
    expert_output_shape(Input, Output).

% COMbine — Consume all expert outputs + weights, produce combined
type_op(combine,
    [item(lin, list(Outputs)),
     item(lin, tensor(Weights)) | Stack],
    [item(lin, tensor(Combined)) | Stack]) :-
    combine_outputs(Outputs, Weights, Combined).

% SEAL MOE — Consume router + input + outputs, produce WORM artifact
type_op(seal_moe,
    [item(lin, router(Name, _, _)),
     item(lin, tensor(Input)),
     item(lin, list(Outputs)) | Stack],
    [item(lin, verdict(evidence(seal(Hash, Steps, Artifact, Timestamp, Signature)))) | Stack]) :-
    compute_moe_seal(Name, Input, Outputs, Hash),
    compute_moe_steps(Name, Input, Outputs, Steps),
    compute_moe_artifact(Name, Input, Outputs, Artifact),
    current_timestamp(Timestamp),
    compute_moe_signature(Name, Input, Outputs, Signature).

% ════════════════════════════════════════════════════════════════
% SOVEREIGN MODEL TYPE RULES — Complete LLM with ERRANT enforcement
% ════════════════════════════════════════════════════════════════

% LOAD MODEL — Consume WASM module, produce model capability
type_op(load_model,
    [item(lin, wasm(WasmPath)),
     item(lin, file(WeightsPath)) | Stack],
    [item(lin, model(Name, Version, NumLayers, HiddenDim, NumExperts, WeightsSeal)) | Stack]) :-
    valid_wasm(WasmPath),
    valid_weights(WeightsPath),
    model_metadata(WeightsPath, Name, Version, NumLayers, HiddenDim, NumExperts),
    compute_weights_seal(WeightsPath, WeightsSeal).

% FORWARD — Consume model + input + cap, produce output + verdict
type_op(forward,
    [item(lin, model(Name, Version, NumLayers, HiddenDim, NumExperts, WeightsSeal)),
     item(lin, tensor(Input)),
     item(lin, cap(gpu_kernel)) | Stack],
    [item(lin, tensor(Output)),
     item(lin, verdict(evidence(seal(Hash, Steps, Artifact, Timestamp, Signature)))) | Stack]) :-
    forward_shape(Input, NumLayers, HiddenDim, Output),
    compute_forward_seal(Name, Input, Output, Hash),
    compute_forward_steps(Name, Input, NumLayers, Steps),
    compute_forward_artifact(Name, Input, Output, Artifact),
    current_timestamp(Timestamp),
    compute_forward_signature(Name, Input, Output, Signature).

% GENERATE — Consume model + prompt + cap + max_tokens, produce completion + verdict
type_op(generate,
    [item(lin, model(Name, Version, NumLayers, HiddenDim, NumExperts, WeightsSeal)),
     item(lin, tensor(Prompt)),
     item(lin, cap(gpu_kernel)),
     item(lin, int(MaxTokens)) | Stack],
    [item(lin, tensor(Completion)),
     item(lin, verdict(evidence(seal(Hash, Steps, Artifact, Timestamp, Signature)))) | Stack]) :-
    generate_shape(Prompt, MaxTokens, NumLayers, HiddenDim, Completion),
    compute_generate_seal(Name, Prompt, Completion, Hash),
    compute_generate_steps(Name, Prompt, MaxTokens, NumLayers, Steps),
    compute_generate_artifact(Name, Prompt, Completion, Artifact),
    current_timestamp(Timestamp),
    compute_generate_signature(Name, Prompt, Completion, Signature).

% SEAL MODEL — Consume model, produce WORM artifact
type_op(seal_model,
    [item(lin, model(Name, Version, NumLayers, HiddenDim, NumExperts, WeightsSeal)) | Stack],
    [item(lin, verdict(evidence(seal(Hash, Steps, Artifact, Timestamp, Signature)))) | Stack]) :-
    compute_model_seal(Name, Version, NumLayers, HiddenDim, NumExperts, WeightsSeal, Hash),
    compute_model_steps(Name, NumLayers, Steps),
    compute_model_artifact(Name, Version, NumLayers, HiddenDim, NumExperts, Artifact),
    current_timestamp(Timestamp),
    compute_model_signature(Name, Version, NumLayers, HiddenDim, NumExperts, WeightsSeal, Signature).

% VERIFY MODEL — Consume model + expected seal, produce bool
type_op(verify_model,
    [item(lin, model(Name, Version, NumLayers, HiddenDim, NumExperts, WeightsSeal)),
     item(lin, seal(Expected)) | Stack],
    [item(lin, bool(Valid)) | Stack]) :-
    compute_model_seal(Name, Version, NumLayers, HiddenDim, NumExperts, WeightsSeal, Actual),
    Valid = (Actual == Expected).

% ════════════════════════════════════════════════════════════════
% WORM CHAIN TYPE RULES — Append-only audit trail
% ════════════════════════════════════════════════════════════════

% APPEND — Consume label + payload + prev_seal, produce new seal
type_op(append,
    [item(lin, string(Label)),
     item(lin, string(Payload)),
     item(lin, string(PrevSeal)) | Stack],
    [item(lin, seal(Hash, Steps, Artifact, Timestamp, Signature)) | Stack]) :-
    compute_chain_seal(Label, Payload, PrevSeal, Hash),
    Steps = 1,
    Artifact = worm_chain,
    current_timestamp(Timestamp),
    compute_chain_signature(Label, Payload, PrevSeal, Signature).

% VERIFY CHAIN — Produce bool
type_op(verify_chain, Stack, [item(lin, bool(Valid)) | Stack]) :-
    verify_worm_chain(Valid).

% CHAIN LENGTH — Produce int
type_op(chain_length, Stack, [item(lin, int(Length)) | Stack]) :-
    worm_chain_length(Length).

% LAST SEAL — Produce string
type_op(last_seal, Stack, [item(lin, string(Seal)) | Stack]) :-
    worm_last_seal(Seal).

% ════════════════════════════════════════════════════════════════
% PROGRAM CHECKER — Verify linear resource flow
% ════════════════════════════════════════════════════════════════

check_program([], Stack, Stack).

check_program([Op | Ops], StackIn, StackOut) :-
    type_op(Op, StackIn, StackMid),
    check_program(Ops, StackMid, StackOut).

% ════════════════════════════════════════════════════════════════
% GENESIS INVARIANT — Program must end with sealed artifact
% ════════════════════════════════════════════════════════════════

valid_llm_program(Program) :-
    check_program(Program, [], [item(lin, verdict(evidence(_)))]).

% ════════════════════════════════════════════════════════════════
% ERRANT GENESIS SEAL
% ════════════════════════════════════════════════════════════════

genesis_seal("ERRANT_GENESIS_001").

genesis_phrase([
    "Forth is the metal.",
    "Prolog is the law.",
    "Linear types are the vow.",
    "WORM is the memory.",
    "The model runs only when the proof permits the memory to move.",
    "Ω"
]).
