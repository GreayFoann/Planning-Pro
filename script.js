const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const joursFeries = {
  2025: {
    '2025-01-01': 'Jour de l’an',
    '2025-04-21': 'Lundi de Pâques',
    '2025-05-01': 'Fête du Travail',
    '2025-05-08': 'Victoire 1945',
    '2025-05-29': 'Ascension',
    '2025-06-09': 'Lundi de Pentecôte',
    '2025-07-14': 'Fête nationale',
    '2025-08-15': 'Assomption',
    '2025-11-01': 'Toussaint',
    '2025-11-11': 'Armistice',
    '2025-12-25': 'Noël'
  }
};

let selectedDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadLastSelectedDate();
  populateSelectors();
  document.getElementById('toggleTheme').addEventListener('click', toggleTheme);
  document.getElementById('mois').addEventListener('change', updateFromSelectors);
  document.getElementById('annee').addEventListener('change', updateFromSelectors);
  document.getElementById('prevWeek').addEventListener('click', () => navigateWeek(-1));
  document.getElementById('nextWeek').addEventListener('click', () => navigateWeek(1));
  document.getElementById('exportCsv').addEventListener('click', exportToCSV);
  updatePlanning();
});

function loadTheme() {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark') document.body.classList.add('dark');
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function populateSelectors() {
  const moisSelect = document.getElementById('mois');
  const anneeSelect = document.getElementById('annee');
  mois.forEach((m, i) => moisSelect.innerHTML += `<option value="${i}">${m}</option>`);
  for (let y = 2020; y <= 2030; y++) {
    anneeSelect.innerHTML += `<option value="${y}">${y}</option>`;
  }
  moisSelect.value = selectedDate.getMonth();
  anneeSelect.value = selectedDate.getFullYear();
}

function updateFromSelectors() {
  const mois = parseInt(document.getElementById('mois').value);
  const annee = parseInt(document.getElementById('annee').value);
  const date = new Date(annee, mois, 1);
  selectedDate = getMonday(date);
  saveLastSelectedDate();
  updatePlanning();
}

function navigateWeek(offset) {
  selectedDate.setDate(selectedDate.getDate() + offset * 7);
  saveLastSelectedDate();
  updateSelectorsFromDate();
  updatePlanning();
}

function updateSelectorsFromDate() {
  document.getElementById('mois').value = selectedDate.getMonth();
  document.getElementById('annee').value = selectedDate.getFullYear();
}

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

function updatePlanning() {
  const planning = document.getElementById('planning');
  planning.innerHTML = '';
  let totalHeures = 0;
  let joursTravailles = 0;
  let joursConges = 0;
  let quotaSemaine = 35;

  const lundi = getMonday(new Date(selectedDate));
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);
  document.getElementById('periodeSemaine').textContent =
    `Du ${lundi.getDate()} ${mois[lundi.getMonth()]} ${lundi.getFullYear()} au ${dimanche.getDate()} ${mois[dimanche.getMonth()]} ${dimanche.getFullYear()}`;

  for (let i = 0; i < 7; i++) {
    const date = new Date(lundi);
    date.setDate(lundi.getDate() + i);
    const isoDate = date.toISOString().split('T')[0];
    const jourNom = jours[i];
    const jourComplet = `${jourNom} ${date.getDate()} ${mois[date.getMonth()]}`;
    const ferie = joursFeries[date.getFullYear()]?.[isoDate];
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day';
    if (ferie) {
      dayDiv.classList.add('ferie');
      quotaSemaine -= 7;
    }

    dayDiv.innerHTML = `
      <h2>${jourComplet}${ferie ? ' - ' + ferie : ''}</h2>
      <div class="inputs">
        <div class="input-group">
          <label for="debut-${i}">Heure de début</label>
          <input type="time" id="debut-${i}" ${ferie ? 'disabled' : ''}>
        </div>
        <div class="input-group">
          <label for="fin-${i}">Heure de fin</label>
          <input type="time" id="fin-${i}" ${ferie ? 'disabled' : ''}>
        </div>
        <div class="checkboxes">
          <label><input type="checkbox" id="travaille-${i}" ${ferie ? '' : 'checked'}> Jour travaillé</label>
          <label><input type="checkbox" id="conge-${i}"> Congé payé</label>
        </div>
        <div class="total" id="total-${i}">Total : 0h</div>
      </div>
    `;

    planning.appendChild(dayDiv);

    const debutInput = document.getElementById(`debut-${i}`);
    const finInput = document.getElementById(`fin-${i}`);
    const travailleInput = document.getElementById(`travaille-${i}`);
    const congeInput = document.getElementById(`conge-${i}`);
    const totalDiv = document.getElementById(`total-${i}`);

    const updateFields = () => {
      if (congeInput.checked) {
        totalDiv.textContent = 'Total : 7h';
        debutInput.disabled = true;
        finInput.disabled = true;
        joursConges++;
      } else if (!travailleInput.checked) {
        totalDiv.textContent = 'Total : 0h';
        debutInput.disabled = true;
        finInput.disabled = true;
      } else {
        debutInput.disabled = false;
        finInput.disabled = false;
        const h = calculerHeures(debutInput.value, finInput.value);
        totalDiv.textContent = `Total : ${h}h`;
        totalHeures += h;
        if (h > 0) joursTravailles++;
      }
    };

    travailleInput.addEventListener('change', () => {
      if (travailleInput.checked) congeInput.checked = false;
      updateFields();
    });

    congeInput.addEventListener('change', () => {
      if (congeInput.checked) travailleInput.checked = false;
      updateFields();
    });

    debutInput.addEventListener('input', updateFields);
    finInput.addEventListener('input', updateFields);

    updateFields();
  }

  document.getElementById('heuresTravaillées').textContent = totalHeures + joursConges * 7;
  document.getElementById('heuresRestantes').textContent = quotaSemaine - (totalHeures + joursConges * 7);
  document.getElementById('joursTravailles').textContent = joursTravailles;
  document.getElementById('joursConges').textContent = joursConges;
}

