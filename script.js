Je te renvoi le script en entier. Peux tu me l’implémenter dedans et me le renvoyer en entier s’il te plaît ? Merci :

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
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });
}

function estJourFerie(date) {
  const annee = date.getFullYear();
  const jour = date.getDate();
  const mois = date.getMonth() + 1;

  const feries = [`1-1`, `1-5`, `8-5`, `14-7`, `15-8`, `1-11`, `11-11`, `25-12`];
  const paques = calculerPaques(annee);
  const joursMobiles = [
    new Date(paques),
    new Date(paques.getTime() + 1 * 86400000),
    new Date(paques.getTime() + 39 * 86400000),
    new Date(paques.getTime() + 50 * 86400000)
  ];

  const cle = `${jour}-${mois}`;
  if (feries.includes(cle)) return true;
  return joursMobiles.some(d => d.getDate() === jour && d.getMonth() === mois - 1);
}

function calculerPaques(annee) {
  const f = Math.floor;
  const G = annee % 19;
  const C = f(annee / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (annee + f(annee / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const mois = 3 + f((L + 40) / 44);
  const jour = L + 28 - 31 * f(mois / 4);
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

  const jourTravaille = data.jourTravaille ?? !ferie;
  const congePaye = data.congePaye ?? false;

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
    <div class="checkboxes">
      <label><input type="checkbox" class="jourTravaille" ${jourTravaille ? "checked" : ""}> Jour travaillé</label>
      <label><input type="checkbox" class="congePaye" ${congePaye ? "checked" : ""}> Congé payé</label>
    </div>
    <div class="total">Total : <span class="totalJour">0h00min</span></div>
  `;

  const checkboxTravail = container.querySelector(".jourTravaille");
  const checkboxConge = container.querySelector(".congePaye");

  checkboxTravail.addEventListener("change", () => {
    const actifs = checkboxTravail.checked;
    container.querySelectorAll("input[type=time]").forEach(input => input.disabled = !actifs);
    if (!actifs) checkboxConge.checked = false;
    calculerTotaux();
  });

  checkboxConge.addEventListener("change", () => {
    if (checkboxConge.checked) {
      checkboxTravail.checked = false;
      container.querySelectorAll("input[type=time]").forEach(input => input.disabled = true);
    } else {
      checkboxTravail.checked = true;
      container.querySelectorAll("input[type=time]").forEach(input => input.disabled = false);
    }
    calculerTotaux();
  });

  container.querySelectorAll("input[type=time]").forEach(input => {
    input.disabled = !jourTravaille;
    input.addEventListener("change", calculerTotaux);
  });

  return container;
}

function formatHeure(decimal) {
  const heures = Math.floor(decimal);
  const minutes = Math.round((decimal - heures) * 60);
  return `${heures}h${minutes.toString().padStart(2, "0")}min`;
}

function diffHeures(h1, h2) {
  if (!h1 || !h2) return 0;
  const [h1h, h1m] = h1.split(":").map(Number);
  const [h2h, h2m] = h2.split(":").map(Number);
  return ((h2h * 60 + h2m) - (h1h * 60 + h1m)) / 60;
}

function calculerTotaux() {
  const joursDivs = document.querySelectorAll(".day");
  let total = 0;
  let nbFeriesTravailles = 0;
  let nbCongesPayes = 0;

  joursDivs.forEach(day => {
    const matinDebut = day.querySelector(".debutMatin").value;
    const matinFin = day.querySelector(".finMatin").value;
    const apremDebut = day.querySelector(".debutAprem").value;
    const apremFin = day.querySelector(".finAprem").value;

    const travaille = day.querySelector(".jourTravaille").checked;
    const conge = day.querySelector(".congePaye").checked;

    let heuresJour = 0;
    if (conge) {
      heuresJour = 7;
      nbCongesPayes++;
    } else if (travaille) {
      heuresJour =
        diffHeures(matinDebut, matinFin) + diffHeures(apremDebut, apremFin);
      if (day.classList.contains("ferie")) nbFeriesTravailles++;
    }

    total += heuresJour;
    day.querySelector(".totalJour").textContent = formatHeure(heuresJour);
  });

  const nbJoursFeries = Array.from(joursDivs).filter(d => d.classList.contains("ferie")).length;
  const nbJoursFeriesNonTravailles = nbJoursFeries - nbFeriesTravailles;

  const quota = 35 - 7 * (nbJoursFeriesNonTravailles + nbCongesPayes);

  document.getElementById("totalEffectue").textContent = formatHeure(total);
  document.getElementById("reste").textContent = formatHeure(Math.max(quota - total, 0));
  sauvegarder();
}

function sauvegarder() {
  const lundi = getDateDuLundi(semaineOffset);
  const data = [];
  const joursDivs = document.querySelectorAll(".day");

  joursDivs.forEach(day => {
    data.push({
      matinDebut: day.querySelector(".debutMatin").value,
      matinFin: day.querySelector(".finMatin").value,
      apremDebut: day.querySelector(".debutAprem").value,
      apremFin: day.querySelector(".finAprem").value,
      jourTravaille: day.querySelector(".jourTravaille").checked,
      congePaye: day.querySelector(".congePaye").checked
    });
  });

  localStorage.setItem(keySemaine(lundi), JSON.stringify(data));
  localStorage.setItem("derniereSemaineOffset", semaineOffset.toString());
}

function charger() {
  planning.innerHTML = "";
  const lundi = getDateDuLundi(semaineOffset);
  const saved = JSON.parse(localStorage.getItem(keySemaine(lundi)) || "[]");

  jours.forEach((jour, i) => {
    const date = getDateForJour(lundi, i);
    const data = saved[i] || {};
    const el = creerJour(date, data);
    planning.appendChild(el);
  });

  const dimanche = getDateForJour(lundi, 4);
  periodeSemaine.textContent = `Semaine du ${lundi.toLocaleDateString()} au ${dimanche.toLocaleDateString()}`;
  calculerTotaux();
}

function changerSemaine(delta) {
  semaineOffset += delta;
  charger();
}

function allerAuMois() {
  const m = parseInt(document.getElementById("mois").value, 10);
  const a = parseInt(document.getElementById("annee").value, 10);
  const target = new Date(a, m - 1, 1);
  const lundiRef = getDateDuLundi(0);
  const diff = Math.floor((target - lundiRef) / (7 * 86400000));
  semaineOffset = diff;
  charger();
}

function remplirSelecteursMoisAnnee() {
  const moisSel = document.getElementById("mois");
  const anneeSel = document.getElementById("annee");
  const now = new Date();
  for (let m = 0; m < 12; m++) {
    const opt = document.createElement("option");
    opt.value = m + 1;
    opt.textContent = new Date(2000, m, 1).toLocaleDateString("fr-FR", { month: "long" });
    moisSel.appendChild(opt);
  }
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 2; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    anneeSel.appendChild(opt);
  }
  moisSel.value = (now.getMonth() + 1).toString();
  anneeSel.value = now.getFullYear().toString();
}

function exportCSV() {
  const lundi = getDateDuLundi(semaineOffset);
  const rows = [["Jour", "Date", "Matin début", "Matin fin", "AM début", "AM fin", "Total", "Jour travaillé", "Congé payé"]];
  const joursDivs = document.querySelectorAll(".day");

  joursDivs.forEach((day, i) => {
    const date = getDateForJour(lundi, i);
    const nom = jours[i];
    const matinDebut = day.querySelector(".debutMatin").value;
    const matinFin = day.querySelector(".finMatin").value;
    const apremDebut = day.querySelector(".debutAprem").value;
    const apremFin = day.querySelector(".finAprem").value;
    const total = day.querySelector(".totalJour").textContent;
    const travaille = day.querySelector(".jourTravaille").checked ? "Oui" : "Non";
    const conge = day.querySelector(".congePaye").checked ? "Oui" : "Non";

    rows.push([nom, date.toLocaleDateString(), matinDebut, matinFin, apremDebut, apremFin, total, travaille, conge]);
  });

  const csv = rows.map(row => row.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `planning_${lundi.toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

remplirSelecteursMoisAnnee();
charger();