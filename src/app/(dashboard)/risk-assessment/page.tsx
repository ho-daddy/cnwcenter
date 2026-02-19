import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  AlertTriangle, FileText, CheckCircle, Clock,
  TrendingUp, Building2, Calendar, ClipboardList,
  BarChart3, Wrench, Database, ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HAZARD_CATEGORY_LABELS, HAZARD_CATEGORY_COLORS } from '@/lib/risk-assessment'

export const dynamic = 'force-dynamic'

export default async function RiskAssessmentDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user
  const currentYear = new Date().getFullYear()
  const accessibleIds = await getAccessibleWorkplaceIds(user.id, user.role)
  const workplaceFilter = accessibleIds !== null ? { workplaceId: { in: accessibleIds } } : {}
  const [totalCards, recentCards, hazardStats, workplaceCount, plannedCount, completedCount, highRiskCount] = await Promise.all([
    prisma.riskAssessmentCard.count({ where: { ...workplaceFilter, year: currentYear } }),
    prisma.riskAssessmentCard.findMany({
      where: { ...workplaceFilter, year: currentYear },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        workplace: { select: { name: true } },
        organizationUnit: { select: { name: true } },
        _count: { select: { hazards: true } },
      },
    }),
    prisma.riskHazard.groupBy({
      by: ['hazardCategory'],
      where: { ...workplaceFilter, year: currentYear },
      _count: { id: true },
    }),
    prisma.riskAssessmentCard.groupBy({
      by: ['workplaceId'],
      where: { ...workplaceFilter, year: currentYear },
      _count: { id: true },
    }).then((r) => r.length),
    prisma.riskImprovementRecord.count({
      where: { status: 'PLANNED', hazard: { ...workplaceFilter, year: currentYear } },
    }),
    prisma.riskImprovementRecord.count({
      where: { status: 'COMPLETED', hazard: { ...workplaceFilter, year: currentYear } },
    }),
    prisma.riskHazard.count({
      where: { ...workplaceFilter, year: currentYear, riskScore: { gte: 9 } },
    }),
  ])

  const totalHazards = hazardStats.reduce((s, h) => s + h._count.id, 0)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">위험성평가</h1>
          <p className="text-sm text-gray-500 mt-1">{currentYear}년 현황</p>
        </div>
        <Link
          href="/risk-assessment/conduct"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          평가 실시
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">평가카드</p>
                <p className="text-3xl font-bold text-gray-900">{totalCards}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">{currentYear}년 작성</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">위험요인</p>
                <p className="text-3xl font-bold text-gray-900">{totalHazards}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            {highRiskCount > 0 && (
              <div className="mt-2 text-xs text-red-600 font-medium">높음 이상 {highRiskCount}건</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">개선 예정</p>
                <p className="text-3xl font-bold text-amber-600">{plannedCount}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">완료 {completedCount}건</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">사업장</p>
                <p className="text-3xl font-bold text-purple-600">{workplaceCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              최근 평가카드
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCards.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">아직 작성된 평가카드가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {recentCards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/risk-assessment/${card.id}`}
                    className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{card.organizationUnit.name}</p>
                        <p className="text-xs text-gray-500">{card.workplace.name} · {card._count.hazards}개 위험요인</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(card.updatedAt, 'MM/dd', { locale: ko })}
                      </span>
                    </div>
                  </Link>
                ))}
                <Link
                  href="/risk-assessment/view"
                  className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:underline pt-1"
                >
                  전체 보기 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              카테고리별 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hazardStats.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">등록된 위험요인이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {hazardStats
                  .sort((a, b) => b._count.id - a._count.id)
                  .map((stat) => {
                    const pct = totalHazards > 0 ? Math.round((stat._count.id / totalHazards) * 100) : 0
                    return (
                      <div key={stat.hazardCategory} className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-20 text-center shrink-0 ${HAZARD_CATEGORY_COLORS[stat.hazardCategory]}`}>
                          {HAZARD_CATEGORY_LABELS[stat.hazardCategory]}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-8 text-right">
                          {stat._count.id}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">빠른 접근</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link href="/risk-assessment/conduct" className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-center">
              <ClipboardList className="w-8 h-8 mx-auto text-blue-600" />
              <p className="mt-2 font-medium text-gray-900 text-sm">평가 실시</p>
              <p className="text-xs text-gray-500">사업장별 평가 진행</p>
            </Link>
            <Link href="/risk-assessment/view" className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-center">
              <BarChart3 className="w-8 h-8 mx-auto text-green-600" />
              <p className="mt-2 font-medium text-gray-900 text-sm">모아 보기</p>
              <p className="text-xs text-gray-500">전체 현황 분석</p>
            </Link>
            <Link href="/risk-assessment/report" className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-center">
              <FileText className="w-8 h-8 mx-auto text-purple-600" />
              <p className="mt-2 font-medium text-gray-900 text-sm">보고서 생성</p>
              <p className="text-xs text-gray-500">PDF/Excel 내보내기</p>
            </Link>
            <Link href="/risk-assessment/improvement" className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-center">
              <Wrench className="w-8 h-8 mx-auto text-orange-600" />
              <p className="mt-2 font-medium text-gray-900 text-sm">개선작업</p>
              <p className="text-xs text-gray-500">개선과제 관리</p>
            </Link>
            <Link href="/risk-assessment/registration" className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-center">
              <Database className="w-8 h-8 mx-auto text-teal-600" />
              <p className="mt-2 font-medium text-gray-900 text-sm">사전등록</p>
              <p className="text-xs text-gray-500">소음·화학물질 등록</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}