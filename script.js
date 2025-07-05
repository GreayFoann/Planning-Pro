const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
let semaineOffset = 0;
if (localStorage.getItem("derniereSemaineOffset")) {
  semaineOffset = parseInt(localStorage.getItem("derniereSemaineOffset"), 10);
}

const planning = document.getElementById("planning");
const periodeSemaine = document.getElementById("periodeSemaine");

function getDateDuLundi(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset * 7);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function getDateForJour(lundi, index) {
  const date = new Date(lundi);
  date.setDate(lundi.getDate() + index);
  return date;
}

function formatDateComplete(date) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function estJourFerie(date) {
  const annee = date.getFullYear();
  const jour = date.getDate();
  const mois = date.getMonth() + 1;

  // Jours fériés fixes
  const feries = [
    `1-1`, `1-5`, `8-5`, `14-7`, `15-8`,
    `1-11`, `11-11`, `25-12`
  ];

  // Pâques mobile
  const paques = calculerPaques(annee);
  const joursMobiles = [
    new Date(paques), // Pâques
    new Date(paques.getTime() + 1 * 86400000), // Lundi de Pâques
    new Date(paques.getTime() + 39 * 86400000), // Ascension
    new Date(paques.getTime() + 50 * 86400000) // Pentecôte
  ];

  const cle = `${jour}-${mois}`;
  if (feries.includes(cle)) return true;

  return joursMobiles.some(d =>
    d.getDate() === jour && d.getMonth() === mois - 1
  );
}

function calculerPaques(annee) {
  const f = Math.floor,
        G = annee % 19,
        C = f(annee / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (annee + f(annee / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        mois = 3 + f((L + 40) / 44),
        jour = L + 28 - 31 * f(mois / 4);
  return new Date(annee, mois - 1, jour);
}

function keySemaine(lundi) {
  return "planning_" + lundi.toISOString().split("T")[0];
}

function creerJour(date, data = {}) {
  const nomComplet = formatDateComplete(date);
  const ferie = estJourFerie(date);
  const container = document.createElement("div");
  container.className = "day";
  if (ferie) container.classList.add("ferie");

  container.innerHTML = `
    <h2>${nomComplet}</h2>
    <div class="inputs">
      <label>Matin :</label>
      <input type="time" class="debutMatin" value="${data.matinDebut || ""}" />
      <input type="time" class="finMatin" value="${data.matinFin || ""}" />
      <label>Après-midi :</label>
      <input type="time" class="debutAprem" value="${data.apremDebut || ""}" />
      <input type="time" class="finAprem" value="${data.apremFin || ""}" />
    </div>
    <div class="total">Total : <span class="totalJour">0h00min</span></div>
  `;

  dayDiv.innerHTML += `
    <div class="checkboxes">
      <label>
        <input type="checkbox" class="jourTravaille"> Jour travaillé
      </label>
      <label>
        <input type="checkbox" class="congePaye"> Congé payé
      </label>
    </div>
  `;

  const travailCheckbox = dayDiv.querySelector(".jourTravaille");
  const congeCheckbox = dayDiv.querySelector(".congePaye");

  travailCheckbox.checked = !isFerie;
  congeCheckbox.checked = false;

  congeCheckbox.addEventListener("change", () => {
    if (congeCheckbox.checked) {
      travailCheckbox.checked = false;
      const totalJour = dayDiv.querySelector(".totalJour");
      if (totalJour) totalJour.textContent = "7h00";
    } else {
      calculerTotaux();
    }
  });
  container.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", calculerTotaux);
  });

  return container;
}

function formatHeure(decimal) {
  const heures = Math.floor(decimal);
  const minutes = Math.round((decimal - heures) * 60);
  return `${heures}h${minutes.toString().padStart(2, "0")}min`;
}

function chargerPlanning() {
  planning.innerHTML = "";
  const lundi = getDateDuLundi(semaineOffset);
  const vendredi = new Date(lundi);
  vendredi.setDate(lundi.getDate() + 4);

  periodeSemaine.textContent = `Semaine du ${formatDateComplete(lundi)} au ${formatDateComplete(vendredi)}`;

  const storageKey = keySemaine(lundi);
  const sauvegarde = JSON.parse(localStorage.getItem(storageKey)) || {};

  for (let i = 0; i < 5; i++) {
    const date = getDateForJour(lundi, i);
    const nom = jours[i];
    const bloc = creerJour(date, sauvegarde[nom]);
    planning.appendChild(bloc);
  }

  calculerTotaux();
  remplirSelecteursDate();
}

function diffHeures(h1, h2) {
  if (!h1 || !h2) return 0;
  const [h1h, h1m] = h1.split(":").map(Number);
  const [h2h, h2m] = h2.split(":").map(Number);
  return ((h2h * 60 + h2m) - (h1h * 60 + h1m)) / 60;
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

function changerSemaine(offset) {
  semaineOffset += offset;
  localStorage.setItem("derniereSemaineOffset", semaineOffset);
  chargerPlanning(semaineOffset);
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

function remplirSelecteursDate() {
  const moisSelect = document.getElementById("mois");
  const anneeSelect = document.getElementById("annee");

  moisSelect.innerHTML = "";
  anneeSelect.innerHTML = "";

  const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  const anneeActuelle = new Date().getFullYear();

  moisNoms.forEach((nom, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = nom;
    moisSelect.appendChild(opt);
  });

  for (let a = anneeActuelle - 3; a <= anneeActuelle + 3; a++) {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    anneeSelect.appendChild(opt);
  }

  const aujourdHui = getDateDuLundi(semaineOffset);
  moisSelect.value = aujourdHui.getMonth();
  anneeSelect.value = aujourdHui.getFullYear();
}

function allerAuMois() {
  const mois = parseInt(document.getElementById("mois").value);
  const annee = parseInt(document.getElementById("annee").value);
  const dateCible = new Date(annee, mois, 1);

  const lundiRef = getDateDuLundi(0);
  const ecartJours = Math.floor((dateCible - lundiRef) / (1000 * 60 * 60 * 24));
  semaineOffset = Math.floor(ecartJours / 7);

  chargerPlanning();
}

chargerPlanning();
