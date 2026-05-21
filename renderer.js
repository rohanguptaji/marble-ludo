window.MarbleLudoRenderer = (() => {
  const COLORS = {
    red: "#ef4444",
    green: "#22c55e",
    yellow: "#eab308",
    purple: "#a855f7",
    safe: "#f59e0b",
    finish: "#2563eb",
    grid: "#475569",
    cellBg: "#ffffff",
    boardBg: "#f8fafc",
    arrow: "#334155",
    highlight: "#111827"
  };

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const statusText = document.getElementById("statusText");
  const turnText = document.getElementById("turnText");
  const drawInfo = document.getElementById("drawInfo");
  const marbleDisplay = document.getElementById("marbleDisplay");
  const playersPanel = document.getElementById("playersPanel");
  const drawBtn = document.getElementById("drawBtn");
  const newGameBtn = document.getElementById("newGameBtn");

  const GRID_SIZE = 5;
  let cellSize = canvas.width / GRID_SIZE;

  function resizeCanvasToDisplay() {
    const rect = canvas.getBoundingClientRect();
    const size = Math.min(rect.width, 700);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    cellSize = size / GRID_SIZE;
  }

  function gridToPixelCenter(cell) {
    return {
      x: cell.x * cellSize + cellSize / 2,
      y: cell.y * cellSize + cellSize / 2
    };
  }

  function drawBoard(game) {
    resizeCanvasToDisplay();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const size = cellSize * GRID_SIZE;

    ctx.fillStyle = COLORS.boardBg;
    ctx.fillRect(0, 0, size, size);

    drawCells(game);
    drawGridLines();
    drawOuterArrows(game);
    drawInnerEntryArrows(game);
    drawTokens(game);
  }

  function drawCells(game) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const px = x * cellSize;
        const py = y * cellSize;

        ctx.fillStyle = COLORS.cellBg;
        ctx.fillRect(px, py, cellSize, cellSize);
      }
    }

    for (const safe of game.safeZones) {
      const px = safe.x * cellSize;
      const py = safe.y * cellSize;
      ctx.fillStyle = COLORS.safe;
      ctx.fillRect(px, py, cellSize, cellSize);
    }

    const finish = game.finishCell;
    ctx.fillStyle = COLORS.finish;
    ctx.fillRect(finish.x * cellSize, finish.y * cellSize, cellSize, cellSize);
  }

  function drawGridLines() {
    const total = cellSize * GRID_SIZE;

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 2;

    for (let i = 0; i <= GRID_SIZE; i++) {
      const p = i * cellSize;

      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, total);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(total, p);
      ctx.stroke();
    }
  }

  function drawArrowLine(from, to, color, headSize = 10) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headSize * Math.cos(angle - Math.PI / 6),
      to.y - headSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - headSize * Math.cos(angle + Math.PI / 6),
      to.y - headSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  function drawLShapedArrow(a, b, c, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();

    const angle = Math.atan2(c.y - b.y, c.x - b.x);
    const headSize = 10;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(
      c.x - headSize * Math.cos(angle - Math.PI / 6),
      c.y - headSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      c.x - headSize * Math.cos(angle + Math.PI / 6),
      c.y - headSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  function drawOuterArrows(game) {
    const skipKeys = new Set([
      keyOf(game.finishCell),
      ...game.safeZones.map(keyOf)
    ]);

    const path = game.outerPath;

    for (let i = 0; i < path.length; i++) {
      const curr = path[i];
      const next = path[(i + 1) % path.length];
      const prev = path[(i - 1 + path.length) % path.length];

      if (skipKeys.has(keyOf(curr)) || skipKeys.has(keyOf(next))) {
        continue;
      }

      const currP = gridToPixelCenter(curr);
      const nextP = gridToPixelCenter(next);
      const prevP = gridToPixelCenter(prev);

      const isCorner = (prev.x !== next.x) && (prev.y !== next.y);

      if (isCorner) {
        const mid = {
          x: currP.x,
          y: nextP.y
        };

        if (skipKeys.has(keyOf(curr)) || skipKeys.has(keyOf(next))) {
          continue;
        }

        drawLShapedArrow(prevP, currP, nextP, COLORS.arrow);
      } else {
        const from = {
          x: currP.x + (nextP.x - currP.x) * 0.15,
          y: currP.y + (nextP.y - currP.y) * 0.15
        };
        const to = {
          x: currP.x + (nextP.x - currP.x) * 0.75,
          y: currP.y + (nextP.y - currP.y) * 0.75
        };
        drawArrowLine(from, to, COLORS.arrow, 8);
      }
    }
  }

  function drawInnerEntryArrows(game) {
    for (const player of game.players) {
      const entry = game.innerEntryVisuals[player.id];
      drawLShapedArrow(
        gridToPixelCenter(entry.a),
        gridToPixelCenter(entry.b),
        gridToPixelCenter(entry.c),
        player.color
      );
    }
  }

  function drawTokens(game) {
    for (const player of game.players) {
      for (const token of player.tokens) {
        let position;

        if (game.animating && game.animationTokenId === token.id && game.animationPosition) {
          position = game.animationPosition;
        } else {
          position = getTokenRenderPosition(game, player, token);
        }

        if (!position) {
          continue;
        }

        drawSingleToken(position.x, position.y, player.color, isTokenSelectable(game, player, token));
      }
    }
  }

  function drawSingleToken(x, y, color, selectable) {
    const radius = Math.max(12, cellSize * 0.12);

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = selectable ? 4 : 2;
    ctx.strokeStyle = selectable ? COLORS.highlight : "#ffffff";
    ctx.stroke();
  }

  function getTokenRenderPosition(game, player, token) {
    if (token.state === "finished") {
      return getFinishedTokenPosition(game, player, token);
    }

    if (token.state === "home") {
      return getHomeTokenPosition(game, player, token.homeSlotIndex);
    }

    if (token.state === "outer") {
      const cell = game.outerPath[token.outerIndex];
      return getCellSubPosition(cell, token.subIndex);
    }

    if (token.state === "inner") {
      const cell = game.innerPath[token.innerIndex];
      return getCellSubPosition(cell, token.subIndex);
    }

    return null;
  }

  function getHomeTokenPosition(game, player, slotIndex) {
    const safe = player.safeZone;
    return getCellSubPosition(safe, slotIndex);
  }

  function getFinishedTokenPosition(game, player, token) {
    return getCellSubPosition(game.finishCell, token.finishSlotIndex);
  }

  function getCellSubPosition(cell, subIndex) {
    const baseX = cell.x * cellSize;
    const baseY = cell.y * cellSize;

    const offsets = [
      { x: cellSize * 0.32, y: cellSize * 0.32 },
      { x: cellSize * 0.68, y: cellSize * 0.32 },
      { x: cellSize * 0.32, y: cellSize * 0.68 },
      { x: cellSize * 0.68, y: cellSize * 0.68 }
    ];

    const offset = offsets[subIndex % 4];
    return {
      x: baseX + offset.x,
      y: baseY + offset.y
    };
  }

  function keyOf(cell) {
    return `${cell.x},${cell.y}`;
  }

  function isTokenSelectable(game, player, token) {
    if (game.winnerId !== null) return false;
    if (game.animating) return false;
    if (!game.drawResolved) return false;
    if (game.currentPlayerIndex !== player.index) return false;
    if (token.state === "finished") return false;
    return game.selectableTokenIds.has(token.id);
  }

  function renderMarbleDisplay(marbles) {
    marbleDisplay.innerHTML = "";
    for (const marble of marbles) {
      const div = document.createElement("div");
      div.className = `marble ${marble}`;
      marbleDisplay.appendChild(div);
    }

    if (!marbles.length) {
      for (let i = 0; i < 4; i++) {
        const div = document.createElement("div");
        div.className = "marble placeholder";
        marbleDisplay.appendChild(div);
      }
    }
  }

  function renderPlayerPanels(game) {
    playersPanel.innerHTML = "";

    for (const player of game.players) {
      const card = document.createElement("div");
      card.className = "player-card";
      if (player.index === game.currentPlayerIndex && game.winnerId === null) {
        card.classList.add("active");
      }

      const header = document.createElement("div");
      header.className = "player-header";

      const dot = document.createElement("div");
      dot.className = "player-dot";
      dot.style.background = player.color;

      const name = document.createElement("div");
      name.textContent = player.name;

      header.appendChild(dot);
      header.appendChild(name);

      const stats = document.createElement("div");
      stats.className = "player-stats";
      stats.innerHTML = `
        Finished: ${player.tokens.filter(t => t.state === "finished").length}/4<br>
        Captures: ${player.totalCaptures}<br>
        Extra Turns Chain: ${player.index === game.currentPlayerIndex ? game.extraTurnChain : 0}
      `;

      card.appendChild(header);
      card.appendChild(stats);
      playersPanel.appendChild(card);
    }
  }

  function updateStatus(game) {
    const currentPlayer = game.players[game.currentPlayerIndex];
    turnText.textContent = `Turn: ${currentPlayer.name}`;
    drawInfo.textContent = game.drawResolved
      ? `Draw: ${game.drawLabel} = ${game.currentMoveValue} step(s)`
      : "Draw: -";
    statusText.textContent = game.statusMessage;
    drawBtn.disabled = game.animating || game.winnerId !== null || game.drawResolved;
  }

  function bindCanvasClick(handler) {
    canvas.addEventListener("click", (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (event.clientX - rect.left) * (1 / (window.devicePixelRatio || 1));
      const y = (event.clientY - rect.top) * (1 / (window.devicePixelRatio || 1));

      handler({ x, y });
    });
  }

  function bindButtons(onDraw, onNewGame) {
    drawBtn.addEventListener("click", onDraw);
    newGameBtn.addEventListener("click", onNewGame);
  }

  function hitTestToken(game, point) {
    const radius = Math.max(12, cellSize * 0.12);

    for (const player of game.players) {
      for (const token of player.tokens) {
        if (!isTokenSelectable(game, player, token)) continue;

        let pos;
        if (game.animating && game.animationTokenId === token.id && game.animationPosition) {
          pos = game.animationPosition;
        } else {
          pos = getTokenRenderPosition(game, player, token);
        }

        if (!pos) continue;

        const dx = point.x - pos.x;
        const dy = point.y - pos.y;
        if (dx * dx + dy * dy <= radius * radius) {
          return token.id;
        }
      }
    }

    return null;
  }

  return {
    drawBoard,
    renderMarbleDisplay,
    renderPlayerPanels,
    updateStatus,
    bindCanvasClick,
    bindButtons,
    hitTestToken,
    resizeCanvasToDisplay
  };
})();
