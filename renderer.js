// renderer.js — UI glue: draws board + tokens and connects to engine.js
// Minimal renderer for MVP (no movement animation yet)

(function(){
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const CELL = 80;
  const STACK = [{x:-12,y:-12},{x:12,y:-12},{x:-12,y:12},{x:12,y:12}];

  let selectedToken = 0;

  function $(s){ return document.querySelector(s); }
  function $all(s){ return Array.from(document.querySelectorAll(s)); }

  function init(){
    Game.init();
    bindUI();
    drawBoard();
  }

  function bindUI(){
    $('#drawBtn').addEventListener('click', () => {
      const roll = Game.drawMarbles();
      showMarbles(roll);
      $('#rollInfo').textContent = `Whites: ${roll.whites} — Steps: ${roll.steps} — allSame:${roll.allSame}`;
      // wait for player to click token to apply move
      log(`Player ${Game.getState().currentPlayer + 1} rolled`);
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const state = Game.getState();
      const player = state.players[state.currentPlayer];

      // build groups by position to find tokens and their drawn offsets (STACK)
      const groups = {};
      player.tokens.forEach((t, idx) => {
        if(t.finished) return;
        const pos = t.isAtHome ? player.start : (t.mode==='outer' ? Game.getOuterPath()[t.outerIndex] : Game.getInnerPath()[t.innerIndex]);
        const key = `${pos.x},${pos.y}`;
        if(!groups[key]) groups[key]=[];
        groups[key].push({tokenIdx:idx, pos});
      });

      for(const key in groups){
        const [kx,ky] = key.split(',').map(Number);
        groups[key].forEach((item, stackIdx)=>{
          const cx = kx*CELL + CELL/2 + STACK[stackIdx].x;
          const cy = ky*CELL + CELL/2 + STACK[stackIdx].y;
          const dx = mx - cx, dy = my - cy;
          if(Math.sqrt(dx*dx+dy*dy) <= 14){
            selectedToken = item.tokenIdx;
            drawBoard();
            // if there is a pending roll, apply move immediately
            const stateNow = Game.getState();
            if(stateNow.lastRoll){
              const res = Game.applyMove(selectedToken);
              if(res.error) { log(res.error); }
              else {
                if(res.moved) log(`Moved token ${selectedToken+1}`);
                if(res.won) {
                  log(`Player ${stateNow.currentPlayer+1} WINS!`);
                }
                // advance turn if needed
                Game.nextPlayerIfNeeded(res.grantExtraTurn);
                clearMarbles();
                drawBoard();
              }
            }
          }
        });
      }
    });
  }

  function showMarbles(roll){
    clearMarbles();
        clearMarbles();
        const box = $('#marbleBox');
        for(let i=0;i<4;i++){
            const d = document.createElement('div');
            d.className = 'marble ' + ((i < roll.whites) ? 'white' : 'black');
            box.appendChild(d);
        }
        
        // Check if only one token can move and auto-select it
        const state = Game.getState();
        const player = state.players[state.currentPlayer];
        const movableTokens = player.tokens.filter((t, idx) => !t.finished && (t.isAtHome ? roll.allSame : true));
        
        if(movableTokens.length === 1){
            // Auto-select the only movable token
            selectedToken = player.tokens.findIndex(t => t === movableTokens[0]);
            // Auto-apply move
            setTimeout(() => {
                const res = Game.applyMove(selectedToken);
                if(!res.error){
                    if(res.moved) log(`Auto-moved token ${selectedToken+1}`);
                    if(res.won) log(`Player ${state.currentPlayer+1} WINS!`);
                    Game.nextPlayerIfNeeded(res.grantExtraTurn);
                    clearMarbles();
                    drawBoard();
                }
            }, 300); // Small delay to see the marble draw
        }    }
  }

  function clearMarbles(){
        $('#marbleBox').innerHTML = '';
        $('#rollInfo').textContent = '';  }

  function log(msg){
    const l = $('#log');
    l.textContent = msg;
  }

  function drawBoard(){
    const state = Game.getState();
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // draw grid & board colors (basic)
    const b = [
      [0,0,1,0,0],
      [0,0,0,0,0],
      [1,0,2,0,1],
      [0,0,0,0,0],
      [0,0,1,0,0]
    ];
    for(let y=0;y<5;y++)for(let x=0;x<5;x++){
      ctx.fillStyle = b[y][x]===1 ? '#f4a261' : b[y][x]===2 ? '#90dbf4' : '#f8f8f8';
      ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
      ctx.strokeRect(x*CELL,y*CELL,CELL,CELL);
    }

    // draw outer/inner arrows lightly (optional)
    const outer = Game.getOuterPath();
    const inner = Game.getInnerPath();
    // draw tokens
    state.players.forEach((p, pi)=>{
      const groups = {};
      p.tokens.forEach((t, idx)=>{
        if(t.finished) return;
        const pos = t.isAtHome ? p.start : (t.mode==='outer' ? outer[t.outerIndex] : inner[t.innerIndex]);
        const key = `${pos.x},${pos.y}`;
        if(!groups[key]) groups[key]=[];
        groups[key].push({tokenIdx: idx, pos});
      });

      Object.values(groups).forEach((arr)=>{
        arr.forEach((item, i)=>{
          const pos = item.pos;
          const stack = i;
          const cx = pos.x*CELL + CELL/2 + STACK[stack].x;
          const cy = pos.y*CELL + CELL/2 + STACK[stack].y;
          ctx.beginPath();
          ctx.fillStyle = p.color;
          const highlighted = (pi === state.currentPlayer && item.tokenIdx === selectedToken);
          ctx.arc(cx, cy, highlighted ? 12 : 10, 0, Math.PI*2);
          ctx.fill();
          ctx.lineWidth = highlighted ? 3 : 1;
          ctx.strokeStyle = highlighted ? '#000' : '#333';
          ctx.stroke();
        });
      });
    });

    // highlight active player box
    $all('.playerBox').forEach((el, i)=> el.classList.toggle('active', i === state.currentPlayer));
  }

  // expose init
  init();
})();
