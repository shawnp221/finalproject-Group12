document.addEventListener('DOMContentLoaded', () => {
    const wordDisplay = document.getElementById('word-display');
    const incorrectLettersEl = document.getElementById('incorrect-letters');
    const timerEl = document.getElementById('timer');
    const scoreEl = document.getElementById('score');
    const messageContainer = document.getElementById('message-container');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreEl = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');

    let currentWord = '';
    let correctGuesses = [];
    let incorrectGuesses = [];
    let score = 0;
    let timeRemaining = 120; // 2 minutes in seconds
    let timerInterval;
    let gameActive = false; // Set to false initially
    let wordList = []; // Array to store the pre-fetched words

    // Fetch a list of words from the API by making multiple calls for specific lengths
    async function fetchWordList() {
        try {
            const lengths = [7, 8, 9, 10, 11, 12];
            // Create an array of fetch promises, one for each length
            const promises = lengths.map(length =>
                fetch(`https://random-word-api.herokuapp.com/word?number=7&length=${length}`)
                .then(res => res.json())
            );

            // Wait for all API calls to complete
            const wordArrays = await Promise.all(promises);
            wordList = wordArrays.flat(); // Flatten the array of arrays into a single list of words

            // Shuffle the list for random word order using the Fisher-Yates algorithm
            for (let i = wordList.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [wordList[i], wordList[j]] = [wordList[j], wordList[i]];
            }

        } catch (error) {
            console.error("Error fetching word list:", error);
            messageContainer.textContent = "Could not fetch words. Please refresh.";
        }
    }


    // Get a new word from our local list
    async function getNewWord() {
        // If the list is empty, fetch more words
        if (wordList.length === 0) {
            messageContainer.innerHTML = "<p>Fetching more words...</p>";
            gameActive = false;
            await fetchWordList();
            gameActive = true;
        }

        currentWord = wordList.pop().toLowerCase();
        resetRound();
    }

    // Reset the game for a new round
    function resetRound() {
        correctGuesses = [];
        incorrectGuesses = [];
        updateWordDisplay();
        updateIncorrectGuesses();
        messageContainer.innerHTML = "<p>Type any letter to guess!</p>";
    }

    // Update the displayed word with underscores and correct letters
    function updateWordDisplay() {
        wordDisplay.innerHTML = '';
        currentWord.split('').forEach(letter => {
            const letterBox = document.createElement('div');
            letterBox.classList.add('letter-box');
            letterBox.textContent = correctGuesses.includes(letter) ? letter : '';
            wordDisplay.appendChild(letterBox);
        });
    }

    // Update the list of incorrect guesses
    function updateIncorrectGuesses() {
        incorrectLettersEl.innerHTML = '';
        incorrectGuesses.forEach(letter => {
            const incorrectLetter = document.createElement('span');
            incorrectLetter.classList.add('incorrect-letter');
            incorrectLetter.textContent = letter;
            incorrectLettersEl.appendChild(incorrectLetter);
        });
    }

    // Handle user key presses
    function handleKeyPress(e) {
        if (!gameActive) return;

        const letter = e.key.toLowerCase();
        if (letter.match(/^[a-z]$/)) { // Check if it's a single letter
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
                if (timeRemaining <= 0) {
                    endGame();
                }
            }
        }
    }

    // Check if the user has guessed the entire word
    function checkWinCondition() {
        const allLettersGuessed = currentWord.split('').every(letter => correctGuesses.includes(letter));
        if (allLettersGuessed) {
            score++;
            scoreEl.textContent = score;
            // Immediately get the next word without any delay or message
            getNewWord();
        }
    }

    // Start and update the timer
    function startTimer() {
        gameActive = true; // Activate game only when timer starts
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                endGame();
            }
        }, 1000);
    }

    // Format and display the time
    function updateTimerDisplay() {
        if (timeRemaining < 0) timeRemaining = 0;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // End the game
    function endGame() {
        clearInterval(timerInterval);
        gameActive = false;
        finalScoreEl.textContent = score;
        gameOverModal.style.display = 'flex';
    }

    // Initialize the game
    async function initializeGame() {
        score = 0;
        timeRemaining = 120;
        scoreEl.textContent = score;
        updateTimerDisplay();
        gameOverModal.style.display = 'none';
        messageContainer.innerHTML = "<p>Loading words...</p>";
        gameActive = false;

        // Clear any old timer interval
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        await fetchWordList(); // Wait for the word list to load first
        await getNewWord(); // Get the first word from the list

        startTimer(); // Then start the timer

        window.addEventListener('keydown', handleKeyPress);
    }

    restartButton.addEventListener('click', () => {
        window.removeEventListener('keydown', handleKeyPress);
        initializeGame();
    });

    // Start the game on page load
    initializeGame();
});


