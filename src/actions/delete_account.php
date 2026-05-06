<?php
/**
 * CampusTrade — Delete Account Action
 *
 * POST endpoint to delete the currently logged in user's account.
 * This also deletes all of their listings and offers due to cascading if set up,
 * or we can manually delete them to be safe.
 */

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../middleware/auth_check.php';
require_once __DIR__ . '/../config/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.', 'code' => 405]);
    exit;
}

$studentId = (int) $_SESSION['student_id'];

try {
    $pdo = getDBConnection();
    $pdo->beginTransaction();

    $pdo->prepare('
        DELETE FROM ListingImages 
        WHERE ListingID IN (SELECT ListingID FROM Listings WHERE SellerID = ?)
    ')->execute([$studentId]);

    $pdo->prepare('DELETE FROM Offers WHERE BuyerID = ?')->execute([$studentId]);

    $pdo->prepare('
        DELETE FROM Offers 
        WHERE ListingID IN (SELECT ListingID FROM Listings WHERE SellerID = ?)
    ')->execute([$studentId]);

    $pdo->prepare('DELETE FROM Listings WHERE SellerID = ?')->execute([$studentId]);

    $pdo->prepare('DELETE FROM Students WHERE StudentID = ?')->execute([$studentId]);

    $pdo->commit();

    $_SESSION = [];
    session_destroy();
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    echo json_encode([
        'success' => true,
        'message' => 'Account deleted successfully.'
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("CampusTrade Action Error (delete_account): " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to delete account. Database error.', 'code' => 500]);
}
