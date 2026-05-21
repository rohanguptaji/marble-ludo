const PLAYER_CONFIGS = [
  { id: "red", name: "Red", colorClass: "red", startTrackIndex: 0, homeCells: [0, 1, 2, 3], finishCells: [0, 1, 2, 3] },
  { id: "blue", name: "Blue", colorClass: "blue", startTrackIndex: 8, homeCells: [0, 1, 2, 3], finishCells: [0, 1, 2, 3] },
  { id: "green", name: "Green", colorClass: "green", startTrackIndex: 16, homeCells: [0, 1, 2, 3], finishCells: [0, 1, 2, 3] },
  { id: "yellow", name: "Yellow", colorClass: "yellow", startTrackIndex: 24, homeCells: [0, 1, 2, 3], finishCells: [0, 1, 2, 3] }
];

const MAIN_TRACK_LENGTH = 32;
const FINISH_LENGTH = 4;
const TOKENS_PER_PLAYER = 4;

const TRACK_LAYOUT = [
  { x: 0, y: 4 }, { x: 0, y: 5 }, { x: 0, y: 6 },
  { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 },
  { x: 4, y: 6 }, { x: 4, y: 7 },
  { x: 4, y: 8 }, { x: 5, y: 8 }, { x: 6, y: 8 },
  { x: 6, y: 7 }, { x: 6, y: 6 }, { x: 7, y: 6 },
  { x: 8, y: 6 }, { x: 9, y: 6 }, { x: 10, y: 6 },
  { x: 10, y: 5 }, { x: 10, y: 4 }, { x: 9, y: 4 },
  { x: 8, y: 4 }, { x: 7, y: 4 }, { x: 6, y: 4 }, { x: 6, y: 3 },
  { x: 6, y: 2 }, { x: 5, y: 2 }, { x: 4, y: 2 },
  { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 3, y: 4 },
  { x: 2, y: 4 }, { x: 1, y: 4 }
];

const FINISH_LAYOUTS = {
  red: [
    { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }
  ],
  blue: [
    { x: 5, y: 7 }, { x: 5, y: 6 }, { x: 5, y: 5 }, { x: 5, y: 4 }
  ],
  green: [
    { x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }, { x: 6, y: 5 }
  ],
  yellow: [
    { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }
  ]
};

const HOME_LAYOUTS = {
  red: [
    { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 9 }, { x: 2, y: 9 }
  ],
  blue: [
    { x: 8, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 9 }, { x: 9, y: 9 }
  ],
  green: [
    { x: 8, y: 1 }, { x: 9, y: 1 }, { x: 8, y: 2 }, { x: 9, y: 2 }
  ],
  yellow: [
    { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }
  ]
};

const SAFE_TRACK_INDEXES = new Set([0, 8, 16, 24]);

const boardElement = document.getElementById("board");
const playerCountSelect = document.getElementById("playerCount");
const newGameBtn = document.getElementById("newGameBtn");
const restartBtn = document.getElementById("restartBtn");
const drawBtn = document.getElementById("drawBtn");
const statusMessage = document.getElementById("statusMessage");
const drawValueDisplay = document.getElementById("drawValueDisplay");
const currentPlayerIndicator = document.getElementById("currentPlayerIndicator");
const playersLegend = document.getElementById("playersLegend");

let gameState = null;
let cellMap = {};

function createInitialGameState(playerCount) {
  const players = PLAYER_CONFIGS.slice(0, playerCount).map((config, playerIndex) => ({
    ...config,
    playerIndex,
    tokens: Array.from({ length: TOKENS_PER_PLAYER }, (_, tokenIndex) => ({
      id: `${config.id}-token-${tokenIndex}`,
      tokenIndex,
      steps: -1, // -1 means home. 0..31 main track, 32..35 finish path, 36 complete
      completed: false
    }))
  }));

  return {
    players,
    currentPlayerIndex: 0,
    drawValue: null,
    hasDrawn: false,
    validMoves: [],
    winner: null,
    turnLocked: false
  };
}

function init() {
  buildBoardSkeleton();
  attachEventListeners();
  startNewGame();
}

function attachEventListeners() {
  newGameBtn.addEventListener("click", startNewGame);
  restartBtn.addEventListener("click", startNewGame);
  drawBtn.addEventListener("click", handleDraw);
}

