const joursFeriesFrance = (annee) => {
  const paques = (y) => {
    const f = Math.floor;
    const G = y % 19;
    const C = f(y / 100);
    const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
    const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
    const J = (y + f(y / 4) + I + 2 - C + f(C / 4)) % 7;
    const L = I - J;
    const mois = 3 + f((L + 40) / 44);
    const jour = L + 28 - 31 * f(mois / 4);
    return new Date(y, mois - 1, jour);
  };

  const datePaques = paques(annee);
  const jours = [
    new Date(annee, 0, 1), // Jour de l'an
    new Date(annee, 4, 1), // Fête du travail
    new Date(annee, 4, 8), // Victoire 1945
    datePaques,
    new Date(datePaques.getFullYear(), datePaques.getMonth(), datePaques.getDate() + 1), // Lundi de Pâques
    new Date(annee, 6, 14), // Fête nationale
    new Date(annee, 7, 15), // Assomption
    new Date(annee, 10, 1), // Toussaint
    new Date(annee, 10, 11), // Armistice
    new Date(annee, 11, 25), // Noël
    new Date(datePaques.getFullYear(), datePaques.getMonth(), datePaques.getDate() + 39), // Ascension
    new Date(datePaques.getFullYear(), datePaques.getMonth(), datePaques.getDate() + 50) // Pentecôte
  ];
  return jours.map(d => d.toDateString());
};

let currentDate = new Date();
let currentWeekOffset = 0;
const heuresSemaine = 35;

const moisSelect = document.getElementById("mois");
const anneeSelect = document.getElementById("annee");

for (let i = 0; i < 12; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.text = new Date(0, i).toLocaleString("fr", { month: "long" });
  moisSelect.appendChild(option);
}

for (let i = 2020; i <= 2030; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.text = i;
  anneeSelect.appendChild(option);
}

function allerAuMois() {
  const mois = parseInt(moisSelect.value);
  const annee = parseInt(anneeSelect.value);
  const date = new Date(annee, mois, 1);
  const dayOfWeek = date.getDay();
  const offset = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  currentDate = new Date(annee, mois, 1 + offset);
  currentWeekOffset = 0;
  genererPlanning();
}

function changerSemaine(offset) {
  currentWeekOffset += offset;
  const nouvelleDate = new Date(currentDate);
  nouvelleDate.setDate(nouvelleDate.getDate() + currentWeekOffset * 7);
  currentDate = nouvelleDate;
  genererPlanning();
}

function genererPlanning() {
  const planning = document.getElementById("planning");
  planning.innerHTML = "";

  const semaineDebut = new Date(currentDate);
  const semaineFin = new Date(semaineDebut);
  semaineFin.setDate(semaineDebut.getDate() + 6);

  const periode = document.getElementById("periodeSemaine");
  periode.textContent = `Semaine du ${formatDate(semaineDebut)} au ${formatDate(semaineFin)}`;

  const joursFeries = joursFeriesFrance(semaineDebut.getFullYear());

  let totalMinutes = 0;
  let heuresAttendue = heuresSemaine * 60;

  for (let i = 0; i < 7; i++) {
    const jourDate = new Date(semaineDebut);
    jourDate.setDate(jourDate.getDate() + i);
    const jourNom = jourDate.toLocaleDateString("fr", { weekday: "long" });
    const jourStr = `${jourNom} ${formatDate(jourDate)}`;
    const jourISO = jourDate.toDateString();

    const dayDiv = document.createElement("div");
    dayDiv.className = "day";
    const isFerie = joursFeries.includes(jourISO);

    const jourTravailleCheckbox = document.createElement("input");
    jourTravailleCheckbox.type = "checkbox";
    jourTravailleCheckbox.id = `travaille-${jourISO}`;

    if (isFerie) {
      dayDiv.classList.add("ferie");
      heuresAttendue -= 420; // 7h x 60min
    }

    const title = document.createElement("h2");
    title.textContent = jourStr;
    dayDiv.appendChild(title);

    const inputs = document.createElement("div");
    inputs.className = "inputs";

    const debutMatin = creerInput("Début matin", `debutMatin-${jourISO}`);
    const finMatin = creerInput("Fin matin", `finMatin-${jourISO}`);
    const debutAprem = creerInput("Début après-midi", `debutAprem-${jourISO}`);
    const finAprem = creerInput("Fin après-midi", `finAprem-${jourISO}`);

    inputs.appendChild(debutMatin.label);
    inputs.appendChild(debutMatin.input);
    inputs.appendChild(finMatin.label);
    inputs.appendChild(finMatin.input);
    inputs.appendChild(debutAprem.label);
    inputs.appendChild(debutAprem.input);
    inputs.appendChild(finAprem.label);
    inputs.appendChild(finAprem.input);

    const checkboxLabel = document.createElement("label");
    checkboxLabel.textContent = "Jour travaillé";
    checkboxLabel.appendChild(jourTravailleCheckbox);
    inputs.appendChild(checkboxLabel);

    [debutMatin.input, finMatin.input, debutAprem.input, finAprem.input, jourTravailleCheckbox]
      .forEach(el => el.addEventListener("input", calculerTotaux));

    dayDiv.appendChild(inputs);

    const total = document.createElement("div");
    total.className = "total";
    total.id = `total-${jourISO}`;
    dayDiv.appendChild(total);

    planning.appendChild(dayDiv);
  }

  calculerTotaux();
}

