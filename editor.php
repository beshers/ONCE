<?php
require_once __DIR__ . '/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$db = getDB();
$userId = (string) getUserId();
$feedback = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'save_project') {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $error = 'Your session expired. Refresh the page and try again.';
    } else {
        $projectId = (int) ($_POST['project_id'] ?? 0);
        $name = trim((string) sanitize($_POST['name'] ?? ''));
        $language = trim((string) sanitize($_POST['language'] ?? ''));
        $description = trim((string) sanitize($_POST['description'] ?? ''));
        $code = trim((string) ($_POST['code'] ?? ''));

        if ($name === '' || $code === '') {
            $error = 'Project name and code are required.';
        } else {
            if ($projectId > 0) {
                $stmt = $db->prepare('UPDATE projects SET name = ?, language = ?, description = ?, code = ? WHERE id = ? AND owner_id = ?');
                $stmt->execute([$name, $language ?: null, $description ?: null, $code, $projectId, $userId]);
                $savedProjectId = $projectId;
                logActivity($userId, 'project_updated', 'Updated project: ' . $name);
                $feedback = 'Project updated successfully.';
            } else {
                $stmt = $db->prepare('INSERT INTO projects (name, language, description, code, owner_id) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([$name, $language ?: null, $description ?: null, $code, $userId]);
                $savedProjectId = (int) $db->lastInsertId();
                logActivity($userId, 'project_created', 'Created project: ' . $name);
                $feedback = 'Project created successfully.';
            }

            header('Location: editor.php?project=' . $savedProjectId . '&saved=1');
            exit;
        }
    }
}

$projectsStmt = $db->prepare('SELECT id, name, language, description, updated_at FROM projects WHERE owner_id = ? ORDER BY updated_at DESC');
$projectsStmt->execute([$userId]);
$projects = $projectsStmt->fetchAll();

$selectedId = isset($_GET['project']) ? (int) $_GET['project'] : ((int) ($_POST['project_id'] ?? 0));
$selectedProject = [
    'id' => 0,
    'name' => '',
    'language' => 'php',
    'description' => '',
    'code' => "<?php\n\n// Start building here.\n\n",
];

if ($selectedId > 0) {
    $stmt = $db->prepare('SELECT * FROM projects WHERE id = ? AND owner_id = ? LIMIT 1');
    $stmt->execute([$selectedId, $userId]);
    $selectedProject = $stmt->fetch() ?: $selectedProject;
}

if (isset($_GET['saved']) && !$feedback) {
    $feedback = 'Project saved successfully.';
}

$csrf = csrfToken();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editor - WEB IDE CODE EDITOR</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        body {
            background: #09111f;
            min-height: 100vh;
        }

        .layout {
            display: grid;
            grid-template-columns: 280px 1fr;
            min-height: 100vh;
        }

        .sidebar {
            padding: 24px 18px;
            border-right: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.03);
        }

        .sidebar h1 {
            font-size: 1.2rem;
            margin-bottom: 8px;
        }

        .sidebar p {
            color: var(--text-muted);
            margin-bottom: 18px;
        }

        .project-list {
            display: grid;
            gap: 10px;
            margin-top: 18px;
        }

        .project-link {
            display: block;
            padding: 14px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
            color: var(--text);
        }

        .project-link.active {
            border-color: rgba(0, 212, 255, 0.5);
            box-shadow: 0 0 0 1px rgba(0, 212, 255, 0.25) inset;
        }

        .main {
            padding: 28px;
        }

        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .toolbar .actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        form {
            display: grid;
            gap: 16px;
        }

        .row {
            display: grid;
            grid-template-columns: 1fr 220px;
            gap: 16px;
        }

        .field {
            display: grid;
            gap: 8px;
        }

        .field label {
            font-weight: 600;
        }

        .field input,
        .field textarea,
        .field select {
            width: 100%;
            padding: 14px 16px;
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            color: var(--text);
        }

        .field textarea {
            min-height: 120px;
        }

        .code-area {
            min-height: 460px;
            font-family: Consolas, Monaco, monospace;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre;
        }

        .notice {
            padding: 14px 16px;
            border-radius: 14px;
            margin-bottom: 18px;
        }

        .notice.success {
            background: rgba(78, 201, 176, 0.12);
            border: 1px solid rgba(78, 201, 176, 0.35);
        }

        .notice.error {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.35);
        }

        @media (max-width: 900px) {
            .layout {
                grid-template-columns: 1fr;
            }

            .row {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <h1>Project Editor</h1>
            <p>Projects are stored in the `projects` table in MySQL.</p>
            <div class="actions">
                <a class="btn" href="dashboard.php">Dashboard</a>
                <a class="btn btn-secondary" href="chat.php">Chat</a>
            </div>
            <div class="project-list">
                <a class="project-link <?php echo $selectedProject['id'] ? '' : 'active'; ?>" href="editor.php">New Project</a>
                <?php foreach ($projects as $project): ?>
                    <a class="project-link <?php echo (int) $project['id'] === (int) $selectedProject['id'] ? 'active' : ''; ?>" href="editor.php?project=<?php echo (int) $project['id']; ?>">
                        <strong><?php echo htmlspecialchars($project['name']); ?></strong><br>
                        <span class="muted"><?php echo htmlspecialchars($project['language'] ?: 'General'); ?> · <?php echo htmlspecialchars((string) $project['updated_at']); ?></span>
                    </a>
                <?php endforeach; ?>
            </div>
        </aside>

        <main class="main">
            <div class="toolbar">
                <div>
                    <h2><?php echo $selectedProject['id'] ? 'Edit Project' : 'Create Project'; ?></h2>
                    <p class="muted">Connected database: <?php echo htmlspecialchars(DB_NAME); ?></p>
                </div>
                <div class="actions">
                    <a class="btn btn-secondary" href="auth.php?action=logout">Logout</a>
                </div>
            </div>

            <?php if ($feedback): ?>
                <div class="notice success"><?php echo htmlspecialchars($feedback); ?></div>
            <?php endif; ?>
            <?php if ($error): ?>
                <div class="notice error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>

            <form method="post">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf); ?>">
                <input type="hidden" name="action" value="save_project">
                <input type="hidden" name="project_id" value="<?php echo (int) $selectedProject['id']; ?>">

                <div class="row">
                    <div class="field">
                        <label for="name">Project Name</label>
                        <input id="name" name="name" type="text" value="<?php echo htmlspecialchars((string) $selectedProject['name']); ?>" required>
                    </div>
                    <div class="field">
                        <label for="language">Language</label>
                        <select id="language" name="language">
                            <?php foreach (['php', 'javascript', 'typescript', 'html', 'css', 'sql', 'python', 'text'] as $language): ?>
                                <option value="<?php echo htmlspecialchars($language); ?>" <?php echo ($selectedProject['language'] ?? 'php') === $language ? 'selected' : ''; ?>>
                                    <?php echo strtoupper(htmlspecialchars($language)); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="field">
                    <label for="description">Description</label>
                    <textarea id="description" name="description"><?php echo htmlspecialchars((string) $selectedProject['description']); ?></textarea>
                </div>

                <div class="field">
                    <label for="code">Code</label>
                    <textarea id="code" name="code" class="code-area" spellcheck="false" required><?php echo htmlspecialchars((string) $selectedProject['code']); ?></textarea>
                </div>

                <div class="actions">
                    <button class="btn" type="submit">Save Project</button>
                    <a class="btn btn-secondary" href="editor.php">Start Fresh</a>
                </div>
            </form>
        </main>
    </div>
</body>
</html>
