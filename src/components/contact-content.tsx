import { Phone, Mail, Clock, HelpCircle, Info } from 'lucide-react'

export function ContactContent() {
  return (
    <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Phone className="h-5 w-5 text-blue-600" />
          연락처
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-md space-y-2">
            <div className="flex items-start gap-3">
              <span className="font-medium text-gray-700 min-w-[60px]">전화</span>
              <div>
                <p>041-663-7780 (대표전화)</p>
                <p>010-2017-6066 (긴급 연락처)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-medium text-gray-700 min-w-[60px]">FAX</span>
              <p>041-663-7782</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-medium text-gray-700 min-w-[60px]">이메일</span>
              <div>
                <p>
                  <a href="mailto:whatfor44@gmail.com" className="text-blue-600 hover:underline">whatfor44@gmail.com</a>
                  <span className="text-gray-500 ml-1">(일반 문의 / 관리자)</span>
                </p>
                <p>
                  <a href="mailto:botcatherine5@gmail.com" className="text-blue-600 hover:underline">botcatherine5@gmail.com</a>
                  <span className="text-gray-500 ml-1">(기술 문의)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          운영시간
        </h2>
        <div className="p-4 bg-gray-50 rounded-md">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left font-medium">구분</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-medium">시간</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2">평일 (월~금)</td>
                  <td className="border border-gray-300 px-3 py-2">오전 9:00 ~ 오후 6:00</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2">점심시간</td>
                  <td className="border border-gray-300 px-3 py-2">오후 12:00 ~ 오후 1:00</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2">토·일요일 및 공휴일</td>
                  <td className="border border-gray-300 px-3 py-2 text-red-600 font-medium">휴무</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-gray-500">
            ※ 긴급한 산업재해 관련 상담은 긴급 연락처(010-2017-6066)로 연락 부탁드립니다.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-600" />
          자주 묻는 질문 (FAQ)
        </h2>
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-md">
            <p className="font-medium text-gray-900">Q. 회원가입 후 바로 서비스를 이용할 수 있나요?</p>
            <p className="mt-1 text-gray-600">
              A. 회원가입 후 관리자의 승인이 필요합니다. 승인이 완료되면 이메일 또는 로그인 시 안내를 받으실 수 있으며,
              승인까지 보통 1~2 영업일이 소요됩니다. 급하신 경우 대표전화로 문의해 주세요.
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-md">
            <p className="font-medium text-gray-900">Q. 사업장 이용자 계정은 어떻게 만드나요?</p>
            <p className="mt-1 text-gray-600">
              A. 사업장 이용자 계정은 센터 관리자가 배정합니다. 일반 회원가입 후 관리자에게 소속 사업장 정보를
              전달해 주시면 해당 사업장에 대한 접근 권한을 부여해 드립니다.
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-md">
            <p className="font-medium text-gray-900">Q. 비밀번호를 잊어버렸어요. 어떻게 해야 하나요?</p>
            <p className="mt-1 text-gray-600">
              A. 현재 비밀번호 재설정 기능은 준비 중입니다. 비밀번호를 분실하신 경우 관리자(041-663-7780 또는
              whatfor44@gmail.com)에게 연락하시면 비밀번호 초기화를 도와드립니다.
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-md">
            <p className="font-medium text-gray-900">Q. 시스템에 오류가 발생했어요. 어디에 신고하나요?</p>
            <p className="mt-1 text-gray-600">
              A. 시스템 오류나 기술적 문제는 기술 문의 이메일(botcatherine5@gmail.com)로 보내주세요.
              오류 화면 캡처와 함께 발생 상황을 설명해 주시면 더 빠른 해결이 가능합니다.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          안내사항
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>새움터는 충남노동건강인권센터에서 운영하는 산업재해 예방 및 상담 통합 업무관리시스템입니다.</li>
          <li>서비스 관련 건의사항이나 개선 요청은 언제든 이메일 또는 전화로 알려주시면 적극 반영하겠습니다.</li>
          <li>개인정보 관련 문의는 <a href="/privacy" className="text-blue-600 hover:underline">개인정보처리방침</a> 페이지를 참고해 주세요.</li>
          <li>서비스 이용에 관한 자세한 내용은 <a href="/terms" className="text-blue-600 hover:underline">이용약관</a>을 확인해 주세요.</li>
        </ul>
      </section>
    </div>
  )
}
