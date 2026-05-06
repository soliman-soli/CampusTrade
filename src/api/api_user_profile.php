<?php
/**
 * CampusTrade — User Profile API
 *
 * GET endpoint to fetch the authenticated user's profile information.
 */

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../middleware/auth_check.php';
require_once __DIR__ . '/../config/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$studentId = (int) $_SESSION['student_id'];

try {
    $pdo = getDBConnection();
    
    $stmt = $pdo->prepare("SELECT FullName, Email, PhoneNumber, ProfileImage, SocialMediaLink FROM Students WHERE StudentID = ?");
    $stmt->execute([$studentId]);
    $user = $stmt->fetch();

    if ($user) {
        echo json_encode([
            'success' => true,
            'user' => [
                'fullName'     => $user['FullName'],
                'email'        => $user['Email'],
                'phone'        => $user['PhoneNumber'],
                'profileImage' => $user['ProfileImage'],
                'socialMedia'  => $user['SocialMediaLink']
            ]
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
    }

} catch (PDOException $e) {
    error_log("CampusTrade API Error (api_user_profile): " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error']);
}
