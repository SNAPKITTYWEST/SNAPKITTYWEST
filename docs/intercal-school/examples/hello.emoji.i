# hello.emoji.i — example emoji INTERCAL program
# Politeness ratio target: between 1/5 and 1/3 of statements have 🙏
# 6 statements total → need 2 with 🙏 (33%) — right at the upper edge, use 2 (33%)

🙏 🔄 x 42          # PLEASE interleave-assign x = 42
🔢 x                 # READ OUT x  (print)
🙏 🔄 y 7            # PLEASE interleave-assign y = 7
🎲 🔢 y              # probabilistic: maybe print y
🔄 z 0               # interleave-assign z = 0
🏁                   # GIVE UP (terminate)
