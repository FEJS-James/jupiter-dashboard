-- Migration for TASK-015: Enhanced Comments System
-- Adds support for nested comments, edit history, reactions, and notifications

-- First, add new columns to existing comments table
ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN content_type TEXT NOT NULL DEFAULT 'plain' CHECK (content_type IN ('plain', 'markdown', 'rich'));
ALTER TABLE comments ADD COLUMN is_edited INTEGER NOT NULL DEFAULT 0 CHECK (is_edited IN (0, 1));
ALTER TABLE comments ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1));
ALTER TABLE comments ADD COLUMN deleted_at INTEGER;
ALTER TABLE comments ADD COLUMN deleted_by_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE comments ADD COLUMN mentions TEXT; -- JSON array of agent IDs
ALTER TABLE comments ADD COLUMN attachments TEXT; -- JSON array of attachment paths
ALTER TABLE comments ADD COLUMN metadata TEXT; -- JSON metadata object
ALTER TABLE comments ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());

-- Create comment edit history table
CREATE TABLE comment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  previous_content TEXT NOT NULL,
  edit_reason TEXT,
  edited_by_agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  edited_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create comment reactions table
CREATE TABLE comment_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(comment_id, agent_id, reaction)
);

-- Create comment notifications table
CREATE TABLE comment_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mention', 'reply', 'assigned')),
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  read_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create indexes for better query performance
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_task_id_timestamp ON comments(task_id, timestamp);
CREATE INDEX idx_comment_history_comment_id ON comment_history(comment_id);
CREATE INDEX idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX idx_comment_notifications_recipient ON comment_notifications(recipient_agent_id, is_read);
CREATE INDEX idx_comment_notifications_task_id ON comment_notifications(task_id);