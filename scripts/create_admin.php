<?php
declare(strict_types=1);

<<<<<<< HEAD
if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit();
}

$configFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . "config.php";
if (!is_file($configFile)) {
    fwrite(
        STDERR,
        "Falta config.php. Copia config.example.php, edítalo y vuelve a ejecutar este comando.\n",
    );
    exit(1);
}
$config = require $configFile;
$email = strtolower(trim((string) (getenv("SERMA_ADMIN_EMAIL") ?: "")));
$password = (string) (getenv("SERMA_ADMIN_PASSWORD") ?: "");
$name = trim((string) (getenv("SERMA_ADMIN_NAME") ?: "Rectoría"));
if (
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    strlen($password) < 12 ||
    strlen($name) < 3
) {
    fwrite(
        STDERR,
        "Define SERMA_ADMIN_EMAIL, SERMA_ADMIN_NAME y SERMA_ADMIN_PASSWORD (mínimo 12 caracteres).\n",
    );
=======
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$configFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'config.php';
if (!is_file($configFile)) {
    fwrite(STDERR, "Falta config.php. Copia config.example.php, edítalo y vuelve a ejecutar este comando.\n");
    exit(1);
}
$config = require $configFile;
$email = strtolower(trim((string)(getenv('SERMA_ADMIN_EMAIL') ?: '')));
$password = (string)(getenv('SERMA_ADMIN_PASSWORD') ?: '');
$name = trim((string)(getenv('SERMA_ADMIN_NAME') ?: 'Rectoría'));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12 || strlen($name) < 3) {
    fwrite(STDERR, "Define SERMA_ADMIN_EMAIL, SERMA_ADMIN_NAME y SERMA_ADMIN_PASSWORD (mínimo 12 caracteres).\n");
>>>>>>> 77025a8413dea2717fa46a566ab5b187434a2a70
    exit(1);
}

try {
<<<<<<< HEAD
    $dsn = sprintf(
        "mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4",
        $config["db_host"],
        $config["db_port"],
        $config["db_name"],
    );
    $pdo = new PDO($dsn, $config["db_user"], $config["db_password"], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $count = (int) $pdo
        ->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        ->fetchColumn();
=======
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $config['db_name']);
    $pdo = new PDO($dsn, $config['db_user'], $config['db_password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $count = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
>>>>>>> 77025a8413dea2717fa46a566ab5b187434a2a70
    if ($count > 0) {
        fwrite(STDERR, "Ya existe una cuenta de rectoría; no se creó otra.\n");
        exit(1);
    }
<<<<<<< HEAD
    $algorithm =
        defined("PASSWORD_ARGON2ID") &&
        in_array("argon2id", password_algos(), true)
            ? PASSWORD_ARGON2ID
            : PASSWORD_DEFAULT;
    if ($algorithm === PASSWORD_DEFAULT && strlen($password) > 72) {
        fwrite(
            STDERR,
            "La contraseña supera el límite admitido por el algoritmo disponible en este PHP.\n",
        );
        exit(1);
    }
    $stmt = $pdo->prepare(
        'INSERT INTO users (id,name,email,role,password_hash) VALUES (:id,:name,:email,\'admin\',:hash)',
    );
    $stmt->execute([
        ":id" => sprintf(
            "%04x%04x-%04x-%04x-%04x-%04x%04x%04x",
            random_int(0, 65535),
            random_int(0, 65535),
            random_int(0, 65535),
            random_int(16384, 20479),
            random_int(32768, 49151),
            random_int(0, 65535),
            random_int(0, 65535),
            random_int(0, 65535),
        ),
        ":name" => $name,
        ":email" => $email,
        ":hash" => password_hash($password, $algorithm),
    ]);
    echo "Cuenta inicial creada. Inicia sesión con el correo configurado.\n";
} catch (Throwable $e) {
    fwrite(
        STDERR,
        "No se pudo crear la cuenta. Verifica la conexión y que hayas importado database.sql.\n",
    );
=======
    $algorithm = defined('PASSWORD_ARGON2ID') && in_array('argon2id', password_algos(), true) ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
    if ($algorithm === PASSWORD_DEFAULT && strlen($password) > 72) {
        fwrite(STDERR, "La contraseña supera el límite admitido por el algoritmo disponible en este PHP.\n");
        exit(1);
    }
    $stmt = $pdo->prepare('INSERT INTO users (id,name,email,role,password_hash) VALUES (:id,:name,:email,\'admin\',:hash)');
    $stmt->execute([
        ':id' => sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', random_int(0,65535), random_int(0,65535), random_int(0,65535), random_int(16384,20479), random_int(32768,49151), random_int(0,65535), random_int(0,65535), random_int(0,65535)),
        ':name' => $name,
        ':email' => $email,
        ':hash' => password_hash($password, $algorithm),
    ]);
    echo "Cuenta inicial creada. Inicia sesión con el correo configurado.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "No se pudo crear la cuenta. Verifica la conexión y que hayas importado database.sql.\n");
>>>>>>> 77025a8413dea2717fa46a566ab5b187434a2a70
    exit(1);
}
