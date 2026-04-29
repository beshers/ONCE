USE webideeditor;

ALTER TABLE users
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY username VARCHAR(50) NULL,
    MODIFY email VARCHAR(255) NULL,
    MODIFY password_hash VARCHAR(255) NULL,
    MODIFY avatar VARCHAR(255) NULL,
    MODIFY full_name VARCHAR(100) NULL;

ALTER TABLE users
    ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER programming_languages,
    ADD COLUMN status ENUM('online', 'offline', 'away', 'busy') NOT NULL DEFAULT 'offline' AFTER role;

UPDATE users
SET username = COALESCE(NULLIF(username, ''), REPLACE(SUBSTRING_INDEX(COALESCE(email, id), '@', 1), '.', '_'))
WHERE username IS NULL OR username = '';

UPDATE users
SET full_name = COALESCE(
    NULLIF(full_name, ''),
    NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''),
    username,
    email,
    id
)
WHERE full_name IS NULL OR full_name = '';

UPDATE users
SET status = CASE WHEN is_online = 1 THEN 'online' ELSE 'offline' END
WHERE status IS NULL OR status = '';

UPDATE users
SET role = 'admin'
WHERE username = 'admin' OR email = 'admin@webide.local';

ALTER TABLE users
    MODIFY username VARCHAR(50) NOT NULL,
    MODIFY email VARCHAR(255) NOT NULL,
    MODIFY full_name VARCHAR(100) NOT NULL;

ALTER TABLE projects
    MODIFY owner_id VARCHAR(255) NOT NULL,
    ADD COLUMN stars INT NOT NULL DEFAULT 0 AFTER code,
    ADD COLUMN forks INT NOT NULL DEFAULT 0 AFTER stars,
    ADD COLUMN views INT NOT NULL DEFAULT 0 AFTER forks,
    ADD COLUMN status ENUM('active', 'archived', 'draft') NOT NULL DEFAULT 'active' AFTER views,
    ADD COLUMN tags TEXT NULL AFTER status;

ALTER TABLE messages
    MODIFY sender_id VARCHAR(255) NOT NULL,
    MODIFY receiver_id VARCHAR(255) NULL,
    MODIFY message_type ENUM('text', 'code', 'file', 'image', 'voice') NOT NULL DEFAULT 'text',
    ADD COLUMN room_id VARCHAR(100) NULL AFTER project_id,
    ADD COLUMN metadata TEXT NULL AFTER message_type;

UPDATE messages
SET room_id = COALESCE(room_id, 'global')
WHERE room_id IS NULL;

ALTER TABLE terminal_sessions
    MODIFY user_id VARCHAR(255) NOT NULL,
    ADD COLUMN project_id INT NULL AFTER user_id,
    ADD COLUMN name VARCHAR(100) NULL DEFAULT 'Terminal' AFTER project_id,
    ADD COLUMN current_path VARCHAR(500) NULL DEFAULT '~' AFTER name,
    ADD COLUMN environment TEXT NULL AFTER session_data,
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER environment,
    ADD COLUMN last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER updated_at;

ALTER TABLE chat_rooms
    MODIFY name VARCHAR(100) NOT NULL,
    MODIFY created_by VARCHAR(255) NOT NULL,
    ADD COLUMN type ENUM('direct', 'group', 'project') NOT NULL DEFAULT 'group' AFTER description,
    ADD COLUMN project_id INT NULL AFTER type;

ALTER TABLE chat_room_members
    MODIFY user_id VARCHAR(255) NOT NULL,
    ADD COLUMN last_read_at TIMESTAMP NULL DEFAULT NULL AFTER role;

ALTER TABLE code_snippets
    MODIFY user_id VARCHAR(255) NOT NULL,
    ADD COLUMN likes INT NOT NULL DEFAULT 0 AFTER is_public,
    ADD COLUMN forks INT NOT NULL DEFAULT 0 AFTER likes,
    ADD COLUMN views INT NOT NULL DEFAULT 0 AFTER forks,
    ADD COLUMN tags TEXT NULL AFTER views,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE project_collaborators
    MODIFY user_id VARCHAR(255) NOT NULL,
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role,
    ADD COLUMN last_active_at TIMESTAMP NULL DEFAULT NULL AFTER joined_at;