function creerInput(labelText, id) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "time";
  input.id = id;
  return { label, input };
}

function calculerTotaux() {
  const semaineDebut = new Date(currentDate);
  const joursFeries = joursFeriesFrance(semaineDebut.getFullYear());
  let totalMinutes = 0;
  let heuresAttendue = heuresSemaine * 60;

  for (let i = 0; i < 7; i++) {
    const jourDate = new Date(semaineDebut);
    jourDate.setDate(jourDate.getDate() + i);
    const jourISO = jourDate.toDateString();
    const isFerie = joursFeries.includes(jourISO);
    const checkbox = document.getElementById(`travaille-${jourISO}`);
    const jourTravaille = checkbox?.checked;

    const getTime = (id) => {
      const val = document.getElementById(id)?.value;
      if (!val) return null;
      const [h, m] = val.split(":").map(Number);
      return h * 60 + m;
    };

    let totalJour = 0;
    const matinDebut = getTime(`debutMatin-${jourISO}`);
    const matinFin = getTime(`finMatin-${jourISO}`);
    const apremDebut = getTime(`debutAprem-${jourISO}`);
    const apremFin = getTime(`finAprem-${jourISO}`);

    if (matinDebut !== null && matinFin !== null && matinFin > matinDebut) {
      totalJour += matinFin - matinDebut;
    }
    if (apremDebut !== null && apremFin !== null && apremFin > apremDebut) {
      totalJour += apremFin - apremDebut;
    }

    totalMinutes += totalJour;

    const totalEl = document.getElementById(`total-${jourISO}`);
    totalEl.textContent = `Total: ${formatHeure(totalJour)}`;

    const dayDiv = totalEl.closest(".day");
    if (isFerie && !jourTravaille) {
      dayDiv.classList.add("ferie");
      heuresAttendue -= 420; // 7h x 60min
    } else {
      dayDiv.classList.remove("ferie");
    }
  }

  document.getElementById("totalEffectue").textContent = formatHeure(totalMinutes);
  const reste = Math.max(0, heuresAttendue - totalMinutes);
  document.getElementById("reste").textContent = formatHeure(reste);
}

function formatDate(date) {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatHeure(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}min`;
}

function exportCSV() {
  let csv = "Jour;Début Matin;Fin Matin;Début Après-midi;Fin Après-midi;Jour travaillé;Total journalier\n";
  const semaineDebut = new Date(currentDate);
  for (let i = 0; i < 7; i++) {
    const jourDate = new Date(semaineDebut);
    jourDate.setDate(jourDate.getDate() + i);
    const jourISO = jourDate.toDateString();
    const nom = jourDate.toLocaleDateString("fr", { weekday: "long", day: "2-digit", month: "long" });

    const get = (id) => document.getElementById(id)?.value || "";

    const jourTravaille = document.getElementById(`travaille-${jourISO}`)?.checked ? "Oui" : "Non";
    const total = document.getElementById(`total-${jourISO}`)?.textContent?.replace("Total: ", "") || "";

    csv += `${nom};${get(`debutMatin-${jourISO}`)};${get(`finMatin-${jourISO}`)};${get(`debutAprem-${jourISO}`)};${get(`finAprem-${jourISO}`)};${jourTravaille};${total}\n`;
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "planning.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();
  moisSelect.value = now.getMonth();
  anneeSelect.value = now.getFullYear();
  genererPlanning();
});
