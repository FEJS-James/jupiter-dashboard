"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import { useState } from "react"

export default function ComponentsDemo() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">shadcn/ui Components Demo</h1>
          <p className="text-muted-foreground text-lg">Testing all installed components with dark theme customization</p>
        </header>

        {/* Core Components */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl">Core Components</CardTitle>
            <CardDescription>Button, Card, Badge, Avatar components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Buttons */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Button Variants</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="default">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="link">Link</Button>
              </div>
              
              <h4 className="text-md font-medium mt-6 mb-4">Agent Color Buttons</h4>
              <div className="flex flex-wrap gap-4">
                <Button className="bg-coder hover:bg-coder/90 text-coder-foreground">
                  Coder Action
                </Button>
                <Button className="bg-reviewer hover:bg-reviewer/90 text-reviewer-foreground">
                  Reviewer Action
                </Button>
                <Button className="bg-devops hover:bg-devops/90 text-devops-foreground">
                  DevOps Action
                </Button>
              </div>
            </div>

            {/* Badges */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Badge Variants</h3>
              <div className="flex flex-wrap gap-4">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Error</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
              
              <h4 className="text-md font-medium mt-6 mb-4">Status & Priority Badges</h4>
              <div className="flex flex-wrap gap-4">
                <Badge className="bg-coder text-coder-foreground">Active</Badge>
                <Badge className="bg-reviewer text-reviewer-foreground">In Review</Badge>
                <Badge className="bg-devops text-devops-foreground">Deployed</Badge>
                <Badge className="bg-green-600 text-white">High Priority</Badge>
                <Badge className="bg-yellow-600 text-white">Medium Priority</Badge>
                <Badge className="bg-gray-600 text-white">Low Priority</Badge>
              </div>
            </div>

            {/* Avatars */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Avatar Components</h3>
              <div className="flex items-center gap-4">
                <Avatar className="border-2 border-coder">
                  <AvatarFallback className="bg-coder text-coder-foreground">C</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-reviewer">
                  <AvatarFallback className="bg-reviewer text-reviewer-foreground">R</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-devops">
                  <AvatarFallback className="bg-devops text-devops-foreground">D</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Components */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl">Form Components</CardTitle>
            <CardDescription>Input, Textarea, Select, Dropdown components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Input Variants</h3>
                <Input type="text" placeholder="Text input" />
                <Input type="email" placeholder="Email input" />
                <Input type="password" placeholder="Password input" />
                <Input disabled placeholder="Disabled input" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Textarea</h3>
                <Textarea 
                  placeholder="Enter description..." 
                  className="min-h-[100px]"
                />
              </div>
            </div>

            {/* Select */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Component</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coder">Coder Agent</SelectItem>
                    <SelectItem value="reviewer">Reviewer Agent</SelectItem>
                    <SelectItem value="devops">DevOps Agent</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dropdown Menu */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dropdown Menu</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Actions Menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Agent Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Assign Task</DropdownMenuItem>
                  <DropdownMenuItem>Review Code</DropdownMenuItem>
                  <DropdownMenuItem>Deploy Application</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Components */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl">Feedback Components</CardTitle>
            <CardDescription>Dialog, Toast, Skeleton components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Dialog */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Dialog Component</h3>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Action</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to proceed with this action? This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      className="bg-coder hover:bg-coder/90 text-coder-foreground"
                      onClick={() => setDialogOpen(false)}
                    >
                      Confirm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Toast */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Toast Notifications</h3>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => toast.success("Success! Operation completed successfully.")}
                  className="bg-coder hover:bg-coder/90 text-coder-foreground"
                >
                  Success Toast
                </Button>
                <Button 
                  onClick={() => toast.error("Error! Something went wrong.")}
                  variant="destructive"
                >
                  Error Toast
                </Button>
                <Button 
                  onClick={() => toast.info("Info: Task has been updated.")}
                  className="bg-devops hover:bg-devops/90 text-devops-foreground"
                >
                  Info Toast
                </Button>
                <Button 
                  onClick={() => toast.warning("Warning: Please review the changes.")}
                  className="bg-reviewer hover:bg-reviewer/90 text-reviewer-foreground"
                >
                  Warning Toast
                </Button>
              </div>
            </div>

            {/* Skeleton */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Skeleton Loading States</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-4 w-[60%]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Component Usage Examples */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl">Real-world Usage Example</CardTitle>
            <CardDescription>Task management card with multiple components</CardDescription>
          </CardHeader>
          <CardContent>
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="border-2 border-coder">
                      <AvatarFallback className="bg-coder text-coder-foreground">C</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">Implement User Authentication</CardTitle>
                      <CardDescription>TASK-001</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-reviewer text-reviewer-foreground">In Review</Badge>
                    <Badge variant="outline">High Priority</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">⋮</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Task</DropdownMenuItem>
                        <DropdownMenuItem>Move to Testing</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Set up JWT-based authentication with login, logout, and protected routes. 
                  Include proper error handling and user feedback.
                </p>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>Created: 2h ago</span>
                  <span>•</span>
                  <span>Due: Tomorrow</span>
                  <span>•</span>
                  <span>Assigned: Coder Agent</span>
                </div>
              </CardContent>
              <CardFooter className="pt-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex space-x-2">
                    <Button size="sm" className="bg-coder hover:bg-coder/90 text-coder-foreground">
                      View Code
                    </Button>
                    <Button size="sm" variant="outline">
                      Add Comment
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Progress:</span>
                    <div className="w-24 h-2 bg-muted rounded-full">
                      <div className="w-3/4 h-full bg-reviewer rounded-full"></div>
                    </div>
                    <span className="text-sm text-muted-foreground">75%</span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </CardContent>
        </Card>
      </div>

      <Toaster 
        theme="dark"
        position="bottom-right" 
        richColors 
      />
    </div>
  )
}