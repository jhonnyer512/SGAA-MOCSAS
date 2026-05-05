document.addEventListener("DOMContentLoaded", function () {

  const toggle = document.querySelector(".toggle-pass");
  const password = document.querySelector("#password");

  // Verificación para evitar errores silenciosos
  if (!toggle || !password) {
    console.log("No se encontró el botón o el input");
    return;
  }

  toggle.addEventListener("click", function () {
    const tipo = password.getAttribute("type");

    if (tipo === "password") {
      password.setAttribute("type", "text");
      toggle.textContent = "👁️‍🗨️";
    } else {
      password.setAttribute("type", "password");
      toggle.textContent = "👁";
    }
  });

});

// Crear cuentas de prueba 
if (!localStorage.getItem("usuarios")) {
  const usuarios = [
    {
      email: "rector@test.com",
      password: "123456",
      role: "AD"
    },
    {
      email: "analista@test.com",
      password: "123456",
      role: "AN"
    },
    {
      email: "estudiante@test.com",
      password: "123456",
      role: "ES"
    }
  ];

  localStorage.setItem("usuarios", JSON.stringify(usuarios));
};

document.addEventListener("DOMContentLoaded", () => {

  const form = document.querySelector("form");

  if (!form) return;

  form.addEventListener("submit", function(e){
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    // Buscar usuario SOLO por email y password
    const usuario = usuarios.find(u => 
      u.email === email && u.password === password
    );

    if (!usuario) {
      alert("Credenciales incorrectas");
      return;
    }

    // Guardar sesión
    localStorage.setItem("sesion", JSON.stringify(usuario));

    // 🔥 REDIRECCIÓN SEGÚN EL ROL GUARDADO
    if (usuario.role === "AD") {
      window.location.href = "/src/page/PaginaPrinsipal/AD/HomeAD.html";
    } else if (usuario.role === "AN") {
      window.location.href = "/src/page/PaginaPrinsipal/AN/HomeAN.html";
    } else if (usuario.role === "ES") {
      window.location.href = "/src/page/PaginaPrinsipal/ES/HomeES.html";
    }

  });

});