function startNewGame() {
  const playerCount = Number(playerCountSelect.value);
  gameState = createInitialGameState(playerCount);
  renderPlayersLegend();
  updateStatus(`New game started. ${getCurrentPlayer().name}'s turn.`);
  render();
}

function buildBoardSkeleton() {
  boardElement.innerHTML = "";
  cellMap = {};

  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 11; x++) {
      const cell = document.createElement("div");
      cell.className = "cell empty";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      boardElement.appendChild(cell);
      cellMap[`${x},${y}`] = cell;
    }
  }

  markTrackCells();
  markFinishCells();
  markHomeCells();
  markCenterCell();
}

function markTrackCells() {
  TRACK_LAYOUT.forEach((position, index) => {
    const cell = getCell(position.x, position.y);
    cell.className = "cell track-cell";
    cell.dataset.cellType = "track";
    cell.dataset.trackIndex = String(index);

    if (SAFE_TRACK_INDEXES.has(index)) {
      cell.classList.add("safe-cell", "start-cell");
    }
  });
}

function markFinishCells() {
  Object.entries(FINISH_LAYOUTS).forEach(([playerId, positions]) => {
    positions.forEach((position, finishIndex) => {
      const cell = getCell(position.x, position.y);
      cell.className = "cell finish-cell";
      cell.dataset.cellType = "finish";
      cell.dataset.playerId = playerId;
      cell.dataset.finishIndex = String(finishIndex);
    });
  });
}

function markHomeCells() {
  Object.entries(HOME_LAYOUTS).forEach(([playerId, positions]) => {
    positions.forEach((position, homeIndex) => {
      const cell = getCell(position.x, position.y);
      cell.className = "cell home-cell";
      cell.dataset.cellType = "home";
      cell.dataset.playerId = playerId;
      cell.dataset.homeIndex = String(homeIndex);
    });
  });
}

function markCenterCell() {
  const centerCell = getCell(5, 5);
  centerCell.className = "cell center-cell";
  centerCell.textContent = "Marble Ludo";
}

function getCell(x, y) {
  return cellMap[`${x},${y}`];
}

function renderPlayersLegend() {
  playersLegend.innerHTML = "";
  gameState.players.forEach(player => {
    const item = document.createElement("div");
    item.className = "player-legend-item";

    const dot = document.createElement("div");
    dot.className = `player-color-dot ${player.colorClass}`;
    dot.style.background = getPlayerCssColor(player.id);

    const label = document.createElement("div");
    label.textContent = `${player.name} - 4 marbles`;

    item.appendChild(dot);
    item.appendChild(label);
    playersLegend.appendChild(item);
  });
}

function getPlayerCssColor(playerId) {
  const map = {
    red: "var(--red)",
    blue: "var(--blue)",
    green: "var(--green)",
    yellow: "var(--yellow)"
  };
  return map[playerId];
}

