'use client'

import { useState, useEffect } from 'react'
import { X, FlaskConical, Building2, Loader2 } from 'lucide-react'

interface Component {
  id: string
  concentration: string | null
  severityScore: number | null
  component: {
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
  managementMethod: string | null
  severityScore: number | null
  workplace: { id: string; name: string }
  components: Component[]
  unitLinks: UnitLink[]
}

function severityBadge(score: number | null) {
  if (!score) return null
  const colors: Record<number, string> = {
    5: 'bg-red-100 text-red-700', 4: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700', 2: 'bg-blue-100 text-blue-700', 1: 'bg-gray-100 text-gray-600',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[score] || colors[1]}`}>{score}점</span>
}

function concentrationDisplay(val: string | null) {
  if (!val) return '—'
  if (val === '모름') return <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">모름</span>
  if (val === '영업비밀') return <span className="px-1.5 py-0.5 bg-amber-200 text-amber-700 rounded text-xs">영업비밀</span>
  return `${val}%`
}

interface Props {
  productId: string | null
  onClose: () => void
}

export default function ChemicalProductModal({ productId, onClose }: Props) {
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!productId) return
    setIsLoading(true)
    fetch(`/api/risk-assessment/chemicals/${productId}`)
      .then(r => r.json())
      .then(d => { setProduct(d.error ? null : d); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [productId])

  if (!productId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">화학제품 정보</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !product ? (
          <div className="text-center py-16 text-sm text-gray-400">화학제품 정보를 불러올 수 없습니다.</div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* 기본 정보 */}
            <div>
              <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <Building2 className="w-3.5 h-3.5" />
                {product.workplace.name}
                {product.manufacturer && <span>· {product.manufacturer}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-500">중대성:</span>
                {severityBadge(product.severityScore)}
              </div>
              {product.description && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-3">{product.description}</p>
              )}
            </div>

            {/* 관리방법 */}
            {product.managementMethod && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">관리방법</h4>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{product.managementMethod}</p>
                </div>
              </div>
            )}

            {/* 구성성분 */}
            {product.components.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">구성성분 ({product.components.length}종)</h4>
                <div className="space-y-3">
                  {product.components.map(pc => (
                    <div key={pc.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{pc.component.name}</span>
                          <span className="font-mono text-xs text-gray-500">{pc.component.casNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{concentrationDisplay(pc.concentration)}</span>
                          {severityBadge(pc.severityScore)}
                        </div>
                      </div>
                      {pc.component.hazards && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 mb-0.5">유해성</p>
                          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed bg-red-50 rounded px-2 py-1.5">{pc.component.hazards}</p>
                        </div>
                      )}
                      {pc.component.regulations && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 mb-0.5">규제사항</p>
                          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed bg-blue-50 rounded px-2 py-1.5">{pc.component.regulations}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 사용 평가단위 */}
            {product.unitLinks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">사용 평가단위 ({product.unitLinks.length}개)</h4>
                <div className="flex flex-wrap gap-2">
                  {product.unitLinks.map(link => (
                    <span key={link.organizationUnit.id}
                      className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs">
                      {link.organizationUnit.parent && <span className="text-gray-400">{link.organizationUnit.parent.name} &gt; </span>}
                      {link.organizationUnit.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