ALTER TABLE activity_log
    MODIFY user_id VARCHAR(255) NULL,
    ADD COLUMN entity_type VARCHAR(50) NULL AFTER action,
    ADD COLUMN entity_id INT NULL AFTER entity_type;

CREATE TABLE IF NOT EXISTS project_files (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    parent_id INT DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('file', 'folder') NOT NULL DEFAULT 'file',
    content TEXT DEFAULT NULL,
    language VARCHAR(50) DEFAULT 'plaintext',
    size INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_versions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    file_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    content TEXT DEFAULT NULL,
    commit_message VARCHAR(255) DEFAULT NULL,
    version_number INT NOT NULL DEFAULT 1,
    diff_summary TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS code_reviews (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    file_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    line_start INT NOT NULL DEFAULT 0,
    line_end INT NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    status ENUM('open', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS friends (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    requester_id VARCHAR(255) NOT NULL,
    addressee_id VARCHAR(255) NOT NULL,
    status ENUM('pending', 'accepted', 'blocked') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY friends_requester_addressee_unique (requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type ENUM('friend_request', 'friend_accepted', 'project_invite', 'project_update', 'code_review', 'mention', 'badge_earned', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT DEFAULT NULL,
    link VARCHAR(500) DEFAULT NULL,
    actor_id VARCHAR(255) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_posts (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    code_snippet TEXT DEFAULT NULL,
    language VARCHAR(50) DEFAULT NULL,
    project_id INT DEFAULT NULL,
    likes INT NOT NULL DEFAULT 0,
    comments INT NOT NULL DEFAULT 0,
    shares INT NOT NULL DEFAULT 0,
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_comments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_likes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY social_likes_post_user_unique (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_stats (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    xp INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    projects_created INT NOT NULL DEFAULT 0,
    projects_collaborated INT NOT NULL DEFAULT 0,
    snippets_shared INT NOT NULL DEFAULT 0,
    code_reviews_done INT NOT NULL DEFAULT 0,
    messages_sent INT NOT NULL DEFAULT 0,
    total_coding_time INT NOT NULL DEFAULT 0,
    streak_days INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_active_date TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY user_stats_user_id_unique (user_id)
);

CREATE TABLE IF NOT EXISTS badges (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    icon VARCHAR(100) DEFAULT NULL,
    color VARCHAR(50) DEFAULT '#00d4ff',
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INT DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_badges (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY user_badges_user_badge_unique (user_id, badge_id)
);

INSERT INTO users (id, username, email, password_hash, full_name, first_name, last_name, role, status, is_online, created_at, updated_at, last_login_at)
VALUES
    ('admin@webide.local', 'admin', 'admin@webide.local', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrator', 'Administrator', '', 'admin', 'online', 1, NOW(), NOW(), NOW()),
    ('dev@webide.local', 'developer', 'dev@webide.local', 'e00884b83db1cc66573a6cb329603ed1b152f326cbb5183a8effaa36934d352a', 'Developer', 'Developer', '', 'user', 'online', 1, NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    full_name = VALUES(full_name),
    role = VALUES(role),
    status = VALUES(status),
    is_online = VALUES(is_online),
    last_login_at = VALUES(last_login_at);

INSERT INTO user_stats (user_id, last_active_date)
VALUES
    ('admin@webide.local', NOW()),
    ('dev@webide.local', NOW())
ON DUPLICATE KEY UPDATE
    last_active_date = VALUES(last_active_date);

INSERT INTO badges (name, description, icon, color, requirement_type, requirement_value)
VALUES
    ('First Project', 'Create your first project.', 'FolderPlus', '#06b6d4', 'projects_created', 1),
    ('Community Voice', 'Send your first 25 messages.', 'MessageSquare', '#8b5cf6', 'messages_sent', 25),
    ('Snippet Starter', 'Share your first snippet.', 'Code2', '#22c55e', 'snippets_shared', 1),
    ('Reviewer', 'Complete 5 code reviews.', 'GitPullRequest', '#f59e0b', 'code_reviews', 5),
    ('XP Rookie', 'Reach 250 XP.', 'Sparkles', '#ef4444', 'xp', 250)
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    icon = VALUES(icon),
    color = VALUES(color),
    requirement_type = VALUES(requirement_type),
    requirement_value = VALUES(requirement_value);
