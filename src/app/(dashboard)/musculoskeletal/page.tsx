import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  ClipboardList,
  Building2,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

async function getMusculoskeletalStats() {
  const currentYear = new Date().getFullYear()

  // 전체 조사 현황
  const totalAssessments = await prisma.musculoskeletalAssessment.count({
    where: { year: currentYear },
  })

  const statusCounts = await prisma.musculoskeletalAssessment.groupBy({
    by: ['status'],
    where: { year: currentYear },
    _count: { status: true },
  })

  const statusMap: Record<string, number> = {}
  statusCounts.forEach((item) => {
    statusMap[item.status] = item._count.status
  })

  // 최근 조사 목록
  const recentAssessments = await prisma.musculoskeletalAssessment.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: {
      workplace: { select: { name: true } },
      organizationUnit: { select: { name: true } },
    },
  })

  // 관련 일정 (근골조사 타입)
  const upcomingSchedules = await prisma.schedule.findMany({
    where: {
      scheduleType: 'MUSCULOSKELETAL',
      startDate: { gte: new Date() },
    },
    take: 5,
    orderBy: { startDate: 'asc' },
    include: {
      user: { select: { name: true } },
    },
  })

  // 사업장별 통계
  const workplaceStats = await prisma.musculoskeletalAssessment.groupBy({
    by: ['workplaceId'],
    where: { year: currentYear },
    _count: { id: true },
  })

  return {
    total: totalAssessments,
    draft: statusMap['DRAFT'] || 0,
    inProgress: statusMap['IN_PROGRESS'] || 0,
    completed: statusMap['COMPLETED'] || 0,
    reviewed: statusMap['REVIEWED'] || 0,
    recentAssessments,
    upcomingSchedules,
    workplaceCount: workplaceStats.length,
  }
}

export default async function MusculoskeletalDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const stats = await getMusculoskeletalStats()
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">근골격계유해요인조사</h1>
          <p className="text-sm text-gray-500 mt-1">{currentYear}년 조사 현황</p>
        </div>
        <Link
          href="/musculoskeletal/survey"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          새 조사 시작
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">전체 조사</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">진행중</p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats.draft + stats.inProgress}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              작성중 {stats.draft} / 조사중 {stats.inProgress}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">완료</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.completed + stats.reviewed}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              조사완료 {stats.completed} / 검토완료 {stats.reviewed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">사업장</p>
                <p className="text-3xl font-bold text-purple-600">{stats.workplaceCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 조사 & 일정 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 조사 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              최근 조사
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentAssessments.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                아직 진행된 조사가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentAssessments.map((assessment) => (
                  <Link
                    key={assessment.id}
                    href={`/musculoskeletal/survey?assessmentId=${assessment.id}`}
                    className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {assessment.organizationUnit.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {assessment.workplace.name}
                        </p>
                      </div>
                      <StatusBadge status={assessment.status} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(assessment.updatedAt, 'MM/dd HH:mm', { locale: ko })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 관련 일정 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              다가오는 일정
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingSchedules.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                예정된 근골조사 일정이 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-3 rounded-lg border bg-purple-50 border-purple-200"
                  >
                    <p className="font-medium text-gray-900">{schedule.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {format(schedule.startDate, 'M월 d일 (EEE) HH:mm', { locale: ko })}
                    </div>
                    {schedule.user?.name && (
                      <p className="text-xs text-gray-500 mt-1">
                        담당: {schedule.user.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 빠른 링크 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">빠른 접근</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/musculoskeletal/survey"
              className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-center"
            >
              <ClipboardList className="w-8 h-8 mx-auto text-blue-600" />
              <p className="mt-2 font-medium text-gray-900">조사 실시</p>
              <p className="text-xs text-gray-500">새 조사 시작하기</p>
            </Link>
            <Link
              href="/musculoskeletal/view"
              className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-center"
            >
              <TrendingUp className="w-8 h-8 mx-auto text-green-600" />
              <p className="mt-2 font-medium text-gray-900">모아 보기</p>
              <p className="text-xs text-gray-500">전체 조사 조회</p>
            </Link>
            <Link
              href="/musculoskeletal/report"
              className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-center"
            >
              <FileText className="w-8 h-8 mx-auto text-purple-600" />
              <p className="mt-2 font-medium text-gray-900">보고서 생성</p>
              <p className="text-xs text-gray-500">PDF/Excel 내보내기</p>
            </Link>
            <Link
              href="/musculoskeletal/improvement"
              className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-center"
            >
              <AlertCircle className="w-8 h-8 mx-auto text-orange-600" />
              <p className="mt-2 font-medium text-gray-900">개선작업</p>
              <p className="text-xs text-gray-500">개선과제 관리</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    DRAFT: { label: '작성중', className: 'bg-gray-100 text-gray-600' },
    IN_PROGRESS: { label: '조사중', className: 'bg-orange-100 text-orange-600' },
    COMPLETED: { label: '완료', className: 'bg-green-100 text-green-600' },
    REVIEWED: { label: '검토완료', className: 'bg-blue-100 text-blue-600' },
  }

  const { label, className } = config[status] || { label: status, className: 'bg-gray-100' }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>
      {label}
    </span>
  )
}
