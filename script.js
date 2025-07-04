
const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const planning = document.getElementById("planning");

function creerJour(nom) {
  const container = document.createElement("div");
  container.className = "day";

  container.innerHTML = `
    <h2>${nom}</h2>
    <div class="inputs">
      <label>Matin :</label>
      <input type="time" class="debutMatin" />
      <input type="time" class="finMatin" />
      <label>Après-midi :</label>
      <input type="time" class="debutAprem" />
      <input type="time" class="finAprem" />
    </div>
    <div class="total">Total : <span class="totalJour">0</span> h</div>
  `;

  container.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", calculerTotaux);
  });

  return container;
}

function diffHeures(h1, h2) {
  if (!h1 || !h2) return 0;
  const [h1h, h1m] = h1.split(":").map(Number);
  const [h2h, h2m] = h2.split(":").map(Number);
  return ((h2h * 60 + h2m) - (h1h * 60 + h1m)) / 60;
}

function calculerTotaux() {
  let totalSemaine = 0;

  document.querySelectorAll(".day").forEach(jour => {
    const matinDebut = jour.querySelector(".debutMatin").value;
    const matinFin = jour.querySelector(".finMatin").value;
    const apremDebut = jour.querySelector(".debutAprem").value;
    const apremFin = jour.querySelector(".finAprem").value;

    const matin = diffHeures(matinDebut, matinFin);
    const aprem = diffHeures(apremDebut, apremFin);
    const totalJour = matin + aprem;

    jour.querySelector(".totalJour").textContent = totalJour.toFixed(2);
    totalSemaine += totalJour;
  });

  document.getElementById("totalEffectue").textContent = totalSemaine.toFixed(2);
  document.getElementById("reste").textContent = (35 - totalSemaine).toFixed(2);
}

function exportCSV() {
  let csv = "Jour;Début matin;Fin matin;Début après-midi;Fin après-midi;Total\\n";
  document.querySelectorAll(".day").forEach((jour, i) => {
    const s1 = jour.querySelector(".debutMatin").value || "";
    const e1 = jour.querySelector(".finMatin").value || "";
    const s2 = jour.querySelector(".debutAprem").value || "";
    const e2 = jour.querySelector(".finAprem").value || "";
    const total = jour.querySelector(".totalJour").textContent || "0";
    csv += `${jours[i]};${s1};${e1};${s2};${e2};${total}\\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "planning_hebdo.csv";
  a.click();
}

// Génération des jours
jours.forEach(jour => {
  planning.appendChild(creerJour(jour));
});
