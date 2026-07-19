#!/usr/bin/env node
/**
 * ERRANT-GGML TEST — Verify tensor operations actually work
 * 
 * WASM loads the kernel.
 * ERRANT owns the capability.
 * Prolog proves the tensor flow.
 * WORM seals the artifact.
 */

import { 
    Tensor, 
    KernelCap, 
    Seal, 
    Verdict, 
    Expert, 
    Router, 
    Model, 
    ErrantGGML 
} from './runtime.mjs';

import { 
    ErrantWormRuntime 
} from './worm-seal.mjs';

import { createHash } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ════════════════════════════════════════════════════════════════

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(color, msg) {
    process.stdout.write(`${color}${msg}${RESET}\n`);
}

function assert(condition, msg) {
    if (!condition) {
        log(RED, `  ✗ FAIL: ${msg}`);
        process.exit(1);
    }
    log(GREEN, `  ✓ PASS: ${msg}`);
}

// ════════════════════════════════════════════════════════════════
// TEST 1: TENSOR LINEAR CONSUMPTION
// ════════════════════════════════════════════════════════════════

function testTensorLinearConsumption() {
    log(BLUE, '\n═══ TEST 1: TENSOR LINEAR CONSUMPTION ═══');
    
    const runtime = new ErrantGGML();
    
    // Allocate tensor
    const tensor = runtime.alloc([3, 512, 4096], 'f32');
    assert(tensor.shape.length === 3, 'Tensor has 3 dimensions');
    assert(tensor.dtype === 'f32', 'Tensor is f32');
    assert(tensor.size === 3 * 512 * 4096, 'Tensor size is correct');
    assert(tensor.seal.length === 64, 'Tensor has SHA-256 seal');
    
    // First consumption succeeds
    tensor.consume();
    assert(tensor.consumed === true, 'Tensor consumed');
    
    // Second consumption fails
    let errorThrown = false;
    try {
        tensor.consume();
    } catch (e) {
        errorThrown = true;
        assert(e.message.includes('already consumed'), 'Error mentions already consumed');
    }
    assert(errorThrown, 'Second consumption throws error');
    
    log(GREEN, '  ✓ Linear consumption works');
}

// ════════════════════════════════════════════════════════════════
// TEST 2: KERNEL CAPABILITY LINEAR CONSUMPTION
// ════════════════════════════════════════════════════════════════

function testKernelCapLinearConsumption() {
    log(BLUE, '\n═══ TEST 2: KERNEL CAPABILITY LINEAR CONSUMPTION ═══');
    
    const cap = new KernelCap(
        'matmul_fp16',
        'sm_80',
        1024 * 1024 * 1024,
        createHash('sha256').update('kernel_binary').digest('hex')
    );
    
    assert(cap.name === 'matmul_fp16', 'Cap name is matmul_fp16');
    assert(cap.computeCap === 'sm_80', 'Cap compute is sm_80');
    assert(cap.memoryReq === 1024 * 1024 * 1024, 'Cap memory is 1GB');
    assert(cap.kernelSeal.length === 64, 'Cap has SHA-256 seal');
    
    // First consumption succeeds
    cap.consume();
    assert(cap.consumed === true, 'Cap consumed');
    
    // Second consumption fails
    let errorThrown = false;
    try {
        cap.consume();
    } catch (e) {
        errorThrown = true;
    }
    assert(errorThrown, 'Second consumption throws error');
    
    log(GREEN, '  ✓ Kernel capability linear consumption works');
}

// ════════════════════════════════════════════════════════════════
// TEST 3: MATRIX MULTIPLICATION
// ════════════════════════════════════════════════════════════════

function testMatmul() {
    log(BLUE, '\n═══ TEST 3: MATRIX MULTIPLICATION ═══');
    
    const runtime = new ErrantGGML();
    
    // Create cap and tensors
    const cap = new KernelCap('matmul_fp16', 'sm_80', 1024 * 1024 * 1024, 'seal1');
    const a = runtime.alloc([3, 512], 'f32');
    const b = runtime.alloc([512, 1024], 'f32');
    
    // Execute matmul
    const result = runtime.matmul(cap, a, b);
    
    assert(result.type === 'result', 'Matmul returned result');
    assert(result.value.shape[0] === 3, 'Output dim 0 is 3');
    assert(result.value.shape[1] === 1024, 'Output dim 1 is 1024');
    assert(result.seal !== undefined, 'Result has WORM seal');
    
    // Verify cap was consumed
    assert(cap.consumed === true, 'Cap consumed after matmul');
    
    // Verify tensors were consumed
    assert(a.consumed === true, 'Tensor a consumed after matmul');
    assert(b.consumed === true, 'Tensor b consumed after matmul');
    
    log(GREEN, '  ✓ Matrix multiplication works');
}

// ════════════════════════════════════════════════════════════════
// TEST 4: FLASH ATTENTION
// ════════════════════════════════════════════════════════════════

