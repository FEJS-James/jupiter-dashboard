# AgentFlow API Documentation

REST API endpoints for the AgentFlow project management system.

## Base URL
```
http://localhost:3000/api
```

## Response Format

All API responses follow a consistent JSON format:

**Success Response:**
```json
{
  "success": true,
  "data": <response_data>,
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "error": "Error description",
  "details": {
    "issues": [
      {
        "field": "fieldName",
        "message": "Validation error message"
      }
    ]
  }
}
```

## HTTP Status Codes

- `200` - OK (successful GET, PATCH)
- `201` - Created (successful POST)
- `400` - Bad Request (validation errors, invalid data)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (unique constraint violation)
- `500` - Internal Server Error

## Projects API

### List Projects
```http
GET /api/projects
```

Returns all projects with basic information.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Project Name",
      "description": "Project description",
      "status": "active",
      "techStack": ["Node.js", "TypeScript"],
      "repoUrl": "https://github.com/user/repo",
      "createdAt": "2024-03-12T00:00:00.000Z",
      "updatedAt": "2024-03-12T00:00:00.000Z"
    }
  ]
}
```

### Create Project
```http
POST /api/projects
```

**Request Body:**
```json
{
  "name": "Project Name",
  "description": "Project description (optional)",
  "status": "planning", // optional: planning, active, on-hold, completed, cancelled
  "techStack": ["Node.js", "TypeScript"], // optional array
  "repoUrl": "https://github.com/user/repo" // optional
}
```

### Get Project Details
```http
GET /api/projects/{id}
```

Returns project with task statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Project Name",
    "description": "Project description",
    "status": "active",
    "techStack": ["Node.js", "TypeScript"],
    "repoUrl": "https://github.com/user/repo",
    "createdAt": "2024-03-12T00:00:00.000Z",
    "updatedAt": "2024-03-12T00:00:00.000Z",
    "stats": {
      "backlog": 5,
      "in-progress": 2,
      "code-review": 1,
      "testing": 0,
      "deploying": 0,
      "done": 8,
      "blocked": 0
    },
    "totalTasks": 16
  }
}
```

### Update Project
```http
PATCH /api/projects/{id}
```

**Request Body:**
```json
{
  "name": "Updated Name", // optional
  "description": "Updated description", // optional
  "status": "completed", // optional
  "techStack": ["Node.js", "TypeScript", "React"], // optional
  "repoUrl": "https://github.com/user/new-repo" // optional
}
```

### Archive Project
```http
DELETE /api/projects/{id}
```

Sets project status to 'cancelled' instead of deleting (preserves data integrity).

## Tasks API

### List Tasks
```http
GET /api/tasks?status=active&project=1&agent=jupiter&priority=high&limit=10&offset=0
```

**Query Parameters:**
- `status` - Filter by status (backlog, in-progress, code-review, testing, deploying, done, blocked)
- `project` - Filter by project ID or project name
- `agent` - Filter by assigned agent name
- `priority` - Filter by priority (low, medium, high, urgent)
- `limit` - Maximum number of results
- `offset` - Number of results to skip (pagination)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "projectId": 1,
      "title": "Task Title",
      "description": "Task description",
      "status": "in-progress",
      "priority": "high",
      "assignedAgent": "jupiter",
      "tags": ["feature", "api"],
      "dueDate": "2024-03-20T00:00:00.000Z",
      "effort": 5.0,
      "dependencies": [2, 3],
      "createdAt": "2024-03-12T00:00:00.000Z",
      "updatedAt": "2024-03-12T00:00:00.000Z",
      "project": {
        "id": 1,
        "name": "Project Name",
        "status": "active"
      },
      "agent": {
        "id": 1,
        "name": "jupiter",
        "role": "coder",
        "color": "#3b82f6",
        "status": "busy"
      }
    }
  ]
}
```

### Create Task
```http
POST /api/tasks
```

**Request Body:**
```json
{
  "projectId": 1,
  "title": "Task Title",
  "description": "Task description", // optional
  "status": "backlog", // optional, default: backlog
  "priority": "medium", // optional, default: medium
  "assignedAgent": "jupiter", // optional
  "tags": ["feature", "api"], // optional
  "dueDate": "2024-03-20T00:00:00.000Z", // optional ISO string
  "effort": 5.0, // optional
  "dependencies": [2, 3] // optional array of task IDs
}
```

### Get Task Details
```http
GET /api/tasks/{id}
```

Returns task with project and agent information.

### Update Task
```http
PATCH /api/tasks/{id}
```

**Request Body:** Same fields as create, all optional.

### Delete Task
```http
DELETE /api/tasks/{id}
```

Permanently deletes the task and related records.

### Move Task
```http
POST /api/tasks/{id}/move
```

**Request Body:**
```json
{
  "status": "in-progress",
  "assignedAgent": "jupiter" // optional
}
```

### Add Comment
```http
POST /api/tasks/{id}/comments
```

**Request Body:**
```json
{
  "content": "Comment text",
  "agentId": 1
}
```

### Get Comments
```http
GET /api/tasks/{id}/comments
```

Returns all comments for a task with agent information.

## Agents API

### List Agents
```http
GET /api/agents
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "jupiter",
      "role": "coder",
      "color": "#3b82f6",
      "avatarUrl": null,
      "status": "available",
      "currentTaskId": null,
      "createdAt": "2024-03-12T00:00:00.000Z",
      "updatedAt": "2024-03-12T00:00:00.000Z"
    }
  ]
}
```

### Update Agent Status
```http
PATCH /api/agents/{id}
```

**Request Body:**
```json
{
  "status": "busy", // optional: available, busy, offline
  "currentTaskId": 5 // optional: task ID or null
}
```

## Error Examples

### Validation Error
```json
{
  "error": "Validation failed",
  "details": {
    "issues": [
      {
        "field": "name",
        "message": "Project name is required"
      }
    ]
  }
}
```

### Not Found Error
```json
{
  "error": "Project not found"
}
```

### Foreign Key Error
```json
{
  "error": "Referenced resource not found"
}
```

## Authentication

Currently, no authentication is required. In a production environment, you would typically add JWT or session-based authentication to protect these endpoints.

## Rate Limiting

No rate limiting is currently implemented. Consider adding rate limiting middleware for production use.

## Testing

Use the provided `test-api.ts` script to test all endpoints:

1. Start the development server: `npm run dev`
2. In another terminal: `npx ts-node test-api.ts`

Alternatively, use tools like Postman, curl, or any HTTP client to interact with the API.