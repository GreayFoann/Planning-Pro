const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const joursFeriesFixes = [
  "01-01", "01-05", "08-05", "14-07", "15-08", "01-11", "11-11", "25-12"
];

let semaineOffset = 0;
initialiserMoisEtAnnee();
afficherSemaine();

function initialiserMoisEtAnnee() {
  const moisSelect = document.getElementById("mois");
  const anneeSelect = document.getElementById("annee");

  for (let m = 0; m < 12; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = new Date(2000, m).toLocaleString("fr-FR", { month: "long" });
    moisSelect.appendChild(opt);
  }

  const anneeCourante = new Date().getFullYear();
  for (let a = anneeCourante - 2; a <= anneeCourante + 2; a++) {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    anneeSelect.appendChild(opt);
  }
}

function allerAuMois() {
  const mois = parseInt(document.getElementById("mois").value);
  const annee = parseInt(document.getElementById("annee").value);
  const premierDuMois = new Date(annee, mois, 1);
  const lundi = getDateDuLundi(0);
  const diffTemps = premierDuMois.getTime() - lundi.getTime();
  semaineOffset = Math.floor(diffTemps / (7 * 24 * 60 * 60 * 1000));
  afficherSemaine();
}

function changerSemaine(delta) {
  semaineOffset += delta;
  afficherSemaine();
}

function getDateDuLundi(offset = 0) {
  const date = new Date();
  const jour = date.getDay();
  const lundi = new Date(date.setDate(date.getDate() - (jour === 0 ? 6 : jour - 1) + offset * 7));
  lundi.setHours(0, 0, 0, 0);
  return lundi;
}

function afficherSemaine() {
  const planning = document.getElementById("planning");
  planning.innerHTML = "";
  const lundi = getDateDuLundi(semaineOffset);
  const fin = new Date(lundi);
  fin.setDate(fin.getDate() + 6);
  document.getElementById("semaineLabel").textContent =
    `Semaine du ${lundi.toLocaleDateString("fr-FR")} au ${fin.toLocaleDateString("fr-FR")}`;

  const sauvegarde = JSON.parse(localStorage.getItem(keySemaine(lundi))) || {};

  for (let i = 0; i < 7; i++) {
    const jourDate = new Date(lundi);
    jourDate.setDate(lundi.getDate() + i);
    const dateStr = jourDate.toISOString().split("T")[0];
    const jourStr = `${jours[i]} ${jourDate.toLocaleDateString("fr-FR")}`;

    const isFerie = joursFeriesFixes.includes(jourDate.toISOString().slice(5, 10));
    const div = document.createElement("div");
    div.className = "day" + (isFerie ? " ferie" : "");
    div.innerHTML = `
      <strong>${jourStr}</strong><br/>
      Matin : <input type="time" class="debutMatin"> - <input type="time" class="finMatin"><br/>
      Après-midi : <input type="time" class="debutAprem"> - <input type="time" class="finAprem"><br/>
      Total jour : <span class="totalJour">0h00</span>
    `;

    const data = sauvegarde[jours[i]];
    if (data) {
      div.querySelector(".debutMatin").value = data.matinDebut;
      div.querySelector(".finMatin").value = data.matinFin;
      div.querySelector(".debutAprem").value = data.apremDebut;
      div.querySelector(".finAprem").value = data.apremFin;
    }

    ["debutMatin", "finMatin", "debutAprem", "finAprem"].forEach(cls => {
      div.querySelector(`.${cls}`).addEventListener("change", calculerTotaux);
    });

    planning.appendChild(div);
  }

  calculerTotaux();
}

function keySemaine(lundi) {
  return "semaine_" + lundi.toISOString().split("T")[0];
}

function calculerTotaux() {
  let totalSemaine = 0;
  const lundi = getDateDuLundi(semaineOffset);
  const storageKey = keySemaine(lundi);
  const sauvegarde = {};

  let nbJoursFeries = 0;

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

    if (jour.classList.contains("ferie")) {
      nbJoursFeries++;
    }
  });

  localStorage.setItem(storageKey, JSON.stringify(sauvegarde));
  document.getElementById("totalEffectue").textContent = formatHeure(totalSemaine);

  const heuresFeries = nbJoursFeries * 7;
  const heuresRestantes = 35 - totalSemaine - heuresFeries;

  document.getElementById("reste").textContent = formatHeure(Math.max(heuresRestantes, 0));
}

function diffHeures(debut, fin) {
  if (!debut || !fin) return 0;
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  const t1 = h1 * 60 + m1;
  const t2 = h2 * 60 + m2;
  return Math.max((t2 - t1) / 60, 0);
}

function formatHeure(decimal) {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}