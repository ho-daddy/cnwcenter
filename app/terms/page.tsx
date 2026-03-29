export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">이용약관</h1>
      <p className="text-gray-600 mb-8">최종 수정일: 2026년 3월 29일</p>

      <div className="space-y-8">
        <p className="text-gray-700">
          충남노동건강인권센터 새움터(이하 &quot;센터&quot;)가 제공하는 saeum.space 서비스(이하 &quot;서비스&quot;)를 이용해 주셔서 감사합니다. 
          본 약관은 서비스 이용과 관련하여 센터와 이용자 간의 권리, 의무 및 책임사항을 규정하고 있습니다.
        </p>

        <div>
          <h2 className="text-xl font-semibold mb-4">제1조 (목적)</h2>
          <p className="text-gray-700">
            본 약관은 센터가 제공하는 산업재해 예방 상담, 위험성평가, 근골격계유해요인조사 등의 서비스 이용에 관한 
            조건 및 절차, 회원과 센터의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제2조 (정의)</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>&quot;서비스&quot;</strong>란 센터가 제공하는 온라인 플랫폼 및 모든 부가 서비스를 의미합니다.</li>
            <li><strong>&quot;회원&quot;</strong>이란 본 약관에 동의하고 회원가입을 완료하여 서비스를 이용하는 자를 의미합니다.</li>
            <li><strong>&quot;아이디(ID)&quot;</strong>란 회원의 식별과 서비스 이용을 위하여 회원이 설정하고 센터가 승인한 이메일 주소를 의미합니다.</li>
            <li><strong>&quot;비밀번호&quot;</strong>란 회원의 정보 보호를 위해 회원 자신이 설정한 문자와 숫자의 조합을 의미합니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제3조 (약관의 효력 및 변경)</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>본 약관은 회원가입 시 동의를 통해 효력이 발생합니다.</li>
            <li>센터는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
            <li>약관이 변경될 경우, 변경 내용을 시행일자 7일 전부터 공지사항을 통해 공지합니다.</li>
            <li>회원이 변경된 약관에 동의하지 않을 경우, 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제4조 (회원가입)</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>회원가입은 이용자가 본 약관과 개인정보처리방침에 동의하고 필요한 정보를 입력하여 신청합니다.</li>
            <li>센터는 회원가입 신청에 대해 승인을 원칙으로 하나, 다음 각 호의 경우 승인을 거부하거나 보류할 수 있습니다:
              <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                <li>실명이 아니거나 타인의 정보를 도용한 경우</li>
                <li>허위 정보를 기재한 경우</li>
                <li>기타 센터가 정한 이용 신청 요건이 미비한 경우</li>
              </ul>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제5조 (회원 정보의 변경)</h2>
          <p className="text-gray-700">
            회원은 개인정보 관리 화면을 통하여 언제든지 본인의 개인정보를 열람하고 수정할 수 있습니다. 
            회원은 회원가입 시 기재한 사항이 변경되었을 경우 온라인으로 수정하거나 센터에 그 변경사항을 알려야 합니다.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제6조 (서비스의 제공 및 변경)</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>센터는 다음과 같은 서비스를 제공합니다:
              <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                <li>산업재해 예방 상담</li>
                <li>위험성평가 수행 및 관리</li>
                <li>근골격계유해요인조사 수행 및 관리</li>
                <li>사업장 안전보건 관련 일정 관리</li>
                <li>기타 센터가 정하는 업무</li>
              </ul>
            </li>
            <li>센터는 서비스의 내용을 변경할 수 있으며, 변경 시 공지사항을 통해 알립니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제7조 (서비스의 중단)</h2>
          <p className="text-gray-700 mb-2">
            센터는 다음 각 호의 경우 서비스 제공을 일시적으로 중단할 수 있습니다:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>시스템 정기점검, 서버의 증설 및 교체, 네트워크의 불안정 등</li>
            <li>천재지변, 국가비상사태, 정전 등 불가항력적 사유가 있는 경우</li>
            <li>기타 서비스 제공이 불가능한 경우</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제8조 (회원의 의무)</h2>
          <p className="text-gray-700 mb-2">회원은 다음 행위를 하여서는 안 됩니다:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>회원가입 신청 또는 정보 변경 시 허위 내용 등록</li>
            <li>타인의 정보 도용</li>
            <li>센터가 게시한 정보의 변경</li>
            <li>센터가 금지한 정보(컴퓨터 프로그램 등)의 송신 또는 게시</li>
            <li>센터와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
            <li>센터 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
            <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제9조 (센터의 의무)</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>센터는 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않습니다.</li>
            <li>센터는 회원으로부터 제기되는 의견이나 불만이 정당하다고 인정할 경우 신속히 처리합니다.</li>
            <li>센터는 개인정보 보호를 위해 보안시스템을 구축하며 개인정보처리방침을 공시하고 준수합니다.</li>
            <li>센터는 서비스 이용과 관련하여 발생하는 회원의 불만 또는 피해구제 요청을 적절하게 처리합니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제10조 (저작권의 귀속)</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>센터가 작성한 저작물에 대한 저작권 기타 지적재산권은 센터에 귀속합니다.</li>
            <li>회원이 서비스 내에 게시한 게시물의 저작권은 해당 게시물의 저작자에게 귀속됩니다.</li>
            <li>회원은 서비스를 이용하여 얻은 정보 중 센터에게 지적재산권이 귀속된 정보를 센터의 사전 승낙 없이 
                복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제11조 (계약 해지 및 이용 제한)</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>회원은 언제든지 설정 메뉴를 통해 회원 탈퇴를 요청할 수 있으며, 센터는 즉시 회원 탈퇴를 처리합니다.</li>
            <li>센터는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 
                경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.</li>
            <li>센터는 회원이 계속해서 3개월 이상 로그인하지 않는 경우, 회원정보의 보호 및 운영의 효율성을 위해 
                이용을 제한할 수 있습니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제12조 (책임 제한)</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>센터는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 
                서비스 제공에 관한 책임이 면제됩니다.</li>
            <li>센터는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
            <li>센터는 회원이 서비스와 관련하여 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 
                책임을 지지 않습니다.</li>
            <li>센터는 회원 간 또는 회원과 제3자 상호간에 서비스를 매개로 하여 거래 등을 한 경우에는 책임이 면제됩니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제13조 (분쟁 해결)</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>센터는 회원으로부터 제기되는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위해 
                피해보상처리기구를 설치·운영합니다.</li>
            <li>센터는 회원으로부터 제출되는 불만사항 및 의견은 우선적으로 그 사항을 처리합니다. 
                다만, 신속한 처리가 곤란한 경우에는 회원에게 그 사유와 처리일정을 즉시 통보합니다.</li>
            <li>센터와 회원 간에 발생한 전자상거래 분쟁과 관련하여 회원의 피해구제신청이 있는 경우에는 
                공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">제14조 (재판권 및 준거법)</h2>
          <p className="text-gray-700">
            센터와 회원 간에 발생한 분쟁에 관한 소송은 대한민국 법을 준거법으로 하며, 
            소송의 관할은 민사소송법에 따릅니다.
          </p>
        </div>

        <div className="border-t pt-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">부칙</h2>
          <p className="text-gray-700">
            본 약관은 2026년 3월 29일부터 적용됩니다.
          </p>
          <p className="text-gray-700 mt-2">
            - 이전 버전 없음 (최초 시행)
          </p>
        </div>
      </div>
    </div>
  );
}
