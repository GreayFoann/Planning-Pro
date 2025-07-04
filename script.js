const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function getDateDuLundi(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + offset * 7);
  return date;
}

function getDateForJour(lundi, index) {
  const date = new Date(lundi);
  date.setDate(lundi.getDate() + index);
  return date;
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function keySemaine(date) {
  return "semaine_" + formatDate(date);
}

function diffHeures(debut, fin) {
  if (!debut || !fin) return 0;
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  return Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
}

function formatHeure(decimal) {
  const heures = Math.floor(decimal);
  const minutes = Math.round((decimal - heures) * 60);
  return `${heures}h${minutes.toString().padStart(2, '0')}min`;
}

function estJourFerie(date) {
  const annee = date.getFullYear();
  const joursFeries = [
    `01-01`, // Jour de l'an
    `01-05`, // Fête du travail
    `08-05`, // Victoire 1945
    `14-07`, // Fête nationale
    `15-08`, // Assomption
    `01-11`, // Toussaint
    `11-11`, // Armistice
    `25-12`, // Noël
    datePaques(annee, 1), // Lundi de Pâques
    datePaques(annee, 39), // Ascension
    datePaques(annee, 50), // Lundi de Pentecôte
  ];
  const d = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return joursFeries.includes(d);
}

function datePaques(year, offset = 0) {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(H / 28) * f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const mois = 3 + f((L + 40) / 44);
  const jour = L + 28 - 31 * f(mois / 4);
  const date = new Date(year, mois - 1, jour);
  date.setDate(date.getDate() + offset);
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

let semaineOffset = 0;

function afficherSemaine() {
  const lundi = getDateDuLundi(semaineOffset);
  const container = document.getElementById("semaine");
  container.innerHTML = "";

  const titre = document.getElementById("titreSemaine");
  titre.textContent = `Semaine du ${lundi.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

  const sauvegarde = JSON.parse(localStorage.getItem(keySemaine(lundi))) || {};

  jours.forEach((jour, i) => {
    const date = getDateForJour(lundi, i);
    const dateStr = date.toLocaleDateString("fr-FR");
    const isFerie = estJourFerie(date);

    const row = document.createElement("div");
    row.className = "day" + (isFerie ? " ferie" : "");

    row.innerHTML = `
      <div class="jour">${jour} ${dateStr}</div>
      <input type="time" class="debutMatin" value="${sauvegarde[jour]?.matinDebut || ""}">
      <input type="time" class="finMatin" value="${sauvegarde[jour]?.matinFin || ""}">
      <input type="time" class="debutAprem" value="${sauvegarde[jour]?.apremDebut || ""}">
      <input type="time" class="finAprem" value="${sauvegarde[jour]?.apremFin || ""}">
      <div class="totalJour">0h00min</div>
    `;
    container.appendChild(row);
  });

  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", calculerTotaux);
  });

  calculerTotaux();
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

    const date = getDateForJour(lundi, i);
    if (estJourFerie(date)) {
      nbFeries++;
    }

    sauvegarde[jours[i]] = {
      matinDebut, matinFin, apremDebut, apremFin
    };
  });

  localStorage.setItem(storageKey, JSON.stringify(sauvegarde));

  const quota = 35 - (nbFeries * 7);
  document.getElementById("totalEffectue").textContent = formatHeure(totalSemaine);
  document.getElementById("reste").textContent = formatHeure(Math.max(0, quota - totalSemaine));
}

document.getElementById("prev").addEventListener("click", () => {
  semaineOffset--;
  afficherSemaine();
});

document.getElementById("next").addEventListener("click", () => {
  semaineOffset++;
  afficherSemaine();
});

document.getElementById("allerBtn").addEventListener("click", () => {
  const mois = parseInt(document.getElementById("moisSelect").value);
  const annee = parseInt(document.getElementById("anneeSelect").value);
  const cible = new Date(annee, mois, 1);
  const lundi = getDateDuLundi();
  const diff = Math.floor((cible - lundi) / (1000 * 60 * 60 * 24 * 7));
  semaineOffset += diff;
  afficherSemaine();
});

window.onload = afficherSemaine;