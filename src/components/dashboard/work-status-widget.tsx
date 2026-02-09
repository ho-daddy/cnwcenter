'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockWorkStatus } from '@/lib/mock-data'

export function WorkStatusWidget() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">통합 업무 현황</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {mockWorkStatus.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
