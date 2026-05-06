<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

/**
 * CampusTrade — Authentication Handler
 *
 * Handles user registration, login, and logout.
 * Accepts POST requests with an 'action' field set to:
 *   - 'register': Create a new student account
 *   - 'login':    Authenticate and start a session
 *   - 'logout':   Destroy the current session
 *
 * All responses are JSON with Content-Type: application/json.
 */

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'Method not allowed. Use POST.',
        'code'    => 405
    ]);
    exit;
}

require_once __DIR__ . '/../config/db_connect.php';

$action = $_POST['action'] ?? '';

switch ($action) {
    case 'register':
        handleRegister();
        break;
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'forgot_password':
        handleForgotPassword();
        break;
    case 'reset_password':
        handleResetPassword();
        break;
    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error'   => 'Invalid action. Expected: register, login, logout, forgot_password, or reset_password.',
            'code'    => 400
        ]);
        exit;
}

/**
 * Handles new student registration.
 *
 * Validates all input fields, checks for duplicate email,
 * hashes the password with bcrypt, and creates the account.
 * On success, starts a session and returns a redirect URL.
 */
function handleRegister(): void
{
    $fullName    = trim($_POST['full_name'] ?? '');
    $email       = trim($_POST['email'] ?? '');
    $phone       = trim($_POST['phone'] ?? '');
    $socialMedia = trim($_POST['social_media'] ?? '');
    $password    = $_POST['password'] ?? '';
    $confirmPass = $_POST['confirm_password'] ?? '';

    if (empty($fullName) || strlen($fullName) < 2 || strlen($fullName) > 100) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'error'   => 'Full name must be between 2 and 100 characters.',
            'code'    => 422
        ]);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'error'   => 'Please provide a valid email address.',
            'code'    => 422
        ]);
        exit;
    }

    if (!preg_match('/^\d{10,15}$/', $phone)) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'error'   => 'Phone number must be 10 to 15 digits.',
            'code'    => 422
        ]);
        exit;
    }

    if (strlen($password) < 8) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'error'   => 'Password must be at least 8 characters long.',
            'code'    => 422
        ]);
        exit;
    }

    if ($password !== $confirmPass) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'error'   => 'Passwords do not match.',
            'code'    => 422
        ]);
        exit;
    }

    $pdo = getDBConnection();

    $stmt = $pdo->prepare('SELECT COUNT(*) AS cnt FROM Students WHERE Email = ?');
    $stmt->execute([$email]);
    $result = $stmt->fetch();

    if ($result['cnt'] > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error'   => 'An account with this email already exists.',
            'code'    => 409
        ]);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare(
        'INSERT INTO Students (FullName, Email, PasswordHash, PhoneNumber, SocialMediaLink)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$fullName, $email, $passwordHash, $phone, $socialMedia ?: null]);

    $studentId = $pdo->lastInsertId();

    $_SESSION['student_id']   = (int) $studentId;
    $_SESSION['student_name'] = $fullName;

    echo json_encode([
        'success'  => true,
        'message'  => 'Registration successful! Welcome to CampusTrade.',
        'redirect' => 'dashboard.html'
    ]);
}

/**
 * Handles student login.
 *
 * Fetches the student by email and verifies the password
 * using bcrypt comparison. On success, starts a session.
 */
function handleLogin(): void
{
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($email) || empty($password)) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'error'   => 'Email and password are required.',
            'code'    => 422
        ]);
        exit;
    }

    $pdo = getDBConnection();

    $stmt = $pdo->prepare(
        'SELECT StudentID, FullName, Email, PasswordHash
         FROM Students WHERE Email = ?'
    );
    $stmt->execute([$email]);
    $student = $stmt->fetch();

    if (!$student || !password_verify($password, $student['PasswordHash'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error'   => 'Invalid email or password.',
            'code'    => 401
        ]);
        exit;
    }

    $_SESSION['student_id']   = (int) $student['StudentID'];
    $_SESSION['student_name'] = $student['FullName'];

    echo json_encode([
        'success'  => true,
        'message'  => 'Login successful!',
        'redirect' => 'dashboard.html'
    ]);
}

/**
 * Handles session logout.
 *
 * Destroys the current session and confirms via JSON.
 */
function handleLogout(): void
{

    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }

    session_destroy();

    echo json_encode([
        'success' => true,
        'message' => 'You have been logged out successfully.'
    ]);
}

/**
 * Handles forgot password request.
 */
function handleForgotPassword(): void
{
    $email = trim($_POST['email'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'error' => 'Please provide a valid email address.']);
        exit;
    }

    $pdo = getDBConnection();
    $stmt = $pdo->prepare('SELECT StudentID FROM Students WHERE Email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $update = $pdo->prepare('UPDATE Students SET ResetToken = ?, ResetTokenExpiresAt = ? WHERE StudentID = ?');
        $update->execute([$token, $expires, $user['StudentID']]);

        $resetLink = "http://localhost:8000/reset_password.html?token=" . $token;

        $mail = new PHPMailer(true);
        try {

            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com'; // Gmail SMTP server
            $mail->SMTPAuth   = true;
            $mail->Username   = 'ezzarclouth@gmail.com'; // Your full Gmail address
            $mail->Password   = 'qeghfriyufnyhqpf'; // Your 16-character Gmail App Password
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587; // Port for STARTTLS
            $mail->Timeout    = 5;

            $mail->setFrom('ezzarclouth@gmail.com', 'CampusTrade'); // Should match your Gmail address
            $mail->addAddress($email);

            $mail->isHTML(false);
            $mail->Subject = 'CampusTrade Password Reset';
            $mail->Body    = "You requested a password reset.\n\nClick the link below to set a new password:\n\n{$resetLink}\n\nIf you did not request this, please ignore this email.";

            if ($mail->Username === 'your_email@gmail.com') {
                // Do not send if placeholders are used
            } else {
                $mail->send();
            }
        } catch (Exception $e) {
            error_log("Message could not be sent. Mailer Error: {$mail->ErrorInfo}");
        }
    }

    echo json_encode(['success' => true, 'message' => 'If an account exists, a reset link was sent.']);
}

/**
 * Handles resetting password.
 */
function handleResetPassword(): void
{
    $token = $_POST['token'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($token) || strlen($password) < 8) {
        http_response_code(422);
        echo json_encode(['success' => false, 'error' => 'Invalid token or password too short.']);
        exit;
    }

    $pdo = getDBConnection();
    $stmt = $pdo->prepare('SELECT StudentID, ResetTokenExpiresAt FROM Students WHERE ResetToken = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token.']);
        exit;
    }

    if (strtotime($user['ResetTokenExpiresAt']) < time()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Token has expired.']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $update = $pdo->prepare('UPDATE Students SET PasswordHash = ?, ResetToken = NULL, ResetTokenExpiresAt = NULL WHERE StudentID = ?');
    $update->execute([$passwordHash, $user['StudentID']]);

    echo json_encode(['success' => true, 'message' => 'Password reset successful.']);
}
