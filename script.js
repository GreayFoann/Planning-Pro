const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

function getDateDuLundi(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getDateForJour(lundi, idx) {
  const d = new Date(lundi);
  d.setDate(lundi.getDate() + idx);
  return d;
}

function formatDateComplete(d) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });
}

function calculerPaques(annee) {
  const f = Math.floor, G = annee % 19, C = f(annee / 100);
  const H = (C - f(C/4) - f((8*C+13)/25) + 19*G + 15) % 30;
  const I = H - f(H/28)*(1 - f(29/(H+1))*f((21-G)/11));
  const J = (annee + f(annee/4) + I + 2 - C + f(C/4)) % 7;
  const L = I - J, m = 3 + f((L + 40)/44), day = L + 28 - 31*f(m/4);
  return new Date(annee, m - 1, day);
}

function estJourFerie(d) {
  const a = d.getFullYear(), j = d.getDate(), m = d.getMonth() + 1;
  const cle = `${j}-${m}`, fixes = ["1-1","1-5","8-5","14-7","15-8","1-11","11-11","25-12"];
  if (fixes.includes(cle)) return true;
  const p = calculerPaques(a).getTime();
  return [0,1,39,50].some(off => {
    const dd = new Date(p + off * 86400000);
    return dd.getDate() === j && dd.getMonth() === m - 1;
  });
}

function keySemaine(lundi) {
  return "planning_" + lundi.toISOString().split("T")[0];
}

function saveWeek(lundi, data) {
  localStorage.setItem(keySemaine(lundi), JSON.stringify(data));
  localStorage.setItem("derniereSemaineOffset", semaineOffset);
}

function loadWeek(lundi) {
  return JSON.parse(localStorage.getItem(keySemaine(lundi)) || '[]');
}

const planningEl = document.getElementById("planning");
const periodeEl = document.getElementById("periodeSemaine");
const moisSel = document.getElementById("mois");
const anneeSel = document.getElementById("annee");
const toggleBg = document.getElementById("toggleTheme");
const sauvegarderBtn = document.getElementById("sauvegarder");
const annulerBtn = document.getElementById("annuler");

let semaineOffset = localStorage.getItem("derniereSemaineOffset");
semaineOffset = semaineOffset !== null ? parseInt(semaineOffset, 10) : 0;

function diffHeures(h1, h2) {
  if (!h1 || !h2) return 0;
  const [h,m] = h1.split(":"), [H,M] = h2.split(":");
  return ((+H*60 + +M) - (+h*60 + +m)) / 60;
}
function formatHeure(val) {
  const h = Math.floor(val), m = Math.round((val-h)*60);
  return `${h}h${String(m).padStart(2,"0")}min`;
}

function creerJour(date, data = {}) {
  const ferie = estJourFerie(date);
  const jourTrav = data.jourTravaille ?? !ferie;
  const conge = data.congePaye || false;
  const div = document.createElement("div");
  div.className = "day" + (ferie ? " ferie" : "");
  div.innerHTML = `
    <h2>${formatDateComplete(date)}</h2>
    <div class="inputs">
      <label>Matin :</label><input type="time" class="debutMatin" value="${data.matinDebut || ""}" />
      <input type="time" class="finMatin" value="${data.matinFin || ""}" />
      <label>Après-midi :</label><input type="time" class="debutAprem" value="${data.apremDebut || ""}" />
      <input type="time" class="finAprem" value="${data.apremFin || ""}" />
    </div>
    <div class="checkboxes">
      <label><input type="checkbox" class="jourTravaille" ${jourTrav?"checked":""}/> Jour travaillé</label>
      <label><input type="checkbox" class="congePaye" ${conge?"checked":""}/> Congé payé</label>
    </div>
    <div class="total">Total : <span class="totalJour">0h00min</span></div>
    <div class="noteBloc">
      <label>Note :</label>
      <textarea class="note" rows="2" placeholder="Ajouter une note...">${data.note || ""}</textarea>
    </div>
  `;
  const ct = div.querySelector(".jourTravaille");
  const cp = div.querySelector(".congePaye");
  const times = [...div.querySelectorAll("input[type=time]")];

  function majInputs() {
    const actif = ct.checked;
    times.forEach(i => i.disabled = !actif);
  }

  ct.addEventListener("change", () => { if (ct.checked) cp.checked = false; majInputs(); calculer(); });
  cp.addEventListener("change", () => { if (cp.checked) ct.checked = false; majInputs(); calculer(); });
  times.forEach(i=>i.addEventListener("change", calculer));

  majInputs();
  return div;
  }

function charger() {
  planningEl.innerHTML = "";
  const lundi = getDateDuLundi(semaineOffset);
  periodeEl.textContent = `Semaine du ${lundi.toLocaleDateString()} au ${getDateForJour(lundi,4).toLocaleDateString()}`;
  const saved = loadWeek(lundi);
  jours.forEach((_, i) => planningEl.appendChild(creerJour(getDateForJour(lundi, i), saved[i])));
  calculer();
  remplirSelect();
}

