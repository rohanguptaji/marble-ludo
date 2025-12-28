# Marble Ludo — gh-pages (MVP)

This branch contains an MVP implementation of Marble Ludo using the marble-draw rules and is published to GitHub Pages.

How to run locally:
1. Clone the repo (or fetch branch):
   git fetch origin
   git checkout gh-pages
2. Open `index.html` in your browser or use VS Code Live Server.
3. Click "Draw Marbles" to roll, then click a token to apply the roll.

What is implemented:
- Engine separated into `engine.js`.
- Renderer/UI in `renderer.js`.
- Marble-draw rules, move, capture, win detection.
- Basic UI: canvas board, player boxes, marble display, log.

Next steps:
- Add movement animation.
- Improve UX (confirm moves, move preview).
- Tests for engine logic.

Thank you.