function calculerHeures(debut, fin) {
  if (!debut || !fin) return 0;
  const [h1, m1] = debut.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  const debutDate = new Date(0, 0, 0, h1, m1);
  const finDate = new Date(0, 0, 0, h2, m2);
  const diff = (finDate - debutDate) / (1000 * 60 * 60);
  return diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
}

function exportToCSV() {
  const rows = [['Jour', 'Heure de début', 'Heure de fin', 'Jour travaillé', 'Congé payé', 'Total heures']];
  for (let i = 0; i < 7; i++) {
    const jour = jours[i];
    const debut = document.getElementById(`debut-${i}`).value;
    const fin = document.getElementById(`fin-${i}`).value;
    const travaille = document.getElementById(`travaille-${i}`).checked ? 'Oui' : 'Non';
    const conge = document.getElementById(`conge-${i}`).checked ? 'Oui' : 'Non';
    const total = document.getElementById(`total-${i}`).textContent.split(': ')[1];
    rows.push([jour, debut, fin, travaille, conge, total]);
  }

  const heures = document.getElementById('heuresTravaillées').textContent;
  const restantes = document.getElementById('heuresRestantes').textContent;
  const joursT = document.getElementById('joursTravailles').textContent;
  const joursC = document.getElementById('joursConges').textContent;

  rows.push([]);
  rows.push(['Résumé']);
  rows.push(['Heures travaillées', heures]);
  rows.push(['Heures restantes', restantes]);
  rows.push(['Jours travaillés', joursT]);
  rows.push(['Congés payés', joursC]);

  const csv = rows.map(e => e.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'planning.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function saveLastSelectedDate() {
  localStorage.setItem('lastSelectedDate', selectedDate.toISOString());
}

function loadLastSelectedDate() {
  const saved = localStorage.getItem('lastSelectedDate');
  if (saved) selectedDate = getMonday(new Date(saved));
}