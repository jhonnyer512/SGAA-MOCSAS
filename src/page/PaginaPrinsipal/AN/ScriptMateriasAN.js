function toggleSidebar(){
  document.getElementById("sidebar").classList.toggle("active");
}

const activities = [
  "Calificaciones registradas - Matemática MAT-101",
  "Faltan notas de parcial - Inglés ENG-202",
  "Cierre de unidad exitoso - Comunicación COM-300"
];

const list = document.getElementById("activityList");

function renderActivities() {
  list.innerHTML = "";
  activities.forEach(act => {
    const li = document.createElement("li");
    li.textContent = act;
    list.appendChild(li);
  });
}

function addActivity() {
  const newAct = prompt("Nueva actividad:");
  if (newAct) {
    activities.unshift(newAct);
    renderActivities();
  }
}

renderActivities();