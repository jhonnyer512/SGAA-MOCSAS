function toggleSidebar(){
  document.getElementById("sidebar").classList.toggle("active");
}
document.getElementById("theme").addEventListener("change", (e) => {
  if (e.target.value === "dark") {
    document.body.style.background = "#1e1e2f";
    document.body.style.color = "white";
  } else {
    document.body.style.background = "#f4f6fb";
    document.body.style.color = "black";
  }
});

// Simulación de guardar
document.querySelector(".primary").addEventListener("click", () => {
  const name = document.getElementById("name").value;
  alert("Cambios guardados para " + name);
});