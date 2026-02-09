'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, FileSpreadsheet, Loader2, Building2 } from 'lucide-react'

export default function ReportPage() {
  const [isGenerating, setIsGenerating] = useState(false)

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">보고서 생성</h1>
        <p className="text-sm text-gray-500 mt-1">
          근골격계유해요인조사 결과를 보고서로 내보냅니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF 보고서 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              PDF 보고서
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              조사 결과를 PDF 형식의 보고서로 생성합니다. 관리카드, 부위별 점수,
              RULA/REBA 결과, 종합평가가 포함됩니다.
            </p>
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">PDF 생성 기능 준비중입니다.</p>
            </div>
            <Button className="w-full" disabled>
              <Download className="w-4 h-4 mr-2" />
              PDF 다운로드
            </Button>
          </CardContent>
        </Card>

        {/* Excel 보고서 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-500" />
              Excel 보고서
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              조사 결과를 Excel 형식으로 내보냅니다. 원본 양식과 동일한 형태로 생성되어
              편집 및 추가 분석이 가능합니다.
            </p>
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">Excel 생성 기능 준비중입니다.</p>
            </div>
            <Button className="w-full" variant="outline" disabled>
              <Download className="w-4 h-4 mr-2" />
              Excel 다운로드
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 사업장별 보고서 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            사업장별 종합 보고서
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            사업장 단위로 모든 평가단위의 조사 결과를 종합한 보고서를 생성합니다.
          </p>
          <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
            <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p>사업장별 종합 보고서 기능 준비중입니다.</p>
            <p className="text-sm mt-2">
              이 기능은 추후 업데이트에서 제공될 예정입니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
