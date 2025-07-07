/* script.js */

// Configuration initiale
const defaultSettings = {
  planningName: "Mon planning",
  weeklyQuota: 35,
  firstDay: 1, // Lundi
};
let settings = { ...defaultSettings };

// Sauvegarde manuelle
let savedData = {};

// Utilitaires
const joursFeries = {
  "2025-01-01": "Jour de l'an",
  "2025-04-21": "Lundi de Pâques",
  "2025-05-01": "Fête du travail",
  "2025-05-08": "Victoire 1945",
  "2025-05-29": "Ascension",
  "2025-06-09": "Lundi de Pentecôte",
  "2025-07-14": "Fête nationale",
  "2025-08-15": "Assomption",
  "2025-11-01": "Toussaint",
  "2025-11-11": "Armistice",
  "2025-12-25": "Noël"
};

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function createSelectOptions(select, options, selectedValue) {
  select.innerHTML = "";
  options.forEach((opt, idx) => {
    const option = document.createElement("option");
    option.value = idx;
    option.textContent = opt;
    if (idx === selectedValue) option.selected = true;
    select.appendChild(option);
  });
}

function createDayElement(date, dayName) {
  const dayDiv = document.createElement("div");
  dayDiv.className = "day";
  const isoDate = formatDate(date);

  const isHoliday = joursFeries[isoDate];
  const dayId = isoDate;

  const stored = savedData[dayId] || {
    start: "",
    end: "",
    worked: !isHoliday,
    paidLeave: false,
    absence: false
  };

  const isDisabled = !stored.worked && !stored.paidLeave;

  if (isHoliday && !stored.worked) dayDiv.classList.add("disabled");

  const label = document.createElement("h3");
  label.textContent = `${dayName} ${date.getDate()}/${date.getMonth() + 1}`;
  dayDiv.appendChild(label);

  if (isHoliday) {
    const holidayInfo = document.createElement("p");
    holidayInfo.textContent = joursFeries[isoDate];
    holidayInfo.style.fontStyle = "italic";
    dayDiv.appendChild(holidayInfo);
  }

  const startInput = document.createElement("input");
  startInput.type = "time";
  startInput.value = stored.start;
  startInput.disabled = isDisabled;

  const endInput = document.createElement("input");
  endInput.type = "time";
  endInput.value = stored.end;
  endInput.disabled = isDisabled;

  const workedCheckbox = document.createElement("input");
  workedCheckbox.type = "checkbox";
  workedCheckbox.checked = stored.worked;
  workedCheckbox.id = `worked-${dayId}`;

  const paidLeaveCheckbox = document.createElement("input");
  paidLeaveCheckbox.type = "checkbox";
  paidLeaveCheckbox.checked = stored.paidLeave;
  paidLeaveCheckbox.id = `leave-${dayId}`;

  const absenceCheckbox = document.createElement("input");
  absenceCheckbox.type = "checkbox";
  absenceCheckbox.checked = stored.absence;
  absenceCheckbox.id = `absence-${dayId}`;

  const hoursDisplay = document.createElement("p");
  hoursDisplay.textContent = "0h";

  function updateDisplay() {
    let duration = 0;
    if (paidLeaveCheckbox.checked) {
      duration = 7;
    } else if (workedCheckbox.checked && startInput.value && endInput.value) {
      const [sh, sm] = startInput.value.split(":").map(Number);
      const [eh, em] = endInput.value.split(":").map(Number);
      duration = (eh * 60 + em - sh * 60 - sm) / 60;
    }
    hoursDisplay.textContent = duration.toFixed(2) + "h";
  }

  function updateState() {
    const worked = workedCheckbox.checked;
    const paidLeave = paidLeaveCheckbox.checked;
    const absence = absenceCheckbox.checked;

    if (paidLeave) {
      workedCheckbox.checked = false;
      absenceCheckbox.checked = false;
    } else if (absence) {
      paidLeaveCheckbox.checked = false;
      workedCheckbox.checked = false;
    } else if (worked) {
      paidLeaveCheckbox.checked = false;
      absenceCheckbox.checked = false;
    }

    const disabled = !(workedCheckbox.checked || paidLeaveCheckbox.checked);
    startInput.disabled = disabled;
    endInput.disabled = disabled;

    updateDisplay();
  }

  [startInput, endInput, workedCheckbox, paidLeaveCheckbox, absenceCheckbox].forEach(el =>
    el.addEventListener("input", updateState)
  );

  updateDisplay();
  updateState();

  dayDiv.appendChild(document.createTextNode("Début : "));
  dayDiv.appendChild(startInput);
  dayDiv.appendChild(document.createTextNode(" Fin : "));
  dayDiv.appendChild(endInput);
  dayDiv.appendChild(document.createElement("br"));

  dayDiv.appendChild(workedCheckbox);
  dayDiv.appendChild(document.createTextNode(" Jour travaillé "));

  dayDiv.appendChild(paidLeaveCheckbox);
  dayDiv.appendChild(document.createTextNode(" Congé payé "));

  dayDiv.appendChild(absenceCheckbox);
  dayDiv.appendChild(document.createTextNode(" Absence autre "));

  dayDiv.appendChild(hoursDisplay);
  dayDiv.dataset.date = isoDate;

  return dayDiv;
}

function renderWeek(startDate) {
  const view = document.getElementById("weeklyView");
  view.innerHTML = "";

  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const week = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    week.push(d);
  }

  week.forEach(date => {
    const dayName = days[date.getDay()];
    const dayEl = createDayElement(date, dayName);
    view.appendChild(dayEl);
  });
}

function getCurrentWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - settings.firstDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

// Initialisation
function init() {
  // Charger paramètres
  Object.assign(settings, JSON.parse(localStorage.getItem("settings")) || {});
  document.getElementById("planningName").textContent = settings.planningName;

  const now = new Date();
  const startOfWeek = getCurrentWeekStart(now);
  renderWeek(startOfWeek);
}

document.addEventListener("DOMContentLoaded", init);
