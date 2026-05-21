(() => {
  const Renderer = window.MarbleLudoRenderer;

  const SAFE_ZONES = [
    { x: 2, y: 4 },
    { x: 4, y: 2 },
    { x: 2, y: 0 },
    { x: 0, y: 2 }
  ];

  const FINISH_CELL = { x: 2, y: 2 };

  // Outer loop anticlockwise.
  const OUTER_PATH = [
    { x: 2, y: 4 }, // bottom safe
    { x: 3, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 3 },
    { x: 4, y: 2 }, // right safe
    { x: 4, y: 1 },
    { x: 4, y: 0 },
    { x: 3, y: 0 },
    { x: 2, y: 0 }, // top safe
    { x: 1, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 }, // left safe
    { x: 0, y: 3 },
    { x: 0, y: 4 },
    { x: 1, y: 4 }
  ];

  // Inner loop clockwise around finish.
  const INNER_PATH = [
    { x: 2, y: 3 }, // from bottom side
    { x: 1, y: 3 },
    { x: 1, y: 2 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 3, y: 2 },
    { x: 3, y: 3 }
  ];

  // Entry points into inner loop by player side.
  // Visual arrow always exists, logic checks token eligibility.
  const PLAYER_DEFS = [
    {
      id: "red",
      name: "Red",
      color: "#ef4444",
      safeZone: { x: 2, y: 4 },
      outerStartIndex: 0,
      innerEntryOuterIndex: 15, // move from bottom side into inner[0]
      innerStartIndex: 0
    },
    {
      id: "green",
      name: "Green",
      color: "#22c55e",
      safeZone: { x: 4, y: 2 },
      outerStartIndex: 4,
      innerEntryOuterIndex: 3, // right side to inner[2]? handled by mapping below
      innerStartIndex: 2
    },
    {
      id: "yellow",
      name: "Yellow",
      color: "#eab308",
      safeZone: { x: 2, y: 0 },
      outerStartIndex: 8,
      innerEntryOuterIndex: 7,
      innerStartIndex: 4
    },
    {
      id: "purple",
      name: "Purple",
      color: "#a855f7",
      safeZone: { x: 0, y: 2 },
      outerStartIndex: 12,
      innerEntryOuterIndex: 11,
      innerStartIndex: 6
    }
  ];

  const INNER_ENTRY_VISUALS = {
    red: {
      a: { x: 2, y: 4 },
      b: { x: 2, y: 3 },
      c: { x: 2, y: 3 }
    },
    green: {
      a: { x: 4, y: 2 },
      b: { x: 3, y: 2 },
      c: { x: 3, y: 2 }
    },
    yellow: {
      a: { x: 2, y: 0 },
      b: { x: 2, y: 1 },
      c: { x: 2, y: 1 }
    },
    purple: {
      a: { x: 0, y: 2 },
      b: { x: 1, y: 2 },
      c: { x: 1, y: 2 }
    }
  };

  let game = null;
  let animationFrameId = null;

  function createGameState() {
    const players = PLAYER_DEFS.map((def, index) => ({
      ...def,
      index,
      totalCaptures: 0,
      tokens: Array.from({ length: 4 }, (_, tokenIndex) => ({
        id: `${def.id}-token-${tokenIndex}`,
        ownerId: def.id,
        homeSlotIndex: tokenIndex,
        subIndex: tokenIndex,
        state: "home", // home | outer | inner | finished
        outerIndex: null,
        innerIndex: null,
        finishSlotIndex: tokenIndex,
        outerStepsMoved: 0,
        capturesMade: 0
      }))
    }));

    return {
      players,
      currentPlayerIndex: 0,
      currentMarbles: [],
      currentMoveValue: 0,
      drawLabel: "",
      drawResolved: false,
      selectableTokenIds: new Set(),
      winnerId: null,
      statusMessage: 'Click "Draw Marbles" to begin.',
      animating: false,
      animationTokenId: null,
      animationPosition: null,
      extraTurnChain: 0,
      pendingExtraTurn: false,

      safeZones: SAFE_ZONES,
      finishCell: FINISH_CELL,
      outerPath: OUTER_PATH,
      innerPath: INNER_PATH,
      innerEntryVisuals: INNER_ENTRY_VISUALS
    };
  }

  function init() {
    game = createGameState();
    bindEvents();
    renderAll();
    window.addEventListener("resize", renderAll);
  }

  function bindEvents() {
    Renderer.bindButtons(handleDrawClick, handleNewGameClick);
    Renderer.bindCanvasClick(handleCanvasClick);
  }

  function handleNewGameClick() {
    stopAnimation();
    game = createGameState();
    renderAll();
  }

  function renderAll() {
    assignDynamicSubIndexes();
    Renderer.drawBoard(game);
    Renderer.renderMarbleDisplay(game.currentMarbles);
    Renderer.renderPlayerPanels(game);
    Renderer.updateStatus(game);
  }

  function assignDynamicSubIndexes() {
    const cellGroups = new Map();

    for (const player of game.players) {
      for (const token of player.tokens) {
        let key = null;

        if (token.state === "home") {
          key = `home-${player.id}-${player.safeZone.x},${player.safeZone.y}`;
        } else if (token.state === "outer") {
          const c = OUTER_PATH[token.outerIndex];
          key = `outer-${c.x},${c.y}`;
        } else if (token.state === "inner") {
          const c = INNER_PATH[token.innerIndex];
          key = `inner-${c.x},${c.y}`;
        } else if (token.state === "finished") {
          key = `finish-${FINISH_CELL.x},${FINISH_CELL.y}`;
        }

        if (!cellGroups.has(key)) {
          cellGroups.set(key, []);
        }
        cellGroups.get(key).push(token);
      }
    }

    for (const group of cellGroups.values()) {
      group.forEach((token, index) => {
        token.subIndex = index % 4;
      });
    }
  }

  function handleDrawClick() {
    if (game.winnerId !== null || game.animating || game.drawResolved) {
      return;
    }

    const marbles = drawFourMarbles();
    const moveData = resolveMarbleSteps(marbles);

    game.currentMarbles = marbles;
    game.currentMoveValue = moveData.steps;
    game.drawLabel = moveData.label;
    game.drawResolved = true;
    game.pendingExtraTurn = moveData.allSame;
    game.selectableTokenIds = getSelectableTokenIdsForCurrentPlayer(moveData);

    const currentPlayer = getCurrentPlayer();

    if (game.selectableTokenIds.size === 0) {
      if (moveData.entryAllowed) {
        game.statusMessage = `${currentPlayer.name} drew ${moveData.label}. No valid token can move.`;
      } else {
        game.statusMessage = `${currentPlayer.name} drew ${moveData.label}. Home tokens cannot leave unless all marbles match.`;
      }

      renderAll();

      setTimeout(() => {
        if (!game.animating && game.winnerId === null) {
          finishTurn(false);
        }
      }, 700);
      return;
    }

    game.statusMessage = `${currentPlayer.name} drew ${moveData.label}. Select one token to move.`;
    renderAll();
  }

  function drawFourMarbles() {
    const marbles = [];
    for (let i = 0; i < 4; i++) {
      marbles.push(Math.random() < 0.5 ? "white" : "black");
    }
    return marbles;
  }

  function resolveMarbleSteps(marbles) {
    const whiteCount = marbles.filter(m => m === "white").length;
    const blackCount = 4 - whiteCount;
    const allSame = whiteCount === 4 || blackCount === 4;

    let steps;
    let label;

    if (whiteCount === 1) {
      steps = 1;
      label = "1 white";
    } else if (whiteCount === 2) {
      steps = 2;
      label = "2 whites";
    } else if (whiteCount === 3) {
      steps = 2;
      label = "3 whites";
    } else if (whiteCount === 4) {
      steps = 8; // outer default, inner becomes 9 per token validation
      label = "4 whites";
    } else {
      steps = 4;
      label = "4 blacks";
    }

    return {
      marbles,
      whiteCount,
      blackCount,
      steps,
      label,
      allSame,
      entryAllowed: allSame
    };
  }

  function handleCanvasClick(point) {
    if (game.winnerId !== null || game.animating || !game.drawResolved) {
      return;
    }

    const tokenId = Renderer.hitTestToken(game, point);
    if (!tokenId) {
      return;
    }

    if (!game.selectableTokenIds.has(tokenId)) {
      return;
    }

    const player = getCurrentPlayer();
    const token = player.tokens.find(t => t.id === tokenId);
    if (!token) return;

    moveSelectedToken(player, token);
  }

  function getCurrentPlayer() {
    return game.players[game.currentPlayerIndex];
  }

  function getSelectableTokenIdsForCurrentPlayer(moveData) {
    const player = getCurrentPlayer();
    const selectable = new Set();

    for (const token of player.tokens) {
      if (isMoveValidForToken(player, token, moveData)) {
        selectable.add(token.id);
      }
    }

    return selectable;
  }

  function isMoveValidForToken(player, token, moveData) {
    if (token.state === "finished") {
      return false;
    }

    if (token.state === "home") {
      return moveData.allSame;
    }

    if (token.state === "outer") {
      const steps = getActualStepCountForToken(token, moveData);
      if (canEnterInnerLoop(player, token, steps)) {
        return true;
      }
      return true;
    }

    if (token.state === "inner") {
      const steps = getActualStepCountForToken(token, moveData);
      return token.innerIndex + steps <= INNER_PATH.length;
    }

    return false;
  }

  function getActualStepCountForToken(token, moveData) {
    if (moveData.whiteCount === 4) {
      return token.state === "inner" ? 9 : 8;
    }
    return moveData.steps;
  }

  function canEnterInnerLoop(player, token, steps) {
    if (token.state !== "outer") return false;
    if (token.outerStepsMoved < OUTER_PATH.length) return false;
    if (token.capturesMade < 1) return false;

    const playerEntryOuterIndex = player.innerEntryOuterIndex;
    const current = token.outerIndex;
    const target = (current + steps) % OUTER_PATH.length;

    const distanceToEntry = (playerEntryOuterIndex - current + OUTER_PATH.length) % OUTER_PATH.length;

    if (distanceToEntry === 0) {
      return false;
    }

    if (steps < distanceToEntry) {
      return false;
    }

    const remainingAfterEntry = steps - distanceToEntry - 1;
    return remainingAfterEntry <= INNER_PATH.length;
  }

  function moveSelectedToken(player, token) {
    const moveData = resolveMarbleSteps(game.currentMarbles);
    const steps = getActualStepCountForToken(token, moveData);

    const plan = buildMovementPlan(player, token, steps, moveData);
    if (!plan.valid) {
      return;
    }

    game.animating = true;
    game.animationTokenId = token.id;
    game.selectableTokenIds.clear();

    animateMovement(player, token, plan)
      .then(result => {
        applyLandingEffects(player, token, result.finalCellType);

        if (checkPlayerWin(player)) {
          game.winnerId = player.id;
          game.drawResolved = false;
          game.statusMessage = `${player.name} wins the game!`;
          game.currentMarbles = [];
          renderAll();
          return;
        }

        const extraTurn = game.pendingExtraTurn || result.captureOccurred || result.finishedNow;
        finishTurn(extraTurn);
      })
      .catch(() => {
        game.animating = false;
        game.animationTokenId = null;
        game.animationPosition = null;
        renderAll();
      });
  }

  function buildMovementPlan(player, token, steps, moveData) {
    const frames = [];

    if (token.state === "home") {
      if (!moveData.allSame) {
        return { valid: false };
      }

      const startCell = player.safeZone;
      const startPos = getCellSubPosition(startCell, token.subIndex);
      frames.push({
        x: startPos.x,
        y: startPos.y,
        apply: () => {
          token.state = "outer";
          token.outerIndex = player.outerStartIndex;
          token.outerStepsMoved = 0;
          token.innerIndex = null;
        },
        cellType: "outer"
      });

      for (let i = 1; i < steps; i++) {
        const nextOuterIndex = (player.outerStartIndex + i) % OUTER_PATH.length;
        const cell = OUTER_PATH[nextOuterIndex];
        const pos = getCellSubPosition(cell, token.subIndex);

        frames.push({
          x: pos.x,
          y: pos.y,
          apply: () => {
            token.state = "outer";
            token.outerIndex = nextOuterIndex;
            token.outerStepsMoved += 1;
          },
          cellType: "outer"
        });
      }

      return {
        valid: true,
        frames,
        finalCellType: "outer"
      };
    }

    if (token.state === "outer") {
      const canInner = canEnterInnerLoop(player, token, steps);

      if (!canInner) {
        let tempIndex = token.outerIndex;

        for (let i = 0; i < steps; i++) {
          tempIndex = (tempIndex + 1) % OUTER_PATH.length;
          const cell = OUTER_PATH[tempIndex];
          const pos = getCellSubPosition(cell, token.subIndex);

          frames.push({
            x: pos.x,
            y: pos.y,
            apply: () => {
              token.outerIndex = tempIndex;
              token.outerStepsMoved += 1;
            },
            cellType: "outer"
          });
        }

        return {
          valid: true,
          frames,
          finalCellType: "outer"
        };
      }

      const entryIndex = player.innerEntryOuterIndex;
      const distanceToEntry = (entryIndex - token.outerIndex + OUTER_PATH.length) % OUTER_PATH.length;

      let tempOuterIndex = token.outerIndex;

      for (let i = 0; i < distanceToEntry; i++) {
        tempOuterIndex = (tempOuterIndex + 1) % OUTER_PATH.length;
        const cell = OUTER_PATH[tempOuterIndex];
        const pos = getCellSubPosition(cell, token.subIndex);

        frames.push({
          x: pos.x,
          y: pos.y,
          apply: () => {
            token.outerIndex = tempOuterIndex;
            token.outerStepsMoved += 1;
          },
          cellType: "outer"
        });
      }

      const firstInnerIndex = player.innerStartIndex;
      const firstInnerCell = INNER_PATH[firstInnerIndex];
      const firstInnerPos = getCellSubPosition(firstInnerCell, token.subIndex);

      frames.push({
        x: firstInnerPos.x,
        y: firstInnerPos.y,
        apply: () => {
          token.state = "inner";
          token.innerIndex = firstInnerIndex;
          token.outerIndex = null;
        },
        cellType: "inner"
      });

      let remaining = steps - distanceToEntry - 1;
      let tempInnerIndex = firstInnerIndex;

      while (remaining > 0) {
        tempInnerIndex = (tempInnerIndex + 1) % INNER_PATH.length;
        const cell = INNER_PATH[tempInnerIndex];
        const pos = getCellSubPosition(cell, token.subIndex);

        frames.push({
          x: pos.x,
          y: pos.y,
          apply: () => {
            token.state = "inner";
            token.innerIndex = tempInnerIndex;
          },
          cellType: "inner"
        });

        remaining--;
      }

      return {
        valid: true,
        frames,
        finalCellType: "inner"
      };
    }

    if (token.state === "inner") {
      if (token.innerIndex + steps > INNER_PATH.length) {
        return { valid: false };
      }

      let tempInnerIndex = token.innerIndex;

      for (let i = 0; i < steps; i++) {
        const nextIndex = tempInnerIndex + 1;

        if (nextIndex === INNER_PATH.length) {
          const finishPos = getCellSubPosition(FINISH_CELL, token.subIndex);
          frames.push({
            x: finishPos.x,
            y: finishPos.y,
            apply: () => {
              token.state = "finished";
              token.innerIndex = null;
              token.finishSlotIndex = getFinishedCount(player);
            },
            cellType: "finish"
          });
          tempInnerIndex = nextIndex;
        } else {
          const cell = INNER_PATH[nextIndex];
          const pos = getCellSubPosition(cell, token.subIndex);

          frames.push({
            x: pos.x,
            y: pos.y,
            apply: () => {
              token.innerIndex = nextIndex;
            },
            cellType: "inner"
          });
          tempInnerIndex = nextIndex;
        }
      }

      return {
        valid: true,
        frames,
        finalCellType: tempInnerIndex === INNER_PATH.length ? "finish" : "inner"
      };
    }

    return { valid: false };
  }

  function animateMovement(player, token, plan) {
    return new Promise((resolve, reject) => {
      if (!plan.frames.length) {
        game.animating = false;
        game.animationTokenId = null;
        game.animationPosition = null;
        renderAll();
        resolve({
          captureOccurred: false,
          finishedNow: false,
          finalCellType: plan.finalCellType
        });
        return;
      }

      let frameIndex = 0;
      let captureOccurred = false;
      let finishedNow = false;

      const stepDuration = 180;

      function runNextStep() {
        if (frameIndex >= plan.frames.length) {
          game.animating = false;
          game.animationTokenId = null;
          game.animationPosition = null;
          renderAll();

          resolve({
            captureOccurred,
            finishedNow,
            finalCellType: plan.finalCellType
          });
          return;
        }

        const step = plan.frames[frameIndex];
        const startPos = getCurrentAnimatedStartPosition(player, token);
        const endPos = { x: step.x, y: step.y };
        const startTime = performance.now();

        function tick(now) {
          const progress = Math.min(1, (now - startTime) / stepDuration);
          const eased = easeInOutQuad(progress);

          game.animationPosition = {
            x: startPos.x + (endPos.x - startPos.x) * eased,
            y: startPos.y + (endPos.y - startPos.y) * eased
          };

          renderAll();

          if (progress < 1) {
            animationFrameId = requestAnimationFrame(tick);
            return;
          }

          step.apply();
          assignDynamicSubIndexes();

          if (step.cellType === "outer") {
            const didCapture = tryCaptureAtOuterCell(player, token);
            if (didCapture) {
              captureOccurred = true;
            }
          }

          if (step.cellType === "finish") {
            finishedNow = true;
          }

          game.animationPosition = null;
          frameIndex += 1;
          renderAll();
          runNextStep();
        }

        animationFrameId = requestAnimationFrame(tick);
      }

      runNextStep();
    });
  }

  function getCurrentAnimatedStartPosition(player, token) {
    if (token.state === "home") {
      return getCellSubPosition(player.safeZone, token.subIndex);
    }

    if (token.state === "outer") {
      return getCellSubPosition(OUTER_PATH[token.outerIndex], token.subIndex);
    }

    if (token.state === "inner") {
      return getCellSubPosition(INNER_PATH[token.innerIndex], token.subIndex);
    }

    if (token.state === "finished") {
      return getCellSubPosition(FINISH_CELL, token.subIndex);
    }

    return getCellSubPosition(player.safeZone, token.subIndex);
  }

  function tryCaptureAtOuterCell(attackerPlayer, attackerToken) {
    if (attackerToken.state !== "outer") return false;

    const cell = OUTER_PATH[attackerToken.outerIndex];
    if (isSafeCell(cell)) return false;

    let captured = false;

    for (const player of game.players) {
      if (player.id === attackerPlayer.id) continue;

      for (const token of player.tokens) {
        if (token.state !== "outer") continue;

        const otherCell = OUTER_PATH[token.outerIndex];
        if (otherCell.x === cell.x && otherCell.y === cell.y) {
          token.state = "home";
          token.outerIndex = null;
          token.innerIndex = null;
          token.outerStepsMoved = 0;
          token.capturesMade = 0;
          captured = true;
        }
      }
    }

    if (captured) {
      attackerToken.capturesMade += 1;
      attackerPlayer.totalCaptures += 1;
      game.statusMessage = `${attackerPlayer.name} captured a token and earned an extra turn!`;
    }

    return captured;
  }

  function applyLandingEffects(player, token, finalCellType) {
    if (finalCellType === "finish") {
      game.statusMessage = `${player.name} reached the finish and earned an extra turn!`;
    } else if (!game.statusMessage.includes("captured")) {
      game.statusMessage = `${player.name} completed the move.`;
    }
  }

  function finishTurn(extraTurnAwarded) {
    game.drawResolved = false;
    game.currentMarbles = [];
    game.currentMoveValue = 0;
    game.drawLabel = "";
    game.selectableTokenIds.clear();
    game.animating = false;
    game.animationTokenId = null;
    game.animationPosition = null;

    if (game.winnerId !== null) {
      renderAll();
      return;
    }

    if (extraTurnAwarded && game.extraTurnChain < 2) {
      game.extraTurnChain += 1;
      game.statusMessage = `${getCurrentPlayer().name} gets an extra turn.`;
    } else {
      game.extraTurnChain = 0;
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      game.statusMessage = `${getCurrentPlayer().name}'s turn. Draw marbles.`;
    }

    renderAll();
  }

  function checkPlayerWin(player) {
    return player.tokens.every(token => token.state === "finished");
  }

  function getFinishedCount(player) {
    return player.tokens.filter(t => t.state === "finished").length;
  }

  function isSafeCell(cell) {
    return SAFE_ZONES.some(s => s.x === cell.x && s.y === cell.y);
  }

  function getCellSubPosition(cell, subIndex) {
    const canvas = document.getElementById("gameCanvas");
    const rect = canvas.getBoundingClientRect();
    const size = rect.width;
    const cellSize = size / 5;

    const offsets = [
      { x: cellSize * 0.32, y: cellSize * 0.32 },
      { x: cellSize * 0.68, y: cellSize * 0.32 },
      { x: cellSize * 0.32, y: cellSize * 0.68 },
      { x: cellSize * 0.68, y: cellSize * 0.68 }
    ];

    const offset = offsets[subIndex % 4];
    return {
      x: cell.x * cellSize + offset.x,
      y: cell.y * cellSize + offset.y
    };
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function stopAnimation() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  init();
})();
