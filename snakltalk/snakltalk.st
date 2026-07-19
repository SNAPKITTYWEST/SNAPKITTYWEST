"═══════════════════════════════════════════════════════════════"
"SNAKLTALK — Smalltalk for Vortex Civilization"
"═══════════════════════════════════════════════════════════════"
"Objects are linear. Messages are capabilities. The image is WORM-sealed."
"Ahmad Ali Parr · SNAPKITTYWEST · ERRANT-GENESIS-001"
"═══════════════════════════════════════════════════════════════"

"═══════════════════════════════════════════════════════════════"
"LINEAR OBJECTS — Resources consumed exactly once"
"═══════════════════════════════════════════════════════════════"

Object subclass: #LinearObject
    instanceVariableNames: 'consumed'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-Linear'.

LinearObject >> initialize
    consumed := false.

LinearObject >> consume
    consumed ifTrue: [ self error: 'Object already consumed (linear resource violated)' ].
    consumed := true.

LinearObject >> isConsumed
    ^ consumed.

LinearObject >> move
    self consume.
    ^ self.

"═══════════════════════════════════════════════════════════════"
"CAPABILITIES — Linear tokens for operations"
"═══════════════════════════════════════════════════════════════"

LinearObject subclass: #KernelCap
    instanceVariableNames: 'name computeCap memoryReq kernelSeal consumed'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-Capability'.

KernelCap >> initialize: aName computeCap: aCap memoryReq: aReq kernelSeal: aSeal
    name := aName.
    computeCap := aCap.
    memoryReq := aReq.
    kernelSeal := aSeal.
    consumed := false.

KernelCap >> name
    ^ name.

KernelCap >> computeCap
    ^ computeCap.

KernelCap >> memoryReq
    ^ memoryReq.

KernelCap >> kernelSeal
    ^ kernelSeal.

KernelCap >> consume
    consumed ifTrue: [ self error: 'KernelCap already consumed (linear capability violated)' ].
    consumed := true.

"═══════════════════════════════════════════════════════════════"
"TENSORS — Linear resources for computation"
"═══════════════════════════════════════════════════════════════"

LinearObject subclass: #Tensor
    instanceVariableNames: 'shape dtype seal size offset consumed'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-Tensor'.

Tensor >> initialize: aShape dtype: aDtype
    shape := aShape.
    dtype := aDtype.
    size := aShape inject: 1 into: [:prod :dim | prod * dim].
    seal := (SHA256 hash: shape asString , dtype) asString.
    offset := 0.
    consumed := false.

Tensor >> shape
    ^ shape.

Tensor >> dtype
    ^ dtype.

Tensor >> seal
    ^ seal.

Tensor >> size
    ^ size.

Tensor >> offset
    ^ offset.

Tensor >> consume
    consumed ifTrue: [ self error: 'Tensor already consumed (linear resource violated)' ].
    consumed := true.

"═══════════════════════════════════════════════════════════════"
"SEAL — WORM artifact"
"═══════════════════════════════════════════════════════════════"

Object subclass: #Seal
    instanceVariableNames: 'hash steps artifact timestamp signature'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-WORM'.

Seal >> initialize: aHash steps: anInt artifact: aString timestamp: aTimestamp signature: aSig
    hash := aHash.
    steps := anInt.
    artifact := aString.
    timestamp := aTimestamp.
    signature := aSig.

Seal >> hash
    ^ hash.

Seal >> steps
    ^ steps.

Seal >> artifact
    ^ artifact.

Seal >> timestamp
    ^ timestamp.

Seal >> signature
    ^ signature.

"═══════════════════════════════════════════════════════════════"
"VERDICT — Type-safe result"
"═══════════════════════════════════════════════════════════════"

Object subclass: #Verdict
    instanceVariableNames: 'type value'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-Verdict'.

Verdict >> initialize: aType value: aValue
    type := aType.
    value := aValue.

Verdict >> type
    ^ type.

Verdict >> value
    ^ value.

Verdict class >> evidence: aSeal
    ^ self new initialize: #evidence value: aSeal.

Verdict class >> silence: aString
    ^ self new initialize: #silence value: aString.

"═══════════════════════════════════════════════════════════════"
"WORM CHAIN — Append-only audit trail"
"═══════════════════════════════════════════════════════════════"

Object subclass: #WormChain
    instanceVariableNames: 'chain'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-WORM'.

WormChain >> initialize
    chain := OrderedCollection new.

