import { Tables } from "@/lib/supabase/database.types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Github, Calendar } from "lucide-react"
import Image from "next/image"

type Project = Tables<"projects"> & {
  profiles: Tables<"profiles">
}

interface ProjectProps {
  project: Project
}

export const Project = ({ project }: ProjectProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          {project.thumbnail_url ? (
            <Image
              src={project.thumbnail_url}
              alt={project.title}
              width={80}
              height={80}
              className="rounded-lg object-cover"
            />
          ) : (
            <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-2xl">📁</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {project.title}
            </h3>
            <div className="flex gap-2 ml-4">
              {project.github_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 w-8 p-0"
                >
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {project.devpost_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 w-8 p-0"
                >
                  <a href={project.devpost_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {project.type}
            </Badge>
            {project.tagline && (
              <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                {project.tagline}
              </p>
            )}
          </div>

          <p className="text-sm text-foreground mb-3 line-clamp-3">
            {project.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Started {formatDate(project.started_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>by {project.profiles.first_name} {project.profiles.last_name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}