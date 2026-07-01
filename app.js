const URL_DATI = "https://attendance-proxy.silvio-phy.workers.dev";

const $day = document.getElementById("day");
const $stato = document.getElementById("stato");
const $q = document.getElementById("q");
const $board = document.getElementById("board");
const $meta = document.getElementById("meta");
const $updated = document.getElementById("updated");
const $refresh = document.getElementById("refresh");
 
let docenti = [];      // [{nome, giorni:{data:stato}}]
let date = [];         // date presenti, recenti prima
 
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
              "luglio","agosto","settembre","ottobre","novembre","dicembre"];
const GG = ["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];
 
function dataEstesa(iso) {
  if (!iso) return "—";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  const d = new Date(+p[0], +p[1]-1, +p[2]);
  return GG[d.getDay()] + " " + (+p[2]) + " " + MESI[+p[1]-1];
}
 
async function carica() {
  $refresh.classList.add("loading");
  $refresh.disabled = true;
  try {
    const r = await fetch(URL_DATI + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const json = await r.json();
 
    docenti = Object.entries(json).map(([uid, u]) => ({
      nome: (u.nome || "Senza nome").trim(),
      giorni: u.giorni || {}
    }));
 
    const set = new Set();
    docenti.forEach(d => Object.keys(d.giorni).forEach(g => set.add(g)));
    date = [...set].sort().reverse();
 
    popolaGiorni();
    render();
    $meta.textContent = docenti.length + " docenti · " + date.length + " giorni registrati";
    const ora = new Date();
    $updated.textContent = "Ultima lettura " + ora.toLocaleTimeString("it-IT", {hour:"2-digit", minute:"2-digit"});
  } catch (e) {
    $board.innerHTML =
      '<div class="msg err">Non riesco a leggere i dati (' + e.message + ').<br>' +
      'Controlla che <b>utenti.json</b> esista nel repository sul branch main.</div>';
  } finally {
    $refresh.classList.remove("loading");
    $refresh.disabled = false;
  }
}
 
function popolaGiorni() {
  const sel = $day.value;
  $day.innerHTML = "";
  date.forEach(g => {
    const o = document.createElement("option");
    o.value = g;
    o.textContent = dataEstesa(g);
    $day.appendChild(o);
  });
  if (sel && date.includes(sel)) $day.value = sel;
}
 
function render() {
  const giorno = $day.value;
  const query = $q.value.trim().toLowerCase();
 
  if (!giorno) {
    $board.style.gridTemplateColumns = "1fr";
    $board.innerHTML = '<div class="msg">Nessun giorno registrato per ora.</div>';
    return;
  }
 
  // raccogli e ordina alfabeticamente
  let righe = docenti
    .map(d => ({ nome: d.nome, stato: d.giorni[giorno] || "non entrato" }))
    .filter(x => !query || x.nome.toLowerCase().includes(query))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
 
  const gruppi = {
    entrato:       righe.filter(x => x.stato === "entrato"),
    uscito:        righe.filter(x => x.stato === "uscito"),
    "non entrato": righe.filter(x => x.stato === "non entrato")
  };
 
  const colonne = [
    { chiave: "entrato",     cls: "in",   etichetta: "Entrati" },
    { chiave: "uscito",      cls: "out",  etichetta: "Usciti" },
    { chiave: "non entrato", cls: "none", etichetta: "Non entrati" }
  ];
 
  // filtro stato: se diverso da "all", mostra solo quella colonna
  const filtroStato = $stato.value;
  const visibili = filtroStato === "all"
    ? colonne
    : colonne.filter(c => c.chiave === filtroStato);
 
  // adatta la griglia al numero di colonne mostrate
  $board.style.gridTemplateColumns = "repeat(" + visibili.length + ", 1fr)";
 
  let html = "";
  for (const c of visibili) {
    const lista = gruppi[c.chiave];
    html += '<section class="col ' + c.cls + '">' +
      '<div class="col-head"><span class="col-title"><span class="tag"></span>' +
      c.etichetta + '</span><span class="count">' + lista.length + '</span></div>';
    if (lista.length === 0) {
      html += '<p class="empty">nessuno</p>';
    } else {
      html += '<ul>' + lista.map(x =>
        '<li><span class="dot"></span>' + escapeHtml(x.nome) + '</li>'
      ).join("") + '</ul>';
    }
    html += '</section>';
  }
  $board.innerHTML = html;
}
 
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
}
 
$day.addEventListener("change", render);
$stato.addEventListener("change", render);
$q.addEventListener("input", render);
$refresh.addEventListener("click", carica);
 
carica();
setInterval(carica, 60000);   // ricarica ogni 60s
