(ns sovereign.core
  "Entry point — runs the symbolic TRS report.
   BOW-Ω-φ-∂-2026"
  (:require [sovereign.resonance :as r]))

(defn -main [& _args]
  (r/report))
