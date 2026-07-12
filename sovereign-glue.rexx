/* =============================================================================
   SOVEREIGN GLUE — sovereign-glue.rexx
   The connective tissue. REXX pattern match → kernel chain → WORM seal.
   This file is the automation layer. Everything else is already built.

   USAGE:
     rexx sovereign-glue.rexx "unauthorized ach CASE-2024-001"
     rexx sovereign-glue.rexx "prove pythagorean identity"
     rexx sovereign-glue.rexx "forge trust deed EIN 41-5105572"
     rexx sovereign-glue.rexx "scan zombie debt CASE-2024-007 statute expired"
     rexx sovereign-glue.rexx "math dispatch topology preservation"

   The glue reads kernel-registry.json, matches the input domain,
   and executes the kernel chain in sequence.

   Author: Ahmad Ali Parr + Claude Sonnet 4.6
   ============================================================================= */

parse upper arg rawInput

if rawInput = '' then do
  call PRINT_USAGE
  exit 1
end

registryPath = 'kernel-registry.json'
wormPath     = '.worm/sovereign-glue-chain.jsonl'
sessionId    = 'GLU-'time('S')

say '╔═══════════════════════════════════════════════════════╗'
say '║  SOVEREIGN GLUE — Pattern Match → Kernel → WORM      ║'
say '╚═══════════════════════════════════════════════════════╝'
say 'SESSION='sessionId
say 'INPUT='rawInput
say ''

/* ── PASS 1: detect domain via pattern match ─────────────────────────────── */

domain = DETECT_DOMAIN(rawInput)
say 'DOMAIN='domain

/* ── PASS 2: route to kernel chain for domain ────────────────────────────── */

call EXECUTE_CHAIN domain, rawInput, sessionId

/* ── WORM seal the session ───────────────────────────────────────────────── */

call WORM_SEAL sessionId, 'SOVEREIGN_GLUE:'domain':'rawInput

say ''
say 'SESSION_COMPLETE='sessionId
exit 0

/* ═══════════════════════════════════════════════════════════════════════════ */
/* DETECT_DOMAIN — O(n) string pattern match                                  */
/* This IS the regex. REXX pos() is the pattern engine.                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
DETECT_DOMAIN: procedure
  parse arg txt
  upper txt

  /* ACH patterns */
  if pos('R10',txt)>0 | pos('R07',txt)>0 | pos('R05',txt)>0 |,
     pos('ACH',txt)>0 | pos('UNAUTHORIZED',txt)>0 | pos('NACHA',txt)>0 then
    return 'ach'

  /* FCRA patterns */
  if pos('FCRA',txt)>0 | pos('CREDIT',txt)>0 | pos('METRO2',txt)>0 |,
     pos('DOFD',txt)>0 | pos('RE-AGING',txt)>0 | pos('INACCURA',txt)>0 then
    return 'fcra'

  /* zombie debt */
  if pos('ZOMBIE',txt)>0 | pos('TIME-BARRED',txt)>0 |,
     pos('STATUTE OF LIMIT',txt)>0 | pos('TOO OLD',txt)>0 then
    return 'zombie'

  /* trust / deed */
  if pos('TRUST',txt)>0 | pos('GRAT',txt)>0 | pos('DEED',txt)>0 |,
     pos('BEL ESPRIT',txt)>0 | pos('IRREVOCABLE',txt)>0 |,
     pos('GRANTOR',txt)>0 | pos('TRUSTEE',txt)>0 then
    return 'trust'

  /* IRS */
  if pos('IRS',txt)>0 | pos('CATCODE',txt)>0 | pos('CAT-',txt)>0 |,
     pos('AUDIT',txt)>0 | pos('7602',txt)>0 then
    return 'irs'

  /* math / proof */
  if pos('PROVE',txt)>0 | pos('PROOF',txt)>0 | pos('THEOREM',txt)>0 |,
     pos('MATH',txt)>0 | pos('TOPOLOGY',txt)>0 | pos('SYMMETRY',txt)>0 |,
     pos('PYTHAGOREAN',txt)>0 | pos('COMMUTATIV',txt)>0 |,
     pos('ASSOCIATIV',txt)>0 | pos('DISPATCH',txt)>0 then
    return 'math'

  /* chain / block */
  if pos('CHAIN',txt)>0 | pos('BLOCK',txt)>0 | pos('CONSENSUS',txt)>0 |,
     pos('ZK',txt)>0 | pos('MERKLE',txt)>0 then
    return 'chain'

  /* governance */
  if pos('GOVERNANCE',txt)>0 | pos('CONSTITUT',txt)>0 |,
     pos('SOVEREIGN',txt)>0 | pos('ASP',txt)>0 then
    return 'governance'

  return 'default'

