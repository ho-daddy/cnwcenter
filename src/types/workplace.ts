import { ContactType } from '@prisma/client'

// 사업장 폼 데이터
export interface WorkplaceFormData {
  name: string
  industry?: string
  products?: string
  address?: string
  employeeCount?: number
}

// 담당자 폼 데이터
export interface ContactFormData {
  contactType: ContactType
  name: string
  position?: string
  phone?: string
  email?: string
  isPrimary?: boolean
}

// 조직 단위 (트리 구조용)
export interface OrganizationUnitWithChildren {
  id: string
  name: string
  level: number
  sortOrder: number
  isLeaf: boolean
  parentId: string | null
  children: OrganizationUnitWithChildren[]
}

// 조직 단위 폼 데이터
export interface OrganizationUnitFormData {
  name: string
  level: number
  parentId?: string | null
  isLeaf?: boolean
}

// 조직도 복사 요청
export interface OrganizationCopyRequest {
  targetYear: number
  newName?: string
}

// API 응답 타입
export interface WorkplaceWithRelations {
  id: string
  name: string
  industry: string | null
  products: string | null
  address: string | null
  employeeCount: number | null
  createdAt: Date
  updatedAt: Date
  contacts: WorkplaceContactData[]
  organizations: OrganizationData[]
  _count?: {
    users: number
  }
}

export interface WorkplaceContactData {
  id: string
  workplaceId: string
  contactType: ContactType
  name: string
  position: string | null
  phone: string | null
  email: string | null
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationData {
  id: string
  workplaceId: string
  year: number
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    units: number
  }
}

// 레벨별 라벨 (UI용)
export const LEVEL_LABELS: Record<number, string> = {
  1: '1단계 (본부/사업장)',
  2: '2단계 (부서/팀)',
  3: '3단계 (공정)',
  4: '4단계 (세부공정)',
  5: '5단계 (작업)',
}

// 담당자 유형 라벨 (UI용)
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  SAFETY_OFFICER: '안전보건업무 담당자',
  UNION_REPRESENTATIVE: '노동조합 안전보건담당자',
}
