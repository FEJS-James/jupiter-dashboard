'use client'

import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useKeyboardShortcutsContext } from '@/contexts/keyboard-shortcuts-context'
import { Search, Keyboard, Globe, MousePointer, Settings, Zap } from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  Navigation: <Globe className="w-4 h-4" />,
  'Kanban Board': <MousePointer className="w-4 h-4" />,
  'Task Management': <Settings className="w-4 h-4" />,
  'View Switching': <Zap className="w-4 h-4" />,
  Advanced: <Keyboard className="w-4 h-4" />,
  Help: <Search className="w-4 h-4" />,
  General: <Settings className="w-4 h-4" />
}

interface ShortcutKeyProps {
  shortcut: string
}

function ShortcutKey({ shortcut }: ShortcutKeyProps) {
  const keys = shortcut.split(' + ')
  
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-2 text-xs font-mono font-medium text-muted-foreground">
            {key === 'ctrl' && (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')}
            {key === 'shift' && '⇧'}
            {key === 'alt' && (navigator.platform.includes('Mac') ? '⌥' : 'Alt')}
            {key === 'meta' && '⌘'}
            {key === 'escape' && 'Esc'}
            {key === 'enter' && '↵'}
            {key === 'tab' && '⇥'}
            {key === '?' && '?'}
            {key === '/' && '/'}
            {!['ctrl', 'shift', 'alt', 'meta', 'escape', 'enter', 'tab', '?', '/'].includes(key) && key.toUpperCase()}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-xs mx-1">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export function KeyboardShortcutsHelp() {
  const { shortcuts, showHelp, setShowHelp, currentContext } = useKeyboardShortcutsContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Group shortcuts by category
  const shortcutsByCategory = useMemo(() => {
    const filtered = shortcuts.filter(shortcut => {
      const matchesSearch = searchQuery === '' || 
        shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortcut.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortcut.category.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesContext = !shortcut.context || 
        shortcut.context.includes(currentContext) ||
        shortcut.context.length === 0

      return matchesSearch && matchesContext
    })

    const grouped = filtered.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    }, {} as Record<string, typeof shortcuts>)

    // Sort categories by priority
    const categoryOrder = ['Navigation', 'Kanban Board', 'Task Management', 'View Switching', 'Advanced', 'Help', 'General']
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a)
      const bIndex = categoryOrder.indexOf(b)
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })

    return sortedCategories.reduce((acc, category) => {
      acc[category] = grouped[category]
      return acc
    }, {} as Record<string, typeof shortcuts>)
  }, [shortcuts, searchQuery, currentContext])

  const categories = Object.keys(shortcutsByCategory)
  const totalShortcuts = Object.values(shortcutsByCategory).flat().length

  const filteredShortcuts = useMemo(() => {
    if (selectedCategory === 'all') {
      return shortcutsByCategory
    }
    return { [selectedCategory]: shortcutsByCategory[selectedCategory] || [] }
  }, [shortcutsByCategory, selectedCategory])

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate faster with keyboard shortcuts. Currently showing shortcuts for{' '}
            <Badge variant="secondary" className="mx-1">
              {currentContext || 'dashboard'}
            </Badge>
            context.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="all" className="text-xs">
                All ({totalShortcuts})
              </TabsTrigger>
              {categories.slice(0, 6).map((category) => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  {category} ({shortcutsByCategory[category]?.length || 0})
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 min-h-0 mt-4">
              <TabsContent value="all" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-6 pr-4">
                    {Object.entries(filteredShortcuts).map(([category, categoryShortcuts]) => (
                      <div key={category} className="space-y-3">
                        <h3 className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                          {categoryIcons[category]}
                          {category}
                        </h3>
                        <div className="grid gap-2">
                          {categoryShortcuts.map((shortcut, index) => (
                            <div
                              key={`${shortcut.key}-${index}`}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <span className="text-sm font-medium">
                                {shortcut.description}
                              </span>
                              <ShortcutKey shortcut={shortcut.key} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {categories.map((category) => (
                <TabsContent key={category} value={category} className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-4">
                      <h3 className="flex items-center gap-2 text-lg font-semibold border-b pb-2 mb-4">
                        {categoryIcons[category]}
                        {category}
                      </h3>
                      {(filteredShortcuts[category] || []).map((shortcut, index) => (
                        <div
                          key={`${shortcut.key}-${index}`}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <span className="text-sm font-medium">
                            {shortcut.description}
                          </span>
                          <ShortcutKey shortcut={shortcut.key} />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>

        <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
          <span>Press <kbd className="px-1.5 py-0.5 text-xs rounded border">Esc</kbd> to close</span>
          <span>{totalShortcuts} shortcuts available</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}