/* ================= ΜΠΙΛΙΑΡΔΟ PRO — Μηχανή Παιχνιδιού (φυσική + AI + 2D/3D) ================= */
/* Παιχνίδια: 9-Ball, 8-Ball, Snooker, Καραμπόλα (1 μπάντα), Ελεύθερη εξάσκηση */
(function(){
"use strict";

const W=900, H=480, M=42;
const L=M, Rt=W-M, Tp=M, Bt=H-M;
const BR=10, POCKET=21;
const POCKETS=[
  {x:L,y:Tp},{x:W/2,y:Tp-3},{x:Rt,y:Tp},
  {x:L,y:Bt},{x:W/2,y:Bt+3},{x:Rt,y:Bt}
];
const FRICT=0.988, CUSH=0.86, STOP=0.045, SUB=4;
const CX=(L+Rt)/2, CY=(Tp+Bt)/2;

const POOLCOL={1:"#f4c20d",2:"#1d5fd6",3:"#d62828",4:"#5a189a",5:"#e36414",6:"#2a9d3f",7:"#7a1f1f",8:"#111111",
 9:"#f4c20d",10:"#1d5fd6",11:"#d62828",12:"#5a189a",13:"#e36414",14:"#2a9d3f",15:"#7a1f1f"};

let inst=null, raf=null;
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function _hex(hex){ if(typeof hex!=='string'||hex[0]!=='#')return null; let h=hex.slice(1);
  if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (isNaN(r)||isNaN(g)||isNaN(b))?null:{r,g,b}; }
function lighten(hex,amt){ const c=_hex(hex); if(!c)return hex; amt=amt==null?0.27:amt;
  return `rgb(${Math.min(255,Math.round(c.r+255*amt))},${Math.min(255,Math.round(c.g+255*amt))},${Math.min(255,Math.round(c.b+255*amt))})`; }
function darken(hex,amt){ const c=_hex(hex); if(!c)return hex; amt=amt==null?0.3:amt;
  return `rgb(${Math.round(c.r*(1-amt))},${Math.round(c.g*(1-amt))},${Math.round(c.b*(1-amt))})`; }
/* ---- Web Audio: ήχοι παιχνιδιού ---- */
let _gactx=null;
function _gaudio(){ try{ if(!_gactx) _gactx=new (window.AudioContext||window.webkitAudioContext)(); if(_gactx.state==='suspended') _gactx.resume(); }catch(e){} return _gactx; }
function _gclick(freq,dur,vol){ const a=_gaudio(); if(!a) return; const t=a.currentTime;
  const g=a.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); g.connect(a.destination);
  const o=a.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(freq,t); o.frequency.exponentialRampToValueAtTime(Math.max(60,freq*0.55),t+dur); o.connect(g); o.start(t); o.stop(t+dur);
  try{ const n=Math.floor(a.sampleRate*dur), buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
    const ns=a.createBufferSource(); ns.buffer=buf; const ng=a.createGain(); ng.gain.value=vol*0.6; ns.connect(ng); ng.connect(a.destination); ns.start(t); ns.stop(t+dur);
  }catch(e){}
}

/* ---------- Homography (για 3D perspective, offline) ---------- */
function solveH(src,dst){
  // src[i]->dst[i], 4 σημεία, επιστρέφει 3x3 (9 στοιχεία)
  const A=[],b=[];
  for(let i=0;i<4;i++){
    const {x,y}=src[i], {x:X,y:Y}=dst[i];
    A.push([x,y,1,0,0,0,-x*X,-y*X]); b.push(X);
    A.push([0,0,0,x,y,1,-x*Y,-y*Y]); b.push(Y);
  }
  const h=gauss(A,b);
  return [h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1];
}
function gauss(A,b){
  const n=8, M2=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<n;c++){
    let p=c; for(let r=c+1;r<n;r++) if(Math.abs(M2[r][c])>Math.abs(M2[p][c])) p=r;
    [M2[c],M2[p]]=[M2[p],M2[c]];
    const pv=M2[c][c]||1e-9;
    for(let r=0;r<n;r++){ if(r===c) continue; const f=M2[r][c]/pv;
      for(let k=c;k<=n;k++) M2[r][k]-=f*M2[c][k]; }
  }
  const x=[]; for(let i=0;i<n;i++) x[i]=M2[i][n]/(M2[i][i]||1e-9);
  return x;
}
function applyH(Hm,x,y){ const u=Hm[0]*x+Hm[1]*y+Hm[2], v=Hm[3]*x+Hm[4]*y+Hm[5], w=Hm[6]*x+Hm[7]*y+Hm[8];
  return {x:u/w, y:v/w}; }

/* ---------- 3D camera (offline pseudo-3D perspective, χωρίς WebGL) ---------- */
const CAM=(function(){
  const cx=(L+Rt)/2, cy=(Tp+Bt)/2, LEN=Rt-L, WID=Bt-Tp;
  const pos={x:L-LEN*0.20, y:cy-WID*0.06, z:WID*0.52};   // first-person: χαμηλά & κοντά πίσω από τη λευκή
  const tgt={x:cx+LEN*0.16, y:cy+WID*0.01, z:WID*0.14};
  const up={x:0,y:0,z:1};
  const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
  const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const norm=v=>{const l=Math.hypot(v.x,v.y,v.z)||1;return{x:v.x/l,y:v.y/l,z:v.z/l}};
  const fwd=norm(sub(tgt,pos)), right=norm(cross(fwd,up)), tup=cross(right,fwd);
  const f=720;
  function project(x,y,z){ z=z||0; const r={x:x-pos.x,y:y-pos.y,z:z-pos.z};
    const cd=Math.max(1,dot(r,fwd));
    return {x:W/2+f*dot(r,right)/cd, y:H/2-f*dot(r,tup)/cd, d:cd}; }
  function radius(x,y,z){ z=(z==null?BR:z); const r={x:x-pos.x,y:y-pos.y,z:z-pos.z}; return f*BR/Math.max(1,dot(r,fwd)); }
  function unproject(sx,sy){ const nx=(sx-W/2)/f, ny=-(sy-H/2)/f;
    const dir=norm({x:right.x*nx+tup.x*ny+fwd.x, y:right.y*nx+tup.y*ny+fwd.y, z:right.z*nx+tup.z*ny+fwd.z});
    const t=(0-pos.z)/(dir.z||-1e-6); return {x:pos.x+dir.x*t, y:pos.y+dir.y*t}; }
  return {project,radius,unproject,pos};
})();

/* ---------- Ball factory ---------- */
function mk(n,x,y,extra){ return Object.assign({n,x,y,vx:0,vy:0,active:true,pocketed:false,
  color:n===0?"#fff":(POOLCOL[n]||"#fff"), stripe:n>=9, spot:{x,y}},extra||{}); }

