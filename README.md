# SERMA · IED Bruselas

Aplicación web adaptada a Apache, PHP y MySQL/MariaDB de XAMPP. Incluye una interfaz adaptable a móviles y puede instalarse en la pantalla de inicio como PWA en un origen HTTPS o `localhost`. La app conserva las funciones académicas del prototipo: estudiantes, materias, planes, enlaces a guías, avances, observaciones, alertas, tres perfiles y ajustes institucionales.

## Qué hace phpMyAdmin

phpMyAdmin es la interfaz para administrar MySQL/MariaDB. La base real la ejecuta el servicio **MySQL** de XAMPP; la aplicación se conecta desde PHP mediante PDO (`pdo_mysql`). No guardes los datos académicos en phpMyAdmin como archivos separados: importa el esquema SQL allí y luego PHP leerá y escribirá en esas tablas.

## Instalación con XAMPP

1. En el panel de XAMPP inicia **Apache** y **MySQL**.
2. Crea una carpeta, por ejemplo `C:\xampp\htdocs\SERMA`, y copia allí todos los archivos del ZIP. Evita abrir `index.html` directamente desde el explorador; debe servirse mediante Apache para que funcione PHP.
3. Abre `http://localhost/phpmyadmin`. En la pestaña **Importar**, selecciona `database.sql` y ejecuta la importación. El archivo crea la base `serma_ied_bruselas` y las tablas necesarias. Si tu instalación limita `CREATE DATABASE`, crea antes una base llamada `serma_ied_bruselas`, selecciónala e importa de nuevo el archivo.
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

## Perfiles

- **Rectoría:** administra cuentas, estudiantes, materias y configuración; consulta información institucional.
- **Analista:** registra estudiantes, planes, guías, avances y observaciones. Si rectoría le asigna materias, las operaciones se limitan a esas materias.
- **Familia:** consulta únicamente a los estudiantes asociados a su cuenta. Este perfil unifica la vista de acudientes y estudiantes para conservar los tres roles solicitados.

Los cambios de nombre institucional, periodo, tema y umbral de alertas se guardan en MySQL. Las contraseñas se procesan con Argon2id cuando lo incluye el PHP instalado (XAMPP disponible); si no, usan el algoritmo seguro predeterminado de PHP. Se comprueban con `password_verify()` y nunca se almacenan en texto legible.

## Uso desde un teléfono

La misma web reorganiza navegación, tablas, formularios y botones para pantallas pequeñas; el control para cerrar sesión permanece disponible en móvil. Para probarla en otro dispositivo conectado a la misma Wi-Fi, abre en el teléfono `http://IP-LOCAL-DEL-COMPUTADOR/SERMA/`. Apache y MySQL deben estar encendidos y el Firewall de Windows debe permitir Apache en la red privada. La instalación en la pantalla de inicio requiere HTTPS en el sitio publicado; por HTTP local algunas funciones PWA no estarán disponibles, aunque la vista adaptable sí funciona.

El service worker puede conservar solo la interfaz pública (HTML, CSS, JavaScript e iconos). No almacena respuestas del API ni datos académicos. La aplicación no contiene un APK Android separado: la versión móvil de esta entrega es web adaptable/PWA.

## Comprobación rápida

- PHP CLI 8.1 o posterior, con extensiones `pdo_mysql` y `mbstring` habilitadas. La instalación XAMPP adjunta fue comprobada con PHP 8.2 y ambas extensiones.
- MySQL/MariaDB debe estar iniciado y aceptar la conexión indicada en `config.php`.
- Para revisar sintaxis PHP en Windows: `C:\xampp\php\php.exe -l api\index.php` y `C:\xampp\php\php.exe -l scripts\create_admin.php`.

## Alcance y pendientes

El documento de requisitos propone Firebase Authentication, Firestore y Storage, además de aplicaciones Android/de escritorio. Los adjuntos no incluyen credenciales ni un proyecto Firebase, ni código móvil nativo. Esta versión conserva la web y usa MySQL/MariaDB local de XAMPP; no se conecta a Firebase. Las guías se enlazan mediante URL: adjuntar archivos requiere configurar y proteger un servicio de almacenamiento.

XAMPP está preparado para desarrollo local. Antes de usar información real fuera de la red de pruebas, la institución debe configurar HTTPS, credenciales de base de datos propias y restringidas, copias de respaldo, revisión de permisos, mantenimiento y política de tratamiento de datos. La entrega no ha pasado auditoría de seguridad ni pruebas de carga; no se presenta como certificada para producción.
