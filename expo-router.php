<?php
declare(strict_types=1);

/**
 * Temporary, isolated origin for a local SERMA demonstration.
 * Run from the project directory with:
 * php -S 127.0.0.1:8081 expo-router.php
 *
 * This deliberately does not use Apache/XAMPP's document root, so paths such
 * as /phpmyadmin are not routed to the public demo. Only the frontend shell,
 * public images, and the SERMA API entry point are exposed.
 */
$path = parse_url($_SERVER["REQUEST_URI"] ?? "/", PHP_URL_PATH);
$path = is_string($path) ? rawurldecode($path) : "/";
$path = "/" . ltrim(str_replace("\\", "/", $path), "/");

if ($path === "/api/index.php") {
    require __DIR__ . "/api/index.php";
    exit();
}

if ($path === "/" || $path === "/index.html") {
    return false;
}

$allowedFiles = [
    "/assets/css/app.css",
    "/assets/js/app.js",
    "/manifest.webmanifest",
    "/sw.js",
    "/public/image/serma-icon-192.png",
    "/public/image/serma-icon-512.png",
];
if (in_array($path, $allowedFiles, true)) {
    return false;
}

// Allow named HTML templates only, without exposing arbitrary project files.
if (
    in_array(
        $path,
        [
            "/views/login.html",
            "/views/layout.html",
            "/views/inicio.html",
            "/views/estudiantes.html",
            "/views/planes.html",
            "/views/seguimiento.html",
            "/views/configuracion.html",
            "/views/usuarios.html",
            "/views/componentes.html",
        ],
        true,
    )
) {
    return false;
}

http_response_code(404);
header("Content-Type: text/plain; charset=utf-8");
echo "No encontrado";
