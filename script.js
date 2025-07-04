const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
let semaineOffset = 0;

function getDateDuLundi(offset) {
  const now = new Date();
  now.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  now.setHours(0, 0, 0, 0);
  return now;
}

function getDateForJour(base, index) {
  const d = new Date(base);
  d.setDate(d.getDate() + index);
  return d;
}

function estJourFerie(date) {
  const yyyy = date.getFullYear();
  const fixed = [
    `01/01/${yyyy}`, `01/05/${yyyy}`, `08/05/${yyyy}`, `14/07/${yyyy}`,
    `15/08/${yyyy}`, `01/11/${yyyy}`, `11/11/${yyyy}`, `25/12/${yyyy}`
  ];

  const lundiPaques = new Date(getPaques(yyyy)); lundiPaques.setDate(lundiPaques.getDate() + 1);
  const ascension = new Date(getPaques(yyyy)); ascension.setDate(ascension.getDate() + 39);
  const pentecote = new Date(getPaques(yyyy)); pentecote.setDate(pentecote.getDate() + 50);

  const movables = [lundiPaques, ascension, pentecote].map(d => formatDate(d));
  return fixed.includes(formatDate(date)) || movables.includes(formatDate(date));
}

function getPaques(year) {
  const f = Math.floor, G = year % 19,
  C = f(year / 100), H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
  I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
  J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
  L = I - J,
  month = 3 + f((L + 40) / 44),
  day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

function formatDate(d) {
  return d.toLocaleDateString("fr-FR");
}

function formatHeure(h) {
  const heures = Math.floor(h);
  const minutes = Math.round((h - heures) * 60);
  return `${heures}h${minutes.toString().padStart(2, '0')}min`;
}

function diffHeures(d1, d2) {
  if (!d1 || !d2) return 0;
  const [h1, m1] = d1.split(":").map(Number);
  const [h2, m2] = d2.split(":").map(Number);
  return ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
}

function keySemaine(date) {
  return "semaine_" + date.toISOString().split("T")[0];
}

function construirePlanning() {
  const lundi = getDateDuLundi(semaineOffset);
  const storageKey = keySemaine(lundi);
  const sauvegarde = JSON.parse(localStorage.getItem(storageKey)) || {};
  document.getElementById("semaineLabel").textContent = `Semaine du ${lundi.toLocaleDateString()}`;

  const planning = document.getElementById("planning");
  planning.innerHTML = "";

  jours.forEach((nom, i) => {
    const date = getDateForJour(lundi, i);
    const dateStr = `${nom} ${date.getDate()} ${date.toLocaleString('fr-FR', { month: 'long' })}`;
    const div = document.createElement("div");
    div.className = "day";
    if (estJourFerie(date)) div.classList.add("jour-ferie");

    div.innerHTML = `
      <strong>${dateStr}</strong><br/>
      Matin : 
      <input type="time" class="debutMatin" value="${sauvegarde[nom]?.matinDebut || ''}"> -
      <input type="time" class="finMatin" value="${sauvegarde[nom]?.matinFin || ''}"><br/>
      Après-midi : 
      <input type="time" class="debutAprem" value="${sauvegarde[nom]?.apremDebut || ''}"> -
      <input type="time" class="finAprem" value="${sauvegarde[nom]?.apremFin || ''}"><br/>
      Total : <span class="totalJour">0h</span>
    `;

    ["debutMatin", "finMatin", "debutAprem", "finAprem"].forEach(cl => {
      div.querySelector(`.${cl}`).addEventListener("change", calculerTotaux);
    });

    planning.appendChild(div);
  });

  calculerTotaux();
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

    const dateDuJour = getDateForJour(lundi, i);
    if (estJourFerie(dateDuJour)) nbJoursFeries++;

    sauvegarde[jours[i]] = { matinDebut, matinFin, apremDebut, apremFin };
  });

  const quotaHebdo = 35 - nbJoursFeries * 7;
  const reste = Math.max(0, quotaHebdo - totalSemaine);

  localStorage.setItem(storageKey, JSON.stringify(sauvegarde));
  document.getElementById("totalEffectue").textContent = formatHeure(totalSemaine);
  document.getElementById("reste").textContent = formatHeure(reste);
}

function changerSemaine(delta) {
  semaineOffset += delta;
  construirePlanning();
}

function remplirMenusDeroulants() {
  const moisSelect = document.getElementById("moisSelect");
  const anneeSelect = document.getElementById("anneeSelect");

  const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet",
    "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  for (let m = 0; m < 12; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = moisNoms[m];
    moisSelect.appendChild(opt);
  }

  const anneeActuelle = new Date().getFullYear();
  for (let a = anneeActuelle - 2; a <= anneeActuelle + 2; a++) {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    anneeSelect.appendChild(opt);
  }
}

function allerA() {
  const mois = parseInt(document.getElementById("moisSelect").value);
  const annee = parseInt(document.getElementById("anneeSelect").value);
  const date = new Date(annee, mois, 1);
  const lundiBase = getDateDuLundi(0);
  const diff = Math.floor((date - lundiBase) / (7 * 24 * 60 * 60 * 1000));
  semaineOffset += diff;
  construirePlanning();
}

remplirMenusDeroulants();
construirePlanning();
