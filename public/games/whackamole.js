const GRID = 4; // 4x4
const GAME_SECONDS = 15; // 15 seconds
const POP_INTERVAL_MIN = 650; // ms between spawns
const POP_INTERVAL_MAX = 1100;
const MOLE_UP_MIN = 700; // how long a mole stays up (ms)
const MOLE_UP_MAX = 1300;

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
const nameForm = document.getElementById('nameForm');
const usernameInput = document.getElementById('username');
let pendingScore = null;

// Build the 4x4 grid
const holes = [];
for (let i = 0; i < GRID * GRID; i++) {
    const hole = document.createElement('div');
    hole.className = 'hole';
    hole.dataset.index = String(i);


    const mole = document.createElement('div');
    mole.className = 'mole';
    mole.textContent = 'M';


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
    if (nameForm) nameForm.style.display = 'none';
    pendingScore = null;


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

function endGame() {
    running = false;
    startBtn.disabled = false;
    clearTimeout(spawnTimer);
    clearInterval(countdown);
    holes.forEach(h => dropMole(h.querySelector('.mole')));


    pendingScore = score;
    if (nameForm) {
        nameForm.style.display = 'grid';
        if (usernameInput) usernameInput.value = '';
        setTimeout(() => usernameInput && usernameInput.focus(), 0);
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

// Leaderboard
function loadScores() {
    try {
        return JSON.parse(localStorage.getItem('wamLeaderboard') || '[]');
    } catch (err) {
        console.warn('Leaderboard parse failed; resetting storage.', err);
        return [];
    }
}
function saveScoreEntry(value, name) {
    const list = loadScores();
    const ts = new Date();
    list.unshift({ name, value, ts: ts.toISOString() });
    localStorage.setItem('wamLeaderboard', JSON.stringify(list.slice(0, 20)));
    renderScores();
}
function renderScores() {
    const ul = document.getElementById('scores');
    const list = loadScores();
    ul.innerHTML = '';
    list.forEach((s, i) => {
        const li = document.createElement('li');
        const name = s.name || 'Player';
        li.textContent = `#${i + 1} — ${name} — ${s.value} pts`;
        ul.appendChild(li);
    });
}


document.getElementById('clearScores').addEventListener('click', () => {
    localStorage.removeItem('wamLeaderboard');
    renderScores();
});


if (nameForm) {
    nameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (pendingScore === null) { nameForm.style.display = 'none'; return; }
        const name = (usernameInput?.value || '').trim() || 'Player';
        saveScoreEntry(pendingScore, name);
        pendingScore = null;
        nameForm.style.display = 'none';
    });
}

updateScore(0);
updateTimer();
renderScores();