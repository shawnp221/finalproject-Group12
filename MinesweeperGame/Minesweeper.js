(function(){
  const boardEl = document.getElementById('board');
  const resetBtn = document.getElementById('resetBtn');
  const smileyBtn = document.getElementById('smiley');
  const mineCounterEl = document.getElementById('mineCounter');
  const timerEl = document.getElementById('timer');
  const statusText = document.getElementById('statusText');
  const msgEl = document.getElementById('msg');
  const leaderboardEl = document.getElementById('leaderboardList');

  // Only beginner settings
  let cols=9, rows=9, mines=10;
  let grid = [];
  let started=false;
  let finished=false;
  let flags=0;
  let revealedCount=0;
  let timer=0, timerInterval=null;

  // Leaderboard data
  function loadLeaderboard(){
    const scores = JSON.parse(localStorage.getItem("ms_leaderboard") || "[]");
    return scores;
  }

  function saveLeaderboard(scores){
    localStorage.setItem("ms_leaderboard", JSON.stringify(scores));
  }

  function renderLeaderboard(){
    const scores = loadLeaderboard();
    leaderboardEl.innerHTML = "";
    scores.slice(0,10).forEach(s=>{
      const li = document.createElement("li");
      li.textContent = `${s.name} — ${s.time}s`;
      leaderboardEl.appendChild(li);
    });
  }

  function addScore(name, time){
    const scores = loadLeaderboard();
    scores.push({name, time});
    scores.sort((a,b)=>a.time-b.time); // sort ascending
    saveLeaderboard(scores);
    renderLeaderboard();
  }

  function createEmptyGrid(c,r){
    const arr = new Array(r);
    for(let y=0;y<r;y++){
      arr[y]=new Array(c);
      for(let x=0;x<c;x++){
        arr[y][x] = {mine:false, revealed:false, flagged:false, neighbor:0, x, y};
      }
    }
    return arr;
  }

  function placeMinesAvoiding(firstX, firstY){
    const toAvoid = new Set();
    for(let dy=-1;dy<=1;dy++){
      for(let dx=-1;dx<=1;dx++){
        const nx = firstX+dx, ny = firstY+dy;
        if(nx>=0 && nx<cols && ny>=0 && ny<rows){
          toAvoid.add(`${nx},${ny}`);
        }
      }
    }
    let placed=0;
    while(placed < mines){
      const x = Math.floor(Math.random()*cols);
      const y = Math.floor(Math.random()*rows);
      const key = `${x},${y}`;
      if(toAvoid.has(key)) continue;
      if(!grid[y][x].mine){
        grid[y][x].mine = true;
        placed++;
      }
    }
    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        if(grid[y][x].mine){ grid[y][x].neighbor = -1; continue; }
        let count=0;
        for(let dy=-1;dy<=1;dy++){
          for(let dx=-1;dx<=1;dx++){
            if(dx===0 && dy===0) continue;
            const nx = x+dx, ny = y+dy;
            if(nx>=0 && nx<cols && ny>=0 && ny<rows && grid[ny][nx].mine) count++;
          }
        }
        grid[y][x].neighbor = count;
      }
    }
  }

  function renderBoard(){
    boardEl.innerHTML='';
    boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
    boardEl.style.gridTemplateRows = `repeat(${rows}, var(--tile-size))`;
    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        const cell = grid[y][x];
        const cellEl = document.createElement('div');
        cellEl.className = 'cell';
        cellEl.setAttribute('data-x', x);
        cellEl.setAttribute('data-y', y);

        if(cell.revealed){
          cellEl.classList.add('revealed');
          if(cell.mine){
            cellEl.classList.add('mine');
            cellEl.textContent = '💣';
          } else if(cell.neighbor>0){
            cellEl.textContent = cell.neighbor;
            cellEl.classList.add('n'+cell.neighbor);
          }
        } else if(cell.flagged){
          cellEl.classList.add('flagged');
          cellEl.textContent = '🚩';
        }

        cellEl.addEventListener('click', ()=>onCellLeftClick(x,y));
        cellEl.addEventListener('contextmenu', (ev)=>{ev.preventDefault();onCellRightClick(x,y);});

        boardEl.appendChild(cellEl);
      }
    }
    updateCounters();
  }

  function updateCounters(){
    mineCounterEl.textContent = String(Math.max(0, mines - flags)).padStart(3,'0');
  }

  function startTimer(){
    if(timerInterval) clearInterval(timerInterval);
    timer = 0;
    timerEl.textContent = '0';
    timerInterval = setInterval(()=>{
      timer++;
      timerEl.textContent = String(timer);
    },1000);
  }

  function stopTimer(){
    if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
  }

  function revealAllMines(){
    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        const c = grid[y][x];
        if(c.mine) c.revealed = true;
      }
    }
  }

  function floodReveal(sx, sy){
    const stack = [[sx,sy]];
    while(stack.length){
      const [x,y] = stack.pop();
      const c = grid[y][x];
      if(c.revealed || c.flagged) continue;
      c.revealed = true;
      revealedCount++;
      if(c.neighbor === 0){
        for(let dy=-1;dy<=1;dy++){
          for(let dx=-1;dx<=1;dx++){
            const nx = x+dx, ny = y+dy;
            if(nx>=0 && nx<cols && ny>=0 && ny<rows){
              const nc = grid[ny][nx];
              if(!nc.revealed && !nc.flagged && !nc.mine){
                stack.push([nx,ny]);
              }
            }
          }
        }
      }
    }
  }

  function onCellLeftClick(x,y){
    if(finished) return;
    const c = grid[y][x];
    if(c.revealed || c.flagged) return;

    if(!started){
      placeMinesAvoiding(x,y);
      started = true;
      startTimer();
      statusText.textContent = 'In progress';
    }

    if(c.mine){
      c.revealed = true;
      revealAllMines();
      finished = true;
      stopTimer();
      renderBoard();
      statusText.textContent = 'You lost';
      msgEl.textContent = '💥 Boom! You hit a mine.';
      smileyBtn.textContent = '😵';
      return;
    }

    floodReveal(x,y);
    renderBoard();
    checkWin();
  }

  function onCellRightClick(x,y){
    if(finished) return;
    const c = grid[y][x];
    if(c.revealed) return;
    c.flagged = !c.flagged;
    flags += c.flagged ? 1 : -1;
    updateCounters();
    renderBoard();
    checkWin();
  }

  function checkWin(){
    const totalCells = cols*rows;
    const nonMine = totalCells - mines;
    let revealed=0;
    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        if(grid[y][x].revealed) revealed++;
      }
    }
    if(revealed === nonMine){
      finished = true;
      stopTimer();
      revealAllMines();
      renderBoard();
      statusText.textContent = 'You won!';
      msgEl.textContent = '🎉 Congratulations!';
      smileyBtn.textContent = '😎';

      const name = prompt("You won! Enter your name:");
      if(name){
        addScore(name, timer);
      }
    }
  }

  function resetGame(){
    grid = createEmptyGrid(cols, rows);
    started=false;
    finished=false;
    flags=0;
    revealedCount=0;
    stopTimer();
    timer = 0;
    timerEl.textContent = '0';
    statusText.textContent = 'Ready';
    msgEl.textContent = '';
    smileyBtn.textContent = '😊';
    updateCounters();
    renderBoard();
  }

  resetBtn.addEventListener('click', resetGame);
  smileyBtn.addEventListener('click', resetGame);

  // Init
  resetGame();
  renderLeaderboard();

})();