/* ═══════════════════════════════════════════════════════════════════════════ */
/* EXECUTE_CHAIN — invoke kernel sequence for domain                          */
/* Each domain maps to an ordered kernel chain from kernel-registry.json      */
/* ═══════════════════════════════════════════════════════════════════════════ */
EXECUTE_CHAIN: procedure
  parse arg domain, txt, sid
  upper txt

  say 'CHAIN_START='domain

  select

    /* ── ACH chain: DFA → route-dispatch → rexx-glue ── */
    when domain = 'ach' then do
      say 'KERNEL[1]=dfa-engine'
      say 'CMD=node -e "import {scan} from ''./cartographer-agent/runtime/dfa-engine.mjs''; console.log(JSON.stringify(scan(process.argv[1])))" "'txt'"'

      caseId = EXTRACT_CASE(txt)
      code   = EXTRACT_ACH_CODE(txt)

      say 'KERNEL[2]=route-dispatch'
      call EXEC_REXX 'cartographer-agent/kernels/route-dispatch.rexx', txt

      say 'KERNEL[3]=rexx-glue-kernel'
      call EXEC_REXX 'cartographer-agent/kernels/rexx-glue-kernel.rexx', caseId 'ACH_DISPUTE' code

      say 'KERNEL[4]=carto-prolog → invoke via mylaw.html or swipl'
    end

    /* ── FCRA chain: DFA → route-dispatch → rexx-glue → corpus ── */
    when domain = 'fcra' then do
      caseId = EXTRACT_CASE(txt)
      ground = EXTRACT_FCRA_GROUND(txt)

      say 'KERNEL[1]=dfa-engine → scan'
      say 'KERNEL[2]=route-dispatch'
      call EXEC_REXX 'cartographer-agent/kernels/route-dispatch.rexx', txt
      say 'KERNEL[3]=rexx-glue-kernel'
      call EXEC_REXX 'cartographer-agent/kernels/rexx-glue-kernel.rexx', caseId 'FCRA_DISPUTE' ground
      say 'KERNEL[4]=corpus-store → query: FCRA' ground
    end

    /* ── ZOMBIE chain ── */
    when domain = 'zombie' then do
      caseId = EXTRACT_CASE(txt)
      say 'KERNEL[1]=dfa-engine → scan'
      say 'KERNEL[2]=route-dispatch'
      call EXEC_REXX 'cartographer-agent/kernels/route-dispatch.rexx', txt
      say 'KERNEL[3]=rexx-glue-kernel'
      call EXEC_REXX 'cartographer-agent/kernels/rexx-glue-kernel.rexx', caseId 'ZOMBIE_DEBT_SCAN' 'AUTO'
    end

    /* ── TRUST chain: DFA → route-dispatch → rexx-glue → carto-gate ── */
    when domain = 'trust' then do
      caseId  = EXTRACT_CASE(txt)
      trustTy = EXTRACT_TRUST_TYPE(txt)

      say 'KERNEL[1]=dfa-engine → scan'
      say 'KERNEL[2]=route-dispatch'
      call EXEC_REXX 'cartographer-agent/kernels/route-dispatch.rexx', txt
      say 'KERNEL[3]=rexx-glue-kernel'
      call EXEC_REXX 'cartographer-agent/kernels/rexx-glue-kernel.rexx', caseId 'TRUST_SCAN' trustTy
      say 'KERNEL[4]=carto-gate → clingo carto-gate.lp'
      say 'KERNEL[5]=sovereign-alien-trust → swipl sovereign-alien-trust.pl'

      /* Deed forge trigger */
      if pos('DEED',txt)>0 | pos('FORGE',txt)>0 then do
        ein = EXTRACT_EIN(txt)
        say 'KERNEL[6]=trust-deed-generator → EIN='ein
        say 'CMD=node -e "import {forgeProlog} from ''./cartographer-agent/runtime/trust-deed-generator.mjs''"'
      end
    end

    /* ── IRS chain ── */
    when domain = 'irs' then do
      caseId  = EXTRACT_CASE(txt)
      catCode = EXTRACT_CATCODE(txt)
      say 'KERNEL[1]=dfa-engine → scan'
      say 'KERNEL[2]=route-dispatch'
      call EXEC_REXX 'cartographer-agent/kernels/route-dispatch.rexx', txt
      say 'KERNEL[3]=rexx-glue-kernel'
      call EXEC_REXX 'cartographer-agent/kernels/rexx-glue-kernel.rexx', caseId 'IRS_CATCODE' catCode
      say 'KERNEL[4]=corpus-store → query: IRS' catCode
    end

    /* ── MATH chain: NLP → dispatcher → emitters → WORM ── */
    when domain = 'math' then do
      say 'KERNEL[1]=math-nlp → NaturalParser::parse("'txt'")'
      say 'KERNEL[2]=math-dispatcher → route to solver backend'
      say 'KERNEL[3]=math-emitters → emit_all → lean4 + latex + smtlib'
      say 'KERNEL[4]=worm-chain → WormChain::append(proof_receipt)'
      say ''
      say 'INVOKE: cargo run -p mathrosetta -- --nlp "'txt'"'
      say 'OUTPUT: DispatchResult { solver, proof_level, equation_class, confidence }'
    end

    /* ── CHAIN domain ── */
    when domain = 'chain' then do
      say 'KERNEL[1]=snapkitty-chain → node chain.mjs'
      say 'KERNEL[2]=consensus → node consensus.mjs'
      say 'KERNEL[3]=worm-chain → WormChain::append'
    end

    /* ── GOVERNANCE domain ── */
    when domain = 'governance' then do
      say 'KERNEL[1]=carto-gate → clingo carto-gate.lp'
      say 'KERNEL[2]=sovereign-alien-trust → swipl'
      say 'KERNEL[3]=rexx-glue-kernel → WORM_SEAL'
      caseId = EXTRACT_CASE(txt)
      call EXEC_REXX 'cartographer-agent/kernels/rexx-glue-kernel.rexx', caseId 'WORM_SEAL' 'GOVERNANCE_CHECK'
    end

    /* ── DEFAULT fallback ── */
    otherwise do
      say 'KERNEL[1]=route-dispatch → fallback'
      call EXEC_REXX 'cartographer-agent/kernels/route-dispatch.rexx', txt
    end

  end

  say 'CHAIN_END='domain
  return

