'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Building2, FlaskConical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Component {
  id: string
  concentration: string | null
  severityScore: number | null
  component: {
    id: string
    casNumber: string
    name: string
    hazards: string | null
    regulations: string | null
  }
}

interface UnitLink {
  organizationUnit: {
    id: string
    name: string
    parent: { id: string; name: string } | null
  }
}

interface Product {
  id: string
  name: string
  manufacturer: string | null
  description: string | null
  severityScore: number | null
  workplace: { id: string; name: string }
  components: Component[]
  unitLinks: UnitLink[]
}

function severityBadge(score: number | null, size: 'sm' | 'lg' = 'sm') {
  if (!score) return null
  const colors: Record<number, string> = {
    5: 'bg-red-100 text-red-700', 4: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700', 2: 'bg-blue-100 text-blue-700', 1: 'bg-gray-100 text-gray-600',
  }
  const cls = size === 'lg' ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-xs'
  return <span className={`rounded font-bold ${colors[score] || colors[1]} ${cls}`}>{score}점</span>
}

function concentrationDisplay(val: string | null) {
  if (!val) return '—'
  if (val === '모름') return <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">모름</span>
  if (val === '영업비밀') return <span className="px-1.5 py-0.5 bg-amber-200 text-amber-700 rounded text-xs">영업비밀</span>
  return `${val}%`
}

export default function ChemicalProductViewPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/risk-assessment/chemicals/${params.id}`)
      .then(r => r.json())
      .then(d => { setProduct(d.error ? null : d); setIsLoading(false) })
  }, [params.id])

  if (isLoading) return <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
  if (!product) return <div className="text-center py-12 text-gray-400 text-sm">화학제품을 찾을 수 없습니다.</div>

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/risk-assessment/chemicals" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5" /> {product.workplace.name}
              {product.manufacturer && <span> · {product.manufacturer}</span>}
            </p>
          </div>
        </div>
        <Link href={`/risk-assessment/chemicals/${product.id}/edit`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm">
          <Pencil className="w-4 h-4" /> 수정
        </Link>
      </div>

      {/* Product Info Card */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><FlaskConical className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-500">제품 중대성 점수</p>
              <div className="flex items-center gap-2 mt-0.5">
                {severityBadge(product.severityScore, 'lg')}
                <span className="text-xs text-gray-400">구성성분 최댓값 자동 산정</span>
              </div>
            </div>
          </div>
          {product.description && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{product.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Components Table */}
      <Card>
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-gray-700">구성성분 ({product.components.length}종)</h2>
        </div>
        {product.components.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">등록된 구성성분이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">CAS 번호</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">성분명</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">함유량</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">유해성</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">규제사항</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">중대성</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {product.components.map(pc => (
                  <tr key={pc.id}>
                    <td className="px-4 py-2.5 font-mono text-gray-600">{pc.component.casNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{pc.component.name}</td>
                    <td className="px-4 py-2.5 text-center">{concentrationDisplay(pc.concentration)}</td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-xs">
                      <p className="whitespace-pre-wrap text-xs leading-relaxed line-clamp-3">{pc.component.hazards || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-xs">
                      <p className="whitespace-pre-wrap text-xs leading-relaxed line-clamp-3">{pc.component.regulations || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center">{severityBadge(pc.severityScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Unit Links */}
      {product.unitLinks.length > 0 && (
        <Card>
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-gray-700">사용 조직단위 ({product.unitLinks.length}개)</h2>
          </div>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {product.unitLinks.map(link => (
                <span key={link.organizationUnit.id}
                  className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs">
                  {link.organizationUnit.parent && <span className="text-gray-400">{link.organizationUnit.parent.name} &gt; </span>}
                  {link.organizationUnit.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
