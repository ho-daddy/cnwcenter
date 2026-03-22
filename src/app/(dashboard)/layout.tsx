'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useSidebarStore } from '@/stores/sidebar-store'
import { cn } from '@/lib/utils'
import { TutorialProvider } from '@/components/tutorial/TutorialProvider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed)

  return (
    <TutorialProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div
          className={cn(
            'transition-all duration-300',
            isCollapsed ? 'lg:ml-16' : 'lg:ml-60'
          )}
        >
          <Header />
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </TutorialProvider>
  )
}
