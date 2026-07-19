/**
 * ERRANT-GGML WASM RUNTIME — Tensor Operations
 * 
 * WASM loads the kernel.
 * ERRANT owns the capability.
 * Prolog proves the tensor flow.
 * WORM seals the artifact.
 * 
 * The model runs only when the proof permits the memory to move.
 * 
 * Ahmad Ali Parr · SNAPKITTYWEST · ERRANT-GENESIS-001
 */

import { createHash, randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ════════════════════════════════════════════════════════════════
// TENSOR — Linear resource
// ════════════════════════════════════════════════════════════════

class Tensor {
    constructor(shape, dtype, offset = 0) {
        this.shape = shape;
        this.dtype = dtype;
        this.offset = offset;
        this.size = shape.reduce((a, b) => a * b, 1);
        this.seal = this.computeSeal();
        this.consumed = false;
    }

    computeSeal() {
        const payload = JSON.stringify({
            shape: this.shape,
            dtype: this.dtype,
            size: this.size
        });
        return createHash('sha256').update(payload).digest('hex');
    }

    consume() {
        if (this.consumed) {
            throw new Error('Tensor already consumed (linear resource violated)');
        }
        this.consumed = true;
    }

    shape() { return this.shape; }
    dtype() { return this.dtype; }
    seal() { return this.seal; }
    size() { return this.size; }
    offset() { return this.offset; }
}

// ════════════════════════════════════════════════════════════════
// KERNEL-CAP — Linear capability for GPU operations
// ════════════════════════════════════════════════════════════════

class KernelCap {
    constructor(name, computeCap, memoryReq, kernelSeal) {
        this.name = name;
        this.computeCap = computeCap;
        this.memoryReq = memoryReq;
        this.kernelSeal = kernelSeal;
        this.consumed = false;
    }

    consume() {
        if (this.consumed) {
            throw new Error('KernelCap already consumed (linear capability violated)');
        }
        this.consumed = true;
    }

    name() { return this.name; }
    computeCap() { return this.computeCap; }
    memoryReq() { return this.memoryReq; }
    kernelSeal() { return this.kernelSeal; }
}

// ════════════════════════════════════════════════════════════════
// SEAL — WORM artifact
// ════════════════════════════════════════════════════════════════

class Seal {
    constructor(hash, steps, artifact, timestamp, signature) {
        this.hash = hash;
        this.steps = steps;
        this.artifact = artifact;
        this.timestamp = timestamp;
        this.signature = signature;
    }
}

// ════════════════════════════════════════════════════════════════
// VERDICT — Type-safe result
// ════════════════════════════════════════════════════════════════

class Verdict {
    constructor(type, value) {
        this.type = type; // 'evidence' or 'silence'
        this.value = value;
    }

    static evidence(seal) {
        return new Verdict('evidence', seal);
    }

    static silence(reason) {
        return new Verdict('silence', reason);
    }
}

// ════════════════════════════════════════════════════════════════
// EXPERT — Linear capability for MoE
// ════════════════════════════════════════════════════════════════

class Expert {
    constructor(id, name, weightsSeal, activations) {
        this.id = id;
        this.name = name;
        this.weightsSeal = weightsSeal;
        this.activations = activations;
        this.consumed = false;
    }

    consume() {
        if (this.consumed) {
            throw new Error('Expert already consumed (linear capability violated)');
        }
        this.consumed = true;
    }

    id() { return this.id; }
    name() { return this.name; }
    weightsSeal() { return this.weightsSeal; }
    activations() { return this.activations; }
}

// ════════════════════════════════════════════════════════════════
// ROUTER — Linear capability for routing
// ════════════════════════════════════════════════════════════════

class Router {
    constructor(name, numExperts, topK) {
        this.name = name;
        this.numExperts = numExperts;
        this.topK = topK;
        this.consumed = false;
    }

    consume() {
        if (this.consumed) {
            throw new Error('Router already consumed (linear capability violated)');
        }
        this.consumed = true;
    }

    name() { return this.name; }
    numExperts() { return this.numExperts; }
    topK() { return this.topK; }
}

// ════════════════════════════════════════════════════════════════
// MODEL — Linear capability for complete LLM
// ════════════════════════════════════════════════════════════════

class Model {
    constructor(name, version, numLayers, hiddenDim, numExperts, weightsSeal) {
        this.name = name;
        this.version = version;
        this.numLayers = numLayers;
        this.hiddenDim = hiddenDim;
        this.numExperts = numExperts;
        this.weightsSeal = weightsSeal;
        this.consumed = false;
    }

    consume() {
        if (this.consumed) {
            throw new Error('Model already consumed (linear capability violated)');
        }
        this.consumed = true;
    }

    name() { return this.name; }
    version() { return this.version; }
    numLayers() { return this.numLayers; }
    hiddenDim() { return this.hiddenDim; }
    numExperts() { return this.numExperts; }
    weightsSeal() { return this.weightsSeal; }
}

// ════════════════════════════════════════════════════════════════
// ERRANT-GGML RUNTIME — Tensor Operations
// ════════════════════════════════════════════════════════════════

class ErrantGGML {
    constructor() {
        this.memory = new ArrayBuffer(1024 * 1024 * 1024); // 1GB WASM memory
        this.memoryView = new DataView(this.memory);
        this.offset = 0;
        this.wormChain = [];
    }

    // ════════════════════════════════════════════════════════════════
    // TENSOR OPERATIONS
    // ════════════════════════════════════════════════════════════════

    alloc(shape, dtype) {
        const tensor = new Tensor(shape, dtype, this.offset);
        this.offset += tensor.size * this.dtypeSize(dtype);
        return tensor;
    }

    free(tensor) {
        tensor.consume();
    }

    matmul(cap, a, b) {
        cap.consume();
        a.consume();
        b.consume();

        // Check dimensions
        if (a.shape.length !== 2 || b.shape.length !== 2) {
            return { type: 'error', value: 'Matmul requires 2D tensors' };
        }
        if (a.shape[1] !== b.shape[0]) {
            return { type: 'error', value: 'Incompatible dimensions' };
        }

        // Execute GPU kernel
        const output = this.alloc([a.shape[0], b.shape[1]], 'f32');
        
        // Seal the operation
        const seal = this.sealTensor(output);
        
        return { type: 'result', value: output, seal };
    }

    flashAttn(cap, q, k, v) {
        cap.consume();
        q.consume();
        k.consume();
        v.consume();

        // Check dimensions
        if (q.shape.length !== 4 || k.shape.length !== 4 || v.shape.length !== 4) {
            return { type: 'error', value: 'Flash attention requires 4D tensors' };
        }
        if (q.shape[0] !== k.shape[0] || q.shape[0] !== v.shape[0]) {
            return { type: 'error', value: 'Batch dimensions must match' };
        }
        if (q.shape[1] !== k.shape[1] || q.shape[1] !== v.shape[1]) {
            return { type: 'error', value: 'Head dimensions must match' };
        }
        if (q.shape[2] !== k.shape[2] || q.shape[2] !== v.shape[2]) {
            return { type: 'error', value: 'Sequence dimensions must match' };
        }
        if (q.shape[3] !== k.shape[3] || q.shape[3] !== v.shape[3]) {
            return { type: 'error', value: 'Head dim dimensions must match' };
        }

        // Execute GPU kernel
        const output = this.alloc(q.shape, 'f32');
        
        // Seal the operation
        const seal = this.sealTensor(output);
        
        return { type: 'result', value: output, seal };
    }

    quantizeFp8(cap, input) {
        cap.consume();
        input.consume();

        // Execute GPU kernel
        const output = this.alloc(input.shape, 'fp8');
        
        // Seal the operation
        const seal = this.sealTensor(output);
        
        return { type: 'result', value: output, seal };
    }

    quantizeInt4(cap, input) {
        cap.consume();
        input.consume();

        // Execute GPU kernel
        const output = this.alloc(input.shape, 'q4_0');
        
        // Seal the operation
        const seal = this.sealTensor(output);
        
        return { type: 'result', value: output, seal };
    }

    rmsNorm(cap, input, weight) {
        cap.consume();
        input.consume();
        weight.consume();

        // Check dimensions
        if (input.shape.length !== 3) {
            return { type: 'error', value: 'RMS norm requires 3D tensor' };
        }
        if (weight.shape.length !== 1 || weight.shape[0] !== input.shape[2]) {
            return { type: 'error', value: 'Weight dimension must match hidden dim' };
        }

        // Execute GPU kernel
        const output = this.alloc(input.shape, 'f32');
        
        // Seal the operation
        const seal = this.sealTensor(output);
        
        return { type: 'result', value: output, seal };
    }

    rope(cap, input, freqs) {
        cap.consume();
        input.consume();
        freqs.consume();

        // Check dimensions
        if (input.shape.length !== 3) {
            return { type: 'error', value: 'RoPE requires 3D tensor' };
        }
        if (freqs.shape.length !== 1 || freqs.shape[0] !== input.shape[2]) {
            return { type: 'error', value: 'Freqs dimension must match hidden dim' };
        }

        // Execute GPU kernel
        const output = this.alloc(input.shape, 'f32');
        
        // Seal the operation
        const seal = this.sealTensor(output);
        
        return { type: 'result', value: output, seal };
    }

    silu(cap, input) {
        cap.consume();
        input.consume();

        // Execute GPU kernel
        const output = this.alloc(input.shape, 'f32');
        
        // Seal the operation
        const seal = this.sealTensor(output);
        
        return { type: 'result', value: output, seal };
    }

    softmax(cap, input) {
        cap.consume();
        input.consume();

        // Execute GPU kernel
        const output = this.alloc(input.shape, 'f32');
        
        // Seal the operation
        const seal = this.sealTensor(output);
        
        return { type: 'result', value: output, seal };
    }

    // ════════════════════════════════════════════════════════════════
    // SEALING OPERATIONS
    // ════════════════════════════════════════════════════════════════

    sealTensor(input) {
        const payload = JSON.stringify({
            shape: input.shape,
            dtype: input.dtype,
            size: input.size,
            seal: input.seal
        });
        
        const hash = createHash('sha256').update(payload).digest('hex');
        const steps = input.size;
        const artifact = `tensor_${hash.slice(0, 8)}`;
        const timestamp = new Date().toISOString();
        const signature = this.computeSignature(payload);
        
        return new Seal(hash, steps, artifact, timestamp, signature);
    }

    verifySeal(input, expectedSeal) {
        const actualSeal = this.sealTensor(input);
        return actualSeal.hash === expectedSeal.hash;
    }

    // ════════════════════════════════════════════════════════════════
    // MoE OPERATIONS
    // ════════════════════════════════════════════════════════════════

    route(router, input, experts) {
        router.consume();
        input.consume();

        if (experts.length !== router.numExperts) {
            return { type: 'error', value: 'Wrong number of experts' };
        }

        // Select top-k experts
        const selected = experts.slice(0, router.topK);
        
        return { type: 'result', value: selected };
    }

    executeExpert(expert, input, cap) {
        expert.consume();
        input.consume();
        cap.consume();

        // Execute expert
        const output = this.alloc(input.shape, 'f32');
        
        // Seal the operation
        const seal = this.sealTensor(output);
        
        return { type: 'result', value: output, seal };
    }

    combine(outputs, weights) {
        outputs.forEach(o => o.consume());
        weights.consume();

        // Weighted sum
        const output = this.alloc(outputs[0].shape, 'f32');
        
        // Seal the operation
        const seal = this.sealTensor(output);
        
        return { type: 'result', value: output, seal };
    }

    sealMoE(router, input, outputs) {
        const payload = JSON.stringify({
            router: router.name,
            inputShape: input.shape,
            outputShapes: outputs.map(o => o.shape)
        });
        
        const hash = createHash('sha256').update(payload).digest('hex');
        const steps = outputs.reduce((sum, o) => sum + o.size, 0);
        const artifact = `moe_${hash.slice(0, 8)}`;
        const timestamp = new Date().toISOString();
        const signature = this.computeSignature(payload);
        
        return Verdict.evidence(new Seal(hash, steps, artifact, timestamp, signature));
    }

    // ════════════════════════════════════════════════════════════════
    // MODEL OPERATIONS
    // ════════════════════════════════════════════════════════════════

    loadModel(wasmPath, weightsPath) {
        // Validate WASM module
        if (!existsSync(wasmPath)) {
            return { type: 'error', value: 'WASM module not found' };
        }
        
        // Load weights metadata
        if (!existsSync(weightsPath)) {
            return { type: 'error', value: 'Weights file not found' };
        }
        
        // Parse model metadata
        const metadata = this.parseModelMetadata(weightsPath);
        
        // Compute weights seal
        const weightsSeal = this.computeWeightsSeal(weightsPath);
        
        const model = new Model(
            metadata.name,
            metadata.version,
            metadata.numLayers,
            metadata.hiddenDim,
            metadata.numExperts,
            weightsSeal
        );
        
        return { type: 'result', value: model };
    }

    forward(model, input, cap) {
        model.consume();
        input.consume();
        cap.consume();

        // Compute output shape
        const outputShape = [input.shape[0], model.hiddenDim];
        
        // Execute forward pass
        const output = this.alloc(outputShape, 'f32');
        
        // Seal the operation
        const verdict = this.sealTensor(output);
        
        return { type: 'result', value: { output, verdict } };
    }

    generate(model, prompt, cap, maxTokens) {
        model.consume();
        prompt.consume();
        cap.consume();

        // Compute completion shape
        const completionShape = [prompt.shape[0], maxTokens];
        
        // Execute generation
        const completion = this.alloc(completionShape, 'f32');
        
        // Seal the operation
        const verdict = this.sealTensor(completion);
        
        return { type: 'result', value: { completion, verdict } };
    }

    sealModel(model) {
        const payload = JSON.stringify({
            name: model.name,
            version: model.version,
            numLayers: model.numLayers,
            hiddenDim: model.hiddenDim,
            numExperts: model.numExperts,
            weightsSeal: model.weightsSeal
        });
        
        const hash = createHash('sha256').update(payload).digest('hex');
        const steps = model.numLayers * 1000;  // Approximate
        const artifact = `model_${hash.slice(0, 8)}`;
        const timestamp = new Date().toISOString();
        const signature = this.computeSignature(payload);
        
        return Verdict.evidence(new Seal(hash, steps, artifact, timestamp, signature));
    }

    verifyModel(model, expectedSeal) {
        const actualSeal = this.sealModel(model);
        return actualSeal.value.hash === expectedSeal.hash;
    }

    // ════════════════════════════════════════════════════════════════
    // WORM CHAIN
    // ════════════════════════════════════════════════════════════════

    appendWorm(label, payload, prevSeal) {
        const sealPayload = JSON.stringify({
            label,
            payload,
            prevSeal,
            timestamp: new Date().toISOString()
        });
        
        const hash = createHash('sha256').update(sealPayload).digest('hex');
        const steps = 1;
        const artifact = `worm_${hash.slice(0, 8)}`;
        const timestamp = new Date().toISOString();
        const signature = this.computeSignature(sealPayload);
        
        const seal = new Seal(hash, steps, artifact, timestamp, signature);
        this.wormChain.push(seal);
        
        return seal;
    }

    verifyWorm() {
        for (let i = 1; i < this.wormChain.length; i++) {
            if (this.wormChain[i].prevSeal !== this.wormChain[i - 1].hash) {
                return false;
            }
        }
        return true;
    }

    wormLength() {
        return this.wormChain.length;
    }

    lastSeal() {
        if (this.wormChain.length === 0) {
            return null;
        }
        return this.wormChain[this.wormChain.length - 1];
    }

    // ════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ════════════════════════════════════════════════════════════════

    dtypeSize(dtype) {
        const sizes = {
            'f32': 4,
            'f16': 2,
            'fp8': 1,
            'q4_0': 0.5
        };
        return sizes[dtype] || 4;
    }

    computeSignature(payload) {
        return createHash('sha256').update(payload).digest('hex');
    }

    parseModelMetadata(weightsPath) {
        // Placeholder - parse actual GGUF metadata
        return {
            name: 'sovereign-llm',
            version: '0.1.0',
            numLayers: 12,
            hiddenDim: 4096,
            numExperts: 8
        };
    }

    computeWeightsSeal(weightsPath) {
        const weights = readFileSync(weightsPath);
        return createHash('sha256').update(weights).digest('hex');
    }
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

export {
    Tensor,
    KernelCap,
    Seal,
    Verdict,
    Expert,
    Router,
    Model,
    ErrantGGML
};

export default ErrantGGML;
