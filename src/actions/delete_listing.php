<?php
/**
 * CampusTrade — Delete (Archive) Listing Action
 *
 * POST endpoint to soft-delete a listing by setting its Status
 * to 'Archived'. Only the listing owner can perform this action.
 * Archived listings are hidden from browse views but remain in the database.
 *
 * Expected POST fields:
 *   - listing_id: int (required)
 */

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../middleware/auth_check.php';
require_once __DIR__ . '/../config/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.', 'code' => 405]);
    exit;
}

$listingId = isset($_POST['listing_id']) ? (int) $_POST['listing_id'] : 0;
$studentId = (int) $_SESSION['student_id'];

if ($listingId <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Valid listing ID is required.', 'code' => 422]);
    exit;
}

try {
    $pdo = getDBConnection();

    $stmt = $pdo->prepare('SELECT SellerID, Status FROM Listings WHERE ListingID = ?');
    $stmt->execute([$listingId]);
    $listing = $stmt->fetch();

    if (!$listing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Listing not found.', 'code' => 404]);
        exit;
    }

    if ((int) $listing['SellerID'] !== $studentId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You can only delete your own listings.', 'code' => 403]);
        exit;
    }

    if ($listing['Status'] === 'Archived') {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'This listing is already archived.', 'code' => 409]);
        exit;
    }

    $updateStmt = $pdo->prepare("UPDATE Listings SET Status = 'Archived' WHERE ListingID = ? AND SellerID = ?");
    $updateStmt->execute([$listingId, $studentId]);

    echo json_encode([
        'success' => true,
        'message' => 'Listing archived successfully. Deleted listings are archived, not permanently removed.'
    ]);

} catch (PDOException $e) {
    error_log("CampusTrade Action Error (delete_listing): " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to delete listing.', 'code' => 500]);
}
