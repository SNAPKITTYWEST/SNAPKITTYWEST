#!/usr/bin/env python3
"""
Ramsey R(3,3) Proof - Prove R(3,3) = 6
"""

import sys
import json
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from constitutional_boot import WORMChain
from axiom_kernel import AXIOMKernel


class RamseyVerifier:
    """Verify Ramsey theorem R(3,3) = 6"""
    
    def __init__(self):
        self.kernel = AXIOMKernel()
        self.worm = WORMChain()
    
    def generate_complete_graph(self, n):
        """Generate complete graph K_n"""
        vertices = list(range(n))
        edges = [(i, j) for i in range(n) for j in range(i+1, n)]
        return {"vertices": vertices, "edges": edges}
    
    def generate_all_colorings(self, n):
        """Generate all 2-colorings of K_n edges"""
        graph = self.generate_complete_graph(n)
        num_edges = len(graph["edges"])
        
        # Generate all 2^num_edges colorings
        colorings = []
        for i in range(2**num_edges):
            coloring = {}
            for j, edge in enumerate(graph["edges"]):
                color = (i >> j) & 1  # 0 = red, 1 = blue
                coloring[edge] = color
            colorings.append(coloring)
        
        return colorings
    
    def find_monochromatic_triangle(self, graph, coloring):
        """Find monochromatic triangle in colored graph"""
        vertices = graph["vertices"]
        
        # Check all triples
        for i in range(len(vertices)):
            for j in range(i+1, len(vertices)):
                for k in range(j+1, len(vertices)):
                    # Get colors of three edges
                    edge_ij = (i, j) if (i, j) in coloring else (j, i)
                    edge_jk = (j, k) if (j, k) in coloring else (k, j)
                    edge_ik = (i, k) if (i, k) in coloring else (k, i)
                    
                    color_ij = coloring.get(edge_ij)
                    color_jk = coloring.get(edge_jk)
                    color_ik = coloring.get(edge_ik)
                    
                    # Check if all three edges have same color
                    if color_ij is not None and color_jk is not None and color_ik is not None:
                        if color_ij == color_jk == color_ik:
                            return (i, j, k, color_ij)
        
        return None
    
    def verify_k5_no_monochromatic(self):
        """Verify K_5 has coloring with no monochromatic triangle"""
        print("\n  Verifying K_5 has no monochromatic triangle...")
        
        graph = self.generate_complete_graph(5)
        colorings = self.generate_all_colorings(5)
        
        # Find coloring with no monochromatic triangle
        for coloring in colorings:
            triangle = self.find_monochromatic_triangle(graph, coloring)
            if triangle is None:
                print(f"    ✓ Found valid coloring of K_5")
                return True
        
        print(f"    ✗ All colorings of K_5 have monochromatic triangle")
        return False
    
    def verify_k6_always_monochromatic(self):
        """Verify K_6 always has monochromatic triangle"""
        print("\n  Verifying K_6 always has monochromatic triangle...")
        
        graph = self.generate_complete_graph(6)
        colorings = self.generate_all_colorings(6)
        
        # Check all colorings
        all_have_triangle = True
        for i, coloring in enumerate(colorings):
            triangle = self.find_monochromatic_triangle(graph, coloring)
            if triangle is None:
                all_have_triangle = False
                print(f"    ✗ Found coloring {i} with no monochromatic triangle")
                break
            
            if i % 1000 == 0:
                print(f"    Progress: {i}/{len(colorings)} ({i/len(colorings)*100:.1f}%)")
        
        if all_have_triangle:
            print(f"    ✓ All {len(colorings)} colorings of K_6 have monochromatic triangle")
        
        return all_have_triangle
    
    def prove_r33_equals_6(self):
        """Prove R(3,3) = 6"""
        print(f"\n{'─' * 60}")
        print(f"  RAMSEY THEOREM PROOF: R(3,3) = 6")
        print(f"{'─' * 60}")
        
        # Lower bound: K_5 has valid coloring
        k5_valid = self.verify_k5_no_monochromatic()
        
        # Upper bound: K_6 always has monochromatic triangle
        k6_valid = self.verify_k6_always_monochromatic()
        
        # R(3,3) = 6 iff both conditions hold
        r33_equals_6 = k5_valid and k6_valid
        
        print(f"\n  Proof summary:")
        print(f"    R(3,3) ≥ 6: K_5 has valid coloring = {k5_valid}")
        print(f"    R(3,3) ≤ 6: K_6 always has triangle = {k6_valid}")
        print(f"    R(3,3) = 6: {r33_equals_6}")
        
        # AXIOM proof
        print(f"\n  AXIOM proof construction...")
        proof = self.kernel.prove_phi_squared()
        
        # Seal in WORM
        self.worm.seal("RAMSEY_R33_PROVEN", {
            "theorem": "R(3,3) = 6",
            "lower_bound": "K_5 has valid coloring",
            "upper_bound": "K_6 always has monochromatic triangle",
            "k5_colorings": 2**10,
            "k6_colorings": 2**15,
            "proven": r33_equals_6,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
        
        return r33_equals_6
    
    def get_status(self):
        """Get verifier status"""
        return {
            "worm_chain_valid": self.worm.is_valid(),
            "worm_seals": len(self.worm.chain)
        }


def main():
    """Main entry point"""
    verifier = RamseyVerifier()
    
    # Prove R(3,3) = 6
    result = verifier.prove_r33_equals_6()
    
    if result:
        print(f"\n✓ Ramsey theorem R(3,3) = 6 proven")
        print(f"  Lower bound: K_5 has valid 2-coloring")
        print(f"  Upper bound: K_6 always has monochromatic triangle")
    else:
        print(f"\n✗ Ramsey proof failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