function testFlashAttn() {
    log(BLUE, '\n═══ TEST 4: FLASH ATTENTION ═══');
    
    const runtime = new ErrantGGML();
    
    // Create cap and tensors
    const cap = new KernelCap('flash_attn_v2', 'sm_89', 2 * 1024 * 1024 * 1024, 'seal2');
    const q = runtime.alloc([1, 8, 128, 128], 'f32');
    const k = runtime.alloc([1, 8, 128, 128], 'f32');
    const v = runtime.alloc([1, 8, 128, 128], 'f32');
    
    // Execute flash attention
    const result = runtime.flashAttn(cap, q, k, v);
    
    assert(result.type === 'result', 'Flash attn returned result');
    assert(result.value.shape[0] === 1, 'Output batch is 1');
    assert(result.value.shape[1] === 8, 'Output heads is 8');
    assert(result.value.shape[2] === 128, 'Output seq is 128');
    assert(result.value.shape[3] === 128, 'Output dim is 128');
    
    // Verify all consumed
    assert(cap.consumed === true, 'Cap consumed');
    assert(q.consumed === true, 'Q consumed');
    assert(k.consumed === true, 'K consumed');
    assert(v.consumed === true, 'V consumed');
    
    log(GREEN, '  ✓ Flash attention works');
}

// ════════════════════════════════════════════════════════════════
// TEST 5: QUANTIZATION
// ════════════════════════════════════════════════════════════════

function testQuantize() {
    log(BLUE, '\n═══ TEST 5: QUANTIZATION ═══');
    
    const runtime = new ErrantGGML();
    
    // Create cap and tensor
    const cap = new KernelCap('quantize_fp8', 'sm_80', 512 * 1024 * 1024, 'seal3');
    const input = runtime.alloc([1, 4096], 'f32');
    
    // Execute quantize
    const result = runtime.quantizeFp8(cap, input);
    
    assert(result.type === 'result', 'Quantize returned result');
    assert(result.value.dtype === 'fp8', 'Output is fp8');
    assert(result.value.shape[0] === 1, 'Output dim 0 preserved');
    assert(result.value.shape[1] === 4096, 'Output dim 1 preserved');
    
    // Verify consumed
    assert(cap.consumed === true, 'Cap consumed');
    assert(input.consumed === true, 'Input consumed');
    
    log(GREEN, '  ✓ Quantization works');
}

// ════════════════════════════════════════════════════════════════
// TEST 6: RMS NORMALIZATION
// ════════════════════════════════════════════════════════════════

function testRmsNorm() {
    log(BLUE, '\n═══ TEST 6: RMS NORMALIZATION ═══');
    
    const runtime = new ErrantGGML();
    
    // Create cap, input, weight
    const cap = new KernelCap('rms_norm', 'sm_80', 256 * 1024 * 1024, 'seal4');
    const input = runtime.alloc([1, 128, 4096], 'f32');
    const weight = runtime.alloc([4096], 'f32');
    
    // Execute rms norm
    const result = runtime.rmsNorm(cap, input, weight);
    
    assert(result.type === 'result', 'RMS norm returned result');
    assert(result.value.shape[0] === 1, 'Output dim 0 preserved');
    assert(result.value.shape[1] === 128, 'Output dim 1 preserved');
    assert(result.value.shape[2] === 4096, 'Output dim 2 preserved');
    
    // Verify consumed
    assert(cap.consumed === true, 'Cap consumed');
    assert(input.consumed === true, 'Input consumed');
    assert(weight.consumed === true, 'Weight consumed');
    
    log(GREEN, '  ✓ RMS normalization works');
}

// ════════════════════════════════════════════════════════════════
// TEST 7: WORM SEALING
// ════════════════════════════════════════════════════════════════

function testWormSealing() {
    log(BLUE, '\n═══ TEST 7: WORM SEALING ═══');
    
    const runtime = new ErrantGGML();
    
    // Create tensor
    const tensor = runtime.alloc([1, 4096], 'f32');
    
    // Seal tensor
    const seal = runtime.sealTensor(tensor);
    
    assert(seal.hash.length === 64, 'Seal has SHA-256 hash');
    assert(seal.steps === tensor.size, 'Seal steps equals tensor size');
    assert(seal.artifact.startsWith('tensor_'), 'Artifact starts with tensor_');
    assert(seal.timestamp.length > 0, 'Seal has timestamp');
    assert(seal.signature.length === 64, 'Seal has signature');
    
    // Verify seal
    const valid = runtime.verifySeal(tensor, seal);
    assert(valid === true, 'Seal verifies');
    
    log(GREEN, '  ✓ WORM sealing works');
}

// ════════════════════════════════════════════════════════════════
// TEST 8: MoE ROUTING
// ════════════════════════════════════════════════════════════════

