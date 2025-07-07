const defaultSettings = {
  planningName: "Mon planning",
  weeklyQuota: 35,
  firstDay: 1,
  theme: "auto"
};

let settings = { ...defaultSettings };
let savedData = JSON.parse(localStorage.getItem("planningData") || "{}");
let currentDate = new Date();

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

function getCurrentWeekStart(date = new Date()) {
  const d = new Date(date);
  const diff = (d.getDay() - settings.firstDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function createDayElement(date, dayName) {
  const iso = formatDate(date);
  const stored = savedData[iso] || {
    start: "",
    end: "",
    worked: true,
    paidLeave: false,
    absence: false,
    telework: false,
    note: ""
  };

  const isHoliday = !!joursFeries[iso];
  const disabled = !stored.worked && !stored.paidLeave;

  const div = document.createElement("div");
  div.className = "day";
  if (isHoliday && !stored.worked) div.classList.add("disabled");

  const label = document.createElement("h3");
  label.textContent = `${dayName} ${date.getDate()}/${date.getMonth() + 1}`;
  div.appendChild(label);

  if (isHoliday) {
    const p = document.createElement("p");
    p.textContent = joursFeries[iso];
    p.style.fontStyle = "italic";
    div.appendChild(p);
  }

  const start = document.createElement("input");
  start.type = "time";
  start.value = stored.start;
  start.disabled = disabled;

  const end = document.createElement("input");
  end.type = "time";
  end.value = stored.end;
  end.disabled = disabled;

  const worked = document.createElement("input");
  worked.type = "checkbox";
  worked.checked = stored.worked;

  const paid = document.createElement("input");
  paid.type = "checkbox";
  paid.checked = stored.paidLeave;

  const absence = document.createElement("input");
  absence.type = "checkbox";
  absence.checked = stored.absence;

  const telework = document.createElement("input");
  telework.type = "checkbox";
  telework.checked = stored.telework;

  const note = document.createElement("textarea");
  note.placeholder = "Note...";
  note.value = stored.note;

  const hoursDisplay = document.createElement("p");

  function updateDisplay() {
    let hours = 0;
    if (paid.checked) hours = 7;
    else if (worked.checked && start.value && end.value) {
      const [sh, sm] = start.value.split(":").map(Number);
      const [eh, em] = end.value.split(":").map(Number);
      hours = (eh * 60 + em - sh * 60 - sm) / 60;
    }
    hoursDisplay.textContent = `Total : ${hours.toFixed(2)}h`;
  }

  function updateState() {
    if (paid.checked) {
      worked.checked = false;
      absence.checked = false;
    } else if (absence.checked) {
      worked.checked = false;
      paid.checked = false;
    } else if (worked.checked) {
      paid.checked = false;
      absence.checked = false;
    }

    const isDisabled = !(worked.checked || paid.checked);
    start.disabled = isDisabled;
    end.disabled = isDisabled;

    updateDisplay();
    computeTotals();
  }

  [start, end, worked, paid, absence, telework, note].forEach(el =>
    el.addEventListener("input", () => {
      savedData[iso] = {
        start: start.value,
        end: end.value,
        worked: worked.checked,
        paidLeave: paid.checked,
        absence: absence.checked,
        telework: telework.checked,
        note: note.value
      };
      updateState();
    })
  );

  updateState();

  div.append("Début : ", start, " Fin : ", end, document.createElement("br"));
  div.append(worked, " Jour travaillé ");
  div.append(paid, " Congé payé ");
  div.append(absence, " Absence autre ");
  div.append(telework, " Télétravail ");
  div.appendChild(document.createElement("br"));
  div.append(hoursDisplay);
  div.append(note);
  div.dataset.date = iso;

  return div;
}

function renderWeek(date) {
  const start = getCurrentWeekStart(date);
  const weeklyView = document.getElementById("weeklyView");
  weeklyView.innerHTML = "";

  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dayEl = createDayElement(d, days[d.getDay()]);
    weeklyView.appendChild(dayEl);
  }

  updateMonthYearSelectors(start);
  computeTotals();
}

function updateMonthYearSelectors(date) {
  const monthSelect = document.getElementById("monthSelect");
  const yearSelect = document.getElementById("yearSelect");

  if (monthSelect) monthSelect.value = date.getMonth();
  if (yearSelect) yearSelect.value = date.getFullYear();
}

function computeTotals() {
  const weekEls = document.querySelectorAll(".day");
  let weekTotal = 0, monthTotal = 0, yearTotal = 0, workedDays = 0;

  for (const el of weekEls) {
    const dateStr = el.dataset.date;
    const data = savedData[dateStr];
    if (!data) continue;

    let hours = 0;
    if (data.paidLeave) hours = 7;
    else if (data.worked && data.start && data.end) {
      const [sh, sm] = data.start.split(":").map(Number);
      const [eh, em] = data.end.split(":").map(Number);
      hours = (eh * 60 + em - sh * 60 - sm) / 60;
    }

    if (data.worked || data.paidLeave) workedDays++;
    weekTotal += hours;
  }

  const allDates = Object.keys(savedData);
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  for (const dateStr of allDates) {
    const data = savedData[dateStr];
    const d = new Date(dateStr);
    let h = 0;
    if (data.paidLeave) h = 7;
    else if (data.worked && data.start && data.end) {
      const [sh, sm] = data.start.split(":").map(Number);
      const [eh, em] = data.end.split(":").map(Number);
      h = (eh * 60 + em - sh * 60 - sm) / 60;
    }
    if (d.getFullYear() === year) yearTotal += h;
    if (d.getMonth() === month && d.getFullYear() === year) monthTotal += h;
  }

  document.getElementById("weeklyTotal").textContent = weekTotal.toFixed(2) + "h";
  document.getElementById("monthlyTotal").textContent = monthTotal.toFixed(2) + "h";
  document.getElementById("yearlyTotal").textContent = yearTotal.toFixed(2) + "h";
  document.getElementById("workedDays").textContent = workedDays;
  document.getElementById("weeklyQuotaDisplay").textContent = settings.weeklyQuota + "h";
}

function saveData() {
  localStorage.setItem("planningData", JSON.stringify(savedData));
  localStorage.setItem("settings", JSON.stringify(settings));
  localStorage.setItem("lastDate", formatDate(currentDate));
}

function resetData() {
  if (confirm("Tout réinitialiser ?")) {
    savedData = {};
    renderWeek(currentDate);
  }
}

function applySettings() {
  document.getElementById("planningName").textContent = settings.planningName;
  document.getElementById("weeklyQuotaInput").value = settings.weeklyQuota;
  document.getElementById("planningTitleInput").value = settings.planningName;
  document.getElementById("firstDaySelect").value = settings.firstDay;
  document.getElementById("themeSelect").value = settings.theme;
  applyTheme();
}

function applyTheme() {
  let theme = settings.theme;
  if (theme === "auto") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = dark ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
}

function exportCSV() {
  const rows = [["Date", "Début", "Fin", "Travaillé", "Congé", "Absence", "Télétravail", "Note"]];
  for (const [date, d] of Object.entries(savedData)) {
    rows.push([
      date, d.start, d.end,
      d.worked ? "Oui" : "Non",
      d.paidLeave ? "Oui" : "Non",
      d.absence ? "Oui" : "Non",
      d.telework ? "Oui" : "Non",
      d.note.replace(/\n/g, " ")
    ]);
  }
  const csv = rows.map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "planning.csv";
  a.click();
}

function importCSV(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split("\n").slice(1);
    lines.forEach(line => {
      const [date, start, end, worked, paid, abs, tele, note] = line.split(";");
      if (!date) return;
      savedData[date] = {
        start,
        end,
        worked: worked === "Oui",
        paidLeave: paid === "Oui",
        absence: abs === "Oui",
        telework: tele === "Oui",
        note: note || ""
      };
    });
    renderWeek(currentDate);
  };
  reader.readAsText(file);
}

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  Object.assign(settings, JSON.parse(localStorage.getItem("settings")) || defaultSettings);
  currentDate = new Date(localStorage.getItem("lastDate") || new Date());
  applySettings();
  renderWeek(currentDate);

  document.getElementById("saveBtn").addEventListener("click", saveData);
  document.getElementById("cancelBtn").addEventListener("click", resetData);
  document.getElementById("exportBtn").addEventListener("click", exportCSV);
  document.getElementById("importInput").addEventListener("change", e => importCSV(e.target.files[0]));
  document.getElementById("prevWeek").addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 7);
    renderWeek(currentDate);
  });
  document.getElementById("nextWeek").addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 7);
    renderWeek(currentDate);
  });

  document.getElementById("settingsBtn").addEventListener("click", () => {
    document.getElementById("settingsDialog").showModal();
  });

  document.getElementById("settingsDialog").addEventListener("close", e => {
    const val = e.target.returnValue;
    if (val === "confirm") {
      settings.planningName = document.getElementById("planningTitleInput").value;
      settings.weeklyQuota = Number(document.getElementById("weeklyQuotaInput").value);
      settings.firstDay = Number(document.getElementById("firstDaySelect").value);
      settings.theme = document.getElementById("themeSelect").value;
      renderWeek(currentDate);
      applySettings();
    } else if (val === "default") {
      settings = { ...defaultSettings };
      applySettings();
      renderWeek(currentDate);
    }
  });

  document.getElementById("themeSelect").addEventListener("change", e => {
    settings.theme = e.target.value;
    applyTheme();
  });

  document.getElementById("searchInput").addEventListener("input", e => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll(".day").forEach(day => {
      const text = day.textContent.toLowerCase();
      day.style.display = text.includes(query) ? "" : "none";
    });
  });

  for (let m = 0; m < 12; m++) {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = new Date(2000, m, 1).toLocaleString("fr", { month: "long" });
    document.getElementById("monthSelect").appendChild(option);
  }

  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 3; y <= currentYear + 3; y++) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    document.getElementById("yearSelect").appendChild(option);
  }

  document.getElementById("monthSelect").addEventListener("change", e => {
    currentDate.setMonth(Number(e.target.value));
    renderWeek(currentDate);
  });

  document.getElementById("yearSelect").addEventListener("change", e => {
    currentDate.setFullYear(Number(e.target.value));
    renderWeek(currentDate);
  });
});