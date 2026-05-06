<?php
/**
 * CampusTrade — Listings API
 *
 * GET endpoint returning all active listings with optional filters.
 * Joins Listings → Students → Categories → ListingImages (primary only)
 * in a single query for efficiency.
 *
 * Supported filters (GET params):
 *   ?category=   — CategoryID to filter by
 *   ?search=     — LIKE search on Title and Description
 *   ?min_price=  — Minimum price filter
 *   ?max_price=  — Maximum price filter
 *   ?condition=  — Exact condition match (New, Like New, Good, Fair)
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

    $sql = "
        SELECT
            L.ListingID,
            L.Title,
            L.Description,
            L.Price,
            L.Condition,
            L.Status,
            L.CreatedAt,
            S.StudentID AS SellerID,
            S.FullName  AS SellerName,
            C.CategoryID,
            C.CategoryName,
            LI.ImagePath AS PrimaryImage
        FROM Listings L
        INNER JOIN Students   S  ON L.SellerID   = S.StudentID
        INNER JOIN Categories C  ON L.CategoryID  = C.CategoryID
        LEFT  JOIN ListingImages LI ON LI.ListingID = L.ListingID AND LI.IsPrimary = 1
        WHERE L.Status = 'Active'
    ";

    $params = [];
    $conditions = [];

    if (!empty($_GET['category'])) {
        $conditions[] = "L.CategoryID = ?";
        $params[] = (int) $_GET['category'];
    }

    if (!empty($_GET['search'])) {
        $searchTerm = '%' . $_GET['search'] . '%';
        $conditions[] = "(L.Title LIKE ? OR L.Description LIKE ?)";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    if (isset($_GET['min_price']) && $_GET['min_price'] !== '') {
        $conditions[] = "L.Price >= ?";
        $params[] = (float) $_GET['min_price'];
    }

    if (isset($_GET['max_price']) && $_GET['max_price'] !== '') {
        $conditions[] = "L.Price <= ?";
        $params[] = (float) $_GET['max_price'];
    }

    if (!empty($_GET['condition'])) {
        $validConditions = ['New', 'Like New', 'Good', 'Fair'];
        if (in_array($_GET['condition'], $validConditions, true)) {
            $conditions[] = "L.Condition = ?";
            $params[] = $_GET['condition'];
        }
    }

    if (!empty($conditions)) {
        $sql .= ' AND ' . implode(' AND ', $conditions);
    }

    $sql .= ' ORDER BY L.CreatedAt DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $listings = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data'    => $listings,
        'count'   => count($listings)
    ]);
} catch (PDOException $e) {
    error_log("CampusTrade API Error (listings): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to fetch listings.',
        'code'    => 500
    ]);
}
