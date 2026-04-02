export interface TutorialStep {
  /** CSS selector or data-tutorial value to highlight */
  target: string
  /** Title shown in the tooltip */
  title: string
  /** Description text */
  content: string
  /** Preferred placement of the tooltip */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** If true, the step doesn't need an element (shows centered modal) */
  isModal?: boolean
}

export type TutorialId = 'riskAssessment' | 'musculoskeletal' | 'workplaces'

export const TUTORIAL_LABELS: Record<TutorialId, string> = {
  riskAssessment: '위험성평가 가이드',
  musculoskeletal: '근골조사 가이드',
  workplaces: '사업장관리 가이드',
}

/** The page each tutorial should start on */
export const TUTORIAL_START_PAGES: Record<TutorialId, string> = {
  riskAssessment: '/risk-assessment/conduct',
  musculoskeletal: '/musculoskeletal/survey',
  workplaces: '/workplaces',
}

export const tutorialSteps: Record<TutorialId, TutorialStep[]> = {
  riskAssessment: [
    {
      target: '',
      title: '위험성평가 가이드를 시작합니다',
      content: '위험성평가 기능의 주요 사용법을 단계별로 안내합니다. 언제든 "건너뛰기"를 눌러 종료할 수 있습니다.',
      isModal: true,
    },
    {
      target: '[data-tutorial="ra-sidebar-menu"]',
      title: '위험성평가 메뉴',
      content: '사이드바에서 "위험성평가"를 클릭하면 현황판, 평가 실시, 모아 보기, 보고서 생성, 개선작업 등 하위 메뉴를 확인할 수 있습니다.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="ra-workplace-list"]',
      title: '사업장 선택',
      content: '왼쪽 패널에서 평가를 수행할 사업장을 선택합니다. 사업장이 등록되어 있어야 평가를 진행할 수 있습니다.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="ra-org-tree"]',
      title: '조직도 선택',
      content: '사업장을 선택하면 해당 사업장의 조직도가 표시됩니다. 평가할 부서/공정을 선택하세요.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="ra-card-section"]',
      title: '평가카드 영역',
      content: '선택한 조직단위의 평가카드가 이 영역에 표시됩니다. 평가카드에는 작업자 정보, 유해위험요인, 위험성 점수 등이 포함됩니다.',
      placement: 'left',
    },
    {
      target: '[data-tutorial="ra-add-card"]',
      title: '새 평가카드 추가',
      content: '조직단위를 선택한 후 이 버튼을 클릭하면 새로운 평가카드를 추가할 수 있습니다. 연도, 평가유형, 작업자명 등을 입력합니다.',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="ra-hazard-section"]',
      title: '유해위험요인 관리',
      content: '평가카드 내에서 유해위험요인을 추가하고, 심각성·가능성·추가점수를 입력하여 위험성 점수를 산출합니다. 사진 첨부도 가능합니다.',
      placement: 'left',
    },
    {
      target: '',
      title: '위험성평가 가이드 완료',
      content: '위험성평가의 기본 사용법 안내가 완료되었습니다. 추가 질문이 있으면 사이드바 하단의 "사용 가이드"에서 언제든 다시 확인할 수 있습니다.',
      isModal: true,
    },
  ],

  musculoskeletal: [
    {
      target: '',
      title: '근골조사 가이드를 시작합니다',
      content: '근골격계유해요인조사 기능의 주요 사용법을 단계별로 안내합니다. 언제든 "건너뛰기"를 눌러 종료할 수 있습니다.',
      isModal: true,
    },
    {
      target: '[data-tutorial="ms-sidebar-menu"]',
      title: '근골조사 메뉴',
      content: '사이드바에서 "근골조사"를 클릭하면 현황판, 조사 실시, 모아 보기, 보고서 생성, 개선작업 등 하위 메뉴를 확인할 수 있습니다.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="ms-workplace-list"]',
      title: '사업장 선택',
      content: '왼쪽 패널에서 조사를 수행할 사업장을 선택합니다.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="ms-org-tree"]',
      title: '조직도 선택',
      content: '사업장의 조직도에서 조사할 부서/공정을 선택하세요. 조직단위별로 근골조사가 관리됩니다.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="ms-assessment-list"]',
      title: '조사 목록',
      content: '선택한 조직단위의 조사 목록이 표시됩니다. 상태(초안/진행중/완료/검토)별로 필터링할 수 있습니다.',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="ms-add-assessment"]',
      title: '새 조사 추가',
      content: '이 버튼을 클릭하면 새 근골조사를 추가할 수 있습니다. Sheet 1~4의 단계별 조사를 진행합니다.',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="ms-sheet-tabs"]',
      title: 'Sheet 탭 구성',
      content: '근골조사는 5개 탭으로 구성됩니다: 개요·관리카드, 작업영상, 공구/중량물/자세, RULA/REBA, 종합평가. 각 탭에서 상세 데이터를 입력합니다.',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="ms-video-tab"]',
      title: '작업영상 업로드',
      content: '작업영상 탭에서는 Google Drive와 연동하여 작업 영상을 업로드하고 관리할 수 있습니다.',
      placement: 'bottom',
    },
    {
      target: '',
      title: '근골조사 가이드 완료',
      content: '근골조사의 기본 사용법 안내가 완료되었습니다. 사이드바 하단의 "사용 가이드"에서 언제든 다시 확인할 수 있습니다.',
      isModal: true,
    },
  ],

  workplaces: [
    {
      target: '',
      title: '사업장관리 가이드를 시작합니다',
      content: '사업장 관리 기능의 주요 사용법을 단계별로 안내합니다. 언제든 "건너뛰기"를 눌러 종료할 수 있습니다.',
      isModal: true,
    },
    {
      target: '[data-tutorial="wp-sidebar-menu"]',
      title: '사업장 관리 메뉴',
      content: '사이드바에서 "사업장 관리"를 클릭하면 등록된 사업장 목록 페이지로 이동합니다.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="wp-add-button"]',
      title: '새 사업장 등록',
      content: '"사업장 등록" 버튼을 클릭하여 새로운 사업장을 등록할 수 있습니다. 사업장명, 업종, 주소, 인원 등 기본정보를 입력합니다.',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="wp-search"]',
      title: '사업장 검색',
      content: '사업장명 또는 주소로 검색하여 원하는 사업장을 빠르게 찾을 수 있습니다.',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="wp-list"]',
      title: '사업장 목록',
      content: '등록된 사업장 목록입니다. 사업장을 클릭하면 상세 페이지로 이동하여 기본정보 수정, 조직도 관리, 사용자 배정 등을 할 수 있습니다.',
      placement: 'top',
    },
    {
      target: '',
      title: '사업장관리 가이드 완료',
      content: '사업장관리의 기본 사용법 안내가 완료되었습니다. 사업장 상세 페이지에서는 조직도(부서/공정) 추가·수정과 사용자 배정을 관리할 수 있습니다.',
      isModal: true,
    },
  ],
}