function handleDraw() {
  if (!gameState || gameState.winner || gameState.turnLocked) {
    return;
  }

  if (gameState.hasDrawn) {
    updateStatus("You already drew this turn. Select a highlighted marble.");
    return;
  }

  const draw = rollDie();
  gameState.drawValue = draw;
  gameState.hasDrawn = true;

  const currentPlayer = getCurrentPlayer();
  const validMoves = getValidMovesForPlayer(currentPlayer, draw);
  gameState.validMoves = validMoves;

  if (validMoves.length === 0) {
    drawValueDisplay.textContent = `Draw: ${draw}`;
    updateStatus(`${currentPlayer.name} drew ${draw}. No valid moves available.`);
    render();

    window.setTimeout(() => {
      if (!gameState.winner) {
        endTurn(false);
      }
    }, 800);

    return;
  }

  drawValueDisplay.textContent = `Draw: ${draw}`;
  updateStatus(`${currentPlayer.name} drew ${draw}. Select a highlighted marble to move.`);
  render();
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function getCurrentPlayer() {
  return gameState.players[gameState.currentPlayerIndex];
}

function getValidMovesForPlayer(player, drawValue) {
  const moves = [];

  player.tokens.forEach(token => {
    const move = calculateMove(player, token, drawValue);
    if (move.isValid) {
      moves.push({
        tokenId: token.id,
        fromSteps: token.steps,
        toSteps: move.toSteps,
        destinationType: move.destinationType,
        destinationTrackIndex: move.destinationTrackIndex,
        destinationFinishIndex: move.destinationFinishIndex
      });
    }
  });

  return moves;
}

function calculateMove(player, token, drawValue) {
  if (token.completed) {
    return { isValid: false };
  }

  if (token.steps === -1) {
    if (drawValue !== 6) {
      return { isValid: false };
    }

    return {
      isValid: true,
      toSteps: 0,
      destinationType: "track",
      destinationTrackIndex: player.startTrackIndex,
      destinationFinishIndex: null
    };
  }

  const targetSteps = token.steps + drawValue;
  const maxReachable = MAIN_TRACK_LENGTH + FINISH_LENGTH - 1;

  if (targetSteps > maxReachable) {
    return { isValid: false };
  }

  if (targetSteps < MAIN_TRACK_LENGTH) {
    return {
      isValid: true,
      toSteps: targetSteps,
      destinationType: "track",
      destinationTrackIndex: getAbsoluteTrackIndex(player, targetSteps),
      destinationFinishIndex: null
    };
  }

  return {
    isValid: true,
    toSteps: targetSteps,
    destinationType: "finish",
    destinationTrackIndex: null,
    destinationFinishIndex: targetSteps - MAIN_TRACK_LENGTH
  };
}

function getAbsoluteTrackIndex(player, relativeSteps) {
  return (player.startTrackIndex + relativeSteps) % MAIN_TRACK_LENGTH;
}

function render() {
  clearDynamicBoardContent();
  renderHighlights();
  renderTokens();
  renderSidebarState();
}

function clearDynamicBoardContent() {
  Object.values(cellMap).forEach(cell => {
    cell.classList.remove("highlight-cell");
    if (!cell.classList.contains("center-cell")) {
      cell.innerHTML = "";
    }
  });

  markTrackCells();
  markFinishCells();
  markHomeCells();
  markCenterCell();
}

function renderHighlights() {
  if (!gameState || !gameState.hasDrawn || gameState.validMoves.length === 0) {
    return;
  }

  const currentPlayer = getCurrentPlayer();
  const currentPlayerTokenIds = new Set(gameState.validMoves.map(move => move.tokenId));

  currentPlayer.tokens.forEach(token => {
    if (!currentPlayerTokenIds.has(token.id)) {
      return;
    }

    const tokenCell = getTokenCell(currentPlayer, token);
    if (tokenCell) {
      tokenCell.classList.add("highlight-cell");
    }
  });

  gameState.validMoves.forEach(move => {
    const destinationCell = getDestinationCellForMove(currentPlayer, move);
    if (destinationCell) {
      destinationCell.classList.add("highlight-cell");
    }
  });
}

function renderTokens() {
  gameState.players.forEach(player => {
    player.tokens.forEach(token => {
      const cell = getTokenCell(player, token);
      if (!cell) {
        return;
      }

      let stack = cell.querySelector(".token-stack");
      if (!stack) {
        stack = document.createElement("div");
        stack.className = "token-stack";
        cell.appendChild(stack);
      }

      const tokenElement = document.createElement("div");
      tokenElement.className = `token ${player.colorClass}`;
      tokenElement.title = `${player.name} token ${token.tokenIndex + 1}`;

      const isSelectable = isTokenSelectable(player, token);
      if (isSelectable) {
        tokenElement.classList.add("selectable");
        tokenElement.addEventListener("click", () => handleTokenSelection(token.id));
      }

      stack.appendChild(tokenElement);
    });
  });
}

function getTokenCell(player, token) {
  if (token.completed) {
    const finalFinishCell = FINISH_LAYOUTS[player.id][FINISH_LENGTH - 1];
    return getCell(finalFinishCell.x, finalFinishCell.y);
  }

  if (token.steps === -1) {
    const homeSpot = HOME_LAYOUTS[player.id][token.tokenIndex];
    return getCell(homeSpot.x, homeSpot.y);
  }

  if (token.steps < MAIN_TRACK_LENGTH) {
    const absoluteTrackIndex = getAbsoluteTrackIndex(player, token.steps);
    const position = TRACK_LAYOUT[absoluteTrackIndex];
    return getCell(position.x, position.y);
  }

  const finishIndex = token.steps - MAIN_TRACK_LENGTH;
  const finishPosition = FINISH_LAYOUTS[player.id][finishIndex];
  return getCell(finishPosition.x, finishPosition.y);
}

function isTokenSelectable(player, token) {
  if (!gameState.hasDrawn || gameState.winner) {
    return false;
  }

  if (player.playerIndex !== gameState.currentPlayerIndex) {
    return false;
  }

  return gameState.validMoves.some(move => move.tokenId === token.id);
}

function getDestinationCellForMove(player, move) {
  if (move.destinationType === "track") {
    const position = TRACK_LAYOUT[move.destinationTrackIndex];
    return getCell(position.x, position.y);
  }

  const position = FINISH_LAYOUTS[player.id][move.destinationFinishIndex];
  return getCell(position.x, position.y);
}

function handleTokenSelection(tokenId) {
  if (!gameState || gameState.winner || !gameState.hasDrawn) {
    return;
  }

  const currentPlayer = getCurrentPlayer();
  const move = gameState.validMoves.find(validMove => validMove.tokenId === tokenId);

  if (!move) {
    updateStatus("That marble cannot move with the current draw.");
    return;
  }

  gameState.turnLocked = true;

  const token = currentPlayer.tokens.find(playerToken => playerToken.id === tokenId);
  token.steps = move.toSteps;

  if (token.steps === MAIN_TRACK_LENGTH + FINISH_LENGTH - 1) {
    token.completed = true;
  }

  if (move.destinationType === "track") {
    resolveCapture(currentPlayer, move.destinationTrackIndex);
  }

  if (checkWin(currentPlayer)) {
    gameState.winner = currentPlayer.playerIndex;
    gameState.hasDrawn = false;
    gameState.validMoves = [];
    render();
    updateStatus(`${currentPlayer.name} wins the game!`);
    gameState.turnLocked = false;
    return;
  }

  render();

  window.setTimeout(() => {
    const extraTurn = gameState.drawValue === 6;
    endTurn(extraTurn);
    gameState.turnLocked = false;
  }, 250);
}

function resolveCapture(currentPlayer, destinationTrackIndex) {
  if (SAFE_TRACK_INDEXES.has(destinationTrackIndex)) {
    return;
  }

  gameState.players.forEach(player => {
    if (player.id === currentPlayer.id) {
      return;
    }

    player.tokens.forEach(token => {
      if (token.completed || token.steps === -1 || token.steps >= MAIN_TRACK_LENGTH) {
        return;
      }

      const tokenTrackIndex = getAbsoluteTrackIndex(player, token.steps);
      if (tokenTrackIndex === destinationTrackIndex) {
        token.steps = -1;
        token.completed = false;
      }
    });
  });
}

function checkWin(player) {
  return player.tokens.every(token => token.completed);
}

function endTurn(extraTurn) {
  if (gameState.winner !== null) {
    render();
    return;
  }

  const currentPlayer = getCurrentPlayer();

  gameState.drawValue = null;
  gameState.hasDrawn = false;
  gameState.validMoves = [];

  if (extraTurn) {
    updateStatus(`${currentPlayer.name} rolled a 6 and gets an extra turn.`);
  } else {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    updateStatus(`${getCurrentPlayer().name}'s turn.`);
  }

  render();
}

function renderSidebarState() {
  if (!gameState) {
    currentPlayerIndicator.textContent = "Current Player: -";
    drawValueDisplay.textContent = "Draw: -";
    return;
  }

  const currentPlayer = getCurrentPlayer();
  currentPlayerIndicator.textContent = `Current Player: ${currentPlayer.name}`;
  currentPlayerIndicator.style.borderLeft = `8px solid ${resolveCssVarColor(currentPlayer.id)}`;
  drawValueDisplay.textContent = `Draw: ${gameState.drawValue ?? "-"}`;

  drawBtn.disabled = gameState.winner !== null || gameState.hasDrawn || gameState.turnLocked;
}

function resolveCssVarColor(playerId) {
  const rootStyles = getComputedStyle(document.documentElement);
  const map = {
    red: rootStyles.getPropertyValue("--red").trim(),
    blue: rootStyles.getPropertyValue("--blue").trim(),
    green: rootStyles.getPropertyValue("--green").trim(),
    yellow: rootStyles.getPropertyValue("--yellow").trim()
  };
  return map[playerId];
}

function updateStatus(message) {
  statusMessage.textContent = message;
}

init();