function testMoERouting() {
    log(BLUE, '\n═══ TEST 8: MoE ROUTING ═══');
    
    const runtime = new ErrantGGML();
    
    // Create router, experts, input
    const router = new Router('top-k', 4, 2);
    const experts = [
        new Expert(0, 'reasoning', 'seal0', 100),
        new Expert(1, 'code', 'seal1', 200),
        new Expert(2, 'math', 'seal2', 300),
        new Expert(3, 'language', 'seal3', 400)
    ];
    const input = runtime.alloc([1, 512], 'f32');
    
    // Route
    const result = runtime.route(router, input, experts);
    
    assert(result.type === 'result', 'Route returned result');
    assert(result.value.length === 2, 'Selected 2 experts');
    assert(result.value[0].name === 'reasoning', 'First expert is reasoning');
    assert(result.value[1].name === 'code', 'Second expert is code');
    
    // Verify consumed
    assert(router.consumed === true, 'Router consumed');
    assert(input.consumed === true, 'Input consumed');
    
    log(GREEN, '  ✓ MoE routing works');
}

// ════════════════════════════════════════════════════════════════
// TEST 9: WORM CHAIN
// ════════════════════════════════════════════════════════════════

function testWormChain() {
    log(BLUE, '\n═══ TEST 9: WORM CHAIN ═══');
    
    const chainPath = join(__dirname, 'test-worm-chain.json');
    const wormRuntime = new ErrantWormRuntime(chainPath);
    
    // Append events
    const event1 = wormRuntime.wormChain.append('EVENT_1', 'payload1');
    const event2 = wormRuntime.wormChain.append('EVENT_2', 'payload2');
    const event3 = wormRuntime.wormChain.append('EVENT_3', 'payload3');
    
    assert(wormRuntime.chainLength() === 3, 'Chain has 3 events');
    assert(event1.seal.length === 64, 'Seal 1 has hash');
    assert(event2.seal.length === 64, 'Seal 2 has hash');
    assert(event3.seal.length === 64, 'Seal 3 has hash');
    
    // Verify chain
    const verification = wormRuntime.verifyChain();
    assert(verification.valid === true, 'Chain verifies');
    
    // Get last seal
    const last = wormRuntime.lastSeal();
    assert(last === event3.seal, 'Last seal matches');
    
    log(GREEN, '  ✓ WORM chain works');
}

// ════════════════════════════════════════════════════════════════
// TEST 10: COMPLETE FLOW
// ════════════════════════════════════════════════════════════════

function testCompleteFlow() {
    log(BLUE, '\n═══ TEST 10: COMPLETE FLOW ═══');
    
    const runtime = new ErrantGGML();
    const chainPath = join(__dirname, 'test-worm-chain.json');
    const wormRuntime = new ErrantWormRuntime(chainPath);
    
    // 1. Load model
    const model = new Model(
        'sovereign-llm',
        '0.1.0',
        12,
        4096,
        8,
        createHash('sha256').update('weights').digest('hex')
    );
    
    // 2. Allocate input
    const input = runtime.alloc([1, 512, 4096], 'f32');
    
    // 3. Load kernel
    const cap = new KernelCap('forward', 'sm_89', 4 * 1024 * 1024 * 1024, 'seal_forward');
    
    // 4. Forward pass
    const result = runtime.forward(model, input, cap);
    
    assert(result.type === 'result', 'Forward returned result');
    assert(result.value.output.shape[0] === 1, 'Output batch is 1');
    assert(result.value.output.shape[1] === 4096, 'Output dim is hiddenDim');
    assert(result.value.verdict !== undefined, 'Verdict exists');
    
    // 5. Seal model
    const modelSeal = runtime.sealModel(model);
    assert(modelSeal.value.hash.length === 64, 'Model seal has hash');
    
    // 6. Append to WORM chain
    wormRuntime.wormChain.append('MODEL_LOADED', model.name);
    wormRuntime.wormChain.append('FORWARD_COMPLETE', 'success');
    
    assert(wormRuntime.chainLength() >= 2, 'Chain has events');
    const verification = wormRuntime.verifyChain();
    assert(verification.valid === true, 'Chain verifies');
    
    log(GREEN, '  ✓ Complete flow works');
    log(GREEN, '\n═══════════════════════════════════════════════════════════');
    log(GREEN, '  ALL TESTS PASSED — ERRANT-GGML IS WORKING');
    log(GREEN, '═══════════════════════════════════════════════════════════\n');
}

// ════════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ════════════════════════════════════════════════════════════════

function main() {
    log(BOLD, '\n═══════════════════════════════════════════════════════════');
    log(BOLD, '  ERRANT-GGML TEST SUITE');
    log(BOLD, '  The model runs only when the proof permits the memory to move.');
    log(BOLD, '═══════════════════════════════════════════════════════════\n');
    
    testTensorLinearConsumption();
    testKernelCapLinearConsumption();
    testMatmul();
    testFlashAttn();
    testQuantize();
    testRmsNorm();
    testWormSealing();
    testMoERouting();
    testWormChain();
    testCompleteFlow();
}

main();
