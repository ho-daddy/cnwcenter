import Link from 'next/link'
import { ArrowLeft, FileText, Download, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RiskAssessmentReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/risk-assessment" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">보고서 생성</h1>
          <p className="text-sm text-gray-500 mt-0.5">위험성평가 결과를 PDF 또는 Excel로 내보냅니다</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
        <AlertCircle className="w-4 h-4 shrink-0" />
        보고서 생성 기능은 준비 중입니다.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: '위험성평가 요약 보고서', desc: '평가카드 목록, 위험요인 통계, 개선현황 요약', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: '위험요인 목록표', desc: '카테고리별 전체 위험요인 상세 목록', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
          { title: '개선계획서', desc: '개선 예정/완료 항목 현황표', icon: Download, color: 'text-green-600', bg: 'bg-green-100' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="opacity-60">
              <CardContent className="pt-6">
                <div className={`w-12 h-12 ${item.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                <button
                  disabled
                  className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-400 text-sm rounded-lg cursor-not-allowed"
                >
                  준비 중
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}