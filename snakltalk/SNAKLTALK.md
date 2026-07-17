# SNAKLTALK — Smalltalk for Vortex Civilization

> **Objects are linear. Messages are capabilities. The image is WORM-sealed.**

---

## What is SnaklTalk?

SnaklTalk is Smalltalk for sovereign compute:

- **Smalltalk**: Live objects, message passing, image-based persistence
- **ERRANT**: Linear types, capability security, WORM sealing
- **Forth**: Stack-based execution, minimal runtime
- **Prolog**: Logic programming, type checking
- **Vortex**: Civilizational architecture, multi-agent governance

---

## The Vortex Civilization

```
┌─────────────────────────────────────────────────────────────────┐
│                    VORTEX CIVILIZATION                            │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5: GOVERNANCE                                             │
│  Smalltalk image (live objects, persistent state)                │
│  Multi-agent voting, WORM-sealed decisions                       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: ECONOMY                                                │
│  Capability tokens, linear resource tracking                     │
│  Agent-to-agent trading, sealed transactions                     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: SOCIETY                                                │
│  Message-passing agents, trait-based inheritance                  │
│  Collaborative reasoning, shared knowledge                       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: LANGUAGE                                                │
│  SnaklTalk compiler, ERRANT type checker                         │
│  Prolog kernel, WORM sealing                                     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: FOUNDATION                                             │
│  WASM runtime, GGML kernels, linear capabilities                 │
│  Stack-based execution, append-only audit                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Chain

```
User → SnaklTalk (message to object)
         ↓
    ERRANT (linear type check)
         ↓
    Prolog (logic proof)
         ↓
    WASM (execute kernel)
         ↓
    WORM (seal artifact)
         ↓
    Smalltalk (image update)
```

---

## Syntax Comparison

| Feature | Smalltalk | SnaklTalk |
|---------|-----------|-----------|
| Variable | `x := 5` | `x := 5 lin` |
| Method | `foo: a` | `foo: a lin` |
| Class | `Object subclass: #Foo` | `Object subclass: #Foo lin` |
| Block | `[ :x \| x + 1 ]` | `[ :x lin \| x + 1 ]` |
| Send | `obj foo: 5` | `obj foo: 5 cap` |
| Return | `^x` | `^x` |
| Class | `Foo new` | `Foo new cap` |
| Trait | `TComparable` | `TComparable lin` |

---

## Linear Objects

In SnaklTalk, objects are linear resources:

```smalltalk
"Regular Smalltalk — objects are shared"
x := Foo new.
y := x.  "aliasing allowed"
x foo.   "both x and y reference same object"

"SnaklTalk — objects are linear"
x := Foo new lin.
y := x move.  "linear move, x is consumed"
x foo.        "ERROR: x already consumed"
```

---

## Capability Messages

Messages are capabilities:

```smalltalk
"Regular Smalltalk — any object can send any message"
obj foo: 5.

"SnaklTalk — capabilities required"
cap := KernelCap new name: 'matmul'.
result := obj foo: 5 cap: cap.  "capability consumed"
```

---

## WORM-Sealed Image

The Smalltalk image is WORM-sealed:

```smalltalk
"Seal the image"
SealedImage seal.

"Verify image integrity"
SealedImage verify.

"Get image hash"
SealedImage hash.
```

---

## Example: Vortex Agent

```smalltalk
"Define a vortex agent"
Object subclass: #VortexAgent
    instanceVariableNames: 'name hat role capabilities wormChain'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'Vortex-Civilization'.

"Initialize"
VortexAgent >> initialize: aName hat: aHat role: aRole lin
    name := aName.
    hat := aHat.
    role := aRole.
    capabilities := OrderedCollection new.
    wormChain := WormChain new.

"Add capability"
VortexAgent >> addCapability: aCap lin
    capabilities add: aCap.
    wormChain append: 'CAPABILITY_ADDED' payload: aCap.

"Execute with capability"
VortexAgent >> execute: aMessage cap: aCap lin
    (capabilities includes: aCap) ifFalse: [
        ^ self error: 'Capability not held'
    ].
    result := self perform: aMessage.
    wormChain append: 'EXECUTED' payload: aMessage.
    ^ result.

"Seal agent"
VortexAgent >> seal lin
    ^ Seal new
        hash: (SHA256 hash: self asString);
        steps: wormChain length;
        artifact: 'agent_' , name;
        yourself.

"Verify agent"
VortexAgent >> verify: expectedSeal lin
    ^ self seal hash = expectedSeal hash.
```

---

## Example: MoE Router

```smalltalk
"Define MoE router"
Object subclass: #MoERouter
    instanceVariableNames: 'name numExperts topK experts wormChain'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'Vortex-LLM'.

"Route to experts"
MoERouter >> route: anInput lin
    | selected |
    selected := experts first: topK.
    wormChain append: 'ROUTED' payload: selected.
    ^ selected.

"Execute expert"
MoERouter >> executeExpert: anExpert input: anInput cap: aCap lin
    | output |
    output := anExpert execute: anInput cap: aCap.
    wormChain append: 'EXECUTED' payload: anExpert.
    ^ output.

"Combine outputs"
MoERouter >> combine: outputs weights: weights lin
    | combined |
    combined := outputs inject: 0 into: [:sum :out | sum + out].
    wormChain append: 'COMBINED' payload: combined.
    ^ combined.
```

---

## The Genesis

```smalltalk
"ERRANT_GENESIS_001"
SealedImage genesis: #(
    'Forth is the metal.'
    'Prolog is the law.'
    'Linear types are the vow.'
    'WORM is the memory.'
    'Objects are linear. Messages are capabilities. The image is WORM-sealed.'
    'Ω'
).
```

---

## Tagline

> **Objects are linear. Messages are capabilities. The image is WORM-sealed.**

---

## Files

| File | Purpose |
|------|---------|
| `SNAKLTALK.md` | This architecture document |
| `snakltalk.st` | SnaklTalk Smalltalk code |
| `vortex.st` | Vortex civilization classes |
| `worm.st` | WORM sealing for image |
| `errant.st` | ERRANT linear type integration |

---

*Ahmad Ali Parr · SNAPKITTYWEST · ERRANT-GENESIS-001*
