const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
let semaineOffset = 0;

const planning = document.getElementById("planning");
const periodeSemaine = document.getElementById("periodeSemaine");

function getDateDuLundi(offset = 0) {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  return new Date(date.setDate(diff));
}

function formatDate(date) {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric"
  });
}

function keySemaine(lundi) {
  return "planning_" + lundi.toISOString().split("T")[0];
}

function creerJour(nom, data = {}) {
  const container = document.createElement("div");
  container.className = "day";

  container.innerHTML = `
    <h2>${nom}</h2>
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

  periodeSemaine.textContent = `Semaine du ${formatDate(lundi)} au ${formatDate(vendredi)}`;

  const storageKey = keySemaine(lundi);
  const sauvegarde = JSON.parse(localStorage.getItem(storageKey)) || {};

  jours.forEach(jour => {
    const bloc = creerJour(jour, sauvegarde[jour]);
    planning.appendChild(bloc);
  });

  calculerTotaux();
  remplirSelecteursDate(); // MAJ du menu mois/année
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

    sauvegarde[jours[i]] = {
      matinDebut, matinFin, apremDebut, apremFin
    };
  });

  localStorage.setItem(storageKey, JSON.stringify(sauvegarde));
  document.getElementById("totalEffectue").textContent = formatHeure(totalSemaine);
  document.getElementById("reste").textContent = formatHeure(35 - totalSemaine);
}

function changerSemaine(offset) {
  semaineOffset += offset;
  chargerPlanning();
}

function exportCSV() {
  const lundi = getDateDuLundi(semaineOffset);
  const storageKey = keySemaine(lundi);
  const data = JSON.parse(localStorage.getItem(storageKey)) || {};

  let csv = "Jour;Début matin;Fin matin;Début après-midi;Fin après-midi;Total\n";
  jours.forEach(jour => {
    const e = data[jour] || {};
    const totalDecimal = (diffHeures(e.matinDebut, e.matinFin) + diffHeures(e.apremDebut, e.apremFin));
    const total = formatHeure(totalDecimal);
    csv += `${jour};${e.matinDebut || ""};${e.matinFin || ""};${e.apremDebut || ""};${e.apremFin || ""};${total}\n`;
  });

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

  if (moisSelect.children.length > 0) return; // évite de remplir deux fois

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

  const aujourdHui = new Date();
  moisSelect.value = aujourdHui.getMonth();
  anneeSelect.value = aujourdHui.getFullYear();
}

function allerAuMois() {
  const mois = parseInt(document.getElementById("mois").value);
  const annee = parseInt(document.getElementById("annee").value);
  const dateCible = new Date(annee, mois, 1);
  const lundiReference = getDateDuLundi(0);
  const diffSemaines = Math.floor((dateCible - lundiReference) / (7 * 24 * 60 * 60 * 1000));
  semaineOffset = diffSemaines;
  chargerPlanning();
}

chargerPlanning();
