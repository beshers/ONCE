<?php
require_once __DIR__ . '/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$db = getDB();
$userId = (string) getUserId();

$userStmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$userStmt->execute([$userId]);
$user = $userStmt->fetch() ?: [
    'username' => getUserName(),
    'full_name' => $_SESSION['full_name'] ?? getUserName(),
    'email' => $_SESSION['email'] ?? '',
];

$stats = [
    'projects' => 0,
    'snippets' => 0,
    'messages' => 0,
    'activity' => 0,
];

$countQueries = [
    'projects' => ['SELECT COUNT(*) FROM projects WHERE owner_id = ?', [$userId]],
    'snippets' => ['SELECT COUNT(*) FROM code_snippets WHERE user_id = ?', [$userId]],
    'messages' => ['SELECT COUNT(*) FROM messages WHERE sender_id = ? OR receiver_id = ?', [$userId, $userId]],
    'activity' => ['SELECT COUNT(*) FROM activity_log WHERE user_id = ?', [$userId]],
];

foreach ($countQueries as $key => [$sql, $params]) {
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $stats[$key] = (int) $stmt->fetchColumn();
}

$projectsStmt = $db->prepare(
    'SELECT id, name, language, description, updated_at
     FROM projects
     WHERE owner_id = ?
     ORDER BY updated_at DESC
     LIMIT 6'
);
$projectsStmt->execute([$userId]);
$recentProjects = $projectsStmt->fetchAll();

$messagesStmt = $db->query(
    'SELECT m.message, m.created_at, COALESCE(NULLIF(u.full_name, \'\'), u.username, u.email, \'User\') AS author
     FROM messages m
     LEFT JOIN users u ON BINARY u.id = BINARY m.sender_id
     ORDER BY m.created_at DESC
     LIMIT 6'
);
$recentMessages = $messagesStmt->fetchAll();

$activityStmt = $db->prepare(
    'SELECT action, details, created_at
     FROM activity_log
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 8'
);
$activityStmt->execute([$userId]);
$recentActivity = $activityStmt->fetchAll();

