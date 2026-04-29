import mysql from "mysql2/promise";
import { env } from "../lib/env";
import { getMysqlConnectionOptions } from "./mysql-config";

let schemaReady: Promise<void> | undefined;

const userColumns = [
  ["username", "VARCHAR(50) NULL AFTER id"],
  ["password_hash", "VARCHAR(255) NULL AFTER email"],
  ["full_name", "VARCHAR(100) NULL AFTER password_hash"],
  ["first_name", "VARCHAR(50) NULL AFTER full_name"],
  ["last_name", "VARCHAR(50) NULL AFTER first_name"],
  ["avatar", "VARCHAR(255) NULL AFTER last_name"],
  ["bio", "TEXT NULL AFTER avatar"],
  ["programming_languages", "TEXT NULL AFTER bio"],
  ["role", "ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER programming_languages"],
  ["status", "ENUM('online','offline','away','busy') NOT NULL DEFAULT 'offline' AFTER role"],
  ["is_online", "TINYINT(1) NOT NULL DEFAULT 0 AFTER status"],
  ["last_seen", "TIMESTAMP NULL DEFAULT NULL AFTER is_online"],
  ["created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER last_seen"],
  [
    "updated_at",
    "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
  ],
  ["last_login_at", "TIMESTAMP NULL DEFAULT NULL AFTER updated_at"],
] as const;

const coreTableSql = [
  `CREATE TABLE IF NOT EXISTS projects (
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
  )`,
  `CREATE TABLE IF NOT EXISTS activity_log (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    details TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY activity_log_user_id_idx (user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS code_snippets (
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
  )`,
  `CREATE TABLE IF NOT EXISTS chat_rooms (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    type ENUM('direct', 'group', 'project') NOT NULL DEFAULT 'group',
    project_id INT DEFAULT NULL,
    is_private TINYINT(1) NOT NULL DEFAULT 0,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS chat_room_members (
    chat_room_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) DEFAULT 'member',
    last_read_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (chat_room_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
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
  )`,
  `CREATE TABLE IF NOT EXISTS project_collaborators (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    role ENUM('owner', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY project_collaborators_project_user_unique (project_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS project_files (
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
  )`,
  `CREATE TABLE IF NOT EXISTS project_versions (
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
  )`,
  `CREATE TABLE IF NOT EXISTS code_reviews (
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
  )`,
  `CREATE TABLE IF NOT EXISTS terminal_sessions (
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
    last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY terminal_sessions_user_id_idx (user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS friends (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    requester_id VARCHAR(255) NOT NULL,
    addressee_id VARCHAR(255) NOT NULL,
    status ENUM('pending', 'accepted', 'blocked') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY friends_requester_addressee_unique (requester_id, addressee_id)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
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
  )`,
  `CREATE TABLE IF NOT EXISTS social_posts (
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
  )`,
  `CREATE TABLE IF NOT EXISTS social_comments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY social_comments_post_id_idx (post_id)
  )`,
  `CREATE TABLE IF NOT EXISTS social_likes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY social_likes_post_user_unique (post_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_stats (
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
  )`,
  `CREATE TABLE IF NOT EXISTS badges (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    icon VARCHAR(100) DEFAULT NULL,
    color VARCHAR(50) DEFAULT '#00d4ff',
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INT DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS user_badges (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY user_badges_user_badge_unique (user_id, badge_id)
  )`,
] as const;

const defaultBadges = [
  ["First Project", "Create your first project.", "FolderPlus", "#06b6d4", "projects_created", 1],
  ["Community Voice", "Send your first 25 messages.", "MessageSquare", "#8b5cf6", "messages_sent", 25],
  ["Snippet Starter", "Share your first snippet.", "Code2", "#22c55e", "snippets_shared", 1],
  ["Reviewer", "Complete 5 code reviews.", "GitPullRequest", "#f59e0b", "code_reviews", 5],
  ["XP Rookie", "Reach 250 XP.", "Sparkles", "#ef4444", "xp", 250],
] as const;

async function ensureColumn(connection: mysql.Connection, column: string, definition: string) {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = ?
    `,
    [column],
  );

  if (Number(rows[0]?.count ?? 0) === 0) {
    await connection.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
  }
}

async function ensureCoreTables(connection: mysql.Connection) {
  for (const statement of coreTableSql) {
    await connection.query(statement);
  }

  for (const [name, description, icon, color, requirementType, requirementValue] of defaultBadges) {
    await connection.execute(
      `
        INSERT INTO badges (name, description, icon, color, requirement_type, requirement_value)
        SELECT ?, ?, ?, ?, ?, ?
        WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = ?)
      `,
      [name, description, icon, color, requirementType, requirementValue, name],
    );
  }
}

async function ensureUsersSchema() {
  if (!env.databaseUrl) {
    return;
  }

  const connection = await mysql.createConnection(getMysqlConnectionOptions(env.databaseUrl));
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        UNIQUE KEY users_email_unique (email)
      )
    `);

    for (const [column, definition] of userColumns) {
      await ensureColumn(connection, column, definition);
    }

    await connection.query(`
      UPDATE users
      SET username = COALESCE(NULLIF(username, ''), REPLACE(SUBSTRING_INDEX(COALESCE(email, id), '@', 1), '.', '_'))
      WHERE username IS NULL OR username = ''
    `);
    await connection.query(`
      UPDATE users
      SET full_name = COALESCE(
        NULLIF(full_name, ''),
        NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''),
        username,
        email,
        id
      )
      WHERE full_name IS NULL OR full_name = ''
    `);
    await connection.query("ALTER TABLE users MODIFY username VARCHAR(50) NOT NULL");
    await connection.query("ALTER TABLE users MODIFY full_name VARCHAR(100) NOT NULL");
    await ensureCoreTables(connection);
  } finally {
    await connection.end();
  }
}

export function ensureDatabaseSchema() {
  schemaReady ??= ensureUsersSchema();
  return schemaReady;
}
