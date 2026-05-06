<?php
/**
 * CampusTrade — My Listings API
 *
 * GET endpoint returning all listings created by the currently
 * authenticated user, including offer counts per listing.
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
    $studentId = (int) $_SESSION['student_id'];

    $stmt = $pdo->prepare("
        SELECT
            L.ListingID,
            L.Title,
            L.Description,
            L.Price,
            L.Condition,
            L.Status,
            L.CreatedAt,
            C.CategoryID,
            C.CategoryName,
            LI.ImagePath AS PrimaryImage,
            (SELECT COUNT(*) FROM Offers O WHERE O.ListingID = L.ListingID) AS OfferCount
        FROM Listings L
        INNER JOIN Categories C ON L.CategoryID = C.CategoryID
        LEFT  JOIN ListingImages LI ON LI.ListingID = L.ListingID AND LI.IsPrimary = 1
        WHERE L.SellerID = ? AND L.Status != 'Archived'
        ORDER BY L.CreatedAt DESC
    ");
    $stmt->execute([$studentId]);
    $listings = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data'    => $listings,
        'count'   => count($listings)
    ]);
} catch (PDOException $e) {
    error_log("CampusTrade API Error (my listings): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to fetch your listings.',
        'code'    => 500
    ]);
}
