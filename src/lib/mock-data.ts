import {
  Users,
  Clock,
  AlertTriangle,
  ClipboardList,
  CheckCircle,
} from 'lucide-react'
import { ScheduleItem, BriefingItem, WorkStatusItem } from '@/types/dashboard'

export const mockWorkStatus: WorkStatusItem[] = [
  { label: '진행중 상담', value: 12, color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Users },
  { label: '대기중 상담', value: 5, color: 'text-amber-600', bgColor: 'bg-amber-50', icon: Clock },
  { label: '이번 달 위험성평가', value: 3, color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertTriangle },
  { label: '이번 달 근골조사', value: 2, color: 'text-purple-600', bgColor: 'bg-purple-50', icon: ClipboardList },
  { label: '완료 상담 (이번 달)', value: 8, color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
]

export const mockScheduleItems: ScheduleItem[] = [
  { id: '1', title: 'OO기업 현장방문', time: '09:00 - 10:30', type: 'visit', location: '서울시 강남구' },
  { id: '2', title: '상담 케이스 회의', time: '11:00 - 12:00', type: 'meeting' },
  { id: '3', title: '김OO 전화 상담', time: '14:00 - 14:30', type: 'call' },
  { id: '4', title: '위험성평가 보고서 제출 마감', time: '17:00', type: 'deadline' },
]

export const mockBriefingItems: BriefingItem[] = [
  { id: '1', title: '산업안전보건법 시행규칙 일부 개정안 공포', source: '고용노동부', publishedAt: '2026년 2월 3일' },
  { id: '2', title: '2026년 산재예방 중점추진 과제 발표', source: '안전보건공단', publishedAt: '2026년 2월 2일' },
  { id: '3', title: '중대재해 감소 위한 특별점검 실시 안내', source: '고용노동부', publishedAt: '2026년 2월 1일' },
  { id: '4', title: '소규모 사업장 안전보건 지원사업 신청 안내', source: '안전보건공단', publishedAt: '2026년 1월 30일' },
]
