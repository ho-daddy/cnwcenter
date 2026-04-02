'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ChemicalForm, { type ComponentData, type ProductData } from '../../_components/ChemicalForm'

interface ApiProduct {
  id: string
  name: string
  manufacturer: string | null
  description: string | null
  managementMethod: string | null
  severityScore: number | null
  workplaceId: string
  workplace: { id: string; name: string }
  components: Array<{
    id: string
    concentration: string | null
    severityScore: number | null
    component: {
      casNumber: string
      name: string
      hazards: string | null
      regulations: string | null
    }
  }>
}

export default function EditChemicalProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/risk-assessment/chemicals/${params.id}`)
      .then(r => r.json())
      .then(d => { setProduct(d.error ? null : d); setIsLoading(false) })
  }, [params.id])

  if (isLoading) return <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
  if (!product) return <div className="text-center py-12 text-gray-400 text-sm">화학제품을 찾을 수 없습니다.</div>

  const initial: ProductData = {
    name: product.name,
    manufacturer: product.manufacturer || '',
    description: product.description || '',
    managementMethod: product.managementMethod || '',
    components: product.components.map<ComponentData>(pc => ({
      key: crypto.randomUUID(),
      casNumber: pc.component.casNumber,
      name: pc.component.name,
      concentration: pc.concentration || '',
      hazards: pc.component.hazards || '',
      regulations: pc.component.regulations || '',
      severityScore: pc.severityScore ?? 1,
      isTradeSecret: pc.component.casNumber === '영업비밀',
      isConcentrationUnknown: pc.concentration === '모름',
    })),
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href={`/risk-assessment/chemicals/${product.id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">화학제품 수정</h1>
          <p className="text-sm text-gray-500 mt-0.5">{product.name} — {product.workplace.name}</p>
        </div>
      </div>

      <ChemicalForm
        mode="edit"
        workplaceId={product.workplaceId}
        workplaceName={product.workplace.name}
        productId={product.id}
        initial={initial}
      />
    </div>
  )
}
