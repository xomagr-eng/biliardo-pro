/* ================= ΜΠΙΛΙΑΡΔΟ PRO — Λογική ================= */
(function(){
const D = window.BILLIARD;
const LS = "billiardpro_v1";

/* ---------- State ---------- */
let store = load();
function load(){
  const def={done:[],drills:{},metro:60,glo:"",puzzles:[],aiWins:0,accent:"#e63946",felt:"#12508a"};
  try{ return Object.assign(def, JSON.parse(localStorage.getItem(LS)||"{}")); }
  catch(e){ return def; }
}
function save(){ try{ localStorage.setItem(LS, JSON.stringify(store)); }catch(e){} }

/* ---------- Theme / colors ---------- */
const ACCENTS=[{n:"Κόκκινο",c:"#e63946"},{n:"Μπλε",c:"#2f7fe0"},{n:"Χρυσό",c:"#f2b34b"},{n:"Πράσινο",c:"#35b877"},{n:"Μωβ",c:"#8b5cf6"},{n:"Τιρκουάζ",c:"#14b8a6"},{n:"Πορτοκαλί",c:"#f97316"},{n:"Ροζ",c:"#ec4899"}];
const FELTS=[{n:"Τουρνουά Μπλε",c:"#12508a"},{n:"Κλασικό Πράσινο",c:"#1f7a44"},{n:"Βαθύ Κόκκινο",c:"#9e2b2b"},{n:"Γκρι Ατσάλι",c:"#465063"},{n:"Μωβ",c:"#5a3a8a"},{n:"Πετρόλ",c:"#0e6b6b"},{n:"Μαύρο",c:"#20242e"},{n:"Μπορντό",c:"#6d213a"}];
function hexToRgb(h){h=(h||'').replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};}
function darkenHex(h,amt){const c=hexToRgb(h);return '#'+[c.r,c.g,c.b].map(v=>Math.max(0,Math.round(v*(1-amt))).toString(16).padStart(2,'0')).join('');}
function applyTheme(){
  const a=store.accent||"#e63946", c=hexToRgb(a), rs=document.documentElement.style;
  rs.setProperty('--red', a);
  rs.setProperty('--red-dk', darkenHex(a,0.24));
  rs.setProperty('--red-soft', `rgba(${c.r},${c.g},${c.b},.15)`);
  rs.setProperty('--theme-color', a);
}

/* ---------- PWA install ---------- */
const UA=navigator.userAgent||"";
const IS_IOS=/iphone|ipad|ipod/i.test(UA) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const IS_ANDROID=/android/i.test(UA);
function isStandalone(){ try{ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true; }catch(e){ return false; } }
function installSteps(){
  if(IS_IOS) return `<div class="note gold"><b>📱 iPhone / iPad — ΜΟΝΟ με Safari:</b><ol style="margin:6px 0 0;padding-left:20px">
    <li>Άνοιξε αυτή τη σελίδα στον <b>Safari</b> (η εγκατάσταση ΔΕΝ δουλεύει σε Chrome στο iPhone).</li>
    <li>Πάτα το κουμπί <b>Μοιρασμού</b> (τετράγωνο με βελάκι προς τα πάνω ⬆︎, στην κάτω ή πάνω μπάρα).</li>
    <li>Κύλησε και διάλεξε <b>«Προσθήκη στην Αρχική οθόνη»</b> → «Προσθήκη».</li></ol></div>`;
  if(IS_ANDROID) return `<div class="note gold"><b>🤖 Android (Chrome):</b><ol style="margin:6px 0 0;padding-left:20px">
    <li>Πάτα το κουμπί <b>«📲 Εγκατάσταση»</b> πιο πάνω.</li>
    <li>Αν δεν ανοίξει παράθυρο, πάτα το μενού <b>⋮</b> (πάνω δεξιά στο Chrome) → <b>«Εγκατάσταση εφαρμογής»</b> ή «Προσθήκη στην αρχική οθόνη».</li></ol></div>`;
  return `<div class="note gold"><b>💻 Υπολογιστής (Chrome/Edge):</b> πάτα το εικονίδιο <b>εγκατάστασης ⊕</b> στη δεξιά άκρη της μπάρας διεύθυνσης, ή μενού ⋮ → «Install / Εγκατάσταση».</div>`;
}
function installApp(){
  if(window.__bip){ window.__bip.prompt(); if(window.__bip.userChoice) window.__bip.userChoice.then(()=>{window.__bip=null;}).catch(()=>{}); }
  else if(IS_IOS){ toast("iPhone: άνοιξε σε Safari → Μοιρασμός → Προσθήκη στην αρχική οθόνη"); }
  else { toast("Μενού browser (⋮) → «Εγκατάσταση εφαρμογής»"); }
}
window.__installApp=installApp;

const allLessons = () => Object.values(D.lessons).flat();
const totalLessons = allLessons().length;
const doneCount = () => store.done.length;
const pct = () => Math.round(doneCount()/totalLessons*100);
function level(){
  const p = pct();
  const drillsDone = Object.keys(store.drills).length;
  const score = p + Math.min(drillsDone*2,20);
  if(score>=95) return {n:"Επαγγελματίας 🏆",i:5};
  if(score>=70) return {n:"Δυνατός Παίκτης",i:4};
  if(score>=45) return {n:"Προχωρημένος",i:3};
  if(score>=18) return {n:"Ερασιτέχνης",i:2};
  return {n:"Αρχάριος",i:1};
}

/* ---------- Elements ---------- */
const nav = document.getElementById('nav');
const main = document.getElementById('main');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

/* ---------- Nav ---------- */
function buildNav(){
  let html="", lastGrp=null;
  D.sections.forEach(s=>{
    if(s.grp && s.grp!==lastGrp){ html+=`<div class="nav-group">${s.grp}</div>`; lastGrp=s.grp; }
    html+=`<div class="nav-item" data-sec="${s.id}"><span class="ico">${s.ico}</span><span>${s.t}</span></div>`;
  });
  nav.innerHTML=html;
  nav.querySelectorAll('.nav-item').forEach(el=>{
    el.onclick=()=>{ go(el.dataset.sec); closeSidebar(); };
  });
}
function setActiveNav(id){
  nav.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.sec===id));
}
function updateSideProgress(){
  document.getElementById('sideProgress').style.width = pct()+"%";
  document.getElementById('sideProgressTxt').textContent = pct()+"% ολοκληρωμένο ("+doneCount()+"/"+totalLessons+")";
  const lv=level();
  document.getElementById('sideLevel').textContent = "Επίπεδο: "+lv.n;
  document.getElementById('topLevel').textContent = lv.n;
}

/* ---------- Router ---------- */
const routes = {};
let current="home";
function go(id){
  if(!routes[id]) id="home";
  if(window.stopPoolGame) window.stopPoolGame();   // stop game loop when leaving
  current=id;
  setActiveNav(id);
  main.scrollTop=0; window.scrollTo(0,0);
  main.innerHTML=routes[id]();
  if(afterRender[id]) afterRender[id]();
  location.hash=id;
}
const afterRender={};

/* ======================================================= */
/*  PAGE: HOME                                             */
/* ======================================================= */
routes.home=()=>{
  const lv=level();
  const nextLesson = allLessons().find(l=>!store.done.includes(l.id));
  const drillsDone=Object.keys(store.drills).length;
  const roadIdx = Math.min(Math.floor(pct()/ (100/D.roadmap.length)), D.roadmap.length-1);
  return `
  ${isStandalone()? '' : `
  <div class="card" style="border:1px solid var(--red);background:linear-gradient(180deg,var(--red-soft),var(--bg2))">
    <h3>📲 Εγκατάσταση στη συσκευή <span class="tag">PWA</span></h3>
    <p>Πρόσθεσε το <b>ΜΠΙΛΙΑΡΔΟ PRO</b> στην αρχική οθόνη και άνοιξέ το σαν κανονική εφαρμογή — δουλεύει και <b>offline</b>, χωρίς μπάρα browser.</p>
    <button class="btn" id="installBtn" onclick="__installApp()">📲 Εγκατάσταση εφαρμογής</button>
    <div style="margin-top:12px">${installSteps()}</div>
  </div>`}
  <div class="hero">
    <div class="page-eyebrow">Ο προσωπικός σου δάσκαλος</div>
    <h1>Γίνε επαγγελματίας παίκτης μπιλιάρδου 🎱</h1>
    <p>Πλήρης εκπαίδευση για <b>όλα τα είδη</b> — pool (8/9/10-ball, straight pool), snooker, καραμπόλα (τρεις μπάντες), ρωσικό. Από τη στάση και το χτύπημα, μέχρι τα συστήματα διαμαντιών και το νοητικό παιχνίδι. Μάθε, εξασκήσου με μετρήσιμες ασκήσεις, και παρακολούθησε την πρόοδό σου.</p>
    <button class="btn" onclick="__go('${nextLesson?sectionOf(nextLesson.id):'funda'}')">▶ Συνέχισε την εκπαίδευση</button>
    <button class="btn ghost" onclick="__go('trainer')">📐 Προπονητής Στόχευσης</button>
  </div>

  <div class="stat-row">
    <div class="stat"><div class="n">${lv.i}/5</div><div class="l">Επίπεδο</div></div>
    <div class="stat gold"><div class="n">${pct()}%</div><div class="l">Ύλη</div></div>
    <div class="stat ok"><div class="n">${doneCount()}</div><div class="l">Μαθήματα</div></div>
    <div class="stat"><div class="n">${drillsDone}</div><div class="l">Ασκήσεις</div></div>
  </div>

  <div class="grid g2">
    <div class="card">
      <h3>🗺️ Το μονοπάτι του επαγγελματία</h3>
      <div class="road">
        ${D.roadmap.map((r,i)=>`
          <div class="road-step ${i<roadIdx?'done':(i===roadIdx?'cur':'')}">
            <div class="road-dot"><div class="circ">${i<roadIdx?'✓':i+1}</div><div class="bar"></div></div>
            <div class="road-body"><h4>${r.t}</h4><p>${r.d}</p></div>
          </div>`).join('')}
      </div>
    </div>
    <div>
      <div class="card">
        <h3>🎯 Επόμενο βήμα</h3>
        ${nextLesson? `<p>Το επόμενο μάθημά σου:</p>
          <div class="lesson" onclick="__go('${sectionOf(nextLesson.id)}')">
            <div class="chk">✓</div>
            <div class="l-body"><h4>${nextLesson.t}</h4><p>${nextLesson.meta}</p></div>
            <div class="l-meta">▶</div>
          </div>`
          : `<div class="note ok"><b>Μπράβο!</b> Ολοκλήρωσες όλη τη θεωρία. Τώρα ρίξ' το στην εξάσκηση — άνοιξε τις <a onclick="__go('drills')">Ασκήσεις</a>.</div>`}
      </div>
      <div class="card">
        <h3>💡 Συμβουλή της ημέρας</h3>
        <p id="tipTxt">${randomTip()}</p>
        <button class="btn ghost sm" onclick="document.getElementById('tipTxt').textContent=__tip()">Άλλη συμβουλή</button>
      </div>
    </div>
  </div>

  <div class="card">
    <h3>🧭 Γρήγορη πλοήγηση</h3>
    <div class="grid g4">
      ${['funda','aim','cueball','systems','games','drills','mental','glossary'].map(id=>{
        const s=D.sections.find(x=>x.id===id);
        return `<div class="lesson" onclick="__go('${id}')"><div class="chk" style="border:none;background:transparent;color:var(--red);font-size:20px">${s.ico}</div><div class="l-body"><h4>${s.t}</h4></div></div>`;
      }).join('')}
    </div>
  </div>`;
};

function sectionOf(lessonId){
  for(const [sec,arr] of Object.entries(D.lessons)) if(arr.some(l=>l.id===lessonId)) return sec;
  return "funda";
}

const TIPS=[
 "Το τελευταίο σου βλέμμα πριν το χτύπημα πρέπει να είναι στη <b>μπάλα-στόχο</b>, όχι στη λευκή.",
 "Χαλάρωσε τη λαβή. Το 90% των αρχάριων σφίγγει υπερβολικά και χάνει την ευθεία.",
 "Η <b>ένταση</b> ελέγχει τη θέση πιο πολύ κι από το φάλτσο. Δούλεψε την κλίμακα 1-10.",
 "Μείνε κάτω στη μπάλα (stay down) μέχρι να τελειώσει το χτύπημα. Μην πετάγεσαι να δεις.",
 "Μάθε το <b>half-ball</b> (30° κόψιμο) — είναι το σταθερό σημείο αναφοράς για όλες τις γωνίες.",
 "Πρόβλεψε πού θα πάει η λευκή <b>πριν</b> χτυπήσεις. Αλλιώς παίζεις τυχαία.",
 "Στο draw, κράτα την κιλότα οριζόντια και χτύπα καθαρά — όχι δυνατότερα.",
 "Η άμυνα δεν είναι παραίτηση· είναι επιθετική κίνηση όταν δεν υπάρχει μπάλα.",
 "Ίδιος ρυθμός σε κάθε χτύπημα. Άλλαξε μόνο το μήκος της αιώρησης για την ένταση.",
 "Κράτα σκορ σε κάθε άσκηση. Ό,τι μετριέται, βελτιώνεται."
];
function randomTip(){ return TIPS[Math.floor(Math.random()*TIPS.length)]; }
window.__tip=randomTip;

/* ======================================================= */
/*  PAGE: LESSON SECTIONS (funda, aim, cueball, spin, position, mental) */
/* ======================================================= */
const lessonSections={
  funda:{t:"Βασικές Αρχές",eye:"Θεμέλια",lead:"Πριν από κάθε γωνία και φάλτσο, χτίζεται το σώμα. Στάση, λαβή, γέφυρα και ένα καθαρό, επαναλήψιμο χτύπημα — εδώ κρίνεται το 80% του παιχνιδιού σου."},
  aim:{t:"Στόχευση",eye:"Θεμέλια",lead:"Πώς να βάζεις μπάλες με σιγουριά. Center-ball, ghost ball, fractional aiming και οι διορθώσεις του throw."},
  cueball:{t:"Έλεγχος Λευκής",eye:"Τεχνική",lead:"Το κλειδί που χωρίζει τον ερασιτέχνη από τον παίκτη: να αφήνεις τη λευκή ακριβώς εκεί που τη θέλεις."},
  spin:{t:"Φάλτσα & Εφέ",eye:"Τεχνική",lead:"Πλάγιο φάλτσο, deflection, swerve, massé. Πλήρης έλεγχος της περιστροφής και των παρενεργειών της."},
  position:{t:"Θέση & Στρατηγική",eye:"Τεχνική",lead:"Σκέψου μπροστά. Pattern play, ζώνες θέσης, άμυνα και το σπάσιμο."},
  mental:{t:"Νοητικό Παιχνίδι",eye:"Προπόνηση",lead:"Το μπιλιάρδο κερδίζεται στο κεφάλι. Συγκέντρωση, πίεση και ποιοτική εξάσκηση."}
};
Object.keys(lessonSections).forEach(sec=>{
  routes[sec]=()=>{
    const s=lessonSections[sec];
    const arr=D.lessons[sec];
    return `
    <div class="page-head">
      <div class="page-eyebrow">${s.eye}</div>
      <div class="page-title">${s.t}</div>
      <div class="page-lead">${s.lead}</div>
    </div>
    ${arr.map(l=>{
      const done=store.done.includes(l.id);
      return `<div class="card" id="card-${l.id}">
        <h3>${l.t}<span class="tag">${l.meta}</span></h3>
        ${l.body}
        <div style="margin-top:14px;display:flex;gap:10px;align-items:center">
          <button class="btn ${done?'ghost':''}" data-done="${l.id}">${done?'✓ Ολοκληρωμένο':'Σημείωσε ως ολοκληρωμένο'}</button>
        </div>
      </div>`;
    }).join('')}
    <div class="card" style="text-align:center">
      <p>Ολοκλήρωσες την ενότητα; Δοκίμασέ την στην πράξη.</p>
      <button class="btn" onclick="__go('drills')">🏋️ Πήγαινε στις Ασκήσεις</button>
      <button class="btn ghost" onclick="__go('trainer')">📐 Προπονητής Στόχευσης</button>
    </div>`;
  };
  afterRender[sec]=()=>{
    main.querySelectorAll('[data-done]').forEach(b=>{
      b.onclick=()=>{
        const id=b.dataset.done;
        const i=store.done.indexOf(id);
        if(i>=0){ store.done.splice(i,1); } else { store.done.push(id); toast("✓ Μπράβο! Μάθημα ολοκληρωμένο"); }
        save(); updateSideProgress(); go(sec);
      };
    });
  };
});

/* ======================================================= */
/*  PAGE: TRAINER (Aiming trainer με γεωμετρία)            */
/* ======================================================= */
// Table geometry (SVG viewBox 0 0 800 440)
const T={x0:44,y0:44,x1:756,y1:396}; // playing area
const R=13; // ball radius
const pockets={
  tl:{x:T.x0,y:T.y0,n:"Πάνω αριστερά"}, tr:{x:T.x1,y:T.y0,n:"Πάνω δεξιά"},
  bl:{x:T.x0,y:T.y1,n:"Κάτω αριστερά"}, br:{x:T.x1,y:T.y1,n:"Κάτω δεξιά"},
  tc:{x:(T.x0+T.x1)/2,y:T.y0,n:"Πάνω κέντρο"}, bc:{x:(T.x0+T.x1)/2,y:T.y1,n:"Κάτω κέντρο"}
};
let scene={cb:{x:200,y:300}, ob:{x:520,y:170}, pocket:"tr"};
const FRACS=[{f:1,n:"Full (πλήρης)"},{f:0.875,n:"7/8"},{f:0.75,n:"3/4"},{f:0.625,n:"5/8"},{f:0.5,n:"1/2 (half-ball)"},{f:0.375,n:"3/8"},{f:0.25,n:"1/4"},{f:0.125,n:"Edge (~1/8)"}];

routes.trainer=()=>`
  <div class="page-head">
    <div class="page-eyebrow">Διαδραστικό εργαλείο</div>
    <div class="page-title">📐 Προπονητής Στόχευσης</div>
    <div class="page-lead">Σύρε τη <b>λευκή</b> και τη <b>μπάλα-στόχο</b> πάνω στο τραπέζι. Το εργαλείο υπολογίζει ζωντανά τη <b>ghost ball</b>, τη <b>γωνία κοψίματος</b>, το <b>κλάσμα επικάλυψης</b> και τη <b>γραμμή εφαπτομένης</b> (πού φεύγει η λευκή σε stun). Διάλεξε τσέπη-στόχο και εξάσκησε το μάτι σου.</div>
  </div>
  <div class="trainer-wrap">
    <div class="table-box">
      <svg id="pooltable" viewBox="0 0 800 440"></svg>
      <div class="legend">
        <span><i style="background:#fff"></i> Λευκή</span>
        <span><i style="background:#f2b34b"></i> Μπάλα-στόχος</span>
        <span><i style="background:rgba(255,255,255,.35);border:1px dashed #fff"></i> Ghost ball</span>
        <span><i style="background:var(--red)"></i> Γραμμή στόχευσης</span>
        <span><i style="background:#3ec98a"></i> Εφαπτομένη (stun)</span>
      </div>
    </div>
    <div>
      <div class="card">
        <h3>📊 Ανάλυση</h3>
        <div class="readout" id="readout"></div>
      </div>
      <div class="card">
        <h3>🎯 Τσέπη-στόχος</h3>
        <div class="seg" id="pocketSeg">
          ${Object.entries(pockets).map(([k,p])=>`<button data-p="${k}">${p.n}</button>`).join('')}
        </div>
        <button class="btn" style="width:100%;margin-top:6px" id="randomBtn">🎲 Τυχαίο χτύπημα</button>
      </div>
    </div>
  </div>
  <div class="card">
    <h3>Πώς να το χρησιμοποιήσεις</h3>
    <ul>
      <li>Στήσε ένα χτύπημα, δες τη <b>γωνία κοψίματος</b> και το <b>κλάσμα</b>, μετά πήγαινε στο πραγματικό τραπέζι και αναπαρήγαγέ το.</li>
      <li>Η <b>πράσινη γραμμή</b> (εφαπτομένη) δείχνει πού θα φύγει η λευκή αν χτυπήσεις stun. Με <b>follow</b> κάμπτεται μπροστά, με <b>draw</b> πίσω από αυτήν.</li>
      <li>Πάτα «Τυχαίο χτύπημα» και προσπάθησε να «διαβάσεις» τη γωνία <b>πριν</b> κοιτάξεις την ανάλυση.</li>
    </ul>
  </div>`;

afterRender.trainer=()=>{
  const svg=document.getElementById('pooltable');
  drawTable(svg);
  // pocket seg
  const seg=document.getElementById('pocketSeg');
  seg.querySelectorAll('button').forEach(b=>{
    b.classList.toggle('on', b.dataset.p===scene.pocket);
    b.onclick=()=>{ scene.pocket=b.dataset.p; seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.p===scene.pocket)); render(); };
  });
  document.getElementById('randomBtn').onclick=()=>{
    scene.ob={x:rand(T.x0+60,T.x1-60),y:rand(T.y0+40,T.y1-40)};
    scene.cb={x:rand(T.x0+60,T.x1-60),y:rand(T.y0+40,T.y1-40)};
    const ks=Object.keys(pockets); scene.pocket=ks[Math.floor(Math.random()*ks.length)];
    seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.p===scene.pocket));
    render();
  };
  setupDrag(svg);
  render();

  function render(){ drawScene(svg); updateReadout(); }
  window.__trainerRender=render;
};
function rand(a,b){ return a+Math.random()*(b-a); }

function drawTable(svg){
  // static table background & pockets
  let s=`
   <rect x="8" y="8" width="784" height="424" rx="18" fill="#6b4a2b"/>
   <rect x="8" y="8" width="784" height="424" rx="18" fill="none" stroke="#3a2716" stroke-width="2"/>
   <rect x="${T.x0-14}" y="${T.y0-14}" width="${T.x1-T.x0+28}" height="${T.y1-T.y0+28}" rx="6" fill="#0c3a66"/>
   <rect x="${T.x0}" y="${T.y0}" width="${T.x1-T.x0}" height="${T.y1-T.y0}" fill="#12508a"/>`;
  // diamonds
  const nx=8, ny=4;
  for(let i=1;i<nx;i++){ const x=T.x0+(T.x1-T.x0)*i/nx;
    s+=`<circle cx="${x}" cy="${T.y0-9}" r="2.4" fill="#e8d9b5"/><circle cx="${x}" cy="${T.y1+9}" r="2.4" fill="#e8d9b5"/>`; }
  for(let i=1;i<ny;i++){ const y=T.y0+(T.y1-T.y0)*i/ny;
    s+=`<circle cx="${T.x0-9}" cy="${y}" r="2.4" fill="#e8d9b5"/><circle cx="${T.x1+9}" cy="${y}" r="2.4" fill="#e8d9b5"/>`; }
  // pockets
  Object.values(pockets).forEach(p=>{ s+=`<circle cx="${p.x}" cy="${p.y}" r="15" fill="#05070a"/>`; });
  s+=`<g id="dynamic"></g>`;
  svg.innerHTML=s;
}

function calc(){
  const {cb,ob}=scene, P=pockets[scene.pocket];
  const dOP=norm(sub(P,ob));                 // object ball travel dir
  const ghost={x:ob.x-dOP.x*2*R, y:ob.y-dOP.y*2*R};
  const dCG=norm(sub(ghost,cb));             // cue ball travel dir
  let dot=clamp(dCG.x*dOP.x+dCG.y*dOP.y,-1,1);
  let cut=Math.acos(dot)*180/Math.PI;        // cut angle deg
  const frac=1-Math.sin(cut*Math.PI/180);
  // side (left/right cut) via cross product
  const cross=dOP.x*(cb.y-ob.y)-dOP.y*(cb.x-ob.x);
  const side=cross>0?"δεξιά":"αριστερά";
  // tangent line dir (perpendicular to dOP)
  const tan={x:-dOP.y,y:dOP.x};
  // ensure tangent points to the side cue came from
  const toCB=sub(cb,ob);
  if(tan.x*toCB.x+tan.y*toCB.y<0){ tan.x*=-1; tan.y*=-1; }
  return {P,dOP,ghost,dCG,cut,frac,side,tan};
}

function drawScene(svg){
  const g=svg.querySelector('#dynamic');
  const c=calc();
  const {cb,ob}=scene;
  const impossible = c.cut>=89.5;
  // aim line (cue -> ghost, extended a bit)
  let s="";
  // target line (ob -> pocket)
  s+=line(ob.x,ob.y,c.P.x,c.P.y,"rgba(255,255,255,.25)",1.5,"4 4");
  if(!impossible){
    // ghost ball
    s+=`<circle cx="${c.ghost.x}" cy="${c.ghost.y}" r="${R}" fill="rgba(255,255,255,.10)" stroke="#fff" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    // aim line cue->ghost
    s+=line(cb.x,cb.y,c.ghost.x,c.ghost.y,"var(--red)",2);
    // tangent line (stun path) from ob along tangent
    const tl=90;
    s+=line(ob.x,ob.y,ob.x+c.tan.x*tl,ob.y+c.tan.y*tl,"#3ec98a",2,"5 3");
    // contact point
    const cp={x:ob.x-c.dOP.x*R,y:ob.y-c.dOP.y*R};
    s+=`<circle cx="${cp.x}" cy="${cp.y}" r="3" fill="var(--red)"/>`;
  }
  // balls
  s+=ballSVG(ob.x,ob.y,"#f2b34b","ob");
  s+=ballSVG(cb.x,cb.y,"#ffffff","cb");
  g.innerHTML=s;
}
function ballSVG(x,y,fill,cls){
  return `<g class="ball" data-ball="${cls}" style="cursor:grab">
    <circle cx="${x}" cy="${y}" r="${R}" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
    <circle cx="${x-4}" cy="${y-4}" r="3.5" fill="rgba(255,255,255,.55)"/>
   </g>`;
}
function line(x1,y1,x2,y2,stroke,w,dash){
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''} stroke-linecap="round"/>`;
}

function updateReadout(){
  const c=calc();
  const impossible=c.cut>=89.5;
  // nearest fraction
  let nf=FRACS[0],best=9;
  FRACS.forEach(f=>{ const d=Math.abs(f.f-c.frac); if(d<best){best=d;nf=f;} });
  // difficulty
  const dist=(len(sub(scene.ob,scene.cb))+len(sub(pockets[scene.pocket],scene.ob)))/2;
  let stars = Math.round( (c.cut/90*3) + (dist/380*2) );
  stars=clamp(stars,1,5);
  let diffTxt = stars<=1?"Εύκολο":stars===2?"Μέτριο":stars===3?"Δύσκολο":stars===4?"Πολύ δύσκολο":"Εξπέρ";
  const el=document.getElementById('readout');
  if(impossible){
    el.innerHTML=`<div class="note">Αυτό το χτύπημα είναι <b>αδύνατο/υπερβολικά λεπτό</b> προς αυτή την τσέπη (γωνία ≈90°). Δοκίμασε άλλη τσέπη ή μετακίνησε τις μπάλες — ή σκέψου <b>bank/kick</b>.</div>`;
    return;
  }
  el.innerHTML=`
    <div class="r-row"><span class="r-k">Γωνία κοψίματος</span><span class="r-v big">${c.cut.toFixed(1)}°</span></div>
    <div class="r-row"><span class="r-k">Κλάσμα επικάλυψης</span><span class="r-v">${nf.n}</span></div>
    <div class="r-row"><span class="r-k">Κατεύθυνση</span><span class="r-v">κόψιμο ${c.side}</span></div>
    <div class="r-row"><span class="r-k">Δυσκολία</span><span class="r-v" style="color:var(--gold)">${'★'.repeat(stars)}${'☆'.repeat(5-stars)} ${diffTxt}</span></div>
    <div class="r-row"><span class="r-k">Οδηγία</span><span class="r-v" style="font-size:13px;text-align:right">${c.cut<8?'Σχεδόν ίσια — center ball, μείνε στη γραμμή':c.cut<22?'Μικρό κόψιμο — 3/4 μπάλα':c.cut<38?'Half-ball — σημείο αναφοράς':c.cut<52?'Μεγάλο κόψιμο (1/4) — καθαρή στόχευση':'Πολύ λεπτό — παίξε αργά & ακριβώς'}</span></div>`;
}

/* dragging balls */
function setupDrag(svg){
  let dragging=null;
  const pt=(e)=>{
    const r=svg.getBoundingClientRect();
    const cx=(e.touches?e.touches[0].clientX:e.clientX)-r.left;
    const cy=(e.touches?e.touches[0].clientY:e.clientY)-r.top;
    return {x:cx/r.width*800, y:cy/r.height*440};
  };
  const down=(e)=>{
    const p=pt(e);
    const dcb=len(sub(scene.cb,p)), dob=len(sub(scene.ob,p));
    if(dcb<24 && dcb<=dob) dragging="cb";
    else if(dob<24) dragging="ob";
    else return;
    e.preventDefault();
  };
  const move=(e)=>{
    if(!dragging) return;
    const p=pt(e);
    scene[dragging]={
      x:clamp(p.x,T.x0+2,T.x1-2),
      y:clamp(p.y,T.y0+2,T.y1-2)
    };
    if(window.__trainerRender) window.__trainerRender();
    e.preventDefault();
  };
  const up=()=>{ dragging=null; };
  svg.addEventListener('mousedown',down); svg.addEventListener('touchstart',down,{passive:false});
  window.addEventListener('mousemove',move); window.addEventListener('touchmove',move,{passive:false});
  window.addEventListener('mouseup',up); window.addEventListener('touchend',up);
}

/* vector helpers */
function sub(a,b){return{x:a.x-b.x,y:a.y-b.y}}
function len(v){return Math.hypot(v.x,v.y)}
function norm(v){const l=len(v)||1;return{x:v.x/l,y:v.y/l}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

/* ======================================================= */
/*  PAGE: SYSTEMS (Diamond system)                        */
/* ======================================================= */
routes.systems=()=>`
  <div class="page-head">
    <div class="page-eyebrow">Τεχνική</div>
    <div class="page-title">💠 Συστήματα Διαμαντιών</div>
    <div class="page-lead">Γεωμετρία αντί για μαντεψιά. Τα διαμάντια (σημάδια στη μπάντα) σου δίνουν αριθμούς για να προβλέψεις πού θα καταλήξει η λευκή μετά από μπάντες — απαραίτητα για banks, kicks και three-cushion.</div>
  </div>

  <div class="card">
    <h3>Τι είναι τα διαμάντια</h3>
    <p>Σε κάθε μπάντα υπάρχουν σημάδια (συνήθως 3 στη μικρή, 7 στη μεγάλη πλευρά ανάμεσα στις τσέπες). Τα αριθμούμε και χρησιμοποιούμε αριθμητικούς τύπους. <b>Σημαντικό:</b> στόχευε <b>μέσα από το διαμάντι</b> — τα διαμάντια είναι στο ξύλο, όχι πάνω στο πανί, οπότε η πραγματική επαφή είναι στο πανί μπροστά από το διαμάντι.</p>
  </div>

  <div class="card">
    <h3>Corner-5 System (Three-Cushion) <span class="tag">Καραμπόλα</span></h3>
    <p>Το θεμελιώδες σύστημα για τρεις μπάντες. Η ιδέα: αριθμείς <b>θέση λευκής</b>, <b>σημείο 1ης μπάντας</b> και <b>σημείο 3ης μπάντας</b>, και ισχύει:</p>
    <div class="note gold" style="font-size:16px;text-align:center"><b>Θέση Λευκής − Σημείο 1ης Μπάντας = Σημείο 3ης Μπάντας</b></div>
    <ul>
      <li>Η λευκή ξεκινά από τη γωνία = θέση <b>5</b> (εξ ου «Corner-5»). Οι αριθμοί θέσης αυξάνονται κατά ½ ανά διαμάντι στη μεγάλη μπάντα.</li>
      <li><b>Παράδειγμα:</b> Λευκή στο 5, στοχεύεις 1η μπάντα στο διαμάντι 3 → <b>5 − 3 = 2</b> → η λευκή φτάνει στην 3η μπάντα στο διαμάντι 2. Μέτρια ένταση, <b>running english</b>.</li>
      <li>Το φάλτσο & η ένταση πρέπει να είναι <b>σταθερά</b> (το σύστημα καλιμπράρεται γι' αυτά). Άλλαξε τα και οι αριθμοί μετατοπίζονται.</li>
    </ul>
    <div class="note">Το σύστημα δίνει σημείο εκκίνησης· η πείρα το «τζαρέρει» για μπάλες που δεν είναι ακριβώς στη γωνία (plus/minus διορθώσεις).</div>
  </div>

  <div class="grid g2">
    <div class="card">
      <h3>Banks — Το «σύστημα καθρέφτη» <span class="tag">Pool</span></h3>
      <p>Για να «τραπεζώσεις» τη μπάλα-στόχο σε μπάντα: φαντάσου την τσέπη-στόχο <b>καθρεφτισμένη</b> πέρα από τη μπάντα (ίση απόσταση απ' την άλλη πλευρά). Στόχευσε τη μπάλα προς αυτόν τον φανταστικό στόχο· η μπάντα «διπλώνει» την πορεία πίσω στην πραγματική τσέπη.</p>
      <p class="small">Προσοχή: με ένταση & φάλτσο η πραγματική γωνία «κλείνει/ανοίγει» λίγο σε σχέση με τον τέλειο καθρέφτη.</p>
    </div>
    <div class="card">
      <h3>Kicks — Χτύπα τη μπάλα μέσω μπάντας <span class="tag">Pool</span></h3>
      <p>Όταν είσαι snookered (καλυμμένος), χρειάζεσαι kick: η λευκή περνά πρώτα από μπάντα και μετά βρίσκει τη μπάλα-στόχο. Χρησιμοποίησε το <b>σύστημα καθρέφτη</b> ανάποδα — καθρέφτισε τη <b>μπάλα-στόχο</b> και σημάδεψε το σημείο μπάντας ανάμεσα.</p>
      <p class="small">Vξεκίνα με απλά «half-table» kicks με ελεγχόμενη μέτρια ένταση.</p>
    </div>
  </div>

  <div class="card">
    <h3>Πώς να τα εξασκήσεις</h3>
    <ul>
      <li>Πήγαινε στις <b>Ασκήσεις</b> → «Corner-5 Reps» και «One-Cushion Repeat».</li>
      <li>Ξεκίνα με σταθερή ένταση & running english, κράτα ημερολόγιο επιτυχιών.</li>
      <li>Δούλεψε πρώτα one-cushion για να νιώσεις τις γωνίες, μετά προχώρα σε τρεις μπάντες.</li>
    </ul>
    <button class="btn" onclick="__go('drills')">🏋️ Ασκήσεις Συστημάτων</button>
  </div>`;

/* ======================================================= */
/*  PAGE: GAMES                                            */
/* ======================================================= */
routes.games=()=>{
  const fams=[...new Set(D.games.map(g=>g.fam))];
  return `
  <div class="page-head">
    <div class="page-eyebrow">Όλα τα είδη</div>
    <div class="page-title">🎱 Είδη Μπιλιάρδου</div>
    <div class="page-lead">Κανόνες, στόχος και στρατηγική για κάθε παιχνίδι. Ο επαγγελματίας ξέρει να κινείται σε όλα — από το pool και το snooker μέχρι την καραμπόλα.</div>
  </div>
  <div class="subtabs" id="famTabs">
    ${fams.map((f,i)=>`<button data-f="${i}" class="${i===0?'on':''}">${f}</button>`).join('')}
  </div>
  <div id="gamesBody"></div>`;
};
afterRender.games=()=>{
  const fams=[...new Set(D.games.map(g=>g.fam))];
  const tabs=document.getElementById('famTabs');
  const body=document.getElementById('gamesBody');
  function renderFam(i){
    const f=fams[i];
    body.innerHTML=D.games.filter(g=>g.fam===f).map(g=>`
      <div class="card">
        <h3>${g.t}<span class="tag">${g.fam}</span></h3>
        <p style="color:var(--gold);font-weight:600;margin-bottom:6px">${g.tagline}</p>
        <p>${g.intro}</p>
        <table class="rules">
          <tr><th>Κανόνας</th><th>Περιγραφή</th></tr>
          ${g.rules.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}
        </table>
        <h4 style="margin:12px 0 6px;font-size:14px;color:var(--red)">Στρατηγική επαγγελματία</h4>
        <ul>${g.strat.map(s=>`<li>${s}</li>`).join('')}</ul>
      </div>`).join('');
  }
  tabs.querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{ tabs.querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); renderFam(+b.dataset.f); };
  });
  renderFam(0);
};

/* ======================================================= */
/*  PAGE: DRILLS                                           */
/* ======================================================= */
let drillFilter="all";
routes.drills=()=>`
  <div class="page-head">
    <div class="page-eyebrow">Προπόνηση με μέτρηση</div>
    <div class="page-title">🏋️ Ασκήσεις</div>
    <div class="page-lead">Ό,τι μετριέται, βελτιώνεται. Κατέγραψε το σκορ σου σε κάθε άσκηση — το εργαλείο κρατά το ρεκόρ σου και το ιστορικό, ώστε να βλέπεις την πρόοδο.</div>
  </div>
  <div class="filter-bar" id="drillFilter">
    <button data-f="all" class="on">Όλες</button>
    <button data-f="pool">Pool</button>
    <button data-f="snooker">Snooker</button>
    <button data-f="carom">Καραμπόλα</button>
    <button data-f="b">Αρχάριος</button>
    <button data-f="i">Μέσος</button>
    <button data-f="a">Προχωρημένος</button>
  </div>
  <div id="drillList"></div>`;
afterRender.drills=()=>{
  const fb=document.getElementById('drillFilter');
  fb.querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{ drillFilter=b.dataset.f; fb.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); renderDrills(); };
  });
  renderDrills();
};
function renderDrills(){
  const list=document.getElementById('drillList');
  const diffName={b:"Αρχάριος",i:"Μέσος",a:"Προχωρημένος"};
  const diffCls={b:"b",i:"i",a:"a"};
  const items=D.drills.filter(d=> drillFilter==="all" || d.g===drillFilter || d.diff===drillFilter);
  list.innerHTML=items.map(d=>{
    const rec=store.drills[d.id]||{best:null,hist:[]};
    return `<div class="drill">
      <div class="drill-top">
        <h4>${d.t}</h4>
        <span class="pill ${d.g==='pool'?'red':d.g==='snooker'?'gold':'ok'}">${d.g==='pool'?'Pool':d.g==='snooker'?'Snooker':'Καραμπόλα'}</span>
        <span class="diff ${diffCls[d.diff]}">${diffName[d.diff]}</span>
      </div>
      <p>${d.d}</p>
      <div class="note gold" style="margin:0 0 10px">🎯 Στόχος: ${d.goal}</div>
      <div class="drill-score">
        <span class="small">${d.scoreT}:</span>
        <input type="number" id="in-${d.id}" placeholder="σκορ" min="0">
        <button class="btn sm" data-save="${d.id}">Καταγραφή</button>
        <span class="best">${rec.best!=null?'🏆 Ρεκόρ: '+rec.best:'—'}</span>
      </div>
      ${rec.hist.length?`<div class="drill-hist">Ιστορικό: ${rec.hist.slice(-8).join(' · ')}</div>`:''}
    </div>`;
  }).join('') || `<div class="card">Καμία άσκηση σε αυτό το φίλτρο.</div>`;
  list.querySelectorAll('[data-save]').forEach(b=>{
    b.onclick=()=>{
      const id=b.dataset.save;
      const v=parseFloat(document.getElementById('in-'+id).value);
      if(isNaN(v)){ toast("Γράψε έναν αριθμό σκορ"); return; }
      const rec=store.drills[id]||{best:null,hist:[]};
      rec.hist.push(v);
      const isRec = rec.best==null || v>rec.best;
      if(isRec) rec.best=v;
      store.drills[id]=rec; save(); updateSideProgress();
      toast(isRec?"🏆 Νέο ρεκόρ! Μπράβο!":"✓ Καταγράφηκε");
      renderDrills();
    };
  });
}

/* ======================================================= */
/*  PAGE: PLAN                                             */
/* ======================================================= */
routes.plan=()=>`
  <div class="page-head">
    <div class="page-eyebrow">Δομημένη πρόοδος</div>
    <div class="page-title">📅 Πρόγραμμα Προπόνησης</div>
    <div class="page-lead">Δεν μετρά πόσες ώρες, αλλά πώς τις ξοδεύεις. Διάλεξε το επίπεδό σου και ακολούθησε μια δομημένη ρουτίνα. Χρυσός κανόνας: <b>50% τεχνική / 50% παιχνίδι</b>.</div>
  </div>

  <div class="card">
    <h3>🟢 Αρχάριος — 30-45' / ημέρα</h3>
    <ol>
      <li><b>10' Θεμέλια:</b> Στάση & ευθύ χτύπημα χωρίς μπάλα-στόχο (χτύπα τη λευκή σε ευθεία μπάντα-και-πίσω).</li>
      <li><b>10' Άσκηση «Η Γραμμή»:</b> stop shots σε ευθεία — 10 συνεχόμενες.</li>
      <li><b>10' Center-ball:</b> Έλεγχος ότι δεν βάζεις άθελά σου φάλτσο.</li>
      <li><b>10' Παιχνίδι:</b> Παίξε ελεύθερα, εφάρμοσε τη ρουτίνα σε κάθε μπάλα.</li>
    </ol>
  </div>
  <div class="card">
    <h3>🟡 Μέσος — 60-90' / ημέρα</h3>
    <ol>
      <li><b>10' Ζέσταμα:</b> Long straight-in, βρες τη γραμμή σου.</li>
      <li><b>20' Έλεγχος λευκής:</b> Wagon Wheel / Black-ball off the spot — follow/draw/stun.</li>
      <li><b>15' Στόχευση:</b> Ghost Ball Game (9 μπάλες).</li>
      <li><b>15' Θέση:</b> L-Drill, pattern play.</li>
      <li><b>20' Παιχνίδι + άμυνα:</b> 9-ball / snooker line-up, κράτα σκορ.</li>
    </ol>
  </div>
  <div class="card">
    <h3>🔴 Προχωρημένος → Επαγγελματίας — 2-4 ώρες / ημέρα</h3>
    <ol>
      <li><b>15' Ζέσταμα & tempo:</b> με μετρονόμο, σταθερός ρυθμός.</li>
      <li><b>45' Απομονωμένες αδυναμίες:</b> ό,τι χάνεις πιο συχνά (κατέγραψέ το!).</li>
      <li><b>30' Συστήματα:</b> banks/kicks, Corner-5 reps.</li>
      <li><b>30' Break-building:</b> snooker line-up ή straight pool runs.</li>
      <li><b>30' Άμυνα & safety exchanges.</b></li>
      <li><b>45'+ Αγωνιστικό:</b> races υπό πίεση, κράτα στατιστικά (average/potting %).</li>
    </ol>
    <div class="note gold"><b>Εβδομαδιαίο:</b> 1 μέρα ξεκούραση, 1 μέρα μόνο αγώνες, 1 μέρα μόνο τεχνική-video ανάλυση του εαυτού σου.</div>
  </div>
  <div class="card" style="text-align:center">
    <p>Έτοιμος; Ξεκίνα την προπόνηση της ημέρας.</p>
    <button class="btn" onclick="__go('drills')">🏋️ Ασκήσεις</button>
    <button class="btn ghost" onclick="__go('metro')">🥁 Μετρονόμος</button>
  </div>`;

/* ======================================================= */
/*  PAGE: METRONOME                                        */
/* ======================================================= */
let metroTimer=null, audioCtx=null;
routes.metro=()=>`
  <div class="page-head">
    <div class="page-eyebrow">Ρυθμός & tempo</div>
    <div class="page-title">🥁 Μετρονόμος Ρυθμού</div>
    <div class="page-lead">Οι κορυφαίοι παίκτες έχουν <b>σταθερό tempo</b> — ο ίδιος ρυθμός σε feathering και τελικό χτύπημα, ακόμη κι υπό πίεση. Συγχρόνισε τις κινήσεις σου με τον χτύπο.</div>
  </div>
  <div class="card">
    <div class="metro">
      <div class="metro-dot" id="metroDot"></div>
      <div class="metro-bpm"><span id="bpmVal">${store.metro}</span> <span style="font-size:20px;color:var(--txt-mut)">BPM</span></div>
      <input type="range" min="40" max="120" value="${store.metro}" id="bpmSlider">
      <div style="display:flex;gap:10px">
        <button class="btn" id="metroToggle">▶ Έναρξη</button>
        <button class="btn ghost" onclick="__setBpm(50)">Αργό 50</button>
        <button class="btn ghost" onclick="__setBpm(60)">Μέτριο 60</button>
        <button class="btn ghost" onclick="__setBpm(72)">Γρήγορο 72</button>
      </div>
    </div>
  </div>
  <div class="card">
    <h3>Πώς να τον χρησιμοποιήσεις</h3>
    <ul>
      <li>Συγχρόνισε την <b>πίσω κίνηση</b> σε έναν χτύπο και το <b>χτύπημα</b> στον επόμενο.</li>
      <li>Κράτα τον <b>ίδιο</b> αριθμό feathering πριν από κάθε μπάλα (π.χ. 3 κινήσεις).</li>
      <li>Ξεκίνα αργά (50). Ο στόχος δεν είναι η ταχύτητα, αλλά η <b>σταθερότητα</b>.</li>
    </ul>
  </div>`;
afterRender.metro=()=>{
  const slider=document.getElementById('bpmSlider');
  slider.oninput=()=>{ store.metro=+slider.value; document.getElementById('bpmVal').textContent=store.metro; save(); if(metroTimer) restartMetro(); };
  document.getElementById('metroToggle').onclick=toggleMetro;
  window.__setBpm=(v)=>{ store.metro=v; slider.value=v; document.getElementById('bpmVal').textContent=v; save(); if(metroTimer) restartMetro(); };
};
function tick(){
  const dot=document.getElementById('metroDot');
  if(dot){ dot.classList.add('tick'); setTimeout(()=>dot.classList.remove('tick'),80); }
  try{
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.frequency.value=880; g.gain.value=0.12; o.connect(g); g.connect(audioCtx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.06); o.stop(audioCtx.currentTime+0.07);
  }catch(e){}
}
function toggleMetro(){
  const btn=document.getElementById('metroToggle');
  if(metroTimer){ clearInterval(metroTimer); metroTimer=null; btn.textContent="▶ Έναρξη"; btn.classList.remove('ghost'); }
  else{ tick(); metroTimer=setInterval(tick, 60000/store.metro); btn.textContent="⏸ Παύση"; }
}
function restartMetro(){ clearInterval(metroTimer); metroTimer=setInterval(tick,60000/store.metro); }

/* ======================================================= */
/*  PAGE: GLOSSARY                                         */
/* ======================================================= */
routes.glossary=()=>`
  <div class="page-head">
    <div class="page-eyebrow">Λεξιλόγιο</div>
    <div class="page-title">📖 Γλωσσάρι</div>
    <div class="page-lead">Οι όροι του μπιλιάρδου, ελληνικά & αγγλικά. Μίλα τη γλώσσα του παιχνιδιού.</div>
  </div>
  <input class="glo-search" id="gloSearch" placeholder="🔍 Αναζήτηση όρου..." value="${store.glo||''}">
  <div class="card"><div id="gloList"></div></div>`;
afterRender.glossary=()=>{
  const inp=document.getElementById('gloSearch');
  const render=()=>{
    const q=(inp.value||'').toLowerCase();
    store.glo=inp.value; save();
    const items=D.glossary.filter(g=> !q || g.t.toLowerCase().includes(q) || g.en.toLowerCase().includes(q) || g.d.toLowerCase().includes(q));
    document.getElementById('gloList').innerHTML = items.map(g=>`
      <div class="glo-item"><h4>${g.t}<span>${g.en}</span></h4><p>${g.d}</p></div>`).join('') || '<p class="small">Κανένας όρος δεν ταιριάζει.</p>';
  };
  inp.oninput=render; render();
};

/* ======================================================= */
/*  PAGE: PROGRESS                                         */
/* ======================================================= */
routes.progress=()=>{
  const lv=level();
  const drillsDone=Object.keys(store.drills).length;
  const totalDrills=D.drills.length;
  // per-section progress
  const secProg=Object.entries(D.lessons).map(([sec,arr])=>{
    const done=arr.filter(l=>store.done.includes(l.id)).length;
    return {sec, name:(lessonSections[sec]?.t||sec), done, total:arr.length};
  });
  const badges=[
    {c:doneCount()>=1, t:"🎓 Πρώτο μάθημα"},
    {c:store.done.some(id=>id.startsWith('f-'))&&D.lessons.funda.every(l=>store.done.includes(l.id)), t:"🧍 Θεμέλια πλήρη"},
    {c:drillsDone>=1, t:"🏋️ Πρώτη άσκηση"},
    {c:drillsDone>=5, t:"🔥 5 ασκήσεις"},
    {c:pct()>=50, t:"📚 Μισή ύλη"},
    {c:pct()>=100, t:"🏆 Όλη η θεωρία"},
    {c:Object.values(store.drills).some(d=>d.hist.length>=5), t:"💪 Επιμονή (5 προσπάθειες)"},
    {c:lv.i>=4, t:"⭐ Δυνατός παίκτης"},
  ];
  return `
  <div class="page-head">
    <div class="page-eyebrow">Στατιστικά</div>
    <div class="page-title">📊 Η Πρόοδός μου</div>
    <div class="page-lead">Παρακολούθησε την εξέλιξή σου προς τον επαγγελματισμό.</div>
  </div>
  <div class="stat-row">
    <div class="stat"><div class="n">${lv.n.split(' ')[0]}</div><div class="l">Επίπεδο (${lv.i}/5)</div></div>
    <div class="stat gold"><div class="n">${pct()}%</div><div class="l">Θεωρία</div></div>
    <div class="stat ok"><div class="n">${doneCount()}/${totalLessons}</div><div class="l">Μαθήματα</div></div>
    <div class="stat"><div class="n">${drillsDone}/${totalDrills}</div><div class="l">Ασκήσεις</div></div>
  </div>

  <div class="card">
    <h3>Πρόοδος ανά ενότητα</h3>
    ${secProg.map(s=>`
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px">
          <b>${s.name}</b><span class="small">${s.done}/${s.total}</span></div>
        <div class="progress-mini"><div class="progress-mini-bar" style="width:${s.total?s.done/s.total*100:0}%"></div></div>
      </div>`).join('')}
  </div>

  <div class="card">
    <h3>🏅 Επιτεύγματα</h3>
    <div>${badges.map(b=>`<span class="pill ${b.c?'gold':''}" style="${b.c?'':'opacity:.4'}">${b.c?'':'🔒 '}${b.t}</span>`).join('')}</div>
  </div>

  <div class="card">
    <h3>🎯 Ρεκόρ ασκήσεων</h3>
    ${Object.keys(store.drills).length? `<table class="rules"><tr><th>Άσκηση</th><th>Ρεκόρ</th><th>Προσπάθειες</th></tr>
      ${Object.entries(store.drills).map(([id,r])=>{const d=D.drills.find(x=>x.id===id);return d?`<tr><td>${d.t}</td><td style="color:var(--gold)">🏆 ${r.best}</td><td>${r.hist.length}</td></tr>`:'';}).join('')}
    </table>`:'<p class="small">Δεν έχεις καταγράψει ακόμα σκορ. Πήγαινε στις Ασκήσεις!</p>'}
  </div>

  <div class="card">
    <h3>Πηγές δεδομένων</h3>
    <p class="small">Το περιεχόμενο βασίστηκε σε καθιερωμένη θεωρία & σε επιβεβαιωμένες πηγές:</p>
    <div class="src-list">${D.sources.map(s=>`• <a href="${s.u}" target="_blank" rel="noopener">${s.t}</a>`).join('<br>')}</div>
    <div style="margin-top:14px">
      <button class="btn ghost sm" onclick="__reset()">🗑️ Μηδενισμός προόδου</button>
    </div>
  </div>`;
};
window.__reset=()=>{
  if(confirm("Σίγουρα; Θα διαγραφεί όλη η πρόοδος & τα ρεκόρ σου.")){
    store={done:[],drills:{},metro:60,glo:""}; save(); updateSideProgress(); go('progress'); toast("Η πρόοδος μηδενίστηκε");
  }
};

/* ======================================================= */
/*  Mini table SVG renderer (για puzzles)                 */
/* ======================================================= */
function miniTable(balls, cue, pockets){
  const TT={x0:44,y0:44,x1:756,y1:396};
  let s=`<svg viewBox="0 0 800 440" style="width:100%;height:auto;border-radius:8px">
   <rect x="8" y="8" width="784" height="424" rx="18" fill="#6b4a2b"/>
   <rect x="${TT.x0-14}" y="${TT.y0-14}" width="${TT.x1-TT.x0+28}" height="${TT.y1-TT.y0+28}" rx="6" fill="#0c3a66"/>
   <rect x="${TT.x0}" y="${TT.y0}" width="${TT.x1-TT.x0}" height="${TT.y1-TT.y0}" fill="#12508a"/>`;
  const pk={tl:{x:TT.x0,y:TT.y0},tr:{x:TT.x1,y:TT.y0},bl:{x:TT.x0,y:TT.y1},br:{x:TT.x1,y:TT.y1},tc:{x:(TT.x0+TT.x1)/2,y:TT.y0},bc:{x:(TT.x0+TT.x1)/2,y:TT.y1}};
  Object.values(pk).forEach(p=>s+=`<circle cx="${p.x}" cy="${p.y}" r="15" fill="#05070a"/>`);
  // highlight target pockets
  (pockets||[]).forEach(k=>{const p=pk[k]; if(p) s+=`<circle cx="${p.x}" cy="${p.y}" r="19" fill="none" stroke="#e63946" stroke-width="2" stroke-dasharray="4 3"/>`;});
  const R=13;
  (balls||[]).forEach(b=>{
    s+=`<circle cx="${b.x}" cy="${b.y}" r="${R}" fill="${b.c}" stroke="rgba(0,0,0,.4)" stroke-width="1"/>`;
    if(b.n && b.n>=1){ s+=`<circle cx="${b.x}" cy="${b.y}" r="${R*0.55}" fill="#fff"/><text x="${b.x}" y="${b.y+3.5}" font-size="11" font-weight="bold" fill="#111" text-anchor="middle">${b.n}</text>`; }
    s+=`<circle cx="${b.x-4}" cy="${b.y-4}" r="3.5" fill="rgba(255,255,255,.5)"/>`;
  });
  if(cue){ s+=`<circle cx="${cue.x}" cy="${cue.y}" r="${R}" fill="#fff" stroke="rgba(0,0,0,.4)"/><circle cx="${cue.x-4}" cy="${cue.y-4}" r="3.5" fill="rgba(255,255,255,.6)"/>`; }
  s+=`</svg>`;
  return s;
}

/* ======================================================= */
/*  PAGE: PLAY (Διαδραστικό μπιλιάρδο vs AI)              */
/* ======================================================= */
let playOpts={mode:"9ball",diff:"med",view:"2d"};
const GAMEINFO={
 "9ball":{n:"9-Ball", r:["Χτύπα <b>πάντα πρώτα τη μικρότερη</b> μπάλα (κόκκινος κύκλος).","Όποια μπάλα μπει νόμιμα → <b>συνεχίζεις</b>. Νίκη όποιος βάλει νόμιμα τη <b>9</b>.","<b>Φάουλ</b> (scratch/λάθος πρώτη/καμία μπάντα-ποτάρι) → αντίπαλος παίρνει <b>ball-in-hand</b>."]},
 "8ball":{n:"8-Ball", r:["Το τραπέζι είναι <b>ανοιχτό</b> μέχρι το πρώτο νόμιμο ποτάρι — τότε κατοχυρώνεις <b>ρίγες</b> ή <b>μονόχρωμες</b>.","Βάλε όλη την ομάδα σου (κόκκινος κύκλος) και <b>τέλος τη μαύρη 8</b>.","Πρόωρη 8 ή scratch στην 8 = <b>ήττα</b>. Φάουλ = ball-in-hand."]},
 "snooker":{n:"Snooker", r:["Σειρά: <b>κόκκινη (1) → χρώμα → κόκκινη…</b> Τα χρώματα επιστρέφουν στο σημείο τους όσο υπάρχουν κόκκινες.","Όταν τελειώσουν οι κόκκινες → χρώματα με σειρά αξίας (κίτρινο 2 → μαύρο 7), μένουν μέσα.","<b>Φάουλ</b> = πόντοι στον αντίπαλο. Νικά ο παίκτης με τους περισσότερους πόντους."]},
 "carom":{n:"Καραμπόλα (3 μπάντες)", r:["<b>Χωρίς τσέπες.</b> Η λευκή σου πρέπει να χτυπήσει ΚΑΙ τις 2 άλλες μπάλες.","Απαιτείται <b>≥3 μπάντες</b> πριν αγγίξεις τη 2η μπάλα — χρησιμοποίησε <b>πλάγιο φάλτσο</b> για να κρατάς τις γωνίες.","Κάθε καραμπόλα = 1 πόντος & συνεχίζεις. Πρώτος στους <b>15</b> νικά."]},
 "free":{n:"Ελεύθερη εξάσκηση", r:["Χωρίς κανόνες — χτύπα ελεύθερα και δούλεψε στόχευση & θέση.","Η λευκή επανατοποθετείται αν μπει σε τσέπη.","Ιδανικό για ζέσταμα και πειραματισμό με γωνίες."]}
};
routes.play=()=>{
  const gi=GAMEINFO[playOpts.mode];
  return `
  <div class="page-head">
    <div class="page-eyebrow">Παίξε & προπονήσου</div>
    <div class="page-title">🕹️ Διαδραστικό Μπιλιάρδο vs AI</div>
    <div class="page-lead">Διάλεξε παιχνίδι και παίξε με πλήρεις κανόνες κόντρα σε AI. <b>Σύρε</b> πίσω από τη λευκή (σφεντόνα) για στόχευση & δύναμη — άφησε για χτύπημα. Δοκίμασε και την <b>3D προβολή</b>.</div>
  </div>
  <div class="card" style="padding:14px">
    <div style="margin-bottom:10px">
      <div class="small" style="margin-bottom:4px">Παιχνίδι</div>
      <div class="seg" style="margin:0">
        ${["9ball","8ball","snooker","carom","free"].map(m=>`<button data-mode="${m}" class="${playOpts.mode===m?'on':''}">${GAMEINFO[m].n}</button>`).join('')}
      </div>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">
      <div>
        <div class="small" style="margin-bottom:4px">Δυσκολία AI</div>
        <div class="seg" style="margin:0">
          ${["easy","med","hard"].map(d=>`<button data-diff="${d}" class="${playOpts.diff===d?'on':''}">${d==='easy'?'Εύκολο':d==='med'?'Μέτριο':'Δύσκολο'}</button>`).join('')}
        </div>
      </div>
      <div>
        <div class="small" style="margin-bottom:4px">Προβολή</div>
        <div class="seg" style="margin:0">
          <button data-view="2d" class="${playOpts.view==='2d'?'on':''}">📄 2D</button>
          <button data-view="3d" class="${playOpts.view==='3d'?'on':''}">🧊 3D</button>
        </div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <span id="scoreBox" class="pill gold" style="align-self:center;display:none"></span>
        <span id="turnBadge" class="pill" style="align-self:center">—</span>
        <button class="btn" id="newGameBtn">🔄 Νέο</button>
      </div>
    </div>
    <div class="table-box" style="padding:8px">
      <canvas id="gameCanvas" style="width:100%;height:auto;display:block;border-radius:8px;touch-action:none;background:#0a0c12"></canvas>
    </div>
    <div id="gameStatus" style="margin-top:10px;padding:10px 14px;background:var(--panel2);border-radius:10px;font-weight:600;font-size:14px;min-height:20px">Φόρτωση...</div>
    <div style="display:flex;gap:18px;align-items:center;margin-top:12px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="text-align:center">
          <div class="cueball-ui" id="spinFace" style="width:66px;height:66px;touch-action:none">
            <div class="cross h"></div><div class="cross v"></div>
            <div class="hit" id="spinDot" style="left:50%;top:50%"></div>
          </div>
          <div class="small" style="margin-top:3px">Φάλτσο</div>
        </div>
        <span class="small" style="max-width:150px">πάνω/κάτω = <b>follow/draw</b><br>αριστ/δεξ = <b>πλάγιο</b> (μπάντες)</span>
      </div>
      <div style="flex:1;min-width:150px">
        <div class="small" style="margin-bottom:2px">Δύναμη</div>
        <input type="range" min="10" max="100" value="60" id="powerSlider" style="width:100%">
      </div>
      <button class="btn" id="shootBtn">🎯 Χτύπημα</button>
    </div>
    <div class="legend" style="margin-top:10px">
      <span><i style="background:#fff"></i> Πορεία λευκής</span>
      <span><i style="background:#f2b34b"></i> Πορεία μπάλας-στόχου</span>
      <span><i style="background:#3ec98a"></i> Εφαπτομένη (stun)</span>
      <span><i style="background:#e63946"></i> Επόμενη νόμιμη μπάλα</span>
    </div>
  </div>
  <div class="card">
    <h3>Κανόνες — ${gi.n}</h3>
    <ul>${gi.r.map(x=>`<li>${x}</li>`).join('')}</ul>
    ${playOpts.mode==='carom'?'<div class="note gold"><b>Tip:</b> Στις 3 μπάντες το <b>πλάγιο φάλτσο</b> (χειριστήριο «Φάλτσο») είναι απαραίτητο — «τρέχει» τη λευκή στις μπάντες και κρατά τις γωνίες. Το AI παίζει βασικά.</div>':'<div class="note"><b>Φάλτσο:</b> κλικ στη μπάλα-χειριστήριο — <b>πάνω</b>=follow (η λευκή προχωρά), <b>κάτω</b>=draw (γυρίζει πίσω), <b>πλάγια</b>=αλλάζει τις γωνίες μπάντας.</div>'}
  </div>`;
};
afterRender.play=()=>{
  const canvas=document.getElementById('gameCanvas');
  const spinFace=document.getElementById('spinFace'), spinDot=document.getElementById('spinDot');
  const ui={
    status:document.getElementById('gameStatus'),
    turnBadge:document.getElementById('turnBadge'),
    score:document.getElementById('scoreBox'),
    onSpinReset:()=>{ spinDot.style.left='50%'; spinDot.style.top='50%'; }
  };
  // spin control (cue-ball face)
  function setSpinFromEvent(e){
    const r=spinFace.getBoundingClientRect();
    let x=((e.clientX)-r.left)/r.width*2-1, y=((e.clientY)-r.top)/r.height*2-1;
    const m=Math.hypot(x,y); if(m>1){ x/=m; y/=m; }
    spinDot.style.left=(50+x*42)+'%'; spinDot.style.top=(50+y*42)+'%';
    if(window.__poolInst) window.__poolInst.setSpin(x,y);
  }
  spinFace.addEventListener('pointerdown',e=>{ spinFace.setPointerCapture(e.pointerId); setSpinFromEvent(e); });
  spinFace.addEventListener('pointermove',e=>{ if(e.buttons) setSpinFromEvent(e); });
  function start(){
    window.startPoolGame(canvas, ui, {mode:playOpts.mode, diff:playOpts.diff, view:playOpts.view, felt:store.felt,
      onEnd:(winner)=>{ if(winner===0){ store.aiWins=(store.aiWins||0)+1; save(); updateSideProgress(); toast("🏆 Νίκη κατά του AI καταγράφηκε!"); } }
    });
  }
  main.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{playOpts.mode=b.dataset.mode; go('play');});
  main.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{playOpts.diff=b.dataset.diff; go('play');});
  main.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{
    playOpts.view=b.dataset.view;
    main.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('on',x===b));
    if(window.__poolInst) window.__poolInst.setView(playOpts.view);   // αλλαγή χωρίς reset παιχνιδιού
  });
  document.getElementById('newGameBtn').onclick=start;
  document.getElementById('shootBtn').onclick=()=>{ if(window.__poolInst&&window.__poolInst.canShoot()) window.__poolInst.shootSlider(+document.getElementById('powerSlider').value); };
  start();
};

/* ======================================================= */
/*  PAGE: PUZZLES (Ασκήσεις τακτικής)                     */
/* ======================================================= */
routes.puzzles=()=>`
  <div class="page-head">
    <div class="page-eyebrow">Σκέψη πάνω από το τραπέζι</div>
    <div class="page-title">🧩 Ασκήσεις Τακτικής</div>
    <div class="page-lead">Πραγματικές καταστάσεις τραπεζιού. Διάλεξε τη σωστή απόφαση — επίθεση ή άμυνα, ποια μπάλα, ποιος δρόμος θέσης. Εδώ χτίζεται το μυαλό του επαγγελματία. Λυμένα: <b id="pzCount">${store.puzzles.length}</b>/${D.puzzles.length}.</div>
  </div>
  <div id="puzzleList"></div>`;
afterRender.puzzles=()=>{
  const list=document.getElementById('puzzleList');
  list.innerHTML=D.puzzles.map((pz,idx)=>{
    const solved=store.puzzles.includes(pz.id);
    return `<div class="card" id="pz-card-${pz.id}">
      <h3>${pz.t}<span class="tag">${pz.game}</span></h3>
      <div class="grid g2" style="align-items:start">
        <div class="table-box" style="padding:8px">${miniTable(pz.balls,pz.cue,pz.pockets)}</div>
        <div>
          <p><b>${pz.q}</b></p>
          <div class="pz-opts" data-pz="${pz.id}">
            ${pz.opts.map((o,i)=>`<button class="lesson" style="width:100%;text-align:left" data-i="${i}">
              <div class="chk">✓</div><div class="l-body"><h4 style="white-space:normal">${o.t}</h4></div></button>`).join('')}
          </div>
          <div class="pz-feedback" id="pz-fb-${pz.id}" style="display:${solved?'block':'none'}"></div>
        </div>
      </div>
    </div>`;
  }).join('');
  D.puzzles.forEach(pz=>{
    const cont=list.querySelector(`[data-pz="${pz.id}"]`);
    const fb=document.getElementById('pz-fb-'+pz.id);
    if(store.puzzles.includes(pz.id)) showSolved(pz,fb,cont);
    cont.querySelectorAll('button').forEach(btn=>{
      btn.onclick=()=>{
        const i=+btn.dataset.i; const o=pz.opts[i];
        cont.querySelectorAll('button').forEach(b=>b.classList.remove('done'));
        if(o.ok){
          btn.classList.add('done');
          if(!store.puzzles.includes(pz.id)){ store.puzzles.push(pz.id); save(); updateSideProgress();
            document.getElementById('pzCount').textContent=store.puzzles.length; toast("✓ Σωστά! Puzzle λυμένο"); }
          fb.style.display='block';
          fb.innerHTML=`<div class="note ok"><b>Σωστό!</b> ${o.why}</div><div class="note gold">💡 ${pz.tip}</div>`;
        } else {
          fb.style.display='block';
          fb.innerHTML=`<div class="note"><b>Όχι ακριβώς.</b> ${o.why}</div>`;
        }
      };
    });
  });
  function showSolved(pz,fb,cont){
    const ok=pz.opts.findIndex(o=>o.ok);
    const btn=cont.querySelector(`[data-i="${ok}"]`); if(btn) btn.classList.add('done');
    fb.innerHTML=`<div class="note ok"><b>Λυμένο ✓</b> ${pz.opts[ok].why}</div><div class="note gold">💡 ${pz.tip}</div>`;
  }
};

/* ======================================================= */
/*  PAGE: PATH (Roadmap με auto-tracking)                 */
/* ======================================================= */
routes.path=()=>{
  const stages=D.path.map(st=>{
    const lDone=(st.reqLessons||[]).filter(x=>store.done.includes(x)).length;
    const dDone=(st.reqDrills||[]).filter(x=>store.drills[x]).length;
    const pDone=(st.reqPuzzles||[]).filter(x=>store.puzzles.includes(x)).length;
    const lTot=(st.reqLessons||[]).length, dTot=(st.reqDrills||[]).length, pTot=(st.reqPuzzles||[]).length;
    const winOk = st.reqWinAI? (store.aiWins>0) : true;
    const pctOk = pct()>=(st.reqPct||0);
    const total=lTot+dTot+pTot+(st.reqWinAI?1:0);
    const doneN=lDone+dDone+pDone+(st.reqWinAI?(store.aiWins>0?1:0):0);
    const complete = lDone===lTot&&dDone===dTot&&pDone===pTot&&winOk&&pctOk;
    return {st,lDone,dDone,pDone,lTot,dTot,pTot,winOk,pctOk,total,doneN,complete};
  });
  let curIdx=stages.findIndex(s=>!s.complete); if(curIdx<0) curIdx=stages.length;
  return `
  <div class="page-head">
    <div class="page-eyebrow">Το μονοπάτι σου</div>
    <div class="page-title">🗺️ Roadmap προς τον Επαγγελματισμό</div>
    <div class="page-lead">6 στάδια, από τα θεμέλια μέχρι το αγωνιστικό επίπεδο. Κάθε στάδιο <b>ξεκλειδώνει αυτόματα</b> καθώς ολοκληρώνεις μαθήματα, ασκήσεις, puzzles και νίκες κατά του AI. ${curIdx>=stages.length?'<b style="color:var(--ok)">Ολοκλήρωσες όλα τα στάδια! 🏆</b>':'Τρέχον στάδιο: <b style="color:var(--red)">'+(curIdx+1)+'/6</b>.'}</div>
  </div>
  ${stages.map((s,i)=>{
    const st=s.st;
    const status = s.complete?'done':(i===curIdx?'cur':'lock');
    return `<div class="card" style="${status==='lock'?'opacity:.62':''}">
      <h3>${s.complete?'✅':(i===curIdx?'🎯':'🔒')} ${st.t}
        <span class="tag" style="${s.complete?'background:rgba(62,201,138,.16);color:var(--ok)':''}">${s.doneN}/${s.total}</span></h3>
      <p>${st.d}</p>
      <div class="progress-mini" style="margin-bottom:12px"><div class="progress-mini-bar" style="width:${s.total?s.doneN/s.total*100:100}%"></div></div>
      <div class="grid g3">
        ${req("📘 Μαθήματα", st.reqLessons, store.done, id=>lessonTitle(id), 'funda-jump')}
        ${req("🏋️ Ασκήσεις", st.reqDrills, Object.keys(store.drills), id=>drillTitle(id), 'drills')}
        ${st.reqPuzzles?req("🧩 Puzzles", st.reqPuzzles, store.puzzles, id=>puzzleTitle(id), 'puzzles'):''}
      </div>
      ${st.reqWinAI?`<div class="note ${store.aiWins>0?'ok':''}" style="margin-top:10px">${store.aiWins>0?'✅':'⬜'} Νίκη κατά του AI (${store.aiWins||0}) — <a onclick="__go('play')">Παίξε τώρα</a></div>`:''}
      ${st.reqPct?`<div class="small" style="margin-top:8px">${s.pctOk?'✅':'⬜'} Θεωρία ≥ ${st.reqPct}% (τώρα ${pct()}%)</div>`:''}
    </div>`;
  }).join('')}
  <div class="card" style="text-align:center">
    <button class="btn" onclick="__go('funda')">📘 Μαθήματα</button>
    <button class="btn ghost" onclick="__go('drills')">🏋️ Ασκήσεις</button>
    <button class="btn ghost" onclick="__go('puzzles')">🧩 Puzzles</button>
    <button class="btn ghost" onclick="__go('play')">🕹️ Παίξε</button>
  </div>`;
};
function req(title, ids, haveArr, nameFn, jump){
  if(!ids||!ids.length) return "";
  return `<div style="background:var(--panel2);border-radius:10px;padding:10px 12px">
    <div class="small" style="font-weight:700;margin-bottom:6px">${title}</div>
    ${ids.map(id=>{const has=haveArr.includes(id);
      return `<div style="font-size:12.5px;color:${has?'var(--ok)':'var(--txt-mut)'};margin-bottom:3px">${has?'✅':'⬜'} ${nameFn(id)}</div>`;}).join('')}
  </div>`;
}
function lessonTitle(id){ const l=allLessons().find(x=>x.id===id); return l?l.t:id; }
function drillTitle(id){ const d=D.drills.find(x=>x.id===id); return d?d.t:id; }
function puzzleTitle(id){ const p=D.puzzles.find(x=>x.id===id); return p?p.t:id; }

/* ======================================================= */
/*  PAGE: THEME (Εμφάνιση & Χρώματα)                      */
/* ======================================================= */
routes.theme=()=>`
  <div class="page-head">
    <div class="page-eyebrow">Προσαρμογή</div>
    <div class="page-title">🎨 Εμφάνιση & Χρώματα</div>
    <div class="page-lead">Διάλεξε το χρώμα-τόνο όλης της εφαρμογής και το χρώμα της τσόχας στο διαδραστικό μπιλιάρδο. Οι επιλογές αποθηκεύονται αυτόματα.</div>
  </div>
  <div class="card">
    <h3>Χρώμα εργαλείου (accent)</h3>
    <p>Αλλάζει κουμπιά, τόνους & εικονίδια σε όλη την εφαρμογή.</p>
    <div class="swatches">${ACCENTS.map(x=>`<button class="swatch ${store.accent===x.c?'on':''}" data-acc="${x.c}" style="background:${x.c}" title="${x.n}"></button>`).join('')}</div>
  </div>
  <div class="card">
    <h3>Χρώμα τσόχας 🎱</h3>
    <p>Το πανί του τραπεζιού στο «Παίξε vs AI» (2D & 3D).</p>
    <div class="swatches">${FELTS.map(x=>`<button class="swatch ${store.felt===x.c?'on':''}" data-felt="${x.c}" style="background:${x.c}" title="${x.n}"></button>`).join('')}</div>
    <div class="note" style="margin-top:14px">Δες το ζωντανά στο <a onclick="__go('play')">Παίξε vs AI</a>.</div>
  </div>`;
afterRender.theme=()=>{
  main.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{
    store.accent=b.dataset.acc; save(); applyTheme(); go('theme'); toast("🎨 Χρώμα εφαρμογής άλλαξε");
  });
  main.querySelectorAll('[data-felt]').forEach(b=>b.onclick=()=>{
    store.felt=b.dataset.felt; save();
    if(window.__poolInst) window.__poolInst.setFelt(store.felt);
    go('theme'); toast("🟦 Χρώμα τσόχας άλλαξε");
  });
};

/* ---------- Toast ---------- */
let toastEl=null,toastT=null;
function toast(msg){
  if(!toastEl){ toastEl=document.createElement('div'); toastEl.className='toast'; document.body.appendChild(toastEl); }
  toastEl.textContent=msg; toastEl.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>toastEl.classList.remove('show'),1900);
}

/* ---------- Sidebar mobile ---------- */
function openSidebar(){ sidebar.classList.add('open'); overlay.classList.add('show'); }
function closeSidebar(){ sidebar.classList.remove('open'); overlay.classList.remove('show'); }
document.getElementById('menuBtn').onclick=openSidebar;
overlay.onclick=closeSidebar;

/* ---------- Global helpers ---------- */
window.__go=go;

/* ---------- Init ---------- */
applyTheme();
buildNav();
updateSideProgress();
const initial=(location.hash||'').replace('#','');
go(routes[initial]?initial:'home');
})();
