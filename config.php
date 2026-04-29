<?php
/**
 * WEB IDE CODE EDITOR - Configuration File
 * Include this file first in every PHP page.
 */

if (session_status() === PHP_SESSION_NONE) {
    $sessionPath = __DIR__ . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'sessions';
    if (!is_dir($sessionPath)) {
        mkdir($sessionPath, 0777, true);
    }

    ini_set('session.save_path', $sessionPath);
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_samesite', 'Lax');
    session_start();
}

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'webideeditor');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

define('SITE_NAME', 'WEB IDE CODE EDITOR');
define('SITE_URL', 'http://localhost/php-backend');
define('API_URL', SITE_URL . '/api.php');

define('GOOGLE_CLIENT_ID', '');
define('GOOGLE_CLIENT_SECRET', '');
define('GOOGLE_REDIRECT_URI', SITE_URL . '/auth.php?action=google-callback');

define('GITHUB_CLIENT_ID', '');
define('GITHUB_CLIENT_SECRET', '');
define('GITHUB_REDIRECT_URI', SITE_URL . '/auth.php?action=github-callback');

define('MICROSOFT_CLIENT_ID', '');
define('MICROSOFT_CLIENT_SECRET', '');
define('MICROSOFT_REDIRECT_URI', SITE_URL . '/auth.php?action=microsoft-callback');

define('GOOGLE_SCOPES', 'email profile');
define('GITHUB_SCOPES', 'user:email');
define('MICROSOFT_SCOPES', 'User.Read');

date_default_timezone_set('UTC');
error_reporting(E_ALL);
ini_set('display_errors', '1');

function getCandidateDbPorts(): array
{
    $ports = [];
    foreach ([getenv('DATABASE_PORT'), DB_PORT, '3306', '3307'] as $port) {
        $port = trim((string) $port);
        if ($port !== '' && ctype_digit($port) && !in_array($port, $ports, true)) {
            $ports[] = $port;
        }
    }

    return $ports ?: ['3306'];
}

function tableExists(PDO $db, string $table): bool
{
    $stmt = $db->prepare(
        'SELECT COUNT(*)
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
           AND table_name = ?'
    );
    $stmt->execute([$table]);
    return (bool) $stmt->fetchColumn();
}

function getTableColumns(PDO $db, string $table): array
{
    if (!tableExists($db, $table)) {
        return [];
    }

    $columns = [];
    foreach ($db->query("SHOW COLUMNS FROM `$table`") as $column) {
        $columns[$column['Field']] = $column;
    }

    return $columns;
}

function columnExists(PDO $db, string $table, string $column): bool
{
    $columns = getTableColumns($db, $table);
    return isset($columns[$column]);
}

function indexExists(PDO $db, string $table, string $indexName): bool
{
    if (!tableExists($db, $table)) {
        return false;
    }

    $stmt = $db->query("SHOW INDEX FROM `$table`");
    foreach ($stmt as $index) {
        if (($index['Key_name'] ?? '') === $indexName) {
            return true;
        }
    }

    return false;
}

function getUserDisplayNameFromRow(array $user): string
{
    $fullName = trim((string) ($user['full_name'] ?? ''));
    if ($fullName !== '') {
        return $fullName;
    }

    $first = trim((string) ($user['first_name'] ?? ''));
    $last = trim((string) ($user['last_name'] ?? ''));
    $combined = trim($first . ' ' . $last);
    if ($combined !== '') {
        return $combined;
    }

    $username = trim((string) ($user['username'] ?? ''));
    if ($username !== '') {
        return $username;
    }

    $email = trim((string) ($user['email'] ?? ''));
    if ($email !== '') {
        return strstr($email, '@', true) ?: $email;
    }

    return 'User';
}

function makeUsernameSlug(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '_', $value);
    $value = trim((string) $value, '_');
    return $value !== '' ? $value : 'user';
}

function generateUniqueUsername(PDO $db, string $preferred): string
{
    $base = makeUsernameSlug($preferred);
    $username = $base;
    $counter = 1;

    while (true) {
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        if (!$stmt->fetch()) {
            return $username;
        }

        $counter++;
        $username = $base . $counter;
    }
}

