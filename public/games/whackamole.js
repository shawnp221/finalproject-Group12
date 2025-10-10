// ----- Game config -----
const GRID = 4;                  // 4x4
const GAME_SECONDS = 15;         // 15 seconds
const POP_INTERVAL_MIN = 650;    // ms between spawns
const POP_INTERVAL_MAX = 1100;
const MOLE_UP_MIN = 700;         // how long a mole stays up (ms)
const MOLE_UP_MAX = 1300;

// ----- State -----
let score = 0;
let secondsLeft = GAME_SECONDS;
let running = false;
let spawnTimer = null;
let countdown = null;

const board = document.getElementById('board');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');

// Build the 4x4 grid
const holes = [];
for (let i = 0; i < GRID * GRID; i++) {
  const hole = document.createElement('div');
  hole.className = 'hole';
  hole.dataset.index = String(i);

  const mole = document.createElement('div');
  mole.className = 'mole';
  document.documentElement.style.setProperty('--mole-img', 'url("../diglet.png")');
  mole.dataset.up = '0';
  mole.dataset.locked = '0';

  hole.appendChild(mole);
  board.appendChild(hole);
  holes.push(hole);
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function updateScore(delta) {
  score = score + delta;
  scoreEl.textContent = `Score: ${score}`;
}

function updateTimer() {
  timerEl.textContent = fmtTime(secondsLeft);
}

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomHole() {
  const idx = Math.floor(Math.random() * holes.length);
  return holes[idx];
}

function popOneMole() {
  if (!running) return;
  const hole = pickRandomHole();
  const mole = hole.querySelector('.mole');
  if (mole.dataset.up === '1') {
    const alt = pickRandomHole();
    const altMole = alt.querySelector('.mole');
    if (altMole.dataset.up === '1') return scheduleNextSpawn();
    return raiseMole(altMole);
  }
  raiseMole(mole);
}

function raiseMole(mole) {
  mole.dataset.up = '1';
  mole.dataset.locked = '0';
  mole.classList.add('up');
  const stay = randomRange(MOLE_UP_MIN, MOLE_UP_MAX);

  clearTimeout(mole._autoTimer);
  mole._autoTimer = setTimeout(() => {
    if (mole.dataset.up === '1') {
      dropMole(mole);
    }
  }, stay);

  scheduleNextSpawn();
}

function dropMole(mole) {
  if (mole.dataset.up === '0') return;
  mole.dataset.up = '0';
  mole.dataset.locked = '1';
  mole.classList.remove('up');
  setTimeout(() => { mole.dataset.locked = '0'; }, 180);
}

function scheduleNextSpawn() {
  if (!running) return;
  const wait = randomRange(POP_INTERVAL_MIN, POP_INTERVAL_MAX);
  clearTimeout(spawnTimer);
  spawnTimer = setTimeout(popOneMole, wait);
}

function startGame() {
  if (running) return;
  running = true;
  startBtn.disabled = true;

  score = 0;
  updateScore(0);
  secondsLeft = GAME_SECONDS;
  updateTimer();
  clearInterval(countdown);
  countdown = setInterval(() => {
    secondsLeft--;
    updateTimer();
    if (secondsLeft <= 0) {
      endGame();
    }
  }, 1000);
  scheduleNextSpawn();
}

async function endGame() {
  running = false;
  startBtn.disabled = false;
  clearTimeout(spawnTimer);
  clearInterval(countdown);
  holes.forEach(h => dropMole(h.querySelector('.mole')));

  try {
    const meRes = await fetch('/api/me');
    if (!meRes.ok) throw new Error('Not logged in');
    const me = await meRes.json();

    const payload = {
      username: me.username,
      score,
      game: "WhackAMole",
      date: new Date().toISOString()
    };

    const saveRes = await fetch('/api/whackamole/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const saveJson = await saveRes.json();
    if (!saveRes.ok || !saveJson.success) {
      console.error('Error saving whackamole score:', saveJson.error || saveRes.statusText);
    }
  } catch (err) {
    console.error('Failed to save whackamole score:', err);
  }
}


function resetGame() {
  endGame();
  score = 0;
  updateScore(0);
  secondsLeft = GAME_SECONDS;
  updateTimer();
}

// Click handling
board.addEventListener('click', (e) => {
  if (!running) return;
  const mole = e.target.closest('.mole');
  if (mole && mole.dataset.up === '1' && mole.dataset.locked === '0') {
    updateScore(+1);
    dropMole(mole);
    return;
  }
  if (e.currentTarget.contains(e.target)) {
    updateScore(-1);
  }
});

// Controls
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

const lbBtn = document.getElementById('lbBtn');
const lbModal = document.getElementById('leaderboardModal');
const lbCloseBtn = document.getElementById('lbCloseBtn');

lbBtn.addEventListener('click', async () => {
  await showLeaderboardModal();
});
lbCloseBtn.addEventListener('click', closeLeaderboard);
lbModal.addEventListener('click', (e) => {
  if (e.target === lbModal) closeLeaderboard();
});

function closeLeaderboard() {
  lbModal.classList.remove('show');
  lbModal.setAttribute('aria-hidden', 'true');
}

async function showLeaderboardModal() {
  const content = document.getElementById('leaderboardContent');
  content.innerHTML = 'Loading…';
  lbModal.classList.add('show');
  lbModal.setAttribute('aria-hidden', 'false');

  try {
    // current user (for bolding)
    let currentUser = null;
    try {
      const meRes = await fetch('/api/me');
      if (meRes.ok) currentUser = await meRes.json();
    } catch (_) {}

    const res = await fetch('/api/whackamole/data');
    const scores = await res.json();

    if (!Array.isArray(scores) || scores.length === 0) {
      content.innerHTML = '<div class="no-scores">No scores yet. Be the first to play!</div>';
      return;
    }

    let html = `
      <table class="leaderboard-table" aria-label="Whack-a-Mole Leaderboard">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
    `;

    const topScores = scores.slice(0, 15);

    topScores.forEach((s, idx) => {
      const rank = idx + 1;
      const isMe = currentUser && s.username === currentUser.username;
      const dateStr = s.date ? new Date(s.date).toLocaleDateString() : '';
      const medal = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : '';

      html += `
        <tr>
          <td>${medal}${rank}</td>
          <td>${isMe ? `<strong>${s.username}</strong>` : s.username}</td>
          <td><strong>${s.score}</strong></td>
          <td>${dateStr}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    content.innerHTML = html;
  } catch (err) {
    console.error('Error loading leaderboard:', err);
    content.innerHTML = '<div class="no-scores">Failed to load scores.</div>';
  }
}

function saveScoreEntry(value) {
  const list = loadScores();
  const ts = new Date();
  list.unshift({ value, ts: ts.toISOString() });
  localStorage.setItem('wamLeaderboard', JSON.stringify(list.slice(0, 20)));
  renderScores();
}
function renderScores() {
  const ul = document.getElementById('scores');
  const list = loadScores();
  ul.innerHTML = '';
  list.forEach((s, i) => {
    const li = document.createElement('li');
    li.textContent = `#${i + 1} — ${s.value} pts`;
    ul.appendChild(li);
  });
}

updateScore(0);
updateTimer();
renderScores();
