<?php
/**
 * CampusTrade — Categories API
 *
 * GET endpoint that returns all listing categories.
 * Used to populate category dropdowns on the frontend.
 *
 * Response format:
 *   { "success": true, "data": [...], "count": N }
 */

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../middleware/auth_check.php';
require_once __DIR__ . '/../config/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'Method not allowed. Use GET.',
        'code'    => 405
    ]);
    exit;
}

try {
    $pdo = getDBConnection();

    $stmt = $pdo->query('SELECT CategoryID, CategoryName FROM Categories ORDER BY CategoryName ASC');
    $categories = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data'    => $categories,
        'count'   => count($categories)
    ]);
} catch (PDOException $e) {
    error_log("CampusTrade API Error (categories): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to fetch categories.',
        'code'    => 500
    ]);
}
