# SERMA · IED Bruselas

Aplicación web adaptada a Apache, PHP y MySQL/MariaDB de XAMPP. Incluye una interfaz adaptable a móviles y puede instalarse en la pantalla de inicio como PWA en un origen HTTPS o `localhost`. La app conserva las funciones académicas del prototipo: estudiantes, materias, planes, enlaces a guías, avances, observaciones, alertas, tres perfiles y ajustes institucionales.

## Estructura del proyecto

La interfaz está organizada por responsabilidades para que puedas localizar cambios sin mezclar presentación y lógica:

- `index.html`: documento de entrada de la aplicación.
- `views/login.html`, `layout.html`, `inicio.html`, `estudiantes.html`, `planes.html`, `seguimiento.html`, `configuracion.html` y `usuarios.html`: plantillas HTML de las pantallas.
- `views/componentes.html`: piezas compartidas como filas, formularios, listas y ventanas modales. Cada plantilla tiene un atributo `data-template`; conserva ese nombre y los marcadores `{{slot0}}`, `{{slot1}}`, etc. al cambiar su estructura.
- `assets/css/app.css`: estilos, colores institucionales azules y reglas para móvil/tableta.
- `assets/js/app.js`: interacción, carga de vistas, filtros y llamadas al API; no contiene las plantillas principales.
- `api/index.php`: API PHP, autenticación, validación y permisos en servidor.
- `database.sql`, `migracion-*.sql` y `scripts/`: esquema, actualizaciones y tareas administrativas.

Para cambiar textos, etiquetas, distribución o marcado de una pantalla, edita su archivo en `views/`. Para colores o adaptación móvil edita `assets/css/app.css`. Para reglas de comportamiento o comunicación con la base de datos edita `assets/js/app.js` o `api/index.php`, según corresponda. Los valores que provienen de usuarios deben seguir escapándose en JavaScript con `esc()` antes de insertarlos en HTML.

## Qué hace phpMyAdmin

phpMyAdmin es la interfaz para administrar MySQL/MariaDB. La base real la ejecuta el servicio **MySQL** de XAMPP; la aplicación se conecta desde PHP mediante PDO (`pdo_mysql`). No guardes los datos académicos en phpMyAdmin como archivos separados: importa el esquema SQL allí y luego PHP leerá y escribirá en esas tablas.

## Instalación con XAMPP

1. En el panel de XAMPP inicia **Apache** y **MySQL**.
2. Crea una carpeta, por ejemplo `C:\xampp\htdocs\SERMA`, y copia allí todos los archivos del ZIP. Evita abrir `index.html` directamente desde el explorador; debe servirse mediante Apache para que funcione PHP.
3. Abre `http://localhost/phpmyadmin`. En una instalación nueva, en la pestaña **Importar**, selecciona `database.sql` y ejecuta la importación. El archivo crea la base `serma_ied_bruselas` y las tablas necesarias. Si actualizas una base anterior, primero haz un respaldo. Ejecuta solo las migraciones que aún no hayas aplicado, en este orden: `migracion-asignaturas-y-temas.sql` (si la base es anterior a asignaturas por grado), `migracion-planes-por-asignatura.sql` (si los planes aún eran individuales), y finalmente `migracion-cursos-y-checklists-por-estudiante.sql` (para esta actualización). Cada migración se ejecuta una sola vez. La última conserva los estudiantes, crea un curso a partir del curso que ya tenía cada uno y copia el checklist antiguo a su estado individual. Asigna después a cada analista los cursos y materias correctos desde **Cuentas y permisos**; la migración conserva las asignaciones previas ampliándolas a los cursos de ese grado para evitar quitar acceso existente sin aviso.
4. En phpMyAdmin puedes crear una cuenta de MySQL para la aplicación, con permisos limitados. Entra con una cuenta administradora, abre la pestaña SQL y ejecuta el siguiente ejemplo cambiando la contraseña por una propia:

   ```sql
   CREATE USER 'serma_app'@'127.0.0.1' IDENTIFIED BY 'REEMPLAZA_ESTA_CLAVE';
   GRANT SELECT, INSERT, UPDATE, DELETE ON serma_ied_bruselas.* TO 'serma_app'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```

   Copia `config.example.php` como `config.php` y escribe allí el usuario y contraseña que elegiste. Si prefieres una prueba local rápida, puedes usar el usuario que ya tengas configurado para XAMPP; confirma sus datos en tu instalación. Una contraseña vacía solo es aceptable para una prueba local.

