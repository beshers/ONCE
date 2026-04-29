<?php
require_once 'config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'register':
        handleRegister();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check':
        checkAuth();
        break;
    default:
        jsonResponse(['success' => false, 'message' => 'Invalid action'], 400);
}

function requestExpectsJson(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';

    return stripos($accept, 'application/json') !== false
        || strcasecmp($requestedWith, 'XMLHttpRequest') === 0
        || ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET';
}

function requireValidCsrfToken(): void
{
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($token)) {
        jsonResponse(['success' => false, 'message' => 'Your session expired. Please refresh and try again.'], 419);
    }
}

function generateUserId(PDO $db): ?string
{
    $columns = getTableColumns($db, 'users');
    $idColumn = $columns['id'] ?? null;
    if (!$idColumn) {
        return null;
    }

    $type = strtolower((string) ($idColumn['Type'] ?? ''));
    $extra = strtolower((string) ($idColumn['Extra'] ?? ''));
    if (strpos($type, 'int') !== false && strpos($extra, 'auto_increment') !== false) {
        return null;
    }

    return uniqid('user_', true);
}

function setAuthenticatedSession(array $user): void
{
    $_SESSION['user_id'] = (string) ($user['id'] ?? '');
    $_SESSION['username'] = (string) ($user['username'] ?? '');
    $_SESSION['email'] = (string) ($user['email'] ?? '');
    $_SESSION['full_name'] = getUserDisplayNameFromRow($user);
}

function updateUserPresence(PDO $db, $userId, bool $isOnline): void
{
    $columns = getTableColumns($db, 'users');
    if (!$columns || !isset($columns['id'])) {
        return;
    }

    $updates = [];
    $params = [];

    if (isset($columns['is_online'])) {
        $updates[] = 'is_online = ?';
        $params[] = $isOnline ? 1 : 0;
    }

    if ($isOnline && isset($columns['last_login_at'])) {
        $updates[] = 'last_login_at = NOW()';
    }

    if (isset($columns['last_seen'])) {
        $updates[] = 'last_seen = NOW()';
    }

    if (!$updates) {
        return;
    }

    $params[] = $userId;
    $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
}

function splitFullName(string $fullName): array
{
    $fullName = trim($fullName);
    if ($fullName === '') {
        return ['', ''];
    }

    $parts = preg_split('/\s+/', $fullName, 2);
    return [$parts[0] ?? '', $parts[1] ?? ''];
}

function createUserRecord(PDO $db, string $username, string $email, string $fullName, string $passwordHash): array
{
    [$firstName, $lastName] = splitFullName($fullName);
    $columns = getTableColumns($db, 'users');
    $data = [];

    $generatedId = generateUserId($db);
    if ($generatedId !== null) {
        $data['id'] = $generatedId;
    }

    $availableValues = [
        'username' => $username,
        'email' => $email,
        'password_hash' => $passwordHash,
        'full_name' => $fullName !== '' ? $fullName : null,
        'first_name' => $firstName !== '' ? $firstName : null,
        'last_name' => $lastName !== '' ? $lastName : null,
        'is_online' => 1,
        'last_seen' => date('Y-m-d H:i:s'),
        'last_login_at' => date('Y-m-d H:i:s'),
    ];

    foreach ($availableValues as $column => $value) {
        if (isset($columns[$column])) {
            $data[$column] = $value;
        }
    }

    $columnNames = array_keys($data);
    $placeholders = implode(', ', array_fill(0, count($columnNames), '?'));
    $sql = 'INSERT INTO users (' . implode(', ', $columnNames) . ') VALUES (' . $placeholders . ')';
    $stmt = $db->prepare($sql);
    $stmt->execute(array_values($data));

    if ($generatedId === null) {
        $userId = (string) $db->lastInsertId();
    } else {
        $userId = $generatedId;
    }

    $userStmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $userStmt->execute([$userId]);
    return $userStmt->fetch() ?: [];
}

