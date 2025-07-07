// Configuration initiale
const defaultSettings = {
  planningName: "Mon planning",
  weeklyQuota: 35,
  firstDay: 1 // Lundi
};
let settings = { ...defaultSettings };
let savedData = {}; // Données du planning

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

function parseTimeToHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

function createDayElement(date) {
  const iso = formatDate(date);
  const isHoliday = joursFeries[iso];
  const dayData = savedData[iso] || {
    start: "",
    end: "",
    worked: !isHoliday,
    paidLeave: false,
    absence: false
  };

  const div = document.createElement("div");
  div.className = "day";
  if (isHoliday && !dayData.worked) div.classList.add("disabled");

  const label = document.createElement("h3");
  label.textContent = `${date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`;
  div.appendChild(label);

  if (isHoliday) {
    const p = document.createElement("p");
    p.textContent = joursFeries[iso];
    p.style.fontStyle = "italic";
    div.appendChild(p);
  }

  const startInput = document.createElement("input");
  startInput.type = "time";
  startInput.value = dayData.start;

  const endInput = document.createElement("input");
  endInput.type = "time";
  endInput.value = dayData.end;

  const workedCheckbox = document.createElement("input");
  workedCheckbox.type = "checkbox";
  workedCheckbox.checked = dayData.worked;

  const paidLeaveCheckbox = document.createElement("input");
  paidLeaveCheckbox.type = "checkbox";
  paidLeaveCheckbox.checked = dayData.paidLeave;

  const absenceCheckbox = document.createElement("input");
  absenceCheckbox.type = "checkbox";
  absenceCheckbox.checked = dayData.absence;

  const hoursP = document.createElement("p");

  function updateFields() {
    const worked = workedCheckbox.checked;
    const leave = paidLeaveCheckbox.checked;
    const absence = absenceCheckbox.checked;

    if (leave) {
      workedCheckbox.checked = false;
      absenceCheckbox.checked = false;
    } else if (absence) {
      workedCheckbox.checked = false;
      paidLeaveCheckbox.checked = false;
    } else if (worked) {
      paidLeaveCheckbox.checked = false;
      absenceCheckbox.checked = false;
    }

    startInput.disabled = !(workedCheckbox.checked);
    endInput.disabled = !(workedCheckbox.checked);

    const hours = paidLeaveCheckbox.checked
      ? 7
      : workedCheckbox.checked
        ? parseTimeToHours(startInput.value, endInput.value)
        : 0;

    hoursP.textContent = `Heures : ${hours.toFixed(2)}h`;

    savedData[iso] = {
      start: startInput.value,
      end: endInput.value,
      worked: workedCheckbox.checked,
      paidLeave: paidLeaveCheckbox.checked,
      absence: absenceCheckbox.checked
    };

    calculateTotals();
  }

  [startInput, endInput, workedCheckbox, paidLeaveCheckbox, absenceCheckbox].forEach(input =>
    input.addEventListener("input", updateFields)
  );

  updateFields();

  div.append("Début : ", startInput, " Fin : ", endInput, document.createElement("br"));
  div.append(workedCheckbox, " Jour travaillé ");
  div.append(paidLeaveCheckbox, " Congé payé ");
  div.append(absenceCheckbox, " Absence autre ");
  div.appendChild(hoursP);

  return div;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - settings.firstDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function renderWeek(date) {
  const weekStart = getWeekStart(date);
  const weeklyView = document.getElementById("weeklyView");
  weeklyView.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const current = new Date(weekStart);
    current.setDate(weekStart.getDate() + i);
    const el = createDayElement(current);
    weeklyView.appendChild(el);
  }

  localStorage.setItem("lastWeek", weekStart.toISOString());
}

