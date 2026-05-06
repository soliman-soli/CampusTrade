<?php
/**
 * CampusTrade — Update Listing Action
 *
 * POST endpoint to edit an existing listing. Only the listing
 * owner (seller) can update their own listings.
 *
 * Expected POST fields:
 *   - listing_id:  int (required)
 *   - title:       string (3-100 chars)
 *   - description: string (10-1000 chars)
 *   - price:       numeric (>= 0)
 *   - category_id: int
 *   - condition:   string (New|Like New|Good|Fair)
 *
 * Optional FILE:
 *   - listing_image: JPEG, PNG, or WebP, max 5MB (replaces current primary image)
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

$listingId   = isset($_POST['listing_id']) ? (int) $_POST['listing_id'] : 0;
$title       = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$price       = $_POST['price'] ?? '';
$categoryId  = isset($_POST['category_id']) ? (int) $_POST['category_id'] : 0;
$condition   = trim($_POST['condition'] ?? '');
$studentId   = (int) $_SESSION['student_id'];

if ($listingId <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Valid listing ID is required.', 'code' => 422]);
    exit;
}

if (strlen($title) < 3 || strlen($title) > 100) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Title must be between 3 and 100 characters.', 'code' => 422]);
    exit;
}

if (strlen($description) < 10 || strlen($description) > 1000) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Description must be between 10 and 1000 characters.', 'code' => 422]);
    exit;
}

if (!is_numeric($price) || (float) $price < 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Price must be a non-negative number.', 'code' => 422]);
    exit;
}
$price = (float) $price;

$validConditions = ['New', 'Like New', 'Good', 'Fair'];
if (!in_array($condition, $validConditions, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Condition must be one of: New, Like New, Good, Fair.', 'code' => 422]);
    exit;
}

try {
    $pdo = getDBConnection();

    $ownerStmt = $pdo->prepare('SELECT SellerID, Status FROM Listings WHERE ListingID = ?');
    $ownerStmt->execute([$listingId]);
    $listing = $ownerStmt->fetch();

    if (!$listing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Listing not found.', 'code' => 404]);
        exit;
    }

    if ((int) $listing['SellerID'] !== $studentId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You can only edit your own listings.', 'code' => 403]);
        exit;
    }

    if ($listing['Status'] === 'Archived') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cannot edit an archived listing.', 'code' => 403]);
        exit;
    }

    $catStmt = $pdo->prepare('SELECT COUNT(*) AS cnt FROM Categories WHERE CategoryID = ?');
    $catStmt->execute([$categoryId]);
    if ($catStmt->fetch()['cnt'] == 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'error' => 'Selected category does not exist.', 'code' => 422]);
        exit;
    }

    $pdo->beginTransaction();

    $updateStmt = $pdo->prepare("
        UPDATE Listings
        SET Title = ?, Description = ?, Price = ?, CategoryID = ?, Condition = ?
        WHERE ListingID = ? AND SellerID = ?
    ");
    $updateStmt->execute([$title, $description, $price, $categoryId, $condition, $listingId, $studentId]);

    if (isset($_POST['remove_image']) && $_POST['remove_image'] === '1') {

        $pdo->prepare('DELETE FROM ListingImages WHERE ListingID = ? AND IsPrimary = 1')->execute([$listingId]);
    } elseif (isset($_FILES['listing_image']) && $_FILES['listing_image']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['listing_image'];

        if ($file['size'] > 5 * 1024 * 1024) {
            $pdo->rollBack();
            http_response_code(422);
            echo json_encode(['success' => false, 'error' => 'Image file size must be under 5MB.', 'code' => 422]);
            exit;
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        $allowedMimes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

        if (!isset($allowedMimes[$mimeType])) {
            $pdo->rollBack();
            http_response_code(422);
            echo json_encode(['success' => false, 'error' => 'Only JPEG, PNG, and WebP images are allowed.', 'code' => 422]);
            exit;
        }

        $ext = $allowedMimes[$mimeType];
        $newFilename = uniqid('img_', true) . '.' . $ext;
        $uploadDir = __DIR__ . '/../../uploads/listings/';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $newFilename)) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to save uploaded image.', 'code' => 500]);
            exit;
        }

        $imagePath = 'uploads/listings/' . $newFilename;

        $pdo->prepare('DELETE FROM ListingImages WHERE ListingID = ? AND IsPrimary = 1')->execute([$listingId]);

        $imgStmt = $pdo->prepare('INSERT INTO ListingImages (ListingID, ImagePath, IsPrimary) VALUES (?, ?, 1)');
        $imgStmt->execute([$listingId, $imagePath]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Listing updated successfully!'
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("CampusTrade Action Error (update_listing): " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to update listing.', 'code' => 500]);
}
