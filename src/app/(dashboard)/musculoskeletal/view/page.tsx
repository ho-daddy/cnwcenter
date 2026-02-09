'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Search,
  Filter,
  Download,
  Eye,
  Building2,
  Calendar,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'

interface Assessment {
  id: string
  year: number
  assessmentType: string
  status: string
  workplace: {
    id: string
    name: string
  }
  organizationUnit: {
    name: string
  }
  elementWorks: {
    id: string
    name: string
    bodyPartScores: {
      bodyPart: string
      totalScore: number
    }[]
  }[]
  updatedAt: string
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '작성중', className: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: '조사중', className: 'bg-orange-100 text-orange-600' },
  COMPLETED: { label: '완료', className: 'bg-green-100 text-green-600' },
  REVIEWED: { label: '검토완료', className: 'bg-blue-100 text-blue-600' },
}

const BODY_PART_LABELS: Record<string, string> = {
  HAND_WRIST: '손/손목',
  ELBOW_FOREARM: '팔/팔꿈치',
  SHOULDER_ARM: '어깨/위팔',
  NECK: '목',
  BACK_HIP: '허리/고관절',
  KNEE_ANKLE: '무릎/발목',
}

export default function ViewPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [workplaceFilter, setWorkplaceFilter] = useState<string>('')

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        // 모든 사업장의 조사 목록 조회
        const res = await fetch('/api/musculoskeletal')
        if (res.ok) {
          const data = await res.json()
          setAssessments(data.assessments)
        }
      } catch (error) {
        console.error('조사 목록 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAssessments()
  }, [])

  // 필터링
  const filteredAssessments = assessments.filter((a) => {
    if (
      searchTerm &&
      !a.organizationUnit.name.includes(searchTerm) &&
      !a.workplace.name.includes(searchTerm)
    )
      return false
    if (yearFilter && a.year.toString() !== yearFilter) return false
    if (statusFilter && a.status !== statusFilter) return false
    if (workplaceFilter && a.workplace.id !== workplaceFilter) return false
    return true
  })

  // 사업장 목록 추출
  const workplaces = Array.from(
    new Map(assessments.map((a) => [a.workplace.id, a.workplace])).values()
  )

  // 년도 목록 추출
  const years = Array.from(new Set(assessments.map((a) => a.year))).sort((a, b) => b - a)

  // 최대 점수 찾기 (색상 표시용)
  const getScoreColor = (score: number) => {
    if (score >= 7) return 'bg-red-500 text-white'
    if (score >= 5) return 'bg-orange-500 text-white'
    if (score >= 3) return 'bg-yellow-500 text-white'
    return 'bg-green-500 text-white'
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">모아 보기</h1>
          <p className="text-sm text-gray-500 mt-1">
            전체 조사 결과를 한눈에 확인하세요.
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Excel 내보내기
        </Button>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="평가단위 또는 사업장 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">전체 년도</option>
              {years.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}년
                </option>
              ))}
            </select>
            <select
              value={workplaceFilter}
              onChange={(e) => setWorkplaceFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">전체 사업장</option>
              {workplaces.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">전체 상태</option>
              <option value="DRAFT">작성중</option>
              <option value="IN_PROGRESS">조사중</option>
              <option value="COMPLETED">완료</option>
              <option value="REVIEWED">검토완료</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 결과 테이블 */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">로딩중...</div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Filter className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p>조회된 조사 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">사업장</th>
                    <th className="text-left py-3 px-2 font-medium">평가단위</th>
                    <th className="text-center py-3 px-2 font-medium">년도</th>
                    <th className="text-center py-3 px-2 font-medium">상태</th>
                    <th className="text-center py-3 px-2 font-medium">요소작업</th>
                    <th className="text-center py-3 px-2 font-medium">손/손목</th>
                    <th className="text-center py-3 px-2 font-medium">팔꿈치</th>
                    <th className="text-center py-3 px-2 font-medium">어깨</th>
                    <th className="text-center py-3 px-2 font-medium">목</th>
                    <th className="text-center py-3 px-2 font-medium">허리</th>
                    <th className="text-center py-3 px-2 font-medium">무릎</th>
                    <th className="text-center py-3 px-2 font-medium">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.map((assessment) => {
                    // 요소작업별 최대 점수 계산
                    const maxScores: Record<string, number> = {}
                    assessment.elementWorks.forEach((work) => {
                      work.bodyPartScores.forEach((score) => {
                        if (
                          !maxScores[score.bodyPart] ||
                          score.totalScore > maxScores[score.bodyPart]
                        ) {
                          maxScores[score.bodyPart] = score.totalScore
                        }
                      })
                    })

                    const { label, className } =
                      STATUS_CONFIG[assessment.status] || {
                        label: assessment.status,
                        className: 'bg-gray-100',
                      }

                    return (
                      <tr key={assessment.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{assessment.workplace.name}</td>
                        <td className="py-3 px-2 font-medium">
                          {assessment.organizationUnit.name}
                        </td>
                        <td className="text-center py-3 px-2">{assessment.year}</td>
                        <td className="text-center py-3 px-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${className}`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className="text-center py-3 px-2">
                          {assessment.elementWorks.length}
                        </td>
                        {[
                          'HAND_WRIST',
                          'ELBOW_FOREARM',
                          'SHOULDER_ARM',
                          'NECK',
                          'BACK_HIP',
                          'KNEE_ANKLE',
                        ].map((part) => (
                          <td key={part} className="text-center py-3 px-2">
                            {maxScores[part] !== undefined ? (
                              <span
                                className={`inline-block w-8 h-8 leading-8 rounded ${getScoreColor(
                                  maxScores[part]
                                )}`}
                              >
                                {maxScores[part]}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        ))}
                        <td className="text-center py-3 px-2">
                          <Link
                            href={`/musculoskeletal/survey/${assessment.id}`}
                            className="inline-flex items-center text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
