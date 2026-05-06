<?php


define('DB_SERVER', 'localhost\\SQLEXPRESS');
define('DB_NAME', 'CampusTrade');
define('DB_USER', '');
define('DB_PASS', '');


function getDBConnection(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = "sqlsrv:Server=" . DB_SERVER . ";Database=" . DB_NAME . ";TrustServerCertificate=yes";
            $pdo = new PDO($dsn, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::SQLSRV_ATTR_ENCODING    => PDO::SQLSRV_ENCODING_UTF8,
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