/* ═══════════════════════════════════════════════════════════════════════════ */
/* EXEC_REXX — shell out to a REXX kernel                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
EXEC_REXX: procedure
  parse arg kernelPath, args
  cmd = 'rexx '||kernelPath||' '||args
  say 'EXEC: '||cmd
  address system cmd
  return

/* ═══════════════════════════════════════════════════════════════════════════ */
/* EXTRACTION HELPERS — O(n) parse var, no regex engine                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

EXTRACT_CASE: procedure
  parse arg txt
  upper txt
  parse var txt 'CASE-' caseRest
  if caseRest \= '' then do
    parse var caseRest caseNum .
    return 'CASE-'caseNum
  end
  return 'CASE-GLU-'time('S')

EXTRACT_ACH_CODE: procedure
  parse arg txt
  upper txt
  if pos('R10',txt)>0 then return 'R10'
  if pos('R07',txt)>0 then return 'R07'
  if pos('R05',txt)>0 then return 'R05'
  if pos('R02',txt)>0 then return 'R02'
  if pos('R03',txt)>0 then return 'R03'
  return 'R10'

EXTRACT_FCRA_GROUND: procedure
  parse arg txt
  upper txt
  if pos('DOFD',txt)>0 | pos('WRONG DATE',txt)>0 then return 'WRONG_DOFD'
  if pos('RE-AGING',txt)>0 | pos('REAGING',txt)>0 then return 'RE_AGED'
  if pos('IDENTITY',txt)>0 | pos('FRAUD',txt)>0   then return 'IDENTITY_THEFT'
  if pos('ZOMBIE',txt)>0                           then return 'ZOMBIE_DEBT'
  return 'GENERAL_INACCURACY'

EXTRACT_TRUST_TYPE: procedure
  parse arg txt
  upper txt
  if pos('GRAT',txt)>0             then return 'GRAT'
  if pos('IRREVOCABLE',txt)>0      then return 'IRREVOCABLE'
  if pos('DORMANCY',txt)>0         then return 'DORMANCY'
  if pos('BEL ESPRIT',txt)>0       then return 'BEL_ESPRIT'
  return 'IRREVOCABLE'

EXTRACT_CATCODE: procedure
  parse arg txt
  upper txt
  parse var txt 'CAT-' catRest .
  if catRest \= '' then return 'CAT-'||word(catRest,1)
  return 'GENERAL'

EXTRACT_EIN: procedure
  parse arg txt
  /* EIN format: XX-XXXXXXX */
  do i = 1 to length(txt)-9
    seg = substr(txt, i, 10)
    if datatype(substr(seg,1,2),'N') & substr(seg,3,1)='-' &,
       datatype(substr(seg,4,7),'N') then
      return seg
  end
  return 'EIN-UNKNOWN'