$displayName = getUserDisplayNameFromRow($user);
$avatarLetter = strtoupper(substr($displayName, 0, 1));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - WEB IDE CODE EDITOR</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        body {
            background:
                radial-gradient(circle at top left, rgba(0, 212, 255, 0.12), transparent 30%),
                radial-gradient(circle at top right, rgba(124, 58, 237, 0.14), transparent 28%),
                #070b14;
            min-height: 100vh;
        }

        .page {
            max-width: 1180px;
            margin: 0 auto;
            padding: 32px 20px 48px;
        }

        .topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            margin-bottom: 28px;
        }

        .brand h1 {
            font-size: 2rem;
            margin-bottom: 8px;
        }

        .brand p {
            color: var(--text-muted);
        }

        .actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .user-card {
            display: grid;
            grid-template-columns: 72px 1fr;
            gap: 18px;
            align-items: center;
            margin-bottom: 28px;
        }

        .avatar {
            width: 72px;
            height: 72px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, #00d4ff, #7c3aed);
        }

        .meta h2 {
            margin-bottom: 6px;
        }

        .meta p {
            color: var(--text-muted);
            margin-bottom: 4px;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: 16px;
            margin-bottom: 28px;
        }

        .stat-card h3 {
            font-size: 0.95rem;
            color: var(--text-muted);
            margin-bottom: 14px;
            font-weight: 600;
        }

        .stat-card strong {
            display: block;
            font-size: 2rem;
            margin-bottom: 8px;
        }

        .grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 18px;
        }

        .panel {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            padding: 22px;
        }

        .panel h3 {
            margin-bottom: 16px;
            font-size: 1.05rem;
        }

        .project-list,
        .activity-list,
        .message-list {
            display: grid;
            gap: 12px;
        }

        .project-item,
        .activity-item,
        .message-item {
            padding: 14px 16px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .project-item header,
        .message-item header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }

        .muted {
            color: var(--text-muted);
            font-size: 0.92rem;
        }

        .empty-state {
            padding: 18px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.03);
            color: var(--text-muted);
        }

        .quick-links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-top: 18px;
        }

        .quick-link {
            padding: 16px;
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.04);
            color: var(--text);
        }

        .quick-link strong {
            display: block;
            margin-bottom: 6px;
        }

        @media (max-width: 860px) {
            .topbar,
            .user-card {
                grid-template-columns: 1fr;
                display: block;
            }

            .actions {
                margin-top: 16px;
            }

            .grid {
                grid-template-columns: 1fr;
            }

            .avatar {
                margin-bottom: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="topbar">
            <div class="brand">
                <h1>WEB IDE CODE EDITOR</h1>
                <p>Connected to MySQL database <strong><?php echo htmlspecialchars(DB_NAME); ?></strong> on port <strong><?php echo htmlspecialchars((string) ($GLOBALS['ACTIVE_DB_PORT'] ?? DB_PORT)); ?></strong>.</p>
            </div>
            <div class="actions">
                <a class="btn" href="editor.php">Open Editor</a>
                <a class="btn btn-secondary" href="chat.php">Open Chat</a>
                <a class="btn btn-secondary" href="auth.php?action=logout">Logout</a>
            </div>
        </div>

        <section class="panel user-card">
            <div class="avatar"><?php echo htmlspecialchars($avatarLetter); ?></div>
            <div class="meta">
                <h2><?php echo htmlspecialchars($displayName); ?></h2>
                <p>@<?php echo htmlspecialchars((string) ($user['username'] ?? 'user')); ?></p>
                <p><?php echo htmlspecialchars((string) ($user['email'] ?? '')); ?></p>
            </div>
        </section>

        <section class="stats">
            <div class="card stat-card">
                <h3>Projects</h3>
                <strong><?php echo $stats['projects']; ?></strong>
                <span class="muted">Saved in the connected database</span>
            </div>
            <div class="card stat-card">
                <h3>Snippets</h3>
                <strong><?php echo $stats['snippets']; ?></strong>
                <span class="muted">Reusable code snippets</span>
            </div>
            <div class="card stat-card">
                <h3>Messages</h3>
                <strong><?php echo $stats['messages']; ?></strong>
                <span class="muted">Chat messages stored in MySQL</span>
            </div>
            <div class="card stat-card">
                <h3>Activity Events</h3>
                <strong><?php echo $stats['activity']; ?></strong>
                <span class="muted">Tracked website actions</span>
            </div>
        </section>

        <section class="grid">
            <div class="panel">
                <h3>Recent Projects</h3>
                <?php if ($recentProjects): ?>
                    <div class="project-list">
                        <?php foreach ($recentProjects as $project): ?>
                            <article class="project-item">
                                <header>
                                    <strong><?php echo htmlspecialchars($project['name']); ?></strong>
                                    <span class="badge"><?php echo htmlspecialchars($project['language'] ?: 'General'); ?></span>
                                </header>
                                <p class="muted"><?php echo htmlspecialchars($project['description'] ?: 'No description yet.'); ?></p>
                                <p class="muted">Updated <?php echo htmlspecialchars((string) $project['updated_at']); ?></p>
                            </article>
                        <?php endforeach; ?>
                    </div>
                <?php else: ?>
                    <div class="empty-state">No projects yet. Open the editor to create your first saved project.</div>
                <?php endif; ?>

                <div class="quick-links">
                    <a class="quick-link" href="editor.php">
                        <strong>Code Editor</strong>
                        <span class="muted">Create or update projects directly in the database.</span>
                    </a>
                    <a class="quick-link" href="chat.php">
                        <strong>Team Chat</strong>
                        <span class="muted">Store messages in the shared `messages` table.</span>
                    </a>
                </div>
            </div>

            <div class="panel">
                <h3>Recent Activity</h3>
                <?php if ($recentActivity): ?>
                    <div class="activity-list">
                        <?php foreach ($recentActivity as $item): ?>
                            <article class="activity-item">
                                <strong><?php echo htmlspecialchars(ucfirst(str_replace('_', ' ', (string) $item['action']))); ?></strong>
                                <p class="muted"><?php echo htmlspecialchars($item['details'] ?: 'No details recorded.'); ?></p>
                                <p class="muted"><?php echo htmlspecialchars((string) $item['created_at']); ?></p>
                            </article>
                        <?php endforeach; ?>
                    </div>
                <?php else: ?>
                    <div class="empty-state">Activity will appear here after you log in, save projects, or send messages.</div>
                <?php endif; ?>
            </div>
        </section>

        <section class="panel" style="margin-top: 18px;">
            <h3>Latest Messages</h3>
            <?php if ($recentMessages): ?>
                <div class="message-list">
                    <?php foreach ($recentMessages as $message): ?>
                        <article class="message-item">
                            <header>
                                <strong><?php echo htmlspecialchars((string) $message['author']); ?></strong>
                                <span class="muted"><?php echo htmlspecialchars((string) $message['created_at']); ?></span>
                            </header>
                            <p><?php echo nl2br(htmlspecialchars((string) $message['message'])); ?></p>
                        </article>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <div class="empty-state">No messages have been posted yet.</div>
            <?php endif; ?>
        </section>
    </div>
</body>
</html>
