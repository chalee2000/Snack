(() => {
  const GRID = 8;
  const COLORS = [
    "#ff6b6b", "#4ecdc4", "#ffd93d", "#a29bfe",
    "#54a0ff", "#1dd1a1", "#ff9f43", "#f368e0",
  ];

  const SHAPES = [
    [[0, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [1, 0]],
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
    [[0, 0], [1, 0], [2, 0], [2, 1]],
    [[0, 0], [0, 1], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[2, 0], [2, 1], [1, 1], [0, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 1]],
    [[0, 1], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [0, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 1], [0, 2], [1, 0], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 1], [1, 0], [1, 1], [2, 0]],
    [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  ];

  const boardEl = document.getElementById("board");
  const trayEl = document.getElementById("tray");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const dragLayer = document.getElementById("dragLayer");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const finalScoreEl = document.getElementById("finalScore");
  const newBestMsgEl = document.getElementById("newBestMsg");
  const newGameBtn = document.getElementById("newGameBtn");
  const restartBtn = document.getElementById("restartBtn");

  let board = [];
  let cellEls = [];
  let tray = [null, null, null];
  let score = 0;
  let best = Number(localStorage.getItem("blockblast_best") || 0);
  let comboStreak = 0;
  let dragState = null;
  let gameEnded = false;

  bestEl.textContent = best;

  function normalize(cells) {
    const minR = Math.min(...cells.map((c) => c[0]));
    const minC = Math.min(...cells.map((c) => c[1]));
    return cells.map(([r, c]) => [r - minR, c - minC]);
  }

  function pieceSize(cells) {
    const rows = Math.max(...cells.map((c) => c[0])) + 1;
    const cols = Math.max(...cells.map((c) => c[1])) + 1;
    return { rows, cols };
  }

  function randomPiece() {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return { cells: normalize(shape), color, id: Math.random().toString(36).slice(2) };
  }

  function buildBoard() {
    board = Array.from({ length: GRID }, () => Array(GRID).fill(null));
    boardEl.innerHTML = "";
    cellEls = [];
    for (let r = 0; r < GRID; r++) {
      const row = [];
      for (let c = 0; c < GRID; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.r = r;
        cell.dataset.c = c;
        boardEl.appendChild(cell);
        row.push(cell);
      }
      cellEls.push(row);
    }
  }

  function setScore(v) {
    score = v;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem("blockblast_best", String(best));
    }
  }

  function fitsAt(cells, topR, topC) {
    for (const [dr, dc] of cells) {
      const r = topR + dr;
      const c = topC + dc;
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) return false;
      if (board[r][c]) return false;
    }
    return true;
  }

  function canPlaceAnywhere(cells) {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (fitsAt(cells, r, c)) return true;
      }
    }
    return false;
  }

  function anyMoveAvailable() {
    return tray.some((p) => p && canPlaceAnywhere(p.cells));
  }

  function renderPieceGrid(cells, color, cellPx) {
    const { rows, cols } = pieceSize(cells);
    const grid = document.createElement("div");
    grid.className = "piece-grid";
    grid.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
    grid.style.gridTemplateRows = `repeat(${rows}, ${cellPx}px)`;
    grid.style.gap = "2px";
    const set = new Set(cells.map(([r, c]) => `${r},${c}`));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
        if (set.has(`${r},${c}`)) {
          cell.className = "piece-cell";
          cell.style.background = color;
        } else {
          cell.className = "piece-cell empty";
        }
        grid.appendChild(cell);
      }
    }
    return grid;
  }

  function traySlotCellPx(cells) {
    const { rows, cols } = pieceSize(cells);
    const maxDim = Math.max(rows, cols);
    return Math.min(28, Math.floor(84 / maxDim));
  }

  function renderTray() {
    trayEl.querySelectorAll(".tray-slot").forEach((slot, i) => {
      slot.innerHTML = "";
      const piece = tray[i];
      if (!piece) return;
      const wrapper = document.createElement("div");
      wrapper.className = "tray-piece-wrapper";
      wrapper.dataset.slot = i;
      const px = traySlotCellPx(piece.cells);
      const grid = renderPieceGrid(piece.cells, piece.color, px);
      wrapper.appendChild(grid);
      slot.appendChild(wrapper);
      wrapper.addEventListener("pointerdown", (e) => startDrag(e, i));
    });
  }

  function refillTrayIfEmpty() {
    if (tray.every((p) => p === null)) {
      tray = [randomPiece(), randomPiece(), randomPiece()];
      renderTray();
    }
  }

  function getBoardMetrics() {
    const rect = boardEl.getBoundingClientRect();
    const style = getComputedStyle(boardEl);
    const pad = parseFloat(style.paddingLeft) || 0;
    const gap = parseFloat(style.gap) || 0;
    const innerSize = rect.width - pad * 2;
    const cellSize = (innerSize - gap * (GRID - 1)) / GRID;
    return { rect, pad, gap, cellSize };
  }

  function clearPreview() {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        cellEls[r][c].classList.remove("preview-ok", "preview-bad");
      }
    }
  }

  function showPreview(cells, topR, topC) {
    clearPreview();
    const ok = fitsAt(cells, topR, topC);
    for (const [dr, dc] of cells) {
      const r = topR + dr;
      const c = topC + dc;
      if (r >= 0 && r < GRID && c >= 0 && c < GRID) {
        cellEls[r][c].classList.add(ok ? "preview-ok" : "preview-bad");
      }
    }
    return ok;
  }

  function startDrag(e, slotIndex) {
    if (gameEnded) return;
    const piece = tray[slotIndex];
    if (!piece) return;
    e.preventDefault();

    const wrapper = trayEl.querySelector(`.tray-piece-wrapper[data-slot="${slotIndex}"]`);
    wrapper.classList.add("dragging-source");

    const { cellSize } = getBoardMetrics();
    const ghost = renderPieceGrid(piece.cells, piece.color, Math.round(cellSize));
    ghost.style.gap = "3px";
    dragLayer.appendChild(ghost);

    const { rows, cols } = pieceSize(piece.cells);
    const ghostW = cols * cellSize + (cols - 1) * 3;
    const ghostH = rows * cellSize + (rows - 1) * 3;

    dragState = {
      slotIndex,
      piece,
      ghost,
      ghostW,
      ghostH,
      pointerId: e.pointerId,
    };

    positionGhost(e.clientX, e.clientY);
    updateHoverPreview(e.clientX, e.clientY);

    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
    window.addEventListener("pointercancel", onDragEnd);
  }

  function positionGhost(clientX, clientY) {
    if (!dragState) return;
    const liftY = 70;
    const x = clientX - dragState.ghostW / 2;
    const y = clientY - dragState.ghostH / 2 - liftY;
    dragState.ghost.style.left = `${x}px`;
    dragState.ghost.style.top = `${y}px`;
  }

  function hoveredTopCell(clientX, clientY) {
    const { rect, pad, gap, cellSize } = getBoardMetrics();
    const liftY = 70;
    const anchorX = clientX - dragState.ghostW / 2;
    const anchorY = clientY - dragState.ghostH / 2 - liftY;
    const localX = anchorX - (rect.left + pad);
    const localY = anchorY - (rect.top + pad);
    const col = Math.round(localX / (cellSize + gap));
    const row = Math.round(localY / (cellSize + gap));
    return { row, col };
  }

  function updateHoverPreview(clientX, clientY) {
    if (!dragState) return;
    const { row, col } = hoveredTopCell(clientX, clientY);
    dragState.lastRow = row;
    dragState.lastCol = col;
    dragState.lastValid = showPreview(dragState.piece.cells, row, col);
  }

  function onDragMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    positionGhost(e.clientX, e.clientY);
    updateHoverPreview(e.clientX, e.clientY);
  }

  function onDragEnd(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const { slotIndex, piece, lastRow, lastCol, lastValid } = dragState;

    clearPreview();
    dragState.ghost.remove();
    const wrapper = trayEl.querySelector(`.tray-piece-wrapper[data-slot="${slotIndex}"]`);
    if (wrapper) wrapper.classList.remove("dragging-source");

    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
    window.removeEventListener("pointercancel", onDragEnd);
    dragState = null;

    if (lastValid) {
      placePiece(piece, lastRow, lastCol, slotIndex);
    }
  }

  function placePiece(piece, topR, topC, slotIndex) {
    for (const [dr, dc] of piece.cells) {
      const r = topR + dr;
      const c = topC + dc;
      board[r][c] = piece.color;
      cellEls[r][c].classList.add("filled");
      cellEls[r][c].style.background = piece.color;
    }
    setScore(score + piece.cells.length);

    tray[slotIndex] = null;
    renderTray();

    const cleared = clearFullLines();
    if (cleared.rows.length + cleared.cols.length > 0) {
      comboStreak += 1;
      const lineCount = cleared.rows.length + cleared.cols.length;
      const bonus = lineCount * 10 + Math.max(0, lineCount - 1) * 5 + (comboStreak - 1) * 5;
      setScore(score + bonus);
      showFloatingScore(bonus);
    } else {
      comboStreak = 0;
    }

    refillTrayIfEmpty();

    if (!anyMoveAvailable()) {
      endGame();
    }
  }

  function clearFullLines() {
    const fullRows = [];
    const fullCols = [];
    for (let r = 0; r < GRID; r++) {
      if (board[r].every((v) => v !== null)) fullRows.push(r);
    }
    for (let c = 0; c < GRID; c++) {
      if (board.every((row) => row[c] !== null)) fullCols.push(c);
    }

    const toClear = new Set();
    fullRows.forEach((r) => {
      for (let c = 0; c < GRID; c++) toClear.add(`${r},${c}`);
    });
    fullCols.forEach((c) => {
      for (let r = 0; r < GRID; r++) toClear.add(`${r},${c}`);
    });

    // Clear the board data immediately so move-availability checks see the
    // freed cells right away; only the visual removal is deferred for the
    // pop animation.
    toClear.forEach((key) => {
      const [r, c] = key.split(",").map(Number);
      board[r][c] = null;
      cellEls[r][c].classList.add("clearing");
    });

    if (toClear.size > 0) {
      setTimeout(() => {
        toClear.forEach((key) => {
          const [r, c] = key.split(",").map(Number);
          cellEls[r][c].classList.remove("filled", "clearing");
          cellEls[r][c].style.background = "";
        });
      }, 260);
    }

    return { rows: fullRows, cols: fullCols };
  }

  function showFloatingScore(amount) {
    const rect = boardEl.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "floating-score";
    el.textContent = `+${amount}`;
    el.style.left = `${rect.left + rect.width / 2 - 20}px`;
    el.style.top = `${rect.top + rect.height / 2 - 10}px`;
    el.style.fontSize = "24px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function endGame() {
    gameEnded = true;
    finalScoreEl.textContent = score;
    newBestMsgEl.classList.toggle("hidden", score < best);
    gameOverOverlay.classList.remove("hidden");
  }

  function newGame() {
    gameEnded = false;
    comboStreak = 0;
    setScore(0);
    buildBoard();
    tray = [randomPiece(), randomPiece(), randomPiece()];
    renderTray();
    gameOverOverlay.classList.add("hidden");
  }

  newGameBtn.addEventListener("click", () => {
    if (gameEnded || confirm("Start a new game? Current progress will be lost.")) {
      newGame();
    }
  });
  restartBtn.addEventListener("click", newGame);

  newGame();
})();
