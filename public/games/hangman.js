document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const wordDisplay = document.getElementById('word-display');
    const incorrectLettersEl = document.getElementById('incorrect-letters');
    const timerEl = document.getElementById('timer');
    const scoreEl = document.getElementById('score');
    const messageContainer = document.getElementById('message-container');

    // Modals
    const gameOverModal = document.getElementById('game-over-modal');
    const leaderboardModal = document.getElementById('leaderboardModal');
    const rulesModal = document.getElementById('rules-modal');
    const finalScoreEl = document.getElementById('final-score');
    const leaderboardContent = document.getElementById('leaderboardContent');

    // Buttons
    const newGameButton = document.querySelector('.controls .btn-primary');
    const leaderboardButton = document.querySelector('.btn-leaderboard');
    const rulesButton = document.querySelector('.btn-secondary');
    const restartButton = document.getElementById('restart-button');
    const closeLeaderboardButton = leaderboardModal.querySelector('.btn-primary');
    const closeRulesButton = document.getElementById('close-rules-btn');

    // --- Game State Variables ---
    let currentWord = '';
    let correctGuesses = [];
    let incorrectGuesses = [];
    let score = 0;
    let timeRemaining = 120; // 2 minutes in seconds
    let timerInterval;
    let gameActive = false;
    let wordList = [];

    // --- Core Game Functions ---

    async function fetchWordList() {
        messageContainer.innerHTML = "<p>Loading word list...</p>";
        try {
            const lengths = [6, 7, 8, 9, 10];
            const promises = lengths.map(length =>
                fetch(`https://random-word-api.herokuapp.com/word?number=10&length=${length}`)
                .then(res => res.json())
            );
            const wordArrays = await Promise.all(promises);
            wordList = wordArrays.flat();
            for (let i = wordList.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [wordList[i], wordList[j]] = [wordList[j], wordList[i]];
            }
        } catch (error) {
            console.error("Error fetching word list:", error);
            messageContainer.textContent = "Could not fetch words. Please refresh.";
        }
    }

    async function getNewWord() {
        if (wordList.length === 0) {
            await fetchWordList();
        }
        currentWord = wordList.pop()?.toLowerCase() || 'default';
        resetRound();
    }

    function resetRound() {
        correctGuesses = [];
        incorrectGuesses = [];
        updateWordDisplay();
        updateIncorrectGuesses();
        messageContainer.innerHTML = "<p>Guess a letter!</p>";
    }

    async function initializeGame() {
        score = 0;
        timeRemaining = 120;
        scoreEl.textContent = score;
        updateTimerDisplay();
        gameOverModal.style.display = 'none';
        if (timerInterval) clearInterval(timerInterval);
        await fetchWordList();
        await getNewWord();
        startTimer();
        gameActive = true;
    }

    function handleKeyPress(e) {
        if (!gameActive) return;
        const letter = e.key.toLowerCase();
        if (letter.match(/^[a-z]$/)) {
            if (correctGuesses.includes(letter) || incorrectGuesses.includes(letter)) {
                messageContainer.innerHTML = `<p>You already guessed '${letter}'. Try another!</p>`;
                return;
            }
            if (currentWord.includes(letter)) {
                correctGuesses.push(letter);
                updateWordDisplay();
                checkWinCondition();
            } else {
                incorrectGuesses.push(letter);
                timeRemaining -= 3;
                updateTimerDisplay();
                updateIncorrectGuesses();
                if (timeRemaining <= 0) endGame();
            }
        }
    }

    // --- MODIFIED FUNCTION ---
    // Check if the user has completed the current word
    function checkWinCondition() {
        const allLettersGuessed = currentWord.split('').every(letter => correctGuesses.includes(letter));
        if (allLettersGuessed) {
            score++;
            scoreEl.textContent = score;
            messageContainer.innerHTML = `<p>Correct!</p>`; // Show success message
            gameActive = false; // Pause the game briefly

            // Wait 1 second before getting the next word
            setTimeout(() => {
                getNewWord();
                gameActive = true; // Resume the game
            }, 1000); // 1000 milliseconds = 1 second
        }
    }
    // --- END OF MODIFICATION ---

    function updateWordDisplay() {
        wordDisplay.innerHTML = currentWord.split('').map(letter => `
            <div class="letter-box">${correctGuesses.includes(letter) ? letter : ''}</div>
        `).join('');
    }

    function updateIncorrectGuesses() {
        incorrectLettersEl.innerHTML = incorrectGuesses.map(letter => `
            <span class="incorrect-letter">${letter}</span>
        `).join('');
    }

    function updateTimerDisplay() {
        if (timeRemaining < 0) timeRemaining = 0;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                endGame();
            }
        }, 1000);
    }

    function endGame() {
        clearInterval(timerInterval);
        gameActive = false;
        finalScoreEl.textContent = score;
        saveScore(score);
        gameOverModal.style.display = 'flex';
    }

    async function saveScore(finalScore) {
        try {
            const userResponse = await fetch('/api/me');
            const userData = await userResponse.json();
            if (!userData.username) throw new Error("User not logged in");
            const scoreData = {
                username: userData.username,
                score: finalScore,
                game: "Hangman",
                date: new Date().toISOString()
            };
            const saveResponse = await fetch('/api/hangman/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scoreData)
            });
            const result = await saveResponse.json();
            if (result.success) {
                console.log('Score saved successfully!');
            } else {
                console.error('Error saving score:', result.error);
            }
        } catch (err) {
            console.error('Server error during score save:', err);
        }
    }

    async function showLeaderboard() {
        leaderboardContent.innerHTML = 'Loading...';
        leaderboardModal.style.display = 'block';
        try {
            const userResponse = await fetch("/api/me");
            const currentUser = await userResponse.json();
            const scoresResponse = await fetch("/api/hangman/data");
            const scores = await scoresResponse.json();
            if (scores.length === 0) {
                leaderboardContent.innerHTML = '<div class="no-scores">No scores yet. Be the first!</div>';
                return;
            }
            scores.sort((a, b) => b.score - a.score);
            let tableHTML = `
                <table class="leaderboard-table">
                    <thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Date</th></tr></thead>
                    <tbody>
            `;
            scores.forEach((s, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                const date = new Date(s.date).toLocaleDateString();
                const isCurrentUser = s.username === currentUser.username;
                tableHTML += `
                    <tr class="${isCurrentUser ? 'current-user' : ''}">
                        <td><span class="rank-medal">${medal}</span>${index + 1}</td>
                        <td>${s.username}</td>
                        <td>${s.score}</td>
                        <td>${date}</td>
                    </tr>
                `;
            });
            tableHTML += '</tbody></table>';
            leaderboardContent.innerHTML = tableHTML;
        } catch (err) {
            console.error("Error loading leaderboard:", err);
            leaderboardContent.innerHTML = '<div class="no-scores">Failed to load scores.</div>';
        }
    }

    function closeLeaderboard() {
        leaderboardModal.style.display = 'none';
    }

    function showRules() {
        rulesModal.style.display = 'block';
    }

    function closeRules() {
        rulesModal.style.display = 'none';
    }

    // --- Event Listeners ---
    newGameButton.addEventListener('click', initializeGame);
    restartButton.addEventListener('click', initializeGame);
    leaderboardButton.addEventListener('click', showLeaderboard);
    closeLeaderboardButton.addEventListener('click', closeLeaderboard);
    rulesButton.addEventListener('click', showRules);
    closeRulesButton.addEventListener('click', closeRules);
    window.addEventListener('keydown', handleKeyPress);

    // Initial game start on page load
    initializeGame();
});

