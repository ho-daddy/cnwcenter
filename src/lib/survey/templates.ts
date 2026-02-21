import type { TemplateStructure } from '@/types/survey'

export const DEFAULT_SURVEY_TEMPLATE: TemplateStructure = {
  sections: [
    // ────────────────────────────────────────────
    // Section 0: 인적사항 (15 questions)
    // ────────────────────────────────────────────
    {
      title: '인적사항',
      description: '개인정보 수집 및 기본 사항을 입력해주세요.',
      sortOrder: 0,
      questions: [
        {
          questionCode: 'S0-consent',
          questionText: '본 설문은 산업안전보건법에 따라 작업환경 개선을 위해 실시됩니다. 수집된 정보는 통계 목적으로만 사용되며, 개인정보는 보호됩니다. 설문 참여에 동의하십니까?',
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
          options: { placeholder: '이름을 입력하세요' } as unknown,
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
          questionText: '나이',
          questionType: 'NUMBER',
          required: true,
          sortOrder: 3,
          options: { min: 18, max: 100, unit: '세' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-serviceYears',
          questionText: '현 사업장 근속연수 (년)',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 4,
          options: { min: 0, max: 100, unit: '년' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-serviceMonths',
          questionText: '현 사업장 근속연수 (개월)',
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
          questionText: '기타 근무형태를 입력해주세요',
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
          questionText: '직위',
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
          questionText: '기타 직위를 입력해주세요',
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
          questionText: '주당 평균 근무시간',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 10,
          options: { min: 0, max: 168, unit: '시간' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-department',
          questionText: '부서명',
          questionType: 'TEXT',
          required: false,
          sortOrder: 11,
          options: null,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-process',
          questionText: '공정(작업)명',
          questionType: 'TEXT',
          required: false,
          sortOrder: 12,
          options: null,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-deptYears',
          questionText: '현 작업 근무기간 (년)',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 13,
          options: { min: 0, max: 100, unit: '년' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'S0-deptMonths',
          questionText: '현 작업 근무기간 (개월)',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 14,
          options: { min: 0, max: 11, unit: '개월' } as unknown,
          conditionalLogic: null,
        },
      ],
    },

    // ────────────────────────────────────────────
    // Section 1: 사고경험 (10 questions)
    // ────────────────────────────────────────────
    {
      title: '사고경험',
      description: '산업재해 및 사고 경험에 대해 답변해주세요.',
      sortOrder: 1,
      questions: [
        {
          questionCode: 'Q1-1',
          questionText: '현재 하고 계신 작업과 관련하여 사고를 당한 경험이 있으면 해당 사고유형을 모두 선택해주세요.',
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
          questionText: '위 사고에 대해 간단히 설명해주세요.',
          questionType: 'TEXT',
          required: false,
          sortOrder: 1,
          options: { multiline: true } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-2',
          questionText: '현재 작업 이외의 공정이나 장소에서 사고를 당한 경험이 있으면 해당 사고유형을 모두 선택해주세요.',
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
          questionText: '사고가 발생한 공정이나 장소를 입력해주세요.',
          questionType: 'TEXT',
          required: false,
          sortOrder: 3,
          options: null,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-2-desc',
          questionText: '위 사고에 대해 간단히 설명해주세요.',
          questionType: 'TEXT',
          required: false,
          sortOrder: 4,
          options: { multiline: true } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-3',
          questionText: '그 밖에 현재 작업과 관련하여 위험하다고 느끼는 유해위험요인이 있으면 적어주세요.',
          questionType: 'TEXT',
          required: false,
          sortOrder: 5,
          options: { multiline: true } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-4',
          questionText: '현재 작업에서 위험(아차)하다고 느낀 경험의 빈도는 어느 정도입니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 6,
          options: [
            { value: '없다', label: '없다' },
            { value: '주1회이상', label: '주 1회 이상' },
            { value: '월1회이상', label: '월 1회 이상' },
            { value: '분기1회이상', label: '분기 1회 이상' },
            { value: '반기1회이상', label: '반기 1회 이상' },
            { value: '년1회이상', label: '년 1회 이상' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-5',
          questionText: '현재 작업에서 사고가 날 뻔한(아차사고) 경험의 빈도는 어느 정도입니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 7,
          options: [
            { value: '없다', label: '없다' },
            { value: '주1회이상', label: '주 1회 이상' },
            { value: '월1회이상', label: '월 1회 이상' },
            { value: '분기1회이상', label: '분기 1회 이상' },
            { value: '반기1회이상', label: '반기 1회 이상' },
            { value: '년1회이상', label: '년 1회 이상' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q1-6',
          questionText: '현재 작업과 관련하여 산업재해를 당한 경험이 있습니까?',
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
          questionText: '산업재해 횟수를 입력해주세요.',
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
      description: '질환 및 유해요인에 대해 답변해주세요.',
      sortOrder: 2,
      questions: [
        {
          questionCode: 'Q2-1',
          questionText: '현재 앓고 있거나 과거에 진단받은 질환이 있으면 모두 선택해주세요.',
          questionType: 'CHECKBOX',
          required: false,
          sortOrder: 0,
          options: [
            { value: '소음성 난청', label: '소음성 난청' },
            { value: '피부질환', label: '피부질환' },
            { value: '호흡기질환(진폐, 천식 등)', label: '호흡기질환(진폐, 천식 등)' },
            { value: '근골격계질환', label: '근골격계질환' },
            { value: '뇌심혈관질환', label: '뇌심혈관질환' },
            { value: '간질환', label: '간질환' },
            { value: '비뇨생식기질환', label: '비뇨생식기질환' },
            { value: '신경정신질환', label: '신경정신질환' },
            { value: '눈질환', label: '눈질환' },
            { value: '암', label: '암' },
            { value: '기타', label: '기타' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q2-1-other',
          questionText: '기타 질환을 입력해주세요.',
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
          questionText: '현재 작업에서 소음이 발생하는 곳(설비, 공정 등)이 있으면 적어주세요.',
          questionType: 'TEXT',
          required: false,
          sortOrder: 2,
          options: { multiline: true } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q2-3',
          questionText: '현재 작업에서 사용하는 화학제품(유기용제, 세정제, 윤활유 등)이 있으면 적어주세요.',
          questionType: 'TABLE',
          required: false,
          sortOrder: 3,
          options: {
            columns: [
              { key: 'name', label: '제품명' },
              { key: 'use', label: '용도' },
            ],
            rowCount: 3,
          } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q2-4',
          questionText: '그 밖에 현재 작업과 관련된 유해요인(분진, 고온, 진동, 방사선 등)이 있으면 적어주세요.',
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
          questionText: '현재 작업의 육체적 피로도는 어느 정도입니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 0,
          options: [
            { value: '전혀없다', label: '전혀 없다' },
            { value: '간혹', label: '간혹 느낀다' },
            { value: '종종', label: '종종 느낀다' },
            { value: '항상', label: '항상 느낀다' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q3-1b',
          questionText: '현재 작업의 정신적 피로도는 어느 정도입니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 1,
          options: [
            { value: '전혀없다', label: '전혀 없다' },
            { value: '간혹', label: '간혹 느낀다' },
            { value: '종종', label: '종종 느낀다' },
            { value: '항상', label: '항상 느낀다' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q3-2',
          questionText: '현재 본인의 업무 능력을 100%로 볼 때, 현재 작업에서 발휘하고 있는 정도는 몇 %입니까?',
          questionType: 'RANGE',
          required: false,
          sortOrder: 2,
          options: { min: 0, max: 100, step: 5, unit: '%' } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q3-3',
          questionText: '현재 작업의 노동강도에 대한 의견은 어떻습니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 3,
          options: [
            { value: '매우 적절하다', label: '매우 적절하다' },
            { value: '대체로 적절하다', label: '대체로 적절하다' },
            { value: '다소 과중하다', label: '다소 과중하다' },
            { value: '매우 과중하다', label: '매우 과중하다' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q3-4',
          questionText: '노동강도가 과중하다고 느끼는 이유를 중요한 순서대로 3가지를 선택해주세요.',
          questionType: 'RANKED_CHOICE',
          required: false,
          sortOrder: 4,
          options: {
            choices: [
              { value: '인원 부족', label: '인원 부족' },
              { value: '업무량 과다', label: '업무량 과다' },
              { value: '교대제 문제', label: '교대제 문제' },
              { value: '잦은 야근/특근', label: '잦은 야근/특근' },
              { value: '촉박한 납기', label: '촉박한 납기' },
              { value: '불합리한 업무분장', label: '불합리한 업무분장' },
              { value: '기타', label: '기타' },
            ],
            rankCount: 3,
          } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q3-4-other',
          questionText: '기타 사유를 입력해주세요.',
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
      description: '지난 1년 동안의 근골격계 증상에 대해 답변해주세요.',
      sortOrder: 4,
      questions: [
        // Q4-1: 증상 부위 선택
        {
          questionCode: 'Q4-1',
          questionText: '지난 1년 동안 통증이나 불편함을 느낀 신체 부위를 모두 선택해주세요.',
          questionType: 'CHECKBOX',
          required: false,
          sortOrder: 0,
          options: [
            { value: '목', label: '목' },
            { value: '어깨', label: '어깨' },
            { value: '팔·팔꿈치', label: '팔·팔꿈치' },
            { value: '손·손목·손가락', label: '손·손목·손가락' },
            { value: '허리', label: '허리' },
            { value: '다리·발', label: '다리·발' },
          ] as unknown,
          conditionalLogic: null,
        },

        // ── 목 (neck) ──
        {
          questionCode: 'Q4-1-neck-period',
          questionText: '[목] 증상이 지속되거나 반복된 기간은 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 1,
          options: [
            { value: '1일미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일 ~ 1주일' },
            { value: '1주일~1달', label: '1주일 ~ 1달' },
            { value: '1달이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '목' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-neck-level',
          questionText: '[목] 증상의 정도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 2,
          options: [
            { value: '약함', label: '약함 - 약간 불편함을 느낌' },
            { value: '중간', label: '중간 - 자주 불편하고 가끔 진통제를 복용' },
            { value: '심함', label: '심함 - 많이 불편하고 자주 진통제를 복용' },
            { value: '매우심함', label: '매우 심함 - 일상생활에 지장을 줌' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '목' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-neck-frequency',
          questionText: '[목] 증상이 나타나는 빈도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 3,
          options: [
            { value: '6개월에1번', label: '6개월에 1번' },
            { value: '1개월에1번', label: '1개월에 1번' },
            { value: '1주일에1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '목' },
            ],
            logicType: 'AND',
          },
        },

        // ── 어깨 (shoulder) ──
        {
          questionCode: 'Q4-1-shoulder-period',
          questionText: '[어깨] 증상이 지속되거나 반복된 기간은 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 4,
          options: [
            { value: '1일미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일 ~ 1주일' },
            { value: '1주일~1달', label: '1주일 ~ 1달' },
            { value: '1달이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '어깨' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-shoulder-level',
          questionText: '[어깨] 증상의 정도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 5,
          options: [
            { value: '약함', label: '약함 - 약간 불편함을 느낌' },
            { value: '중간', label: '중간 - 자주 불편하고 가끔 진통제를 복용' },
            { value: '심함', label: '심함 - 많이 불편하고 자주 진통제를 복용' },
            { value: '매우심함', label: '매우 심함 - 일상생활에 지장을 줌' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '어깨' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-shoulder-frequency',
          questionText: '[어깨] 증상이 나타나는 빈도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 6,
          options: [
            { value: '6개월에1번', label: '6개월에 1번' },
            { value: '1개월에1번', label: '1개월에 1번' },
            { value: '1주일에1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '어깨' },
            ],
            logicType: 'AND',
          },
        },

        // ── 팔·팔꿈치 (arm) ──
        {
          questionCode: 'Q4-1-arm-period',
          questionText: '[팔·팔꿈치] 증상이 지속되거나 반복된 기간은 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 7,
          options: [
            { value: '1일미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일 ~ 1주일' },
            { value: '1주일~1달', label: '1주일 ~ 1달' },
            { value: '1달이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '팔·팔꿈치' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-arm-level',
          questionText: '[팔·팔꿈치] 증상의 정도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 8,
          options: [
            { value: '약함', label: '약함 - 약간 불편함을 느낌' },
            { value: '중간', label: '중간 - 자주 불편하고 가끔 진통제를 복용' },
            { value: '심함', label: '심함 - 많이 불편하고 자주 진통제를 복용' },
            { value: '매우심함', label: '매우 심함 - 일상생활에 지장을 줌' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '팔·팔꿈치' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-arm-frequency',
          questionText: '[팔·팔꿈치] 증상이 나타나는 빈도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 9,
          options: [
            { value: '6개월에1번', label: '6개월에 1번' },
            { value: '1개월에1번', label: '1개월에 1번' },
            { value: '1주일에1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '팔·팔꿈치' },
            ],
            logicType: 'AND',
          },
        },

        // ── 손·손목·손가락 (hand) ──
        {
          questionCode: 'Q4-1-hand-period',
          questionText: '[손·손목·손가락] 증상이 지속되거나 반복된 기간은 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 10,
          options: [
            { value: '1일미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일 ~ 1주일' },
            { value: '1주일~1달', label: '1주일 ~ 1달' },
            { value: '1달이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '손·손목·손가락' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-hand-level',
          questionText: '[손·손목·손가락] 증상의 정도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 11,
          options: [
            { value: '약함', label: '약함 - 약간 불편함을 느낌' },
            { value: '중간', label: '중간 - 자주 불편하고 가끔 진통제를 복용' },
            { value: '심함', label: '심함 - 많이 불편하고 자주 진통제를 복용' },
            { value: '매우심함', label: '매우 심함 - 일상생활에 지장을 줌' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '손·손목·손가락' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-hand-frequency',
          questionText: '[손·손목·손가락] 증상이 나타나는 빈도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 12,
          options: [
            { value: '6개월에1번', label: '6개월에 1번' },
            { value: '1개월에1번', label: '1개월에 1번' },
            { value: '1주일에1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '손·손목·손가락' },
            ],
            logicType: 'AND',
          },
        },

        // ── 허리 (back) ──
        {
          questionCode: 'Q4-1-back-period',
          questionText: '[허리] 증상이 지속되거나 반복된 기간은 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 13,
          options: [
            { value: '1일미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일 ~ 1주일' },
            { value: '1주일~1달', label: '1주일 ~ 1달' },
            { value: '1달이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '허리' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-back-level',
          questionText: '[허리] 증상의 정도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 14,
          options: [
            { value: '약함', label: '약함 - 약간 불편함을 느낌' },
            { value: '중간', label: '중간 - 자주 불편하고 가끔 진통제를 복용' },
            { value: '심함', label: '심함 - 많이 불편하고 자주 진통제를 복용' },
            { value: '매우심함', label: '매우 심함 - 일상생활에 지장을 줌' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '허리' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-back-frequency',
          questionText: '[허리] 증상이 나타나는 빈도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 15,
          options: [
            { value: '6개월에1번', label: '6개월에 1번' },
            { value: '1개월에1번', label: '1개월에 1번' },
            { value: '1주일에1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '허리' },
            ],
            logicType: 'AND',
          },
        },

        // ── 다리·발 (leg) ──
        {
          questionCode: 'Q4-1-leg-period',
          questionText: '[다리·발] 증상이 지속되거나 반복된 기간은 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 16,
          options: [
            { value: '1일미만', label: '1일 미만' },
            { value: '1일~1주일', label: '1일 ~ 1주일' },
            { value: '1주일~1달', label: '1주일 ~ 1달' },
            { value: '1달이상', label: '1달 이상' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '다리·발' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-leg-level',
          questionText: '[다리·발] 증상의 정도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 17,
          options: [
            { value: '약함', label: '약함 - 약간 불편함을 느낌' },
            { value: '중간', label: '중간 - 자주 불편하고 가끔 진통제를 복용' },
            { value: '심함', label: '심함 - 많이 불편하고 자주 진통제를 복용' },
            { value: '매우심함', label: '매우 심함 - 일상생활에 지장을 줌' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '다리·발' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-1-leg-frequency',
          questionText: '[다리·발] 증상이 나타나는 빈도는 어느 정도입니까?',
          questionType: 'DROPDOWN',
          required: false,
          sortOrder: 18,
          options: [
            { value: '6개월에1번', label: '6개월에 1번' },
            { value: '1개월에1번', label: '1개월에 1번' },
            { value: '1주일에1번', label: '1주일에 1번' },
            { value: '매일', label: '매일' },
          ] as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-1', operator: 'contains', value: '다리·발' },
            ],
            logicType: 'AND',
          },
        },

        // ── Q4-2 ~ Q4-6 ──
        {
          questionCode: 'Q4-2',
          questionText: '지난 1년 동안 위의 증상으로 인해 어떻게 하셨습니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 19,
          options: [
            { value: '아플때쉬었음', label: '아플 때 쉬었음' },
            { value: '아픈데도 출근했음', label: '아픈데도 출근했음' },
            { value: '아프지않았음', label: '아프지 않았음' },
          ] as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q4-2-days',
          questionText: '아픈데도 출근한 일수는 몇 일입니까?',
          questionType: 'NUMBER',
          required: false,
          sortOrder: 20,
          options: { min: 1 } as unknown,
          conditionalLogic: {
            conditions: [
              { questionId: 'Q4-2', operator: 'equals', value: '아픈데도 출근했음' },
            ],
            logicType: 'AND',
          },
        },
        {
          questionCode: 'Q4-3',
          questionText: '위의 증상으로 산재(산업재해보상보험) 처리를 받은 적이 있습니까?',
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
          questionText: '산재 처리를 받은 부위를 입력해주세요.',
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
          questionText: '산재 처리를 받지 않은 이유를 모두 선택해주세요.',
          questionType: 'CHECKBOX',
          required: false,
          sortOrder: 23,
          options: [
            { value: '증상이 가벼워서', label: '증상이 가벼워서' },
            { value: '산재 신청 절차를 몰라서', label: '산재 신청 절차를 몰라서' },
            { value: '회사 눈치가 보여서', label: '회사 눈치가 보여서' },
            { value: '산재 승인이 안 될 것 같아서', label: '산재 승인이 안 될 것 같아서' },
            { value: '개인 병원에서 치료 중이라서', label: '개인 병원에서 치료 중이라서' },
            { value: '일(작업)과 관련 없다고 생각해서', label: '일(작업)과 관련 없다고 생각해서' },
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
          questionText: '기타 사유를 입력해주세요.',
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
          questionText: '산재 처리 이후 증상이 개선되었습니까?',
          questionType: 'RADIO',
          required: false,
          sortOrder: 25,
          options: [
            { value: '많이 개선되었다', label: '많이 개선되었다' },
            { value: '다소 개선되었다', label: '다소 개선되었다' },
            { value: '개선되지 않았다', label: '개선되지 않았다' },
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
          questionText: '근골격계 증상의 원인이라고 생각하는 것을 중요한 순서대로 3가지를 선택해주세요.',
          questionType: 'RANKED_CHOICE',
          required: false,
          sortOrder: 26,
          options: {
            choices: [
              { value: '반복적인 동작', label: '반복적인 동작' },
              { value: '부적절한 작업자세', label: '부적절한 작업자세' },
              { value: '과도한 힘 사용', label: '과도한 힘 사용' },
              { value: '진동 공구 사용', label: '진동 공구 사용' },
              { value: '장시간 같은 자세', label: '장시간 같은 자세' },
              { value: '무거운 물건 운반', label: '무거운 물건 운반' },
              { value: '작업대/의자 불편', label: '작업대/의자 불편' },
              { value: '온도/습도 문제', label: '온도/습도 문제' },
              { value: '스트레스', label: '스트레스' },
              { value: '휴식 부족', label: '휴식 부족' },
              { value: '기타', label: '기타' },
            ],
            rankCount: 3,
          } as unknown,
          conditionalLogic: null,
        },
        {
          questionCode: 'Q4-6-other',
          questionText: '기타 원인을 입력해주세요.',
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