function ensureUsersTable(PDO $db): void
{
    $db->exec(
        "CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            username VARCHAR(50) NOT NULL,
            email VARCHAR(100) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) DEFAULT NULL,
            first_name VARCHAR(50) DEFAULT NULL,
            last_name VARCHAR(50) DEFAULT NULL,
            avatar VARCHAR(255) DEFAULT NULL,
            bio TEXT DEFAULT NULL,
            programming_languages TEXT DEFAULT NULL,
            is_online TINYINT(1) DEFAULT 0,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login_at DATETIME DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_username (username),
            UNIQUE KEY unique_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $missingColumns = [
        'username' => "ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL AFTER id",
        'full_name' => "ALTER TABLE users ADD COLUMN full_name VARCHAR(100) NULL AFTER password_hash",
        'avatar' => "ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL AFTER last_name",
        'bio' => "ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER avatar",
        'programming_languages' => "ALTER TABLE users ADD COLUMN programming_languages TEXT NULL AFTER bio",
        'last_seen' => "ALTER TABLE users ADD COLUMN last_seen DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER is_online",
        'updated_at' => "ALTER TABLE users ADD COLUMN updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
    ];

    foreach ($missingColumns as $column => $sql) {
        if (!columnExists($db, 'users', $column)) {
            $db->exec($sql);
        }
    }

    if (columnExists($db, 'users', 'username')) {
        $stmt = $db->query("SELECT id, email, first_name, last_name FROM users WHERE username IS NULL OR username = ''");
        $users = $stmt->fetchAll();
        foreach ($users as $user) {
            $preferred = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if ($preferred === '') {
                $preferred = strstr((string) ($user['email'] ?? ''), '@', true) ?: ('user_' . substr((string) $user['id'], -6));
            }

            $username = generateUniqueUsername($db, $preferred);
            $update = $db->prepare('UPDATE users SET username = ? WHERE id = ?');
            $update->execute([$username, $user['id']]);
        }

        if (!indexExists($db, 'users', 'unique_username')) {
            $db->exec('ALTER TABLE users ADD UNIQUE KEY unique_username (username)');
        }
    }

    if (columnExists($db, 'users', 'full_name')) {
        $db->exec(
            "UPDATE users
             SET full_name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
             WHERE (full_name IS NULL OR full_name = '')
               AND (COALESCE(first_name, '') <> '' OR COALESCE(last_name, '') <> '')"
        );
    }

    if (columnExists($db, 'users', 'last_seen')) {
        $db->exec("UPDATE users SET last_seen = COALESCE(last_seen, created_at, NOW())");
    }
}

function ensureSupportTables(PDO $db): void
{
    $statements = [
        "CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT DEFAULT NULL,
            owner_id VARCHAR(64) NOT NULL,
            language VARCHAR(50) DEFAULT NULL,
            is_public TINYINT(1) DEFAULT 1,
            code LONGTEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS project_collaborators (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id INT NOT NULL,
            user_id VARCHAR(64) NOT NULL,
            role ENUM('owner','editor','viewer') DEFAULT 'viewer',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_collaboration (project_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id VARCHAR(64) NOT NULL,
            receiver_id VARCHAR(64) DEFAULT NULL,
            project_id INT DEFAULT NULL,
            message TEXT NOT NULL,
            message_type ENUM('text','code','file') DEFAULT 'text',
            is_read TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS code_snippets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            title VARCHAR(100) NOT NULL,
            language VARCHAR(50) NOT NULL,
            code LONGTEXT NOT NULL,
            description TEXT DEFAULT NULL,
            is_public TINYINT(1) DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS terminal_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            session_data LONGTEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS online_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            socket_id VARCHAR(100) DEFAULT NULL,
            last_ping DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_online_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS activity_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(64) DEFAULT NULL,
            action VARCHAR(100) NOT NULL,
            details TEXT DEFAULT NULL,
            ip_address VARCHAR(45) DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_activity_user (user_id),
            KEY idx_activity_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];

    foreach ($statements as $statement) {
        $db->exec($statement);
    }
}

function ensureDatabaseSchema(PDO $db): void
{
    static $initialized = false;
    if ($initialized) {
        return;
    }

    ensureUsersTable($db);
    ensureSupportTables($db);
    $initialized = true;
}

function getDB()
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $lastError = null;
    foreach (getCandidateDbPorts() as $port) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';port=' . $port . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            $GLOBALS['ACTIVE_DB_PORT'] = $port;
            ensureDatabaseSchema($pdo);
            return $pdo;
        } catch (PDOException $e) {
            $lastError = $e;
        }
    }

    $portList = implode(', ', getCandidateDbPorts());
    die(
        "<h2 style='color:red'>Database Connection Failed:</h2><p>" .
        htmlspecialchars($lastError ? $lastError->getMessage() : 'Unknown connection error', ENT_QUOTES, 'UTF-8') .
        "<br><br><strong>Checked:</strong><br>" .
        "MySQL host: " . htmlspecialchars(DB_HOST, ENT_QUOTES, 'UTF-8') . "<br>" .
        "Ports tried: " . htmlspecialchars($portList, ENT_QUOTES, 'UTF-8') . "<br>" .
        "Database: <strong>" . htmlspecialchars(DB_NAME, ENT_QUOTES, 'UTF-8') . "</strong><br>" .
        "User: " . htmlspecialchars(DB_USER, ENT_QUOTES, 'UTF-8') . "</p>"
    );
}

function jsonResponse($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function isLoggedIn(): bool
{
    return isset($_SESSION['user_id']) && $_SESSION['user_id'] !== '';
}

function getUserId()
{
    return $_SESSION['user_id'] ?? null;
}

function getUserName()
{
    return $_SESSION['username'] ?? ($_SESSION['full_name'] ?? null);
}

function hashPassword(string $password): string
{
    return password_hash($password, PASSWORD_BCRYPT);
}

function verifyPassword(string $password, string $hash): bool
{
    return password_verify($password, $hash);
}

function csrfToken(): string
{
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(string $token): bool
{
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function sanitize($input)
{
    if (is_array($input)) {
        return array_map('sanitize', $input);
    }
    return htmlspecialchars(strip_tags(trim((string) ($input ?? ''))), ENT_QUOTES, 'UTF-8');
}

function logActivity($userId, string $action, string $details = ''): bool
{
    $db = getDB();

    try {
        $stmt = $db->prepare(
            'INSERT INTO activity_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)'
        );
        return $stmt->execute([
            $userId,
            $action,
            $details,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        ]);
    } catch (Exception $e) {
        error_log('Activity log error: ' . $e->getMessage());
        return false;
    }
}