function calculer() {
  const days = [...document.querySelectorAll(".day")];
  let total=0, nFerieTrav=0, nConge=0;
  days.forEach(d => {
    const ct = d.querySelector(".jourTravaille").checked;
    const cp = d.querySelector(".congePaye").checked;
    const vals = ["debutMatin","finMatin","debutAprem","finAprem"]
      .map(cl => d.querySelector("."+cl).value);
    let h=0;
    if(cp){ h=7; nConge++; }
    else if(ct){ h = diffHeures(vals[0],vals[1])+diffHeures(vals[2],vals[3]); if (d.classList.contains("ferie")) nFerieTrav++; }
    total+=h;
    d.querySelector(".totalJour").textContent = formatHeure(h);
  });
  const nFerie = days.filter(d=>d.classList.contains("ferie")).length;
  const quota = 35 - 7*(nFerie - nFerieTrav + nConge);
  document.getElementById("totalEffectue").textContent = formatHeure(total);
  document.getElementById("reste").textContent = formatHeure(Math.max(quota - total,0));
}

function changerSemaine(d) { semaineOffset+=d; charger(); }
function allerAuMois(){ semaineOffset = Math.floor((new Date(parseInt(anneeSel.value),parseInt(moisSel.value)-1,1)-getDateDuLundi(0))/(7*86400000)); charger(); }

function remplirSelect(){
  moisSel.innerHTML=""; anneeSel.innerHTML="";
  const now = new Date();
  for(let m=1;m<=12;m++){ moisSel.add(new Option(new Date(2000,m-1,1).toLocaleString("fr-FR",{month:"long"}),m)); }
  for(let y=now.getFullYear()-2;y<=now.getFullYear()+2;y++){ anneeSel.add(new Option(y,y)); }
  const d = getDateDuLundi(semaineOffset);
  moisSel.value = d.getMonth()+1;
  anneeSel.value = d.getFullYear();
}

function exportCSV(){
  const l = getDateDuLundi(semaineOffset);
  const rows = [["Jour","Date","Début matin","Fin matin","AM début","AM fin","Total","Trav","Congé","Note"]];
  document.querySelectorAll(".day").forEach((d,i)=>{
    const vals = ["debutMatin","finMatin","debutAprem","finAprem"]
      .map(cl=>d.querySelector("."+cl).value);
    rows.push([
      jours[i],
      getDateForJour(l,i).toLocaleDateString(),
      ...vals,
      d.querySelector(".totalJour").textContent,
      d.querySelector(".jourTravaille").checked?"Oui":"Non",
      d.querySelector(".congePaye").checked?"Oui":"Non"
      (d.querySelector(".note")?.value || "").replace(/[\r\n]+/g, " ")
    ]);
  });
  const csv = rows.map(r=>r.join(";")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv]));
  a.download = `planning_${l.toISOString().split("T")[0]}.csv`;
  a.click();
}

(function initTheme(){
  if(localStorage.getItem("theme")==="dark"){ document.body.classList.add("dark"); toggleBg.textContent="☀️"; }
  toggleBg.addEventListener("click", ()=>{
    const dk = document.body.classList.toggle("dark");
    localStorage.setItem("theme", dk?"dark":"light");
    toggleBg.textContent = dk?"☀️":"🌙";
  });
})();

sauvegarderBtn.addEventListener("click", () => {
  const lundi = getDateDuLundi(semaineOffset);
  const data = [...document.querySelectorAll(".day")].map(d => ({
    matinDebut: d.querySelector(".debutMatin").value,
    matinFin: d.querySelector(".finMatin").value,
    apremDebut: d.querySelector(".debutAprem").value,
    apremFin: d.querySelector(".finAprem").value,
    jourTravaille: d.querySelector(".jourTravaille").checked,
    congePaye: d.querySelector(".congePaye").checked,
    note: d.querySelector(".note").value
  }));
  saveWeek(lundi, data);
  alert("Semaine sauvegardée !");
});

annulerBtn.addEventListener("click", () => {
  if (confirm("Annuler la saisie en cours ? Les données non sauvegardées seront perdues.")) {
    charger();
  }
});

document.getElementById("importCSV").addEventListener("change", function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const lignes = e.target.result.split("\n").filter(Boolean);
    const [entete, ...donnees] = lignes.map(l => l.split(";"));
    if (entete.length < 9) {
      alert("Format CSV invalide.");
      return;
    }

    const lundi = getDateDuLundi(semaineOffset);
    const semaineData = [];

    donnees.forEach(row => {
      if (row.length < 9) return;
      semaineData.push({
        matinDebut: row[2] || "",
        matinFin: row[3] || "",
        apremDebut: row[4] || "",
        apremFin: row[5] || "",
        jourTravaille: row[7]?.toLowerCase() === "oui",
        congePaye: row[8]?.toLowerCase() === "oui",
        note: row[9] || ""
      });
    });

    saveWeek(lundi, semaineData);
    charger();
    alert("CSV importé avec succès !");
  };
  reader.readAsText(file);
});

remplirSelect();
charger();