<?php
/**
 * CampusTrade — Create Listing Action
 *
 * POST endpoint to create a new listing with image upload.
 * Requires authentication. Validates all input fields and
 * handles secure file upload with MIME type verification.
 *
 * Expected POST fields:
 *   - title:       string (3-100 chars)
 *   - description: string (10-1000 chars)
 *   - price:       numeric (>= 0)
 *   - category_id: int (must exist in Categories table)
 *   - condition:   string (New|Like New|Good|Fair)
 *
 * Expected FILE:
 *   - listing_image: JPEG, PNG, or WebP, max 5MB
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

$title       = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$price       = $_POST['price'] ?? '';
$categoryId  = isset($_POST['category_id']) ? (int) $_POST['category_id'] : 0;
$condition   = trim($_POST['condition'] ?? '');
$sellerId    = (int) $_SESSION['student_id'];

if (strlen($title) < 3 || strlen($title) > 100) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'Title must be between 3 and 100 characters.',
        'code'    => 422
    ]);
    exit;
}

if (strlen($description) < 10 || strlen($description) > 1000) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'Description must be between 10 and 1000 characters.',
        'code'    => 422
    ]);
    exit;
}

if (!is_numeric($price) || (float) $price < 0) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'Price must be a non-negative number.',
        'code'    => 422
    ]);
    exit;
}
$price = (float) $price;

$validConditions = ['New', 'Like New', 'Good', 'Fair'];
if (!in_array($condition, $validConditions, true)) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'Condition must be one of: New, Like New, Good, Fair.',
        'code'    => 422
    ]);
    exit;
}

try {
    $pdo = getDBConnection();

    $catStmt = $pdo->prepare('SELECT COUNT(*) AS cnt FROM Categories WHERE CategoryID = ?');
    $catStmt->execute([$categoryId]);
    if ($catStmt->fetch()['cnt'] == 0) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'error'   => 'Selected category does not exist.',
            'code'    => 422
        ]);
        exit;
    }

    $imagePath = null;

    if (isset($_FILES['listing_image']) && $_FILES['listing_image']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['listing_image'];

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
        $newFilename = uniqid('img_', true) . '.' . $ext;

        $uploadDir = __DIR__ . '/../../uploads/listings/';

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

        $imagePath = 'uploads/listings/' . $newFilename;

    } elseif (isset($_FILES['listing_image']) && $_FILES['listing_image']['error'] !== UPLOAD_ERR_NO_FILE) {

        http_response_code(422);
        echo json_encode([
            'success' => false,
            'error'   => 'Image upload failed. Error code: ' . $_FILES['listing_image']['error'],
            'code'    => 422
        ]);
        exit;
    }

    $pdo->beginTransaction();

    $listingStmt = $pdo->prepare("
        INSERT INTO Listings (SellerID, CategoryID, Title, Description, Price, `Condition`)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $listingStmt->execute([$sellerId, $categoryId, $title, $description, $price, $condition]);

    $listingId = $pdo->lastInsertId();

    if ($imagePath !== null) {
        $imgStmt = $pdo->prepare("
            INSERT INTO ListingImages (ListingID, ImagePath, IsPrimary)
            VALUES (?, ?, 1)
        ");
        $imgStmt->execute([$listingId, $imagePath]);
    }

    $pdo->commit();

    echo json_encode([
        'success'   => true,
        'message'   => 'Listing created successfully!',
        'listingId' => (int) $listingId
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("CampusTrade Action Error (process_listing): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to create listing. Please try again.',
        'code'    => 500
    ]);
}
