<?php
/**
 * CampusTrade — PHP Development Server Router
 *
 * This script routes requests for the PHP built-in development server.
 * It serves static files from public/ and PHP scripts from src/.
 *
 * Usage: php -S localhost:8000 router.php
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

if (str_starts_with($uri, '/src/')) {
    $filePath = __DIR__ . $uri;
    if (file_exists($filePath)) {
        return false; // Let PHP serve it
    }
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
    return true;
}

if (str_starts_with($uri, '/uploads/')) {
    $filePath = __DIR__ . $uri;
    if (file_exists($filePath)) {
        return false;
    }
    http_response_code(404);
    return true;
}

$publicPath = __DIR__ . '/public' . $uri;

if ($uri === '/') {
    $publicPath = __DIR__ . '/public/index.html';
}

if (file_exists($publicPath) && !is_dir($publicPath)) {

    $ext = pathinfo($publicPath, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'json' => 'application/json',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
    ];

    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext]);
    }

    readfile($publicPath);
    return true;
}

http_response_code(404);
echo '<!DOCTYPE html><html><body><h1>404 Not Found</h1></body></html>';
return true;
