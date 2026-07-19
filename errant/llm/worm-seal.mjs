/**
 * ERRANT-GGML WORM SEALING — Model Artifact Integrity
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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ════════════════════════════════════════════════════════════════
// WORM CHAIN — Append-only audit trail
// ════════════════════════════════════════════════════════════════

class WormChain {
    constructor(chainPath) {
        this.chainPath = chainPath;
        this.chain = this.load();
    }

    load() {
        if (!existsSync(this.chainPath)) {
            return [];
        }
        try {
            return JSON.parse(readFileSync(this.chainPath, 'utf8'));
        } catch {
            return [];
        }
    }

    save() {
        const dir = dirname(this.chainPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(this.chainPath, JSON.stringify(this.chain, null, 2));
    }

    append(label, payload, meta = {}) {
        const prev = this.chain.length > 0 
            ? this.chain[this.chain.length - 1].seal 
            : '0'.repeat(64);
        
        const ts = new Date().toISOString();
        const raw = JSON.stringify({ label, payload, meta, ts, prev });
        const seal = createHash('sha256').update(raw).digest('hex');
        const id = randomUUID();
        
        const event = { id, label, payload, meta, ts, prev, seal };
        this.chain.push(event);
        this.save();
        
        return event;
    }

    verify() {
        for (let i = 1; i < this.chain.length; i++) {
            if (this.chain[i].prev !== this.chain[i - 1].seal) {
                return { 
                    valid: false, 
                    brokenAt: i, 
                    length: this.chain.length,
                    expected: this.chain[i - 1].seal,
                    actual: this.chain[i].prev
                };
            }
        }
        return { valid: true, length: this.chain.length };
    }

    length() {
        return this.chain.length;
    }

    lastSeal() {
        if (this.chain.length === 0) {
            return null;
        }
        return this.chain[this.chain.length - 1].seal;
    }

    getEvent(index) {
        if (index < 0 || index >= this.chain.length) {
            return null;
        }
        return this.chain[index];
    }
}

// ════════════════════════════════════════════════════════════════
// MODEL SEALER — WORM sealing for model artifacts
// ════════════════════════════════════════════════════════════════

class ModelSealer {
    constructor(wormChain) {
        this.wormChain = wormChain;
    }

    sealTensor(tensor) {
        const payload = JSON.stringify({
            type: 'tensor',
            shape: tensor.shape,
            dtype: tensor.dtype,
            size: tensor.size,
            seal: tensor.seal
        });
        
        const event = this.wormChain.append('TENSOR_SEAL', payload, {
            shape: tensor.shape,
            dtype: tensor.dtype,
            size: tensor.size
        });
        
        return {
            hash: event.seal,
            steps: tensor.size,
            artifact: `tensor_${event.id.slice(0, 8)}`,
            timestamp: event.ts,
            signature: event.seal
        };
    }

    sealKernel(cap) {
        const payload = JSON.stringify({
            type: 'kernel',
            name: cap.name,
            computeCap: cap.computeCap,
            memoryReq: cap.memoryReq,
            kernelSeal: cap.kernelSeal
        });
        
        const event = this.wormChain.append('KERNEL_SEAL', payload, {
            name: cap.name,
            computeCap: cap.computeCap,
            memoryReq: cap.memoryReq
        });
        
        return {
            hash: event.seal,
            steps: 1,
            artifact: `kernel_${event.id.slice(0, 8)}`,
            timestamp: event.ts,
            signature: event.seal
        };
    }

    sealExpert(expert) {
        const payload = JSON.stringify({
            type: 'expert',
            id: expert.id,
            name: expert.name,
            weightsSeal: expert.weightsSeal,
            activations: expert.activations
        });
        
        const event = this.wormChain.append('EXPERT_SEAL', payload, {
            id: expert.id,
            name: expert.name,
            activations: expert.activations
        });
        
        return {
            hash: event.seal,
            steps: expert.activations,
            artifact: `expert_${event.id}_${event.id.slice(0, 8)}`,
            timestamp: event.ts,
            signature: event.seal
        };
    }

    sealModel(model) {
        const payload = JSON.stringify({
            type: 'model',
            name: model.name,
            version: model.version,
            numLayers: model.numLayers,
            hiddenDim: model.hiddenDim,
            numExperts: model.numExperts,
            weightsSeal: model.weightsSeal
        });
        
        const event = this.wormChain.append('MODEL_SEAL', payload, {
            name: model.name,
            version: model.version,
            numLayers: model.numLayers,
            hiddenDim: model.hiddenDim,
            numExperts: model.numExperts
        });
        
        return {
            hash: event.seal,
            steps: model.numLayers * 1000,
            artifact: `model_${event.id.slice(0, 8)}`,
            timestamp: event.ts,
            signature: event.seal
        };
    }

    sealOperation(operation) {
        const payload = JSON.stringify({
            type: 'operation',
            name: operation.name,
            inputShapes: operation.inputShapes,
            outputShapes: operation.outputShapes,
            kernel: operation.kernel
        });
        
        const event = this.wormChain.append('OPERATION_SEAL', payload, {
            name: operation.name,
            inputShapes: operation.inputShapes,
            outputShapes: operation.outputShapes,
            kernel: operation.kernel
        });
        
        return {
            hash: event.seal,
            steps: operation.steps || 1,
            artifact: `op_${event.id.slice(0, 8)}`,
            timestamp: event.ts,
            signature: event.seal
        };
    }

    sealMoE(router, input, outputs) {
        const payload = JSON.stringify({
            type: 'moe',
            router: router.name,
            numExperts: router.numExperts,
            topK: router.topK,
            inputShape: input.shape,
            outputShapes: outputs.map(o => o.shape)
        });
        
        const event = this.wormChain.append('MOE_SEAL', payload, {
            router: router.name,
            numExperts: router.numExperts,
            topK: router.topK,
            inputShape: input.shape,
            outputShapes: outputs.map(o => o.shape)
        });
        
        return {
            hash: event.seal,
            steps: outputs.reduce((sum, o) => sum + o.size, 0),
            artifact: `moe_${event.id.slice(0, 8)}`,
            timestamp: event.ts,
            signature: event.seal
        };
    }

    sealForward(model, input, output) {
        const payload = JSON.stringify({
            type: 'forward',
            model: model.name,
            inputShape: input.shape,
            outputShape: output.shape
        });
        
        const event = this.wormChain.append('FORWARD_SEAL', payload, {
            model: model.name,
            inputShape: input.shape,
            outputShape: output.shape
        });
        
        return {
            hash: event.seal,
            steps: output.size,
            artifact: `forward_${event.id.slice(0, 8)}`,
            timestamp: event.ts,
            signature: event.seal
        };
    }

    sealGenerate(model, prompt, completion) {
        const payload = JSON.stringify({
            type: 'generate',
            model: model.name,
            promptShape: prompt.shape,
            completionShape: completion.shape
        });
        
        const event = this.wormChain.append('GENERATE_SEAL', payload, {
            model: model.name,
            promptShape: prompt.shape,
            completionShape: completion.shape
        });
        
        return {
            hash: event.seal,
            steps: completion.size,
            artifact: `generate_${event.id.slice(0, 8)}`,
            timestamp: event.ts,
            signature: event.seal
        };
    }

    verifySeal(expectedSeal) {
        const verification = this.wormChain.verify();
        
        if (!verification.valid) {
            return {
                valid: false,
                reason: `Chain broken at index ${verification.brokenAt}`,
                expected: verification.expected,
                actual: verification.actual
            };
        }
        
        // Find the event with the matching seal
        const event = this.wormChain.chain.find(e => e.seal === expectedSeal);
        if (!event) {
            return {
                valid: false,
                reason: 'Seal not found in chain'
            };
        }
        
        return {
            valid: true,
            event: event,
            chainLength: verification.length
        };
    }
}

// ════════════════════════════════════════════════════════════════
// ERRANT-GGML WORM RUNTIME
// ════════════════════════════════════════════════════════════════

class ErrantWormRuntime {
    constructor(chainPath) {
        this.wormChain = new WormChain(chainPath);
        this.modelSealer = new ModelSealer(this.wormChain);
    }

    // ════════════════════════════════════════════════════════════════
    // SEALING OPERATIONS
    // ════════════════════════════════════════════════════════════════

    sealTensor(tensor) {
        return this.modelSealer.sealTensor(tensor);
    }

    sealKernel(cap) {
        return this.modelSealer.sealKernel(cap);
    }

    sealExpert(expert) {
        return this.modelSealer.sealExpert(expert);
    }

    sealModel(model) {
        return this.modelSealer.sealModel(model);
    }

    sealOperation(operation) {
        return this.modelSealer.sealOperation(operation);
    }

    sealMoE(router, input, outputs) {
        return this.modelSealer.sealMoE(router, input, outputs);
    }

    sealForward(model, input, output) {
        return this.modelSealer.sealForward(model, input, output);
    }

    sealGenerate(model, prompt, completion) {
        return this.modelSealer.sealGenerate(model, prompt, completion);
    }

    // ════════════════════════════════════════════════════════════════
    // VERIFICATION OPERATIONS
    // ════════════════════════════════════════════════════════════════

    verifySeal(expectedSeal) {
        return this.modelSealer.verifySeal(expectedSeal);
    }

    verifyChain() {
        return this.wormChain.verify();
    }

    // ════════════════════════════════════════════════════════════════
    // CHAIN OPERATIONS
    // ════════════════════════════════════════════════════════════════

    chainLength() {
        return this.wormChain.length();
    }

    lastSeal() {
        return this.wormChain.lastSeal();
    }

    getEvent(index) {
        return this.wormChain.getEvent(index);
    }

    // ════════════════════════════════════════════════════════════════
    // EXPORT OPERATIONS
    // ════════════════════════════════════════════════════════════════

    exportChain() {
        return this.wormChain.chain;
    }

    exportSeals() {
        return this.wormChain.chain.map(event => ({
            id: event.id,
            label: event.label,
            seal: event.seal,
            timestamp: event.ts
        }));
    }
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

export {
    WormChain,
    ModelSealer,
    ErrantWormRuntime
};

export default ErrantWormRuntime;
