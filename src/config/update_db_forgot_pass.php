<?php
require_once __DIR__ . '/db_connect.php';

try {
    $pdo = getDBConnection();

    $checkCols = $pdo->query("SELECT COL_LENGTH('Students', 'ResetToken')");
    $hasCol = $checkCols->fetchColumn();
    
    if (!$hasCol) {
        $pdo->exec("ALTER TABLE Students ADD ResetToken VARCHAR(64) NULL, ResetTokenExpiresAt DATETIME NULL");
        echo "Successfully added ResetToken and ResetTokenExpiresAt to Students table.\n";
    } else {
        echo "Columns already exist.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
