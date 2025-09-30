# Proposal For Final Project

## Group Details:

 **Members**: Shawn Patel, Ken Sebastian, Peter Czepiel, Timothy Hutzley <br>
 **Group Number**: 12

## Proposal

### Final Project: Mini Game Arcade

Our project is a web-based Mini Game Arcade that features a collection of simple, fun, and interactive games designed for casual play. 
Users can navigate through the arcade homescreen to play games such as Minesweeper, Hangman, Memory Match, and Whack-a-Mole, each implemented with dynamic JavaScript to provide responsive gameplay. 
The arcade includes a persistent scoreboard powered by a database, allowing players to track their high scores per game across sessions.
Users will be required to login with Github account before the homescreen shows to be able to store their scores. Each game will have own scoring logic and leaderboard for that game.
This project demonstrates our understanding of web development concepts, including static page design, client-side interactivity, server-side data management, and user experience, 
while giving each group member the opportunity to contribute independently to a distinct game or feature.


### Technology/Libraries (maybe more depending on requirements for each game)
- HTML & CSS – For building accessible, visually appealing, and responsive static pages.
- JavaScript – To implement dynamic behavior, interactive gameplay, animations, and client-side logic for each mini-game.
- Node.js & Express – To handle server-side functionality, route requests, and manage communication between the client and database.
- MongoDB – To persistently store player scores, user accounts, and leaderboard data across sessions.
- Git & GitHub – For version control, collaborative coding, and deployment.
- Passport.js - For Github Authentication for login
- Three.js – To render 3D graphics and immersive game experiences for some mini-games, making the arcade visually engaging.

### Our Games Include:

#### Minesweeper:

- Game Board: 5x5 area with 5 bombs all randomized
- Gameplay: click on a tile to reveal it. This will yield a number (1-4) indicating how many bombs are adjacent to that tile. If the tile is blank (no number) then all adjacent tiles are safe (no bomb).
- Leaderboard: a timer will begin on clicking start game. This, along with the number of tiles revealed, will be put in a leaderboard.
- Animations: there will be smooth and kinetic animations upon starting/ending the game and revealing tiles.
- Backend Integration: Node.js/Express backend with MongoDB to save each players time and score.
- Enhancements: Maybe sound effects or explosion when clicking on a bomb. Also maybe add the flagging capability of normal minesweeper.

#### Hangman:

- Starts with a 1-minute timer. Pull from a list of random 5 - 10 letter words. The user guesses one letter at a time. For each mistake, some time is taken off of the timer. Once a word is found, the next word appears. When the timer is up, the final score (total words found) is stored in the database.
- Visual effects, like frowny face when a mistake is made, and smiley face when a word is found.

#### Memory Match:
- Game Board: A grid of cards, each hiding an image or symbol, shuffled at the start.
- Gameplay: Players flip two cards at a time; matches stay face-up, mismatches flip back after a brief delay. Move count and matches are tracked.
- Leaderboard: Have a timer and/or point based scoring system.
- Animations & Effects: Smooth card flips using CSS transitions or GSAP, with maybe sound effects.
- Backend Integration: Node.js/Express backend with MongoDB to save high scores for each player.
- Enhancements: Potentially have multiple difficulty levels or themes for replayability.

#### Whack-a-Mole:

