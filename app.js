// ===================== AUTH =====================
const PASS_GENERAL = "12345";
const PASS_ADMIN   = "admin123";
// Niveles: null = no autenticado, "general" = participante, "admin" = admin
let AUTH_LEVEL = null;

function setupLogin(){
  // ¿Ya hay sesión guardada?
  const saved = sessionStorage.getItem("polla_auth");
  if(saved === "admin" || saved === "general"){
    AUTH_LEVEL = saved;
    document.getElementById("loginOverlay").classList.add("hidden");
    // applyAuthUI se llama desde initApp después de que el nav esté montado
    return;
  }

  // Sin sesión: mostrar overlay y esperar input
  const overlay = document.getElementById("loginOverlay");
  const input   = document.getElementById("loginInput");
  const btn     = document.getElementById("loginBtn");
  const err     = document.getElementById("loginError");

  function tryLogin(){
    const val = input.value.trim();
    if(val === PASS_ADMIN){
      AUTH_LEVEL = "admin";
      sessionStorage.setItem("polla_auth","admin");
      overlay.classList.add("hidden");
      initApp(); // lanzar la app recién ahora
    } else if(val === PASS_GENERAL){
      AUTH_LEVEL = "general";
      sessionStorage.setItem("polla_auth","general");
      overlay.classList.add("hidden");
      initApp();
    } else {
      err.textContent = "Contraseña incorrecta. Pedísela al organizador.";
      input.value = "";
      input.focus();
    }
  }

  btn.addEventListener("click", tryLogin);
  input.addEventListener("keydown", e => { if(e.key === "Enter") tryLogin(); });
  input.focus();
}

// Aplica visibilidad de pestañas según nivel; se llama DESPUÉS de setupNav()
function applyAuthUI(){
  const adminBtn = document.querySelector('#mainNav button[data-view="admin"]');
  if(adminBtn) adminBtn.style.display = AUTH_LEVEL === "admin" ? "" : "none";
}

// ===================== FIREBASE / FIRESTORE SETUP =====================
// Reemplazá estos valores por los de tu proyecto Firebase (Configuración del proyecto > Tus apps > SDK config)
const firebaseConfig = {
  apiKey: "AIzaSyD0GX4xe9lCRkHQ5v9ThHZARwuVZSL1vRg",
  authDomain: "pollamundialfamilia.firebaseapp.com",
  projectId: "pollamundialfamilia",
  storageBucket: "pollamundialfamilia.firebasestorage.app",
  messagingSenderId: "26467752612",
  appId: "1:26467752612:web:5da1c8af0b884f0dee6431"
};

let _fbApp, _fbDb;
let _fbReady = (async () => {
  const appMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const fsMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  _fbApp = appMod.initializeApp(firebaseConfig);
  _fbDb = fsMod.getFirestore(_fbApp);
  window._fsMod = fsMod; // expose Firestore functions for helpers below
})();

const POLLA_COLLECTION = "polla";

function sanitizeKey(key){
  // Firestore doc IDs can't contain "/" - everything else is fine
  return key.replace(/\//g, "_");
}

// ===================== STORAGE HELPERS (Firestore-backed) =====================
// Nota: en esta versión todo es "shared" (compartido) ya que usamos Firestore como backend único.
async function storageGet(key, shared){
  try{
    await _fbReady;
    const fs = window._fsMod;
    const ref = fs.doc(_fbDb, POLLA_COLLECTION, sanitizeKey(key));
    const snap = await fs.getDoc(ref);
    if(!snap.exists()) return null;
    const data = snap.data();
    return data && data.value !== undefined ? JSON.parse(data.value) : null;
  }catch(e){
  console.error("storageSet error", e);
  alert(JSON.stringify(e, null, 2));
  return false;
}
}
async function storageSet(key, value, shared){
  try{
    await _fbReady;
    const fs = window._fsMod;
    const ref = fs.doc(_fbDb, POLLA_COLLECTION, sanitizeKey(key));
    await fs.setDoc(ref, {value: JSON.stringify(value)});
    return true;
  }catch(e){
    console.error("storageSet error", e);
    return false;
  }
}
async function storageList(prefix, shared){
  try{
    await _fbReady;
    const fs = window._fsMod;
    const colRef = fs.collection(_fbDb, POLLA_COLLECTION);
    const snap = await fs.getDocs(colRef);
    const keys = [];
    snap.forEach(docSnap=>{
      if(docSnap.id.startsWith(prefix)) keys.push(docSnap.id);
    });
    return keys;
  }catch(e){
    console.error("storageList error", e);
    return [];
  }
}
async function storageDelete(key, shared){
  try{
    await _fbReady;
    const fs = window._fsMod;
    const ref = fs.doc(_fbDb, POLLA_COLLECTION, sanitizeKey(key));
    await fs.deleteDoc(ref);
    return true;
  }catch(e){
    return false;
  }
}

// ===================== GLOBAL STATE =====================
let STATE = {
  matches: JSON.parse(JSON.stringify(MATCHES)), // working copy with results
  points: JSON.parse(JSON.stringify(DEFAULT_POINTS)),
  knockout: null, // {r32:[{id,home,away,result}], r16:[...], ...}
  participants: [], // list of names
  currentParticipant: null,
  predictions: null // current participant's prediction object
};

// ===================== TOAST =====================
let toastTimeout;
function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(()=> t.classList.remove("show"), 2200);
}

// ===================== NAVIGATION =====================
function setupNav(){
  document.getElementById("mainNav").addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-view]");
    if(!btn) return;
    document.querySelectorAll("#mainNav button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    document.getElementById("view-"+btn.dataset.view).classList.add("active");
    if(btn.dataset.view === "tabla") renderLeaderboard();
    if(btn.dataset.view === "eliminatorias") renderKnockout();
    if(btn.dataset.view === "predicciones"){
      renderPredictions();
      // Re-aplicar visibilidad según la pestaña activa (grupos/eliminatorias)
      const groupsEl = document.getElementById("predictionsContent");
      const koEl = document.getElementById("predKnockoutContent");
      if(predSection === "eliminatorias"){
        groupsEl.style.display = "none";
        koEl.style.display = "";
      } else {
        groupsEl.style.display = "";
        koEl.style.display = "none";
      }
    }
    if(btn.dataset.view === "admin") renderAdmin();
    if(btn.dataset.view === "grupos") renderGroups();
  });
}

// ===================== DESEMPATE: ENFRENTAMIENTO DIRECTO =====================
// Compara dos equipos por el resultado del partido que jugaron entre sí.
// matchList: lista de partidos del grupo (home/away con nombres de equipo)
// getScores(m): dado un partido, devuelve {hs, as} (marcador home/away) o null si no hay info
// Retorna: 1 si teamX debe ir antes que teamY, -1 si teamY debe ir antes, 0 si no decide (empate o sin datos)
function compareHeadToHead(teamX, teamY, matchList, getScores){
  const match = matchList.find(m =>
    (m.home === teamX && m.away === teamY) || (m.home === teamY && m.away === teamX)
  );
  if(!match) return 0;
  const scores = getScores(match);
  if(!scores) return 0;
  let xGoals, yGoals;
  if(match.home === teamX){ xGoals = scores.hs; yGoals = scores.as; }
  else{ xGoals = scores.as; yGoals = scores.hs; }
  if(xGoals > yGoals) return 1;
  if(xGoals < yGoals) return -1;
  return 0; // empate directo: no decide, se sigue con diferencia de gol
}

// ===================== GROUP STANDINGS CALC =====================
// Computes standings table for a group based on confirmed results
function computeGroupStandings(groupLetter){
  const teams = GROUPS[groupLetter];
  const table = {};
  teams.forEach(t => table[t] = {team:t, pj:0, g:0, e:0, p:0, gf:0, gc:0, dg:0, pts:0});

  const matches = STATE.matches.filter(m => m.group === groupLetter && m.result);
  matches.forEach(m => {
    const h = table[m.home], a = table[m.away];
    const hs = m.result.home, as = m.result.away;
    h.pj++; a.pj++;
    h.gf += hs; h.gc += as;
    a.gf += as; a.gc += hs;
    if(hs > as){ h.g++; h.pts += 3; a.p++; }
    else if(hs < as){ a.g++; a.pts += 3; h.p++; }
    else{ h.e++; a.e++; h.pts += 1; a.pts += 1; }
  });
  Object.values(table).forEach(r => r.dg = r.gf - r.gc);

  const arr = Object.values(table);
  const getScores = m => m.result ? {hs: m.result.home, as: m.result.away} : null;
  arr.sort((x,y)=>{
    if(y.pts !== x.pts) return y.pts - x.pts;
    const h2h = compareHeadToHead(x.team, y.team, matches, getScores);
    if(h2h !== 0) return -h2h;
    if(y.dg !== x.dg) return y.dg - x.dg;
    if(y.gf !== x.gf) return y.gf - x.gf;
    return x.team.localeCompare(y.team);
  });
  return arr;
}

// Returns true if all 6 matches of a group have results
function isGroupComplete(groupLetter){
  return STATE.matches.filter(m => m.group === groupLetter && m.result).length === 6;
}

// ===================== INIT =====================
async function init(){
  setupLogin();
  if(AUTH_LEVEL) initApp(); // sesión ya activa: arrancar directo
  // si no hay sesión, initApp se llama desde tryLogin dentro de setupLogin
}

async function initApp(){
  if(window._appInitialized) return;
  window._appInitialized = true;

  setupNav();
  applyAuthUI(); // ocultar/mostrar Admin DESPUÉS de que el nav esté en el DOM

  // Load admin-saved state from shared storage
  const savedMatches = await storageGet("admin:matches", true);
  if(savedMatches) STATE.matches = savedMatches;

  const savedPoints = await storageGet("admin:points", true);
  if(savedPoints) STATE.points = Object.assign({}, DEFAULT_POINTS, savedPoints);

  const savedKnockout = await storageGet("admin:knockout", true);
  if(savedKnockout) STATE.knockout = savedKnockout;

  const participantKeys = await storageList("prediction:", true);
  STATE.participants = participantKeys.map(k => k.replace("prediction:", ""));

  renderGroups();
}

document.addEventListener("DOMContentLoaded", init);

// ===================== RENDER: FASE DE GRUPOS =====================
function renderGroups(){
  const tabsEl = document.getElementById("groupTabs");
  if(tabsEl.children.length === 0){
    Object.keys(GROUPS).forEach((letter, i)=>{
      const btn = document.createElement("button");
      btn.textContent = "Grupo " + letter;
      btn.dataset.group = letter;
      if(i===0) btn.classList.add("active");
      btn.addEventListener("click", ()=>{
        tabsEl.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        renderGroupContent(letter);
      });
      tabsEl.appendChild(btn);
    });
  }
  const activeBtn = tabsEl.querySelector("button.active");
  renderGroupContent(activeBtn ? activeBtn.dataset.group : "A");
}

function renderGroupContent(letter){
  const container = document.getElementById("groupContent");
  const standings = computeGroupStandings(letter);
  const matches = STATE.matches.filter(m => m.group === letter);

  let html = '<div class="card group-card">';
  html += '<div class="group-name"><h3>Grupo ' + letter + '</h3><span class="letter">Tabla de posiciones</span></div>';
  html += buildStandingsTable(standings);
  html += '<p style="font-size:11px;color:var(--muted);margin:10px 0 0;">Las dos primeras filas (resaltadas) clasifican directo. Recordá que 8 mejores terceros de todos los grupos también avanzan a dieciseisavos.</p>';
  html += '</div>';

  // Calendario agrupado por fecha
  const byDate = {};
  matches.forEach(m => {
    if(!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  });

  html += '<div class="card">';
  html += '<h3>Calendario y resultados</h3>';
  Object.keys(byDate).sort().forEach(date => {
    html += '<div class="day-divider"><span>'+formatDate(date)+'</span></div>';
    byDate[date].forEach(m => {
      html += renderMatchRow(m, false, null);
    });
  });
  html += '</div>';

  container.innerHTML = html;
}

function formatDate(iso){
  const d = new Date(iso + "T12:00:00");
  const dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return dias[d.getDay()] + " " + d.getDate() + " de " + meses[d.getMonth()];
}

// renderMatchRow: mode "view" (just show result), "admin" (editable score inputs),
// "predict" (editable prediction inputs with points badge)
function renderMatchRow(m, editable, opts){
  opts = opts || {};
  let scoreHtml;
  if(editable === "admin"){
    scoreHtml = '<div class="score-input">'
      + '<input type="number" min="0" max="20" data-match="'+m.id+'" data-side="home" value="'+(m.result?m.result.home:'')+'">'
      + '<span class="dash">-</span>'
      + '<input type="number" min="0" max="20" data-match="'+m.id+'" data-side="away" value="'+(m.result?m.result.away:'')+'">'
      + '</div>';
  } else if(editable === "predict"){
    const pred = opts.prediction || {};
    scoreHtml = '<div class="pred-input score-input">'
      + '<input type="number" min="0" max="20" data-match="'+m.id+'" data-side="home" value="'+(pred.home!==undefined?pred.home:'')+'">'
      + '<span class="dash">-</span>'
      + '<input type="number" min="0" max="20" data-match="'+m.id+'" data-side="away" value="'+(pred.away!==undefined?pred.away:'')+'">'
      + '</div>';
  } else {
    if(m.result){
      scoreHtml = '<div class="score-input"><strong>'+m.result.home+'</strong><span class="dash">-</span><strong>'+m.result.away+'</strong></div>';
    } else {
      scoreHtml = '<div class="score-input" style="color:var(--muted);font-size:13px;">vs</div>';
    }
  }

  let meta = m.time ? m.time+'h' : '';
  let pointsBadge = '';
  if(editable === "predict" && opts.prediction && m.result){
    const pts = scorePrediction(m, opts.prediction);
    pointsBadge = '<span class="points-badge '+(pts===0?'zero':'')+'">+'+pts+' pts</span>';
  }

  let html = '<div class="match-row">';
  html += '<div class="match-meta">'+meta+'<br>'+m.stadium.replace("Estadio ","")+'</div>';
  html += '<div class="team home">'+m.home+'</div>';
  html += scoreHtml;
  html += '<div class="team away">'+m.away+'</div>';
  html += '<div style="text-align:right;">'+pointsBadge+'</div>';
  html += '</div>';
  return html;
}

// Points for a single group-stage match prediction
function scorePrediction(match, pred){
  if(!match.result || pred.home===undefined || pred.home===null || pred.home===''
     || pred.away===undefined || pred.away===null || pred.away==='') return 0;
  const ph = parseInt(pred.home), pa = parseInt(pred.away);
  const rh = match.result.home, ra = match.result.away;
  if(isNaN(ph) || isNaN(pa)) return 0;
  if(ph === rh && pa === ra) return STATE.points.marcadorExacto;
  const predOutcome = ph > pa ? "H" : (ph < pa ? "A" : "D");
  const realOutcome = rh > ra ? "H" : (rh < ra ? "A" : "D");
  if(predOutcome === realOutcome) return STATE.points.resultadoCorrecto;
  return 0;
}

// ===================== RENDER: PREDICCIONES =====================
let predSection = "grupos";

function renderPredictions(){
  const sel = document.getElementById("participantSelector");
  let html = '<div class="field">';
  html += '<label class="field-label">Tu nombre</label>';
  html += '<select class="text-input" id="participantSelect">';
  html += '<option value="">-- Elegí tu nombre --</option>';
  STATE.participants.forEach(p=>{
    const selected = p === STATE.currentParticipant ? 'selected' : '';
    html += '<option value="'+escapeHtml(p)+'" '+selected+'>'+escapeHtml(p)+'</option>';
  });
  html += '<option value="__new__">+ Soy nuevo, crear mi nombre</option>';
  html += '</select></div>';
  html += '<div class="field" id="newNameField" style="display:none;">';
  html += '<label class="field-label">Escribí tu nombre</label>';
  html += '<input class="text-input" id="newNameInput" placeholder="Ej: Sebas">';
  html += '<button class="btn" style="margin-top:10px;" id="createParticipantBtn">Crear y continuar</button>';
  html += '</div>';
  sel.innerHTML = html;

  document.getElementById("participantSelect").addEventListener("change", async (e)=>{
    if(e.target.value === "__new__"){
      document.getElementById("newNameField").style.display = "block";
    } else {
      document.getElementById("newNameField").style.display = "none";
      STATE.currentParticipant = e.target.value || null;
      if(STATE.currentParticipant){
        STATE.predictions = await loadPredictions(STATE.currentParticipant);
      } else {
        STATE.predictions = null;
      }
      renderPredictionsForm();
      renderPredKnockoutForm();
    }
  });

  document.getElementById("createParticipantBtn").addEventListener("click", async ()=>{
    const name = document.getElementById("newNameInput").value.trim();
    if(!name){ showToast("Escribí un nombre"); return; }
    if(STATE.participants.includes(name)){ showToast("Ese nombre ya existe, elegilo de la lista"); return; }
    STATE.participants.push(name);
    STATE.currentParticipant = name;
    STATE.predictions = emptyPredictions();
    await savePredictions();
    renderPredictions();
    renderPredictionsForm();
    renderPredKnockoutForm();
    showToast("¡Listo! Ya podés guardar tus predicciones.");
  });

  // Wire section tabs (Fase de grupos / Mi llave a la final) — once
  const sectionTabs = document.getElementById("predSectionTabs");
  if(!sectionTabs.dataset.wired){
    sectionTabs.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-section]");
      if(!btn) return;
      sectionTabs.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      predSection = btn.dataset.section;
      const groupsEl = document.getElementById("predictionsContent");
      const koEl = document.getElementById("predKnockoutContent");
      if(predSection === "grupos"){
        groupsEl.style.display = "";
        koEl.style.display = "none";
      } else {
        groupsEl.style.display = "none";
        koEl.style.display = "";
        renderPredKnockoutForm();
      }
    });
    sectionTabs.dataset.wired = "1";
  }

  renderPredictionsForm();
  renderPredKnockoutForm();
}

function emptyPredictions(){
  const groupMatches = {};
  MATCHES.forEach(m => groupMatches[m.id] = {home:'', away:''});
  const groupQualifiers = {};
  Object.keys(GROUPS).forEach(letter => groupQualifiers[letter] = {first:'', second:''});
  return {
    matches: groupMatches,
    qualifiers: groupQualifiers,
    knockout: {}, // filled in once admin defines bracket
    thirdPicks: {} // elecciones manuales de terceros por slot ("3#1" -> "F", etc.)
  };
}

async function loadPredictions(name){
  const data = await storageGet("prediction:"+name, true);
  if(!data) return emptyPredictions();
  // merge with empty to handle missing keys from older saves
  const empty = emptyPredictions();
  const knockout = data.knockout || {};
  // Normalizar: asegurarse de que cada ronda sea array (no objeto con claves string)
  KNOCKOUT_ROUNDS.forEach(r=>{
    if(knockout[r.key] && !Array.isArray(knockout[r.key])){
      const arr = [];
      Object.keys(knockout[r.key]).forEach(k=>{ arr[parseInt(k)] = knockout[r.key][k]; });
      knockout[r.key] = arr;
    }
  });
  return {
    matches: Object.assign(empty.matches, data.matches || {}),
    qualifiers: Object.assign(empty.qualifiers, data.qualifiers || {}),
    knockout,
    thirdPicks: data.thirdPicks || {}
  };
}

async function savePredictions(){
  if(!STATE.currentParticipant) return false;
  return await storageSet("prediction:"+STATE.currentParticipant, STATE.predictions, true);
}

// Returns true if a match is locked (kickoff time has passed or within 5 min)
function isMatchLocked(m){
  // Matches already played (have a result) are also locked
  if(m.result) return true;
  // If no time specified, lock at midnight of the match date
  const timeStr = m.time && m.time !== "00:00" ? m.time : "00:00";
  // match date/time is in local US time — we treat it as UTC-5 (EST) since most games are in the US
  // For locking purposes we compare against the current moment
  const [h, min] = timeStr.split(":").map(Number);
  const matchDt = new Date(m.date + "T" + String(h).padStart(2,"0") + ":" + String(min).padStart(2,"0") + ":00");
  // Lock 5 minutes before kickoff
  return Date.now() >= matchDt.getTime() - 5 * 60 * 1000;
}

// Auto-fill any empty predictions with the real result for already-played matches
function autoFillPlayedMatches(){
  if(!STATE.predictions) return;
  STATE.matches.forEach(m=>{
    if(!m.result) return;
    const p = STATE.predictions.matches[m.id];
    // Only fill if both sides are empty (respect manually entered predictions)
    if(p && (p.home === '' || p.home === undefined) && (p.away === '' || p.away === undefined)){
      p.home = String(m.result.home);
      p.away = String(m.result.away);
    }
  });
}

let predFormGroupLetter = "A";

function renderPredictionsForm(){
  const container = document.getElementById("predictionsContent");
  if(!STATE.currentParticipant || !STATE.predictions){
    container.innerHTML = '<div class="empty-state"><h3>Elegí o creá tu nombre arriba</h3><p>Después vas a poder completar tus predicciones para los 72 partidos de fase de grupos. La tabla de cada grupo se actualiza automáticamente según los marcadores que ingresés.</p></div>';
    return;
  }

  // Auto-fill played matches before rendering
  autoFillPlayedMatches();

  // Build the tab bar
  let html = '<div class="card" style="margin-bottom:6px;">';
  html += '<h3 style="margin:0 0 4px;">Marcadores de fase de grupos</h3>';
  html += '<p style="font-size:13px;color:var(--muted);margin:0;">Marcador exacto: '+STATE.points.marcadorExacto+' pts &middot; Acertar resultado: '+STATE.points.resultadoCorrecto+' pts &middot; Bono jornada perfecta: +'+STATE.points.jornadaPerfecta+' pts</p>';
  html += '</div>';
  html += '<div class="pill-tabs" id="predFormGroupTabs"></div>';
  html += '<div id="predFormGroupContent"></div>';
  html += '<div class="save-bar"><button class="btn" id="savePredictionsBtn">Guardar mis predicciones</button></div>';

  container.innerHTML = html;

  // Build group tabs
  const tabsEl = document.getElementById("predFormGroupTabs");
  Object.keys(GROUPS).forEach((letter, i)=>{
    const btn = document.createElement("button");
    btn.textContent = "Grupo " + letter;
    btn.dataset.group = letter;
    if(letter === predFormGroupLetter) btn.classList.add("active");
    btn.addEventListener("click", ()=>{
      tabsEl.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      predFormGroupLetter = letter;
      renderPredFormGroupContent(letter);
    });
    tabsEl.appendChild(btn);
  });

  renderPredFormGroupContent(predFormGroupLetter);

  document.getElementById("savePredictionsBtn").addEventListener("click", async ()=>{
    // Collect any visible inputs before saving
    collectPredFormInputs();
    const ok = await savePredictions();
    if(ok !== false) showToast("Predicciones guardadas ✓");
    else showToast("Error al guardar, intentá de nuevo");
  });
}

function collectPredFormInputs(){
  const content = document.getElementById("predFormGroupContent");
  if(!content) return;
  content.querySelectorAll('.pred-input input[data-match]').forEach(inp=>{
    const id = inp.dataset.match, side = inp.dataset.side;
    if(STATE.predictions.matches[id]) STATE.predictions.matches[id][side] = inp.value;
  });
}

function renderPredFormGroupContent(letter){
  const container = document.getElementById("predFormGroupContent");
  const groupMatches = STATE.matches.filter(m=>m.group===letter);
  const byDate = {};
  groupMatches.forEach(m=>{ if(!byDate[m.date]) byDate[m.date]=[]; byDate[m.date].push(m); });

  let html = '<div class="card group-card">';
  html += '<div class="group-name" style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--line);display:flex;align-items:baseline;justify-content:space-between;">';
  html += '<h3 style="margin:0;">Grupo '+letter+'</h3>';
  html += '<span style="font-family:Oswald,sans-serif;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-dark);font-weight:600;">Tabla según tus predicciones</span>';
  html += '</div>';
  html += '<div id="pred-standings-'+letter+'">'+buildPredStandingsHtml(letter)+'</div>';

  html += '<div style="margin-top:16px;border-top:1px solid var(--line);padding-top:12px;">';
  Object.keys(byDate).sort().forEach(date=>{
    html += '<div class="day-divider"><span>'+formatDate(date)+'</span></div>';
    byDate[date].forEach(m=>{
      const locked = isMatchLocked(m);
      if(locked){
        // Show read-only: use the prediction value (or real result if match played)
        const pred = STATE.predictions.matches[m.id] || {};
        const hasVal = pred.home!==''&&pred.home!==undefined&&pred.away!==''&&pred.away!==undefined;
        let scoreHtml;
        if(hasVal){
          let pts = '';
          if(m.result){
            const p = scorePrediction(m, pred);
            pts = '<span class="points-badge '+(p===0?'zero':'')+'">+'+p+' pts</span>';
          }
          scoreHtml = '<div class="score-input"><strong>'+parseInt(pred.home)+'</strong><span class="dash">-</span><strong>'+parseInt(pred.away)+'</strong></div>';
          const lockIcon = m.result ? '🔒' : '⏰';
          const lockTitle = m.result ? 'Partido jugado' : 'Partido bloqueado';
          html += '<div class="match-row">';
          html += '<div class="match-meta">'+(m.time?m.time+'h':'')+'<br>'+m.stadium.replace("Estadio ","")+'</div>';
          html += '<div class="team home">'+escapeHtml(m.home)+'</div>';
          html += scoreHtml;
          html += '<div class="team away">'+escapeHtml(m.away)+'</div>';
          html += '<div style="text-align:right;font-size:11px;color:var(--muted);" title="'+lockTitle+'">'+lockIcon+' '+pts+'</div>';
          html += '</div>';
        } else {
          // Locked and no prediction — show "vs" greyed out
          html += '<div class="match-row" style="opacity:0.55;">';
          html += '<div class="match-meta">'+(m.time?m.time+'h':'')+'<br>'+m.stadium.replace("Estadio ","")+'</div>';
          html += '<div class="team home">'+escapeHtml(m.home)+'</div>';
          html += '<div class="score-input" style="color:var(--muted);font-size:12px;">🔒</div>';
          html += '<div class="team away">'+escapeHtml(m.away)+'</div>';
          html += '<div style="text-align:right;font-size:11px;color:var(--muted);">Sin predicción</div>';
          html += '</div>';
        }
      } else {
        html += renderMatchRow(m, "predict", {prediction: STATE.predictions.matches[m.id]});
      }
    });
  });
  html += '</div>';
  html += '</div>'; // end card

  container.innerHTML = html;

  // Wire live-update inputs
  container.querySelectorAll('.pred-input input').forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const id = inp.dataset.match, side = inp.dataset.side;
      if(STATE.predictions.matches[id]) STATE.predictions.matches[id][side] = inp.value;
      const match = STATE.matches.find(m=>m.id===id);
      if(match){
        const standingsEl = document.getElementById("pred-standings-"+match.group);
        if(standingsEl) standingsEl.innerHTML = buildPredStandingsHtml(match.group);
      }
    });
  });
}

// Build standings HTML for a group based on current predictions in STATE
function buildPredStandingsHtml(letter){
  if(!STATE.predictions) return '';
  const standings = computeGroupStandingsFromPred(letter, STATE.predictions);
  const filledCount = STATE.matches.filter(m=>{
    if(m.group!==letter) return false;
    const p = STATE.predictions.matches[m.id];
    return p && p.home!=='' && p.away!=='' && p.home!==undefined && p.away!==undefined;
  }).length;

  if(filledCount === 0){
    return '<p style="color:var(--muted);font-size:13px;margin:0 0 4px;">Completá los marcadores abajo para ver cómo quedaría la tabla de este grupo.</p>';
  }

  // Compare predicted standings with real standings if group is complete
  const realComplete = isGroupComplete(letter);
  const realStandings = realComplete ? computeGroupStandings(letter) : null;

  let html = buildStandingsTable(standings);

  if(realStandings){
    const predFirst = standings[0].team, predSecond = standings[1].team;
    const realFirst = realStandings[0].team, realSecond = realStandings[1].team;
    html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line);font-size:11px;color:var(--muted);">';
    html += 'Clasificados reales: ';
    html += buildQualifierBadge(predFirst, realFirst, '1°');
    html += buildQualifierBadge(predSecond, realSecond, '2°');
    html += '</div>';
  } else {
    html += '<p style="font-size:11px;color:var(--muted);margin:6px 0 0;">'+filledCount+'/6 partidos predichos. Las filas resaltadas clasificarían según tus marcadores.</p>';
  }
  return html;
}

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ===================== RENDER: ADMIN =====================
let adminTabsWired = false;
function renderAdmin(){
  const tabs = document.getElementById("adminTabs");
  if(!adminTabsWired){
    tabs.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-admin]");
      if(!btn) return;
      tabs.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      renderAdminContent(btn.dataset.admin);
    });
    adminTabsWired = true;
  }

  const active = tabs.querySelector("button.active");
  renderAdminContent(active ? active.dataset.admin : "resultados");
}

function renderAdminContent(tab){
  const container = document.getElementById("adminContent");
  if(tab === "resultados") renderAdminResultados(container);
  else if(tab === "bracket") renderAdminBracket(container);
  else if(tab === "puntos") renderAdminPuntos(container);
}

// ---- Admin: resultados de fase de grupos ----
function renderAdminResultados(container){
  let html = '<div class="card">';
  html += '<h3>Resultados de fase de grupos</h3>';
  html += '<p style="font-size:13px;color:var(--muted);margin:4px 0 16px;">Ingresá los marcadores reales. Se guardan automáticamente para todos cuando hacés clic en guardar.</p>';

  Object.keys(GROUPS).forEach(letter=>{
    html += '<div class="round-label">Grupo '+letter+'</div>';
    const matches = STATE.matches.filter(m=>m.group===letter);
    const byDate = {};
    matches.forEach(m=>{ if(!byDate[m.date]) byDate[m.date]=[]; byDate[m.date].push(m); });
    Object.keys(byDate).sort().forEach(date=>{
      html += '<div class="day-divider"><span>'+formatDate(date)+'</span></div>';
      byDate[date].forEach(m=>{
        html += renderMatchRow(m, "admin");
      });
    });
  });

  html += '</div><div class="save-bar"><button class="btn" id="saveResultsBtn">Guardar resultados</button></div>';
  container.innerHTML = html;

  document.getElementById("saveResultsBtn").addEventListener("click", async ()=>{
    container.querySelectorAll('.match-row input[data-side]').forEach(inp=>{
      const m = STATE.matches.find(x=>x.id===inp.dataset.match);
      const otherSide = inp.dataset.side === "home" ? "away" : "home";
      const otherInput = container.querySelector('input[data-match="'+m.id+'"][data-side="'+otherSide+'"]');
      const hVal = inp.dataset.side==="home" ? inp.value : otherInput.value;
      const aVal = inp.dataset.side==="away" ? inp.value : otherInput.value;
      if(hVal === '' || aVal === ''){
        m.result = null;
      } else {
        m.result = {home: parseInt(hVal), away: parseInt(aVal)};
      }
    });
    const ok = await storageSet("admin:matches", STATE.matches, true);
    if(ok) showToast("Resultados guardados ✓");
    else showToast("Error al guardar");
  });
}

// ---- Admin: sistema de puntos ----
function renderAdminPuntos(container){
  const labels = {
    marcadorExacto: "Marcador exacto (fase de grupos)",
    resultadoCorrecto: "Resultado correcto, no exacto (grupos)",
    jornadaPerfecta: "Bono: acertar toda una jornada",
    dosClasificados: "Acertar los 2 clasificados (sin orden, consolación)",
    campeonGrupo: "Acertar campeón de grupo (1° exacto)",
    segundoGrupo: "Acertar 2° de grupo exacto",
    mejorTercero: "Acertar mejor tercero clasificado",
    dieciseisavosClasificado: "Dieciseisavos: clasificado correcto",
    dieciseisavosMarcador: "Dieciseisavos: marcador exacto",
    octavosClasificado: "Octavos: clasificado correcto",
    octavosMarcador: "Octavos: marcador exacto",
    cuartosClasificado: "Cuartos: clasificado correcto",
    cuartosMarcador: "Cuartos: marcador exacto",
    semisClasificado: "Semis: clasificado correcto",
    semisMarcador: "Semis: marcador exacto",
    tercerPuestoGanador: "Tercer puesto: ganador correcto",
    tercerPuestoMarcador: "Tercer puesto: marcador exacto",
    campeonFinal: "Final: campeón correcto",
    finalMarcador: "Final: marcador exacto",
    subcampeon: "Final: subcampeón correcto"
  };

  let html = '<div class="card"><h3>Sistema de puntos</h3>';
  html += '<p style="font-size:13px;color:var(--muted);margin:4px 0 16px;">Ajustá cuánto vale cada cosa. Los cambios aplican a todos los cálculos en cuanto guardes.</p>';
  html += '<div class="points-grid">';
  Object.keys(labels).forEach(key=>{
    html += '<div class="field">';
    html += '<label class="field-label">'+labels[key]+'</label>';
    html += '<input type="number" min="0" class="text-input" data-points="'+key+'" value="'+STATE.points[key]+'">';
    html += '</div>';
  });
  html += '</div></div>';
  html += '<div class="save-bar"><button class="btn" id="savePointsBtn">Guardar puntos</button></div>';
  container.innerHTML = html;

  document.getElementById("savePointsBtn").addEventListener("click", async ()=>{
    container.querySelectorAll('input[data-points]').forEach(inp=>{
      STATE.points[inp.dataset.points] = parseInt(inp.value) || 0;
    });
    const ok = await storageSet("admin:points", STATE.points, true);
    if(ok) showToast("Puntos guardados ✓");
    else showToast("Error al guardar");
  });
}

// ===================== KNOCKOUT BRACKET (dinámico) =====================
// STATE.knockout structure:
// {
//   r32: [{id, home, away, result:{home,away}|null}, ... 16 matches],
//   r16: [...8],
//   qf: [...4],
//   sf: [...2],
//   third: [...1],
//   final: [...1]
// }
// home/away are team names (strings) or "" if not yet defined.
// For rounds after r32, home/away get auto-filled as "Ganador <id>" placeholders
// until the admin (or the system) resolves them once the previous round has results.

function ensureKnockoutStructure(){
  if(STATE.knockout) return;
  STATE.knockout = {};
  KNOCKOUT_ROUNDS.forEach(round=>{
    STATE.knockout[round.key] = [];
    for(let i=0;i<round.numMatches;i++){
      STATE.knockout[round.key].push({id: round.key+"-"+(i+1), home:"", away:"", result:null});
    }
  });
}

// All 48 team names, used as options for admin to pick r32 participants
const ALL_TEAMS = Object.values(GROUPS).flat();

// ===================== BRACKET PROYECTADO DEL PARTICIPANTE =====================
// A partir de las predicciones de un participante (marcadores de fase de grupos),
// armamos SU propia proyección de clasificados (1°, 2°, 2do y mejores terceros)
// y con eso construimos un bracket completo de dieciseisavos a final usando los
// cruces fijos de R32_FIXTURES. El participante puede luego predecir los resultados
// de cada cruce de ESE bracket, y los ganadores se propagan automáticamente.

// Para cada grupo, devuelve standings predichos + flag de si están "completos"
// (si el participante llenó los 6 partidos del grupo)
function computeUserGroupProjection(pred){
  const projection = {};
  Object.keys(GROUPS).forEach(letter=>{
    const standings = computeGroupStandingsFromPred(letter, pred);
    const groupMatchIds = STATE.matches.filter(m=>m.group===letter).map(m=>m.id);
    const filledCount = groupMatchIds.filter(id=>{
      const p = pred.matches[id];
      return p && p.home!=='' && p.away!=='' && p.home!==undefined && p.away!==undefined;
    }).length;
    projection[letter] = {
      standings,
      complete: filledCount === 6,
      filledCount
    };
  });
  return projection;
}

// Ordena los 12 terceros lugares predichos y devuelve los 8 mejores, en orden.
// Criterio simple: puntos, luego diferencia de gol, luego goles a favor, luego nombre.
function computeBestThirdsProjection(pred){
  const projection = computeUserGroupProjection(pred);
  const thirds = Object.keys(GROUPS).map(letter=>{
    const row = projection[letter].standings[2]; // posición 3 (índice 2)
    return Object.assign({group:letter, complete:projection[letter].complete}, row);
  });
  thirds.sort((a,b)=>{
    if(b.pts !== a.pts) return b.pts - a.pts;
    if(b.dg !== a.dg) return b.dg - a.dg;
    if(b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  });
  return {all: thirds, best8: thirds.slice(0,8)};
}

// Dado el array de los 8 grupos clasificados como mejores terceros (en CUALQUIER
// orden) y la lista de filas {group, team, ...} de esos terceros, arma el mapeo
// "3#1".."3#8" -> fila del tercero correspondiente, usando la tabla OFICIAL de
// la FIFA (thirdPlaceTable.js / Anexo C) en vez de asignar por orden de ranking.
// Devuelve {} si no hay exactamente 8 grupos válidos todavía.
function buildThirdSlotMap(qualifiedGroupLetters, thirdsRows){
  if(!Array.isArray(qualifiedGroupLetters) || qualifiedGroupLetters.length !== 8) return {};
  let assignments;
  try{
    assignments = getThirdPlaceAssignments(qualifiedGroupLetters); // de thirdPlaceTable.js
  }catch(e){
    console.error("buildThirdSlotMap:", e.message);
    return {};
  }
  const map = {};
  assignments.forEach((a, i)=>{
    const slotKey = "3#" + (i+1); // el orden oficial (74,77,79,80,81,82,85,87) calza 1 a 1 con 3#1..3#8
    map[slotKey] = thirdsRows.find(t=>t.group===a.thirdPlaceGroup) || {team:"", group:a.thirdPlaceGroup};
  });
  return map;
}

// Resuelve los 16 cruces de R32_FIXTURES a nombres de equipo reales según la
// proyección del participante. Devuelve [{home, away}] x16, con "" si falta info.
function resolveUserR32(pred){
  const projection = computeUserGroupProjection(pred);
  const thirdsInfo = computeBestThirdsProjection(pred);
  const best8 = thirdsInfo.best8;

  // Usar elecciones manuales del participante (pred.thirdPicks) si existen,
  // con la tabla automática como fallback cuando aún no eligió.
  const manualPicks = pred.thirdPicks || {};
  const slotMap = buildThirdSlotMap(best8.map(t=>t.group), best8);

  function resolveSlot(slot){
    if(slot.startsWith("3#")){
      // Si el participante eligió manualmente este slot, usar esa elección
      const pickedGroup = manualPicks[slot];
      if(pickedGroup){
        const row = best8.find(t=>t.group===pickedGroup);
        return row ? row.team : "";
      }
      // Fallback: tabla automática
      const row = slotMap[slot];
      if(!row) return "";
      return row.team || "";
    }
    const pos = slot[0]; // "1" o "2"
    const letter = slot[1];
    const standings = projection[letter].standings;
    const idx = pos === "1" ? 0 : 1;
    return (standings[idx] && standings[idx].team) || "";
  }

  return R32_FIXTURES.map(fx=>({
    id: fx.id,
    home: resolveSlot(fx.home),
    away: resolveSlot(fx.away),
    homeSlot: fx.home,
    awaySlot: fx.away
  }));
}

// Construye el bracket completo (r32..final) proyectado para un participante,
// combinando su proyección de clasificados con sus predicciones de cruces
// (pred.knockout[round][idx] = {home, away} marcadores predichos).
// Devuelve la misma forma que STATE.knockout: {r32:[...], r16:[...], qf:[...], sf:[...], third:[...], final:[...]}
function computeUserBracket(pred){
  const bracket = {};
  const r32slots = resolveUserR32(pred);

  bracket.r32 = r32slots.map((slot, idx)=>{
    const p = (pred.knockout.r32 && pred.knockout.r32[idx]) || {};
    const result = (p.home!==undefined && p.home!=='' && p.away!==undefined && p.away!=='')
      ? {home: parseInt(p.home), away: parseInt(p.away)} : null;
    return {id: slot.id, home: slot.home, away: slot.away, result, homeSlot: slot.homeSlot, awaySlot: slot.awaySlot};
  });

  // Propagar ganadores ronda por ronda usando las predicciones del participante
  for(let r=0; r<KNOCKOUT_ROUNDS.length; r++){
    const round = KNOCKOUT_ROUNDS[r];
    if(round.key === "r32") continue;
    if(round.key === "third"){
      // se llena después, junto con sf
      continue;
    }
    const prevRound = round.key === "final"
      ? KNOCKOUT_ROUNDS.find(r2=>r2.key==="sf")
      : KNOCKOUT_ROUNDS[r-1];
    const prevMatches = bracket[prevRound.key];
    const winners = prevMatches.map((m, i)=>{
      if(!m.home || !m.away) return "";
      const p = (pred.knockout[prevRound.key] && pred.knockout[prevRound.key][i]) || {};
      if(p.home===undefined || p.home==='' || p.away===undefined || p.away==='') return "";
      const ph = parseInt(p.home), pa = parseInt(p.away);
      if(isNaN(ph) || isNaN(pa) || ph===pa) return ""; // empate sin definir: no propaga
      return ph > pa ? m.home : m.away;
    });
    bracket[round.key] = [];
    for(let i=0;i<round.numMatches;i++){
      const home = winners[i*2] || "";
      const away = winners[i*2+1] || "";
      const p = (pred.knockout[round.key] && pred.knockout[round.key][i]) || {};
      const result = (p.home!==undefined && p.home!=='' && p.away!==undefined && p.away!=='')
        ? {home: parseInt(p.home), away: parseInt(p.away)} : null;
      bracket[round.key].push({id: round.key+"-"+(i+1), home, away, result});
    }
  }

  // Tercer puesto: perdedores de semifinales
  const sf = bracket.sf || [];
  const sfLosers = sf.map((m,i)=>{
    if(!m.home || !m.away) return "";
    const p = (pred.knockout.sf && pred.knockout.sf[i]) || {};
    if(p.home===undefined || p.home==='' || p.away===undefined || p.away==='') return "";
    const ph = parseInt(p.home), pa = parseInt(p.away);
    if(isNaN(ph) || isNaN(pa) || ph===pa) return "";
    return ph > pa ? m.away : m.home; // pierde el que NO gana
  });
  const thirdHome = sfLosers[0] || "", thirdAway = sfLosers[1] || "";
  const pThird = (pred.knockout.third && pred.knockout.third[0]) || {};
  const thirdResult = (pThird.home!==undefined && pThird.home!=='' && pThird.away!==undefined && pThird.away!=='')
    ? {home: parseInt(pThird.home), away: parseInt(pThird.away)} : null;
  bracket.third = [{id:"third-1", home: thirdHome, away: thirdAway, result: thirdResult}];

  return bracket;
}

// ===================== RENDER: BRACKET (árbol horizontal) =====================
// Construye el HTML del cuadro de eliminatorias en columnas (16avos -> final),
// con líneas de conexión vía CSS. `opts.editable=true` agrega inputs de marcador
// para que el participante prediga cada cruce; `opts.pointsFn` opcional calcula
// puntos por partido (para mostrar badges cuando ya hay resultado real).
function buildBracketTreeHtml(bracket, opts){
  opts = opts || {};
  const editable = !!opts.editable;

  function cellHtml(team, round, idx, side, m){
    const label = team || '<span style="color:var(--muted);">Por definir</span>';
    let winnerClass = '';
    if(m && m.result){
      const isWinner = (side==='home' && m.result.home > m.result.away) || (side==='away' && m.result.away > m.result.home);
      const isLoser  = (side==='home' && m.result.home < m.result.away) || (side==='away' && m.result.away < m.result.home);
      if(isWinner) winnerClass = 'winner';
      else if(isLoser) winnerClass = 'loser';
    }
    let scoreHtml = '';
    if(editable && team){
      const val = m && m.result ? (side==='home'?m.result.home:m.result.away) : '';
      scoreHtml = '<input type="number" min="0" max="20" class="bpred" data-round="'+round+'" data-idx="'+idx+'" data-side="'+side+'" value="'+(val!==''&&val!==undefined&&val!==null?val:'')+'">';
    } else if(m && m.result && team){
      scoreHtml = '<span class="bscore">'+(side==='home'?m.result.home:m.result.away)+'</span>';
    }
    return '<div class="bracket-cell '+winnerClass+'"><span class="bteam" title="'+escapeHtml(team||'')+'">'+ (team?escapeHtml(team):label) +'</span>'+scoreHtml+'</div>';
  }

  let html = '<div class="bracket-scroll"><div class="bracket-grid">';

  // Columnas r32 -> sf
  const mainRounds = KNOCKOUT_ROUNDS.filter(r=>r.key!=="third" && r.key!=="final");
  mainRounds.forEach(round=>{
    const matches = bracket[round.key] || [];
    html += '<div class="bracket-col"><div class="bracket-col-title">'+round.label+'</div><div class="bracket-pairs">';
    matches.forEach((m, idx)=>{
      html += '<div class="bracket-pair">';
      html += cellHtml(m.home, round.key, idx, 'home', m);
      html += cellHtml(m.away, round.key, idx, 'away', m);
      html += '</div>';
      if(opts.pointsFn && m.home && m.away && m.result){
        const pts = opts.pointsFn(round, m, idx);
        if(pts !== null) html += '<div class="bracket-pts">+'+pts+' pts</div>';
      }
    });
    html += '</div></div>';
  });

  // Columna final
  const finalMatches = bracket.final || [];
  html += '<div class="bracket-col bracket-final-col"><div class="bracket-col-title">Final</div><div class="bracket-pairs">';
  finalMatches.forEach((m, idx)=>{
    html += '<div class="bracket-pair">';
    html += cellHtml(m.home, "final", idx, 'home', m);
    html += cellHtml(m.away, "final", idx, 'away', m);
    html += '</div>';
    if(opts.pointsFn && m.home && m.away && m.result){
      const round = KNOCKOUT_ROUNDS.find(r=>r.key==="final");
      const pts = opts.pointsFn(round, m, idx);
      if(pts !== null) html += '<div class="bracket-pts">+'+pts+' pts</div>';
    }
  });
  html += '</div></div>';

  // Campeón
  const fm = finalMatches[0];
  let champ = '';
  if(fm && fm.result && fm.home && fm.away){
    champ = fm.result.home > fm.result.away ? fm.home : (fm.result.away > fm.result.home ? fm.away : '');
  }
  html += '<div class="bracket-champion"><div class="ctrophy">&#127942;</div>';
  html += '<div class="cname">'+(champ?escapeHtml(champ):'?')+'</div>';
  html += '<div class="clabel">Campeón</div></div>';

  html += '</div></div>';

  // Tercer puesto, aparte
  const third = (bracket.third || [])[0];
  if(third && (third.home || third.away)){
    html += '<div class="bracket-col-title" style="margin-top:18px;">Tercer puesto</div>';
    html += '<div class="bracket-pairs" style="max-width:178px;"><div class="bracket-pair" style="position:static;">';
    html += cellHtml(third.home, "third", 0, 'home', third);
    html += cellHtml(third.away, "third", 0, 'away', third);
    html += '</div></div>';
    if(opts.pointsFn && third.home && third.away && third.result){
      const round = KNOCKOUT_ROUNDS.find(r=>r.key==="third");
      const pts = opts.pointsFn(round, third, 0);
      if(pts !== null) html += '<div class="bracket-pts">+'+pts+' pts</div>';
    }
  }

  return html;
}

// ---- "Mi llave a la final": bracket proyectado e interactivo del participante ----
function renderPredKnockoutForm(){
  const container = document.getElementById("predKnockoutContent");
  if(!container) return;

  if(!STATE.currentParticipant || !STATE.predictions){
    container.innerHTML = '<div class="empty-state"><h3>Elegí o creá tu nombre arriba</h3><p>Ahí vas a poder armar tu propia llave hasta la final, basada en tus predicciones de la fase de grupos.</p></div>';
    return;
  }

  const pred = STATE.predictions;
  const thirdsInfo = computeBestThirdsProjection(pred);
  const projection = computeUserGroupProjection(pred);
  const incompleteGroups = Object.keys(GROUPS).filter(l=>!projection[l].complete);

  let html = '<div class="card" style="margin-bottom:14px;">';
  html += '<h3 style="margin:0 0 4px;">Tu cuadro proyectado</h3>';
  html += '<p style="font-size:13px;color:var(--muted);margin:0;">Armado con los marcadores que predijiste en "Fase de grupos": tus 1° y 2° de cada grupo, y los 8 mejores terceros según esos mismos marcadores. Predecí cada cruce y mirá cómo se va armando tu camino al título.</p>';
  if(incompleteGroups.length){
    html += '<p style="font-size:12px;color:var(--gold-dark);margin:8px 0 0;">Te faltan marcadores en: '+incompleteGroups.map(l=>'Grupo '+l).join(', ')+'. Completalos en "Fase de grupos" para una proyección más precisa.</p>';
  }
  html += '</div>';

  // ---- Selector interactivo de terceros ----
  // Grupos elegibles por cruce (de la tabla oficial FIFA, Anexo C)
  const SLOT_ELIGIBLE = {
    "3#1": ["A","B","C","D","F"],   // M74 vs 1E
    "3#2": ["C","D","F","G","H"],   // M77 vs 1I
    "3#3": ["B","E","F","I","J"],   // M81 vs 1D
    "3#4": ["A","E","H","I","J"],   // M82 vs 1G
    "3#5": ["C","E","F","H","I"],   // M79 vs 1A
    "3#6": ["E","H","I","J","K"],   // M80 vs 1L
    "3#7": ["E","F","G","I","J"],   // M85 vs 1B
    "3#8": ["D","E","I","J","L"],   // M87 vs 1K
  };
  const SLOT_RIVAL = {"3#1":"1E","3#2":"1I","3#3":"1D","3#4":"1G","3#5":"1A","3#6":"1L","3#7":"1B","3#8":"1K"};

  // Leer las elecciones guardadas (pred.thirdPicks = {"3#1":"F", "3#2":"C", ...})
  if(!pred.thirdPicks) pred.thirdPicks = {};
  const picks = pred.thirdPicks;

  // Los 8 mejores terceros proyectados (grupo → equipo)
  const best8map = {};
  thirdsInfo.best8.forEach(r => best8map[r.group] = r);

  html += '<div class="card bracket-thirds-card" style="margin-bottom:14px;">';
  html += '<h3 style="margin:0 0 4px;">Elegí tus terceros para cada llave</h3>';
  html += '<p style="font-size:13px;color:var(--muted);margin:0 0 12px;">Según la tabla oficial FIFA, cada cruce solo puede recibir terceros de ciertos grupos. Elegí uno por llave — los que ya elegiste se bloquean en las demás.</p>';

  // Tabla de los 12 terceros (referencia)
  html += '<details style="margin-bottom:12px;"><summary style="font-size:13px;color:var(--gold-dark);cursor:pointer;font-weight:600;">Ver ranking de los 12 terceros proyectados ▾</summary>';
  html += '<div style="margin-top:8px;">';
  thirdsInfo.all.forEach((row, idx)=>{
    const inBest8 = idx < 8;
    html += '<div class="third-row '+(inBest8?'in-best8':'')+'">';
    html += '<span><span class="third-rank">'+(idx+1)+'°</span>'+escapeHtml(row.team)+' <span style="color:var(--muted);font-size:11px;">(Grupo '+row.group+')</span></span>';
    html += '<span style="color:var(--muted);">'+row.pts+' pts &middot; DG '+(row.dg>0?'+':'')+row.dg+'</span>';
    html += '</div>';
  });
  html += '</div></details>';

  // Selectores por slot
  const usedGroups = new Set(Object.values(picks).filter(Boolean));

  Object.keys(SLOT_ELIGIBLE).forEach(slot=>{
    const eligible = SLOT_ELIGIBLE[slot];
    const currentPick = picks[slot] || "";
    const rival = SLOT_RIVAL[slot];

    html += '<div class="third-picker-row" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);">';
    html += '<span style="min-width:32px;font-family:Oswald,sans-serif;font-size:12px;color:var(--gold-dark);font-weight:600;">'+slot+'</span>';
    html += '<span style="min-width:38px;font-size:12px;color:var(--muted);">vs '+rival+'</span>';
    html += '<select class="text-input third-pick-select" data-slot="'+slot+'" style="flex:1;font-size:13px;padding:4px 8px;">';
    html += '<option value="">-- Elegir 3° --</option>';

    eligible.forEach(g=>{
      const teamInfo = best8map[g];
      const isUsedElsewhere = usedGroups.has(g) && currentPick !== g;
      const isInBest8 = !!teamInfo;
      const teamName = teamInfo ? teamInfo.team : ('Grupo '+g+' (no clasifica)');
      const disabled = isUsedElsewhere ? 'disabled' : '';
      const selected = currentPick === g ? 'selected' : '';
      const style = !isInBest8 ? 'color:var(--muted);' : (isUsedElsewhere ? 'color:var(--muted);' : '');
      html += '<option value="'+g+'" '+selected+' '+disabled+' style="'+style+'">'+escapeHtml(teamName)+(isUsedElsewhere?' (ya asignado)':'')+(isInBest8?'':' ✗')+'</option>';
    });

    html += '</select>';
    // Badge del equipo elegido
    if(currentPick && best8map[currentPick]){
      html += '<span style="font-size:12px;font-weight:600;color:#2b7a47;">✓ '+escapeHtml(best8map[currentPick].team)+'</span>';
    } else if(currentPick && !best8map[currentPick]){
      html += '<span style="font-size:12px;color:var(--danger);">✗ no clasifica</span>';
    }
    html += '</div>';
  });

  html += '<p style="font-size:11px;color:var(--muted);margin:10px 0 0;">Las opciones marcadas con ✗ no clasificarían según tus predicciones actuales. Los ya asignados a otra llave quedan deshabilitados.</p>';
  html += '</div>';

  // El bracket en sí
  const bracket = computeUserBracket(pred);
  html += '<div class="card">';
  html += '<h3 style="margin:0 0 8px;">Tu llave</h3>';
  html += '<div id="predBracketTree">'+buildBracketTreeHtml(bracket, {editable:true})+'</div>';
  html += '<p class="bracket-legend">Completá el marcador de cada cruce para que el ganador avance automáticamente a la siguiente ronda.</p>';
  html += '</div>';
  html += '<div class="save-bar"><button class="btn" id="saveKnockoutBracketBtn">Guardar mi llave</button></div>';

  container.innerHTML = html;
  wireBracketInputs(container, pred);

  // Wire selectores de terceros
  container.querySelectorAll(".third-pick-select").forEach(sel=>{
    sel.addEventListener("change", ()=>{
      const slot = sel.dataset.slot;
      const val = sel.value;
      if(!pred.thirdPicks) pred.thirdPicks = {};
      if(val) pred.thirdPicks[slot] = val;
      else delete pred.thirdPicks[slot];
      // Recalcular y re-renderizar todo
      renderPredKnockoutForm();
    });
  });

  document.getElementById("saveKnockoutBracketBtn").addEventListener("click", async ()=>{
    const ok = await savePredictions();
    if(ok !== false) showToast("Tu llave fue guardada ✓");
    else showToast("Error al guardar");
  });
}

// Conecta los inputs de marcador del bracket: al cambiar, actualiza pred.knockout
// y vuelve a calcular/renderizar el bracket completo (para propagar ganadores).
function wireBracketInputs(container, pred){
  const treeEl = container.querySelector("#predBracketTree");
  if(!treeEl) return;
  treeEl.querySelectorAll("input.bpred").forEach(inp=>{
    inp.addEventListener("change", ()=>{
      const round = inp.dataset.round, idx = parseInt(inp.dataset.idx), side = inp.dataset.side;
      if(!pred.knockout[round]) pred.knockout[round] = [];
      if(!pred.knockout[round][idx]) pred.knockout[round][idx] = {};
      pred.knockout[round][idx][side] = inp.value;

      // Recalcular y re-renderizar el bracket completo (propagación de ganadores)
      const bracket = computeUserBracket(pred);
      treeEl.innerHTML = buildBracketTreeHtml(bracket, {editable:true});
      wireBracketInputs(container, pred); // re-wire tras reemplazar el DOM
    });
  });
}


// ---- Admin: bracket editor ----
function renderAdminBracket(container){
  ensureKnockoutStructure();

  // Resolve a slot like "1A", "2B" to the actual team from real group results.
  // Returns "" if group not complete. Returns null for "3#N" slots (admin picks from list).
  function resolveSlotFromResults(slot){
    if(!slot) return "";
    if(slot.startsWith("3#")) return null; // señal: usar select de terceros
    const pos = slot[0]; // "1" o "2"
    const letter = slot[1];
    if(!letter || !GROUPS[letter]) return "";
    if(!isGroupComplete(letter)) return "";
    const standings = computeGroupStandings(letter);
    const idx = pos === "1" ? 0 : 1;
    return (standings[idx] && standings[idx].team) || "";
  }

  // Autocompletar slots 1° y 2° de r32 desde los resultados reales de grupos,
  // y los slots "3#N" desde thirdSlotMap (definido más abajo, según la tabla oficial).
  function autoFillR32FromGroups(thirdSlotMapArg){
    if(!STATE.knockout || !STATE.knockout.r32) return;
    STATE.knockout.r32.forEach((m, midx)=>{
      const fx = R32_FIXTURES[midx];
      if(!fx) return;
      if(!fx.home.startsWith("3#")){
        const t = resolveSlotFromResults(fx.home);
        if(t) m.home = t;
      } else if(thirdSlotMapArg && thirdSlotMapArg[fx.home] && thirdSlotMapArg[fx.home].team){
        m.home = thirdSlotMapArg[fx.home].team;
      }
      if(!fx.away.startsWith("3#")){
        const t = resolveSlotFromResults(fx.away);
        if(t) m.away = t;
      } else if(thirdSlotMapArg && thirdSlotMapArg[fx.away] && thirdSlotMapArg[fx.away].team){
        m.away = thirdSlotMapArg[fx.away].team;
      }
    });
  }

  // Armar lista de todos los terceros reales ordenados por ranking
  // (sirve para sugerir los 8 que clasifican por defecto, y para mostrar
  // pts/DG en el selector de abajo)
  function computeRealThirds(){
    const thirds = [];
    Object.keys(GROUPS).forEach(letter=>{
      if(!isGroupComplete(letter)) return;
      const standings = computeGroupStandings(letter);
      if(standings[2]) thirds.push({team: standings[2].team, group: letter, pts: standings[2].pts, dg: standings[2].dg, gf: standings[2].gf});
    });
    thirds.sort((a,b)=>{
      if(b.pts!==a.pts) return b.pts-a.pts;
      if(b.dg!==a.dg) return b.dg-a.dg;
      if(b.gf!==a.gf) return b.gf-a.gf;
      return a.team.localeCompare(b.team);
    });
    return thirds;
  }
  const realThirds = computeRealThirds();

  // STATE.knockout.qualifiedThirdGroups: las 8 letras de grupo (no equipos) que
  // el admin confirma como "mejores terceros clasificados". Por defecto se
  // sugieren las 8 mejores según el ranking calculado arriba, pero el admin
  // puede ajustarlo a mano si hay un desempate (fair play / ranking FIFA) que
  // esta app no calcula automáticamente. UNA VEZ confirmados los 8 grupos, el
  // cruce de cada uno NO se elige a mano: sale solo de la tabla oficial
  // (thirdPlaceTable.js / Anexo C), porque depende del grupo, no del ranking.
  if(!STATE.knockout.qualifiedThirdGroups){
    STATE.knockout.qualifiedThirdGroups = realThirds.slice(0,8).map(t=>t.group);
  }

  const thirdSlotMap = buildThirdSlotMap(STATE.knockout.qualifiedThirdGroups, realThirds);
  autoFillR32FromGroups(thirdSlotMap);

  function buildThirdsPickerHtml(){
    let html = '<div class="card" style="margin-bottom:14px;">';
    html += '<h3>Mejores terceros clasificados</h3>';
    html += '<p style="font-size:13px;color:var(--muted);margin:4px 0 12px;">Marcá los 8 grupos cuyo tercer lugar avanza (por defecto, los 8 mejores según puntos/DG/goles). El cruce de cada uno con su rival sale automático según el Anexo C del reglamento — no se elige a mano.</p>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    Object.keys(GROUPS).forEach(letter=>{
      const t = realThirds.find(x=>x.group===letter);
      const checked = STATE.knockout.qualifiedThirdGroups.includes(letter) ? 'checked' : '';
      const disabled = !t ? 'disabled' : '';
      const label = t
        ? letter+' &middot; '+escapeHtml(t.team)+' <span style="color:var(--muted);">('+t.pts+' pts, DG '+(t.dg>0?'+':'')+t.dg+')</span>'
        : letter+' &middot; <span style="color:var(--muted);">grupo incompleto</span>';
      html += '<label style="display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:13px;'+(disabled?'opacity:.5;':'')+'">';
      html += '<input type="checkbox" data-third-group="'+letter+'" '+checked+' '+disabled+'> '+label;
      html += '</label>';
    });
    html += '</div>';
    const n = STATE.knockout.qualifiedThirdGroups.length;
    html += '<p style="font-size:12px;margin:10px 0 0;color:'+(n===8?'#2b7a47':'var(--danger)')+';">'+n+' de 8 grupos seleccionados'+(n!==8?' — elegí exactamente 8 para que se arme la llave.':' ✓')+'</p>';
    html += '<button class="btn secondary" id="suggestThirdsBtn" style="margin-top:10px;">Sugerir automáticamente (top 8 por ranking)</button>';
    html += '</div>';
    return html;
  }

  function autoDisplay(team, slot, side){
    // Input de solo lectura: readonly + estilo autocompletado.
    // readBracketFromDOM lo lee con .value sin problema.
    const display = team || '';
    const placeholder = team ? '' : slot+' (pendiente)';
    return '<input class="text-input" data-side="'+side+'" value="'+escapeHtml(display)+'"'
      + ' placeholder="'+escapeHtml(placeholder)+'" readonly'
      + ' style="background:#f0ede3;color:var(--pitch);font-weight:600;cursor:default;"'
      + ' title="Autocompletado desde resultados de grupos">';
  }

  let html = buildThirdsPickerHtml();
  html += '<div class="card">';
  html += '<h3>Cuadro de eliminatorias</h3>';
  html += '<p style="font-size:13px;color:var(--muted);margin:4px 0 16px;">Los 1° y 2° de cada grupo se completan automáticamente al tener todos sus resultados. Los terceros clasificados se completan solos según los 8 grupos que elegiste arriba y el reglamento oficial. Las rondas siguientes se propagan con "Autocompletar".</p>';

  KNOCKOUT_ROUNDS.forEach((round, ridx)=>{
    html += '<div class="round-label">'+round.label+'</div>';
    STATE.knockout[round.key].forEach((m, midx)=>{
      html += '<div class="bracket-match" data-round="'+round.key+'" data-idx="'+midx+'">';
      const fx = ridx === 0 ? R32_FIXTURES[midx] : null;
      let label = m.id;
      if(fx) label += ' &middot; '+fx.home+' vs '+fx.away;
      html += '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;">'+label+'</div>';
      html += '<div class="vs-row">';
      if(ridx === 0 && fx){
        // home
        if(fx.home.startsWith("3#")){
          const row = thirdSlotMap[fx.home];
          html += autoDisplay((row&&row.team)||m.home, fx.home, "home");
        } else {
          const auto = resolveSlotFromResults(fx.home);
          html += autoDisplay(auto||m.home, fx.home, "home");
        }
        html += '<span style="color:var(--muted);font-size:12px;">vs</span>';
        // away
        if(fx.away.startsWith("3#")){
          const row = thirdSlotMap[fx.away];
          html += autoDisplay((row&&row.team)||m.away, fx.away, "away");
        } else {
          const auto = resolveSlotFromResults(fx.away);
          html += autoDisplay(auto||m.away, fx.away, "away");
        }
      } else {
        // rondas siguientes: texto editable
        html += '<input class="text-input" data-side="home" value="'+escapeHtml(m.home)+'" placeholder="Por definir">';
        html += '<span style="color:var(--muted);font-size:12px;">vs</span>';
        html += '<input class="text-input" data-side="away" value="'+escapeHtml(m.away)+'" placeholder="Por definir">';
      }
      html += '</div>';
      // result inputs
      html += '<div class="score-input" style="justify-content:flex-start;margin-top:8px;">';
      html += '<input type="number" min="0" max="20" data-side="resHome" value="'+(m.result?m.result.home:'')+'" style="width:42px;">';
      html += '<span class="dash">-</span>';
      html += '<input type="number" min="0" max="20" data-side="resAway" value="'+(m.result?m.result.away:'')+'" style="width:42px;">';
      html += '<span style="font-size:11px;color:var(--muted);margin-left:8px;">resultado real (si hubo penales, indicá el marcador 90&prime; y anotá el ganador en la siguiente ronda)</span>';
      html += '</div>';
      html += '</div>';
    });
  });

  html += '</div><div class="save-bar"><button class="btn secondary" id="autoFillBtn">Autocompletar ganadores en siguiente ronda</button><button class="btn" id="saveBracketBtn">Guardar cuadro</button></div>';
  container.innerHTML = html;

  // ---- Picker de los 8 mejores terceros ----
  container.querySelectorAll('input[data-third-group]').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      const letter = cb.dataset.thirdGroup;
      let groups = STATE.knockout.qualifiedThirdGroups.slice();
      if(cb.checked){
        if(groups.length >= 8){
          cb.checked = false;
          showToast("Ya hay 8 grupos elegidos. Desmarcá uno antes de agregar otro.");
          return;
        }
        if(!groups.includes(letter)) groups.push(letter);
      } else {
        groups = groups.filter(g=>g!==letter);
      }
      STATE.knockout.qualifiedThirdGroups = groups;
      renderAdminBracket(container);
    });
  });

  const suggestBtn = document.getElementById("suggestThirdsBtn");
  if(suggestBtn){
    suggestBtn.addEventListener('click', ()=>{
      STATE.knockout.qualifiedThirdGroups = computeRealThirds().slice(0,8).map(t=>t.group);
      renderAdminBracket(container);
      showToast("Sugerencia aplicada según ranking actual");
    });
  }

  document.getElementById("autoFillBtn").addEventListener("click", ()=>{
    readBracketFromDOM(container);
    propagateWinners();
    renderAdminBracket(container);
    showToast("Ganadores propagados a la siguiente ronda");
  });

  document.getElementById("saveBracketBtn").addEventListener("click", async ()=>{
    readBracketFromDOM(container);
    const ok = await storageSet("admin:knockout", STATE.knockout, true);
    if(ok) showToast("Cuadro guardado ✓");
    else showToast("Error al guardar");
  });
}

function readBracketFromDOM(container){
  container.querySelectorAll('.bracket-match').forEach(el=>{
    const round = el.dataset.round, idx = parseInt(el.dataset.idx);
    const m = STATE.knockout[round][idx];
    const homeEl = el.querySelector('[data-side="home"]');
    const awayEl = el.querySelector('[data-side="away"]');
    m.home = homeEl.value;
    m.away = awayEl.value;
    const rh = el.querySelector('[data-side="resHome"]').value;
    const ra = el.querySelector('[data-side="resAway"]').value;
    if(rh === '' || ra === '') m.result = null;
    else m.result = {home: parseInt(rh), away: parseInt(ra)};
  });
}

// Propagate winners from each round into the next round's empty slots, in order
function propagateWinners(){
  for(let r=0; r<KNOCKOUT_ROUNDS.length-1; r++){
    const round = KNOCKOUT_ROUNDS[r];
    const nextRound = KNOCKOUT_ROUNDS[r+1];
    if(nextRound.key === "third") continue; // third place handled separately
    const matches = STATE.knockout[round.key];
    const winners = matches.map(m=>{
      if(!m.result) return "";
      if(m.result.home > m.result.away) return m.home;
      if(m.result.away > m.result.home) return m.away;
      return ""; // tie with no penalty info - leave blank
    });
    const next = STATE.knockout[nextRound.key];
    for(let i=0;i<next.length;i++){
      const w1 = winners[i*2], w2 = winners[i*2+1];
      if(w1 && !next[i].home) next[i].home = w1;
      if(w2 && !next[i].away) next[i].away = w2;
    }
  }
  // Semifinal losers -> third place match
  const sf = STATE.knockout.sf;
  const sfLosers = sf.map(m=>{
    if(!m.result) return "";
    if(m.result.home > m.result.away) return m.away;
    if(m.result.away > m.result.home) return m.home;
    return "";
  });
  if(STATE.knockout.third[0]){
    if(sfLosers[0] && !STATE.knockout.third[0].home) STATE.knockout.third[0].home = sfLosers[0];
    if(sfLosers[1] && !STATE.knockout.third[0].away) STATE.knockout.third[0].away = sfLosers[1];
  }
}

// ===================== RENDER: ELIMINATORIAS (vista usuario) =====================
function renderKnockout(){
  ensureKnockoutStructure();
  const container = document.getElementById("knockoutContent");

  const bracketDefined = STATE.knockout.r32.some(m => m.home && m.away);
  if(!bracketDefined){
    container.innerHTML = '<div class="empty-state"><h3>El cuadro todavía no está definido</h3><p>Cuando termine la fase de grupos y se conozcan los 32 clasificados, el admin va a cargar los cruces reales de dieciseisavos acá. Mientras tanto, armá tu propia llave proyectada en la pestaña "Mis predicciones &rarr; Mi llave a la final".</p></div>';
    return;
  }

  // check if there's a champion
  const finalMatch = STATE.knockout.final[0];
  let html = '';
  if(finalMatch && finalMatch.result && finalMatch.home && finalMatch.away){
    const champ = finalMatch.result.home > finalMatch.result.away ? finalMatch.home : finalMatch.away;
    if(champ) html += '<div class="winner-banner"><span class="trophy">&#127942;</span><h2>'+escapeHtml(champ)+'</h2><p>Campeón del Mundo 2026</p></div>';
  }
  html += '<div class="card"><h3 style="margin:0 0 8px;">Cuadro oficial</h3>';
  html += buildBracketTreeHtml(STATE.knockout, {editable:false});
  html += '<p class="bracket-legend">Este es el cuadro real, cargado por el organizador. Para predecir resultados, ve a "Mis predicciones &rarr; Mi llave a la final".</p></div>';

  container.innerHTML = html;
}


// Returns {total, clasificadoPts, marcadorPts} for a knockout match prediction
function scoreKnockoutMatch(round, match, pred){
  let clasificadoPts = 0, marcadorPts = 0;
  if(!match.result || pred.home===undefined || pred.home==='' || pred.away===undefined || pred.away===''){
    return {total:0, clasificadoPts:0, marcadorPts:0};
  }
  const ph = parseInt(pred.home), pa = parseInt(pred.away);
  const rh = match.result.home, ra = match.result.away;
  if(isNaN(ph) || isNaN(pa)) return {total:0, clasificadoPts:0, marcadorPts:0};

  const predWinner = ph > pa ? match.home : (pa > ph ? match.away : null);
  const realWinner = rh > ra ? match.home : (ra > rh ? match.away : null);

  if(round.key === "final"){
    if(predWinner && predWinner === realWinner) clasificadoPts = STATE.points.campeonFinal;
    // subcampeon: predicted loser matches actual loser
    const predLoser = predWinner === match.home ? match.away : match.home;
    const realLoser = realWinner === match.home ? match.away : match.home;
    if(predWinner && predLoser === realLoser) clasificadoPts += STATE.points.subcampeon;
  } else if(round.key === "third"){
    if(predWinner && predWinner === realWinner) clasificadoPts = STATE.points.tercerPuestoGanador;
  } else {
    if(predWinner && predWinner === realWinner) clasificadoPts = STATE.points[round.pointsClasificado];
  }

  if(ph === rh && pa === ra){
    if(round.key === "third") marcadorPts = STATE.points.tercerPuestoMarcador;
    else if(round.key === "final") marcadorPts = STATE.points.finalMarcador;
    else marcadorPts = STATE.points[round.pointsMarcador];
  }

  return {total: clasificadoPts + marcadorPts, clasificadoPts, marcadorPts};
}

// ===================== RENDER: TABLA DE LA POLLA =====================
async function renderLeaderboard(){
  const container = document.getElementById("leaderboardContent");
  container.innerHTML = '<div class="empty-state"><h3>Calculando...</h3></div>';

  // refresh participant list
  const participantKeys = await storageList("prediction:", true);
  STATE.participants = participantKeys.map(k => k.replace("prediction:", ""));

  if(STATE.participants.length === 0){
    container.innerHTML = '<div class="empty-state"><h3>Todavía no hay predicciones cargadas</h3><p>Cuando alguien guarde sus predicciones en "Mis predicciones", va a aparecer acá.</p></div>';
    return;
  }

  const results = [];
  for(const name of STATE.participants){
    const pred = await loadPredictions(name);
    const score = calculateTotalScore(pred);
    results.push({name, ...score});
  }

  results.sort((a,b)=> b.total - a.total);

  let html = '<div class="card">';
  results.forEach((r, idx)=>{
    html += '<div class="leader-row '+(idx===0?'rank-1':'')+'">';
    html += '<div class="rank">'+(idx+1)+'</div>';
    html += '<div class="name">'+escapeHtml(r.name)+'</div>';
    html += '<div class="pts">'+r.total+'<br><small>'+r.breakdown.grupos+' grupos &middot; '+r.breakdown.eliminatorias+' elim.</small></div>';
    html += '</div>';
  });
  html += '</div>';

  container.innerHTML = html;
}

function calculateTotalScore(pred){
  let total = 0, gruposPts = 0, eliminatoriasPts = 0;

  // 1. Match predictions (group stage)
  Object.keys(JORNADAS).forEach(jornadaNum=>{
    const matches = JORNADAS[jornadaNum];
    let allCorrect = true;
    let anyPlayed = false;
    matches.forEach(m=>{
      const matchData = STATE.matches.find(x=>x.id===m.id);
      const p = pred.matches[m.id];
      if(matchData.result) anyPlayed = true;
      const pts = scorePrediction(matchData, p);
      gruposPts += pts;
      if(matchData.result){
        if(pts !== STATE.points.marcadorExacto && pts !== STATE.points.resultadoCorrecto) allCorrect = false;
        if(!matchData.result) allCorrect = false;
      } else {
        allCorrect = false;
      }
    });
    if(anyPlayed && allCorrect && matches.every(m=>STATE.matches.find(x=>x.id===m.id).result)){
      gruposPts += STATE.points.jornadaPerfecta;
    }
  });

  // 2. Group qualifiers — derived automatically from predicted match scores
  Object.keys(GROUPS).forEach(letter=>{
    if(!isGroupComplete(letter)) return;
    // Check that participant predicted all 6 matches of this group
    const groupMatchIds = STATE.matches.filter(m=>m.group===letter).map(m=>m.id);
    const allPredicted = groupMatchIds.every(id=>{
      const p = pred.matches[id];
      return p && p.home!=='' && p.away!=='' && p.home!==undefined && p.away!==undefined;
    });
    if(!allPredicted) return;

    const realStandings = computeGroupStandings(letter);
    const predStandings = computeGroupStandingsFromPred(letter, pred);
    const actualFirst = realStandings[0].team, actualSecond = realStandings[1].team;
    const predFirst = predStandings[0].team, predSecond = predStandings[1].team;

    const predictedSet = new Set([predFirst, predSecond]);
    const actualSet = new Set([actualFirst, actualSecond]);
    const bothCorrect = [...predictedSet].every(t=>actualSet.has(t));

    // Consolación: acertó los 2 equipos pero NO el orden exacto
    if(bothCorrect && !(predFirst === actualFirst && predSecond === actualSecond))
      gruposPts += STATE.points.dosClasificados;
    // 1° exacto
    if(predFirst === actualFirst) gruposPts += STATE.points.campeonGrupo;
    // 2° exacto
    if(predSecond === actualSecond) gruposPts += STATE.points.segundoGrupo;

    // Mejor tercero: verificar si el 3° predicho por el participante
    // coincide con el 3° real de este grupo (si el grupo está completo)
    const realThird = realStandings[2] ? realStandings[2].team : null;
    const predThird = predStandings[2] ? predStandings[2].team : null;
    if(realThird && predThird && predThird === realThird){
      // Solo sumar si ese equipo realmente clasificó como mejor tercero
      // (verificamos contra STATE.knockout.qualifiedThirdGroups si está definido)
      const qualifiedThirds = STATE.knockout && STATE.knockout.qualifiedThirdGroups;
      if(!qualifiedThirds || qualifiedThirds.includes(letter)){
        gruposPts += STATE.points.mejorTercero;
      }
    }
  });

  // 3. Knockout rounds — comparamos el cuadro real (definido por el admin en
  // STATE.knockout) contra LA LLAVE PROYECTADA del participante (computeUserBracket),
  // emparejando por el mismo PAR de equipos dentro de cada ronda (sin importar
  // el orden local/visitante ni la posición exacta en el cuadro).
  if(STATE.knockout){
    const userBracket = computeUserBracket(pred);
    KNOCKOUT_ROUNDS.forEach(round=>{
      const realMatches = STATE.knockout[round.key] || [];
      const userMatches = userBracket[round.key] || [];
      realMatches.forEach(m=>{
        if(!m.home || !m.away || !m.result) return;
        // Buscar en la llave del usuario un partido de esta ronda con el mismo par de equipos
        const userMatch = userMatches.find(um=>{
          if(!um.home || !um.away) return false;
          return (um.home===m.home && um.away===m.away) || (um.home===m.away && um.away===m.home);
        });
        if(!userMatch || !userMatch.result) return;
        // Si el usuario tenía los equipos invertidos (home/away al revés), espejamos su predicción
        let p = userMatch.result;
        if(userMatch.home !== m.home){
          p = {home: userMatch.result.away, away: userMatch.result.home};
        }
        const pts = scoreKnockoutMatch(round, m, {home:String(p.home), away:String(p.away)});
        eliminatoriasPts += pts.total;
      });
    });
  }

  total = gruposPts + eliminatoriasPts;
  return {total, breakdown: {grupos: gruposPts, eliminatorias: eliminatoriasPts}};
}

// ===================== RENDER: TABLA POR PARTICIPANTE =====================
let predTablesParticipant = null;

function renderTablaPredictor(){
  const selectorCard = document.getElementById("predictorSelectorCard");

  // Auto-seleccionar al participante actual si no hay ninguno elegido
  if(!predTablesParticipant && STATE.currentParticipant){
    predTablesParticipant = STATE.currentParticipant;
  }

  let html = '<div class="field" style="margin-bottom:0;">';
  html += '<label class="field-label">Ver predicciones de</label>';
  html += '<select class="text-input" id="predTableSelect">';
  html += '<option value="">-- Elegí un participante --</option>';
  STATE.participants.forEach(p=>{
    const sel = p === predTablesParticipant ? 'selected' : '';
    html += '<option value="'+escapeHtml(p)+'" '+sel+'>'+escapeHtml(p)+'</option>';
  });
  html += '</select></div>';
  selectorCard.innerHTML = html;

  document.getElementById("predTableSelect").addEventListener("change", async (e)=>{
    predTablesParticipant = e.target.value || null;
    await renderPredGroupTabs();
  });

  renderPredGroupTabs();
}

async function renderPredGroupTabs(){
  const tabsEl = document.getElementById("predGroupTabs");
  const contentEl = document.getElementById("predGroupContent");

  if(!predTablesParticipant){
    tabsEl.innerHTML = '';
    contentEl.innerHTML = '<div class="empty-state"><h3>Elegí un participante arriba</h3><p>Vas a ver cómo quedarían los grupos según sus predicciones de marcadores.</p></div>';
    return;
  }

  const pred = await loadPredictions(predTablesParticipant);

  // Construir pestañas de grupos (igual que Fase de grupos)
  tabsEl.innerHTML = '';
  Object.keys(GROUPS).forEach((letter, i)=>{
    const btn = document.createElement("button");
    btn.textContent = "Grupo " + letter;
    btn.dataset.group = letter;
    if(i===0) btn.classList.add("active");
    btn.addEventListener("click", ()=>{
      tabsEl.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      renderPredGroupContent(letter, pred);
    });
    tabsEl.appendChild(btn);
  });

  renderPredGroupContent("A", pred);
}

function computeGroupStandingsFromPred(groupLetter, pred){
  const teams = GROUPS[groupLetter];
  const table = {};
  teams.forEach(t => table[t] = {team:t, pj:0, g:0, e:0, p:0, gf:0, gc:0, dg:0, pts:0});

  STATE.matches.filter(m => m.group === groupLetter).forEach(m => {
    const p = pred.matches[m.id];
    if(!p || p.home==='' || p.away==='' || p.home===undefined || p.away===undefined) return;
    const hs = parseInt(p.home), as = parseInt(p.away);
    if(isNaN(hs)||isNaN(as)) return;
    const h = table[m.home], a = table[m.away];
    h.pj++; a.pj++;
    h.gf+=hs; h.gc+=as; a.gf+=as; a.gc+=hs;
    if(hs>as){h.g++;h.pts+=3;a.p++;}
    else if(hs<as){a.g++;a.pts+=3;h.p++;}
    else{h.e++;a.e++;h.pts++;a.pts++;}
  });
  Object.values(table).forEach(r=>r.dg=r.gf-r.gc);
  const groupMatches = STATE.matches.filter(m => m.group === groupLetter);
  const getScores = m => {
    const p = pred.matches[m.id];
    if(!p || p.home==='' || p.away==='' || p.home===undefined || p.away===undefined) return null;
    const hs = parseInt(p.home), as = parseInt(p.away);
    if(isNaN(hs)||isNaN(as)) return null;
    return {hs, as};
  };
  return Object.values(table).sort((x,y)=>{
    if(y.pts!==x.pts) return y.pts-x.pts;
    const h2h = compareHeadToHead(x.team, y.team, groupMatches, getScores);
    if(h2h !== 0) return -h2h;
    if(y.dg!==x.dg) return y.dg-x.dg;
    if(y.gf!==x.gf) return y.gf-x.gf;
    return x.team.localeCompare(y.team);
  });
}

function buildStandingsTable(standings){
  let html = '<table class="standings-table"><thead><tr>';
  html += '<th>Equipo</th><th class="num">PJ</th><th class="num">G</th><th class="num">E</th><th class="num">P</th><th class="num">GF</th><th class="num">GC</th><th class="num">DG</th><th class="num">Pts</th>';
  html += '</tr></thead><tbody>';
  standings.forEach((row,idx)=>{
    html += '<tr class="'+(idx<2?"qualify":"")+'">';
    html += '<td>'+escapeHtml(row.team)+'</td>';
    ['pj','g','e','p','gf','gc'].forEach(k=> html+='<td class="num">'+row[k]+'</td>');
    html += '<td class="num">'+(row.dg>0?'+':'')+row.dg+'</td>';
    html += '<td class="num">'+row.pts+'</td></tr>';
  });
  html += '</tbody></table>';
  return html;
}

function renderPredGroupContent(letter, pred){
  const container = document.getElementById("predGroupContent");
  const groupMatches = STATE.matches.filter(m => m.group === letter);
  const standings = computeGroupStandingsFromPred(letter, pred);
  const predQ = pred.qualifiers[letter] || {};
  const filledCount = groupMatches.filter(m=>{
    const p=pred.matches[m.id]; return p&&p.home!==''&&p.away!==''&&p.home!==undefined&&p.away!==undefined;
  }).length;

  // --- Tabla de posiciones (idéntica a Fase de grupos) ---
  let html = '<div class="card group-card">';
  html += '<div class="group-name"><h3>Grupo '+letter+'</h3><span class="letter">Tabla según predicciones</span></div>';

  if(filledCount===0){
    html += '<p style="color:var(--muted);font-size:14px;margin:8px 0 0;">'+escapeHtml(predTablesParticipant)+' no tiene predicciones para este grupo todavía.</p>';
  } else {
    html += buildStandingsTable(standings);
    // Badge clasificados predichos
    if(predQ.first || predQ.second){
      const realStandings = computeGroupStandings(letter);
      const realComplete = isGroupComplete(letter);
      html += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line);">';
      html += '<span style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Clasificados predichos: </span>';
      if(predQ.first)  html += buildQualifierBadge(predQ.first,  realComplete?realStandings[0].team:null, '1°');
      if(predQ.second) html += buildQualifierBadge(predQ.second, realComplete?realStandings[1].team:null, '2°');
      html += '</div>';
    }
    html += '<p style="font-size:11px;color:var(--muted);margin:10px 0 0;">'+filledCount+' de 6 partidos predichos. Las filas resaltadas son los que clasificarían según estas predicciones.</p>';
  }
  html += '</div>';

  // --- Calendario con marcadores predichos (idéntico al de Fase de grupos) ---
  const byDate = {};
  groupMatches.forEach(m=>{ if(!byDate[m.date]) byDate[m.date]=[]; byDate[m.date].push(m); });

  html += '<div class="card">';
  html += '<h3>Predicciones de '+escapeHtml(predTablesParticipant)+'</h3>';

  Object.keys(byDate).sort().forEach(date=>{
    html += '<div class="day-divider"><span>'+formatDate(date)+'</span></div>';
    byDate[date].forEach(m=>{
      const p = pred.matches[m.id]||{};
      const hasPred = p.home!==''&&p.away!==''&&p.home!==undefined&&p.away!==undefined;
      // Construimos una fila igual a renderMatchRow en modo "view"
      // pero mostrando el marcador predicho en vez del real
      const meta = m.time ? m.time+'h' : '';
      let scoreHtml;
      if(hasPred){
        scoreHtml = '<div class="score-input"><strong>'+parseInt(p.home)+'</strong><span class="dash">-</span><strong>'+parseInt(p.away)+'</strong></div>';
      } else {
        scoreHtml = '<div class="score-input" style="color:var(--muted);font-size:13px;">—</div>';
      }
      // Badge de puntos si el partido ya se jugó
      let badge = '';
      if(m.result && hasPred){
        const pts = scorePrediction(m, p);
        badge = '<span class="points-badge '+(pts===0?'zero':'')+'">+'+pts+' pts</span>';
      }
      html += '<div class="match-row">';
      html += '<div class="match-meta">'+meta+'<br>'+m.stadium.replace("Estadio ","")+'</div>';
      html += '<div class="team home">'+escapeHtml(m.home)+'</div>';
      html += scoreHtml;
      html += '<div class="team away">'+escapeHtml(m.away)+'</div>';
      html += '<div style="text-align:right;">'+badge+'</div>';
      html += '</div>';
    });
  });
  html += '</div>';

  container.innerHTML = html;
}

function buildQualifierBadge(predicted, actualTeam, label){
  if(!predicted) return '';
  let color='var(--muted)', icon='';
  if(actualTeam){
    if(predicted===actualTeam){color='#2b7a47';icon=' ✓';}
    else{color='var(--danger)';icon=' ✗';}
  }
  return '<span style="display:inline-block;background:#f0ede3;border-radius:999px;padding:3px 10px;margin-right:4px;font-size:12px;font-weight:500;color:'+color+';">'+label+' '+escapeHtml(predicted)+icon+'</span>';
}


