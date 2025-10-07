// Card themes (12 pairs = 24 cards, 1 unused for 5x5 grid)
const themes = {
    emoji: ['🎮', '🎨', '🎭', '🎪', '🎸', '🎯', '🎲', '🎺', '🎻', '🎬', '🎤', '🎧'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'],
    shapes: ['⭐', '💎', '🔷', '🔶', '🔵', '🔴', '🟢', '🟡', '🟣', '🟠', '⬛', '⬜'],
    nfl: ['🦅', '🐻', '⚜️', '🦬', '🐦', '🐴', '🐬', '⚡', '🤠', '🏴‍☠️', '🧀', '🦁']
};

let currentTheme = 'emoji';
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = 0;
let timerInterval = null;
let gameStarted = false;

function initGame() {
    // Get 12 pairs from current theme
    const symbols = themes[currentTheme];
    const cardSymbols = [...symbols, ...symbols]; // Create pairs

    // Shuffle cards
    cardSymbols.sort(() => Math.random() - 0.5);

    // Remove one card to make 24 cards (since we need odd number, we'll use 25 and hide 1)
    cardSymbols.push(''); // Add empty card for 5x5 grid

    cards = cardSymbols;
    renderBoard();
    resetStats();
}

function renderBoard() {
    const board = document.getElementById('gameBoard');
    board.innerHTML = '';

    cards.forEach((symbol, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = index;
        card.dataset.symbol = symbol;

        if (symbol === '') {
            card.style.visibility = 'hidden';
        } else {
            card.innerHTML = `
                        <div class="card-front">❓</div>
                        <div class="card-back">${symbol}</div>
                    `;
            card.addEventListener('click', () => flipCard(index));
        }

        board.appendChild(card);
    });
}

function flipCard(index) {
    if (!gameStarted) {
        startTimer();
        gameStarted = true;
    }

    const card = document.querySelector(`[data-index="${index}"]`);

    // Prevent flipping if already flipped or matched
    if (card.classList.contains('flipped') ||
        card.classList.contains('matched') ||
        flippedCards.length >= 2) {
        return;
    }

    card.classList.add('flipped');
    flippedCards.push({ index, symbol: card.dataset.symbol, element: card });

    if (flippedCards.length === 2) {
        moves++;
        document.getElementById('moves').textContent = moves;
        checkMatch();
    }
}


function checkMatch() {
    const [card1, card2] = flippedCards;

    if (card1.symbol === card2.symbol) {
        // Match found
        setTimeout(() => {
            card1.element.classList.add('matched');
            card2.element.classList.add('matched');
            matchedPairs++;
            document.getElementById('matches').textContent = `${matchedPairs} / 12`;
            flippedCards = [];

            if (matchedPairs === 12) {
                winGame();
            }
        }, 500);
    } else {
        // No match
        setTimeout(() => {
            card1.element.classList.remove('flipped');
            card2.element.classList.remove('flipped');
            flippedCards = [];
        }, 1000);
    }
}

function changeTheme(theme) {
    currentTheme = theme;

    // Update active button
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    resetGame();
}

function resetGame() {
    clearInterval(timerInterval);
    gameStarted = false;
    flippedCards = [];
    matchedPairs = 0;
    moves = 0;
    timer = 0;
    resetStats();
    initGame();
}

function resetStats() {
    document.getElementById('moves').textContent = '0';
    document.getElementById('matches').textContent = '0 / 12';
    document.getElementById('timer').textContent = '0:00';
}

function startTimer() {
    timerInterval = setInterval(() => {
        timer++;
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        document.getElementById('timer').textContent =
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function winGame() {
    clearInterval(timerInterval);
    document.getElementById('finalMoves').textContent = moves;
    document.getElementById('finalTime').textContent =
        document.getElementById('timer').textContent;

    // Fetch username from backend
    fetch('/api/me')
        .then(response => response.json())
        .then(userData => {
            const username = userData.username;
            const timeValue = document.getElementById('timer').textContent; // "0:51"
            const [minutes, seconds] = timeValue.split(':').map(Number);
            const totalSeconds = minutes * 60 + seconds;


            // Prepare score data
            const scoreData = {
                username: username,
                moves: moves,
                time: totalSeconds,
                theme: currentTheme, // your current theme
                game: "MemoryMatch",
                date: new Date().toISOString()
            };

            // Send score to backend
            return fetch('/api/memorymatch/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scoreData)
            });
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Score saved successfully!');
            } else {
                console.error('Error saving score:', data.error);
            }
        })
        .catch(err => console.error('Server error:', err));


    setTimeout(() => {
        document.getElementById('winModal').classList.add('show');
    }, 500);
}

async function showLeaderboard() {
    const content = document.getElementById('leaderboardContent');
    content.innerHTML = 'Loading...';
    document.getElementById('leaderboardModal').classList.add('show');

    try {
        // Fetch current user to highlight
        const userResponse = await fetch("/api/me");
        const currentUser = await userResponse.json();

        // Fetch scores for MemoryMatch
        const response = await fetch("/api/memorymatch/data");
        const scores = await response.json();

        if (scores.length === 0) {
            content.innerHTML = '<div class="no-scores">No scores yet. Be the first to play!</div>';
            return;
        }

        // Sort by moves, then time
        scores.sort((a, b) => a.moves - b.moves || a.time - b.time);

        // Build leaderboard table
        let tableHTML = `
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Moves</th>
                        <th>Time</th>
                        <th>Theme</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        scores.forEach((score, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

            // Convert seconds to mm:ss
            const minutes = Math.floor(score.time / 60);
            const seconds = score.time % 60;
            const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            const themeEmoji = {
                'emoji': '🎨',
                'animals': '🐾',
                'shapes': '⭐',
                'nfl': '🏈',
            }[score.theme] || '🎮';

            const date = new Date(score.date).toLocaleDateString();

            // Highlight current user
            const playerName = score.username === currentUser.username
                ? `<strong>${score.username}</strong>`
                : score.username;

            tableHTML += `
                <tr>
                    <td><span class="rank-medal">${medal}</span>${index + 1}</td>
                    <td>${playerName}</td>
                    <td>${score.moves}</td>
                    <td>${formattedTime}</td>
                    <td>${themeEmoji}</td>
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


function closeModal() {
    document.getElementById('winModal').classList.remove('show');
    resetGame();
}

function showRules() {
    document.getElementById('rulesModal').classList.add('show');
}

function closeRulesModal() {
    document.getElementById('rulesModal').classList.remove('show');
}

function closeLeaderboard() {
    document.getElementById('leaderboardModal').classList.remove('show');
}

// Press Q to flip and un-flip cards (dev cheats)
document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'q') {
        toggleAllCards();
    }
});

let allFlipped = false;

function toggleAllCards() {
    const cards = document.querySelectorAll('.card');
    allFlipped = !allFlipped;

    cards.forEach(card => {
        if (allFlipped) {
            card.classList.add('flipped'); // show all
        } else {
            if (!card.classList.contains('matched')) {
                card.classList.remove('flipped'); // hide again unless matched
            }
        }
    });

    console.log(`All cards ${allFlipped ? 'flipped' : 'reset'}`);
}

// Initialize game on load
window.onload = initGame;