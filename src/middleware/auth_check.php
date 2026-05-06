<?php


if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['student_id']) || empty($_SESSION['student_id'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error'   => 'Unauthorized. Please log in to access this resource.',
        'code'    => 401
    ]);
    exit;
}