WormChain >> append: aLabel payload: aPayload
    | prev ts raw seal event |
    prev := chain isEmpty
        ifTrue: [ '0' repeat: 64 ]
        ifFalse: [ chain last seal ].
    ts := DateAndTime now.
    raw := aLabel asString , aPayload asString , ts asString , prev.
    seal := (SHA256 hash: raw) asString.
    event := Dictionary new
        at: #label put: aLabel;
        at: #payload put: aPayload;
        at: #timestamp put: ts;
        at: #previous put: prev;
        at: #seal put: seal;
        yourself.
    chain add: event.
    ^ seal.

WormChain >> verify
    | prev |
    chain size < 2 ifTrue: [ ^ true ].
    prev := chain first seal.
    2 to: chain size do: [:i |
        (chain at: i) previous = prev ifFalse: [ ^ false ].
        prev := (chain at: i) seal.
    ].
    ^ true.

WormChain >> length
    ^ chain size.

WormChain >> lastSeal
    ^ chain isEmpty ifTrue: [ nil ] ifFalse: [ chain last seal ].

"═══════════════════════════════════════════════════════════════"
"EXPERT — Linear capability for MoE"
"═══════════════════════════════════════════════════════════════"

LinearObject subclass: #Expert
    instanceVariableNames: 'id name weightsSeal activations consumed'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-MoE'.

Expert >> initialize: anId name: aName weightsSeal: aSeal activations: anInt
    id := anId.
    name := aName.
    weightsSeal := aSeal.
    activations := anInt.
    consumed := false.

Expert >> id
    ^ id.

Expert >> name
    ^ name.

Expert >> weightsSeal
    ^ weightsSeal.

Expert >> activations
    ^ activations.

Expert >> consume
    consumed ifTrue: [ self error: 'Expert already consumed (linear capability violated)' ].
    consumed := true.

"═══════════════════════════════════════════════════════════════"
"ROUTER — Linear capability for routing"
"═══════════════════════════════════════════════════════════════"

LinearObject subclass: #Router
    instanceVariableNames: 'name numExperts topK consumed'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-MoE'.

Router >> initialize: aName numExperts: anInt topK: anotherInt
    name := aName.
    numExperts := anInt.
    topK := anotherInt.
    consumed := false.

Router >> name
    ^ name.

Router >> numExperts
    ^ numExperts.

Router >> topK
    ^ topK.

Router >> consume
    consumed ifTrue: [ self error: 'Router already consumed (linear capability violated)' ].
    consumed := true.

"═══════════════════════════════════════════════════════════════"
"MODEL — Linear capability for complete LLM"
"═══════════════════════════════════════════════════════════════"

LinearObject subclass: #Model
    instanceVariableNames: 'name version numLayers hiddenDim numExperts weightsSeal consumed'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-LLM'.

Model >> initialize: aName version: aVersion numLayers: anInt hiddenDim: anotherInt numExperts: aThirdInt weightsSeal: aSeal
    name := aName.
    version := aVersion.
    numLayers := anInt.
    hiddenDim := anotherInt.
    numExperts := aThirdInt.
    weightsSeal := aSeal.
    consumed := false.

Model >> name
    ^ name.

Model >> version
    ^ version.

Model >> numLayers
    ^ numLayers.

Model >> hiddenDim
    ^ hiddenDim.

Model >> numExperts
    ^ numExperts.

Model >> weightsSeal
    ^ weightsSeal.

Model >> consume
    consumed ifTrue: [ self error: 'Model already consumed (linear capability violated)' ].
    consumed := true.

"═══════════════════════════════════════════════════════════════"
"VORTEX AGENT — Civilizational agent"
"═══════════════════════════════════════════════════════════════"

LinearObject subclass: #VortexAgent
    instanceVariableNames: 'name hat role capabilities wormChain consumed'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-Vortex'.

VortexAgent >> initialize: aName hat: aHat role: aRole
    name := aName.
    hat := aHat.
    role := aRole.
    capabilities := OrderedCollection new.
    wormChain := WormChain new.
    consumed := false.

VortexAgent >> name
    ^ name.

VortexAgent >> hat
    ^ hat.

VortexAgent >> role
    ^ role.

VortexAgent >> capabilities
    ^ capabilities.

VortexAgent >> addCapability: aCap
    capabilities add: aCap.
    wormChain append: 'CAPABILITY_ADDED' payload: aCap name.

VortexAgent >> hasCapability: aCap
    ^ capabilities includes: aCap.

VortexAgent >> execute: aMessage cap: aCap
    | result |
    (self hasCapability: aCap) ifFalse: [
        ^ self error: 'Capability not held'.
    ].
    aCap consume.
    result := self perform: aMessage.
    wormChain append: 'EXECUTED' payload: aMessage.
    ^ result.

