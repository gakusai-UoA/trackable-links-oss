-- Trackable Links schema
--
-- Apply with:
--   wrangler d1 execute trackable-links-db --local  --file=./schema.sql
--   wrangler d1 execute trackable-links-db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS Projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    destination_url TEXT NOT NULL,
    created_at TEXT NOT NULL,
    admin_user_id TEXT
);

CREATE TABLE IF NOT EXISTS QRCodes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'unset',
    created_at TEXT NOT NULL,
    creator_id TEXT,
    FOREIGN KEY (project_id) REFERENCES Projects(project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AccessLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qr_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    accessed_at TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_qrcodes_project_id ON QRCodes(project_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_project_id ON AccessLogs(project_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_qr_id ON AccessLogs(qr_id);
