'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ChemicalForm from '../_components/ChemicalForm'

interface Workplace { id: string; name: string }

export default function NewChemicalProductPage() {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [selectedWp, setSelectedWp] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/workplaces')
      .then(r => r.json())
      .then(d => {
        const list: Workplace[] = d.workplaces || []
        setWorkplaces(list)
        if (list.length === 1) setSelectedWp(list[0].id)
        setIsLoading(false)
      })
  }, [])

  const wpName = workplaces.find(w => w.id === selectedWp)?.name || ''

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/risk-assessment/chemicals" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">새 화학제품 등록</h1>
          <p className="text-sm text-gray-500 mt-0.5">구성성분 정보와 함께 화학제품을 등록합니다.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
      ) : (
        <>
          {workplaces.length > 1 && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">사업장 선택 *</label>
              <select value={selectedWp} onChange={e => setSelectedWp(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white w-64">
                <option value="">사업장을 선택하세요</option>
                {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
              </select>
            </div>
          )}

          {selectedWp ? (
            <ChemicalForm mode="new" workplaceId={selectedWp} workplaceName={wpName} />
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">사업장을 선택해주세요.</div>
          )}
        </>
      )}
    </div>
  )
}
