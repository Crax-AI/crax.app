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

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Project } from "@/components/project"
import { Tables } from "@/lib/supabase/database.types"

type ProjectWithProfile = Tables<"projects"> & {
  profiles: Tables<"profiles">
}

export default function ProjectsPage() {
  // TODO: Replace with actual data fetching
  const projects: ProjectWithProfile[] = []

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
      <div className="flex-1 p-6">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Projects will appear here once users start sharing their work.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <Project key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
