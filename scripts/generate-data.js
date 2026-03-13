#!/usr/bin/env node

/**
 * Static Data Generator
 * Reads SQLite database and pre-computes all API responses for static export.
 * Run before `next build` to generate public/data.json
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'agentflow.db');
console.log(`📖 Reading database from: ${DB_PATH}`);

const db = new Database(DB_PATH, { readonly: true });
db.pragma('foreign_keys = ON');

// Helper: convert unix timestamps to ISO strings
function tsToISO(ts) {
  if (!ts) return null;
  // SQLite stores as unix epoch seconds
  return new Date(ts * 1000).toISOString();
}

// Helper: safely parse JSON fields
function parseJSON(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return str; }
}

// ============ RAW DATA ============

const rawProjects = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
const rawTasks = db.prepare('SELECT * FROM tasks ORDER BY updated_at DESC').all();
const rawAgents = db.prepare('SELECT * FROM agents ORDER BY name').all();
const rawActivity = db.prepare('SELECT * FROM activity ORDER BY timestamp DESC LIMIT 200').all();
const rawComments = db.prepare('SELECT * FROM comments ORDER BY timestamp DESC LIMIT 100').all();
const rawNotifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all().catch?.(() => []) || (() => { try { return db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all(); } catch { return []; } })();

// Get notifications safely
let notifications = [];
try {
  notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all();
} catch (e) {
  console.log('⚠️  No notifications table, skipping');
}

console.log(`📊 Found: ${rawProjects.length} projects, ${rawTasks.length} tasks, ${rawAgents.length} agents, ${rawActivity.length} activities`);

// ============ TRANSFORM DATA ============

const projects = rawProjects.map(p => ({
  id: p.id,
  name: p.name,
  description: p.description || undefined,
  status: p.status,
  techStack: parseJSON(p.tech_stack) || undefined,
  repoUrl: p.repo_url || undefined,
  createdAt: tsToISO(p.created_at),
  updatedAt: tsToISO(p.updated_at),
}));

const agents = rawAgents.map(a => {
  const totalTasks = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE assigned_agent = ?').get(a.name)?.c || 0;
  const activeTasks = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE assigned_agent = ? AND status = 'in-progress'").get(a.name)?.c || 0;
  return {
    id: a.id,
    name: a.name,
    role: a.role,
    color: a.color,
    avatarUrl: a.avatar_url || undefined,
    status: a.status,
    currentTaskId: a.current_task_id || undefined,
    createdAt: tsToISO(a.created_at),
    updatedAt: tsToISO(a.updated_at),
    taskCounts: { total: totalTasks, active: activeTasks },
  };
});

const agentMap = {};
rawAgents.forEach(a => { agentMap[a.name] = a; agentMap[a.id] = a; });
const projectMap = {};
rawProjects.forEach(p => { projectMap[p.id] = p; });

const tasks = rawTasks.map(t => {
  const proj = projectMap[t.project_id];
  const ag = t.assigned_agent ? agentMap[t.assigned_agent] : null;
  return {
    id: t.id,
    projectId: t.project_id,
    title: t.title,
    description: t.description || undefined,
    status: t.status,
    priority: t.priority,
    assignedAgent: t.assigned_agent || undefined,
    tags: parseJSON(t.tags) || undefined,
    dueDate: t.due_date ? tsToISO(t.due_date) : undefined,
    effort: t.effort || undefined,
    dependencies: parseJSON(t.dependencies) || undefined,
    createdAt: tsToISO(t.created_at),
    updatedAt: tsToISO(t.updated_at),
    project: proj ? { id: proj.id, name: proj.name, status: proj.status } : null,
    agent: ag ? { id: ag.id, name: ag.name, role: ag.role, color: ag.color } : null,
  };
});

const activityItems = rawActivity.map(a => {
  const ag = a.agent_id ? agentMap[a.agent_id] : null;
  const proj = a.project_id ? projectMap[a.project_id] : null;
  return {
    id: a.id,
    projectId: a.project_id,
    taskId: a.task_id,
    agentId: a.agent_id,
    action: a.action,
    details: parseJSON(a.details),
    timestamp: tsToISO(a.timestamp),
    agent: ag ? { id: ag.id, name: ag.name, role: ag.role, color: ag.color } : null,
    project: proj ? { id: proj.id, name: proj.name } : null,
  };
});

// ============ ANALYTICS: OVERVIEW ============

const totalTasks = rawTasks.length;
const completedTasks = rawTasks.filter(t => t.status === 'done').length;
const inProgressTasks = rawTasks.filter(t => t.status === 'in-progress').length;
const activeProjects = rawProjects.filter(p => p.status === 'active').length;
const activeAgents = rawAgents.filter(a => a.status === 'available').length;
const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 10000) / 100 : 0;

const doneTasks = rawTasks.filter(t => t.status === 'done');
const avgCompletionTime = doneTasks.length > 0
  ? Math.round(doneTasks.reduce((sum, t) => sum + (t.updated_at - t.created_at) / 86400, 0) / doneTasks.length * 10) / 10
  : 0;

const analyticsOverview = {
  totalTasks, completedTasks, inProgressTasks, completionRate, avgCompletionTime, activeProjects, activeAgents
};

// ============ ANALYTICS: COMPLETION ============

const priorities = ['low', 'medium', 'high', 'urgent'];
const completionByPriority = priorities.map(p => {
  const total = rawTasks.filter(t => t.priority === p).length;
  const completed = rawTasks.filter(t => t.priority === p && t.status === 'done').length;
  return { priority: p.charAt(0).toUpperCase() + p.slice(1), total, completed, rate: total > 0 ? Math.round((completed/total)*10000)/100 : 0 };
});

const completionByProject = rawProjects.map(proj => {
  const projTasks = rawTasks.filter(t => t.project_id === proj.id);
  const completed = projTasks.filter(t => t.status === 'done').length;
  return {
    projectName: proj.name,
    total: projTasks.length,
    completed,
    rate: projTasks.length > 0 ? Math.round((completed/projTasks.length)*10000)/100 : 0
  };
});

const statuses = ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked'];
const statusDistribution = statuses.map(s => {
  const count = rawTasks.filter(t => t.status === s).length;
  return { status: s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' '), count, percentage: totalTasks > 0 ? Math.round((count/totalTasks)*10000)/100 : 0 };
}).filter(s => s.count > 0);

const timeBuckets = [
  { range: '0-1 days', min: 0, max: 1, count: 0 },
  { range: '1-3 days', min: 1, max: 3, count: 0 },
  { range: '3-7 days', min: 3, max: 7, count: 0 },
  { range: '1-2 weeks', min: 7, max: 14, count: 0 },
  { range: '2-4 weeks', min: 14, max: 28, count: 0 },
  { range: '1+ months', min: 28, max: Infinity, count: 0 },
];
doneTasks.forEach(t => {
  const days = (t.updated_at - t.created_at) / 86400;
  for (const bucket of timeBuckets) {
    if (days >= bucket.min && days < bucket.max) { bucket.count++; break; }
  }
});

const analyticsCompletion = {
  completionByPriority,
  completionByProject,
  statusDistribution,
  completionTimeHistogram: timeBuckets,
  completionTimes: doneTasks.slice(0, 20).map(t => ({
    taskId: t.id, title: t.title, priority: t.priority,
    daysToComplete: Math.round((t.updated_at - t.created_at) / 86400)
  })),
  stuckTasks: rawTasks.filter(t => t.status !== 'done').map(t => {
    const days = Math.round((Date.now()/1000 - t.updated_at) / 86400);
    return { taskId: t.id, title: t.title, status: t.status, daysStuck: days };
  }).filter(t => t.daysStuck > 7).slice(0, 10)
};

// ============ ANALYTICS: VELOCITY ============

// Generate 30-day velocity chart
const now = new Date();
const velocityData = [];
for (let i = 29; i >= 0; i--) {
  const d = new Date(now);
  d.setDate(d.getDate() - i);
  const dateStr = d.toISOString().split('T')[0];
  const dayStart = Math.floor(new Date(dateStr).getTime() / 1000);
  const dayEnd = dayStart + 86400;
  const created = rawTasks.filter(t => t.created_at >= dayStart && t.created_at < dayEnd).length;
  const completed = rawActivity.filter(a => a.action === 'status_changed' && a.timestamp >= dayStart && a.timestamp < dayEnd).length;
  velocityData.push({ date: dateStr, created, completed, net: created - completed });
}

const totalCreated = velocityData.reduce((s, d) => s + d.created, 0);
const totalCompleted = velocityData.reduce((s, d) => s + d.completed, 0);

const analyticsVelocity = {
  chartData: velocityData,
  metrics: {
    totalCreated, totalCompleted,
    avgDailyCreation: Math.round((totalCreated / 30) * 100) / 100,
    avgDailyCompletion: Math.round((totalCompleted / 30) * 100) / 100,
    velocityTrend: totalCompleted - totalCreated,
    period: '30 days'
  }
};

// ============ ANALYTICS: AGENTS ============

const workloadData = rawAgents.filter(a => !a.name.startsWith('perf-agent')).slice(0, 20).map(a => {
  const agentTasks = rawTasks.filter(t => t.assigned_agent === a.name);
  const completed = agentTasks.filter(t => t.status === 'done').length;
  const inProg = agentTasks.filter(t => t.status === 'in-progress').length;
  return {
    agentName: a.name, role: a.role, color: a.color, status: a.status,
    totalTasks: agentTasks.length, completedTasks: completed, inProgressTasks: inProg,
    completionRate: agentTasks.length > 0 ? Math.round((completed/agentTasks.length)*10000)/100 : 0
  };
});

const analyticsAgents = {
  workloadDistribution: workloadData,
  productivityMetrics: workloadData.filter(a => a.completedTasks > 0).map(a => ({
    agentName: a.agentName, role: a.role, tasksCompleted: a.completedTasks, avgCompletionTime: 0
  })),
  workloadBalance: {
    agents: workloadData,
    avgTasksPerAgent: workloadData.length > 0 ? Math.round(workloadData.reduce((s,a) => s+a.totalTasks, 0) / workloadData.length * 100)/100 : 0,
    totalTasks: workloadData.reduce((s,a) => s+a.totalTasks, 0),
    overloadedAgents: 0, underloadedAgents: 0
  },
  agentCapacity: workloadData.map(a => ({
    agentName: a.agentName, role: a.role, status: a.status,
    currentTaskTitle: null, totalAssigned: a.totalTasks,
    isAvailable: a.status === 'available', capacity: a.status === 'busy' ? 'Full' : a.status === 'available' ? 'Available' : 'Offline'
  })),
  peakActivity: {
    hourlyData: Array.from({length: 24}, (_, h) => ({ hour: `${h.toString().padStart(2,'0')}:00`, activityCount: 0, activeAgents: 0 })),
    peakHour: { hour: '10:00', activityCount: 0, activeAgents: 0 }
  },
  taskSwitching: []
};

// ============ ANALYTICS: PROJECTS ============

const projectProgress = rawProjects.map(p => {
  const pTasks = rawTasks.filter(t => t.project_id === p.id);
  const comp = pTasks.filter(t => t.status === 'done').length;
  const inProg = pTasks.filter(t => t.status === 'in-progress').length;
  const blocked = pTasks.filter(t => t.status === 'blocked').length;
  const highPri = pTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
  return {
    projectId: p.id, projectName: p.name, status: p.status,
    totalTasks: pTasks.length, completedTasks: comp, inProgressTasks: inProg,
    blockedTasks: blocked, highPriorityTasks: highPri,
    completionRate: pTasks.length > 0 ? Math.round((comp/pTasks.length)*10000)/100 : 0,
    createdAt: tsToISO(p.created_at), updatedAt: tsToISO(p.updated_at)
  };
});

const analyticsProjects = {
  projectProgress,
  projectVelocity: rawProjects.map(p => ({
    projectId: p.id, projectName: p.name, tasksCompletedLast30Days: 0, avgTasksPerWeek: 0, velocity: 'Low'
  })),
  taskBreakdown: rawProjects.map(p => {
    const pTasks = rawTasks.filter(t => t.project_id === p.id);
    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
    const byStatus = { backlog: 0, 'in-progress': 0, 'code-review': 0, testing: 0, deploying: 0, done: 0, blocked: 0 };
    pTasks.forEach(t => { byPriority[t.priority] = (byPriority[t.priority]||0)+1; byStatus[t.status] = (byStatus[t.status]||0)+1; });
    return { projectId: p.id, projectName: p.name, byPriority, byStatus };
  }),
  projectTimelines: rawProjects.map(p => ({
    projectId: p.id, projectName: p.name, status: p.status,
    startDate: tsToISO(p.created_at), endDate: tsToISO(p.updated_at),
    durationDays: Math.ceil((p.updated_at - p.created_at) / 86400),
    nextDueDate: null, overdueTasks: 0, tasksWithDueDates: 0, isOverdue: false
  })),
  resourceAllocation: [],
  projectHealth: rawProjects.map(p => {
    const pTasks = rawTasks.filter(t => t.project_id === p.id);
    const comp = pTasks.filter(t => t.status === 'done').length;
    const rate = pTasks.length > 0 ? (comp/pTasks.length)*100 : 0;
    let score = 100;
    if (rate < 50) score -= 30;
    else if (rate < 80) score -= 15;
    return { projectId: p.id, projectName: p.name, healthScore: Math.max(0, score), healthStatus: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Warning' };
  })
};

// ============ ANALYTICS: ADDITIONAL ============

const priorityData = priorities.map(p => {
  const count = rawTasks.filter(t => t.priority === p).length;
  return { priority: p.charAt(0).toUpperCase() + p.slice(1), count, percentage: totalTasks > 0 ? Math.round((count/totalTasks)*10000)/100 : 0 };
});

const analyticsAdditional = {
  priorityDistribution: priorityData,
  commentEngagement: [],
  activityHeatmap: {
    grid: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, di) => ({
      day, dayIndex: di,
      hours: Array.from({length:24}, (_,h) => ({ hour: h, hourLabel: `${h.toString().padStart(2,'0')}:00`, activityCount: 0, intensity: 'none' }))
    })),
    peakTime: { day: 'N/A', hour: 'N/A', activityCount: 0 }
  },
  taskAging: { stuckTasks: [], summary: { totalStuck: 0, highUrgency: 0, mediumUrgency: 0, avgDaysStuck: 0 } },
  commentSentiment: { comments: [], summary: { positive: 0, negative: 0, neutral: 0, overallSentiment: 'neutral' } },
  taskTrend: velocityData.map(d => ({ date: d.date, creations: d.created, completions: d.completed, net: d.net }))
};

// ============ ACTIVITY STATS ============

const activityStats = {
  totalActivities: rawActivity.length,
  todayActivities: 0,
  topActions: {},
  activeAgents: [...new Set(rawActivity.map(a => a.agent_id).filter(Boolean))].length,
};

// ============ AGENT DETAILS ============

const agentDetails = {};
rawAgents.forEach(a => {
  const agentTasks = rawTasks.filter(t => t.assigned_agent === a.name);
  const agentActivity = rawActivity.filter(act => act.agent_id === a.id);
  agentDetails[a.id] = {
    ...agents.find(ag => ag.id === a.id),
    assignedTasks: agentTasks.map(t => ({
      id: t.id, title: t.title, status: t.status, priority: t.priority, projectId: t.project_id
    })),
    recentActivity: agentActivity.slice(0, 10).map(act => ({
      id: act.id, action: act.action, details: parseJSON(act.details), timestamp: tsToISO(act.timestamp)
    })),
    taskStats: {
      total: agentTasks.length,
      completed: agentTasks.filter(t => t.status === 'done').length,
      inProgress: agentTasks.filter(t => t.status === 'in-progress').length,
      blocked: agentTasks.filter(t => t.status === 'blocked').length
    }
  };
});

// ============ PROJECT DETAILS ============

const projectDetails = {};
rawProjects.forEach(p => {
  projectDetails[p.id] = {
    ...projects.find(pr => pr.id === p.id),
    taskCount: rawTasks.filter(t => t.project_id === p.id).length,
    completedTasks: rawTasks.filter(t => t.project_id === p.id && t.status === 'done').length,
  };
});

// ============ TASK DETAILS ============

const taskDetails = {};
rawTasks.forEach(t => {
  const task = tasks.find(ta => ta.id === t.id);
  const taskActivity = rawActivity.filter(a => a.task_id === t.id).map(a => ({
    id: a.id, action: a.action, details: parseJSON(a.details), timestamp: tsToISO(a.timestamp),
    agent: a.agent_id && agentMap[a.agent_id] ? { id: agentMap[a.agent_id].id, name: agentMap[a.agent_id].name, role: agentMap[a.agent_id].role, color: agentMap[a.agent_id].color } : null
  }));
  const taskComments = rawComments.filter(c => c.task_id === t.id).map(c => {
    const cAgent = agentMap[c.agent_id];
    return {
      id: c.id, taskId: c.task_id, parentId: c.parent_id, content: c.content,
      contentType: c.content_type || 'plain', isEdited: !!c.is_edited, isDeleted: !!c.is_deleted,
      timestamp: tsToISO(c.timestamp), updatedAt: tsToISO(c.updated_at),
      agent: cAgent ? { id: cAgent.id, name: cAgent.name, role: cAgent.role, color: cAgent.color } : null,
      replies: [], reactions: [], replyCount: 0
    };
  });
  taskDetails[t.id] = { ...task, activity: taskActivity, comments: taskComments };
});

// ============ NOTIFICATION STATS ============

const notificationStats = { unreadCount: 0, totalCount: notifications.length, byType: {}, byPriority: {} };

// ============ ASSEMBLE ============

const staticData = {
  _generated: new Date().toISOString(),
  _version: 1,
  
  // List endpoints
  projects,
  tasks,
  agents,
  activity: activityItems,
  
  // Detail maps
  agentDetails,
  projectDetails, 
  taskDetails,
  
  // Analytics
  analyticsOverview,
  analyticsCompletion,
  analyticsVelocity,
  analyticsAgents,
  analyticsProjects,
  analyticsAdditional,
  
  // Activity stats  
  activityStats,
  
  // Notifications
  notifications: [],
  notificationStats,
};

// Write to public/data.json
const outPath = path.join(process.cwd(), 'public', 'data.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(staticData, null, 0)); // minified for smaller size

const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
console.log(`✅ Generated ${outPath} (${sizeMB} MB)`);
console.log(`   Projects: ${projects.length}, Tasks: ${tasks.length}, Agents: ${agents.length}, Activities: ${activityItems.length}`);

db.close();