5. Abre PowerShell y crea la cuenta inicial de rectoría desde el proyecto. Reemplaza el correo y nombre; la contraseña requiere al menos 12 caracteres. El comando solicita la clave sin mostrarla mientras la escribes:

   ```powershell
   $env:SERMA_ADMIN_EMAIL = "correo-de-rectoria"
   $env:SERMA_ADMIN_NAME = "Rectoría"
   $securePassword = Read-Host "Contraseña inicial (mínimo 12 caracteres)" -AsSecureString
   $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
   try {
     $env:SERMA_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
     & "C:\xampp\php\php.exe" "C:\xampp\htdocs\SERMA\scripts\create_admin.php"
   } finally {
     [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
     Remove-Item Env:SERMA_ADMIN_PASSWORD -ErrorAction SilentlyContinue
   }
   ```

   El comando informa si la cuenta fue creada. Si PowerShell avisa que ya existe una cuenta de rectoría, no la duplica. Cierra esa terminal cuando termines.

6. Abre `http://localhost/SERMA/` e inicia sesión con el correo y la contraseña que acabas de configurar. En **Cuentas y permisos**, rectoría crea cuentas de analistas y familias y vincula cada familia con sus estudiantes. No hay cuentas ni contraseñas de demostración.

La configuración de la conexión está en `config.php`, que está excluido de Git y bloqueado para acceso web por `.htaccess`. El esquema público está en `database.sql`. No compartas el archivo `config.php`. Mantén habilitado `.htaccess` en Apache (XAMPP lo configura así normalmente) para que se bloqueen las pantallas prototipo antiguas y los archivos de configuración.

## Editar el proyecto e iconos

Primero extrae el ZIP a una carpeta normal. No se puede guardar cambios dentro del ZIP. En Visual Studio Code usa **Archivo → Abrir carpeta** y selecciona `C:\xampp\htdocs\SERMA` (o la carpeta donde lo extrajiste). Edita esa copia; luego recarga el portal con `Ctrl+F5`.

Los iconos activos del portal son `public/image/serma-icon-192.png` y `public/image/serma-icon-512.png`: el de 192 se ve en el inicio de sesión, el menú, la pestaña del navegador y el de 512 se usa también al instalar la PWA. Reemplaza ambos PNG por tus diseños manteniendo esos nombres y tamaños para que el portal los encuentre. `public/image/Logo de SERMA.jpg` pertenece a recursos anteriores y no controla el icono de la aplicación.

Esta entrega ya usa el símbolo institucional sobre azul. Si reemplazas los iconos más adelante y el navegador sigue mostrando el anterior, aumenta el número `v=2` en `index.html`, `views/layout.html`, `views/login.html` y `manifest.webmanifest`, y cambia la versión `serma-shell-v9` en `sw.js` a `serma-shell-v10`. Para el icono de una PWA ya instalada, desinstala la aplicación del teléfono/computador y vuelve a instalarla después de actualizar.

## Perfiles

- **Rectoría:** crea cursos de 6.º a 11.º (por ejemplo, 601 y 602), administra cuentas, estudiantes, materias, plantillas de planes y configuración; consulta información institucional.
- **Analista:** consulta los cursos asignados, crea y modifica planes/temas de asignaturas que tenga asignadas en su grado, y modifica el checklist de estudiantes solo para la combinación de curso y asignatura que rectoría le asignó. El servidor aplica estos permisos además de ocultar las acciones que no corresponden.
- **Familia:** consulta únicamente a los estudiantes asociados a su cuenta. Este perfil unifica la vista de acudientes y estudiantes para conservar los tres roles solicitados.

Las asignaturas se registran por separado para cada grado de 6.º a 11.º, aunque compartan nombre. Un mismo grado puede tener varios cursos, como 601 y 602. Rectoría crea primero los cursos en **Estudiantes** y luego matricula cada estudiante en uno. Cada estudiante recibe automáticamente los planes y temas de su grado; la plantilla curricular es común entre cursos, pero el checklist es individual. Rectoría o el analista asignado crean y modifican planes y temas; un analista solo puede administrar una plantilla de una asignatura/grado que le haya sido asignada. El avance en porcentaje se calcula sobre las cuatro etapas de todos los temas de la asignatura y se actualiza al guardar el checklist. En **Estudiantes** y **Avances y observaciones**, rectoría y analistas pueden filtrar por grado y materia o buscar estudiantes por nombre. El analista marca **Punto de partida**, **Investigación**, **Desarrollo de habilidad** y **Relación** en la ficha del estudiante, y el servidor comprueba la asignación exacta curso/asignatura al guardar cada etapa. Rectoría puede vincular varios estudiantes a una misma cuenta familiar o editar esos vínculos después; la familia consulta las fichas, checklist, porcentajes y observaciones de todos los estudiantes vinculados.

