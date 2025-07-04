const calendarEl = document.getElementById('calendar');
const monthLabel = document.getElementById('monthLabel');
const WEEKLY_TARGET_MINUTES = 35 * 60;

let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

function getHolidays(year) {
    return [
        `${year}-01-01`, `${year}-05-01`, `${year}-05-08`,
        `${year}-07-14`, `${year}-08-15`, `${year}-11-01`,
        `${year}-11-11`, `${year}-12-25`
    ];
}

function saveData(dateStr, matin, aprem) {
    const data = JSON.parse(localStorage.getItem("planningData") || "{}");
    data[dateStr] = { matin, aprem };
    localStorage.setItem("planningData", JSON.stringify(data));
}

function loadData() {
    return JSON.parse(localStorage.getItem("planningData") || "{}");
}

function timeStrToMinutes(str) {
    if (!str) return 0;
    const [h, m] = str.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

function minutesToStr(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h + "h" + (m < 10 ? "0" : "") + m;
}

function changeMonth(offset) {
    currentMonth += offset;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

function exportCSV() {
    const data = loadData();
    let csv = "Date,Jour,Matin,Après-midi,Total\n";
    for (const dateStr in data) {
        const d = new Date(dateStr);
        const matin = data[dateStr].matin || "";
        const aprem = data[dateStr].aprem || "";
        const totalMin = timeStrToMinutes(matin) + timeStrToMinutes(aprem);
        csv += `${dateStr},${d.toLocaleDateString("fr-FR", { weekday: "long" })},${matin},${aprem},${minutesToStr(totalMin)}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "planning.csv";
    link.click();
}

function renderCalendar() {
    calendarEl.innerHTML = "";
    const data = loadData();
    const holidays = getHolidays(currentYear);
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    monthLabel.textContent = firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    let currentWeek = -1;
    let weekTotal = 0;

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const weekday = d.getDay();
        const weekNumber = getWeekNumber(d);
        const isWeekend = (weekday === 0 || weekday === 6);
        const isHoliday = holidays.includes(dateStr);

        if (weekNumber !== currentWeek) {
            if (currentWeek !== -1) {
                const summary = document.createElement("div");
                summary.className = "week-summary";
                summary.textContent = `Total semaine ${currentWeek} : ${minutesToStr(weekTotal)} / 35h`;
                calendarEl.appendChild(summary);
            }
            currentWeek = weekNumber;
            weekTotal = 0;
        }

        const dayDiv = document.createElement("div");
        dayDiv.className = "day";
        if (isWeekend) dayDiv.classList.add("weekend");
        if (isHoliday) dayDiv.classList.add("holiday");

        const label = document.createElement("div");
        label.textContent = d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" });
        dayDiv.appendChild(label);

        const inputsDiv = document.createElement("div");
        inputsDiv.className = "inputs";

        const matinInput = document.createElement("input");
        matinInput.type = "time";
        matinInput.value = data[dateStr]?.matin || "";

        const apremInput = document.createElement("input");
        apremInput.type = "time";
        apremInput.value = data[dateStr]?.aprem || "";

        matinInput.onchange = () => saveData(dateStr, matinInput.value, apremInput.value);
        apremInput.onchange = () => saveData(dateStr, matinInput.value, apremInput.value);

        inputsDiv.appendChild(document.createTextNode("Matin : "));
        inputsDiv.appendChild(matinInput);
        inputsDiv.appendChild(document.createTextNode(" Après-midi : "));
        inputsDiv.appendChild(apremInput);

        dayDiv.appendChild(inputsDiv);

        const totalMin = timeStrToMinutes(matinInput.value) + timeStrToMinutes(apremInput.value);
        weekTotal += totalMin;

        calendarEl.appendChild(dayDiv);
    }

    const summary = document.createElement("div");
    summary.className = "week-summary";
    summary.textContent = `Total semaine ${currentWeek} : ${minutesToStr(weekTotal)} / 35h`;
    calendarEl.appendChild(summary);
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

renderCalendar();
