import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import React from 'react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { UserPreferencesProvider, useUserPreferences } from './user-preferences-context'
import { DEFAULT_USER_PREFERENCES } from '@/types'

// Helper to render hook within provider
function TestConsumer({ 
  onContext 
}: { 
  onContext: (ctx: ReturnType<typeof useUserPreferences>) => void 
}) {
  const ctx = useUserPreferences()
  React.useEffect(() => {
    onContext(ctx)
  })
  return <div data-testid="consumer">loaded</div>
}

function renderWithProvider(
  agentId?: number,
  onContext?: (ctx: ReturnType<typeof useUserPreferences>) => void
) {
  const ctxRef = { current: null as ReturnType<typeof useUserPreferences> | null }
  const callback = onContext || ((ctx: ReturnType<typeof useUserPreferences>) => { ctxRef.current = ctx })
  
  const result = render(
    <UserPreferencesProvider agentId={agentId}>
      <TestConsumer onContext={callback} />
    </UserPreferencesProvider>
  )
  
  return { ...result, ctxRef }
}

const mockPreferences = {
  id: 1,
  agentId: 1,
  version: 1,
  ...DEFAULT_USER_PREFERENCES,
  agent: { id: 1, name: 'TestAgent', role: 'coder', color: '#3b82f6', status: 'available' },
  defaultProject: null,
  history: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('UserPreferencesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage mock
    ;(window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
    ;(window.localStorage.setItem as ReturnType<typeof vi.fn>).mockClear()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  // Setup default preference handlers
  function setupPreferenceHandlers(prefs = mockPreferences) {
    server.use(
      http.get('/api/preferences', ({ request }) => {
        const url = new URL(request.url)
        const agentId = url.searchParams.get('agentId')
        if (!agentId) {
          return HttpResponse.json({ error: 'Agent ID is required' }, { status: 400 })
        }
        return HttpResponse.json(prefs)
      }),
      http.put('/api/preferences', async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        return HttpResponse.json({ ...prefs, ...body })
      }),
      http.patch('/api/preferences', async ({ request }) => {
        const body = await request.json() as { agentId: number; updates: Array<{ field: string; value: unknown }> }
        const updated = { ...prefs } as Record<string, unknown>
        if (body.updates) {
          body.updates.forEach(({ field, value }: { field: string; value: unknown }) => {
            updated[field] = value
          })
        }
        return HttpResponse.json(updated)
      }),
      http.delete('/api/preferences', () => {
        return HttpResponse.json({ ...prefs, ...DEFAULT_USER_PREFERENCES })
      }),
      http.get('/api/preferences/export', () => {
        return new HttpResponse(JSON.stringify(prefs), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="prefs.json"',
          },
        })
      }),
      http.post('/api/preferences/import', async ({ request }) => {
        const body = await request.json() as { importData: Record<string, unknown> }
        return HttpResponse.json({ ...prefs, ...body.importData })
      }),
    )
  }

  describe('Provider Setup', () => {
    it('throws error when useUserPreferences is used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      function BadConsumer() {
        useUserPreferences()
        return null
      }

      expect(() => render(<BadConsumer />)).toThrow(
        'useUserPreferences must be used within a UserPreferencesProvider'
      )
      
      consoleSpy.mockRestore()
    })

    it('renders children within provider', () => {
      render(
        <UserPreferencesProvider>
          <div data-testid="child">Hello</div>
        </UserPreferencesProvider>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('provides initial state with null preferences when no agentId', () => {
      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      
      renderWithProvider(undefined, (ctx) => { capturedCtx = ctx })

      expect(capturedCtx).not.toBeNull()
      expect(capturedCtx!.preferences).toBeNull()
      expect(capturedCtx!.loading).toBe(false)
      expect(capturedCtx!.error).toBeNull()
    })
  })

  describe('loadPreferences', () => {
    it('fetches preferences when agentId is provided', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
        expect(capturedCtx!.preferences!.agentId).toBe(1)
        expect(capturedCtx!.preferences!.fontSize).toBe('medium')
      })
    })

    it('stores loaded preferences in localStorage', async () => {
      setupPreferenceHandlers()

      renderWithProvider(1)

      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'user-preferences-1',
          expect.any(String)
        )
      })
    })

    it('falls back to localStorage when fetch fails', async () => {
      server.use(
        http.get('/api/preferences', () => {
          return HttpResponse.error()
        }),
      )

      const cachedPrefs = JSON.stringify(mockPreferences)
      ;(window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(cachedPrefs)

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.error).toBeTruthy()
        expect(capturedCtx!.preferences).not.toBeNull()
        expect(capturedCtx!.preferences!.agentId).toBe(1)
      })
    })

    it('sets error when fetch returns non-ok response', async () => {
      server.use(
        http.get('/api/preferences', () => {
          return HttpResponse.json({ error: 'Not Found' }, { status: 404 })
        }),
      )

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.error).toContain('Failed to load preferences')
      })
    })
  })

  describe('updatePreferences', () => {
    it('performs optimistic update then confirms with API', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      await act(async () => {
        await capturedCtx!.updatePreferences({ fontSize: 'large' })
      })

      await waitFor(() => {
        // After update, preferences should contain the updated value
        expect(capturedCtx!.preferences!.fontSize).toBe('large')
        expect(capturedCtx!.error).toBeNull()
      })
    })

    it('reverts optimistic update on API failure', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      // Override PUT to fail
      server.use(
        http.put('/api/preferences', () => {
          return HttpResponse.json({ error: 'Server Error' }, { status: 500 })
        }),
      )

      await act(async () => {
        try {
          await capturedCtx!.updatePreferences({ fontSize: 'large' })
        } catch {
          // expected
        }
      })

      await waitFor(() => {
        expect(capturedCtx!.error).toContain('Failed to update preferences')
        // Should revert to original
        expect(capturedCtx!.preferences!.fontSize).toBe('medium')
      })
    })

    it('does nothing when preferences or agentId is not set', async () => {
      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(undefined, (ctx) => { capturedCtx = ctx })

      await act(async () => {
        await capturedCtx!.updatePreferences({ fontSize: 'large' })
      })

      expect(capturedCtx!.preferences).toBeNull()
    })
  })

  describe('updatePreference (single field)', () => {
    it('sends PATCH request for single field update', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      await act(async () => {
        await capturedCtx!.updatePreference('sidebarCollapsed', true)
      })

      await waitFor(() => {
        expect(capturedCtx!.preferences!.sidebarCollapsed).toBe(true)
        expect(capturedCtx!.error).toBeNull()
      })
    })
  })

  describe('batchUpdatePreferences', () => {
    it('sends batch updates via PATCH', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      const updates = [
        { field: 'fontSize' as const, value: 'large' },
        { field: 'sidebarCollapsed' as const, value: true },
      ]

      await act(async () => {
        await capturedCtx!.batchUpdatePreferences(updates)
      })

      await waitFor(() => {
        expect(capturedCtx!.preferences!.fontSize).toBe('large')
        expect(capturedCtx!.preferences!.sidebarCollapsed).toBe(true)
      })
    })

    it('skips batch update with empty updates array', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      const originalPrefs = { ...capturedCtx!.preferences }

      await act(async () => {
        await capturedCtx!.batchUpdatePreferences([])
      })

      // Preferences should remain unchanged
      expect(capturedCtx!.preferences!.fontSize).toBe(originalPrefs.fontSize)
    })

    it('reverts all fields on batch failure', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      // Override PATCH to fail
      server.use(
        http.patch('/api/preferences', () => {
          return HttpResponse.json({ error: 'Bad Request' }, { status: 400 })
        }),
      )

      await act(async () => {
        try {
          await capturedCtx!.batchUpdatePreferences([
            { field: 'fontSize' as const, value: 'large' },
            { field: 'sidebarCollapsed' as const, value: true },
          ])
        } catch {
          // expected
        }
      })

      await waitFor(() => {
        expect(capturedCtx!.preferences!.fontSize).toBe('medium')
        expect(capturedCtx!.preferences!.sidebarCollapsed).toBe(false)
      })
    })
  })

  describe('resetPreferences', () => {
    it('sends DELETE request and updates state with defaults', async () => {
      const customPrefs = { ...mockPreferences, fontSize: 'large' as const }
      setupPreferenceHandlers(customPrefs)

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      await act(async () => {
        await capturedCtx!.resetPreferences()
      })

      await waitFor(() => {
        // After reset, should get default values
        expect(capturedCtx!.preferences!.fontSize).toBe('medium')
        expect(capturedCtx!.error).toBeNull()
      })
    })
  })

  describe('exportPreferences', () => {
    it('fetches export endpoint and triggers download', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      // Mock URL and createElement only after render
      const mockUrl = 'blob:http://localhost/test'
      const createObjectURLSpy = vi.fn().mockReturnValue(mockUrl)
      const revokeObjectURLSpy = vi.fn()
      window.URL.createObjectURL = createObjectURLSpy
      window.URL.revokeObjectURL = revokeObjectURLSpy

      const mockClick = vi.fn()
      const origCreateElement = document.createElement.bind(document)
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const anchor = origCreateElement('a')
          anchor.click = mockClick
          return anchor
        }
        return origCreateElement(tag)
      })

      await act(async () => {
        await capturedCtx!.exportPreferences('json')
      })

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockUrl)

      createElementSpy.mockRestore()
    })
  })

  describe('importPreferences', () => {
    it('sends POST to import endpoint and updates state', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      await act(async () => {
        await capturedCtx!.importPreferences({ fontSize: 'small' }, true)
      })

      await waitFor(() => {
        expect(capturedCtx!.preferences!.fontSize).toBe('small')
        expect(capturedCtx!.error).toBeNull()
      })
    })

    it('sets error when import fails', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      // Override import to fail
      server.use(
        http.post('/api/preferences/import', () => {
          return HttpResponse.json({ error: 'Bad Data' }, { status: 400 })
        }),
      )

      await act(async () => {
        try {
          await capturedCtx!.importPreferences({ fontSize: 'small' })
        } catch {
          // expected
        }
      })

      await waitFor(() => {
        expect(capturedCtx!.error).toContain('Failed to import preferences')
      })
    })
  })

  describe('getPreference', () => {
    it('returns default value when preferences are not loaded', () => {
      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(undefined, (ctx) => { capturedCtx = ctx })

      const value = capturedCtx!.getPreference('fontSize', 'large')
      expect(value).toBe('large')
    })

    it('returns preference value when loaded', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      const value = capturedCtx!.getPreference('fontSize')
      expect(value).toBe('medium')
    })

    it('falls back to DEFAULT_USER_PREFERENCES when no explicit default provided', () => {
      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(undefined, (ctx) => { capturedCtx = ctx })

      const value = capturedCtx!.getPreference('defaultTaskView')
      expect(value).toBe(DEFAULT_USER_PREFERENCES.defaultTaskView)
    })
  })

  describe('isPreferenceDefault', () => {
    it('returns true when preference equals default', async () => {
      setupPreferenceHandlers()

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      expect(capturedCtx!.isPreferenceDefault('fontSize')).toBe(true)
    })

    it('returns true when preferences are not loaded', () => {
      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(undefined, (ctx) => { capturedCtx = ctx })

      expect(capturedCtx!.isPreferenceDefault('fontSize')).toBe(true)
    })

    it('returns false when preference differs from default', async () => {
      const customPrefs = { ...mockPreferences, fontSize: 'large' }
      setupPreferenceHandlers(customPrefs)

      let capturedCtx: ReturnType<typeof useUserPreferences> | null = null
      renderWithProvider(1, (ctx) => { capturedCtx = ctx })

      await waitFor(() => {
        expect(capturedCtx!.preferences).not.toBeNull()
      })

      expect(capturedCtx!.isPreferenceDefault('fontSize')).toBe(false)
    })
  })
})
