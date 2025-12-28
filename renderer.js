// renderer.js — Enhanced UI with automatic turn advancement

(function(){
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const CELL = 80;
  const STACK = [{x:-12,y:-12},{x:12,y:-12},{x:-12,y:12},{x:12,y:12}];
  
  let selectedToken = 0;
  let animating = false;
  let waitingForMove = false; // New: tracks if we're waiting for a move after drawing
  
  function $(s){ return document.querySelector(s); }
  function $all(s){ return Array.from(document.querySelectorAll(s)); }
  
  function init(){
    Game.init();
    bindUI();
    drawBoard();
    updateTurnIndicator();
  }
  
  function bindUI(){
    $('#drawBtn').addEventListener('click', () => {
      if(animating || waitingForMove) return;
      
      const roll = Game.drawMarbles();
      if(!roll) return;
      
      showMarbles(roll);
      $('#rollInfo').textContent = `Whites: ${roll.whites} — Steps: ${roll.steps}`;
      
      const state = Game.getState();
      log(`Player ${state.currentPlayer + 1} rolled: ${roll.steps} steps`);
      
      waitingForMove = true;
      
      // Check if player has any valid moves
      const canMove = checkIfCanMove(state, roll);
      
      if(!canMove){
        // No valid moves - skip turn after showing marbles briefly
        log(`Player ${state.currentPlayer + 1} has no valid moves`);
        setTimeout(() => {
          endTurn(false);
        }, 800);
      } else {
        // Auto-select and move if only one token can move
        setTimeout(() => autoSelectAndMove(roll), 300);
      }
    });
    
    canvas.addEventListener('click', (e) => {
      if(animating || !waitingForMove) return;
      
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const state = Game.getState();
      
      const player = state.players[state.currentPlayer];
      const clicked = findClickedToken(mx, my, player);
      
      if(clicked !== null){
        selectedToken = clicked;
        handleTokenMove();
      }
    });
  }
  
  function checkIfCanMove(state, roll){
    const player = state.players[state.currentPlayer];
    // Check if any token can make a valid move
    for(let i = 0; i < player.tokens.length; i++){
      const t = player.tokens[i];
      if(t.finished) continue;
      // Token at home can only move if allSame
      if(t.isAtHome && !roll.allSame) continue;
      // This token can move
      return true;
    }
    return false;
  }
  
  function findClickedToken(mx, my, player){
    const groups = {};
    player.tokens.forEach((t, idx) => {
      if(t.finished) return;
      const pos = t.isAtHome ? player.start : 
        (t.mode==='outer' ? Game.getOuterPath()[t.outerIndex] : Game.getInnerPath()[t.innerIndex]);
      const key = `${pos.x},${pos.y}`;
      if(!groups[key]) groups[key]=[];
      groups[key].push({tokenIdx:idx, pos});
    });
    
    for(const key in groups){
      const [kx,ky] = key.split(',').map(Number);
      for(let i=0; i<groups[key].length; i++){
        const item = groups[key][i];
        const cx = kx*CELL + CELL/2 + STACK[i].x;
        const cy = ky*CELL + CELL/2 + STACK[i].y;
        const dx = mx - cx, dy = my - cy;
        if(Math.sqrt(dx*dx+dy*dy) <= 14){
          return item.tokenIdx;
        }
      }
    }
    return null;
  }
  
  function autoSelectAndMove(roll){
    const state = Game.getState();
    const player = state.players[state.currentPlayer];
    const movableTokens = player.tokens.filter((t, idx) => 
      !t.finished && (t.isAtHome ? roll.allSame : true)
    );
    
    if(movableTokens.length === 1){
      selectedToken = player.tokens.findIndex(t => t === movableTokens[0]);
      drawBoard();
      setTimeout(() => handleTokenMove(), 200);
    }
  }
  
  function handleTokenMove(){
    animating = true;
    Game.setMoving(true);
    
    const res = Game.applyMove(selectedToken);
    
    if(res.error){
      log(res.error);
      animating = false;
      Game.setMoving(false);
      return;
    }
    
    if(res.moved){
      const state = Game.getState();
      log(`Player ${state.currentPlayer+1} moved token ${selectedToken+1}`);
      
      if(res.didCapture) log(`Captured! Extra turn granted`);
      if(res.won) {
        log(`🎉 Player ${state.currentPlayer+1} WINS!`);
        $('#drawBtn').disabled = true;
        waitingForMove = false;
        animating = false;
        Game.setMoving(false);
        return;
      }
      
      animateMove(() => {
        endTurn(res.grantExtraTurn);
      });
    }
  }
  
  function endTurn(grantExtraTurn){
    Game.nextPlayerIfNeeded(grantExtraTurn);
    clearMarbles();
    drawBoard();
    updateTurnIndicator();
    animating = false;
    Game.setMoving(false);
    waitingForMove = false;
  }
  
  function animateMove(callback){
    setTimeout(() => {
      drawBoard();
      callback();
    }, 300);
  }
  
  function showMarbles(roll){
    clearMarbles();
    const box = $('#marbleBox');
    for(let i=0;i<4;i++){
      const d = document.createElement('div');
      d.className = 'marble ' + ((i < roll.whites) ? 'white' : 'black');
      box.appendChild(d);
    }
  }
  
  function clearMarbles(){
    $('#marbleBox').innerHTML = '';
    $('#rollInfo').textContent = '';
  }
  
  function log(msg){
    const l = $('#log');
    const p = document.createElement('p');
    p.textContent = msg;
    l.appendChild(p);
    l.scrollTop = l.scrollHeight;
    while(l.children.length > 5) l.removeChild(l.firstChild);
  }
  
  function updateTurnIndicator(){
    const state = Game.getState();
    $all('.playerBox').forEach((el, i)=> {
      el.classList.toggle('active', i === state.currentPlayer);
      const finishedCount = state.players[i].tokens.filter(t=>t.finished).length;
      el.querySelector('.marbles').textContent = `✓${finishedCount}/4`;
    });
  }
  
  function drawBoard(){
    const state = Game.getState();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    const b = [
      [0,0,1,0,0],
      [0,0,0,0,0],
      [1,0,2,0,1],
      [0,0,0,0,0],
      [0,0,1,0,0]
    ];
    
    for(let y=0;y<5;y++){
      for(let x=0;x<5;x++){
        if(b[y][x]===1){
          ctx.fillStyle = '#f4a261';
          ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
          ctx.strokeStyle = '#e07a00';
          ctx.lineWidth = 3;
          ctx.strokeRect(x*CELL+2,y*CELL+2,CELL-4,CELL-4);
        } else if(b[y][x]===2){
          ctx.fillStyle = '#90dbf4';
          ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
          ctx.strokeStyle = '#1f4fd8';
          ctx.lineWidth = 4;
          ctx.strokeRect(x*CELL+3,y*CELL+3,CELL-6,CELL-6);
          ctx.fillStyle = '#ffdd00';
          ctx.font = '40px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⭐', x*CELL+CELL/2, y*CELL+CELL/2);
        } else {
          ctx.fillStyle = '#f8f8f8';
          ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 1;
          ctx.strokeRect(x*CELL,y*CELL,CELL,CELL);
        }
      }
    }
    
    drawDirectionArrows();
    
    state.players.forEach((p, pi)=>{
      const groups = {};
      p.tokens.forEach((t, idx)=>{
        if(t.finished) return;
        const pos = t.isAtHome ? p.start : 
          (t.mode==='outer' ? Game.getOuterPath()[t.outerIndex] : Game.getInnerPath()[t.innerIndex]);
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
          const radius = highlighted ? 13 : 11;
          ctx.arc(cx, cy, radius, 0, Math.PI*2);
          ctx.fill();
          
          ctx.lineWidth = highlighted ? 3 : 2;
          ctx.strokeStyle = highlighted ? '#fff' : '#333';
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(cx-3, cy-3, radius/3, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fill();
        });
      });
    });
  }
  
  function drawDirectionArrows(){
    ctx.save();
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const outerArrows = [
      {x:0.5, y:0.5, arrow:'↓'},
      {x:3.5, y:0.5, arrow:'↓'},
      {x:4.5, y:1.5, arrow:'↓'},
      {x:4.5, y:3.5, arrow:'←'},
      {x:3.5, y:4.5, arrow:'←'},
      {x:0.5, y:4.5, arrow:'↑'},
      {x:0.5, y:3.5, arrow:'↑'},
      {x:0.5, y:1.5, arrow:'→'}
    ];
    
    ctx.fillStyle = '#666';
    outerArrows.forEach(a => {
      ctx.fillText(a.arrow, a.x*CELL, a.y*CELL);
    });
    
    const innerArrows = [
      {x:2.3, y:2.5, arrow:'→'},
      {x:2.5, y:1.7, arrow:'↑'},
      {x:1.7, y:2.5, arrow:'←'}
    ];
    
    ctx.fillStyle = '#1f4fd8';
    innerArrows.forEach(a => {
      ctx.fillText(a.arrow, a.x*CELL, a.y*CELL);
    });
    
    ctx.restore();
  }
  
  init();
})();
