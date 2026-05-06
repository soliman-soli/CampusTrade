<?php
require __DIR__ . '/src/config/db_connect.php';
try {
    $pdo = getDBConnection();
    $stmt = $pdo->query('SELECT COUNT(*) FROM Students');
    $count = $stmt->fetchColumn();
    echo "Database Connected successfully! Students in DB: $count\n";
} catch (Exception $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
