# Game Arcade Group 12

## What we built
**Site Link:** https://retro-arcade-6mqx.onrender.com/
This web app is a custom "Game Arcade" featuring four classic games: Minesweeper, Hangman, Whack-a-Mole, and Memory Match. The arcade provides a platform where users can select and play any of the four games provided. To navigate trough the website, first the user must login through github to access the main page. On the main page, the user is able to select any of the four games and jump straight into playing. 

Each game comes with it's own unique way of keeping score and provides a global leaderboard amongst all signed in users. This leaderboard displays each player's rank, github username, the date, and any additional fields necessary for the given game. Each game runs entirely using HTML/CSS/JS for the frontend and Express/Node.js for backend. Lastly, there is a hidden Konami code secret on the login screen if the correct actions are performed. (up, up, down, down, left, right, left, right, B, A)

## Technology Outline
- **Front end:** HTML to properly render and display the page, CSS to style the pages to better represent a game, and vanilla JS for game logic, inputs, timers, etc...
- **Back end:** Node.js + Express for routes, auth, and score APIs and MongoDB to persistently store and display leaderboard records.

## Challenges We Faced
- **Creating the Games From Scratch:**
    - **Minesweeper:** Safe first click and recursive flood fill algorithm to ensure the automatic revealing of larger empty spaces.
    - **Hangman:** Keeping track of multiple states at all times such as words used, letters guessed, letters correct/displayed, and time remaining, all in a responsive matter.
    - **Memory Match:** Locking input during pair checks and smooth flip animations without any issues without slowing down the user experience.
    - **Whack-a-Mole:** Properly implementing timing windows and hit detection that feel satisfying for the user and not unfair.

## Roles
- **Peter Czepiel** — Minesweeper creation, quality assurance for each game
- **Ken Sebastian** — Hangman creation, deployment
- **Shawn Patel** — Login/auth, MongoDB setup, Memory Match creation
- **Timothy Hutzley** — Whack-A-Mole creation, readme write-up

Using Shawn's provided MongoDB setup, each member was able to take their game and properly connect to the database using their own unique fields.

## Accessibility features
- **Visually easy to see:** Strong contrasting colors and clear icons and or text for the user to easily understand and follow the games.
- **Gentle motion:** Animations are simple and do not cause too much motion on the screen at once.
- **No flash content:** Even though we are making games, no content on the page is too flashy or strobe-like, allowing even more users to access our site.
- **Screen readers:** We set the page language to English with some helpful content dividers to allow screen readers to follow the path of the pages.
