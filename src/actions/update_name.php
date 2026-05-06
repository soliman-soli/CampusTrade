<?php
/**
 * CampusTrade — Update Name Action
 *
 * POST endpoint to update the authenticated user's name.
 */

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../middleware/auth_check.php';
require_once __DIR__ . '/../config/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

$studentId = (int) $_SESSION['student_id'];
$newName = trim($_POST['full_name'] ?? '');

if (empty($newName) || strlen($newName) < 2 || strlen($newName) > 100) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'Full name must be between 2 and 100 characters.',
        'code'    => 422
    ]);
    exit;
}

try {
    $pdo = getDBConnection();

    $updateStmt = $pdo->prepare("UPDATE Students SET FullName = ? WHERE StudentID = ?");
    $updateStmt->execute([$newName, $studentId]);

    $_SESSION['student_name'] = $newName;

    echo json_encode([
        'success'   => true,
        'message'   => 'Name updated successfully!',
        'fullName'  => $newName
    ]);

} catch (PDOException $e) {
    error_log("CampusTrade Action Error (update_name): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to update name. Please try again.',
        'code'    => 500
    ]);
}