VortexAgent >> seal
    ^ Seal new
        initialize: (SHA256 hash: self asString) asString
            steps: wormChain length
            artifact: 'agent_' , name
            timestamp: DateAndTime now
            signature: (SHA256 hash: self asString) asString;
        yourself.

VortexAgent >> verify: expectedSeal
    ^ self seal hash = expectedSeal hash.

VortexAgent >> consume
    consumed ifTrue: [ self error: 'VortexAgent already consumed (linear resource violated)' ].
    consumed := true.

"═══════════════════════════════════════════════════════════════"
"VORTEX CIVILIZATION — Multi-agent governance"
"═══════════════════════════════════════════════════════════════"

Object subclass: #VortexCivilization
    instanceVariableNames: 'name agents wormChain'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-Vortex'.

VortexCivilization >> initialize: aName
    name := aName.
    agents := OrderedCollection new.
    wormChain := WormChain new.

VortexCivilization >> name
    ^ name.

VortexCivilization >> agents
    ^ agents.

VortexCivilization >> addAgent: anAgent
    agents add: anAgent.
    wormChain append: 'AGENT_ADDED' payload: anAgent name.

VortexCivilization >> removeAgent: anAgent
    agents remove: anAgent.
    wormChain append: 'AGENT_REMOVED' payload: anAgent name.

