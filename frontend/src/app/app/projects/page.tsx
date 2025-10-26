/*
The Projects page shows all projects on the platform with AI search functionality at the top.

Each Project will have:
  - Title
  - Tagline
  - Description
  - Thumbnail
  - GitHub/Devpost links
  - Start date
  - Author information
*/
"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Project as ProjectComponent } from "@/components/project"
import type { Project } from "@/components/project"
import { getAllProjects } from "@/lib/supabase/posts"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        const fetchedProjects = await getAllProjects(50, 0)
        setProjects(fetchedProjects)
      } catch (err) {
        console.error("Error fetching projects:", err)
        setError("Failed to load projects. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Projects</h1>
        
        {/* AI Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects with AI..."
            className="pl-10 bg-muted/50 border-border"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Projects will appear here once users start sharing their work.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {projects.map((project) => (
              <ProjectComponent key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
