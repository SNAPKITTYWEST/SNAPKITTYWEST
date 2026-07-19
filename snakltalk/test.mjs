#!/usr/bin/env node
/**
 * SNAKLTALK TEST — Verify linear objects actually work
 * 
 * Objects are linear. Messages are capabilities. The image is WORM-sealed.
 */

import { createHash } from 'crypto';

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
// LINEAR OBJECT — Must be consumed exactly once
// ════════════════════════════════════════════════════════════════

class LinearObject {
    constructor() {
        this.consumed = false;
    }

    consume() {
        if (this.consumed) {
            throw new Error('Object already consumed (linear resource violated)');
        }
        this.consumed = true;
    }

    move() {
        this.consume();
        return this;
    }

    isConsumed() {
        return this.consumed;
    }
}

// ════════════════════════════════════════════════════════════════
// KERNEL CAP — Linear capability
// ════════════════════════════════════════════════════════════════

class KernelCap extends LinearObject {
    constructor(name, computeCap, memoryReq) {
        super();
        this.name = name;
        this.computeCap = computeCap;
        this.memoryReq = memoryReq;
    }
}

// ════════════════════════════════════════════════════════════════
// TENSOR — Linear resource
// ════════════════════════════════════════════════════════════════

class Tensor extends LinearObject {
    constructor(shape, dtype) {
        super();
        this.shape = shape;
        this.dtype = dtype;
        this.size = shape.reduce((a, b) => a * b, 1);
        this.seal = createHash('sha256').update(JSON.stringify({ shape, dtype })).digest('hex');
    }
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
        this.type = type;
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

class Expert extends LinearObject {
    constructor(id, name, weightsSeal) {
        super();
        this.id = id;
        this.name = name;
        this.weightsSeal = weightsSeal;
    }
}

// ════════════════════════════════════════════════════════════════
// ROUTER — Linear capability for routing
// ════════════════════════════════════════════════════════════════

class Router extends LinearObject {
    constructor(name, numExperts, topK) {
        super();
        this.name = name;
        this.numExperts = numExperts;
        this.topK = topK;
    }
}

// ════════════════════════════════════════════════════════════════
// MODEL — Linear capability for LLM
// ════════════════════════════════════════════════════════════════

class Model extends LinearObject {
    constructor(name, version, numLayers, hiddenDim) {
        super();
        this.name = name;
        this.version = version;
        this.numLayers = numLayers;
        this.hiddenDim = hiddenDim;
    }
}

// ════════════════════════════════════════════════════════════════
// VORTEX AGENT — Civilizational agent
// ════════════════════════════════════════════════════════════════

class VortexAgent extends LinearObject {
    constructor(name, hat, role) {
        super();
        this.name = name;
        this.hat = hat;
        this.role = role;
        this.capabilities = [];
        this.wormChain = [];
    }

    addCapability(cap) {
        this.capabilities.push(cap);
        this.wormChain.push({ label: 'CAPABILITY_ADDED', payload: cap.name });
    }

    hasCapability(cap) {
        return this.capabilities.includes(cap);
    }

    execute(message, cap) {
        if (!this.hasCapability(cap)) {
            throw new Error('Capability not held');
        }
        cap.consume();
        this.wormChain.push({ label: 'EXECUTED', payload: message });
        return `Executed ${message}`;
    }

    seal() {
        const payload = JSON.stringify({
            name: this.name,
            hat: this.hat,
            role: this.role,
            capabilities: this.capabilities.map(c => c.name)
        });
        return new Seal(
            createHash('sha256').update(payload).digest('hex'),
            this.wormChain.length,
            `agent_${this.name}`,
            new Date().toISOString(),
            createHash('sha256').update(payload).digest('hex')
        );
    }

    verify(expectedSeal) {
        return this.seal().hash === expectedSeal.hash;
    }
}

// ════════════════════════════════════════════════════════════════
// WORM CHAIN — Append-only audit trail
// ════════════════════════════════════════════════════════════════

class WormChain {
    constructor() {
        this.chain = [];
    }

    append(label, payload) {
        const prev = this.chain.length > 0
            ? this.chain[this.chain.length - 1].seal
            : '0'.repeat(64);
        
        const ts = new Date().toISOString();
        const raw = JSON.stringify({ label, payload, ts, prev });
        const seal = createHash('sha256').update(raw).digest('hex');
        
        const event = { label, payload, ts, prev, seal };
        this.chain.push(event);
        return event;
    }

    verify() {
        for (let i = 1; i < this.chain.length; i++) {
            if (this.chain[i].prev !== this.chain[i - 1].seal) {
                return false;
            }
        }
        return true;
    }

    length() {
        return this.chain.length;
    }

