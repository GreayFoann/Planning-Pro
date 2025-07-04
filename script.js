
const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const weekContainer = document.getElementById("week-container");

function createDayBlock(day) {
  const block = document.createElement("div");
  block.className = "day-block";

  block.innerHTML = \`
    <h2>\${day}</h2>
    <div class="input-pair">
      <input type="time" class="start1" placeholder="Début matin">
      <input type="time" class="end1" placeholder="Fin matin">
    </div>
    <div class="input-pair">
      <input type="time" class="start2" placeholder="Début après-midi">
      <input type="time" class="end2" placeholder="Fin après-midi">
    </div>
    <div class="total-display">Total : <span class="day-total">0</span> h</div>
  \`;

  block.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", updateTotals);
  });

  return block;
}

function updateTotals() {
  let totalWeek = 0;

  document.querySelectorAll(".day-block").forEach(dayBlock => {
    const s1 = dayBlock.querySelector(".start1").value;
    const e1 = dayBlock.querySelector(".end1").value;
    const s2 = dayBlock.querySelector(".start2").value;
    const e2 = dayBlock.querySelector(".end2").value;

    let total = 0;
    if (s1 && e1) total += timeDiff(s1, e1);
    if (s2 && e2) total += timeDiff(s2, e2);

    dayBlock.querySelector(".day-total").textContent = total.toFixed(2);
    totalWeek += total;
  });

  document.getElementById("totalHours").textContent = totalWeek.toFixed(2);
  document.getElementById("remainingHours").textContent = (35 - totalWeek).toFixed(2);
}

function timeDiff(start, end) {
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  return (h2 + m2/60) - (h1 + m1/60);
}

function exportCSV() {
  let csv = "Jour;Début matin;Fin matin;Début après-midi;Fin après-midi;Total\n";
  document.querySelectorAll(".day-block").forEach((block, i) => {
    const s1 = block.querySelector(".start1").value || "";
    const e1 = block.querySelector(".end1").value || "";
    const s2 = block.querySelector(".start2").value || "";
    const e2 = block.querySelector(".end2").value || "";
    const total = block.querySelector(".day-total").textContent || "0";
    csv += \`\${jours[i]};\${s1};\${e1};\${s2};\${e2};\${total}\n\`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "planning_hebdo.csv";
  a.click();
}

jours.forEach(jour => {
  weekContainer.appendChild(createDayBlock(jour));
});
