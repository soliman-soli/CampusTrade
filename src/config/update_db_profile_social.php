<?php
/**
 * CampusTrade — Database Migration
 * Adds ProfileImage and SocialMediaLink columns to the Students table
 * if they do not already exist.
 */

require_once __DIR__ . '/db_connect.php';

try {
    $pdo = getDBConnection();

    $check = $pdo->query("SELECT COL_LENGTH('Students', 'ProfileImage')");
    $hasCol = $check->fetchColumn();

    if (!$hasCol) {
        $pdo->exec("ALTER TABLE Students ADD ProfileImage NVARCHAR(500) NULL");
        echo "Added ProfileImage column to Students table.\n";
    } else {
        echo "ProfileImage column already exists.\n";
    }

    $check2 = $pdo->query("SELECT COL_LENGTH('Students', 'SocialMediaLink')");
    $hasCol2 = $check2->fetchColumn();

    if (!$hasCol2) {
        $pdo->exec("ALTER TABLE Students ADD SocialMediaLink NVARCHAR(255) NULL");
        echo "Added SocialMediaLink column to Students table.\n";
    } else {
        echo "SocialMediaLink column already exists.\n";
    }

    echo "Migration complete.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
