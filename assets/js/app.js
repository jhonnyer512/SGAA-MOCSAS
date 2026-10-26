const TEMPLATE_FILES = [
  "login.html",
  "layout.html",
  "inicio.html",
  "estudiantes.html",
  "planes.html",
  "seguimiento.html",
  "configuracion.html",
  "usuarios.html",
  "componentes.html",
];
let templateCache = {};
function htmlTemplate(name, values = []) {
  const text = templateCache[name];
  if (text === undefined) throw new Error("Plantilla HTML no cargada: " + name);
  return text.replace(/\{\{slot(\d+)\}\}/g, (_, index) =>
    String(values[Number(index)] ?? ""),
  );
}
async function loadTemplates() {
  const entries = await Promise.all(
    TEMPLATE_FILES.map(async (file) => {
      const response = await fetch(new URL("views/" + file, document.baseURI), {
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("No se pudo cargar una vista HTML");
      return [file, await response.text()];
    }),
  );
  for (const [file, markup] of entries) {
    const doc = new DOMParser().parseFromString(markup, "text/html");
    doc.querySelectorAll("template[data-template]").forEach((item) => {
      templateCache[item.dataset.template] = item.innerHTML;
    });
  }
}
const app = document.querySelector("#app");
let state = { user: null, csrf: null, data: null, view: "inicio" };
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const roleName = {
  admin: "Rectoría",
  analista: "Analista",
  familia: "Familia",
};
async function api(url, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (opts.method && opts.method !== "GET")
    headers["X-CSRF-Token"] = state.csrf || "";
  const route = url.replace(/^\/api\/?/, "");
  const endpoint = new URL("api/index.php", document.baseURI);
  endpoint.search = new URLSearchParams({ route }).toString();
  const r = await fetch(endpoint, {
    ...opts,
    headers,
    credentials: "same-origin",
  });
  let data = {};
  try {
    data = await r.json();
  } catch {}
  if (!r.ok)
    throw new Error(data.error || "No se pudo completar la solicitud.");
  return data;
}
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2800);
}
async function start() {
  try {
    await loadTemplates();
    const s = await api("/api/session");
    state.user = s.user;
    state.csrf = s.csrf;
    if (!state.user) return renderLogin();
    await load();
  } catch (e) {
    if (Object.keys(templateCache).length) renderLogin(e.message);
    else {
      app.textContent =
        "No se pudieron cargar las vistas. Verifica que abriste SERMA desde Apache o el servidor PHP.";
    }
  }
}
function renderLogin(error = "") {
  app.innerHTML = htmlTemplate("renderLogin-01.html", [esc(error)]);
  document.querySelector("#login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = e.currentTarget.querySelector("button");
    b.disabled = true;
    try {
      const s = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.querySelector("#email").value,
          password: document.querySelector("#password").value,
        }),
      });
      state.user = s.user;
      state.csrf = s.csrf;
      await load();
    } catch (err) {
      renderLogin(err.message);
    } finally {
      b.disabled = false;
    }
  });
}
async function load() {
  state.data = await api("/api/data");
  state.user = state.data.user;
  render();
}
const navFor = (user) => [
  { id: "inicio", label: "Resumen" },
  {
    id: "estudiantes",
    label: user.role === "familia" ? "Mi familia" : "Estudiantes",
  },
  { id: "academico", label: "Materias y planes" },
  { id: "seguimiento", label: "Avances y observaciones" },
  ...(user.role === "admin"
    ? [
        { id: "cuentas", label: "Cuentas y permisos" },
        { id: "configuracion", label: "Configuración" },
      ]
    : []),
];
function render() {
  const d = state.data,
    u = state.user,
    nav = navFor(u);
  if (!nav.some((n) => n.id === state.view)) state.view = "inicio";
  document.body.dataset.theme = d.settings.theme === "dark" ? "dark" : "light";
  app.innerHTML = htmlTemplate("render-01.html", [
    esc(d.settings.schoolName),
    nav
      .map((n) =>
        htmlTemplate("view-01.html", [
          n.id,
          state.view === n.id ? "active" : "",
          n.label,
        ]),
      )
      .join(""),
    esc(u.name),
    roleName[u.role],
    nav.find((n) => n.id === state.view)?.label,
    esc(d.settings.term),
    pageContent(),
  ]);
  app.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        state.view = b.dataset.view;
        render();
      }),
  );
  app.querySelector("#logout").onclick = async () => {
    try {
      await api("/api/logout", { method: "POST" });
    } finally {
      state = { user: null, csrf: null, data: null, view: "inicio" };
      document.body.dataset.theme = "light";
      renderLogin();
    }
  };
  bindForms();
}
function pageContent() {
  const d = state.data,
    u = state.user;
  if (state.view === "inicio") return home();
  if (state.view === "estudiantes") return studentsPage();
  if (state.view === "academico") return academicPage();
  if (state.view === "seguimiento") return progressPage();
  if (state.view === "configuracion") return settingsPage();
  if (state.view === "cuentas") return usersPage();
  return "";
}
function home() {
  const d = state.data,
    alerts = d.alerts,
    completed = (d.checklistSummary || []).reduce((n, x) => n + x.completed, 0);
  return htmlTemplate("home-01.html", [
    esc(state.user.name.split(" ")[0]),
    roleName[state.user.role],
    d.students.length,
    d.subjects.length,
    completed,
    alerts.length,
    d.settings.passingScore,
    alerts.length
      ? htmlTemplate("view-03.html", [
          alerts
            .slice(0, 10)
            .map((a) =>
              htmlTemplate("view-02.html", [
                esc(a.student),
                esc(a.subject),
                a.percent < 40 ? "bad" : "warn",
                a.percent,
              ]),
            )
            .join(""),
        ])
      : htmlTemplate("view-04.html", []),
    recentTable(),
  ]);
}
function recentTable() {
  const d = state.data,
    rows = [...d.progress]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);
  if (!rows.length)
    return '<div class="empty">Aún no se han registrado avances.</div>';
  return htmlTemplate("recentTable-01.html", [
    rows
      .map((x) =>
        htmlTemplate("view-05.html", [
          new Date(x.createdAt).toLocaleDateString("es-CO"),
          esc(studentName(x.studentId)),
          esc(subjectName(x.subjectId)),
          esc(x.note),
          x.completed ? "" : "warn",
          x.completed ? "Completado" : "En proceso",
        ]),
      )
      .join(""),
  ]);
}
function studentName(id) {
  return state.data.students.find((x) => x.id === id)?.name || "Estudiante";
}
function subjectName(id) {
  const s = state.data.subjects.find((x) => x.id === id);
  return s
    ? htmlTemplate("subjectName-01.html", [esc(s.name), s.gradeLevel])
    : "Materia";
}
function gradeNumber(value) {
  return Number(
    (String(value).match(/(?:^|\D)(6|7|8|9|10|11)(?:\D|$)/) || [])[1] || 0,
  );
}
function studentsPage() {
  const d = state.data,
    can = ["admin", "analista"].includes(state.user.role),
    grades = [...new Set(d.students.map((s) => Number(s.gradeLevel)))].sort(
      (a, b) => a - b,
    );
  return htmlTemplate("studentsPage-01.html", [
    state.user.role === "familia"
      ? "Información académica de mi familia"
      : "Directorio de estudiantes",
    state.user.role === "admin"
      ? '<button class="btn secondary" id="new-course">Crear curso</button>'
      : "",
    can
      ? '<button class="btn" id="new-student">Agregar estudiante</button>'
      : "",
    state.user.role === "familia" && !d.students.length
      ? '<div class="notice">Esta cuenta aún no tiene estudiantes vinculados. Solicita a rectoría que la vincule con el estudiante desde Cuentas y permisos.</div>'
      : "",
    state.user.role === "admin"
      ? htmlTemplate("view-07.html", [
          d.courses
            .map((c) => htmlTemplate("view-06.html", [esc(c.label)]))
            .join("") ||
            '<span class="muted">Crea cursos como 601 y 602.</span>',
        ])
      : "",
    grades.map((g) => htmlTemplate("view-08.html", [g, g])).join(""),
    d.subjects
      .map((x) =>
        htmlTemplate("view-09.html", [
          x.id,
          x.gradeLevel,
          esc(x.name),
          x.gradeLevel,
        ]),
      )
      .join(""),
    state.user.role === "admin" ? "<th></th>" : "",
    d.students
      .map((s) =>
        htmlTemplate("view-11.html", [
          s.gradeLevel,
          esc(s.name.toLocaleLowerCase()),
          esc(s.name),
          esc(courseLabel(s)),
          esc(s.code || "—"),
          esc(s.guardian || "—"),
          state.user.role === "admin"
            ? htmlTemplate("view-10.html", [s.id])
            : "",
        ]),
      )
      .join("") ||
      '<tr><td colspan="5" class="empty">No hay estudiantes asignados.</td></tr>',
    d.students.map((st) => studentPlansCard(st)).join(""),
  ]);
}
function courseLabel(s) {
  const c = state.data.courses?.find((x) => x.id === s.courseId);
  return c?.label || s.grade || "Curso";
}
function studentPlansCard(st) {
  const d = state.data,
    u = state.user;
  const plans = d.plans.filter((p) => {
    const sb = d.subjects.find((x) => x.id === p.subjectId);
    return (
      Number(sb?.gradeLevel) === Number(st.gradeLevel) &&
      (u.role !== "analista" ||
        d.assignments.some(
          (a) => a.courseId === st.courseId && a.subjectId === p.subjectId,
        ))
    );
  });
  if (!plans.length)
    return htmlTemplate("studentPlansCard-01.html", [
      st.gradeLevel,
      esc(st.name.toLocaleLowerCase()),
      esc(st.name),
      esc(courseLabel(st)),
      Number(st.gradeLevel),
    ]);
  return htmlTemplate("studentPlansCard-02.html", [
    st.gradeLevel,
    esc(st.name.toLocaleLowerCase()),
    esc(st.name),
    esc(courseLabel(st)),
    Number(st.gradeLevel),
    studentOverallPercent(st.id),
    plans
      .map((p) => {
        const subject = d.subjects.find((x) => x.id === p.subjectId);
        const editable =
          u.role === "admin" ||
          (u.role === "analista" &&
            d.assignments.some(
              (a) => a.courseId === st.courseId && a.subjectId === p.subjectId,
            ));
        const sum = subjectSummary(st.id, p.subjectId);
        return htmlTemplate("view-12.html", [
          p.subjectId,
          esc(subject?.name || "Asignatura"),
          esc(p.title),
          sum.percent,
          sum.completed,
          sum.total,
          studentTopicChecklist(st, p, editable),
        ]);
      })
      .join(""),
  ]);
}
function subjectSummary(studentId, subjectId) {
  return (
    state.data.checklistSummary?.find(
      (x) => x.studentId === studentId && x.subjectId === subjectId,
    ) || { completed: 0, total: 0, percent: 0 }
  );
}
function studentOverallPercent(studentId) {
  const rows =
    state.data.checklistSummary?.filter(
      (x) => x.studentId === studentId && x.total,
    ) || [];
  const total = rows.reduce((n, x) => n + x.total, 0),
    done = rows.reduce((n, x) => n + x.completed, 0);
  return total ? Math.round((done / total) * 100) : 0;
}
function studentTopicChecklist(st, plan, editable) {
  const stages = [
    ["startingPoint", "Punto de partida"],
    ["research", "Investigación"],
    ["skillDevelopment", "Desarrollo de habilidad"],
    ["relation", "Relación"],
  ];
  return htmlTemplate("studentTopicChecklist-01.html", [
    (plan.topics || [])
      .map((t) => {
        const prog =
          state.data.topicProgress.find(
            (x) => x.studentId === st.id && x.topicId === t.id,
          ) || {};
        return htmlTemplate("view-14.html", [
          esc(t.title),
          stages
            .map(([key, label]) =>
              htmlTemplate("view-13.html", [
                st.id,
                t.id,
                key,
                prog[key] ? "checked" : "",
                editable ? "" : "disabled",
                label,
              ]),
            )
            .join(""),
        ]);
      })
      .join("") ||
      '<span class="muted">No hay temas aún en esta plantilla.</span>',
  ]);
}
function topicChecklist(plan, editable) {
  const topics = plan.topics || [];
  return htmlTemplate("topicChecklist-01.html", [
    topics
      .map((t) =>
        htmlTemplate("view-16.html", [
          esc(t.title),
          editable ? htmlTemplate("view-15.html", [t.id]) : "",
        ]),
      )
      .join("") || '<span class="muted">Aún no hay temas.</span>',
    editable ? htmlTemplate("view-17.html", [plan.id]) : "",
  ]);
}
function canManageSubject(id) {
  return (
    state.user.role === "admin" ||
    (state.user.role === "analista" &&
      state.data.assignments.some((a) => a.subjectId === id))
  );
}
function academicPage() {
  const d = state.data,
    admin = state.user.role === "admin",
    availableSubjects = d.subjects.filter(
      (s) =>
        !d.plans.some((p) => p.subjectId === s.id) && canManageSubject(s.id),
    );
  return htmlTemplate("academicPage-01.html", [
    admin
      ? '<button class="btn" id="new-subject">Crear asignatura</button>'
      : "",
    admin
      ? htmlTemplate("view-19.html", [
          d.subjects
            .map((s) =>
              htmlTemplate("view-18.html", [
                esc(s.name),
                s.gradeLevel,
                esc(s.teacher || "Sin asignar"),
                esc(s.description || "—"),
                s.id,
              ]),
            )
            .join("") ||
            '<tr><td colspan="5" class="empty">Crea la primera asignatura.</td></tr>',
        ])
      : "",
    availableSubjects.length
      ? '<button class="btn secondary small" id="new-plan">Crear plan</button>'
      : "",
    d.plans
      .map((p) => {
        const editable = canManageSubject(p.subjectId);
        return htmlTemplate("view-22.html", [
          esc(subjectName(p.subjectId)),
          esc(p.title),
          topicChecklist(p, editable),
          safeLink(p.guide),
          editable ? htmlTemplate("view-20.html", [p.id]) : "",
          admin ? htmlTemplate("view-21.html", [p.id]) : "",
        ]);
      })
      .join("") ||
      htmlTemplate("view-23.html", [
        state.user.role === "analista"
          ? "No hay planes para tus asignaciones."
          : "Crea un plan y agrega sus temas.",
      ]),
  ]);
}
function safeLink(v) {
  if (!v) return "—";
  try {
    const u = new URL(v);
    if (!["https:", "http:"].includes(u.protocol)) return esc(v);
    return htmlTemplate("safeLink-01.html", [esc(u.href)]);
  } catch {
    return esc(v);
  }
}
function progressPage() {
  const d = state.data,
    can = ["admin", "analista"].includes(state.user.role),
    grades = [...new Set(d.students.map((s) => Number(s.gradeLevel)))].sort(
      (a, b) => a - b,
    );
  return htmlTemplate("progressPage-01.html", [
    can
      ? '<button class="btn" id="new-progress">Registrar observación</button>'
      : "",
    grades.map((g) => htmlTemplate("view-24.html", [g, g])).join(""),
    d.subjects
      .map((x) =>
        htmlTemplate("view-25.html", [
          x.id,
          x.gradeLevel,
          esc(x.name),
          x.gradeLevel,
        ]),
      )
      .join(""),
    (d.checklistSummary || [])
      .filter((x) => x.total > 0)
      .map((x) => {
        const st = d.students.find((y) => y.id === x.studentId),
          sb = d.subjects.find((y) => y.id === x.subjectId);
        return htmlTemplate("view-26.html", [
          st?.gradeLevel || "",
          esc((st?.name || "").toLocaleLowerCase()),
          x.subjectId,
          esc(st?.name || ""),
          esc(courseLabel(st || {})),
          esc(sb?.name || ""),
          x.completed,
          x.total,
          x.percent,
          x.percent,
        ]);
      })
      .join("") ||
      '<tr><td colspan="5" class="empty">Agrega temas a los planes para iniciar el checklist.</td></tr>',
    recentTable(),
  ]);
}
function settingsPage() {
  const s = state.data.settings;
  return htmlTemplate("settingsPage-01.html", [
    esc(s.schoolName),
    esc(s.term),
    Number(s.passingScore),
    s.theme !== "dark" ? "selected" : "",
    s.theme === "dark" ? "selected" : "",
  ]);
}
function usersPage() {
  return htmlTemplate("usersPage-01.html", []);
}
function bindForms() {
  const on = (sel, ev, fn) => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener(ev, fn);
  };
  on("#new-course", "click", () =>
    modal(
      "Crear curso",
      htmlTemplate("bindForms-01.html", [
        [6, 7, 8, 9, 10, 11]
          .map((g) => htmlTemplate("view-27.html", [g, g]))
          .join(""),
      ]),
      async (f) =>
        api("/api/courses", {
          method: "POST",
          body: JSON.stringify(formData(f)),
        }),
    ),
  );
  on("#new-student", "click", () =>
    modal(
      "Nuevo estudiante",
      htmlTemplate("bindForms-02.html", [
        state.data.courses
          .map((c) => htmlTemplate("view-28.html", [c.id, esc(c.label)]))
          .join(""),
      ]),
      async (f) => {
        await api("/api/students", {
          method: "POST",
          body: JSON.stringify(formData(f)),
        });
      },
    ),
  );
  on("#new-subject", "click", () =>
    modal(
      "Nueva materia",
      htmlTemplate("bindForms-03.html", [
        [6, 7, 8, 9, 10, 11]
          .map((g) => htmlTemplate("view-29.html", [g, g]))
          .join(""),
      ]),
      async (f) =>
        api("/api/subjects", {
          method: "POST",
          body: JSON.stringify(formData(f)),
        }),
    ),
  );
  on("#new-plan", "click", () =>
    modal(
      "Plan o guía individual",
      htmlTemplate("bindForms-04.html", [
        state.data.subjects
          .filter(
            (x) =>
              !state.data.plans.some((p) => p.subjectId === x.id) &&
              canManageSubject(x.id),
          )
          .map((x) =>
            htmlTemplate("view-30.html", [x.id, esc(x.name), x.gradeLevel]),
          )
          .join(""),
      ]),
      async (f) =>
        api("/api/plans", {
          method: "POST",
          body: JSON.stringify(formData(f)),
        }),
    ),
  );
  on("#new-progress", "click", () =>
    modal(
      "Registrar avance u observación",
      htmlTemplate("bindForms-05.html", [
        selectField(
          "studentId",
          "Estudiante",
          state.data.students.map((x) => [x.id, x.name]),
        ),
        state.data.subjects
          .map((x) =>
            htmlTemplate("view-31.html", [
              x.id,
              x.gradeLevel,
              esc(x.name),
              x.gradeLevel,
            ]),
          )
          .join(""),
        state.data.plans
          .map((p) =>
            htmlTemplate("view-32.html", [
              p.id,
              p.subjectId,
              esc(subjectName(p.subjectId)),
              esc(p.title),
            ]),
          )
          .join(""),
      ]),
      async (f) =>
        api("/api/progress", {
          method: "POST",
          body: JSON.stringify(formData(f)),
        }),
    ),
  );
  on("#settings-form", "submit", async (e) => {
    e.preventDefault();
    try {
      const x = formData(e.currentTarget);
      const r = await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify(x),
      });
      state.data.settings = r.settings;
      toast("Configuración guardada");
      render();
    } catch (err) {
      toast(err.message);
    }
  });
  on("#new-user", "click", async () => {
    const r = await api("/api/users");
    modal(
      "Crear cuenta",
      htmlTemplate("bindForms-06.html", [
        familyStudentCheckboxList(r.students),
        courseSubjectCheckboxList(r.courses, r.subjects),
      ]),
      async (f) => {
        const fd = formData(f);
        fd.studentIds = [
          ...f.querySelectorAll("input[name=familyStudentIds]:checked"),
        ].map((o) => o.value);
        fd.assignments = [
          ...f.querySelectorAll("input[name=assignments]:checked"),
        ].map((o) => JSON.parse(o.value));
        if (fd.role === "analista" && !fd.assignments.length)
          throw new Error(
            "Asigna al menos un curso y una asignatura al analista.",
          );
        await api("/api/users", { method: "POST", body: JSON.stringify(fd) });
      },
      async () => {
        const v = await api("/api/users");
        showUsers(v);
      },
    );
  });
  wireStudentFilters();
  const refreshButton = document.querySelector("#refresh-academic");
  if (refreshButton)
    refreshButton.onclick = () => load().catch((e) => toast(e.message));
  document.querySelectorAll("[data-edit-plan]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = state.data.plans.find((x) => x.id === b.dataset.editPlan);
        if (!p) return;
        modal(
          "Editar plan",
          htmlTemplate("bindForms-07.html", [esc(p.title), esc(p.guide || "")]),
          async (f) =>
            api("/api/plans/" + p.id, {
              method: "PUT",
              body: JSON.stringify(formData(f)),
            }),
        );
      }),
  );
  document.querySelectorAll("[data-edit-topic]").forEach(
    (b) =>
      (b.onclick = () => {
        const title = prompt("Nuevo nombre del tema:");
        if (!title || title.trim().length < 2) return;
        api("/api/topics/" + b.dataset.editTopic, {
          method: "PUT",
          body: JSON.stringify({ title: title.trim() }),
        })
          .then(load)
          .catch((e) => toast(e.message));
      }),
  );
  document.querySelectorAll("[data-delete-student]").forEach(
    (b) =>
      (b.onclick = () =>
        confirmAction(
          "¿Retirar este estudiante y sus datos asociados?",
          async () =>
            api("/api/students/" + b.dataset.deleteStudent, {
              method: "DELETE",
            }),
        )),
  );
  document.querySelectorAll("[data-delete-subject]").forEach(
    (b) =>
      (b.onclick = () =>
        confirmAction(
          "¿Retirar esta materia y sus planes asociados?",
          async () =>
            api("/api/subjects/" + b.dataset.deleteSubject, {
              method: "DELETE",
            }),
        )),
  );
  document
    .querySelectorAll("[data-delete-plan]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          confirmAction("¿Eliminar este plan?", async () =>
            api("/api/plans/" + b.dataset.deletePlan, { method: "DELETE" }),
          )),
    );
  document.querySelectorAll("[data-add-topic]").forEach(
    (b) =>
      (b.onclick = async () => {
        const title = prompt("Nombre del nuevo tema:");
        if (!title || title.trim().length < 2) return;
        try {
          await api("/api/plans/" + b.dataset.addTopic + "/topics", {
            method: "POST",
            body: JSON.stringify({ title: title.trim() }),
          });
          await load();
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  document.querySelectorAll("[data-student-topic][data-stage]").forEach(
    (c) =>
      (c.onchange = async () => {
        const checked = c.checked;
        try {
          await api(
            "/api/students/" +
              c.dataset.studentTopic +
              "/topics/" +
              c.dataset.topicId,
            {
              method: "PUT",
              body: JSON.stringify({
                stage: c.dataset.stage,
                completed: checked,
              }),
            },
          );
          await load();
        } catch (e) {
          c.checked = !checked;
          toast(e.message);
        }
      }),
  );
  const userBox = document.querySelector("#users-box");
  if (userBox)
    api("/api/users")
      .then(showUsers)
      .catch((e) => (userBox.textContent = e.message));
}
function wireStudentFilters() {
  const search = document.querySelector("[data-student-filter]"),
    grade = document.querySelector("[data-grade-filter]"),
    subject = document.querySelector("[data-subject-filter]");
  if (!search || !grade || !subject) return;
  const apply = () => {
    const q = search.value.trim().toLocaleLowerCase(),
      g = grade.value,
      sid = subject.value,
      sGrade = subject.selectedOptions[0]?.dataset.grade || "";
    document
      .querySelectorAll(
        "[data-student-row],[data-student-card],[data-progress-row]",
      )
      .forEach((el) => {
        const gradeOk =
            (!g || el.dataset.grade === g) &&
            (!sGrade || el.dataset.grade === sGrade),
          nameOk = !q || (el.dataset.name || "").includes(q);
        el.hidden = !(gradeOk && nameOk);
        if (el.hasAttribute("data-student-card")) {
          const parts = [...el.querySelectorAll("[data-student-subject]")];
          parts.forEach(
            (plan) =>
              (plan.hidden = !!sid && plan.dataset.studentSubject !== sid),
          );
          if (sid && !parts.some((plan) => plan.dataset.studentSubject === sid))
            el.hidden = true;
        }
        if (el.hasAttribute("data-progress-row"))
          el.hidden = el.hidden || (!!sid && el.dataset.subject !== sid);
      });
  };
  search.addEventListener("input", apply);
  grade.addEventListener("change", apply);
  subject.addEventListener("change", apply);
}
function selectField(name, label, opts) {
  return htmlTemplate("selectField-01.html", [
    label,
    name,
    opts.map((x) => htmlTemplate("view-33.html", [x[0], esc(x[1])])).join(""),
  ]);
}
function formData(f) {
  const o = Object.fromEntries(new FormData(f).entries());
  f.querySelectorAll("input[type=checkbox]").forEach(
    (x) => (o[x.name] = x.checked),
  );
  return o;
}
function modal(title, html, save, after) {
  const wrap = document.createElement("div");
  wrap.style =
    "position:fixed;inset:0;background:#1e2a3888;display:grid;place-items:center;padding:1rem;z-index:20";
  wrap.innerHTML = htmlTemplate("modal-01.html", [esc(title), html]);
  document.body.append(wrap);
  const studentSelect = wrap.querySelector("[name=studentId]"),
    gradeSubject = wrap.querySelector("[data-subject-by-grade]");
  if (studentSelect && gradeSubject) {
    const syncSubjects = () => {
      const st = state.data.students.find((x) => x.id === studentSelect.value);
      const level = gradeNumber(st?.grade || "");
      let first = "";
      [...gradeSubject.options].forEach((o) => {
        o.hidden = !!level && Number(o.dataset.grade) !== level;
        o.disabled = o.hidden;
        if (!o.hidden && !first) first = o.value;
      });
      if (gradeSubject.selectedOptions[0]?.disabled) gradeSubject.value = first;
    };
    studentSelect.addEventListener("change", syncSubjects);
    syncSubjects();
  }
  const progressSubject = wrap.querySelector("[name=subjectId]"),
    planSelect = wrap.querySelector("[data-plan-by-subject]");
  if (progressSubject && planSelect) {
    const syncPlans = () => {
      [...planSelect.options].forEach((o) => {
        if (o.value) {
          o.hidden = o.dataset.subjectId !== progressSubject.value;
          o.disabled = o.hidden;
        }
      });
      if (planSelect.selectedOptions[0]?.disabled) planSelect.value = "";
    };
    progressSubject.addEventListener("change", syncPlans);
    syncPlans();
  }
  const roleSelect = wrap.querySelector("[name=role]");
  if (roleSelect) {
    const syncRole = () =>
      wrap.querySelectorAll("[data-role-section]").forEach((section) => {
        const active = section.dataset.roleSection === roleSelect.value;
        section.hidden = !active;
        const control = section.querySelector("select");
        if (control) control.required = active;
      });
    roleSelect.addEventListener("change", syncRole);
    syncRole();
  }
  const close = () => wrap.remove();
  wrap
    .querySelectorAll("[data-close],[data-cancel]")
    .forEach((b) => (b.onclick = close));
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });
  wrap.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.currentTarget.querySelector("[type=submit]");
    b.disabled = true;
    try {
      await save(e.currentTarget);
      close();
      await load();
      if (after) await after();
      toast("Cambios guardados");
    } catch (err) {
      toast(err.message);
      b.disabled = false;
    }
  };
}
function confirmAction(message, fn) {
  if (!confirm(message)) return;
  fn()
    .then(async () => {
      await load();
      toast("Registro actualizado");
    })
    .catch((e) => toast(e.message));
}
function subjectCheckboxList(subjects, selected = []) {
  return htmlTemplate("subjectCheckboxList-01.html", [
    subjects
      .map((s) =>
        htmlTemplate("view-34.html", [
          s.id,
          selected.includes(s.id) ? "checked" : "",
          esc(s.name),
          s.gradeLevel,
        ]),
      )
      .join("") ||
      '<span class="muted">Primero crea asignaturas desde Materias y planes.</span>',
  ]);
}
function familyStudentCheckboxList(students, selected = []) {
  return htmlTemplate("familyStudentCheckboxList-01.html", [
    students
      .map((s) =>
        htmlTemplate("view-35.html", [
          s.id,
          selected.includes(s.id) ? "checked" : "",
          esc(s.name),
          esc(s.grade),
        ]),
      )
      .join("") ||
      '<span class="muted">Primero registra estudiantes en el directorio.</span>',
  ]);
}
function courseSubjectCheckboxList(courses, subjects, selected = []) {
  const keys = new Set(selected.map((a) => a.courseId + "|" + a.subjectId));
  const rows = courses.flatMap((c) =>
    subjects
      .filter((s) => Number(s.gradeLevel) === Number(c.gradeLevel))
      .map((s) => {
        const key = c.id + "|" + s.id;
        return htmlTemplate("courseSubjectCheckboxList-01.html", [
          esc(JSON.stringify({ courseId: c.id, subjectId: s.id })),
          keys.has(key) ? "checked" : "",
          esc(c.label),
          esc(s.name),
        ]);
      }),
  );
  return htmlTemplate("courseSubjectCheckboxList-02.html", [
    rows.join("") ||
      '<span class="muted">Crea cursos y asignaturas del mismo grado.</span>',
  ]);
}
function showUsers(r) {
  const box = document.querySelector("#users-box");
  if (!box) return;
  box.className = "table-wrap";
  box.innerHTML = htmlTemplate("showUsers-01.html", [
    r.users
      .map((u) =>
        htmlTemplate("view-40.html", [
          esc(u.name),
          esc(u.email),
          roleName[u.role],
          u.role === "familia"
            ? (u.studentIds || [])
                .map((id) =>
                  esc(r.students.find((s) => s.id === id)?.name || ""),
                )
                .join(", ") || "—"
            : u.role === "analista"
              ? (u.assignments || [])
                  .map((a) => {
                    const sb = r.subjects.find((x) => x.id === a.subjectId),
                      c = r.courses.find((x) => x.id === a.courseId);
                    return sb && c
                      ? htmlTemplate("view-36.html", [
                          esc(sb.name),
                          esc(c.label),
                        ])
                      : "";
                  })
                  .join(", ") || "Sin asignación"
              : "",
          u.role === "analista" ? htmlTemplate("view-37.html", [u.id]) : "",
          u.role === "familia" ? htmlTemplate("view-38.html", [u.id]) : "",
          u.id === state.user.id
            ? '<span class="muted">Tu cuenta</span>'
            : htmlTemplate("view-39.html", [u.id]),
        ]),
      )
      .join(""),
  ]);
  box.querySelectorAll("[data-edit-family]").forEach(
    (b) =>
      (b.onclick = () => {
        const user = r.users.find((x) => x.id === b.dataset.editFamily);
        if (!user) return;
        modal(
          htmlTemplate("showUsers-02.html", [esc(user.name)]),
          htmlTemplate("showUsers-03.html", [
            familyStudentCheckboxList(r.students, user.studentIds),
          ]),
          async (f) => {
            const studentIds = [
              ...f.querySelectorAll("input[name=familyStudentIds]:checked"),
            ].map((o) => o.value);
            if (!studentIds.length)
              throw new Error("Vincula al menos un estudiante.");
            await api("/api/users/" + user.id + "/students", {
              method: "PUT",
              body: JSON.stringify({ studentIds }),
            });
          },
          async () => showUsers(await api("/api/users")),
        );
      }),
  );
  box.querySelectorAll("[data-edit-assignments]").forEach(
    (b) =>
      (b.onclick = () => {
        const user = r.users.find((x) => x.id === b.dataset.editAssignments);
        if (!user) return;
        modal(
          htmlTemplate("showUsers-04.html", [esc(user.name)]),
          htmlTemplate("showUsers-05.html", [
            courseSubjectCheckboxList(r.courses, r.subjects, user.assignments),
          ]),
          async (f) => {
            const assignments = [
              ...f.querySelectorAll("input[name=assignments]:checked"),
            ].map((o) => JSON.parse(o.value));
            if (!assignments.length)
              throw new Error(
                "Selecciona al menos una combinación curso y asignatura.",
              );
            await api("/api/users/" + user.id + "/assignments", {
              method: "PUT",
              body: JSON.stringify({ assignments }),
            });
          },
          async () => showUsers(await api("/api/users")),
        );
      }),
  );
  box.querySelectorAll("[data-disable-user]").forEach(
    (b) =>
      (b.onclick = () =>
        confirmAction(
          "¿Desactivar esta cuenta? Se cerrarán sus sesiones activas.",
          async () =>
            api("/api/users/" + b.dataset.disableUser, {
              method: "DELETE",
            }).then(async () => showUsers(await api("/api/users"))),
        )),
  );
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(new URL("sw.js", document.baseURI))
    .catch(() => {});
}
start();
