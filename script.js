const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
let semaineOffset = 0;

const joursFeries = [
  "2025-01-01", "2025-04-21", "2025-05-01", "2025-05-08",
  "2025-05-29", "2025-06-09", "2025-07-14", "2025-08-15",
  "2025-11-01", "2025-11-11", "2025-12-25"
];

function estJourFerie(date) {
  return joursFeries.includes(date.toISOString().split("T")[0]);
}

function getDateDuLundi(offset) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const jour = now.getDay();
  const diff = jour === 0 ? -6 : 1 - jour;
  now.setDate(now.getDate() + diff);
  return now;
}

function getDateForJour(lundi, i) {
  const d = new Date(lundi);
  d.setDate(d.getDate() + i);
  return d;
}

function afficherPlanning() {
  const planning = document.getElementById("planning");
  planning.innerHTML = "";
  const lundi = getDateDuLundi(semaineOffset);
  document.getElementById("semaineLabel").textContent = `Semaine du ${lundi.toLocaleDateString("fr-FR")}`;
  const sauvegarde = JSON.parse(localStorage.getItem(keySemaine(lundi))) || {};

  for (let i = 0; i < 7; i++) {
    const date = getDateForJour(lundi, i);
    const jourNom = `${jours[i]} ${date.getDate()} ${date.toLocaleDateString("fr-FR", { month: "long" })}`;
    const key = jours[i];
    const dayDiv = document.createElement("div");
    dayDiv.className = "day";
    if (estJourFerie(date)) dayDiv.classList.add("ferie");

    dayDiv.innerHTML = `
      <strong>${jourNom}</strong>
      <div class="inputs">
        <label>Début matin
          <input type="time" class="debutMatin" value="${sauvegarde[key]?.matinDebut || ""}">
        </label>
        <label>Fin matin
          <input type="time" class="finMatin" value="${sauvegarde[key]?.matinFin || ""}">
        </label>
        <label>Début après-midi
          <input type="time" class="debutAprem" value="${sauvegarde[key]?.apremDebut || ""}">
        </label>
        <label>Fin après-midi
          <input type="time" class="finAprem" value="${sauvegarde[key]?.apremFin || ""}">
        </label>
        <div><strong>Total :</strong> <span class="totalJour">0h</span></div>
      </div>
    `;
    planning.appendChild(dayDiv);
  }

  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", calculerTotaux);
  });

  calculerTotaux();
}

function diffHeures(debut, fin) {
  if (!debut || !fin) return 0;
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  return Math.max(0, (h2 + m2 / 60) - (h1 + m1 / 60));
}

function formatHeure(duree) {
  const h = Math.floor(duree);
  const m = Math.round((duree - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}min`;
}

function keySemaine(date) {
  return `semaine-${date.toISOString().split("T")[0]}`;
}

function calculerTotaux() {
  let totalSemaine = 0;
  let nbFeries = 0;
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

    sauvegarde[jours[i]] = { matinDebut, matinFin, apremDebut, apremFin };

    const date = getDateForJour(lundi, i);
    if (estJourFerie(date)) nbFeries++;
  });

  localStorage.setItem(storageKey, JSON.stringify(sauvegarde));

  const quota = 35 - nbFeries * 7;
  const restant = quota - totalSemaine;

  document.getElementById("totalEffectue").textContent = formatHeure(totalSemaine);
  document.getElementById("reste").textContent = formatHeure(restant);
}

function changerSemaine(delta) {
  semaineOffset += delta;
  afficherPlanning();
}

function remplirSelecteurs() {
  const moisSelect = document.getElementById("moisSelect");
  const anneeSelect = document.getElementById("anneeSelect");
  for (let m = 0; m < 12; m++) {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = new Date(0, m).toLocaleString("fr-FR", { month: "long" });
    moisSelect.appendChild(option);
  }
  const anneeActuelle = new Date().getFullYear();
  for (let y = anneeActuelle - 2; y <= anneeActuelle + 2; y++) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    anneeSelect.appendChild(option);
  }
  moisSelect.value = new Date().getMonth();
  anneeSelect.value = new Date().getFullYear();
}

function allerAuMois() {
  const mois = parseInt(document.getElementById("moisSelect").value);
  const annee = parseInt(document.getElementById("anneeSelect").value);
  const cible = new Date(annee, mois, 1);
  const aujourdhui = new Date();
  const lundiCible = new Date(cible);
  const day = lundiCible.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  lundiCible.setDate(lundiCible.getDate() + diff);
  const joursDiff = Math.floor((lundiCible - getDateDuLundi(0)) / (1000 * 60 * 60 * 24));
  semaineOffset = Math.floor(joursDiff / 7);
  afficherPlanning();
}

remplirSelecteurs();
afficherPlanning();