VortexCivilization >> vote: aProposal
    | votes for against |
    votes := agents collect: [:agent | agent vote: aProposal].
    for := votes count: [:v | v = #for].
    against := votes count: [:v | v = #against].
    wormChain append: 'VOTE' payload: { for. against }.
    ^ for > against.

VortexCivilization >> seal
    ^ Seal new
        initialize: (SHA256 hash: self asString) asString
            steps: wormChain length
            artifact: 'vortex_' , name
            timestamp: DateAndTime now
            signature: (SHA256 hash: self asString) asString;
        yourself.

VortexCivilization >> verify: expectedSeal
    ^ self seal hash = expectedSeal hash.

"═══════════════════════════════════════════════════════════════"
"SEALED IMAGE — WORM-sealed Smalltalk image"
"═══════════════════════════════════════════════════════════════"

Object subclass: #SealedImage
    instanceVariableNames: 'hash wormChain'
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-WORM'.

SealedImage class >> seal
    | imageHash |
    imageHash := (SHA256 hash: Smalltalk image name) asString.
    ^ self new initialize: imageHash.

SealedImage >> initialize: anImageHash
    hash := anImageHash.
    wormChain := WormChain new.
    wormChain append: 'IMAGE_SEALED' payload: hash.

SealedImage >> hash
    ^ hash.

SealedImage >> verify
    ^ wormChain verify.

SealedImage >> length
    ^ wormChain length.

SealedImage class >> genesis: phrases
    phrases do: [:phrase |
        Transcript show: phrase; cr.
    ].
    Transcript show: 'Ω'; cr.

"═══════════════════════════════════════════════════════════════"
"TENSOR OPERATIONS — Linear tensor flow"
"═══════════════════════════════════════════════════════════════"

Object subclass: #TensorOps
    instanceVariableNames: ''
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-Tensor'.

TensorOps class >> alloc: aShape dtype: aDtype
    ^ Tensor new initialize: aShape dtype: aDtype.

TensorOps class >> free: aTensor
    aTensor consume.

TensorOps class >> matmul: aCap a: aTensor b: anotherTensor
    | output |
    aCap consume.
    aTensor consume.
    anotherTensor consume.
    output := Tensor new initialize: { aTensor shape first. anotherTensor shape last } dtype: 'f32'.
    ^ output.

TensorOps class >> flashAttn: aCap q: q k: k v: v
    | output |
    aCap consume.
    q consume.
    k consume.
    v consume.
    output := Tensor new initialize: q shape dtype: 'f32'.
    ^ output.

TensorOps class >> quantizeFp8: aCap input: anInput
    | output |
    aCap consume.
    anInput consume.
    output := Tensor new initialize: anInput shape dtype: 'fp8'.
    ^ output.

TensorOps class >> rmsNorm: aCap input: anInput weight: aWeight
    | output |
    aCap consume.
    anInput consume.
    aWeight consume.
    output := Tensor new initialize: anInput shape dtype: 'f32'.
    ^ output.

TensorOps class >> rope: aCap input: anInput freqs: aFreqs
    | output |
    aCap consume.
    anInput consume.
    aFreqs consume.
    output := Tensor new initialize: anInput shape dtype: 'f32'.
    ^ output.

TensorOps class >> silu: aCap input: anInput
    | output |
    aCap consume.
    anInput consume.
    output := Tensor new initialize: anInput shape dtype: 'f32'.
    ^ output.

TensorOps class >> softmax: aCap input: anInput
    | output |
    aCap consume.
    anInput consume.
    output := Tensor new initialize: anInput shape dtype: 'f32'.
    ^ output.

TensorOps class >> sealTensor: anInput
    | seal |
    seal := Seal new
        initialize: (SHA256 hash: anInput asString) asString
            steps: anInput size
            artifact: 'tensor_' , anInput seal
            timestamp: DateAndTime now
            signature: (SHA256 hash: anInput asString) asString.
    ^ Verdict evidence: seal.

TensorOps class >> verifySeal: anInput expected: expectedSeal
    ^ anInput seal = expectedSeal hash.

"═══════════════════════════════════════════════════════════════"
"MoE OPERATIONS — Mixture of Experts"
"═══════════════════════════════════════════════════════════════"

Object subclass: #MoEOps
    instanceVariableNames: ''
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-MoE'.

MoEOps class >> route: aRouter input: anInput experts: experts
    | selected |
    aRouter consume.
    anInput consume.
    selected := experts first: aRouter topK.
    ^ selected.

MoEOps class >> executeExpert: anExpert input: anInput cap: aCap
    | output |
    anExpert consume.
    anInput consume.
    aCap consume.
    output := Tensor new initialize: anInput shape dtype: 'f32'.
    ^ output.

MoEOps class >> combine: outputs weights: weights
    | combined |
    outputs do: [:o | o consume].
    weights consume.
    combined := Tensor new initialize: (outputs first) shape dtype: 'f32'.
    ^ combined.

MoEOps class >> sealMoE: aRouter input: anInput outputs: outputs
    | seal |
    seal := Seal new
        initialize: (SHA256 hash: aRouter asString , anInput asString) asString
            steps: (outputs inject: 0 into: [:sum :o | sum + o size])
            artifact: 'moe_' , aRouter name
            timestamp: DateAndTime now
            signature: (SHA256 hash: aRouter asString) asString.
    ^ Verdict evidence: seal.

"═══════════════════════════════════════════════════════════════"
"MODEL OPERATIONS — Complete LLM"
"═══════════════════════════════════════════════════════════════"

Object subclass: #ModelOps
    instanceVariableNames: ''
    classVariableNames: ''
    poolDictionaries: ''
    category: 'SnaklTalk-LLM'.

ModelOps class >> loadModel: aWasmPath weights: aWeightsPath
    | model weightsSeal |
    weightsSeal := (SHA256 hash: aWeightsPath) asString.
    model := Model new
        initialize: 'sovereign-llm'
            version: '0.1.0'
            numLayers: 12
            hiddenDim: 4096
            numExperts: 8
            weightsSeal: weightsSeal.
    ^ model.

ModelOps class >> forward: aModel input: anInput cap: aCap
    | output verdict |
    aModel consume.
    anInput consume.
    aCap consume.
    output := Tensor new initialize: { anInput shape first. aModel hiddenDim } dtype: 'f32'.
    verdict := TensorOps sealTensor: output.
    ^ { output. verdict }.

ModelOps class >> generate: aModel prompt: aPrompt cap: aCap maxTokens: anInt
    | completion verdict |
    aModel consume.
    aPrompt consume.
    aCap consume.
    completion := Tensor new initialize: { aPrompt shape first. anInt } dtype: 'f32'.
    verdict := TensorOps sealTensor: completion.
    ^ { completion. verdict }.

ModelOps class >> sealModel: aModel
    | seal |
    seal := Seal new
        initialize: (SHA256 hash: aModel asString) asString
            steps: aModel numLayers * 1000
            artifact: 'model_' , aModel name
            timestamp: DateAndTime now
            signature: (SHA256 hash: aModel asString) asString.
    ^ Verdict evidence: seal.

ModelOps class >> verifyModel: aModel expected: expectedSeal
    ^ aModel weightsSeal = expectedSeal hash.

"═══════════════════════════════════════════════════════════════"
"ERRANT GENESIS SEAL"
"═══════════════════════════════════════════════════════════════"

"ERRANT_GENESIS_001"
SealedImage genesis: #(
    'Forth is the metal.'
    'Prolog is the law.'
    'Linear types are the vow.'
    'WORM is the memory.'
    'Objects are linear. Messages are capabilities. The image is WORM-sealed.'
    'Ω'
).
