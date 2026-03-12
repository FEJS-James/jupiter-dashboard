'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { HelpCircle, Keyboard, CheckSquare, Move, AlertTriangle, Trash2 } from 'lucide-react'

interface BulkShortcutsHelpProps {
  children?: React.ReactNode
}

export function BulkShortcutsHelp({ children }: BulkShortcutsHelpProps) {
  const shortcutSections = [
    {
      title: 'Selection',
      icon: <CheckSquare className="w-4 h-4" />,
      color: 'text-blue-400',
      shortcuts: [
        {
          keys: ['Ctrl/⌘', 'A'],
          description: 'Select all tasks (toggle)',
          detail: 'Select all visible tasks, or deselect if all are already selected'
        },
        {
          keys: ['Ctrl/⌘', 'S'],
          description: 'Toggle selection mode',
          detail: 'Enable/disable selection mode for easier multi-selection'
        },
        {
          keys: ['Escape'],
          description: 'Clear selection',
          detail: 'Clear all selections and exit selection mode'
        },
      ],
    },
    {
      title: 'Status Movement',
      icon: <Move className="w-4 h-4" />,
      color: 'text-green-400',
      shortcuts: [
        {
          keys: ['Alt', '1'],
          description: 'Move to Backlog',
          detail: 'Move all selected tasks to Backlog column'
        },
        {
          keys: ['Alt', '2'],
          description: 'Move to In Progress',
          detail: 'Move all selected tasks to In Progress column'
        },
        {
          keys: ['Alt', '3'],
          description: 'Move to Code Review',
          detail: 'Move all selected tasks to Code Review column'
        },
        {
          keys: ['Alt', '4'],
          description: 'Move to Testing',
          detail: 'Move all selected tasks to Testing column'
        },
        {
          keys: ['Alt', '5'],
          description: 'Move to Deploying',
          detail: 'Move all selected tasks to Deploying column'
        },
        {
          keys: ['Alt', '6'],
          description: 'Move to Done',
          detail: 'Move all selected tasks to Done column'
        },
      ],
    },
    {
      title: 'Priority Management',
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'text-orange-400',
      shortcuts: [
        {
          keys: ['Ctrl/⌘', 'M'],
          description: 'Set Medium priority',
          detail: 'Set all selected tasks to Medium priority'
        },
        {
          keys: ['Ctrl/⌘', 'P'],
          description: 'Set High priority',
          detail: 'Set all selected tasks to High priority'
        },
        {
          keys: ['Ctrl/⌘', 'Shift', 'P'],
          description: 'Set Urgent priority',
          detail: 'Set all selected tasks to Urgent priority'
        },
        {
          keys: ['Ctrl/⌘', 'Alt', 'P'],
          description: 'Set Low priority',
          detail: 'Set all selected tasks to Low priority'
        },
      ],
    },
    {
      title: 'Actions',
      icon: <Trash2 className="w-4 h-4" />,
      color: 'text-red-400',
      shortcuts: [
        {
          keys: ['Ctrl/⌘', 'Delete'],
          description: 'Delete selected tasks',
          detail: 'Delete all selected tasks (with confirmation)'
        },
        {
          keys: ['Shift', 'Delete'],
          description: 'Delete selected tasks',
          detail: 'Alternative shortcut for deleting tasks'
        },
      ],
    },
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-slate-400 hover:text-slate-300"
          >
            <Keyboard className="w-4 h-4 mr-2" />
            Bulk Shortcuts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20">
              <Keyboard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-slate-100">
                Bulk Operations Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Speed up your workflow with these keyboard shortcuts for bulk task operations
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {shortcutSections.map((section) => (
            <div key={section.title}>
              <div className={`flex items-center gap-2 mb-4 ${section.color}`}>
                {section.icon}
                <h3 className="text-lg font-semibold">{section.title}</h3>
              </div>
              
              <div className="space-y-3">
                {section.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <div key={keyIndex} className="flex items-center">
                              <Badge
                                variant="outline"
                                className="bg-slate-700 text-slate-300 border-slate-600 font-mono px-2 py-1"
                              >
                                {key}
                              </Badge>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="mx-1 text-slate-500">+</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-100 font-medium mb-1">
                        {shortcut.description}
                      </p>
                      <p className="text-sm text-slate-400">
                        {shortcut.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {section.title !== 'Actions' && (
                <Separator className="mt-6 bg-slate-700" />
              )}
            </div>
          ))}

          {/* Usage Tips */}
          <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-4">
            <h4 className="flex items-center gap-2 text-blue-300 font-medium mb-3">
              <HelpCircle className="w-4 h-4" />
              Usage Tips
            </h4>
            <ul className="space-y-2 text-sm text-blue-200">
              <li>• First select tasks using checkboxes or Ctrl/⌘+A</li>
              <li>• Shortcuts only work when tasks are selected</li>
              <li>• All operations affect ALL selected tasks at once</li>
              <li>• Use Escape to quickly clear selection and exit selection mode</li>
              <li>• Hold Ctrl/⌘ or Alt to avoid conflicts with browser shortcuts</li>
              <li>• Destructive actions (like delete) will show confirmation dialogs</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}