/* ---------- Racks ---------- */
function rack9(){
  const b=[mk(0,L+(Rt-L)*0.22,CY)];
  const ax=Rt-160, dx=BR*1.75*1.9, dy=BR*1.02;
  const order=[1,2,3,4,9,5,6,7,8], pos=[[0,0],[1,-1],[1,1],[2,-2],[2,0],[2,2],[3,-1],[3,1],[4,0]];
  order.forEach((num,i)=>b.push(mk(num,ax+pos[i][0]*dx,CY+pos[i][1]*dy)));
  return b;
}
function rack8(){
  const b=[mk(0,L+(Rt-L)*0.22,CY)];
  const ax=Rt-190, dx=BR*1.75*1.9, dy=BR*1.06;
  // triangle rows; 8 in center (row2 middle). mix solids/stripes
  const layout=[
    [1],
    [9,2],
    [10,8,3],
    [11,4,12,5],
    [6,13,7,14,15]
  ];
  for(let r=0;r<layout.length;r++){ const row=layout[r];
    for(let i=0;i<row.length;i++){ b.push(mk(row[i], ax+r*dx, CY+(i-r/2)*dy*2)); }
  }
  return b;
}
function rackFree(){
  const b=[mk(0,L+(Rt-L)*0.25,CY)]; const ax=Rt-170,dx=BR*1.75*1.9,dy=BR*1.06; let n=1;
  for(let c=0;c<5;c++) for(let r=0;r<=c;r++){ b.push(mk(((n-1)%15)+1, ax+c*dx, CY+(r-c/2)*dy*2)); n++; }
  return b;
}
function rackCarom(){
  return [
    mk(0, L+(Rt-L)*0.25, CY+60, {kind:"cue"}),
    mk(-1, L+(Rt-L)*0.25, CY-60, {kind:"cue2", color:"#f4c20d", stripe:false}),
    mk(-2, Rt-(Rt-L)*0.28, CY, {kind:"red", color:"#d62828", stripe:false})
  ];
}
function rackSnooker(){
  const bx=L+(Rt-L)*0.20;
  const arr=[ mk(0, bx, CY+30) ];  // cue
  const colours=[
    {k:"yellow",v:2,x:bx,y:CY+95,c:"#f4c20d"},
    {k:"green", v:3,x:bx,y:CY-95,c:"#1f9d55"},
    {k:"brown", v:4,x:bx,y:CY,c:"#7a4a1e"},
    {k:"blue",  v:5,x:CX,y:CY,c:"#1d5fd6"},
    {k:"pink",  v:6,x:Rt-255,y:CY,c:"#e86a9a"},
    {k:"black", v:7,x:Rt-70,y:CY,c:"#141414"}
  ];
  colours.forEach(c=>arr.push(mk(0,c.x,c.y,{kind:c.k,val:c.v,color:c.c,stripe:false,noNum:true,snook:true})));
  // reds triangle apex near pink
  const ax=Rt-230, dx=BR*1.75, dy=BR*1.05;
  let placed=0;
  for(let r=0;r<5 && placed<15;r++){ for(let i=0;i<=r && placed<15;i++){
    arr.push(mk(0, ax+r*dx*1.7, CY+(i-r/2)*dy*2, {kind:"red",val:1,color:"#c0202a",stripe:false,noNum:true,snook:true}));
    placed++;
  }}
  return arr;
}

