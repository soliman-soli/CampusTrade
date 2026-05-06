<?php


$envPath = __DIR__ . '/../../.env';
if (file_exists($envPath)) {
    $env = parse_ini_file($envPath);
    define('DB_SERVER', $env['DB_SERVER']);
    define('DB_PORT', $env['DB_PORT']);
    define('DB_NAME', $env['DB_NAME']);
    define('DB_USER', $env['DB_USER']);
    define('DB_PASS', $env['DB_PASS']);
} else {
    // Fallback if .env is missing
    define('DB_SERVER', getenv('DB_SERVER') ?: 'localhost');
    define('DB_PORT', getenv('DB_PORT') ?: '3306');
    define('DB_NAME', getenv('DB_NAME') ?: 'defaultdb');
    define('DB_USER', getenv('DB_USER') ?: 'root');
    define('DB_PASS', getenv('DB_PASS') ?: '');
}


function getDBConnection(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_SERVER . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
            ]);
        } catch (PDOException $e) {

            error_log("CampusTrade DB Connection Error: " . $e->getMessage());

            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error'   => 'Database connection failed. Please try again later.',
                'code'    => 500
            ]);
            exit;
        }
    }

    return $pdo;
}
