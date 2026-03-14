export function PrivacyPolicyContent() {
  return (
    <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed">
      <p>
        충남노동건강인권센터 새움터(이하 &ldquo;센터&rdquo;)는 「개인정보 보호법」 제30조에 따라
        정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록
        다음과 같이 개인정보 처리방침을 수립·공개합니다.
      </p>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">제1조 (개인정보의 수집 및 이용 목적)</h2>
        <p>센터는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>회원 가입 및 관리: 회원제 서비스 이용에 따른 본인 확인, 서비스 부정이용 방지, 각종 고지·통지</li>
          <li>서비스 제공: 산업재해 예방 상담, 위험성평가, 근골격계유해요인조사 등 업무 수행</li>
          <li>통계 및 분석: 서비스 이용 현황 분석, 서비스 개선을 위한 통계 작성</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">제2조 (수집하는 개인정보 항목)</h2>
        <p>센터는 회원가입, 상담, 서비스 제공 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">구분</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">수집 항목</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">수집 방법</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">회원가입(필수)</td>
                <td className="border border-gray-300 px-3 py-2">이름, 이메일 주소, 비밀번호</td>
                <td className="border border-gray-300 px-3 py-2">회원가입 폼</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">소셜 로그인(선택)</td>
                <td className="border border-gray-300 px-3 py-2">이름, 이메일 주소, 프로필 이미지</td>
                <td className="border border-gray-300 px-3 py-2">Google OAuth</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">서비스 이용(선택)</td>
                <td className="border border-gray-300 px-3 py-2">소속 사업장, 연락처, 상담 내용</td>
                <td className="border border-gray-300 px-3 py-2">서비스 이용 과정</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">제3조 (개인정보의 보유 및 이용 기간)</h2>
        <p>센터는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</li>
          <li><strong>상담 기록:</strong> 상담 종료 후 5년 (산업안전보건법에 따른 보존 의무)</li>
          <li><strong>설문 응답:</strong> 수집 목적 달성 후 1년</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">제4조 (개인정보의 제3자 제공)</h2>
        <p>
          센터는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
        </p>
        <p className="mt-2">현재 개인정보를 제3자에게 제공하고 있지 않습니다.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">제5조 (개인정보 처리의 위탁)</h2>
        <p>
          센터는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">수탁업체</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">위탁 업무 내용</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">클라우드 서비스 제공업체</td>
                <td className="border border-gray-300 px-3 py-2">서버 운영 및 데이터 저장</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">제6조 (정보주체의 권리·의무 및 행사 방법)</h2>
        <p>정보주체는 센터에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>개인정보 열람 요구</li>
          <li>오류 등이 있을 경우 정정 요구</li>
          <li>삭제 요구</li>
          <li>처리 정지 요구</li>
        </ul>
        <p className="mt-2">
          위 권리 행사는 센터에 대해 서면, 전화, 이메일 등을 통하여 하실 수 있으며, 센터는 이에 대해 지체 없이 조치하겠습니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">제7조 (개인정보의 파기)</h2>
        <p>센터는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>파기 절차:</strong> 불필요한 개인정보는 개인정보 보호책임자의 승인을 받아 파기합니다.</li>
          <li><strong>파기 방법:</strong> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">제8조 (개인정보 보호책임자)</h2>
        <p>센터는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
        <div className="mt-2 p-4 bg-gray-50 rounded-md">
          <p className="font-medium">개인정보 보호책임자</p>
          <ul className="mt-1 space-y-0.5 text-gray-600">
            <li>성명: 최진일</li>
            <li>직위: 대표</li>
            <li>연락처: 041-663-7780</li>
            <li>이메일: cnwcenter@gmail.com</li>
          </ul>
        </div>
        <p className="mt-3">정보주체는 센터의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.</p>
        <p className="mt-2">기타 개인정보침해에 대한 신고나 상담이 필요하신 경우에는 아래 기관에 문의하시기 바랍니다.</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)</li>
          <li>대검찰청 사이버수사과 (www.spo.go.kr / 국번없이 1301)</li>
          <li>경찰청 사이버안전국 (ecrm.police.go.kr / 국번없이 182)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">제9조 (개인정보 처리방침 변경)</h2>
        <p>이 개인정보 처리방침은 2026년 3월 13일부터 적용됩니다.</p>
        <p className="mt-1">이전의 개인정보 처리방침은 아래에서 확인하실 수 있습니다.</p>
        <p className="mt-1 text-gray-500">- 이전 버전 없음 (최초 시행)</p>
      </section>
    </div>
  )
}