Los cambios de nombre institucional, periodo, tema y umbral de alertas se guardan en MySQL. Las contraseñas se procesan con Argon2id cuando lo incluye el PHP instalado (XAMPP disponible); si no, usan el algoritmo seguro predeterminado de PHP. Se comprueban con `password_verify()` y nunca se almacenan en texto legible.

## Uso desde un teléfono

La misma web reorganiza navegación, tablas, formularios y botones para pantallas pequeñas; el control para cerrar sesión permanece disponible en móvil. Para probarla en otro dispositivo conectado a la misma Wi-Fi, abre en el teléfono `http://IP-LOCAL-DEL-COMPUTADOR/SERMA/`. Apache y MySQL deben estar encendidos y el Firewall de Windows debe permitir Apache en la red privada. La instalación en la pantalla de inicio requiere HTTPS en el sitio publicado; por HTTP local algunas funciones PWA no estarán disponibles, aunque la vista adaptable sí funciona.

El service worker puede conservar solo la interfaz pública (HTML, CSS, JavaScript e iconos). No almacena respuestas del API ni datos académicos. La aplicación no contiene un APK Android separado: la versión móvil de esta entrega es web adaptable/PWA.

## Demostración temporal desde otra red (sin costo)

Para una exposición corta puedes dejar la base MySQL en tu portátil y publicar un enlace temporal con Cloudflare Quick Tunnel. Esto no migra la base ni convierte XAMPP en un servidor de producción: el portátil, MySQL y la ventana del túnel deben seguir encendidos y conectados. El enlace es temporal y cualquiera que lo conozca podrá abrir la página de acceso.

El archivo `expo-router.php` permite que el servidor temporal entregue solo SERMA; no publica el document root de XAMPP ni phpMyAdmin.

1. Inicia MySQL en XAMPP y confirma que `http://localhost/SERMA/` funcione en el portátil.
2. En una ventana de PowerShell, inicia el servidor local aislado:

   ```powershell
   Set-Location C:\xampp\htdocs\SERMA
   & C:\xampp\php\php.exe -S 127.0.0.1:8081 expo-router.php
   ```

3. Instala `cloudflared` desde la [guía oficial de Cloudflare](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/). En otra ventana de PowerShell inicia el túnel:

   ```powershell
   cloudflared tunnel --url http://127.0.0.1:8081
   ```

4. Comparte la URL `https://...trycloudflare.com` que aparece. Abre la raíz de esa URL; no agregues `/SERMA/`. Prueba el enlace desde un teléfono usando datos móviles.
5. Al terminar, detén ambas ventanas con `Ctrl+C`. Un nuevo túnel generará una URL distinta.

Usa cuentas y datos ficticios de demostración. No compartas credenciales de rectoría ni publiques datos reales de menores. El túnel rápido es para pruebas, puede interrumpirse y no ofrece garantía de disponibilidad; no es para producción.

## Comprobación rápida

- PHP CLI 8.1 o posterior, con extensiones `pdo_mysql` y `mbstring` habilitadas. La instalación XAMPP adjunta fue comprobada con PHP 8.2 y ambas extensiones.
- MySQL/MariaDB debe estar iniciado y aceptar la conexión indicada en `config.php`.
- Para revisar sintaxis PHP en Windows: `C:\xampp\php\php.exe -l api\index.php` y `C:\xampp\php\php.exe -l scripts\create_admin.php`.

## Alcance y pendientes

El documento de requisitos propone Firebase Authentication, Firestore y Storage, además de aplicaciones Android/de escritorio. Los adjuntos no incluyen credenciales ni un proyecto Firebase, ni código móvil nativo. Esta versión conserva la web y usa MySQL/MariaDB local de XAMPP; no se conecta a Firebase. Las guías se enlazan mediante URL: adjuntar archivos requiere configurar y proteger un servicio de almacenamiento.

XAMPP está preparado para desarrollo local. Antes de usar información real fuera de la red de pruebas, la institución debe configurar HTTPS, credenciales de base de datos propias y restringidas, copias de respaldo, revisión de permisos, mantenimiento y política de tratamiento de datos. La entrega no ha pasado auditoría de seguridad ni pruebas de carga; no se presenta como certificada para producción.
