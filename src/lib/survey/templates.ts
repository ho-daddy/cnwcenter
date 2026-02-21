import type { TemplateStructure } from '@/types/survey'

/**
 * 기본 설문 템플릿: 위험성평가/근골격계 유해요인조사 설문지
 * 원본: extra_files/survey.html (사업장명 제외)
 */
export const DEFAULT_SURVEY_TEMPLATE: TemplateStructure = {
  sections: [
    // ────────────────────────────────────────────
    // Section 0: 개인 정보 (15 questions)
    // ────────────────────────────────────────────
    {
      title: '개인 정보',
      description:
        '이 조사에 조사된 모든 내용은 통계목적 이외에는 절대로 사용할 수 없으며 그 비밀이 보호되도록 통계법(제34조)에 규정되어 있습니다.\n본 설문 및 면접 결과를 통해 향후 현장의 위험요인을 개선하는 데 필요한 기초 자료를 만들어, 더 안전하고 건강한 일터 조성에 보탬이 되도록 하겠습니다.',
      sortOrder: 0,
      questions: [
        {
          questionCode: 'S0-consent',
          questionText: '개인정보를 연구에 활용하는 것에 동의합니다.',
          questionType: 'CONSENT',
          required: true,
          sortOrder: 0,
          options: null,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-name',
          questionText: '이름',
          questionType: 'TEXT',
          required: true,
          sortOrder: 1,
          options: null,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-gender',
          questionText: '성별',
          questionType: 'RADIO',
          required: true,
          sortOrder: 2,
          options: [
            { value: '남성', label: '남성' },
            { value: '여성', label: '여성' },
            { value: '밝히고 싶지 않음', label: '밝히고 싶지 않음' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-age',
          questionText: '나이 (세)',
          questionType: 'NUMBER',
          required: true,
          sortOrder: 3,
          options: { min: 18, max: 100, unit: '세' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-serviceYears',
          questionText: '근속기간 (년)',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 4,
          options: { min: 0, max: 100, unit: '년' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-serviceMonths',
          questionText: '근속기간 (개월)',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 5,
          options: { min: 0, max: 11, unit: '개월' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-workType',
          questionText: '근무형태',
          questionType: 'RADIO',
          required: true,
          sortOrder: 6,
          options: [
            { value: '4조 3교대', label: '4조 3교대' },
            { value: '주간 고정', label: '주간 고정' },
            { value: '기타', label: '기타' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-otherWorkType',
          questionText: '기타 근무형태 (직접 입력)',
          questionType: 'TEXT',
          required: false,
          sortOrder: 7,
          options: null,
          conditionalLogic: {
            conditions: [
              { questionId: 'S0-workType', operator: 'equals', value: '기타' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'S0-position',
          questionText: '직책',
          questionType: 'RADIO',
          required: true,
          sortOrder: 8,
          options: [
            { value: '사원', label: '사원' },
            { value: '반장', label: '반장' },
            { value: '계장', label: '계장' },
            { value: '기타', label: '기타' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-otherPosition',
          questionText: '기타 직책 (직접 입력)',
          questionType: 'TEXT',
          required: false,
          sortOrder: 9,
          options: null,
          conditionalLogic: {
            conditions: [
              { questionId: 'S0-position', operator: 'equals', value: '기타' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'S0-workHours',
          questionText: '평균 노동시간 (잔업, 특근 포함) 주 (시간)',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 10,
          options: { min: 0, max: 168, unit: '시간' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-department',
          questionText: '근무부서 (팀)',
          questionType: 'TEXT',
          required: false,
          sortOrder: 11,
          options: null,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-process',
          questionText: '담당 공정',
          questionType: 'TEXT',
          required: false,
          sortOrder: 12,
          options: null,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-deptYears',
          questionText: '해당 부서 근속 기간 (년)',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 13,
          options: { min: 0, max: 100, unit: '년' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-deptMonths',
          questionText: '해당 부서 근속 기간 (개월)',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 14,
          options: { min: 0, max: 11, unit: '개월' } as unknown,
          conditionalLogic: null,
        },
      ],
    },

    // ────────────────────────────────────────────
    // Section 1: 사고 경험 (10 questions)
    // ────────────────────────────────────────────
    {
      title: '사고 경험',
      description: '현재 공정 및 주변에서의 사고 경험에 대해 답변해주세요.',
      sortOrder: 1,
      questions: [
        {
          questionCode: 'Q1-1',
          questionText:
            '현재 공정에서 일하다가 사고로 다친 (혹은 다칠 뻔했던) 경험이 있다면 해당 내용에 모두 체크하세요.',
          questionType: 'CHECKBOX',
          required: false,
          sortOrder: 0,
          options: [
            { value: '끼임(협착)', label: '끼임(협착)' },
            { value: '부딪힘', label: '부딪힘' },
            { value: '넘어짐', label: '넘어짐' },
            { value: '베임/찔림', label: '베임/찔림' },
            { value: '화상', label: '화상' },
            { value: '감전', label: '감전' },
            { value: '급성중독', label: '급성중독' },
            { value: '물체에 맞음', label: '물체에 맞음' },
            { value: '추락', label: '추락' },
            { value: '충돌(치임)', label: '충돌(치임)' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-1-desc',
          questionText:
            '위 사고에 대한 내용을 간단히 적어주세요. 본인 외 동료의 사고도 기억하시면 적어주세요.',
          questionType: 'TEXT',
          required: false,
          sortOrder: 1,
          options: { multiline: true } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-2',
          questionText:
            '현재 공정외 다른 장소에서 사고로 다친 (혹은 다칠 뻔했던) 경험이 있다면 해당 내용에 모두 체크하세요.',
          questionType: 'CHECKBOX',
          required: false,
          sortOrder: 2,
          options: [
            { value: '끼임(협착)', label: '끼임(협착)' },
            { value: '부딪힘', label: '부딪힘' },
            { value: '넘어짐', label: '넘어짐' },
            { value: '베임/찔림', label: '베임/찔림' },
            { value: '화상', label: '화상' },
            { value: '감전', label: '감전' },
            { value: '급성중독', label: '급성중독' },
            { value: '물체에 맞음', label: '물체에 맞음' },
            { value: '추락', label: '추락' },
            { value: '충돌(치임)', label: '충돌(치임)' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-2-location',
          questionText: '사고가 일어난 위치를 적어주세요.',
          questionType: 'TEXT',
          required: false,
          sortOrder: 3,
          options: null,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-2-desc',
          questionText: '위 사고에 대한 내용을 간단히 적어주세요.',
          questionType: 'TEXT',
          required: false,
          sortOrder: 4,
          options: { multiline: true } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-3',
          questionText:
            '그 밖에 본인 공정이나 주변 설비, 시설 등에 사고가 발생할만한 위험이 있다고 생각되는 사안이 있다면 알려주세요. (계단, 난간, 사다리 등의 시설물이나 건물 밖 야외공간도 포함해 생각해 봅시다.)',
          questionType: 'TEXT',
          required: false,
          sortOrder: 5,
          options: { multiline: true, placeholder: '위험이 있는 장소와 어떤 사고 위험이 있는지 적어주세요.' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-4',
          questionText: '일하고 있는 공정 혹은 부서에서 사고는 얼마나 자주 일어납니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 6,
          options: [
            { value: '없다', label: '없다' },
            { value: '주 1회 이상', label: '주 1회 이상' },
            { value: '월 1회 이상', label: '월 1회 이상' },
            { value: '분기 1회 이상', label: '분기 1회 이상' },
            { value: '반기 1회 이상', label: '반기 1회 이상' },
            { value: '년 1회 이상', label: '년 1회 이상' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-5',
          questionText: '본인은 현장에서 일하면서 아차사고 경험이 있습니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 7,
          options: [
            { value: '없다', label: '없다' },
            { value: '주 1회 이상', label: '주 1회 이상' },
            { value: '월 1회 이상', label: '월 1회 이상' },
            { value: '분기 1회 이상', label: '분기 1회 이상' },
            { value: '반기 1회 이상', label: '반기 1회 이상' },
            { value: '년 1회 이상', label: '년 1회 이상' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-6',
          questionText: '본인은 현장에서 일하면서 사고 경험이 있습니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 8,
          options: [
            { value: '없다', label: '없다' },
            { value: '있다', label: '있다' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-6-count',
          questionText: '사고 경험 횟수',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 9,
          options: { min: 1 } as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q1-6', operator: 'equals', value: '있다' },
            ],
            logicType: 'AND',
          },
        },
      ],
    },

    // ────────────────────────────────────────────
    // Section 2: 질환 및 유해요인 (5 questions)
    // ────────────────────────────────────────────
    {
      title: '질환 및 유해요인',
      description: '업무 관련 질환 및 유해요인에 대해 답변해주세요.',
      sortOrder: 2,
      questions: [
        {
          questionCode: 'Q2-1',
          questionText:
            '일 때문에 발생했다고 생각하는 질환이나 증상이 있다면 체크해주세요.',
          questionType: 'CHECKBOX',
          required: false,
          sortOrder: 0,
          options: [
            { value: '근골격계질환', label: '근골격계질환' },
            { value: '호흡기질환', label: '호흡기질환' },
            { value: '피부질환', label: '피부질환' },
            { value: '소음성난청', label: '소음성난청' },
            { value: '소화기질환', label: '소화기질환' },
            { value: '직업성 암', label: '직업성 암' },
            { value: '안과질환', label: '안과질환' },
            { value: '이비인후과질환', label: '이비인후과질환' },
            { value: '온열/한랭질환', label: '온열/한랭질환' },
            { value: '기타', label: '기타' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q2-1-other',
          questionText: '기타 질환 (직접 입력)',
          questionType: 'TEXT',
          required: false,
          sortOrder: 1,
          options: null,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q2-1', operator: 'contains', value: '기타' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q2-2',
          questionText:
            '소음 때문에 불편하신 경우가 있다면 일하시는 공정에서 주로 소음을 발생시키는 것은 무엇인가요?',
          questionType: 'TEXT',
          required: false,
          sortOrder: 2,
          options: { multiline: true, placeholder: '가공설비, 배풍기, 모터, 컨베이어 등 구체적으로 적어주세요.' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q2-3',
          questionText:
            '공정에서 사용중인 화학제품 중 건강에 유해하다고 생각되는 것들이 있다면 알려주세요.',
          questionType: 'TABLE',
          required: false,
          sortOrder: 3,
          options: {
            columns: [
              { key: 'name', label: '제품명' },
              { key: 'use', label: '주된 용도' },
            ],
            rowCount: 3,
          } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q2-4',
          questionText:
            '그 밖에 생각나는 유해하거나 위험한 요소가 있다면 자유롭게 적어주세요.',
          questionType: 'TEXT',
          required: false,
          sortOrder: 4,
          options: { multiline: true } as unknown,
          conditionalLogic: null,
        },
      ],
    },

    // ────────────────────────────────────────────
    // Section 3: 노동강도 (6 questions)
    // ────────────────────────────────────────────
    {
      title: '노동강도',
      description: '노동강도에 대한 의견을 들려주세요.',
      sortOrder: 3,
      questions: [
        {
          questionCode: 'Q3-1a',
          questionText: '작업 후에 육체적으로 지치는 경우가 얼마나 자주 있습니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 0,
          options: [
            { value: '전혀 없다', label: '전혀 없다' },
            { value: '간혹 있다', label: '간혹 있다' },
            { value: '종종 있다', label: '종종 있다' },
            { value: '항상 있다', label: '항상 있다' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q3-1b',
          questionText: '작업 후에 정신적으로 지치는 경우가 얼마나 자주 있습니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 1,
          options: [
            { value: '전혀 없다', label: '전혀 없다' },
            { value: '간혹 있다', label: '간혹 있다' },
            { value: '종종 있다', label: '종종 있다' },
            { value: '항상 있다', label: '항상 있다' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q3-2',
          questionText:
            '귀하가 가정/사회생활을 제대로 하려면, 현재 작업량(속도)의 몇 %를 줄여야 합니까?',
          questionType: 'RANGE',
          required: false,
          sortOrder: 2,
          options: { min: 0, max: 100, step: 5, unit: '%' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q3-3',
          questionText: '현재의 노동강도에 대한 의견은 어떠합니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 3,
          options: [
            { value: '노동강도가 약하다', label: '노동강도가 약하다' },
            { value: '노동강도가 적절하여 이 정도면 할만하다', label: '노동강도가 적절하여 이 정도면 할만하다' },
            { value: '노동강도가 다소 강하지만 견딜만 하다', label: '노동강도가 다소 강하지만 견딜만 하다' },
            { value: '노동강도가 강하다', label: '노동강도가 강하다' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q3-4',
          questionText:
            '우리 현장의 노동강도를 결정하는 주된 원인은 무엇이라고 생각하십니까? 중요한 순서대로 3가지만 선택해주세요.',
          questionType: 'RANKED_CHOICE',
          required: false,
          sortOrder: 4,
          options: {
            choices: [
              { value: '노동시간', label: '노동시간' },
              { value: '반복동작, 부적절한 자세, 중량물 취급 등 인간공학적 요인', label: '반복동작, 부적절한 자세, 중량물 취급 등 인간공학적 요인' },
              { value: '물량 대비 인원', label: '물량 대비 인원' },
              { value: '노후화된 도구나 설비, 유해물질, 소음 등 작업환경', label: '노후화된 도구나 설비, 유해물질, 소음 등 작업환경' },
              { value: '교대근무 및 야간노동', label: '교대근무 및 야간노동' },
              { value: '위험성평가, 근골조사, 측정, 검진 등 안전보건활동 수준', label: '위험성평가, 근골조사, 측정, 검진 등 안전보건활동 수준' },
              { value: '기타', label: '기타' },
            ],
            rankCount: 3,
          } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q3-4-other',
          questionText: '기타 원인 (직접 입력)',
          questionType: 'TEXT',
          required: false,
          sortOrder: 5,
          options: null,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q3-4', operator: 'contains', value: '기타' },
            ],
            logicType: 'AND',
          },
        },
      ],
    },

    // ────────────────────────────────────────────
    // Section 4: 근골격계질환 (28 questions)
    // ────────────────────────────────────────────
    {
      title: '근골격계질환',
      description:
        '지난 1년 동안의 근골격계 증상에 대해 답변해주세요.\n\n[아픈 정도 보기]\n약함: 약간 불편한 정도이나 작업에 열중할 때는 못 느낀다.\n중간: 작업 중 통증이 있으나 귀가 후 휴식을 취하면 괜찮다.\n심함: 작업 중 통증이 비교적 심하고 귀가 후 휴식을 취해도 통증이 계속된다.\n매우 심함: 통증 때문에 작업은 물론 일상생활을 하기가 어렵다.',
      sortOrder: 4,
      questions: [
        // Q4-1: 증상 부위 선택
        {
          questionCode: 'Q4-1',
          questionText:
            '지난 1년 동안 다음 신체부위 중 어느 한 부위에서라도 통증이나 불편함을 느끼신 적이 있다면 해당 부위를 모두 선택해 주세요.',
          questionType: 'CHECKBOX',
          required: false,
          sortOrder: 0,
          options: [
            { value: '목', label: '목' },
            { value: '어깨', label: '어깨' },
            { value: '팔/팔꿈치', label: '팔/팔꿈치' },
            { value: '손/손목/손가락', label: '손/손목/손가락' },
            { value: '허리', label: '허리' },
            { value: '다리/발', label: '다리/발' },
          ] as unknown,
          conditionalLogic: null,
        },

        // ── 목 (neck) ──
        {
          questionCode: 'Q4-1-neck-period',
          questionText: '[목] 통증 지속 기간',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 1,
          options: [
            { value: '1일 미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일~1주일' },
            { value: '1주일~1달', label: '1주일~1달' },
            { value: '1달 이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '목' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-neck-level',
          questionText: '[목] 아픈 정도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 2,
          options: [
            { value: '약함', label: '약함' },
            { value: '중간', label: '중간' },
            { value: '심함', label: '심함' },
            { value: '매우 심함', label: '매우 심함' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '목' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-neck-freq',
          questionText: '[목] 빈도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 3,
          options: [
            { value: '6개월에 1번', label: '6개월에 1번' },
            { value: '1개월에 1번', label: '1개월에 1번' },
            { value: '1주일에 1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '목' }],
            logicType: 'AND',
          },
        },

        // ── 어깨 (shoulder) ──
        {
          questionCode: 'Q4-1-shoulder-period',
          questionText: '[어깨] 통증 기간',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 4,
          options: [
            { value: '1일 미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일~1주일' },
            { value: '1주일~1달', label: '1주일~1달' },
            { value: '1달 이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '어깨' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-shoulder-level',
          questionText: '[어깨] 아픈 정도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 5,
          options: [
            { value: '약함', label: '약함' },
            { value: '중간', label: '중간' },
            { value: '심함', label: '심함' },
            { value: '매우 심함', label: '매우 심함' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '어깨' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-shoulder-freq',
          questionText: '[어깨] 빈도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 6,
          options: [
            { value: '6개월에 1번', label: '6개월에 1번' },
            { value: '1개월에 1번', label: '1개월에 1번' },
            { value: '1주일에 1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '어깨' }],
            logicType: 'AND',
          },
        },

        // ── 팔/팔꿈치 (arm) ──
        {
          questionCode: 'Q4-1-arm-period',
          questionText: '[팔/팔꿈치] 통증 기간',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 7,
          options: [
            { value: '1일 미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일~1주일' },
            { value: '1주일~1달', label: '1주일~1달' },
            { value: '1달 이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '팔/팔꿈치' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-arm-level',
          questionText: '[팔/팔꿈치] 아픈 정도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 8,
          options: [
            { value: '약함', label: '약함' },
            { value: '중간', label: '중간' },
            { value: '심함', label: '심함' },
            { value: '매우 심함', label: '매우 심함' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '팔/팔꿈치' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-arm-freq',
          questionText: '[팔/팔꿈치] 빈도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 9,
          options: [
            { value: '6개월에 1번', label: '6개월에 1번' },
            { value: '1개월에 1번', label: '1개월에 1번' },
            { value: '1주일에 1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '팔/팔꿈치' }],
            logicType: 'AND',
          },
        },

        // ── 손/손목/손가락 (hand) ──
        {
          questionCode: 'Q4-1-hand-period',
          questionText: '[손/손목/손가락] 통증 기간',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 10,
          options: [
            { value: '1일 미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일~1주일' },
            { value: '1주일~1달', label: '1주일~1달' },
            { value: '1달 이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '손/손목/손가락' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-hand-level',
          questionText: '[손/손목/손가락] 아픈 정도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 11,
          options: [
            { value: '약함', label: '약함' },
            { value: '중간', label: '중간' },
            { value: '심함', label: '심함' },
            { value: '매우 심함', label: '매우 심함' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '손/손목/손가락' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-hand-freq',
          questionText: '[손/손목/손가락] 빈도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 12,
          options: [
            { value: '6개월에 1번', label: '6개월에 1번' },
            { value: '1개월에 1번', label: '1개월에 1번' },
            { value: '1주일에 1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '손/손목/손가락' }],
            logicType: 'AND',
          },
        },

        // ── 허리 (back) ──
        {
          questionCode: 'Q4-1-back-period',
          questionText: '[허리] 통증 기간',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 13,
          options: [
            { value: '1일 미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일~1주일' },
            { value: '1주일~1달', label: '1주일~1달' },
            { value: '1달 이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '허리' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-back-level',
          questionText: '[허리] 아픈 정도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 14,
          options: [
            { value: '약함', label: '약함' },
            { value: '중간', label: '중간' },
            { value: '심함', label: '심함' },
            { value: '매우 심함', label: '매우 심함' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '허리' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-back-freq',
          questionText: '[허리] 빈도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 15,
          options: [
            { value: '6개월에 1번', label: '6개월에 1번' },
            { value: '1개월에 1번', label: '1개월에 1번' },
            { value: '1주일에 1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '허리' }],
            logicType: 'AND',
          },
        },

        // ── 다리/발 (leg) ──
        {
          questionCode: 'Q4-1-leg-period',
          questionText: '[다리/발] 통증 기간',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 16,
          options: [
            { value: '1일 미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일~1주일' },
            { value: '1주일~1달', label: '1주일~1달' },
            { value: '1달 이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '다리/발' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-leg-level',
          questionText: '[다리/발] 아픈 정도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 17,
          options: [
            { value: '약함', label: '약함' },
            { value: '중간', label: '중간' },
            { value: '심함', label: '심함' },
            { value: '매우 심함', label: '매우 심함' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '다리/발' }],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-leg-freq',
          questionText: '[다리/발] 빈도',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 18,
          options: [
            { value: '6개월에 1번', label: '6개월에 1번' },
            { value: '1개월에 1번', label: '1개월에 1번' },
            { value: '1주일에 1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [{ questionId: 'Q4-1', operator: 'contains', value: '다리/발' }],
            logicType: 'AND',
          },
        },

        // ── Q4-2 ~ Q4-6 ──
        {
          questionCode: 'Q4-2',
          questionText:
            '지난 1년 동안 근골격계 증상으로 몸이 아픈데도 나와서 일을 한 적이 있습니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 19,
          options: [
            { value: '아플 때는 쉬었음', label: '아플 때는 쉬었음' },
            { value: '아픈데도 출근했음', label: '아픈데도 출근했음' },
            { value: '아프지 않았음', label: '아프지 않았음' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q4-2-days',
          questionText: '아픈데도 출근한 일수 (일)',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 20,
          options: { min: 1, unit: '일' } as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-2', operator: 'equals', value: '아픈데도 출근했음' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-3',
          questionText: '근골격계 질환으로 산재요양을 신청한 적이 있습니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 21,
          options: [
            { value: '있다', label: '있다' },
            { value: '없다', label: '없다' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q4-3-area',
          questionText: '산재요양 신청 부위 (예: 어깨, 허리 등)',
          questionType: 'TEXT',
          required: false,
          sortOrder: 22,
          options: null,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-3', operator: 'equals', value: '있다' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-4',
          questionText:
            '산재요양을 신청하지 않은 이유는 무엇입니까? (복수선택 가능)',
          questionType: 'CHECKBOX',
          required: false,
          sortOrder: 23,
          options: [
            { value: '증상이 미약해서', label: '증상이 미약해서' },
            { value: '불이익이나 왕따 우려', label: '불이익이나 왕따 우려' },
            { value: '일하기 바빠서', label: '일하기 바빠서' },
            { value: '불승인 우려 때문에', label: '불승인 우려 때문에' },
            { value: '산재처리절차의 어려움', label: '산재처리절차의 어려움' },
            { value: '동료들에게 부담주기 싫어서', label: '동료들에게 부담주기 싫어서' },
            { value: '기타', label: '기타' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-3', operator: 'equals', value: '없다' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-4-other',
          questionText: '기타 이유 (직접 입력)',
          questionType: 'TEXT',
          required: false,
          sortOrder: 24,
          options: null,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-3', operator: 'equals', value: '없다' },
              { questionId: 'Q4-4', operator: 'contains', value: '기타' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-5',
          questionText:
            '산재요양 종료 후 현장 복귀시 부담작업은 얼마나 개선이 되었습니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 25,
          options: [
            { value: '전혀 되지 않았다', label: '전혀 되지 않았다' },
            { value: '개선이 되었으나 여전히 부담스럽다', label: '개선이 되었으나 여전히 부담스럽다' },
            { value: '만족할 정도로 개선되었다', label: '만족할 정도로 개선되었다' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-3', operator: 'equals', value: '있다' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-6',
          questionText:
            '근골격계질환을 줄이기 위해 반드시 개선해야 할 점은 무엇입니까? 중요한 순서대로 3가지만 선택해주세요.',
          questionType: 'RANKED_CHOICE',
          required: false,
          sortOrder: 26,
          options: {
            choices: [
              { value: '산재에 대한 회사의 분위기', label: '산재에 대한 회사의 분위기' },
              { value: '인간공학적 개선', label: '인간공학적 개선' },
              { value: '작업물량 줄이기', label: '작업물량 줄이기' },
              { value: '휴식시간 및 유급휴가 확대', label: '휴식시간 및 유급휴가 확대' },
              { value: '몰아치기 안하기', label: '몰아치기 안하기' },
              { value: '부족한 인력충원', label: '부족한 인력충원' },
              { value: '노동시간단축', label: '노동시간단축' },
              { value: '사내치료시설 확충', label: '사내치료시설 확충' },
              { value: '야간노동 줄이기', label: '야간노동 줄이기' },
              { value: '유해공정 순환근무', label: '유해공정 순환근무' },
              { value: '기타', label: '기타' },
            ],
            rankCount: 3,
          } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q4-6-other',
          questionText: '기타 (직접 입력)',
          questionType: 'TEXT',
          required: false,
          sortOrder: 27,
          options: null,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-6', operator: 'contains', value: '기타' },
            ],
            logicType: 'AND',
          },
        },
      ],
    },
  ],
}