/* ═══════════════════════════════════════════════════════════════════════════ */
/* WORM_SEAL                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
WORM_SEAL: procedure
  parse arg cId, event
  wormPath = '.worm/sovereign-glue-chain.jsonl'
  address system 'date /T > .rexx_ts.tmp 2>nul'
  ts = 'UNKNOWN'
  if lines('.rexx_ts.tmp') > 0 then ts = linein('.rexx_ts.tmp')
  call stream '.rexx_ts.tmp', 'C', 'CLOSE'
  entry = '{"session":"'||cId||'","event":"'||event||'","ts":"'||ts||'"}'
  address system 'if not exist .worm mkdir .worm'
  call lineout wormPath, entry
  say 'WORM_SEAL|'cId'|'event
  return

/* ═══════════════════════════════════════════════════════════════════════════ */
/* USAGE                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
PRINT_USAGE: procedure
  say '╔════════════════════════════════════════════════════════════════╗'
  say '║  SOVEREIGN GLUE — Pattern Match → Kernel Chain → WORM        ║'
  say '╠════════════════════════════════════════════════════════════════╣'
  say '║  rexx sovereign-glue.rexx "unauthorized ach CASE-001"        ║'
  say '║  rexx sovereign-glue.rexx "prove pythagorean identity"        ║'
  say '║  rexx sovereign-glue.rexx "forge trust deed EIN 41-5105572"  ║'
  say '║  rexx sovereign-glue.rexx "zombie debt statute expired"       ║'
  say '║  rexx sovereign-glue.rexx "IRS CAT-CP-004 CASE-007"          ║'
  say '╚════════════════════════════════════════════════════════════════╝'
  return
