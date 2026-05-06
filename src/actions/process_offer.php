<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

/**
 * CampusTrade — Submit Offer Action
 *
 * POST endpoint to submit a purchase offer on a listing.
 * Prevents:
 *   - Buyers from making offers on their own listings
 *   - Duplicate pending offers by the same buyer on the same listing
 *   - Offers on non-active listings
 *
 * Expected POST fields:
 *   - listing_id:   int (required)
 *   - offer_amount: numeric (> 0, required)
 *   - message:      string (optional, max 500 chars)
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

$listingId   = isset($_POST['listing_id']) ? (int) $_POST['listing_id'] : 0;
$offerAmount = $_POST['offer_amount'] ?? '';
$message     = trim($_POST['message'] ?? '');
$buyerId     = (int) $_SESSION['student_id'];

if ($listingId <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Valid listing ID is required.', 'code' => 422]);
    exit;
}

if (!is_numeric($offerAmount) || (float) $offerAmount <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Offer amount must be a positive number.', 'code' => 422]);
    exit;
}
$offerAmount = (float) $offerAmount;

if (strlen($message) > 500) {
    $message = substr($message, 0, 500);
}

try {
    $pdo = getDBConnection();

    $listingStmt = $pdo->prepare('
        SELECT l.SellerID, l.Status, l.Title, s.Email AS SellerEmail, s.FullName AS SellerName
        FROM Listings l
        JOIN Students s ON l.SellerID = s.StudentID
        WHERE l.ListingID = ?
    ');
    $listingStmt->execute([$listingId]);
    $listing = $listingStmt->fetch();

    if (!$listing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Listing not found.', 'code' => 404]);
        exit;
    }

    if ((int) $listing['SellerID'] === $buyerId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You cannot make an offer on your own listing.', 'code' => 403]);
        exit;
    }

    if ($listing['Status'] !== 'Active') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'This listing is no longer active.', 'code' => 403]);
        exit;
    }

    $dupStmt = $pdo->prepare("
        SELECT COUNT(*) AS cnt FROM Offers
        WHERE ListingID = ? AND BuyerID = ? AND Status = 'Pending'
    ");
    $dupStmt->execute([$listingId, $buyerId]);
    if ($dupStmt->fetch()['cnt'] > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error'   => 'You already have a pending offer on this listing.',
            'code'    => 409
        ]);
        exit;
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO Offers (ListingID, BuyerID, OfferAmount, Message)
        VALUES (?, ?, ?, ?)
    ");
    $insertStmt->execute([$listingId, $buyerId, $offerAmount, $message ?: null]);

    $buyerName = $_SESSION['student_name'] ?? 'A user';
    $offerAmountFormatted = number_format($offerAmount, 2);
    $sellerEmail  = $listing['SellerEmail'];
    $sellerName   = $listing['SellerName'];
    $listingTitle = $listing['Title'];

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'ezzarclouth@gmail.com'; // User's Gmail
        $mail->Password   = 'qeghfriyufnyhqpf';      // User's App Password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        $mail->Timeout    = 5;

        $mail->setFrom('ezzarclouth@gmail.com', 'CampusTrade');
        $mail->addAddress($sellerEmail, $sellerName);

        $mail->isHTML(false);
        $mail->Subject = "New Offer on Your Listing: {$listingTitle}";
        
        $emailBody  = "Hello {$sellerName},\n\n";
        $emailBody .= "{$buyerName} has made a new offer on your listing \"{$listingTitle}\".\n\n";
        $emailBody .= "Offer Amount: {$offerAmountFormatted} EGP\n";
        if (!empty($message)) {
            $emailBody .= "Message from buyer:\n\"{$message}\"\n";
        }
        $emailBody .= "\nLog in to CampusTrade to accept or decline this offer.\n";
        
        $mail->Body = $emailBody;
        $mail->send();
    } catch (Exception $e) {
        error_log("Offer notification email could not be sent. Mailer Error: {$mail->ErrorInfo}");
    }

    echo json_encode([
        'success' => true,
        'message' => 'Your offer has been submitted successfully!'
    ]);

} catch (PDOException $e) {
    error_log("CampusTrade Action Error (process_offer): " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to submit offer.', 'code' => 500]);
}
