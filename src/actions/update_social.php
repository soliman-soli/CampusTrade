<?php
/**
 * CampusTrade — Update Social Media Action
 *
 * POST endpoint to update the authenticated user's social media link.
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
$socialMedia = trim($_POST['social_media'] ?? '');

if (!empty($socialMedia) && strlen($socialMedia) > 255) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'Social media link is too long (max 255 chars).',
        'code'    => 422
    ]);
    exit;
}

try {
    $pdo = getDBConnection();

    $updateStmt = $pdo->prepare("UPDATE Students SET SocialMediaLink = ? WHERE StudentID = ?");
    $updateStmt->execute([$socialMedia ?: null, $studentId]);

    echo json_encode([
        'success'   => true,
        'message'   => 'Social media link updated successfully!',
        'socialMedia'  => $socialMedia
    ]);

} catch (PDOException $e) {
    error_log("CampusTrade Action Error (update_social): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to update social media link. Please try again.',
        'code'    => 500
    ]);
}
