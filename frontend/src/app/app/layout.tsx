/*
This is the layout for the app. It is Twitter/X-style design and layout.

On the left hand side of the app, there should be navigation for different pages/tabs.
  - Feed: the feed of posts
  - People: all users on the platform, AI search on top
  - Profile: my own profile

The center is space for the main content of the page, e.g. feed, profile.

On the right hand side, leave empty for now.
*/

import { AppSidebar } from "@/components/app-sidebar"
import { ActivitiesTimeline } from "@/components/activities-timeline"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <AppSidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
      
      {/* Right Sidebar - Hidden on small screens */}
      <div className="hidden lg:block w-80 border-l border-border bg-background">
        <div className="p-6">
          <ActivitiesTimeline />
        </div>
      </div>
    </div>
  );
}