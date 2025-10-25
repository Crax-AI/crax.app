/*
The People page shows all users on the platform with AI search functionality at the top.

Each Person will have:
  - Full name
  - Tagline
  - Profile image
  - The first few lines of about
  - etc

You can click on each person to go to their user page.
*/

"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Person } from "@/components/person"
import { getAllProfiles } from "@/lib/supabase/posts"
import { Profile } from "@/lib/types"

export default function PeoplePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfiles() {
      try {
        setLoading(true)
        const fetchedProfiles = await getAllProfiles(50, 0)
        setProfiles(fetchedProfiles)
      } catch (err) {
        console.error("Error fetching profiles:", err)
        setError("Failed to load people. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchProfiles()
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">People</h1>
        
        {/* AI Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people with AI..."
            className="pl-10 bg-muted/50 border-border"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading people...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No people found. Be the first to join the platform!
            </p>
          </div>
        ) : (
          <div>
            {profiles.map((profile) => (
              <Person key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
