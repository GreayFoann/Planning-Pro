const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const joursFeriesFrance = [
  "01-01", "01-05", "08-05", "14-07", "15-08", "01-11", "11-11", "25-12"
];

let semaineOffset = 0;

if (localStorage.getItem("derniereSemaineOffset")) {
  semaineOffset = parseInt(localStorage.getItem("derniereSemaineOffset"), 10);
}

function getDateDuLundi(offset = 0) {
  const date = new Date();
  const jour = date.getDay();
  const diff = date.getDate() - jour + (jour === 0 ? -6 : 1);
  const lundi = new Date(date.setDate(diff));
  lundi.setDate(lundi.getDate() + offset * 7);
  return lundi;
}

function keySemaine(date) {
  return `planning_${date.toISOString().split("T")[0]}`;
}

function formatHeure(decimal) {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}min`;
}

function diffHeures(debut, fin) {
  if (!debut || !fin) return 0;
  const [hd, md] = debut.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  const start = hd * 60 + md;
  const end = hf * 60 + mf;
  return Math.max(0, (end - start) / 60);
}

function estJourFerie(date) {
  const d = new Date(date);
  const key = d.toISOString().slice(5, 10);
  if (joursFeriesFrance.includes(key)) return true;

  const année = d.getFullYear();
  const paques = getPaques(année);
  const joursMobiles = [
    new Date(paques),                         // Pâques
    new Date(paques.setDate(paques.getDate() + 1)),   // Lundi de Pâques
    new Date(paques.setDate(paques.getDate() + 38)),  // Ascension
    new Date(paques.setDate(paques.getDate() + 11)),  // Pentecôte
  ];

  return joursMobiles.some(j => j.toDateString() === d.toDateString());
}

function getPaques(year) {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

function getDateForJour(lundi, index) {
  const date = new Date(lundi);
  date.setDate(lundi.getDate() + index);
  return date;
}

function afficherSemaine() {
  const lundi = getDateDuLundi(semaineOffset);
  document.getElementById("semaine").textContent = `Semaine du ${lundi.toLocaleDateString()}`;
  const stockage = JSON.parse(localStorage.getItem(keySemaine(lundi))) || {};

  const container = document.getElementById("jours");
  container.innerHTML = "";

  jours.forEach((nom, i) => {
    const date = getDateForJour(lundi, i);
    const ddmmyyyy = date.toLocaleDateString("fr-FR", { weekday: 'long', day: '2-digit', month: 'long' });
    const jourDiv = document.createElement("div");
    jourDiv.className = "day";

    if (estJourFerie(date)) jourDiv.classList.add("ferie");

    jourDiv.innerHTML = `
      <h3>${ddmmyyyy}</h3>
      <label>Matin :
        <input type="time" class="debutMatin" value="${stockage[nom]?.matinDebut || ""}">
        -
        <input type="time" class="finMatin" value="${stockage[nom]?.matinFin || ""}">
      </label><br>
      <label>Après-midi :
        <input type="time" class="debutAprem" value="${stockage[nom]?.apremDebut || ""}">
        -
        <input type="time" class="finAprem" value="${stockage[nom]?.apremFin || ""}">
      </label><br>
      Total : <span class="totalJour">0h00min</span>
    `;
    container.appendChild(jourDiv);
  });

  calculerTotaux();

  // Sauvegarde la dernière semaine
  localStorage.setItem("derniereSemaineOffset", semaineOffset);
}

function calculerTotaux() {
  let totalSemaine = 0;
  const lundi = getDateDuLundi(semaineOffset);
  const storageKey = keySemaine(lundi);
  const sauvegarde = {};
  let joursFeriesDansLaSemaine = 0;

  document.querySelectorAll(".day").forEach((jour, i) => {
    const matinDebut = jour.querySelector(".debutMatin").value;
    const matinFin = jour.querySelector(".finMatin").value;
    const apremDebut = jour.querySelector(".debutAprem").value;
    const apremFin = jour.querySelector(".finAprem").value;

    const matin = diffHeures(matinDebut, matinFin);
    const aprem = diffHeures(apremDebut, apremFin);
    const totalJour = matin + aprem;

    jour.querySelector(".totalJour").textContent = formatHeure(totalJour);
    totalSemaine += totalJour;

    const isFerie = jour.classList.contains("ferie");
    if (isFerie) joursFeriesDansLaSemaine++;

    sauvegarde[jours[i]] = {
      matinDebut, matinFin, apremDebut, apremFin
    };
  });

  const quota = 35 - (joursFeriesDansLaSemaine * 7);
  const heuresRestantes = Math.max(0, quota - totalSemaine);

  localStorage.setItem(storageKey, JSON.stringify(sauvegarde));
  document.getElementById("totalEffectue").textContent = formatHeure(totalSemaine);
  document.getElementById("reste").textContent = formatHeure(heuresRestantes);
}

function exportCSV() {
  const lundi = getDateDuLundi(semaineOffset);
  const storageKey = keySemaine(lundi);
  const data = JSON.parse(localStorage.getItem(storageKey)) || {};

  let joursFeries = 0;
  for (let i = 0; i < 5; i++) {
    const date = getDateForJour(lundi, i);
    if (estJourFerie(date)) joursFeries++;
  }

  const quota = 35 - (joursFeries * 7);
  let totalSemaine = 0;

  let csv = "Jour;Début matin;Fin matin;Début après-midi;Fin après-midi;Total\n";
  jours.forEach(jour => {
    const e = data[jour] || {};
    const totalDecimal = (diffHeures(e.matinDebut, e.matinFin) + diffHeures(e.apremDebut, e.apremFin));
    const total = formatHeure(totalDecimal);
    totalSemaine += totalDecimal;
    csv += `${jour};${e.matinDebut || ""};${e.matinFin || ""};${e.apremDebut || ""};${e.apremFin || ""};${total}\n`;
  });

  csv += `\nQuota ajusté (jours fériés : ${joursFeries}) :;${formatHeure(quota)}\n`;
  csv += `Total effectué :;${formatHeure(totalSemaine)}\n`;
  csv += `Heures restantes :;${formatHeure(Math.max(0, quota - totalSemaine))}\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `planning_${lundi.toISOString().split("T")[0]}.csv`;
  a.click();
}

document.getElementById("prev").onclick = () => {
  semaineOffset--;
  afficherSemaine();
};

document.getElementById("next").onclick = () => {
  semaineOffset++;
  afficherSemaine();
};

document.getElementById("moisAnneeForm").onsubmit = e => {
  e.preventDefault();
  const mois = parseInt(document.getElementById("mois").value);
  const annee = parseInt(document.getElementById("annee").value);
  const target = new Date(annee, mois - 1, 1);
  const lundiBase = getDateDuLundi(0);
  const diffJours = Math.floor((target - lundiBase) / (1000 * 60 * 60 * 24));
  semaineOffset = Math.floor(diffJours / 7);
  afficherSemaine();
};

document.getElementById("export").onclick = exportCSV;

document.addEventListener("input", e => {
  if (e.target.matches("input[type='time']")) {
    calculerTotaux();
  }
});

window.onload = afficherSemaine;