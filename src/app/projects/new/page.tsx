'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface ApiError {
  error: string
  details?: {
    issues: Array<{
      field: string
      message: string
    }>
  }
}

interface FormData {
  name: string
  description: string
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  techStack: string[]
  repoUrl: string
}

interface FormErrors {
  name?: string
  description?: string
  status?: string
  techStack?: string
  repoUrl?: string
  general?: string
}

const initialFormData: FormData = {
  name: '',
  description: '',
  status: 'planning',
  techStack: [],
  repoUrl: ''
}

const commonTechStack = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Express',
  'Python', 'Django', 'Flask', 'Java', 'Spring', 'Go', 'Rust',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
  'AWS', 'Azure', 'GCP', 'Tailwind CSS', 'Material-UI', 'Bootstrap'
]

export default function NewProjectPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTech, setNewTech] = useState('')

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.length > 200) {
      newErrors.name = 'Project name must be less than 200 characters'
    }

    if (formData.repoUrl && formData.repoUrl.trim()) {
      try {
        new URL(formData.repoUrl)
      } catch {
        newErrors.repoUrl = 'Please enter a valid URL'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const submitData = {
        ...formData,
        repoUrl: formData.repoUrl.trim() || undefined,
        techStack: formData.techStack.length > 0 ? formData.techStack : undefined
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData: ApiError = await response.json()
        
        if (errorData.details?.issues) {
          const fieldErrors: FormErrors = {}
          errorData.details.issues.forEach(issue => {
            fieldErrors[issue.field as keyof FormErrors] = issue.message
          })
          setErrors(fieldErrors)
        } else {
          setErrors({ general: errorData.error || 'Failed to create project' })
        }
        return
      }

      const result = await response.json()
      
      // Redirect to the project detail page
      router.push(`/projects/${result.data.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const addTechStack = (tech: string) => {
    if (tech && !formData.techStack.includes(tech)) {
      handleInputChange('techStack', [...formData.techStack, tech])
    }
  }

  const removeTechStack = (techToRemove: string) => {
    handleInputChange('techStack', formData.techStack.filter(tech => tech !== techToRemove))
  }

  const handleAddNewTech = () => {
    if (newTech.trim() && !formData.techStack.includes(newTech.trim())) {
      addTechStack(newTech.trim())
      setNewTech('')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/projects" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Create New Project
          </h1>
          <p className="text-slate-400">
            Set up a new development project with your team and tech stack.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Project Details</CardTitle>
              <CardDescription>
                Provide the basic information for your new project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* General Error */}
                {errors.general && (
                  <div className="p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">{errors.general}</p>
                  </div>
                )}

                {/* Project Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-200">
                    Project Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter project name"
                    className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder-slate-400"
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <p className="text-red-400 text-sm">{errors.name}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-200">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe what this project is about..."
                    rows={4}
                    className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder-slate-400 resize-none"
                    disabled={isSubmitting}
                  />
                  {errors.description && (
                    <p className="text-red-400 text-sm">{errors.description}</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-slate-900/50 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-red-400 text-sm">{errors.status}</p>
                  )}
                </div>

                {/* Repository URL */}
                <div className="space-y-2">
                  <Label htmlFor="repoUrl" className="text-slate-200">
                    Repository URL
                  </Label>
                  <Input
                    id="repoUrl"
                    value={formData.repoUrl}
                    onChange={(e) => handleInputChange('repoUrl', e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder-slate-400"
                    disabled={isSubmitting}
                  />
                  {errors.repoUrl && (
                    <p className="text-red-400 text-sm">{errors.repoUrl}</p>
                  )}
                </div>

                {/* Tech Stack */}
                <div className="space-y-3">
                  <Label className="text-slate-200">Tech Stack</Label>
                  
                  {/* Current tech stack */}
                  {formData.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.techStack.map((tech) => (
                        <Badge 
                          key={tech}
                          variant="secondary" 
                          className="bg-blue-500/20 text-blue-300 pl-3 pr-1"
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => removeTechStack(tech)}
                            className="ml-1 hover:bg-blue-500/30 rounded-full p-0.5"
                            disabled={isSubmitting}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Add custom tech */}
                  <div className="flex gap-2">
                    <Input
                      value={newTech}
                      onChange={(e) => setNewTech(e.target.value)}
                      placeholder="Add custom technology"
                      className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder-slate-400"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddNewTech()
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddNewTech}
                      disabled={!newTech.trim() || isSubmitting}
                      className="border-slate-700 hover:bg-slate-800"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Common tech stack suggestions */}
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Popular technologies:</p>
                    <div className="flex flex-wrap gap-2">
                      {commonTechStack
                        .filter(tech => !formData.techStack.includes(tech))
                        .slice(0, 12)
                        .map((tech) => (
                          <Button
                            key={tech}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addTechStack(tech)}
                            className="border-slate-700 hover:bg-slate-800 text-slate-300"
                            disabled={isSubmitting}
                          >
                            {tech}
                          </Button>
                        ))}
                    </div>
                  </div>

                  {errors.techStack && (
                    <p className="text-red-400 text-sm">{errors.techStack}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-6 border-t border-slate-700/50">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-initial"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Project'
                    )}
                  </Button>
                  <Link href="/projects">
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={isSubmitting}
                      className="border-slate-700 hover:bg-slate-800"
                    >
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}