// renderer.js — Enhanced UI with smooth animations and better visuals

(function(){
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const CELL = 80;
  const STACK = [{x:-12,y:-12},{x:12,y:-12},{x:-12,y:12},{x:12,y:12}];
  
  let selectedToken = 0;
  let animating = false;
  
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
      if(animating) return;
      
      const roll = Game.drawMarbles();
      if(!roll) return; // Blocked during animation
      
      showMarbles(roll);
      $('#rollInfo').textContent = `Whites: ${roll.whites} — Steps: ${roll.steps}`;
      
      const state = Game.getState();
      log(`Player ${state.currentPlayer + 1} rolled: ${roll.steps} steps`);
      
      // Auto-select and move if only one token can move
      setTimeout(() => autoSelectAndMove(roll), 300);
    });
    
    canvas.addEventListener('click', (e) => {
      if(animating) return;
      
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const state = Game.getState();
      
      if(!state.lastRoll) return; // Must roll first
      
      const player = state.players[state.currentPlayer];
      const clicked = findClickedToken(mx, my, player);
      
      if(clicked !== null){
        selectedToken = clicked;
        handleTokenMove();
      }
    });
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
      }
      
      animateMove(() => {
        Game.nextPlayerIfNeeded(res.grantExtraTurn);
        clearMarbles();
        drawBoard();
        updateTurnIndicator();
        animating = false;
        Game.setMoving(false);
      });
    }
  }
  
  function animateMove(callback){
    // Simple animation - just redraw with delay
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
  }
  
  function log(msg){
    const l = $('#log');
    const p = document.createElement('p');
    p.textContent = msg;
    l.appendChild(p);
    l.scrollTop = l.scrollHeight;
    // Keep only last 5 messages
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
    
    // Draw board grid with safe zones highlighted
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
          // Safe zones - orange with pattern
          ctx.fillStyle = '#f4a261';
          ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
          ctx.strokeStyle = '#e07a00';
          ctx.lineWidth = 3;
          ctx.strokeRect(x*CELL+2,y*CELL+2,CELL-4,CELL-4);
        } else if(b[y][x]===2){
          // Center finish - special
          ctx.fillStyle = '#90dbf4';
          ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
          ctx.strokeStyle = '#1f4fd8';
          ctx.lineWidth = 4;
          ctx.strokeRect(x*CELL+3,y*CELL+3,CELL-6,CELL-6);
          // Draw star
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
    
    // Draw direction arrows
    drawDirectionArrows();
    
    // Draw tokens
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
          
          // Add border
          ctx.lineWidth = highlighted ? 3 : 2;
          ctx.strokeStyle = highlighted ? '#fff' : '#333';
          ctx.stroke();
          
          // Add shine effect
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
    
    // Outer loop arrows (anticlockwise)
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
    
    // Inner loop arrows (clockwise)
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
