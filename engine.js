// engine.js — game engine implementing marble-draw rules with all fixes
// Public API: Game.init(), Game.drawMarbles(), Game.applyMove(tokenIndex), Game.getState()

const Game = (function(){
  const GRID = 5;
  const CELL = 80;
  
  // board values: 0 normal, 1 safe, 2 center
  const board = [
    [0,0,1,0,0],
    [0,0,0,0,0],
    [1,0,2,0,1],
    [0,0,0,0,0],
    [0,0,1,0,0]
  ];
  
  // Outer path - ANTICLOCKWISE (reversed)
  const outerPath = [
    {x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},
    {x:4,y:1},{x:4,y:2},{x:4,y:3},{x:4,y:4},
    {x:3,y:4},{x:2,y:4},{x:1,y:4},{x:0,y:4},
    {x:0,y:3},{x:0,y:2},{x:0,y:1}
  ].reverse();
  
  // Inner path - CLOCKWISE
  const innerPath = [
    {x:2,y:3},{x:3,y:2},{x:2,y:1},{x:1,y:2}
  ];
  
  const players = [
    {name:"P1", color:"#1f4fd8", start:{x:2,y:4}, tokens:[]},
    {name:"P2", color:"#1e8f3e", start:{x:4,y:2}, tokens:[]},
    {name:"P3", color:"#6a1fb0", start:{x:2,y:0}, tokens:[]},
    {name:"P4", color:"#e07a00", start:{x:0,y:2}, tokens:[]}
  ];
  
  let currentPlayer = 0;
  let selectedToken = 0;
  let gameOver = false;
  let lastRoll = null; // {steps, allSame, whites}
  let extraDrawCount = 0; // Track consecutive extra draws
  let isMoving = false; // Prevent clicks during animation
  
  function init(){
    players.forEach(p=>{
      const idx = outerPath.findIndex(q=>q.x===p.start.x && q.y===p.start.y);
      p.tokens = [];
      for(let i=0;i<4;i++){
        p.tokens.push({
          mode:"outer",
          outerIndex: idx,
          innerIndex: 0,
          finished: false,
          isAtHome: true,
          hasCaptured: false
        });
      }
    });
    currentPlayer = 0;
    selectedToken = 0;
    gameOver = false;
    lastRoll = null;
    extraDrawCount = 0;
    isMoving = false;
  }
  
  function drawMarbles(){
    if(isMoving) return null; // Don't allow draw while token moving
    
    let whites = 0;
    for(let i=0;i<4;i++){
      if(Math.random() < 0.5) whites++;
    }
    
    let steps = 0;
    if (whites === 1) steps = 1;
    else if (whites === 2) steps = 2;
    else if (whites === 3) steps = 2;
    else if (whites === 4) steps = 8; // 8 for outer, 9 for inner (decided in applyMove)
    else steps = 4; // whites === 0 (4 blacks)
    
    const allSame = (whites === 0 || whites === 4);
    lastRoll = { steps, allSame, whites };
    return lastRoll;
  }
  
  function tokenPosition(playerIndex, tokenIndex){
    const t = players[playerIndex].tokens[tokenIndex];
    if(t.finished) return null;
    if(t.isAtHome) return players[playerIndex].start;
    return t.mode === "outer" ? outerPath[t.outerIndex] : innerPath[t.innerIndex];
  }
  
  function moveSteps(t, steps){
    if(t.isAtHome) return;
    
    while(steps--){
      if(t.mode === "outer"){
        t.outerIndex = (t.outerIndex + 1) % outerPath.length;
        const p = outerPath[t.outerIndex];
        
        // Inner loop entry ONLY after capture
        if(board[p.y][p.x] === 1 && p.x === 2 && p.y !== 2 && t.hasCaptured === true){
          t.mode = "inner";
          t.innerIndex = 0;
        }
      } else {
        // Inner loop - clockwise movement
        t.innerIndex++;
        if(t.innerIndex === innerPath.length){
          t.finished = true;
          break;
        }
      }
    }
  }
  
  function checkCapture(activePlayerIndex, activeToken){
    if(activeToken.mode !== "outer" || activeToken.isAtHome) return false;
    
    const pos = outerPath[activeToken.outerIndex];
    if(board[pos.y][pos.x] === 1) return false; // Safe zone - no capture
    
    let captured = false;
    for(let p=0;p<players.length;p++){
      if(p === activePlayerIndex) continue;
      
      players[p].tokens.forEach(t => {
        if(!t.finished && !t.isAtHome && t.mode === "outer"){
          const tpos = outerPath[t.outerIndex];
          if(tpos.x === pos.x && tpos.y === pos.y){
            // Send opponent token home
            t.isAtHome = true;
            t.outerIndex = outerPath.findIndex(q => q.x === players[p].start.x && q.y === players[p].start.y);
            t.innerIndex = 0;
            t.hasCaptured = false;
            captured = true;
          }
        }
      });
    }
    
    if(captured) activeToken.hasCaptured = true;
    return captured;
  }
  
  function checkWin(playerIndex){
    const finishedCount = players[playerIndex].tokens.filter(t => t.finished).length;
    if(finishedCount === 4){
      gameOver = true;
      return true;
    }
    return false;
  }
  
  function applyMove(tokenIndex){
    if(gameOver) return { error: "Game already over" };
    if(isMoving) return { error: "Wait for current move to finish" };
    
    const player = players[currentPlayer];
    const token = player.tokens[tokenIndex];
    
    if(!lastRoll) return { error: "No roll yet" };
    
    // Resolve steps: 4 whites on inner → 9, otherwise use lastRoll.steps
    let steps = lastRoll.steps;
    if(lastRoll.whites === 4 && !token.isAtHome && token.mode === "inner"){
      steps = 9;
    }
    
    // Token entry rule: ONLY on allSame (all 4 same color)
    if(token.isAtHome){
      if(!lastRoll.allSame){
        return { moved:false, message:"Token at home needs all 4 same color to enter", grantExtraTurn: false };
      } else {
        token.isAtHome = false;
        moveSteps(token, steps);
      }
    } else {
      moveSteps(token, steps);
    }
    
    // Check for captures (grants extra draw)
    const didCapture = checkCapture(currentPlayer, token);
    const won = checkWin(currentPlayer);
    
    // Extra turn conditions: allSame, capture, or finish
    let grantExtraTurn = lastRoll.allSame || didCapture || token.finished;
    
    // MAX 2 extra draws in a row
    if(grantExtraTurn){
      extraDrawCount++;
      if(extraDrawCount >= 2){
        grantExtraTurn = false;
        extraDrawCount = 0;
      }
    } else {
      extraDrawCount = 0;
    }
    
    lastRoll = null;
    return { moved:true, message:"Moved", grantExtraTurn, won, didCapture };
  }
  
  function getState(){
    return {
      players: JSON.parse(JSON.stringify(players)),
      currentPlayer,
      gameOver,
      lastRoll,
      isMoving
    };
  }
  
  function nextPlayerIfNeeded(grantExtra){
    if(!grantExtra){
      currentPlayer = (currentPlayer + 1) % players.length;
      extraDrawCount = 0;
    }
  }
  
  function setMoving(val){
    isMoving = val;
  }
  
  return {
    init, drawMarbles, applyMove, getState, tokenPosition,
    getOuterPath: () => outerPath, 
    getInnerPath: () => innerPath,
    nextPlayerIfNeeded, 
    setMoving,
    setSelectedToken: (i)=>{ selectedToken = i; }
  };
})();
