<?php
/**
 * CampusTrade — My Offers API
 *
 * GET endpoint returning offers related to the authenticated user.
 * Returns two separate arrays:
 *   - offers_made:     Offers the user submitted on other people's listings
 *   - offers_received: Offers other users made on the user's listings
 *
 * Response format:
 *   { "success": true, "data": { "offers_made": [...], "offers_received": [...] } }
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

    $madeStmt = $pdo->prepare("
        SELECT
            O.OfferID,
            O.OfferAmount,
            O.Message,
            O.Status AS OfferStatus,
            O.CreatedAt AS OfferDate,
            L.ListingID,
            L.Title AS ListingTitle,
            L.Price AS ListingPrice,
            L.Status AS ListingStatus,
            S.FullName AS SellerName,
            LI.ImagePath AS ListingImage
        FROM Offers O
        INNER JOIN Listings L ON O.ListingID = L.ListingID
        INNER JOIN Students S ON L.SellerID  = S.StudentID
        LEFT  JOIN ListingImages LI ON LI.ListingID = L.ListingID AND LI.IsPrimary = 1
        WHERE O.BuyerID = ?
        ORDER BY O.CreatedAt DESC
    ");
    $madeStmt->execute([$studentId]);
    $offersMade = $madeStmt->fetchAll();

    $receivedStmt = $pdo->prepare("
        SELECT
            O.OfferID,
            O.OfferAmount,
            O.Message,
            O.Status AS OfferStatus,
            O.CreatedAt AS OfferDate,
            L.ListingID,
            L.Title AS ListingTitle,
            L.Price AS ListingPrice,
            L.Status AS ListingStatus,
            B.FullName AS BuyerName,
            B.StudentID AS BuyerID,
            LI.ImagePath AS ListingImage
        FROM Offers O
        INNER JOIN Listings L ON O.ListingID = L.ListingID
        INNER JOIN Students B ON O.BuyerID   = B.StudentID
        LEFT  JOIN ListingImages LI ON LI.ListingID = L.ListingID AND LI.IsPrimary = 1
        WHERE L.SellerID = ?
        ORDER BY O.CreatedAt DESC
    ");
    $receivedStmt->execute([$studentId]);
    $offersReceived = $receivedStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data'    => [
            'offers_made'     => $offersMade,
            'offers_received' => $offersReceived
        ]
    ]);
} catch (PDOException $e) {
    error_log("CampusTrade API Error (my offers): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to fetch your offers.',
        'code'    => 500
    ]);
}
