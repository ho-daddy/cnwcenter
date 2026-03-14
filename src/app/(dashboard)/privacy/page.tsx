import { PrivacyPolicyContent } from '@/components/privacy-policy-content'

export const metadata = {
  title: '개인정보처리방침 | 새움터',
  description: '충남노동건강인권센터 새움터 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">개인정보처리방침</h1>
      <p className="text-sm text-gray-500 mb-8">최종 수정일: 2026년 3월 13일</p>
      <div className="bg-white rounded-lg shadow-sm p-8">
        <PrivacyPolicyContent />
      </div>
    </div>
  )
}
