<?php
/**
 * CampusTrade — Upload Profile Image Action
 *
 * POST endpoint to upload a new profile image.
 * Requires authentication. Handles secure file upload with MIME type verification.
 * Updates the user's ProfileImage in the database.
 *
 * Expected FILE:
 *   - profile_image: JPEG, PNG, or WebP, max 5MB
 */

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../middleware/auth_check.php';
require_once __DIR__ . '/../config/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'Method not allowed. Use POST.',
        'code'    => 405
    ]);
    exit;
}

$studentId = (int) $_SESSION['student_id'];

if (!isset($_FILES['profile_image']) || $_FILES['profile_image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'Please provide a valid image file.',
        'code'    => 422
    ]);
    exit;
}

$file = $_FILES['profile_image'];

$maxSize = 5 * 1024 * 1024; // 5MB in bytes
if ($file['size'] > $maxSize) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'Image file size must be under 5MB.',
        'code'    => 422
    ]);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

$allowedMimes = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

if (!isset($allowedMimes[$mimeType])) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'Only JPEG, PNG, and WebP images are allowed.',
        'code'    => 422
    ]);
    exit;
}

$ext = $allowedMimes[$mimeType];
$newFilename = uniqid('profile_', true) . '.' . $ext;

$uploadDir = __DIR__ . '/../../uploads/profiles/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$destination = $uploadDir . $newFilename;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to save uploaded image. Please try again.',
        'code'    => 500
    ]);
    exit;
}

$imagePath = 'uploads/profiles/' . $newFilename;

try {
    $pdo = getDBConnection();

    $stmt = $pdo->prepare("SELECT ProfileImage FROM Students WHERE StudentID = ?");
    $stmt->execute([$studentId]);
    $oldImage = $stmt->fetchColumn();

    $updateStmt = $pdo->prepare("UPDATE Students SET ProfileImage = ? WHERE StudentID = ?");
    $updateStmt->execute([$imagePath, $studentId]);

    if ($oldImage && file_exists(__DIR__ . '/../../' . $oldImage)) {
        unlink(__DIR__ . '/../../' . $oldImage);
    }

    echo json_encode([
        'success'   => true,
        'message'   => 'Profile image updated successfully!',
        'imagePath' => $imagePath
    ]);

} catch (PDOException $e) {
    error_log("CampusTrade Action Error (upload_profile_image): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to update profile image. Please try again.',
        'code'    => 500
    ]);
}
