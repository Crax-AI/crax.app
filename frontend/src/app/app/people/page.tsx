/*
The People page shows all users on the platform with AI search functionality at the top.
*/

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function PeoplePage() {
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
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            People will appear here once users start joining the platform.
          </p>
        </div>
      </div>
    </div>
  )
}