function populateSelectors() {
  const now = new Date();
  const monthSelect = document.getElementById("monthSelect");
  const yearSelect = document.getElementById("yearSelect");

  const months = [...Array(12).keys()].map(m => new Date(2000, m).toLocaleString("fr-FR", { month: "long" }));
  months.forEach((m, i) => {
    const opt = new Option(m, i);
    if (i === now.getMonth()) opt.selected = true;
    monthSelect.appendChild(opt);
  });

  for (let y = 2023; y <= 2030; y++) {
    const opt = new Option(y, y);
    if (y === now.getFullYear()) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  function updateView() {
    const d = new Date(yearSelect.value, monthSelect.value, 1);
    renderWeek(getWeekStart(d));
  }

  monthSelect.addEventListener("change", updateView);
  yearSelect.addEventListener("change", updateView);
}

function calculateTotals() {
  let weekly = 0, monthly = 0, yearly = 0, workedDays = 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  for (const [dateStr, data] of Object.entries(savedData)) {
    const d = new Date(dateStr);
    let hours = 0;
    if (data.paidLeave) hours = 7;
    else if (data.worked) hours = parseTimeToHours(data.start, data.end);

    if (data.paidLeave || data.worked) workedDays++;

    if (d.getFullYear() === currentYear) {
      yearly += hours;
      if (d.getMonth() === currentMonth) monthly += hours;
    }
  }

  // recalculer la semaine visible
  const dayEls = document.querySelectorAll("#weeklyView .day");
  dayEls.forEach(day => {
    const date = day.dataset.date;
    const d = new Date(date);
    const data = savedData[date];
    if (data) {
      if (data.paidLeave) weekly += 7;
      else if (data.worked) weekly += parseTimeToHours(data.start, data.end);
    }
  });

  document.getElementById("weeklyTotal").textContent = `${weekly.toFixed(2)}h`;
  document.getElementById("monthlyTotal").textContent = `${monthly.toFixed(2)}h`;
  document.getElementById("yearlyTotal").textContent = `${yearly.toFixed(2)}h`;
  document.getElementById("workedDays").textContent = workedDays;
}

function savePlanning() {
  localStorage.setItem("planningData", JSON.stringify(savedData));
  localStorage.setItem("settings", JSON.stringify(settings));
  alert("Planning sauvegardé !");
}

function cancelChanges() {
  const lastSaved = JSON.parse(localStorage.getItem("planningData")) || {};
  savedData = lastSaved;
  const d = new Date(document.getElementById("yearSelect").value, document.getElementById("monthSelect").value, 1);
  renderWeek(getWeekStart(d));
}

function exportCSV() {
  let csv = "Date,Début,Fin,Travail,Congé payé,Absence\n";
  for (const [date, d] of Object.entries(savedData)) {
    csv += `${date},${d.start},${d.end},${d.worked ? "Oui" : "Non"},${d.paidLeave ? "Oui" : "Non"},${d.absence ? "Oui" : "Non"}\n`;
  }
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "planning.csv";
  link.click();
}

function initSettingsDialog() {
  const btn = document.getElementById("settingsBtn");
  const dialog = document.getElementById("settingsDialog");

  btn.addEventListener("click", () => {
    document.getElementById("planningTitleInput").value = settings.planningName;
    document.getElementById("weeklyQuotaInput").value = settings.weeklyQuota;
    document.getElementById("firstDaySelect").value = settings.firstDay;
    dialog.showModal();
  });

  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "confirm") {
      settings.planningName = document.getElementById("planningTitleInput").value;
      settings.weeklyQuota = parseInt(document.getElementById("weeklyQuotaInput").value, 10);
      settings.firstDay = parseInt(document.getElementById("firstDaySelect").value, 10);
      document.getElementById("planningName").textContent = settings.planningName;
      renderWeek(getWeekStart(new Date()));
    } else if (dialog.returnValue === "default") {
      settings = { ...defaultSettings };
      document.getElementById("planningName").textContent = settings.planningName;
      renderWeek(getWeekStart(new Date()));
    }
  });
}

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  settings = { ...defaultSettings, ...JSON.parse(localStorage.getItem("settings")) };
  savedData = JSON.parse(localStorage.getItem("planningData")) || {};
  document.getElementById("planningName").textContent = settings.planningName;

  populateSelectors();
  const lastDate = localStorage.getItem("lastWeek");
  renderWeek(getWeekStart(lastDate ? new Date(lastDate) : new Date()));

  initSettingsDialog();

  document.getElementById("saveBtn").addEventListener("click", savePlanning);
  document.getElementById("cancelBtn").addEventListener("click", cancelChanges);
  document.getElementById("exportBtn").addEventListener("click", exportCSV);
});