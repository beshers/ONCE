<?php
require_once __DIR__ . '/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$db = getDB();
$userId = (string) getUserId();
$csrf = csrfToken();
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'send_message') {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $error = 'Your session expired. Refresh the page and try again.';
    } else {
        $message = trim((string) ($_POST['message'] ?? ''));
        if ($message === '') {
            $error = 'Please enter a message before sending.';
        } else {
            $stmt = $db->prepare('INSERT INTO messages (sender_id, message, message_type) VALUES (?, ?, ?)');
            $stmt->execute([$userId, $message, 'text']);
            logActivity($userId, 'message_sent', 'Posted a new team chat message');
            header('Location: chat.php?sent=1');
            exit;
        }
    }
}

$messagesStmt = $db->query(
    'SELECT m.message, m.created_at, m.sender_id,
            COALESCE(NULLIF(u.full_name, \'\'), u.username, u.email, \'User\') AS author
     FROM messages m
     LEFT JOIN users u ON BINARY u.id = BINARY m.sender_id
     ORDER BY m.created_at DESC
     LIMIT 40'
);
$messages = array_reverse($messagesStmt->fetchAll());
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat - WEB IDE CODE EDITOR</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        body {
            background:
                radial-gradient(circle at top, rgba(0, 212, 255, 0.1), transparent 22%),
                #0b1324;
            min-height: 100vh;
        }

        .page {
            max-width: 920px;
            margin: 0 auto;
            padding: 28px 18px 40px;
        }

        .topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;
            margin-bottom: 22px;
        }

        .topbar h1 {
            margin-bottom: 6px;
        }

        .topbar p {
            color: var(--text-muted);
        }

        .chat-shell {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 22px;
            overflow: hidden;
        }

        .messages {
            max-height: 64vh;
            overflow-y: auto;
            padding: 22px;
            display: grid;
            gap: 14px;
        }

        .message {
            padding: 14px 16px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .message.mine {
            border-color: rgba(0, 212, 255, 0.35);
            background: rgba(0, 212, 255, 0.08);
        }

        .message header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
            font-size: 0.92rem;
        }

        .composer {
            padding: 18px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(8, 12, 20, 0.8);
        }

        .composer form {
            display: grid;
            gap: 12px;
        }

        textarea {
            width: 100%;
            min-height: 130px;
            resize: vertical;
            padding: 14px 16px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            color: var(--text);
            font-family: inherit;
        }

        .notice {
            padding: 14px 16px;
            border-radius: 14px;
            margin-bottom: 16px;
        }

        .notice.success {
            background: rgba(78, 201, 176, 0.12);
            border: 1px solid rgba(78, 201, 176, 0.35);
        }

        .notice.error {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.35);
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="topbar">
            <div>
                <h1>Team Chat</h1>
                <p>Messages are stored in the `messages` table in the connected MySQL database.</p>
            </div>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <a class="btn btn-secondary" href="dashboard.php">Dashboard</a>
                <a class="btn btn-secondary" href="editor.php">Editor</a>
                <a class="btn" href="auth.php?action=logout">Logout</a>
            </div>
        </div>

        <?php if (isset($_GET['sent'])): ?>
            <div class="notice success">Message sent successfully.</div>
        <?php endif; ?>
        <?php if ($error): ?>
            <div class="notice error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <div class="chat-shell">
            <div class="messages">
                <?php if ($messages): ?>
                    <?php foreach ($messages as $message): ?>
                        <article class="message <?php echo (string) $message['sender_id'] === $userId ? 'mine' : ''; ?>">
                            <header>
                                <strong><?php echo htmlspecialchars((string) $message['author']); ?></strong>
                                <span class="muted"><?php echo htmlspecialchars((string) $message['created_at']); ?></span>
                            </header>
                            <div><?php echo nl2br(htmlspecialchars((string) $message['message'])); ?></div>
                        </article>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="message">
                        <strong>No messages yet.</strong>
                        <p class="muted">Start the conversation and the message will be written to MySQL.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div class="composer">
                <form method="post">
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf); ?>">
                    <input type="hidden" name="action" value="send_message">
                    <textarea name="message" placeholder="Write a message to the shared project chat..." required></textarea>
                    <div style="display:flex; justify-content:flex-end;">
                        <button class="btn" type="submit">Send Message</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
