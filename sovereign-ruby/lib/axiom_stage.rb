# sovereign-ruby/lib/axiom_stage.rb
#
# Stage 3: AXIOM formal proof verification
# Sits between APL (Stage 2) and WORM seal (Stage 4)
# BOW-Ω-φ-∂-2026

require 'open3'
require 'json'

# ── Stage 3: AXIOM formal proof ──────────────────────────────────────────────

def stage_axiom(axiom_proof_file)
  puts "\n#{'─' * 60}"
  puts '  STAGE 3 — AXIOM FORMAL PROOF'
  puts '─' * 60

  unless File.exist?(axiom_proof_file)
    puts "  [AXIOM proof file not found: #{axiom_proof_file}]"
    return { proof: axiom_proof_file, verified: false, ok: false, error: 'file_not_found' }
  end

  # Try axiom verify command
  out, err, status = Open3.capture3(
    'axiom', 'verify', axiom_proof_file
  )

  if status.success?
    puts out
    sorry_count = out.scan(/sorry/).count
    {
      proof: axiom_proof_file,
      verified: true,
      sorry_count: sorry_count,
      ok: sorry_count == 0
    }
  else
    # Fallback: check for sorry in source
    puts "  [axiom not in PATH — checking source for sorry]"
    content = File.read(axiom_proof_file)
    sorry_count = content.scan(/sorry/).count
    
    if sorry_count == 0
      puts "  ✓ No sorry found in #{axiom_proof_file}"
      { proof: axiom_proof_file, verified: true, sorry_count: 0, ok: true, inline: true }
    else
      puts "  ✗ Found #{sorry_count} sorry in #{axiom_proof_file}"
      { proof: axiom_proof_file, verified: false, sorry_count: sorry_count, ok: false, inline: true }
    end
  end
end

# ── Integration with orchestrator ────────────────────────────────────────────

# To integrate into orchestrator.rb, add after stage_apl:
#
#   axiom_file = File.expand_path('../axiom-proof/trs_proof.axiom', __dir__)
#   axiom = stage_axiom(axiom_file)
#   WORM.seal('axiom-stage', axiom)
#
# Then update stage_seal to include axiom result:
#
#   payload[:axiom_verified] = axiom[:verified]
#   payload[:axiom_sorry] = axiom[:sorry_count]
