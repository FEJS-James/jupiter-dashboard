import { server } from './mocks/server'

describe('Activity API Integration', () => {
  beforeAll(() => {
    // MSW server is already started in test setup
  })

  describe('GET /api/activity', () => {
    it('should fetch activities with default parameters', async () => {
      const response = await fetch('/api/activity')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
      
      // Verify activity structure
      const activity = data.data[0]
      expect(activity).toHaveProperty('id')
      expect(activity).toHaveProperty('action')
      expect(activity).toHaveProperty('timestamp')
      expect(activity).toHaveProperty('agent')
    })

    it('should support pagination', async () => {
      const response = await fetch('/api/activity?page=1&limit=2')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(2)
    })

    it('should support project filtering', async () => {
      const response = await fetch('/api/activity?project=1')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // All activities should be from project 1
      data.data.forEach((activity: any) => {
        expect(activity.projectId === 1 || activity.projectId === null).toBe(true)
      })
    })

    it('should support agent filtering', async () => {
      const response = await fetch('/api/activity?agent=1')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // All activities should be from agent 1
      data.data.forEach((activity: any) => {
        expect(activity.agentId === 1 || activity.agentId === null).toBe(true)
      })
    })

    it('should support activity type filtering', async () => {
      const response = await fetch('/api/activity?activityType=task_created')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // All activities should be task_created
      data.data.forEach((activity: any) => {
        expect(activity.action).toBe('task_created')
      })
    })

    it('should support search filtering', async () => {
      const response = await fetch('/api/activity?search=created')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('should support date range filtering', async () => {
      const now = new Date().toISOString()
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const response = await fetch(`/api/activity?startDate=${yesterday}&endDate=${now}`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('POST /api/activity', () => {
    it('should create new activity', async () => {
      const activityData = {
        projectId: 1,
        taskId: 1,
        agentId: 1,
        action: 'test_action',
        details: { test: true }
      }

      const response = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      })
      
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.action).toBe('test_action')
      expect(data.data.details.test).toBe(true)
    })

    it('should create activity with minimal data', async () => {
      const activityData = {
        action: 'system_event'
      }

      const response = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      })
      
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.action).toBe('system_event')
    })
  })

  describe('GET /api/activity/stats', () => {
    it('should return activity statistics', async () => {
      const response = await fetch('/api/activity/stats')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('totalActivities')
      expect(data.data).toHaveProperty('activitiesLast24Hours')
      expect(data.data).toHaveProperty('mostActiveProject')
      expect(data.data).toHaveProperty('mostActiveAgent')
      expect(data.data).toHaveProperty('topActivityTypes')
      
      expect(typeof data.data.totalActivities).toBe('number')
      expect(Array.isArray(data.data.topActivityTypes)).toBe(true)
    })

    it('should calculate activity type percentages', async () => {
      const response = await fetch('/api/activity/stats')
      const data = await response.json()

      expect(response.status).toBe(200)
      
      data.data.topActivityTypes.forEach((activityType: any) => {
        expect(activityType).toHaveProperty('type')
        expect(activityType).toHaveProperty('count')
        expect(activityType).toHaveProperty('percentage')
        expect(typeof activityType.percentage).toBe('number')
        expect(activityType.percentage).toBeGreaterThanOrEqual(0)
        expect(activityType.percentage).toBeLessThanOrEqual(100)
      })
    })
  })

  describe('POST /api/activity/export', () => {
    it('should export activities in JSON format', async () => {
      const exportData = {
        format: 'json',
        limit: 10
      }

      const response = await fetch('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      })
      
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data).toHaveProperty('metadata')
      expect(data.metadata).toHaveProperty('exportedAt')
      expect(data.metadata).toHaveProperty('recordCount')
    })

    it('should export activities in CSV format', async () => {
      const exportData = {
        format: 'csv',
        limit: 10
      }

      const response = await fetch('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      })
      
      const csvData = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
      expect(csvData).toContain('ID,Timestamp,Action')
      expect(csvData.split('\n').length).toBeGreaterThan(1) // Header + data rows
    })

    it('should support filtering in export', async () => {
      const exportData = {
        format: 'json',
        filters: {
          project: 1,
          agent: 1
        },
        limit: 100
      }

      const response = await fetch('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      })
      
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metadata.filters.project).toBe(1)
      expect(data.metadata.filters.agent).toBe(1)
    })
  })

  describe('GET /api/activity/export', () => {
    it('should export via GET request in CSV format', async () => {
      const response = await fetch('/api/activity/export?format=csv&limit=5')
      const csvData = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
      expect(csvData).toContain('ID,Timestamp,Action')
    })

    it('should export via GET request in JSON format', async () => {
      const response = await fetch('/api/activity/export?format=json&limit=5')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })
  })
})