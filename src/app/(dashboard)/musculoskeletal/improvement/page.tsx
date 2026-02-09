'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Filter,
  Building2,
} from 'lucide-react'

interface Improvement {
  id: string
  documentNo: string | null
  problem: string
  improvement: string
  source: string | null
  status?: string // 개선 진행상태
  assessment: {
    id: string
    organizationUnit: {
      name: string
    }
    workplace: {
      name: string
    }
  }
}

export default function ImprovementPage() {
  const [improvements, setImprovements] = useState<Improvement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchImprovements = async () => {
      try {
        // 모든 개선사항 조회
        const res = await fetch('/api/musculoskeletal/improvements')
        if (res.ok) {
          const data = await res.json()
          setImprovements(data.improvements || [])
        }
      } catch (error) {
        console.error('개선사항 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchImprovements()
  }, [])

  // 필터링
  const filteredImprovements = improvements.filter((item) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        item.problem.toLowerCase().includes(term) ||
        item.improvement.toLowerCase().includes(term) ||
        item.assessment.organizationUnit.name.toLowerCase().includes(term) ||
        item.assessment.workplace.name.toLowerCase().includes(term)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">개선작업</h1>
          <p className="text-sm text-gray-500 mt-1">
            근골격계유해요인조사에서 도출된 개선과제를 관리합니다.
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">대기중</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">진행중</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">완료</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="문제점 또는 개선방향 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 개선사항 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">개선과제 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">로딩중...</div>
          ) : filteredImprovements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p>등록된 개선과제가 없습니다.</p>
              <p className="text-sm mt-2">
                조사 결과에서 개선방향을 등록하면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredImprovements.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Building2 className="w-4 h-4" />
                        {item.assessment.workplace.name} /{' '}
                        {item.assessment.organizationUnit.name}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            주요 문제점
                          </p>
                          <p className="text-sm text-gray-900">{item.problem}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            개선 검토 방향
                          </p>
                          <p className="text-sm text-gray-900">{item.improvement}</p>
                        </div>
                      </div>
                      {item.source && (
                        <p className="text-xs text-gray-400 mt-2">
                          수집경로: {item.source}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
