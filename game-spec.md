# Marble Ludo — Game Spec (marble-draw rules)

- Players: 4 (P1..P4), each with 4 tokens.
- Board: 5x5 grid with an outer loop and a 4-step inner home stretch.
- Marble draw: On a turn player draws 4 marbles (white/black).
  - whites: 1 -> steps 1
  - whites: 2 -> steps 2
  - whites: 3 -> steps 2
  - whites: 0 -> steps 4 (all black)
  - whites: 4 -> steps 8 (outer) or 9 (inner)
  - allSame (0 or 4 whites) grants extra turn.
- Leaving home: token leaves home only when allSame true.
- Inner entry: allowed only after token.hasCaptured === true.
- Capture: landing on opponent token in outer (non-safe) cell sends them home; capturing token gets hasCaptured = true.
- Win: first player to finish all 4 tokens wins.
- UI: click a token to select and apply the last roll; Draw Marbles button to roll.
