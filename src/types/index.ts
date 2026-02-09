// 공통 타입 정의

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER'

export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'CLOSED'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface Schedule {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  userId: string
}

export interface CounselingCase {
  id: string
  caseNumber: string
  victimName: string
  victimContact: string
  accidentDate?: Date
  accidentType?: string
  status: CaseStatus
  assignedTo: string
  createdAt: Date
  updatedAt: Date
}

export interface Consultation {
  id: string
  caseId: string
  consultDate: Date
  consultType: string
  content: string
  nextAction?: string
}

export interface NewsBriefing {
  id: string
  title: string
  content: string
  source: string
  url?: string
  publishedAt: Date
}
