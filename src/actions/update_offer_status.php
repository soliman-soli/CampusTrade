<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

/**
 * CampusTrade — Update Offer Status Action
 *
 * POST endpoint for the listing seller to accept or reject offers.
 * Only the listing's seller can modify offer status.
 *
 * When an offer is ACCEPTED:
 *   1. The accepted offer's status is set to 'Accepted'
 *   2. The listing's status is set to 'Sold'
 *   3. All other pending offers on the same listing are rejected (batch update)
 *   4. An email is sent to the buyer with the seller's contact info
 *
 * Expected POST fields:
 *   - offer_id: int (required)
 *   - status:   string ('Accepted' or 'Rejected')
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

$offerId   = isset($_POST['offer_id']) ? (int) $_POST['offer_id'] : 0;
$newStatus = trim($_POST['status'] ?? '');
$studentId = (int) $_SESSION['student_id'];

if ($offerId <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Valid offer ID is required.', 'code' => 422]);
    exit;
}

$validStatuses = ['Accepted', 'Rejected'];
if (!in_array($newStatus, $validStatuses, true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Status must be Accepted or Rejected.', 'code' => 422]);
    exit;
}

try {
    $pdo = getDBConnection();

    $offerStmt = $pdo->prepare("
        SELECT O.OfferID, O.ListingID, O.BuyerID, O.OfferAmount, O.Status AS OfferStatus,
               L.SellerID, L.Title AS ListingTitle, L.Status AS ListingStatus,
               Buyer.FullName  AS BuyerName,
               Buyer.Email     AS BuyerEmail,
               Seller.FullName AS SellerName,
               Seller.Email    AS SellerEmail,
               Seller.PhoneNumber   AS SellerPhone,
               Seller.SocialMediaLink AS SellerSocial
        FROM Offers O
        INNER JOIN Listings L  ON O.ListingID = L.ListingID
        INNER JOIN Students Buyer  ON O.BuyerID  = Buyer.StudentID
        INNER JOIN Students Seller ON L.SellerID  = Seller.StudentID
        WHERE O.OfferID = ?
    ");
    $offerStmt->execute([$offerId]);
    $offer = $offerStmt->fetch();

    if (!$offer) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Offer not found.', 'code' => 404]);
        exit;
    }

    if ((int) $offer['SellerID'] !== $studentId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Only the listing seller can update offer status.', 'code' => 403]);
        exit;
    }

    if ($offer['OfferStatus'] !== 'Pending') {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'This offer has already been ' . strtolower($offer['OfferStatus']) . '.', 'code' => 409]);
        exit;
    }

    $pdo->beginTransaction();

    $updateOffer = $pdo->prepare("UPDATE Offers SET Status = ? WHERE OfferID = ?");
    $updateOffer->execute([$newStatus, $offerId]);

    if ($newStatus === 'Accepted') {

        $updateListing = $pdo->prepare("UPDATE Listings SET Status = 'Sold' WHERE ListingID = ?");
        $updateListing->execute([$offer['ListingID']]);

        $rejectOthers = $pdo->prepare("
            UPDATE Offers SET Status = 'Rejected'
            WHERE ListingID = ? AND OfferID != ? AND Status = 'Pending'
        ");
        $rejectOthers->execute([$offer['ListingID'], $offerId]);
    }

    $pdo->commit();

    if ($newStatus === 'Accepted') {
        $buyerEmail   = $offer['BuyerEmail'];
        $buyerName    = $offer['BuyerName'];
        $sellerName   = $offer['SellerName'];
        $sellerEmail  = $offer['SellerEmail'];
        $sellerPhone  = $offer['SellerPhone'];
        $sellerSocial = $offer['SellerSocial'] ?? '';
        $listingTitle = $offer['ListingTitle'];
        $offerAmount  = number_format((float) $offer['OfferAmount'], 2);

        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = 'ezzarclouth@gmail.com';
            $mail->Password   = 'qeghfriyufnyhqpf';
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;
            $mail->Timeout    = 5;

            $mail->setFrom('ezzarclouth@gmail.com', 'CampusTrade');
            $mail->addAddress($buyerEmail, $buyerName);

            $mail->isHTML(false);
            $mail->Subject = "Your Offer Was Accepted: {$listingTitle}";

            $emailBody  = "Hello {$buyerName},\n\n";
            $emailBody .= "Great news! Your offer of {$offerAmount} EGP on \"{$listingTitle}\" has been accepted by {$sellerName}.\n\n";
            $emailBody .= "Here is the seller's contact information so you can arrange the exchange:\n\n";
            $emailBody .= "  Name:  {$sellerName}\n";
            $emailBody .= "  Email: {$sellerEmail}\n";
            $emailBody .= "  Phone: {$sellerPhone}\n";

            if (!empty($sellerSocial)) {
                $emailBody .= "  Social Media: {$sellerSocial}\n";
            }

            $emailBody .= "\nPlease reach out to them to finalize the deal.\n";
            $emailBody .= "Thank you for using CampusTrade!\n";

            $mail->Body = $emailBody;
            $mail->send();
        } catch (Exception $e) {

            error_log("Accepted-offer notification email could not be sent. Mailer Error: {$mail->ErrorInfo}");
        }
    }

    $action = $newStatus === 'Accepted' ? 'accepted' : 'rejected';
    echo json_encode([
        'success' => true,
        'message' => "Offer has been {$action} successfully."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("CampusTrade Action Error (update_offer_status): " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to update offer status.', 'code' => 500]);
}
