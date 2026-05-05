function toggleSidebar(){
  document.getElementById("sidebar").classList.toggle("active");
}
const students = [
  { name: "Alba Martínez", t1: true, t2: true, t3: true, eval: 92, final: 94 },
  { name: "Pablo Bermúdez", t1: true, t2: false, t3: false, eval: null, final: 45 },
  { name: "Javier Cifuentes", t1: true, t2: true, t3: false, eval: 78, final: 72 },
  { name: "Elena De León", t1: true, t2: true, t3: true, eval: 88, final: 89 },
  { name: "Gerardo Flores", t1: true, t2: true, t3: false, eval: 42, final: 42 }
];

const tbody = document.getElementById("tableBody");

function renderTable() {
  tbody.innerHTML = "";

  students.forEach(s => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${s.name}</td>
      <td>${s.t1 ? "✔️" : "+"}</td>
      <td>${s.t2 ? "✔️" : "+"}</td>
      <td>${s.t3 ? "✔️" : "+"}</td>
      <td>${s.eval ? s.eval + "/100" : "Pte."}</td>
      <td>
        <div>${s.final}%</div>
        <div class="progress-bar">
          <span style="width:${s.final}%; background:${getColor(s.final)}"></span>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function getColor(value) {
  if (value >= 80) return "#2f9e44";
  if (value >= 60) return "#3b5bdb";
  if (value >= 40) return "#f59f00";
  return "#e03131";
}

renderTable();