import { LucideIcon } from 'lucide-react'

export interface NavSubItem {
  title: string
  href: string
}

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  subItems?: NavSubItem[]
}

export interface WorkStatusItem {
  label: string
  value: number
  color: string
  bgColor: string
  icon: LucideIcon
}

export interface ScheduleItem {
  id: string
  title: string
  time: string
  type: 'visit' | 'meeting' | 'call' | 'deadline'
  location?: string
}

export interface BriefingItem {
  id: string
  title: string
  source: string
  publishedAt: string
  url?: string
}
