<?php
/**
 * CampusTrade — Single Listing Detail API
 *
 * GET endpoint returning full details for a single listing,
 * including all associated images and offers.
 *
 * Required GET param:
 *   ?id=  — The ListingID to retrieve
 *
 * Response includes: listing details, seller info, category,
 * all images (not just primary), and all offers with buyer names.
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

$listingId = isset($_GET['id']) ? (int) $_GET['id'] : 0;

if ($listingId <= 0) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'A valid listing ID is required.',
        'code'    => 422
    ]);
    exit;
}

try {
    $pdo = getDBConnection();

    $stmt = $pdo->prepare("
        SELECT
            L.ListingID,
            L.Title,
            L.Description,
            L.Price,
            L.Condition,
            L.Status,
            L.CreatedAt,
            S.StudentID AS SellerID,
            S.FullName  AS SellerName,
            S.SocialMediaLink AS SellerSocialMedia,
            S.CreatedAt AS SellerMemberSince,
            C.CategoryID,
            C.CategoryName
        FROM Listings L
        INNER JOIN Students   S ON L.SellerID  = S.StudentID
        INNER JOIN Categories C ON L.CategoryID = C.CategoryID
        WHERE L.ListingID = ?
    ");
    $stmt->execute([$listingId]);
    $listing = $stmt->fetch();

    if (!$listing) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error'   => 'Listing not found.',
            'code'    => 404
        ]);
        exit;
    }

    $imgStmt = $pdo->prepare("
        SELECT ImageID, ImagePath, IsPrimary, UploadedAt
        FROM ListingImages
        WHERE ListingID = ?
        ORDER BY IsPrimary DESC, UploadedAt ASC
    ");
    $imgStmt->execute([$listingId]);
    $images = $imgStmt->fetchAll();

    $offerStmt = $pdo->prepare("
        SELECT
            O.OfferID,
            O.BuyerID,
            S.FullName AS BuyerName,
            O.OfferAmount,
            O.Message,
            O.Status,
            O.CreatedAt
        FROM Offers O
        INNER JOIN Students S ON O.BuyerID = S.StudentID
        WHERE O.ListingID = ?
        ORDER BY O.CreatedAt DESC
    ");
    $offerStmt->execute([$listingId]);
    $offers = $offerStmt->fetchAll();

    $listing['images'] = $images;
    $listing['offers'] = $offers;
    $listing['is_owner'] = ((int) $_SESSION['student_id'] === (int) $listing['SellerID']);
    $listing['current_user_id'] = (int) $_SESSION['student_id'];

    echo json_encode([
        'success' => true,
        'data'    => $listing
    ]);
} catch (PDOException $e) {
    error_log("CampusTrade API Error (listing detail): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to fetch listing details.',
        'code'    => 500
    ]);
}
