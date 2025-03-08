document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.querySelector(".sidebar");
    const mainContent = document.querySelector(".main-content");

    menuToggle.addEventListener("click", function () {
        sidebar.classList.toggle("active");
        mainContent.classList.toggle("menu-open");

        // Mueve el botón junto con el sidebar
        if (sidebar.classList.contains("active")) {
            menuToggle.style.left = "260px"; // Lo posicionamos afuera del sidebar
        } else {
            menuToggle.style.left = "10px"; // Lo regresamos a su posición original
        }
    });
});