/* ======================================================= */
function Game(canvas, ui, opts){
  const ctx=canvas.getContext('2d');
  const self=this;
  this.mode=opts.mode; this.diff=opts.diff||'med'; this.view=opts.view||'2d';
  this.felt=opts.felt||"#12508a";
  this.sound=opts.sound!==false;
  this.onEnd=opts.onEnd||function(){};
  let effects=[], _sfxN=0;
  function sfx(type,speed){
    if(!self.sound) return;
    if(type==='ball'||type==='cushion'){ if(speed!=null&&speed<0.7) return; if(_sfxN>7) return; _sfxN++; }
    const vol = speed!=null? clamp(speed/26,0.06,0.4) : 0.32;
    if(type==='hit') _gclick(280,0.09,0.34);
    else if(type==='cushion') _gclick(150,0.09,vol);
    else if(type==='ball') _gclick(900,0.05,vol);
    else if(type==='pocket') _gclick(120,0.22,0.30);
  }
  let balls=[], state='aim', turn=0, ballInHand=false, msg="";
  let aim={angle:Math.PI,power:0,dragging:false,spin:{x:0,y:0}};
  // per-shot tracking
  let firstHit=null, firstHitBall=null, railAfter=false, potted=[], cueScratch=false;
  let shotCue=null, cueCushions=0, caromContacts=[], followApplied=false;
  // game-specific
  let groups={0:null,1:null};   // 8-ball
  let scores=[0,0];             // snooker/carom
  let snState={expect:'red', phase:'reds'};
  let lowestBefore=null;

  const CFG={
    '9ball':{pockets:true}, '8ball':{pockets:true}, 'snooker':{pockets:true},
    'carom':{pockets:false}, 'free':{pockets:true}
  }[self.mode];

  function cue(){ return balls.find(b=>b.n===0 && b.kind!=='cue2') || balls[0]; }

  this.setView=function(v){ self.view=v; };
  this.setFelt=function(c){ self.felt=c; };
  this.setSound=function(b){ self.sound=!!b; };

  this.reset=function(){
    if(self.mode==='9ball') balls=rack9();
    else if(self.mode==='8ball') balls=rack8();
    else if(self.mode==='snooker') balls=rackSnooker();
    else if(self.mode==='carom') balls=rackCarom();
    else balls=rackFree();
    turn=0; ballInHand=false; state='aim'; groups={0:null,1:null}; scores=[0,0];
    snState={expect:'red',phase:'reds'};
    aim={angle:Math.PI,power:0,dragging:false,spin:{x:0,y:0}};
    effects=[]; _sfxN=0;
    msg=startMsg();
    updateUI();
  };
  function startMsg(){
    if(self.mode==='carom') return "Καραμπόλα 3 μπάντες: η λευκή σου να χτυπήσει ΚΑΙ τις 2 μπάλες, με ≥3 μπάντες πριν τη 2η. Χρησιμοποίησε πλάγιο φάλτσο!";
    if(self.mode==='snooker') return "Snooker: βάλε κόκκινη → χρώμα → κόκκινη… Σειρά σου.";
    if(self.mode==='free') return "Ελεύθερη εξάσκηση — χτύπα όπου θες.";
    if(self.mode==='8ball') return "8-Ball: το τραπέζι είναι ανοιχτό. Βάλε για να κατοχυρώσεις ρίγες ή μονόχρωμες.";
    return "9-Ball: χτύπα πρώτα τη μικρότερη. Σειρά σου.";
  }

  /* ---------- physics ---------- */
  function anyMoving(){ return balls.some(b=>b.active&&(Math.abs(b.vx)>STOP||Math.abs(b.vy)>STOP)); }
  function step(){
    _sfxN=0;
    for(let s=0;s<SUB;s++){
      for(const b of balls){ if(b.active){ b.x+=b.vx/SUB; b.y+=b.vy/SUB; } }
      for(let i=0;i<balls.length;i++){ if(!balls[i].active) continue;
        for(let j=i+1;j<balls.length;j++){ if(balls[j].active) collide(balls[i],balls[j]); } }
      for(const b of balls){ if(b.active) cushion(b); }
      if(CFG.pockets) pocketCheck();
    }
    for(const b of balls){ if(!b.active) continue; b.vx*=FRICT; b.vy*=FRICT;
      if(Math.abs(b.vx)<STOP) b.vx=0; if(Math.abs(b.vy)<STOP) b.vy=0; }
    if(shotCue&&shotCue.sF) shotCue.sF*=0.985;    // το follow/draw σβήνει με την απόσταση
  }
  function collide(a,b){
    const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy);
    if(d===0||d>=BR*2) return;
    const nx=dx/d, ny=dy/d, ov=BR*2-d;
    a.x-=nx*ov/2; a.y-=ny*ov/2; b.x+=nx*ov/2; b.y+=ny*ov/2;
    const rvx=b.vx-a.vx, rvy=b.vy-a.vy, vn=rvx*nx+rvy*ny;
    if(vn>0) return;
    const isCue=shotCue && (a===shotCue||b===shotCue);
    let preDir=null, preSpeed=0;
    if(isCue){ preSpeed=Math.hypot(shotCue.vx,shotCue.vy); if(preSpeed>0.001) preDir={x:shotCue.vx/preSpeed,y:shotCue.vy/preSpeed}; }
    const imp=-vn*0.98;
    a.vx-=imp*nx; a.vy-=imp*ny; b.vx+=imp*nx; b.vy+=imp*ny;
    sfx('ball', Math.abs(vn));
    if(isCue){
      const o=a===shotCue?b:a;
      if(firstHit===null){ firstHit=o.n; firstHitBall=o; }
      if(!caromContacts.some(c=>c.ball===o)) caromContacts.push({ball:o, cush:cueCushions});
      // follow/draw: impulse along pre-collision direction (once, on first object contact)
      if(!followApplied && preDir && shotCue.sF){
        followApplied=true;
        const k=shotCue.sF*0.62*preSpeed;
        shotCue.vx+=preDir.x*k; shotCue.vy+=preDir.y*k;
      }
    }
  }
  function cushion(b){
    let hit=0;                                   // 1=L,2=R,3=T,4=B
    if(b.x<L+BR){ b.x=L+BR; b.vx=Math.abs(b.vx)*CUSH; hit=1; }
    else if(b.x>Rt-BR){ b.x=Rt-BR; b.vx=-Math.abs(b.vx)*CUSH; hit=2; }
    if(b.y<Tp+BR){ b.y=Tp+BR; b.vy=Math.abs(b.vy)*CUSH; hit=hit||3; }
    else if(b.y>Bt-BR){ b.y=Bt-BR; b.vy=-Math.abs(b.vy)*CUSH; hit=hit||4; }
    if(hit){
      sfx('cushion', Math.hypot(b.vx,b.vy));
      if(firstHit!==null) railAfter=true;
      if(b===shotCue){ cueCushions++;
        // πλάγιο φάλτσο: αλλάζει τη γωνία ανάκλασης (running/reverse english)
        if(b.sS){ const sp=Math.hypot(b.vx,b.vy);
          if(hit===1||hit===2) b.vy += b.sS*sp*0.32*(hit===1?1:-1);
          else b.vx += b.sS*sp*0.32*(hit===3?-1:1);
          b.sS*=0.55;
        }
      }
    }
  }
  function pocketCheck(){
    for(const b of balls){ if(!b.active) continue;
      for(const p of POCKETS){ if(dist(b,p)<POCKET){
        b.active=false; b.pocketed=true; b.vx=b.vy=0;
        if(b.n===0 && b.kind!=='cue2') cueScratch=true; else potted.push(b);
        sfx('pocket'); effects.push({x:p.x,y:p.y,t:performance.now(),col:b.color});
      } }
    }
  }

  /* ---------- shot lifecycle ---------- */
  function beginShot(){
    firstHit=null; firstHitBall=null; railAfter=false; potted=[]; cueScratch=false;
    cueCushions=0; caromContacts=[]; followApplied=false;
    shotCue = (self.mode==='carom' && turn===1) ? balls.find(b=>b.kind==='cue2') : cue();
    lowestBefore = lowestNum();
  }
  function shoot(angle,power){
    const sp=aim.spin||{x:0,y:0};
    const follow=-sp.y, side=sp.x;                 // πάνω=follow, δεξιά=right english
    const a2=angle + (-side*0.03);                 // squirt/deflection
    beginShot();
    shotCue.sF=follow; shotCue.sS=side;
    shotCue.vx=Math.cos(a2)*power; shotCue.vy=Math.sin(a2)*power;
    sfx('hit');
    state='sim'; msg = turn===0?"...":"Ο αντίπαλος παίζει...";
    aim.spin={x:0,y:0}; if(ui.onSpinReset) ui.onSpinReset();
    updateUI();
  }
  function lowestNum(){ const a=balls.filter(b=>b.n>0&&b.active).sort((x,y)=>x.n-y.n); return a[0]?a[0].n:null; }
  function lowestBall(){ const a=balls.filter(b=>b.n>0&&b.active).sort((x,y)=>x.n-y.n); return a[0]; }

  function switchTurn(){ turn=turn===0?1:0; }
  function endGame(w){ state='over'; msg = w===0?"🏆 Κέρδισες!":"Ο αντίπαλος κέρδισε. Ξαναδοκίμασε!"; updateUI(); self.onEnd(w); }
  function respotCue(){ const c=cue(); c.active=true;c.pocketed=false;c.x=L+(Rt-L)*0.22;c.y=CY;c.vx=c.vy=0;
    let t=0; while(balls.some(b=>b!==c&&b.active&&dist(b,c)<BR*2)&&t<60){c.x+=BR;t++;} }

  function resolve(){
    if(self.mode==='free'){ if(cueScratch) respotCue(); state='aim'; msg=startMsg(); updateUI(); return; }
    if(self.mode==='carom') return resolveCarom();
    if(self.mode==='snooker') return resolveSnooker();
    if(self.mode==='8ball') return resolve8();
    return resolve9();
  }

  function nextIfAI(){ if(turn===1 && state!=='over') setTimeout(aiTurn, 650); }

  function resolve9(){
    let foul=false, why="";
    if(cueScratch){ foul=true; why="Λευκή στην τσέπη (scratch)"; }
    else if(firstHit===null){ foul=true; why="Καμία επαφή"; }
    else if(lowestBefore && firstHit!==lowestBefore){ foul=true; why="Χτύπησες πρώτα λάθος μπάλα (όχι την "+lowestBefore+")"; }
    else if(potted.length===0 && !railAfter){ foul=true; why="Καμία μπάλα σε τσέπη/μπάντα"; }
    const pot9=potted.some(b=>b.n===9);
    if(pot9 && !foul){ return endGame(turn); }
    if(pot9 && foul){ const b=balls.find(x=>x.n===9); b.active=true;b.pocketed=false;b.x=Rt-160;b.y=CY; }
    finishPotTurn(foul,why);
  }
  function resolve8(){
    let foul=false, why="";
    const fhg = firstHitBall? groupOf(firstHitBall.n):null;
    const myG = groups[turn];
    const on8 = myG && cleared(myG);
    if(cueScratch){ foul=true; why="Scratch"; }
    else if(firstHit===null){ foul=true; why="Καμία επαφή"; }
    else if(myG && !on8 && fhg==='eight'){ foul=true; why="Χτύπησες πρώτα τη μαύρη"; }
    else if(myG && !on8 && fhg && fhg!==myG){ foul=true; why="Χτύπησες πρώτα αντίπαλη ομάδα"; }
    else if(on8 && fhg!=='eight'){ foul=true; why="Έπρεπε να παίξεις τη μαύρη 8"; }
    else if(potted.length===0 && !railAfter){ foul=true; why="Καμία μπάλα σε τσέπη/μπάντα"; }
    // 8 potted?
    const pot8=potted.some(b=>b.n===8);
    if(pot8){
      if(on8 && !foul && !cueScratch) return endGame(turn);
      return endGame(turn===0?1:0);   // early/foul 8 = loss
    }
    // assign groups if open
    if(!myG && !foul){
      const sol=potted.filter(b=>groupOf(b.n)==='solid').length;
      const str=potted.filter(b=>groupOf(b.n)==='stripe').length;
      if(sol>0 && str===0){ groups[turn]='solid'; groups[turn===0?1:0]='stripe'; }
      else if(str>0 && sol===0){ groups[turn]='stripe'; groups[turn===0?1:0]='solid'; }
    }
    // did player pot own group (or any on open table)?
    let ownPot=false;
    if(!foul){
      const g=groups[turn];
      ownPot = g? potted.some(b=>groupOf(b.n)===g) : potted.some(b=>b.n!==8);
    }
    finishPotTurn(foul, why, ownPot);
  }
  function finishPotTurn(foul, why, ownPotOverride){
    if(foul){
      if(cueScratch) respotCue();
      switchTurn(); ballInHand=true;
      msg="Φάουλ: "+why+". Ball-in-hand "+(turn===0?"για σένα.":"για τον αντίπαλο.");
      state = turn===0?'place':'aim'; updateUI(); nextIfAI(); return;
    }
    const cont = (ownPotOverride!==undefined)? ownPotOverride : potted.length>0;
    if(cont){ msg=(turn===0?"Ωραία! ":"Ο αντίπαλος έβαλε. ")+"Συνέχισε."; state='aim'; }
    else { switchTurn(); msg=turn===0?"Σειρά σου.":"Σειρά αντιπάλου..."; state='aim'; }
    updateUI(); nextIfAI();
  }
  function resolveCarom(){
    // 3-cushion: η λευκή να χτυπήσει ΚΑΙ τις 2 μπάλες, με ≥3 μπάντες πριν τη 2η
    const c1=caromContacts[0], c2=caromContacts[1];
    let score=false;
    if(c1 && c2){
      const distinct = c1.ball!==c2.ball;
      if(distinct && c2.cush>=3) score=true;
    }
    if(score){ scores[turn]++; msg=(turn===0?"✅ Καραμπόλα! ":"Ο αντίπαλος σκόραρε. ")+"Σκορ "+scores[0]+"–"+scores[1]+". "+(turn===0?"Συνέχισε.":""); state='aim'; updateUI();
      if(scores[turn]>=15) return endGame(turn);
      nextIfAI(); return; }
    switchTurn();
    msg=(turn===0?"Σειρά σου":"Σειρά αντιπάλου")+" — σκορ "+scores[0]+"–"+scores[1];
    state='aim'; updateUI(); nextIfAI();
  }
  function resolveSnooker(){
    const onReds = snState.phase==='reds' && snState.expect==='red';
    let foul=false, why="", gained=0;
    const fh=firstHitBall;
    const legalFirst = fh && ( onReds? fh.kind==='red' : (snState.expect==='colour'? fh.kind!=='red' : fh===lowestColour()) );
    if(cueScratch){ foul=true; why="in-off (scratch)"; }
    else if(!fh){ foul=true; why="καμία επαφή"; }
    else if(!legalFirst){ foul=true; why="λάθος πρώτη μπάλα"; }
    const redsPotted=potted.filter(b=>b.kind==='red');
    const coloursPotted=potted.filter(b=>b.kind&&b.kind!=='red');

    if(!foul){
      if(onReds){
        if(redsPotted.length>0 && coloursPotted.length===0){ gained=redsPotted.length*1; snState.expect='colour'; }
        else if(coloursPotted.length>0){ foul=true; why="έβαλες χρώμα ενώ έπρεπε κόκκινη"; }
        else { /* nothing potted */ }
      } else if(snState.expect==='colour'){
        if(coloursPotted.length===1 && redsPotted.length===0){
          gained=coloursPotted[0].val; respotColours(coloursPotted); snState.expect='red';
          if(!balls.some(b=>b.kind==='red'&&b.active)){ snState.phase='colours'; snState.expect='lowcol'; }
        } else if(redsPotted.length>0){ foul=true; why="έβαλες κόκκινη ενώ έπρεπε χρώμα"; }
        else if(coloursPotted.length>1){ foul=true; why="πάνω από ένα χρώμα"; }
      } else { // colours phase, must pot lowest colour, stays down
        const lc=lowestColour();
        if(coloursPotted.length===1 && coloursPotted[0]===lc){ gained=lc.val; snState.expect='lowcol';
          if(!balls.some(b=>b.snook&&b.active)) { scores[turn]+=gained; return snookerEnd(); }
        } else if(coloursPotted.length>0){ foul=true; why="λάθος χρώμα"; }
      }
    }
    if(foul){
      const pen=Math.max(4, snState.phase==='reds'?4:(lowestColour()?lowestColour().val:4), fh?(fh.val||4):4);
      const opp=turn===0?1:0; scores[opp]+=pen;
      // respot any colours potted on foul
      respotColours(coloursPotted);
      if(cueScratch) respotSnookerCue();
      snState.expect = snState.phase==='reds'? 'red' : 'lowcol';
      switchTurn();
      msg="Φάουλ ("+why+"): +"+pen+" στον αντίπαλο. Σκορ "+scores[0]+"–"+scores[1]+". "+(turn===0?"Σειρά σου.":"");
      state='aim'; updateUI(); nextIfAI(); return;
    }
    scores[turn]+=gained;
    if(gained>0){ msg=(turn===0?"Πότο! +":"Αντίπαλος +")+gained+". Σκορ "+scores[0]+"–"+scores[1]+". "+(turn===0?"Συνέχισε.":""); state='aim'; updateUI(); nextIfAI(); return; }
    switchTurn(); snState.expect = snState.phase==='reds'?'red':'lowcol';
    msg=(turn===0?"Σειρά σου":"Σειρά αντιπάλου")+" — σκορ "+scores[0]+"–"+scores[1];
    state='aim'; updateUI(); nextIfAI();
  }
  function snookerEnd(){ updateUI(); endGame(scores[0]>=scores[1]?0:1); }
  function lowestColour(){ const c=balls.filter(b=>b.snook&&b.kind!=='red'&&b.active).sort((a,b)=>a.val-b.val); return c[0]; }
  function respotColours(list){ (list||[]).forEach(b=>{ if(b.kind!=='red'){ b.active=true;b.pocketed=false;b.x=b.spot.x;b.y=b.spot.y;b.vx=b.vy=0;
    let t=0; while(balls.some(o=>o!==b&&o.active&&dist(o,b)<BR*2)&&t<40){b.x+=BR;t++;} } }); }
  function respotSnookerCue(){ const c=cue(); c.active=true;c.pocketed=false;c.x=L+(Rt-L)*0.20;c.y=CY+30;c.vx=c.vy=0; }
  function groupOf(n){ return n===8?'eight':(n<=7?'solid':'stripe'); }
  function cleared(g){ return !balls.some(b=>b.active&&b.n>0&&b.n!==8&&groupOf(b.n)===g); }

  /* ---------- AI ---------- */
  function aiTurn(){
    if(state==='over'||turn!==0&&false) {}
    if(turn!==1) return;
    const cands=aiCandidates();
    if(ballInHand){ placeCueSmart(cands[0]); ballInHand=false; }
    lowestBefore=lowestNum();
    let shot;
    if(self.mode==='carom') shot=aiCarom();
    else shot=bestShot(cands);
    const errMap={easy:0.10, med:0.05, hard:0.02};
    const err=(Math.random()-0.5)*2*errMap[self.diff];
    aim.spin = self.mode==='carom' ? {x:(Math.random()<.5?0.8:-0.8), y:-0.2} : {x:0,y:0};
    msg="Ο αντίπαλος παίζει..."; updateUI();
    setTimeout(()=>shoot(shot.angle+err, shot.power), 480);
  }
  function aiCandidates(){
    if(self.mode==='9ball'||self.mode==='free'){ const lo=lowestBall(); return lo?[lo]:activeObjects(); }
    if(self.mode==='8ball'){ const g=groups[1];
      if(g && cleared(g)) return balls.filter(b=>b.n===8&&b.active);
      if(g) return balls.filter(b=>b.active&&groupOf(b.n)===g);
      return balls.filter(b=>b.active&&b.n>0&&b.n!==8); }
    if(self.mode==='snooker'){
      if(snState.phase==='reds'&&snState.expect==='red') return balls.filter(b=>b.kind==='red'&&b.active);
      if(snState.expect==='colour') return balls.filter(b=>b.snook&&b.kind!=='red'&&b.active).sort((a,b)=>b.val-a.val);
      const lc=lowestColour(); return lc?[lc]:[]; }
    return activeObjects();
  }
  function activeObjects(){ return balls.filter(b=>b.active&&b!==shotCue&&b.n!==0&&b.kind!=='cue2'); }
  function bestShot(cands){
    const c=cue(); let best=null;
    (cands||[]).forEach(ob=>{
      POCKETS.forEach(p=>{
        const dOP={x:p.x-ob.x,y:p.y-ob.y}, dl=Math.hypot(dOP.x,dOP.y);
        const ghost={x:ob.x-dOP.x/dl*BR*2, y:ob.y-dOP.y/dl*BR*2};
        const dCG={x:ghost.x-c.x,y:ghost.y-c.y}, dc=Math.hypot(dCG.x,dCG.y);
        const ang=Math.atan2(dCG.y,dCG.x);
        const dot=(dCG.x/dc)*(dOP.x/dl)+(dCG.y/dc)*(dOP.y/dl);
        const cut=Math.acos(clamp(dot,-1,1));
        if(cut>Math.PI/2-0.12) return;
        if(!clearPath(c,ghost,ob)) return;
        if(!clearPath(ob,p,ob)) return;
        const sc=cut*1.4 + dl*0.002 + dc*0.0015;
        const pw=clamp((dc+dl)*0.05+7+cut*3,8,32);
        if(!best||sc<best.score) best={angle:ang,power:pw,score:sc};
      });
    });
    if(best) return best;
    const ob=(cands&&cands[0])||activeObjects()[0];
    if(ob){ return {angle:Math.atan2(ob.y-c.y,ob.x-c.x), power:12}; }
    return {angle:Math.random()*6.28, power:12};
  }
  function aiCarom(){
    const c=balls.find(b=>b.kind==='cue2'); const objs=balls.filter(b=>b!==c);
    // aim toward nearest object, medium-high power (hope for cushion+carom)
    let t=objs[0], bd=1e9; objs.forEach(o=>{const d=dist(c,o); if(d<bd){bd=d;t=o;}});
    // aim slightly toward a cushion by targeting mirror of the other object
    const other=objs.find(o=>o!==t)||t;
    const mirrorY = (other.y<CY)? Tp-(other.y-Tp): Bt+(Bt-other.y);
    const ang=Math.atan2((t.y+mirrorY)/2 - c.y, t.x-c.x);
    return {angle:ang, power:22};
  }
  function placeCueSmart(ob){ const c=cue();
    if(!ob){ c.x=L+(Rt-L)*0.25;c.y=CY;c.vx=c.vy=0; return; }
    let best=null;
    POCKETS.forEach(p=>{ const dOP={x:p.x-ob.x,y:p.y-ob.y}, dl=Math.hypot(dOP.x,dOP.y);
      const gx=ob.x-dOP.x/dl*BR*9, gy=ob.y-dOP.y/dl*BR*9;
      if(gx<L+BR*2||gx>Rt-BR*2||gy<Tp+BR*2||gy>Bt-BR*2) return;
      if(!best) best={x:gx,y:gy}; });
    if(best && !balls.some(b=>b.active&&b!==c&&dist(b,best)<BR*2.2)){ c.x=best.x;c.y=best.y; }
    else { c.x=L+(Rt-L)*0.3;c.y=CY; }
    c.vx=c.vy=0;
  }
  function clearPath(a,b,ignore){
    for(const o of balls){ if(!o.active||o===ignore) continue;
      if(o===a||o===b) continue;
      if(o.n===0&&o.kind!=='cue2'&&a===cue()) continue;
      if(ptSeg(o,a,b)<BR*1.9) return false; }
    return true;
  }
  function ptSeg(p,a,b){ const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy; if(l2===0)return dist(p,a);
    let t=((p.x-a.x)*dx+(p.y-a.y)*dy)/l2; t=clamp(t,0,1);
    return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy)); }

  /* ---------- predicted aim ---------- */
  function predict(angle){
    const c=cue(), dir={x:Math.cos(angle),y:Math.sin(angle)};
    let bt=Infinity, hb=null;
    for(const o of balls){ if(!o.active||o===c) continue;
      const t=rayCircle(c,dir,o,BR*2); if(t!==null&&t<bt){bt=t;hb=o;} }
    const tw=rayWall(c,dir); if(tw!==null&&tw<bt){bt=tw;hb=null;}
    if(bt===Infinity) bt=1200;
    const hp={x:c.x+dir.x*bt,y:c.y+dir.y*bt};
    let od=null; if(hb){ const nx=hb.x-hp.x,ny=hb.y-hp.y,nl=Math.hypot(nx,ny)||1; od={x:nx/nl,y:ny/nl}; }
    return {hp,hb,od};
  }
  function rayCircle(o,d,c,rad){ const ox=o.x-c.x,oy=o.y-c.y,b=ox*d.x+oy*d.y,cc=ox*ox+oy*oy-rad*rad,disc=b*b-cc;
    if(disc<0)return null; const t=-b-Math.sqrt(disc); return t>0?t:null; }
  function rayWall(o,d){ let best=null,cand=[];
    if(d.x>0)cand.push(((Rt-BR)-o.x)/d.x); if(d.x<0)cand.push(((L+BR)-o.x)/d.x);
    if(d.y>0)cand.push(((Bt-BR)-o.y)/d.y); if(d.y<0)cand.push(((Tp+BR)-o.y)/d.y);
    for(const t of cand){ if(t>0&&(best===null||t<best))best=t; } return best; }

  /* ---------- projection ---------- */
  function P(x,y,z){ return self.view==='3d'? CAM.project(x,y,z||0) : {x,y}; }
  function scaleAt(x,y){ if(self.view!=='3d') return {rx:BR,ry:BR}; const r=CAM.radius(x,y,BR); return {rx:r,ry:r}; }

  /* ---------- render ---------- */
  function draw(){
    ctx.clearRect(0,0,W,H);
    if(self.view==='3d') drawBg3d(); else drawBg2d();
    // aim guide
    if((state==='aim'||state==='place')&&turn===0){ drawAim(); }
    // balls depth-sorted (far→near)
    const vis=balls.filter(b=>b.active).sort((a,b)=> self.view==='3d'? CAM.project(b.x,b.y,BR).d-CAM.project(a.x,a.y,BR).d : a.y-b.y);
    for(const b of vis) drawBall(b);
    if((self.mode==='9ball')&&state!=='over'){ const lo=lowestBall(); if(lo) ring(lo,"#e63946"); }
    if(self.mode==='8ball'&&groups[0]&&state!=='over'){ balls.filter(b=>b.active&&groupOf(b.n)===groups[0]).forEach(b=>ring(b,"#e63946")); }
    if(self.mode==='snooker'&&state!=='over'){ aiCandForHi().forEach(b=>ring(b,"#e63946")); }
    // εφέ όταν μπαίνει μπάλα (δαχτυλίδι που σβήνει)
    if(effects.length){ const now=performance.now(); effects=effects.filter(e=>now-e.t<450);
      for(const e of effects){ const age=(now-e.t)/450, c=P(e.x,e.y,0), s=scaleAt(e.x,e.y), r=s.rx*(1+age*1.7);
        ctx.strokeStyle=`rgba(255,255,255,${0.6*(1-age)})`; ctx.lineWidth=2.6;
        ctx.beginPath(); ctx.ellipse(c.x,c.y,r,r*(self.view==='3d'?0.7:1),0,0,7); ctx.stroke();
      } }
  }
  function aiCandForHi(){ if(snState.phase==='reds'&&snState.expect==='red') return balls.filter(b=>b.kind==='red'&&b.active);
    if(snState.expect==='colour') return balls.filter(b=>b.snook&&b.kind!=='red'&&b.active);
    const lc=lowestColour(); return lc?[lc]:[]; }
  function ring(b,col){ const c=P(b.x,b.y,BR),s=scaleAt(b.x,b.y); ctx.strokeStyle=col;ctx.lineWidth=2.4;
    ctx.beginPath();ctx.ellipse(c.x,c.y,s.rx+4,s.ry+4,0,0,7);ctx.stroke(); }
  function drawBg2d(){
    ctx.fillStyle="#6b4a2b"; rr(0,0,W,H,18); ctx.fill();
    ctx.fillStyle=darken(self.felt,0.32); ctx.fillRect(L-16,Tp-16,Rt-L+32,Bt-Tp+32);
    ctx.fillStyle=self.felt; ctx.fillRect(L,Tp,Rt-L,Bt-Tp);
    ctx.fillStyle="#e8d9b5";
    for(let i=1;i<8;i++){const x=L+(Rt-L)*i/8;d2(x,Tp-9);d2(x,Bt+9);}
    for(let i=1;i<4;i++){const y=Tp+(Bt-Tp)*i/4;d2(L-9,y);d2(Rt+9,y);}
    if(self.mode==='snooker') drawBaulk2d();
    if(CFG.pockets){ ctx.fillStyle="#05070a"; for(const p of POCKETS){ctx.beginPath();ctx.arc(p.x,p.y,POCKET-3,0,7);ctx.fill();} }
  }
  function drawBaulk2d(){ const bx=L+(Rt-L)*0.20; ctx.strokeStyle="rgba(255,255,255,.3)";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(bx,Tp);ctx.lineTo(bx,Bt);ctx.stroke();
    ctx.beginPath();ctx.arc(bx,CY,52,Math.PI/2,Math.PI*1.5);ctx.stroke(); }
  function drawBg3d(){
    // room / floor
    const bg=ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#151922"); bg.addColorStop(.55,"#0b0e15"); bg.addColorStop(1,"#050609");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    const rw=34, rh=30, skirt=70;
    const oi=[[L,Tp],[Rt,Tp],[Rt,Bt],[L,Bt]];                                  // felt boundary
    const oo=[[L-rw,Tp-rw],[Rt+rw,Tp-rw],[Rt+rw,Bt+rw],[L-rw,Bt+rw]];          // outer rail
    const face=(a,b,z0,z1,fill)=>poly([P(a[0],a[1],z1),P(b[0],b[1],z1),P(b[0],b[1],z0),P(a[0],a[1],z0)],fill);
    // outer skirt (κάθετο ξύλινο σώμα προς τα κάτω)
    for(let i=0;i<4;i++){ const grd=ctx.createLinearGradient(0,H*0.4,0,H);
      grd.addColorStop(0,"#3a2712"); grd.addColorStop(1,"#1c1209"); face(oo[i],oo[(i+1)%4],-skirt,rh,grd); }
    // felt surface
    poly([P(L,Tp,0),P(Rt,Tp,0),P(Rt,Bt,0),P(L,Bt,0)], self.felt);
    // felt lighting (spotlight στο κέντρο)
    const cc=P(CX,CY,0), rg=ctx.createRadialGradient(cc.x,cc.y,20,cc.x,cc.y,430);
    rg.addColorStop(0,"rgba(255,255,255,.16)"); rg.addColorStop(.65,"rgba(255,255,255,.02)"); rg.addColorStop(1,"rgba(0,0,0,.34)");
    poly([P(L,Tp,0),P(Rt,Tp,0),P(Rt,Bt,0),P(L,Bt,0)], rg);
    // baulk (snooker)
    if(self.mode==='snooker'){ const bx=L+(Rt-L)*0.20; const a=P(bx,Tp,0),b=P(bx,Bt,0);
      ctx.strokeStyle="rgba(255,255,255,.22)";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke(); }
    // cushions (κεκλιμένα felt μαξιλάρια) + rail tops (ξύλο), far→near
    const woodTop=(i)=>{ const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,"#9c7038"); g.addColorStop(1,"#6e4a24"); return g; };
    for(let i=0;i<4;i++){ const a=oi[i],b=oi[(i+1)%4]; face(a,b,0,rh,darken(self.felt,0.28)); } // cushion inner walls
    for(let i=0;i<4;i++){ const a=oi[i],b=oi[(i+1)%4],ao=oo[i],bo=oo[(i+1)%4];
      poly([P(a[0],a[1],rh),P(b[0],b[1],rh),P(bo[0],bo[1],rh),P(ao[0],ao[1],rh)], woodTop(i)); // rail top
      // diamonds
    }
    // rail-top diamonds
    ctx.fillStyle="#efe2bf";
    for(let k=1;k<8;k++){ const x=L+(Rt-L)*k/8; [Tp-rw/2,Bt+rw/2].forEach(y=>{ const d=P(x,y,rh); const s=CAM.radius(x,y,rh)*0.16; ctx.beginPath();ctx.arc(d.x,d.y,Math.max(1.2,s),0,7);ctx.fill(); }); }
    for(let k=1;k<4;k++){ const y=Tp+(Bt-Tp)*k/4; [L-rw/2,Rt+rw/2].forEach(x=>{ const d=P(x,y,rh); const s=CAM.radius(x,y,rh)*0.16; ctx.beginPath();ctx.arc(d.x,d.y,Math.max(1.2,s),0,7);ctx.fill(); }); }
    // pockets (κούπες)
    if(CFG.pockets){ for(const p of POCKETS){ const c=P(p.x,p.y,rh*0.35),s=scaleAt(p.x,p.y);
      ctx.fillStyle="#04060a";ctx.beginPath();ctx.ellipse(c.x,c.y,(POCKET+2)*s.rx/BR,(POCKET+2)*s.ry/BR*0.78,0,0,7);ctx.fill(); } }
  }
  function drawAim(){
    const c=cue(), pr=predict(aim.angle);
    const a=P(c.x,c.y,BR), b=P(pr.hp.x,pr.hp.y,BR);
    ctx.strokeStyle="rgba(255,255,255,.85)";ctx.lineWidth=2;ctx.setLineDash([7,6]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
    if(pr.hb){
      const s=scaleAt(pr.hp.x,pr.hp.y);
      ctx.strokeStyle="rgba(255,255,255,.5)";ctx.beginPath();ctx.ellipse(b.x,b.y,s.rx,s.ry,0,0,7);ctx.stroke();
      const o2=P(pr.hb.x+pr.od.x*70,pr.hb.y+pr.od.y*70,BR), ob=P(pr.hb.x,pr.hb.y,BR);
      ctx.strokeStyle="#f2b34b";ctx.beginPath();ctx.moveTo(ob.x,ob.y);ctx.lineTo(o2.x,o2.y);ctx.stroke();
      const tx=-pr.od.y,ty=pr.od.x, t1=P(pr.hp.x+tx*45,pr.hp.y+ty*45,BR), t2=P(pr.hp.x-tx*45,pr.hp.y-ty*45,BR);
      ctx.strokeStyle="#3ec98a";ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(t1.x,t1.y);ctx.moveTo(b.x,b.y);ctx.lineTo(t2.x,t2.y);ctx.stroke();
    }
    // cue stick (κωνική, ρεαλιστική)
    const pw=aim.dragging?aim.power:16;
    cueStick(c.x, c.y, aim.angle, 78+pw*6);
  }
  function cueStick(cx,cy,ang,len){
    const dx=Math.cos(ang),dy=Math.sin(ang), px=-dy,py=dx, gap=BR+4;
    const t={x:cx-dx*gap,y:cy-dy*gap}, bu={x:cx-dx*(gap+len),y:cy-dy*(gap+len)}, jo={x:cx-dx*(gap+len*0.5),y:cy-dy*(gap+len*0.5)};
    const wT=1.6,wB=4.7;
    const q=[P(t.x+px*wT,t.y+py*wT,BR),P(bu.x+px*wB,bu.y+py*wB,BR),P(bu.x-px*wB,bu.y-py*wB,BR),P(t.x-px*wT,t.y-py*wT,BR)];
    const g=ctx.createLinearGradient(q[0].x,q[0].y,q[2].x,q[2].y);
    g.addColorStop(0,"#f2d492");g.addColorStop(.5,"#c99a4e");g.addColorStop(1,"#7c5a2c");
    poly(q,g);
    // σκούρα λαβή (πίσω μισό)
    const q2=[P(jo.x+px*wB*0.92,jo.y+py*wB*0.92,BR),P(bu.x+px*wB,bu.y+py*wB,BR),P(bu.x-px*wB,bu.y-py*wB,BR),P(jo.x-px*wB*0.92,jo.y-py*wB*0.92,BR)];
    poly(q2,"#241608");
    // ferrule (λευκό)
    const f0={x:cx-dx*(BR+2.5),y:cy-dy*(BR+2.5)}, f1={x:cx-dx*(BR+8),y:cy-dy*(BR+8)};
    poly([P(f0.x+px*1.7,f0.y+py*1.7,BR),P(f1.x+px*1.75,f1.y+py*1.75,BR),P(f1.x-px*1.75,f1.y-py*1.75,BR),P(f0.x-px*1.7,f0.y-py*1.7,BR)],"#f2f2ee");
    // μπλε τάκος (tip)
    const k0={x:cx-dx*(BR+0.5),y:cy-dy*(BR+0.5)};
    poly([P(k0.x+px*1.5,k0.y+py*1.5,BR),P(f0.x+px*1.7,f0.y+py*1.7,BR),P(f0.x-px*1.7,f0.y-py*1.7,BR),P(k0.x-px*1.5,k0.y-py*1.5,BR)],"#2b6cb0");
  }
  function drawBall(b){
    const c=P(b.x,b.y,BR), sh=P(b.x,b.y,0), s=scaleAt(b.x,b.y), rx=s.rx, ry=s.ry;
    const white=b.n===0&&b.kind!=='cue2';
    // soft contact shadow
    const shx=self.view==='3d'?sh.x+rx*0.18:c.x+rx*0.28, shy=self.view==='3d'?sh.y+ry*0.12:c.y+ry*0.55;
    const sg=ctx.createRadialGradient(shx,shy,1,shx,shy,rx*1.4);
    sg.addColorStop(0,"rgba(0,0,0,.42)"); sg.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=sg;ctx.beginPath();ctx.ellipse(shx,shy,rx*1.45,ry*0.62,0,0,7);ctx.fill();
    // sphere body (3D shading: highlight πάνω-αριστερά, σκοτεινό κάτω-δεξιά)
    const base=white?"#eef0f4":(b.stripe?"#fbfbf6":b.color);
    const g=ctx.createRadialGradient(c.x-rx*0.42,c.y-ry*0.46,rx*0.1, c.x+rx*0.18,c.y+ry*0.22,rx*1.18);
    g.addColorStop(0,lighten(base,0.35)); g.addColorStop(0.5,base); g.addColorStop(1,darken(base,0.45));
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(c.x,c.y,rx,ry,0,0,7);ctx.fill();
    // ρίγα (καμπυλωτή ζώνη)
    if(b.stripe&&b.n>0){ ctx.save();ctx.beginPath();ctx.ellipse(c.x,c.y,rx,ry,0,0,7);ctx.clip();
      const bg=ctx.createLinearGradient(0,c.y-ry*0.5,0,c.y+ry*0.5);
      bg.addColorStop(0,darken(b.color,0.2)); bg.addColorStop(0.5,lighten(b.color,0.2)); bg.addColorStop(1,darken(b.color,0.2));
      ctx.fillStyle=bg;ctx.beginPath();ctx.ellipse(c.x,c.y,rx*1.05,ry*0.55,0,0,7);ctx.fill();ctx.restore(); }
    // αριθμός σε λευκή κηλίδα
    if(b.n>0&&!b.noNum){ ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(c.x,c.y,rx*0.46,ry*0.46,0,0,7);ctx.fill();
      ctx.fillStyle="#161616";ctx.font="bold "+Math.max(6,ry*0.62)+"px Arial";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(b.n,c.x,c.y+ry*0.02); }
    // κόκκινη κουκκίδα στις μπάλες καραμπόλας
    if(self.mode==='carom'&&(white||b.kind==='cue2')){ ctx.fillStyle="#c62828";ctx.beginPath();ctx.ellipse(c.x,c.y,rx*0.15,ry*0.15,0,0,7);ctx.fill(); }
    // ambient edge
    ctx.strokeStyle="rgba(0,0,0,.30)";ctx.lineWidth=0.8;ctx.beginPath();ctx.ellipse(c.x,c.y,rx,ry,0,0,7);ctx.stroke();
    // γυαλιστερό highlight
    const hl=ctx.createRadialGradient(c.x-rx*0.32,c.y-ry*0.38,0.5,c.x-rx*0.32,c.y-ry*0.38,rx*0.6);
    hl.addColorStop(0,"rgba(255,255,255,.9)"); hl.addColorStop(0.6,"rgba(255,255,255,.12)"); hl.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=hl;ctx.beginPath();ctx.ellipse(c.x-rx*0.28,c.y-ry*0.34,rx*0.42,ry*0.3,-0.5,0,7);ctx.fill();
    // σκληρή λάμψη
    ctx.fillStyle="rgba(255,255,255,.95)";ctx.beginPath();ctx.ellipse(c.x-rx*0.4,c.y-ry*0.46,Math.max(0.8,rx*0.1),Math.max(0.8,ry*0.1),0,0,7);ctx.fill();
  }
  function d2(x,y){ctx.beginPath();ctx.arc(x,y,2.3,0,7);ctx.fill();}
  function poly(pts,fill){ ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill(); }
  function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

  /* ---------- loop ---------- */
  function loop(){ if(state==='sim'){ step(); if(!anyMoving()){ state='resolving'; resolve(); } } draw(); raf=requestAnimationFrame(loop); }

  /* ---------- input ---------- */
  function evtPos(e){ const r=canvas.getBoundingClientRect();
    let x=((e.touches?e.touches[0].clientX:e.clientX)-r.left)/r.width*W;
    let y=((e.touches?e.touches[0].clientY:e.clientY)-r.top)/r.height*H;
    if(self.view==='3d'){ const t=CAM.unproject(x,y); return {x:t.x,y:t.y}; }
    return {x,y};
  }
  function onDown(e){ if(turn!==0) return; const p=evtPos(e), c=cue();
    if(state==='place'){
      if(p.x>L+BR&&p.x<Rt-BR&&p.y>Tp+BR&&p.y<Bt-BR&&!balls.some(b=>b.active&&b!==c&&dist(b,p)<BR*2)){
        c.x=p.x;c.y=p.y;c.active=true;c.pocketed=false;state='aim';ballInHand=false;
        msg="Ωραία θέση. Στόχευσε & χτύπα."; updateUI(); }
      e.preventDefault&&e.preventDefault(); return; }
    if(state!=='aim') return; aim.dragging=true; updateAim(p); e.preventDefault&&e.preventDefault();
  }
  function onMove(e){ if(turn!==0) return; const p=evtPos(e); if(state==='aim') updateAim(p); }
  function updateAim(p){ const c=cue();
    if(aim.dragging){ const dx=c.x-p.x,dy=c.y-p.y,d=Math.hypot(dx,dy); aim.angle=Math.atan2(dy,dx); aim.power=clamp(d*0.12,0,32); }
    else aim.angle=Math.atan2(p.y-c.y,p.x-c.x);
  }
  function onUp(){ if(turn!==0||state!=='aim') return;
    if(aim.dragging){ aim.dragging=false; if(aim.power>4) shoot(aim.angle,aim.power); } }
  this.shootSlider=function(power){ if(turn!==0||state!=='aim') return; shoot(aim.angle, clamp(power*0.32,4,32)); };
  this.canShoot=function(){ return turn===0&&state==='aim'; };
  this.setSpin=function(x,y){ aim.spin={x:clamp(x,-1,1), y:clamp(y,-1,1)}; };

  function updateUI(){ if(ui.status) ui.status.textContent=msg;
    if(ui.turnBadge){ ui.turnBadge.textContent=state==='over'?'Τέλος':(turn===0?'Σειρά σου':'Αντίπαλος (AI)');
      ui.turnBadge.style.background=turn===0?'var(--red-soft)':'rgba(242,179,75,.16)';
      ui.turnBadge.style.color=turn===0?'var(--red)':'var(--gold)'; }
    if(ui.score){ if(self.mode==='snooker'||self.mode==='carom'){ ui.score.style.display='';
        ui.score.innerHTML=`<b>Εσύ ${scores[0]}</b> — ${scores[1]} AI`+(self.mode==='snooker'?` <span class="small">(${snState.phase==='reds'?'φάση κόκκινων':'φάση χρωμάτων'})</span>`:` <span class="small">(3 μπάντες, στους 15)</span>`);
      } else ui.score.style.display='none'; }
  }

  canvas.addEventListener('mousedown',onDown); canvas.addEventListener('mousemove',onMove);
  window.addEventListener('mouseup',onUp);
  canvas.addEventListener('touchstart',onDown,{passive:false});
  canvas.addEventListener('touchmove',(e)=>{const p=evtPos(e);if(aim.dragging){updateAim(p);e.preventDefault();}},{passive:false});
  window.addEventListener('touchend',onUp);

  this.destroy=function(){ cancelAnimationFrame(raf);
    canvas.removeEventListener('mousedown',onDown); canvas.removeEventListener('mousemove',onMove);
    window.removeEventListener('mouseup',onUp); };

  canvas.width=W; canvas.height=H; this.reset(); loop();
}

window.startPoolGame=function(canvas, ui, opts){ if(inst){inst.destroy();inst=null;} inst=new Game(canvas,ui,opts); window.__poolInst=inst; return inst; };
window.stopPoolGame=function(){ if(inst){inst.destroy();inst=null;} if(raf)cancelAnimationFrame(raf); window.__poolInst=null; };
})();