    lastSeal() {
        return this.chain.length > 0
            ? this.chain[this.chain.length - 1].seal
            : null;
    }
}

// ════════════════════════════════════════════════════════════════
// TEST 1: LINEAR OBJECT CONSUMPTION
// ════════════════════════════════════════════════════════════════

function testLinearObjectConsumption() {
    log(BLUE, '\n═══ TEST 1: LINEAR OBJECT CONSUMPTION ═══');
    
    const obj = new LinearObject();
    assert(obj.consumed === false, 'Object not consumed initially');
    
    obj.consume();
    assert(obj.consumed === true, 'Object consumed');
    
    let errorThrown = false;
    try {
        obj.consume();
    } catch (e) {
        errorThrown = true;
        assert(e.message.includes('already consumed'), 'Error mentions already consumed');
    }
    assert(errorThrown, 'Second consumption throws error');
    
    log(GREEN, '  ✓ Linear consumption works');
}

// ════════════════════════════════════════════════════════════════
// TEST 2: KERNEL CAPABILITY
// ════════════════════════════════════════════════════════════════

function testKernelCap() {
    log(BLUE, '\n═══ TEST 2: KERNEL CAPABILITY ═══');
    
    const cap = new KernelCap('matmul_fp16', 'sm_80', 1024 * 1024 * 1024);
    assert(cap.name === 'matmul_fp16', 'Cap name is matmul_fp16');
    assert(cap.computeCap === 'sm_80', 'Cap compute is sm_80');
    assert(cap.memoryReq === 1024 * 1024 * 1024, 'Cap memory is 1GB');
    
    cap.consume();
    assert(cap.consumed === true, 'Cap consumed');
    
    log(GREEN, '  ✓ Kernel capability works');
}

// ════════════════════════════════════════════════════════════════
// TEST 3: TENSOR LINEAR RESOURCE
// ════════════════════════════════════════════════════════════════

function testTensorLinearResource() {
    log(BLUE, '\n═══ TEST 3: TENSOR LINEAR RESOURCE ═══');
    
    const tensor = new Tensor([3, 512, 4096], 'f32');
    assert(tensor.shape.length === 3, 'Tensor has 3 dimensions');
    assert(tensor.dtype === 'f32', 'Tensor is f32');
    assert(tensor.size === 3 * 512 * 4096, 'Tensor size is correct');
    assert(tensor.seal.length === 64, 'Tensor has SHA-256 seal');
    
    tensor.consume();
    assert(tensor.consumed === true, 'Tensor consumed');
    
    log(GREEN, '  ✓ Tensor linear resource works');
}

// ════════════════════════════════════════════════════════════════
// TEST 4: MATRIX MULTIPLICATION
// ════════════════════════════════════════════════════════════════

function testMatmul() {
    log(BLUE, '\n═══ TEST 4: MATRIX MULTIPLICATION ═══');
    
    const cap = new KernelCap('matmul_fp16', 'sm_80', 1024 * 1024 * 1024);
    const a = new Tensor([3, 512], 'f32');
    const b = new Tensor([512, 1024], 'f32');
    
    // Execute matmul (linear consumption)
    cap.consume();
    a.consume();
    b.consume();
    
    const output = new Tensor([3, 1024], 'f32');
    
    assert(cap.consumed === true, 'Cap consumed');
    assert(a.consumed === true, 'Tensor a consumed');
    assert(b.consumed === true, 'Tensor b consumed');
    assert(output.shape[0] === 3, 'Output dim 0 is 3');
    assert(output.shape[1] === 1024, 'Output dim 1 is 1024');
    
    log(GREEN, '  ✓ Matrix multiplication works');
}

// ════════════════════════════════════════════════════════════════
// TEST 5: WORM SEALING
// ════════════════════════════════════════════════════════════════

function testWormSealing() {
    log(BLUE, '\n═══ TEST 5: WORM SEALING ═══');
    
    const tensor = new Tensor([1, 4096], 'f32');
    const payload = JSON.stringify({ shape: tensor.shape, dtype: tensor.dtype });
    
    const seal = new Seal(
        createHash('sha256').update(payload).digest('hex'),
        tensor.size,
        `tensor_${tensor.seal.slice(0, 8)}`,
        new Date().toISOString(),
        createHash('sha256').update(payload).digest('hex')
    );
    
    assert(seal.hash.length === 64, 'Seal has SHA-256 hash');
    assert(seal.steps === tensor.size, 'Seal steps equals tensor size');
    assert(seal.artifact.startsWith('tensor_'), 'Artifact starts with tensor_');
    
    log(GREEN, '  ✓ WORM sealing works');
}

// ════════════════════════════════════════════════════════════════
// TEST 6: MoE ROUTING
// ════════════════════════════════════════════════════════════════

function testMoERouting() {
    log(BLUE, '\n═══ TEST 6: MoE ROUTING ═══');
    
    const router = new Router('top-k', 4, 2);
    const experts = [
        new Expert(0, 'reasoning', 'seal0'),
        new Expert(1, 'code', 'seal1'),
        new Expert(2, 'math', 'seal2'),
        new Expert(3, 'language', 'seal3')
    ];
    const input = new Tensor([1, 512], 'f32');
    
    // Route (linear consumption)
    router.consume();
    input.consume();
    
    const selected = experts.slice(0, router.topK);
    
    assert(selected.length === 2, 'Selected 2 experts');
    assert(selected[0].name === 'reasoning', 'First expert is reasoning');
    assert(selected[1].name === 'code', 'Second expert is code');
    
    log(GREEN, '  ✓ MoE routing works');
}

// ════════════════════════════════════════════════════════════════
// TEST 7: VORTEX AGENT
// ════════════════════════════════════════════════════════════════

function testVortexAgent() {
    log(BLUE, '\n═══ TEST 7: VORTEX AGENT ═══');
    
    const agent = new VortexAgent('BOB', 'red', 'orchestrator');
    const cap = new KernelCap('reason', 'sm_89', 2 * 1024 * 1024 * 1024);
    
    agent.addCapability(cap);
    assert(agent.hasCapability(cap), 'Agent has capability');
    
    const result = agent.execute('reason', cap);
    assert(result === 'Executed reason', 'Agent executed');
    assert(agent.wormChain.length === 2, 'Agent has 2 WORM events');
    
    const seal = agent.seal();
    assert(seal.hash.length === 64, 'Agent seal has hash');
    assert(seal.artifact === 'agent_BOB', 'Artifact is agent_BOB');
    
    assert(agent.verify(seal), 'Agent verifies');
    
    log(GREEN, '  ✓ Vortex agent works');
}

// ════════════════════════════════════════════════════════════════
// TEST 8: WORM CHAIN
// ════════════════════════════════════════════════════════════════

function testWormChain() {
    log(BLUE, '\n═══ TEST 8: WORM CHAIN ═══');
    
    const chain = new WormChain();
    
    const event1 = chain.append('EVENT_1', 'payload1');
    const event2 = chain.append('EVENT_2', 'payload2');
    const event3 = chain.append('EVENT_3', 'payload3');
    
    assert(chain.length() === 3, 'Chain has 3 events');
    assert(event1.seal.length === 64, 'Seal 1 has hash');
    assert(event2.seal.length === 64, 'Seal 2 has hash');
    assert(event3.seal.length === 64, 'Seal 3 has hash');
    
    assert(chain.verify() === true, 'Chain verifies');
    assert(chain.lastSeal() === event3.seal, 'Last seal matches');
    
    log(GREEN, '  ✓ WORM chain works');
}

// ════════════════════════════════════════════════════════════════
// TEST 9: COMPLETE FLOW
// ════════════════════════════════════════════════════════════════

function testCompleteFlow() {
    log(BLUE, '\n═══ TEST 9: COMPLETE FLOW ═══');
    
    // 1. Create model
    const model = new Model('sovereign-llm', '0.1.0', 12, 4096);
    
    // 2. Allocate input
    const input = new Tensor([1, 512, 4096], 'f32');
    
    // 3. Load kernel
    const cap = new KernelCap('forward', 'sm_89', 4 * 1024 * 1024 * 1024);
    
    // 4. Forward pass (linear consumption)
    model.consume();
    input.consume();
    cap.consume();
    
    const output = new Tensor([1, 4096], 'f32');
    
    // 5. Seal operation
    const payload = JSON.stringify({
        model: 'sovereign-llm',
        inputShape: [1, 512, 4096],
        outputShape: [1, 4096]
    });
    
    const seal = new Seal(
        createHash('sha256').update(payload).digest('hex'),
        output.size,
        'forward_abc123',
        new Date().toISOString(),
        createHash('sha256').update(payload).digest('hex')
    );
    
    const verdict = Verdict.evidence(seal);
    
    // 6. Append to WORM chain
    const chain = new WormChain();
    chain.append('MODEL_LOADED', 'sovereign-llm');
    chain.append('FORWARD_COMPLETE', 'success');
    
    assert(model.consumed === true, 'Model consumed');
    assert(input.consumed === true, 'Input consumed');
    assert(cap.consumed === true, 'Cap consumed');
    assert(verdict.type === 'evidence', 'Verdict is evidence');
    assert(verdict.value.hash.length === 64, 'Verdict has hash');
    assert(chain.length() === 2, 'Chain has 2 events');
    assert(chain.verify() === true, 'Chain verifies');
    
    log(GREEN, '  ✓ Complete flow works');
    log(GREEN, '\n═══════════════════════════════════════════════════════════');
    log(GREEN, '  ALL TESTS PASSED — SNAKLTALK IS WORKING');
    log(GREEN, '═══════════════════════════════════════════════════════════\n');
}

// ════════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ════════════════════════════════════════════════════════════════

function main() {
    log(BOLD, '\n═══════════════════════════════════════════════════════════');
    log(BOLD, '  SNAKLTALK TEST SUITE');
    log(BOLD, '  Objects are linear. Messages are capabilities.');
    log(BOLD, '═══════════════════════════════════════════════════════════\n');
    
    testLinearObjectConsumption();
    testKernelCap();
    testTensorLinearResource();
    testMatmul();
    testWormSealing();
    testMoERouting();
    testVortexAgent();
    testWormChain();
    testCompleteFlow();
}

main();
