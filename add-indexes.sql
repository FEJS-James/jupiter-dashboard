-- Database performance indexes for analytics
-- Add these indexes for analytics performance:

CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_updated ON tasks(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp_action ON activity(timestamp, action);

-- Additional useful indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_activity_agent_id ON activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_task_id ON activity(task_id);