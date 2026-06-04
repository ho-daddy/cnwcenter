'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ── 타입 ──────────────────────────────────────────────────────
interface SurveyListItem {
  id: string
  title: string
  year: number
  accessToken: string
  _count?: { responses: number }
}

interface Choice {
  value: string
  label?: string
}

interface Question {
  id: string
  questionCode: string
  questionText: string
  questionType: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any
  required: boolean
}

interface Section {
  id: string
  title: string
  questions: Question[]
}

interface Structure {
  id: string
  title: string
  sections: Section[]
}

interface Person {
  pages: [number, number] // [startPage, endPage]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answers: Record<string, any>
  respondentName: string | null
  codeToId: Record<string, string>
  submitted: boolean
}

// ── 증상표 상수 ───────────────────────────────────────────────
const SYMPTOM_BODIES = [
  { key: 'neck', label: '목' },
  { key: 'shoulder', label: '어깨' },
  { key: 'arm', label: '팔/팔꿈치' },
  { key: 'hand', label: '손/손목/손가락' },
  { key: 'back', label: '허리' },
  { key: 'leg', label: '다리/발' },
]
const SYMPTOM_ATTRS = [
  { key: 'period', label: '지속기간' },
  { key: 'level', label: '심한정도' },
  { key: 'freq', label: '빈도' },
]
const isSymptomDetail = (code: string) => /^Q4-1-[a-z]+-/.test(code)

function getChoices(q: Question): Choice[] {
  const o = q.options
  if (!o) return []
  if (Array.isArray(o)) return o
  if (o.choices) return o.choices
  return []
}