function handleLogin(): void
{
    requireValidCsrfToken();

    $login = trim((string) ($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';

    if ($login === '' || $password === '') {
        jsonResponse(['success' => false, 'message' => 'Email/username and password are required.'], 422);
    }

    try {
        $db = getDB();
        $stmt = $db->prepare('SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1');
        $stmt->execute([$login, $login]);
        $user = $stmt->fetch();

        if (!$user || !verifyPassword($password, (string) ($user['password_hash'] ?? ''))) {
            jsonResponse(['success' => false, 'message' => 'Invalid email/username or password.'], 401);
        }

        setAuthenticatedSession($user);
        updateUserPresence($db, $user['id'], true);
        logActivity($user['id'], 'login', 'User logged in');

        jsonResponse([
            'success' => true,
            'message' => 'Login successful!',
            'user' => [
                'id' => (string) $user['id'],
                'username' => (string) ($user['username'] ?? ''),
                'email' => (string) ($user['email'] ?? ''),
                'full_name' => getUserDisplayNameFromRow($user),
            ],
        ]);
    } catch (Throwable $e) {
        error_log('Login error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Login failed. Please try again.'], 500);
    }
}

function handleRegister(): void
{
    requireValidCsrfToken();

    $username = trim((string) sanitize($_POST['username'] ?? ''));
    $email = trim((string) sanitize($_POST['email'] ?? ''));
    $fullName = trim((string) sanitize($_POST['full_name'] ?? ''));
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';

    if ($username === '' || $email === '' || $password === '') {
        jsonResponse(['success' => false, 'message' => 'All required fields must be filled in.'], 422);
    }

    if (strlen($username) < 3) {
        jsonResponse(['success' => false, 'message' => 'Username must be at least 3 characters.'], 422);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['success' => false, 'message' => 'Please enter a valid email address.'], 422);
    }

    if (strlen($password) < 6) {
        jsonResponse(['success' => false, 'message' => 'Password must be at least 6 characters.'], 422);
    }

    if ($password !== $confirmPassword) {
        jsonResponse(['success' => false, 'message' => 'Passwords do not match.'], 422);
    }

    try {
        $db = getDB();
        $cleanUsername = generateUniqueUsername($db, $username);

        $stmt = $db->prepare('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1');
        $stmt->execute([$email, $cleanUsername]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Username or email already exists.'], 409);
        }

        $user = createUserRecord($db, $cleanUsername, $email, $fullName, hashPassword($password));
        if (!$user) {
            throw new RuntimeException('User could not be created.');
        }

        setAuthenticatedSession($user);
        logActivity($user['id'], 'register', 'User account created');

        jsonResponse([
            'success' => true,
            'message' => 'Account created successfully!',
            'user' => [
                'id' => (string) $user['id'],
                'username' => (string) ($user['username'] ?? ''),
                'email' => (string) ($user['email'] ?? ''),
                'full_name' => getUserDisplayNameFromRow($user),
            ],
        ], 201);
    } catch (Throwable $e) {
        error_log('Register error: ' . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Registration failed. Please try again.'], 500);
    }
}

function handleLogout(): void
{
    if (isLoggedIn()) {
        try {
            updateUserPresence(getDB(), getUserId(), false);
            logActivity(getUserId(), 'logout', 'User logged out');
        } catch (Throwable $e) {
            error_log('Logout error: ' . $e->getMessage());
        }
    }

    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();

    if (requestExpectsJson()) {
        jsonResponse(['success' => true, 'message' => 'Logged out successfully.']);
    }

    header('Location: login.php?logged_out=1');
    exit;
}

function checkAuth(): void
{
    if (!isLoggedIn()) {
        jsonResponse(['success' => true, 'logged_in' => false]);
    }

    jsonResponse([
        'success' => true,
        'logged_in' => true,
        'user' => [
            'id' => (string) getUserId(),
            'username' => (string) getUserName(),
            'email' => (string) ($_SESSION['email'] ?? ''),
            'full_name' => (string) ($_SESSION['full_name'] ?? ''),
        ],
    ]);
}
