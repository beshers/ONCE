CREATE DATABASE IF NOT EXISTS webideeditor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE webideeditor;

DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS user_stats;
DROP TABLE IF EXISTS social_likes;
DROP TABLE IF EXISTS social_comments;
DROP TABLE IF EXISTS social_posts;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS code_reviews;
DROP TABLE IF EXISTS project_versions;
DROP TABLE IF EXISTS project_files;
DROP TABLE IF EXISTS project_collaborators;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chat_room_members;
DROP TABLE IF EXISTS chat_rooms;
DROP TABLE IF EXISTS code_snippets;
DROP TABLE IF EXISTS terminal_sessions;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS online_users;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS users_backup;

CREATE TABLE users (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) DEFAULT NULL,
    full_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(50) DEFAULT NULL,
    last_name VARCHAR(50) DEFAULT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    programming_languages TEXT DEFAULT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    status ENUM('online', 'offline', 'away', 'busy') NOT NULL DEFAULT 'offline',
    is_online TINYINT(1) NOT NULL DEFAULT 0,
    last_seen TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY users_username_unique (username),
    UNIQUE KEY users_email_unique (email),
    KEY users_status_idx (status)
);

CREATE TABLE projects (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    owner_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    language VARCHAR(50) DEFAULT 'plaintext',
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    code TEXT DEFAULT NULL,
    stars INT NOT NULL DEFAULT 0,
    forks INT NOT NULL DEFAULT 0,
    views INT NOT NULL DEFAULT 0,
    status ENUM('active', 'archived', 'draft') NOT NULL DEFAULT 'active',
    tags TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY projects_owner_id_idx (owner_id),
    KEY projects_public_idx (is_public)
);

CREATE TABLE activity_log (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    details TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY activity_log_user_id_idx (user_id)
);

CREATE TABLE code_snippets (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(100) NOT NULL,
    language VARCHAR(50) NOT NULL DEFAULT 'plaintext',
    code TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    likes INT NOT NULL DEFAULT 0,
    forks INT NOT NULL DEFAULT 0,
    views INT NOT NULL DEFAULT 0,
    tags TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY code_snippets_user_id_idx (user_id),
    KEY code_snippets_public_idx (is_public)
);

CREATE TABLE chat_rooms (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    type ENUM('direct', 'group', 'project') NOT NULL DEFAULT 'group',
    project_id INT DEFAULT NULL,
    is_private TINYINT(1) NOT NULL DEFAULT 0,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_room_members (
    chat_room_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) DEFAULT 'member',
    last_read_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (chat_room_id, user_id)
);

CREATE TABLE messages (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    sender_id VARCHAR(255) NOT NULL,
    receiver_id VARCHAR(255) DEFAULT NULL,
    project_id INT DEFAULT NULL,
    room_id VARCHAR(100) DEFAULT NULL,
    message TEXT NOT NULL,
    message_type ENUM('text', 'code', 'file', 'image', 'voice') NOT NULL DEFAULT 'text',
    metadata TEXT DEFAULT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY messages_sender_id_idx (sender_id),
    KEY messages_receiver_id_idx (receiver_id),
    KEY messages_room_id_idx (room_id)
);

CREATE TABLE project_collaborators (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    role ENUM('owner', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY project_collaborators_project_user_unique (project_id, user_id)
);

CREATE TABLE project_files (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    parent_id INT DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('file', 'folder') NOT NULL DEFAULT 'file',
    content TEXT DEFAULT NULL,
    language VARCHAR(50) DEFAULT 'plaintext',
    size INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY project_files_project_id_idx (project_id)
);

CREATE TABLE project_versions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    file_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    content TEXT DEFAULT NULL,
    commit_message VARCHAR(255) DEFAULT NULL,
    version_number INT NOT NULL DEFAULT 1,
    diff_summary TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY project_versions_file_id_idx (file_id),
    KEY project_versions_project_file_idx (project_id, file_id)
);

CREATE TABLE code_reviews (
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
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY code_reviews_file_id_idx (file_id)
);

CREATE TABLE terminal_sessions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    project_id INT DEFAULT NULL,
    name VARCHAR(100) DEFAULT 'Terminal',
    current_path VARCHAR(500) DEFAULT '~',
    session_data TEXT DEFAULT NULL,
    environment TEXT DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE friends (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    requester_id VARCHAR(255) NOT NULL,
    addressee_id VARCHAR(255) NOT NULL,
    status ENUM('pending', 'accepted', 'blocked') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY friends_requester_addressee_unique (requester_id, addressee_id)
);

CREATE TABLE notifications (
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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY notifications_user_read_idx (user_id, is_read)
);

CREATE TABLE social_posts (
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
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY social_posts_user_id_idx (user_id)
);

CREATE TABLE social_comments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY social_comments_post_id_idx (post_id)
);

CREATE TABLE social_likes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY social_likes_post_user_unique (post_id, user_id)
);

CREATE TABLE user_stats (
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

CREATE TABLE badges (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    icon VARCHAR(100) DEFAULT NULL,
    color VARCHAR(50) DEFAULT '#00d4ff',
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INT DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_badges (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY user_badges_user_badge_unique (user_id, badge_id)
);

INSERT INTO users (id, username, email, password_hash, full_name, first_name, last_name, role, status, is_online, created_at, updated_at, last_login_at)
VALUES
    ('admin@webide.local', 'admin', 'admin@webide.local', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrator', 'Administrator', '', 'admin', 'online', 1, NOW(), NOW(), NOW()),
    ('dev@webide.local', 'developer', 'dev@webide.local', 'e00884b83db1cc66573a6cb329603ed1b152f326cbb5183a8effaa36934d352a', 'Developer', 'Developer', '', 'user', 'online', 1, NOW(), NOW(), NOW());

INSERT INTO user_stats (user_id, last_active_date)
VALUES
    ('admin@webide.local', NOW()),
    ('dev@webide.local', NOW());

INSERT INTO badges (name, description, icon, color, requirement_type, requirement_value)
VALUES
    ('First Project', 'Create your first project.', 'FolderPlus', '#06b6d4', 'projects_created', 1),
    ('Community Voice', 'Send your first 25 messages.', 'MessageSquare', '#8b5cf6', 'messages_sent', 25),
    ('Snippet Starter', 'Share your first snippet.', 'Code2', '#22c55e', 'snippets_shared', 1),
    ('Reviewer', 'Complete 5 code reviews.', 'GitPullRequest', '#f59e0b', 'code_reviews', 5),
    ('XP Rookie', 'Reach 250 XP.', 'Sparkles', '#ef4444', 'xp', 250);