export default function PaperInputPage() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([])
  const [surveyId, setSurveyId] = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [structure, setStructure] = useState<Structure | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pagesPerPerson, setPagesPerPerson] = useState(4)

  const [persons, setPersons] = useState<Person[]>([])
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [status, setStatus] = useState('설문을 선택하고 PDF를 업로드하세요.')
  const [ocrRunning, setOcrRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  // PDF 뷰어 (pdfjs-dist, iframe 대체)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef = useRef<any>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [pdfReady, setPdfReady] = useState(false)
  const renderCancelRef = useRef(false)
  // 강제 리렌더용 (persons 내부 객체 mutate 후)
  const [, forceTick] = useState(0)
  const rerender = useCallback(() => forceTick((t) => t + 1), [])

  const cur = currentIdx >= 0 ? persons[currentIdx] : null

  // ── 초기화: 설문 목록 ──────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/paper-ocr/surveys')
        if (!res.ok) throw new Error(await res.text())
        setSurveys(await res.json())
      } catch (e) {
        setStatus('설문 목록 오류: ' + (e instanceof Error ? e.message : String(e)))
      }
    })()
  }, [])

  // ── PDF 로드 (pdfjs-dist) ──────────────────────────────────
  useEffect(() => {
    if (!sessionId) { pdfRef.current = null; setPdfReady(false); return }
    setPdfReady(false)
    pdfRef.current = null
    ;(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfjs: any = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        const resp = await fetch(`/api/paper-ocr/file/${sessionId}`)
        const data = await resp.arrayBuffer()
        pdfRef.current = await pdfjs.getDocument({ data }).promise
        setPdfReady(true)
      } catch (e) {
        setStatus('PDF 뷰어 로드 실패: ' + (e instanceof Error ? e.message : String(e)))
      }
    })()
  }, [sessionId])

  // ── PDF 페이지 렌더링 ──────────────────────────────────────
  useEffect(() => {
    if (!pdfReady || !pdfRef.current || !canvasContainerRef.current) return
    renderCancelRef.current = true  // 이전 렌더 취소
    const cancelled = { v: false }
    renderCancelRef.current = false

    const container = canvasContainerRef.current
    container.innerHTML = ''
    const startPage = cur?.pages[0] ?? 1
    const endPage = cur?.pages[1] ?? pdfRef.current.numPages
    ;(async () => {
      for (let p = startPage; p <= endPage; p++) {
        if (cancelled.v) break
        const page = await pdfRef.current.getPage(p)
        const vp = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = vp.width
        canvas.height = vp.height
        canvas.style.width = '100%'
        canvas.style.display = 'block'
        if (p < endPage) canvas.style.marginBottom = '2px'
        container.appendChild(canvas)
        const ctx = canvas.getContext('2d')
        if (ctx) await page.render({ canvasContext: ctx, viewport: vp }).promise
      }
      if (!cancelled.v) container.scrollTop = 0
    })()
    return () => { cancelled.v = true }
  }, [pdfReady, cur])

  // ── 설문 선택 → 구조 로드 ──────────────────────────────────
  async function onSurveyChange(id: string) {
    setSurveyId(id)
    const s = surveys.find((x) => x.id === id)
    setAccessToken(s?.accessToken ?? null)
    setStructure(null)
    if (!id) return
    try {
      const res = await fetch(`/api/paper-ocr/surveys/${id}/structure`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStructure(data.structure)
    } catch (e) {
      setStatus('설문 구조 오류: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  // ── PDF 업로드 ─────────────────────────────────────────────
  async function onPdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('PDF 업로드 중...')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/paper-ocr/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setSessionId(data.sessionId)
      setPageCount(data.pageCount)
      setPersons([])
      setCurrentIdx(-1)
      setStatus(`PDF 업로드 완료: 총 ${data.pageCount}페이지. "분할"을 눌러주세요.`)
    } catch (err) {
      setStatus('업로드 실패: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const splitReady = !!sessionId && pageCount > 0 && !!surveyId
  const ocrReady = splitReady && persons.length > 0

  // ── 분할 ──────────────────────────────────────────────────
  function onSplit() {
    const ppp = pagesPerPerson || 4
    const count = Math.floor(pageCount / ppp)
    if (count === 0) {
      setStatus(`총 ${pageCount}페이지 / ${ppp}페이지 = 0명. 페이지 수를 확인하세요.`)
      return
    }
    const rem = pageCount % ppp
    if (rem !== 0) setStatus(`총 ${pageCount}페이지 / ${ppp} = ${count}명 (나머지 ${rem}페이지 무시)`)
    else setStatus(`${pageCount}페이지 → ${count}명 분할 완료. OCR 분석을 시작하세요.`)

    const next: Person[] = Array.from({ length: count }, (_, i) => ({
      pages: [i * ppp + 1, (i + 1) * ppp],
      answers: {},
      respondentName: null,
      codeToId: {},
      submitted: false,
    }))
    setPersons(next)
    setCurrentIdx(-1)
  }

  // ── OCR (병렬) ─────────────────────────────────────────────
  async function onOcr() {
    if (!surveyId || !sessionId || persons.length === 0) return
    setOcrRunning(true)
    setStatus(`${persons.length}명 병렬 OCR 분석 중... (잠시 기다려주세요)`)
    try {
      const res = await fetch('/api/paper-ocr/ocr-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          surveyId,
          personsPageRanges: persons.map((p) => ({ startPage: p.pages[0], endPage: p.pages[1] })),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStructure(data.structure)
      const updated = persons.map((p, i) => {
        const r = data.results[i] || {}
        return {
          ...p,
          codeToId: data.codeToId,
          answers: r.answers || {},
          respondentName: r.respondentName || null,
        }
      })
      setPersons(updated)
      setCurrentIdx(0)
      setStatus(`OCR 완료 (${persons.length}명). 응답자 목록에서 한 명씩 검수 후 제출하세요.`)
    } catch (e) {
      setStatus('OCR 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setOcrRunning(false)
    }
  }

  function selectPerson(idx: number) {
    setCurrentIdx(idx)
    setSubmitMsg(persons[idx]?.submitted ? '이미 제출됨' : '')
  }

  // ── 답변 변경 헬퍼 (현재 응답자 mutate) ────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function setAnswer(code: string, value: any) {
    if (!cur) return
    cur.answers[code] = value
    rerender()
  }

  function setName(name: string) {
    if (!cur) return
    cur.respondentName = name || null
    rerender()
  }

  // ── 제출 ───────────────────────────────────────────────────
  async function onSubmit() {
    if (!accessToken || !cur || cur.submitted) return
    setSubmitting(true)
    setStatus('시스템에 제출 중...')
    try {
      const res = await fetch('/api/paper-ocr/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          respondentName: cur.respondentName,
          answers: cur.answers,
          codeToId: cur.codeToId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      cur.submitted = true
      rerender()
      setSubmitMsg(`제출 완료 (${data.answerCount}개)`)
      setStatus(`${cur.respondentName || `${currentIdx + 1}번`} 제출 완료!`)
      // 다음 미제출 응답자로 이동
      const nextIdx = persons.findIndex((p, i) => i > currentIdx && !p.submitted)
      if (nextIdx >= 0) setTimeout(() => selectPerson(nextIdx), 800)
    } catch (e) {
      setStatus('제출 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSubmitting(false)
    }
  }

  // ── 렌더 ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#e8e8f0] text-[#222] text-[15px]">
      {/* 헤더 */}
      <header className="bg-[#2a1a5e] border-b-2 border-[#4a2f9a] px-4 py-2.5 flex items-center gap-2.5 flex-wrap">
        <h1 className="text-base text-[#e8d5ff] whitespace-nowrap font-semibold">종이설문 입력</h1>
        <select
          value={surveyId}
          onChange={(e) => onSurveyChange(e.target.value)}
          className="bg-white border border-gray-300 text-[#222] px-3 py-1.5 rounded-md text-sm"
        >
          <option value="">— 설문 선택 —</option>
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({s.year}년, {s._count?.responses ?? 0}명)
            </option>
          ))}
        </select>
        <label className="bg-white border border-gray-300 text-[#333] px-3.5 py-1.5 rounded-md text-sm cursor-pointer hover:border-[#7c5cbf] hover:text-[#5c35a0]">
          PDF 선택
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={onPdfChange} />
        </label>
        <span className="text-[0.85rem] text-[#c8b8f0] whitespace-nowrap">1인당 페이지:</span>
        <input
          type="number"
          min={1}
          max={50}
          value={pagesPerPerson}
          onChange={(e) => setPagesPerPerson(parseInt(e.target.value) || 1)}
          className="bg-white border border-gray-300 text-[#222] px-2 py-1.5 rounded-md text-sm w-[60px] text-center"
        />
        <button
          onClick={onSplit}
          disabled={!splitReady}
          className="bg-white border border-gray-300 text-[#333] px-3.5 py-1.5 rounded-md text-sm cursor-pointer hover:border-[#7c5cbf] hover:text-[#5c35a0] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          분할
        </button>
        <button
          onClick={onOcr}
          disabled={!ocrReady || ocrRunning}
          className="bg-[#6a3dbd] border border-[#6a3dbd] text-white px-3.5 py-1.5 rounded-md text-sm cursor-pointer hover:bg-[#7c5cbf] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {ocrRunning ? 'OCR 분석 중...' : 'OCR 분석'}
        </button>
        <span className="text-[0.82rem] text-[#c8b8f0]">
          {pageCount > 0 && persons.length > 0
            ? `총 ${pageCount}페이지 / ${persons.length}명`
            : pageCount > 0
            ? `총 ${pageCount}페이지`
            : ''}
        </span>
      </header>

      {/* 상태바 */}
      <div className="px-4 py-1.5 text-[0.82rem] text-[#555] bg-[#dde] border-b border-[#ccd] min-h-[26px]">
        {status}
      </div>

      {/* 본문 3패널 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌: 응답자 목록 */}
        <div className="w-40 min-w-[140px] bg-[#2a1a5e] border-r border-[#4a2f9a] flex flex-col overflow-hidden">
          <div className="px-2.5 py-2 text-[0.78rem] text-[#b39ddb] font-bold uppercase border-b border-[#3a2a7a]">
            응답자 목록
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
            {persons.length === 0 ? (
              <div className="px-2.5 py-3 text-[0.8rem] text-[#6040a0] text-center">
                업로드 후
                <br />
                분할하세요
              </div>
            ) : (
              persons.map((p, i) => {
                const statusText = p.submitted
                  ? '제출완료'
                  : Object.keys(p.answers).length > 0
                  ? 'OCR완료'
                  : '대기중'
                const active = i === currentIdx
                return (
                  <div
                    key={i}
                    onClick={() => selectPerson(i)}
                    className={
                      'px-2.5 py-1.5 rounded-md cursor-pointer border text-[0.82rem] transition-colors ' +
                      (active
                        ? 'bg-[#6a3dbd] border-[#9070d0] text-white'
                        : 'border-transparent hover:bg-[#3a2a7a] ' +
                          (p.submitted ? 'text-[#7ae0a0]' : 'text-[#c8b8f0]'))
                    }
                  >
                    <div className="font-semibold truncate">{p.respondentName || `${i + 1}번`}</div>
                    <div className="text-[0.72rem] mt-0.5 opacity-70">{statusText}</div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 중: PDF 뷰어 */}
        <div className="flex-1 border-r-2 border-[#aab] flex flex-col overflow-hidden bg-[#111]">
          <div className="bg-[#1a1a2e] px-2.5 py-1.5 flex items-center gap-2 border-b border-[#2a2a4a] text-[0.88rem] text-[#ccc]">
            {cur ? (
              <span>
                {currentIdx + 1}번 응답자 — 페이지 {cur.pages[0]}~{cur.pages[1]}
              </span>
            ) : (
              <span className="opacity-60">PDF 미리보기</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden bg-[#0a0a10]">
            {sessionId ? (
              <div
                ref={canvasContainerRef}
                className="w-full h-full overflow-y-auto bg-white"
              />
            ) : (
              <div className="text-[#555] text-[0.95rem] h-full flex items-center justify-center text-center leading-loose">
                PDF 업로드 후
                <br />
                미리보기가 표시됩니다
              </div>
            )}
          </div>
        </div>

        {/* 우: 폼 */}
        <div className="w-[45%] min-w-[320px] flex flex-col overflow-hidden bg-[#f8f8fc]">
          <div className="bg-white px-3 py-1.5 border-b border-gray-200 text-[0.88rem] shadow-sm">
            {cur ? (
              <span className="text-[#444]">
                {currentIdx + 1}번 응답자 — {cur.respondentName || '이름 미입력'}
              </span>
            ) : (
              <span className="text-[#888]">응답자를 선택하면 폼이 표시됩니다</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3.5">
            {!structure || !cur ? (
              <div className="text-[#aaa] text-[0.95rem] text-center mt-10">
                왼쪽에서 응답자를 선택하세요
              </div>
            ) : (
              <FormBody
                structure={structure}
                person={cur}
                onAnswer={setAnswer}
                onName={setName}
              />
            )}
          </div>
          <div className="px-3.5 py-2.5 bg-white border-t border-gray-200 flex items-center gap-2.5 shadow-[0_-1px_4px_rgba(0,0,0,0.06)]">
            <button
              onClick={onSubmit}
              disabled={!cur || cur.submitted || submitting}
              className="bg-[#2a7a4a] text-white px-5 py-2 rounded-md text-[0.92rem] cursor-pointer hover:bg-[#3a9a5a] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '제출 중...' : '시스템에 제출'}
            </button>
            <span className="text-[0.88rem] text-[#2a7a4a]">{submitMsg}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 폼 본문 ───────────────────────────────────────────────────
function FormBody({
  structure,
  person,
  onAnswer,
  onName,
}: {
  structure: Structure
  person: Person
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnswer: (code: string, value: any) => void
  onName: (name: string) => void
}) {
  return (
    <div>
      {/* 응답자 이름 */}
      <div className="bg-[#eef8ee] border border-[#8cc8a0] rounded-md px-3 py-2.5 mb-3.5 flex items-center gap-2.5">
        <label className="text-[0.92rem] text-[#2a6a3a] whitespace-nowrap font-semibold">응답자 이름:</label>
        <input
          value={person.respondentName || ''}
          onChange={(e) => onName(e.target.value)}
          placeholder="이름 (선택)"
          className="bg-white border border-gray-300 text-[#222] rounded px-2.5 py-1.5 text-[0.92rem] max-w-[200px]"
        />
      </div>

      {structure.sections.map((section) => {
        const hasSymptom = section.questions.some((q) => q.questionCode === 'Q4-1')
        return (
          <div key={section.id} className="mb-[22px]">
            <div className="text-[0.85rem] font-bold text-[#5c35a0] uppercase tracking-wide pb-1.5 border-b-2 border-[#c5b0e8] mb-3">
              {section.title}
            </div>
            {hasSymptom ? (
              <SymptomSection section={section} person={person} onAnswer={onAnswer} />
            ) : (
              section.questions.map((q) => (
                <QuestionRow key={q.id} q={q} person={person} onAnswer={onAnswer} />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── 증상표 섹션 ───────────────────────────────────────────────
function SymptomSection({
  section,
  person,
  onAnswer,
}: {
  section: Section
  person: Person
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnswer: (code: string, value: any) => void
}) {
  const q4_1 = section.questions.find((q) => q.questionCode === 'Q4-1')
  const q4Selected: string[] = Array.isArray(person.answers['Q4-1']) ? person.answers['Q4-1'] : []

  const toggleBody = (label: string) => {
    const arr = Array.isArray(person.answers['Q4-1']) ? [...person.answers['Q4-1']] : []
    if (arr.includes(label)) onAnswer('Q4-1', arr.filter((x) => x !== label))
    else onAnswer('Q4-1', [...arr, label])
  }

  const remaining = section.questions.filter(
    (q) => q.questionCode !== 'Q4-1' && !isSymptomDetail(q.questionCode)
  )

  return (
    <div>
      {q4_1 && <QuestionRow q={q4_1} person={person} onAnswer={onAnswer} />}
      <div className="overflow-x-auto my-2">
        <table className="border-collapse w-full text-[0.8rem]">
          <thead>
            <tr>
              <th className="border border-gray-300 px-1.5 py-1 bg-[#e8e0f8] text-[#4a2a8a] font-bold text-center" />
              {SYMPTOM_BODIES.map((b) => (
                <th
                  key={b.key}
                  className="border border-gray-300 px-1.5 py-1 bg-[#e8e0f8] text-[#4a2a8a] font-bold text-center"
                >
                  {b.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="border border-gray-300 px-1.5 py-1 bg-[#f4f0fc] text-[#5c35a0] font-semibold whitespace-nowrap text-left">
                통증여부
              </th>
              {SYMPTOM_BODIES.map((b) => {
                const selected = q4Selected.includes(b.label)
                return (
                  <td key={b.key} className="border border-gray-300 px-1.5 py-1 text-center bg-white">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggleBody(b.label)}
                      className={
                        'text-[0.8rem] px-2.5 py-0.5 rounded-full border ' +
                        (selected
                          ? 'bg-[#2a7a4a] border-[#2a7a4a] text-white'
                          : 'bg-[#f0eefa] border-[#c8bae8] text-[#5c35a0]')
                      }
                    >
                      {selected ? '있다' : '없다'}
                    </button>
                  </td>
                )
              })}
            </tr>
            {SYMPTOM_ATTRS.map((attr) => (
              <tr key={attr.key}>
                <th className="border border-gray-300 px-1.5 py-1 bg-[#f4f0fc] text-[#5c35a0] font-semibold whitespace-nowrap text-left">
                  {attr.label}
                </th>
                {SYMPTOM_BODIES.map((b) => {
                  const code = `Q4-1-${b.key}-${attr.key}`
                  const q = section.questions.find((x) => x.questionCode === code)
                  return (
                    <td key={b.key} className="border border-gray-300 px-1.5 py-1 text-center bg-white">
                      {q ? (
                        <DropdownSelect q={q} person={person} onAnswer={onAnswer} small />
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {remaining.map((q) => (
        <QuestionRow key={q.id} q={q} person={person} onAnswer={onAnswer} />
      ))}
    </div>
  )
}

// ── 드롭다운 ──────────────────────────────────────────────────
function DropdownSelect({
  q,
  person,
  onAnswer,
  small,
}: {
  q: Question
  person: Person
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnswer: (code: string, value: any) => void
  small?: boolean
}) {
  const code = q.questionCode
  const val = person.answers[code]
  const choices = getChoices(q)
  return (
    <select
      value={typeof val === 'string' ? val : ''}
      onChange={(e) => onAnswer(code, e.target.value || null)}
      className={
        'bg-white border border-gray-300 text-[#222] rounded ' +
        (small ? 'px-1 py-0.5 text-[0.78rem] w-full min-w-[80px]' : 'px-2.5 py-1.5 text-[0.92rem] w-full')
      }
    >
      <option value="">—</option>
      {choices.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label || c.value}
        </option>
      ))}
    </select>
  )
}

// ── 질문 행 ───────────────────────────────────────────────────
function QuestionRow({
  q,
  person,
  onAnswer,
}: {
  q: Question
  person: Person
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnswer: (code: string, value: any) => void
}) {
  const val = person.answers[q.questionCode]
  const isNull = val === null || val === undefined
  return (
    <div className="py-1.5 border-b border-[#e8e8f0] flex flex-col gap-1.5 last:border-b-0">
      <div className="text-[0.88rem] text-[#444] flex items-baseline gap-1.5 flex-wrap">
        <span className="text-[0.72rem] text-[#aaa] font-mono">{q.questionCode}</span>
        <span>{q.questionText}</span>
        {q.required && <span className="text-[#d03030] text-[0.8rem]">*</span>}
        {isNull && (
          <span className="inline-block text-[0.72rem] text-[#c05010] bg-[#fff3e0] border border-[#e0a060] rounded px-1.5 py-px">
            판독불가
          </span>
        )}
      </div>
      <QuestionInput q={q} person={person} onAnswer={onAnswer} />
    </div>
  )
}

// ── 타입별 입력 ───────────────────────────────────────────────
function QuestionInput({
  q,
  person,
  onAnswer,
}: {
  q: Question
  person: Person
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnswer: (code: string, value: any) => void
}) {
  const code = q.questionCode
  const type = q.questionType
  const val = person.answers[code]

  if (type === 'RADIO') {
    const choices = getChoices(q)
    return (
      <div className="flex gap-1.5 flex-wrap items-center">
        <div className="flex flex-wrap gap-1.5">
          {choices.map((c) => {
            const selected = val === c.value
            return (
              <button
                key={c.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onAnswer(code, selected ? null : c.value)}
                className={
                  'px-3 py-1 rounded-xl text-[0.88rem] border ' +
                  (selected
                    ? 'bg-[#6a3dbd] border-[#6a3dbd] text-white'
                    : 'bg-[#f0eefa] border-[#c8bae8] text-[#5c35a0] hover:bg-[#e8e0f8]')
                }
              >
                {c.label || c.value}
              </button>
            )
          })}
        </div>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onAnswer(code, null)}
          className="text-[0.75rem] text-[#aaa] border border-gray-200 rounded px-2 py-0.5 bg-white hover:text-[#c05010] hover:border-[#e0a060]"
        >
          ✕ 해제
        </button>
      </div>
    )
  }

  if (type === 'CHECKBOX') {
    const choices = getChoices(q)
    const sel: string[] = Array.isArray(val) ? val : []
    return (
      <div className="flex flex-wrap gap-1.5">
        {choices.map((c) => {
          const checked = sel.includes(c.value)
          return (
            <button
              key={c.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const next = checked ? sel.filter((x) => x !== c.value) : [...sel, c.value]
                onAnswer(code, next)
              }}
              className={
                'px-3 py-1 rounded-xl text-[0.88rem] border ' +
                (checked
                  ? 'bg-[#2a7a4a] border-[#2a7a4a] text-white'
                  : 'bg-[#f0eefa] border-[#c8bae8] text-[#5c35a0]')
              }
            >
              {c.label || c.value}
            </button>
          )
        })}
      </div>
    )
  }

  if (type === 'DROPDOWN') {
    return <DropdownSelect q={q} person={person} onAnswer={onAnswer} />
  }

  if (type === 'CONSENT') {
    return (
      <div className="flex gap-1.5">
        {([['동의', true], ['비동의', false]] as [string, boolean][]).map(([lbl, bv]) => {
          const selected = val === bv
          return (
            <button
              key={lbl}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onAnswer(code, bv)}
              className={
                'px-3 py-1 rounded-xl text-[0.88rem] border ' +
                (selected
                  ? 'bg-[#6a3dbd] border-[#6a3dbd] text-white'
                  : 'bg-[#f0eefa] border-[#c8bae8] text-[#5c35a0]')
              }
            >
              {lbl}
            </button>
          )
        })}
      </div>
    )
  }

  if (type === 'RANGE') {
    const opts = q.options || {}
    const min = opts.min ?? 6
    const max = opts.max ?? 20
    const hasVal = val !== null && val !== undefined
    const cv = hasVal ? val : Math.round((min + max) / 2)
    return (
      <div className="flex items-center gap-2.5">
        <input
          type="range"
          min={min}
          max={max}
          value={cv}
          onChange={(e) => onAnswer(code, Number(e.target.value))}
          className="flex-1 accent-[#7c5cbf]"
        />
        <span className="min-w-[28px] text-center font-bold text-[#5c35a0] text-[1.05rem]">
          {hasVal ? val : '?'}
        </span>
        <button
          onClick={() => onAnswer(code, null)}
          className="text-[0.75rem] text-[#aaa] border border-gray-200 rounded px-2 py-0.5 bg-white hover:text-[#c05010]"
        >
          ✕
        </button>
      </div>
    )
  }

  if (type === 'RANKED_CHOICE') {
    const choices = getChoices(q)
    const arr: (number | null)[] = Array.isArray(val) ? val : [null, null, null]
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-3 flex-wrap items-end">
          {['1순위', '2순위', '3순위'].map((lbl, i) => (
            <div key={i} className="flex flex-col gap-0.5 items-center">
              <div className="text-[0.78rem] text-[#888]">{lbl}</div>
              <input
                type="number"
                min={1}
                max={choices.length || 7}
                value={arr[i] ?? ''}
                placeholder="번호"
                onChange={(e) => {
                  const a: (number | null)[] = Array.isArray(person.answers[code])
                    ? [...person.answers[code]]
                    : [null, null, null]
                  a[i] = e.target.value ? Number(e.target.value) : null
                  onAnswer(code, a)
                }}
                className="w-[52px] text-center bg-white border border-gray-300 text-[#222] rounded px-1.5 py-1 text-[0.92rem]"
              />
            </div>
          ))}
        </div>
        {choices.length > 0 && (
          <div className="text-[0.75rem] text-[#999] mt-0.5 w-full">
            {choices.map((c, i) => `${i + 1}.${c.label || c.value}`).join('  ')}
          </div>
        )}
      </div>
    )
  }

  // TEXT / NUMBER
  const isNull = val === null || val === undefined
  return (
    <input
      type={type === 'NUMBER' ? 'number' : 'text'}
      value={isNull ? '' : val}
      placeholder={isNull ? '판독불가 — 직접 입력' : q.options?.unit ? `(${q.options.unit})` : undefined}
      onChange={(e) => {
        const v =
          type === 'NUMBER'
            ? e.target.value === ''
              ? null
              : Number(e.target.value)
            : e.target.value || null
        onAnswer(code, v)
      }}
      className={
        'bg-white border rounded px-2.5 py-1.5 text-[0.92rem] w-full ' +
        (isNull ? 'text-[#aaa] border-[#e0b090] bg-[#fff8f0]' : 'border-gray-300 text-[#222]')
      }
    />
  )
}
