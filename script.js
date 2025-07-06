let semaineOffset = 0;

function formatDateComplete(date) {
  return date.toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long' });
}

function estJourFerie(date) {
  const joursFeries = [
    '01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'
  ];
  const mmjj = date.toISOString().slice(5, 10);
  return joursFeries.includes(mmjj);
}

function diffHeures(debut, fin) {
  if (!debut || !fin) return 0;
  const [hD, mD] = debut.split(':').map(Number);
  const [hF, mF] = fin.split(':').map(Number);
  let diff = (hF - hD) * 60 + (mF - mD);
  return diff > 0 ? diff / 60 : 0;
}

function formatHeure(h) {
  const heures = Math.floor(h);
  const minutes = Math.round((h - heures) * 60);
  return `${heures}h${minutes.toString().padStart(2, '0')}min`;
}

function getDateDuLundi(offset) {
  const now = new Date();
  const jour = now.getDay();
  const diff = (jour === 0 ? -6 : 1 - jour) + offset * 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
}

function saveWeek(lundi, data) {
  localStorage.setItem('semaine-' + lundi.toISOString().slice(0,10), JSON.stringify(data));
  localStorage.setItem('semaineOffset', semaineOffset);
}

function loadWeek(lundi) {
  const data = localStorage.getItem('semaine-' + lundi.toISOString().slice(0,10));
  if (data) return JSON.parse(data);
  return null;
}

function creerJour(date, data = {}) {
  const ferie = estJourFerie(date);
  const jourTrav = data.jourTravaille !== undefined ? data.jourTravaille : !ferie;
  const conge = data.congePaye || false;
  const div = document.createElement("div");
  div.className = "day" + (ferie ? " ferie" : "");
  div.innerHTML = `
    <h2>${formatDateComplete(date)}</h2>
    <div class="inputs">
      <label>Matin :</label><input type="time" class="debutMatin" value="${data.matinDebut || ""}" />
      <input type="time" class="finMatin" value="${data.matinFin || ""}" />
      <label>Après-midi :</label><input type="time" class="debutAprem" value="${data.apremDebut || ""}" />
      <input type="time" class="finAprem" value="${data.apremFin || ""}" />
    </div>
    <div class="checkboxes">
      <label><input type="checkbox" class="jourTravaille" ${jourTrav?"checked":""}/> Jour travaillé</label>
      <label><input type="checkbox" class="congePaye" ${conge?"checked":""}/> Congé payé</label>
    </div>
    <div class="note"><label>Note :</label><textarea class="noteJour" rows="2">${data.note || ""}</textarea></div>
    <div class="total">Total : <span class="totalJour">0h00min</span></div>
  `;

  const ct = div.querySelector(".jourTravaille");
  const cp = div.querySelector(".congePaye");
  const times = [...div.querySelectorAll("input[type=time]")];

  function majInputs() {
    const actif = ct.checked && !cp.checked;
    times.forEach(i => i.disabled = !actif);
  }

  ct.addEventListener("change", () => {
    if (ct.checked) cp.checked = false;
    majInputs();
    calculer();
  });

  cp.addEventListener("change", () => {
    if (cp.checked) ct.checked = false;
    majInputs();
    calculer();
  });

  times.forEach(i => i.addEventListener("change", calculer));

  majInputs();

  return div;
}

function afficherSemaine() {
  const container = document.getElementById("joursContainer");
  container.innerHTML = "";
  const lundi = getDateDuLundi(semaineOffset);
  const data = loadWeek(lundi) || [];
  for(let i=0; i<7; i++) {
    const d = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + i);
    const jourData = data[i] || {};
    container.appendChild(creerJour(d, jourData));
  }
  document.getElementById("semaineAffichee").textContent = `Semaine du ${lundi.toLocaleDateString("fr-FR")}`;
  calculer();
}

function calculer() {
  const days = [...document.querySelectorAll(".day")];
  let total=0, nFerieTrav=0, nConge=0;
  days.forEach(d => {
    const ct = d.querySelector(".jourTravaille").checked;
    const cp = d.querySelector(".congePaye").checked;
    const vals = ["debutMatin","finMatin","debutAprem","finAprem"]
      .map(cl => d.querySelector("."+cl).value);
    let h=0;
    if(cp){
      h = 7;
      nConge++;
    } else if(ct){
      h = diffHeures(vals[0],vals[1]) + diffHeures(vals[2],vals[3]);
      if (d.classList.contains("ferie")) nFerieTrav++;
    }
    total += h;
    d.querySelector(".totalJour").textContent = formatHeure(h);
  });

  const nFerie = days.filter(d => d.classList.contains("ferie")).length;
  const quota = 35 - 7 * (nFerie - nFerieTrav + nConge);

  document.getElementById("totalEffectue").textContent = formatHeure(total);
  document.getElementById("reste").textContent = formatHeure(Math.max(quota - total, 0));
  document.getElementById("nbTravail").textContent = days.filter(d => d.querySelector(".jourTravaille").checked).length;
  document.getElementById("nbConge").textContent = nConge;
  document.getElementById("nbFerie").textContent = nFerie - nFerieTrav;
  document.getElementById("nbFerieTrav").textContent = nFerieTrav;
  document.getElementById("quotaHebdo").textContent = formatHeure(quota);

  saveWeek(getDateDuLundi(semaineOffset), days.map(d => ({
    matinDebut: d.querySelector(".debutMatin").value,
    matinFin: d.querySelector(".finMatin").value,
    apremDebut: d.querySelector(".debutAprem").value,
    apremFin: d.querySelector(".finAprem").value,
    jourTravaille: d.querySelector(".jourTravaille").checked,
    congePaye: d.querySelector(".congePaye").checked,
    note: d.querySelector(".noteJour").value
  })));
}

document.getElementById("prevSemaine").addEventListener("click", () => {
  semaineOffset--;
  afficherSemaine();
});

document.getElementById("nextSemaine").addEventListener("click", () => {
  semaineOffset++;
  afficherSemaine();
});

window.addEventListener("load", () => {
  const savedOffset = localStorage.getItem('semaineOffset');
  if(savedOffset) semaineOffset = parseInt(savedOffset, 10);
  afficherSemaine();
});