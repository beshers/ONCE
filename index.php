<?php
require_once 'config.php';

// Redirect to login if not authenticated
if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}
header('Location: dashboard.php');
exit;