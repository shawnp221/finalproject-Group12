(function () {
  const boardEl = document.getElementById('board');
  const resetBtn = document.getElementById('resetBtn');
  const smileyBtn = document.getElementById('smiley');
  const mineCounterEl = document.getElementById('mineCounter');
  const timerEl = document.getElementById('timer');
  const statusText = document.getElementById('statusText');
  const msgEl = document.getElementById('msg');
  const explosionEl = document.getElementById('explosion');


  let cols = 9, rows = 9, mines = 10;
  let grid = [];
  let started = false;
  let finished = false;
  let flags = 0;
  let revealedCount = 0;
  let timer = 0, timerInterval = null;

  async function showLeaderboard() {
    const content = document.getElementById('leaderboardContent');
    content.innerHTML = 'Loading...';
    const modal = document.getElementById('leaderboardModal');
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    try {
      let currentUser = { username: null };
      try {
        const userResponse = await fetch("/api/me");
        if (userResponse.ok) {
          currentUser = await userResponse.json();
        }
      } catch (e) {
        currentUser = { username: null };
      }

      const response = await fetch("/api/minesweeper/data");
      if (!response.ok) {
        throw new Error('Failed to fetch scores');
      }
      const scores = await response.json();

      if (!Array.isArray(scores) || scores.length === 0) {
        content.innerHTML = '<div class="no-scores">No scores yet. Be the first to play!</div>';
        return;
      }

      scores.sort((a, b) => (a.time || 0) - (b.time || 0));

      let tableHTML = `
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Time</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
      `;

      scores.forEach((score, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        const date = score.date ? new Date(score.date).toLocaleDateString() : '';

        let formattedTime = '';
        if (typeof score.time === 'number') {
          const mins = Math.floor(score.time / 60);
          const secs = score.time % 60;
          formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;
        } else {
          formattedTime = `${score.time || ''}s`;
        }

        const playerName = (currentUser && currentUser.username && score.username === currentUser.username)
          ? `<strong>${score.username}</strong>`
          : (score.username || 'Anonymous');

        tableHTML += `
          <tr>
            <td><span class="rank-medal">${medal}</span>${index + 1}</td>
            <td>${playerName}</td>
            <td>${formattedTime}</td>
            <td>${date}</td>
          </tr>
        `;
      });

      tableHTML += '</tbody></table>';
      content.innerHTML = tableHTML;

    } catch (err) {
      console.error("Error loading leaderboard:", err);
      content.innerHTML = '<div class="no-scores">Failed to load scores.</div>';
    }
  }

  function closeLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeLeaderboardBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeLeaderboard);
  });

  function createEmptyGrid(c, r) {
    const arr = new Array(r);
    for (let y = 0; y < r; y++) {
      arr[y] = new Array(c);
      for (let x = 0; x < c; x++) {
        arr[y][x] = { mine: false, revealed: false, flagged: false, neighbor: 0, x, y };
      }
    }
    return arr;
  }

  function placeMinesAvoiding(firstX, firstY) {
    const toAvoid = new Set();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = firstX + dx, ny = firstY + dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
          toAvoid.add(`${nx},${ny}`);
        }
      }
    }
    let placed = 0;
    while (placed < mines) {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      const key = `${x},${y}`;
      if (toAvoid.has(key)) continue;
      if (!grid[y][x].mine) {
        grid[y][x].mine = true;
        placed++;
      }
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x].mine) { grid[y][x].neighbor = -1; continue; }
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx].mine) count++;
          }
        }
        grid[y][x].neighbor = count;
      }
    }
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
    boardEl.style.gridTemplateRows = `repeat(${rows}, var(--tile-size))`;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid[y][x];
        const cellEl = document.createElement('div');
        cellEl.className = 'cell';
        cellEl.setAttribute('data-x', x);
        cellEl.setAttribute('data-y', y);

        if (cell.revealed) {
          cellEl.classList.add('revealed');
          if (cell.mine) {
            cellEl.classList.add('mine');
            cellEl.textContent = '💣';
          } else if (cell.neighbor > 0) {
            cellEl.textContent = cell.neighbor;
            cellEl.classList.add('n' + cell.neighbor);
          }
        } else if (cell.flagged) {
          cellEl.classList.add('flagged');
          cellEl.textContent = '🚩';
        }

        cellEl.addEventListener('click', () => onCellLeftClick(x, y));
        cellEl.addEventListener('contextmenu', (ev) => { ev.preventDefault(); onCellRightClick(x, y); });

        boardEl.appendChild(cellEl);
      }
    }
    updateCounters();
  }

  function updateCounters() {
    mineCounterEl.textContent = String(Math.max(0, mines - flags)).padStart(3, '0');
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timer = 0;
    timerEl.textContent = '0';
    timerInterval = setInterval(() => {
      timer++;
      timerEl.textContent = String(timer);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function revealAllMines() {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = grid[y][x];
        if (c.mine) c.revealed = true;
      }
    }
  }

  function floodReveal(sx, sy) {
    const stack = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop();
      const c = grid[y][x];
      if (c.revealed || c.flagged) continue;
      c.revealed = true;
      revealedCount++;
      if (c.neighbor === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              const nc = grid[ny][nx];
              if (!nc.revealed && !nc.flagged && !nc.mine) {
                stack.push([nx, ny]);
              }
            }
          }
        }
      }
    }
  }

  function onCellLeftClick(x, y) {
    if (finished) return;
    const c = grid[y][x];
    if (c.revealed || c.flagged) return;

    if (!started) {
      placeMinesAvoiding(x, y);
      started = true;
      startTimer();
      statusText.textContent = 'In progress';
    }

    if (c.mine) {
      c.revealed = true;
      revealAllMines();
      finished = true;
      stopTimer();
      renderBoard();
      statusText.textContent = 'You lost';
      msgEl.textContent = '💥 Boom! You hit a mine. Try Again!';
      smileyBtn.textContent = '😵';
      explosionEl.classList.add('active');
      setTimeout(() => {
        explosionEl.style.opacity = '0';
      }, 1600); // (0.6s animation + 1.0s pause)
      setTimeout(() => {
        explosionEl.classList.remove('active');
        explosionEl.style.opacity = '';
      }, 1600); // remove completely after fade-out
      return;
    }

    floodReveal(x, y);
    renderBoard();
    checkWin();
  }

  function onCellRightClick(x, y) {
    if (finished) return;
    const c = grid[y][x];
    if (c.revealed) return;
    c.flagged = !c.flagged;
    flags += c.flagged ? 1 : -1;
    updateCounters();
    renderBoard();
    checkWin();
  }

  async function checkWin() {
    const totalCells = cols * rows;
    const nonMine = totalCells - mines;
    let revealed = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x].revealed) revealed++;
      }
    }
    if (revealed === nonMine) {
      finished = true;
      stopTimer();
      revealAllMines();
      renderBoard();
      statusText.textContent = 'You won!';
      msgEl.textContent = '🎉 Congratulations!';
      smileyBtn.textContent = '😎';

      try {
        const userResp = await fetch('/api/me');
        if (!userResp.ok) {
          console.warn('Not logged in - score will not be saved');
          return;
        }
        const userData = await userResp.json();
        const username = userData.username;

        const scoreData = {
          username: username,
          time: timer,
          game: "Minesweeper",
          date: new Date().toISOString()
        };

        const postResp = await fetch('/api/minesweeper/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scoreData)
        });

        const postJson = await postResp.json();
        if (postJson.success) {
          console.log('Score saved successfully!');
        } else {
          console.error('Error saving score:', postJson.error);
        }
      } catch (err) {
        console.error('Server error:', err);
      }
    }
  }

  function resetGame() {
    grid = createEmptyGrid(cols, rows);
    started = false;
    finished = false;
    flags = 0;
    revealedCount = 0;
    stopTimer();
    timer = 0;
    timerEl.textContent = '0';
    statusText.textContent = 'Ready';
    msgEl.textContent = '';
    smileyBtn.textContent = '😊';
    explosionEl.classList.remove('active');
    updateCounters();
    renderBoard();
  }

  resetBtn.addEventListener('click', resetGame);
  smileyBtn.addEventListener('click', resetGame);

  resetGame();

  window.showLeaderboard = showLeaderboard;
  window.closeLeaderboard = closeLeaderboard;

})();
