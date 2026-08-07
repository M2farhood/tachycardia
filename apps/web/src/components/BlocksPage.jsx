import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, ChevronLeft, ChevronRight, X, Check, LayoutGrid, BookOpen } from 'lucide-react'

// ─── Time helpers ────────────────────────────────────────────────────────────

const parseTime = (str) => {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}

const formatAMPM = (totalMins) => {
  const h = Math.floor(totalMins / 60) % 24
  const m = totalMins % 60
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

const addMins = (str, amount) => {
  const total = parseTime(str) + amount
  if (total >= 24 * 60) return '24:00'
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

const calcDuration = (start, end) => {
  const diff = parseTime(end) - parseTime(start)
  if (diff <= 0) return null
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const roundUpTo30 = (totalMins) => {
  const rounded = Math.ceil(totalMins / 30) * 30
  const clamped = Math.min(rounded, 23 * 60 + 30)
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// Like roundUpTo30 but allows midnight (24:00) as a valid end time
const clampEndToGrid = (str) => {
  const mins = parseTime(str)
  if (mins >= 24 * 60) return '24:00'
  const rounded = Math.ceil(mins / 30) * 30
  if (rounded >= 24 * 60) return '24:00'
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

const suggestStart = (blocks) => {
  if (blocks.length > 0) {
    const lastEndMins = blocks.reduce((latest, b) => Math.max(parseTime(b.endTime), latest), 0)
    return roundUpTo30(lastEndMins)
  }
  const now = new Date()
  return roundUpTo30(now.getHours() * 60 + now.getMinutes())
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: '1h', mins: 60 },
  { label: '2h', mins: 120 },
  { label: '3h', mins: 180 },
  { label: 'Custom', mins: null },
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// 30-min increment options in AM/PM format (12:00 AM → 11:30 PM)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const mins = i * 30
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  return { value, label: formatAMPM(mins) }
})

// Same as TIME_OPTIONS but includes midnight as a valid end time
const END_TIME_OPTIONS = [...TIME_OPTIONS, { value: '24:00', label: '12:00 AM' }]

const formatDateKey = (d) => d.toISOString().split('T')[0]

// ─── Timer helpers ────────────────────────────────────────────────────────────

const getNowMins = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

const formatRemaining = (mins) => {
  if (mins <= 0) return '0m'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const getTimerState = (startTime, endTime, nowMins) => {
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  const total = end - start
  if (total <= 0) return { status: 'invalid', progress: 0, label: '' }
  if (nowMins < start) {
    return { status: 'upcoming', progress: 0, label: `in ${formatRemaining(start - nowMins)}` }
  }
  if (nowMins >= end) {
    return { status: 'done', progress: 1, label: 'Done' }
  }
  const elapsed = nowMins - start
  return {
    status: 'active',
    progress: elapsed / total,
    label: `${formatRemaining(end - nowMins)} left`,
  }
}

// ─── New Block Form ───────────────────────────────────────────────────────────

function NewBlockForm({ blocks, onCreate, onCancel }) {
  const [nowMins, setNowMins] = useState(getNowMins)

  useEffect(() => {
    const id = setInterval(() => setNowMins(getNowMins()), 30000)
    return () => clearInterval(id)
  }, [])

  const defaultStart = suggestStart(blocks)
  const [startTime, setStartTime] = useState(defaultStart)
  const [durIdx, setDurIdx] = useState(1) // default 2h
  const [customEnd, setCustomEnd] = useState(clampEndToGrid(addMins(defaultStart, 120)))

  const isCustom = DURATION_OPTIONS[durIdx].mins === null
  const endTime = isCustom ? customEnd : clampEndToGrid(addMins(startTime, DURATION_OPTIONS[durIdx].mins))
  const duration = calcDuration(startTime, endTime)

  const handleStartChange = (val) => {
    setStartTime(val)
    if (!isCustom) setCustomEnd(clampEndToGrid(addMins(val, DURATION_OPTIONS[durIdx].mins)))
  }

  const handleDurChange = (i) => {
    setDurIdx(i)
    if (DURATION_OPTIONS[i].mins) setCustomEnd(clampEndToGrid(addMins(startTime, DURATION_OPTIONS[i].mins)))
  }

  // Live timer preview
  const startMins = parseTime(startTime)
  const minsUntilStart = startMins - nowMins
  const minsUntilEnd = duration ? parseTime(endTime) - nowMins : -1

  let timerLabel = ''
  let timerColor = 'text-[var(--text-tertiary)]'
  if (minsUntilStart > 0) {
    timerLabel = `in ${formatRemaining(minsUntilStart)}`
    if (minsUntilStart <= 30) timerColor = 'text-[var(--color-accent)]'
  } else if (minsUntilEnd > 0) {
    timerLabel = `${formatRemaining(minsUntilEnd)} left`
    timerColor = 'text-[var(--color-accent)]'
  }

  return (
    <div className="flex flex-col gap-3.5 p-5">
      {/* Header: label + live clock */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          New block
        </span>
        <div className="flex items-center gap-1.5 text-xs tabular-nums">
          <span className="text-[var(--text-tertiary)]">{formatAMPM(nowMins)}</span>
          {timerLabel && (
            <>
              <span className="text-[var(--border)]">·</span>
              <span className={timerColor}>{timerLabel}</span>
            </>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">Start</label>
        <select
          value={startTime}
          onChange={(e) => handleStartChange(e.target.value)}
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors cursor-pointer"
        >
          {TIME_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">Duration</label>
        <div className="flex gap-1.5">
          {DURATION_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => handleDurChange(i)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                durIdx === i
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isCustom && (
        <div>
          <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">End</label>
          <select
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors cursor-pointer"
          >
            {END_TIME_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {duration && (
        <div className="text-xs text-[var(--text-tertiary)]">
          {formatAMPM(parseTime(startTime))} – {formatAMPM(parseTime(endTime))} · {duration}
        </div>
      )}

      <div className="flex gap-2 pt-0.5">
        <button
          onClick={() => duration && onCreate({ startTime, endTime })}
          disabled={!duration}
          className="flex-1 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-lg text-[var(--text-tertiary)] text-sm hover:bg-[var(--surface-2)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Block Card ───────────────────────────────────────────────────────────────

function BlockCard({ block, tabs, isEditing, onEditToggle, onDelete }) {
  const [nowMins, setNowMins] = useState(getNowMins)
  const cardRef = useRef(null)
  const [cardSize, setCardSize] = useState({ w: 160, h: 180 })

  // Every second so the border line moves smoothly
  useEffect(() => {
    const id = setInterval(() => setNowMins(getNowMins()), 1000)
    return () => clearInterval(id)
  }, [])

  // Measure card so the SVG border fits exactly
  useEffect(() => {
    if (!cardRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setCardSize({ w: e.contentRect.width, h: e.contentRect.height })
      }
    })
    ro.observe(cardRef.current)
    return () => ro.disconnect()
  }, [])

  const startStr = formatAMPM(parseTime(block.startTime))
  const endStr = formatAMPM(parseTime(block.endTime))
  const duration = calcDuration(block.startTime, block.endTime)
  const timer = getTimerState(block.startTime, block.endTime, nowMins)

  const assignedTasks = useMemo(() => {
    if (!block.taskIds?.length) return []
    const allTopics = tabs.flatMap((tab) => tab.topics.map((t) => ({ ...t })))
    return block.taskIds.map((id) => allTopics.find((t) => t.id === id)).filter(Boolean)
  }, [block.taskIds, tabs])

  const isActive = timer.status === 'active'
  const isDone   = timer.status === 'done'

  // SVG perimeter border animation
  const rx = 15
  const { w, h } = cardSize
  const perimeter = 2 * (w - 2 * rx) + 2 * (h - 2 * rx) + 2 * Math.PI * rx
  const borderProgress = isDone ? 1 : isActive ? timer.progress : 0
  const dashOffset = perimeter * (1 - borderProgress)
  const borderStroke = isDone ? 'var(--color-success)' : 'var(--color-accent)'

  return (
    <div
      ref={cardRef}
      className={`group relative flex flex-col rounded-2xl transition-all cursor-pointer flex-shrink-0 w-[232px] min-h-[292px] surface hover:bg-[var(--surface-2)] ${isDone ? 'opacity-70' : ''}`}
      onClick={onEditToggle}
    >
      {/* ── Perimeter border animation ── */}
      {(isActive || isDone || isEditing) && (
        <svg
          className="absolute inset-0 pointer-events-none z-10 rounded-2xl"
          width={w} height={h}
          style={{ overflow: 'visible' }}
        >
          {/* dim track */}
          <rect x="1" y="1" width={w - 2} height={h - 2}
            rx={rx} ry={rx} fill="none"
            stroke={borderStroke} strokeWidth="1.5" opacity="0.12" />
          {/* live progress arc */}
          <rect x="1" y="1" width={w - 2} height={h - 2}
            rx={rx} ry={rx} fill="none"
            stroke={borderStroke} strokeWidth="1.5"
            strokeDasharray={perimeter}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          />
        </svg>
      )}

      {/* Delete button (hover) */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[var(--surface-3)] border border-[var(--border)] hidden group-hover:flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--color-danger)] hover:border-red-500/40 transition-all z-20"
      >
        <X size={10} />
      </button>

      {/* Time + duration + timer label */}
      <div className="px-5 pt-5 pb-3">
        <div className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
          {startStr} – {endStr}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-[var(--text-tertiary)]">{duration}</span>
          <span className={`text-xs tabular-nums font-medium ${
            isActive ? 'text-[var(--color-accent)]' :
            isDone   ? 'text-[var(--color-success)]' :
                       'text-[var(--text-tertiary)]'
          }`}>
            {timer.label}
          </span>
        </div>

        {/* Inner progress bar */}
        <div className="mt-2.5 h-[3px] rounded-full bg-[var(--surface-3)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isActive ? 'bg-[var(--color-accent)]' :
              isDone   ? 'bg-[var(--color-success)]/70' : ''
            }`}
            style={{ width: `${Math.round(timer.progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="divider-line mx-5" />

      {/* Task list */}
      <div className={`flex-1 px-5 py-3 ${assignedTasks.length >= 4 ? 'grid grid-cols-2 gap-x-3 gap-y-1 content-start' : 'flex flex-col gap-1'}`}>
        {assignedTasks.length === 0 ? (
          <span className="text-xs text-[var(--text-tertiary)]">
            {isEditing ? 'Select tasks below' : 'No tasks'}
          </span>
        ) : (
          assignedTasks.map((task) => (
            <div key={task.id} className="flex items-start gap-2 min-w-0">
              <div className={`mt-[4px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                task.completed ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent)]/60'
              }`} />
              <span className={`text-xs leading-snug truncate ${
                task.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'
              }`}>
                {task.name}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 mt-auto">
        <span className={`text-[10px] font-medium transition-colors ${
          isEditing ? 'text-[var(--color-accent)]' : 'text-[var(--text-tertiary)]'
        }`}>
          {isEditing ? 'Editing ↓' : assignedTasks.length > 0 ? `${assignedTasks.length} task${assignedTasks.length !== 1 ? 's' : ''}` : 'Tap to assign tasks'}
        </span>
      </div>
    </div>
  )
}

// ─── Task Picker (shown below blocks row) ────────────────────────────────────

function TaskPicker({ block, tabs, onToggle }) {
  const startStr = formatAMPM(parseTime(block.startTime))
  const endStr = formatAMPM(parseTime(block.endTime))
  const activeTabs = tabs.filter((t) => t.topics?.length > 0)

  return (
    <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide font-medium">Tasks for</span>
        <span className="text-xs text-[var(--text-secondary)] tabular-nums font-medium">
          {startStr} – {endStr}
        </span>
      </div>

      {activeTabs.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          No tasks yet. Add tasks to your study sections first.
        </p>
      ) : (
        /* 2-column on sm, 3-column on lg — sections side by side */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          {activeTabs.map((tab) => (
            <div key={tab.id}>
              {/* Section header */}
              <div className="flex items-center gap-1.5 mb-3">
                <BookOpen size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                  {tab.title}
                </span>
              </div>
              {/* Task pills */}
              <div className="flex flex-wrap gap-2">
                {tab.topics.map((topic) => {
                  const selected = (block.taskIds || []).includes(topic.id)
                  return (
                    <button
                      key={topic.id}
                      onClick={() => onToggle(topic.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all ${
                        selected
                          ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                          : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-transparent hover:border-[var(--border)] hover:text-[var(--text-primary)]'
                      } ${topic.completed ? 'opacity-40' : ''}`}
                    >
                      {selected && <Check size={11} className="flex-shrink-0" />}
                      <span className={topic.completed ? 'line-through' : ''}>{topic.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── BlocksPage ───────────────────────────────────────────────────────────────

export default function BlocksPage({ blocks, onAddBlock, onDeleteBlock, onToggleTask, tabs, blockTemplates = [], onAddBlockTemplate, onDeleteBlockTemplate }) {
  const [dayOffset, setDayOffset] = useState(0)
  const [showNewBlock, setShowNewBlock] = useState(false)
  const [activeBlockId, setActiveBlockId] = useState(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const currentDate = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + dayOffset)
    return d
  }, [today, dayOffset])

  const dateKey = formatDateKey(currentDate)
  const isToday = dayOffset === 0

  const dayBlocks = useMemo(() => {
    const list = blocks[dateKey] || []
    return [...list].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime))
  }, [blocks, dateKey])

  const activeBlock = useMemo(
    () => dayBlocks.find((b) => b.id === activeBlockId) || null,
    [dayBlocks, activeBlockId]
  )

  const dateLabel = useMemo(() => {
    const d = currentDate
    const dayName = isToday ? 'Today' : SHORT_DAYS[d.getDay()]
    return `${dayName}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
  }, [currentDate, isToday])

  const handleDayChange = (delta) => {
    setDayOffset((o) => o + delta)
    setShowNewBlock(false)
    setActiveBlockId(null)
  }

  const handleCreate = (data) => {
    onAddBlock(dateKey, data)
    setShowNewBlock(false)
  }

  const handleBlockClick = (blockId) => {
    setActiveBlockId((prev) => (prev === blockId ? null : blockId))
    setShowNewBlock(false)
  }

  const handleDelete = (blockId) => {
    onDeleteBlock(dateKey, blockId)
    if (activeBlockId === blockId) setActiveBlockId(null)
  }

  const handleSaveTemplate = () => {
    const name = templateName.trim() || dateLabel
    onAddBlockTemplate?.(name, dayBlocks.map(b => ({ startTime: b.startTime, endTime: b.endTime })))
    setSavingTemplate(false)
    setTemplateName('')
  }

  const handleApplyTemplate = (template) => {
    template.blocks.forEach(b => onAddBlock(dateKey, { startTime: b.startTime, endTime: b.endTime }))
  }

  return (
    <div className="px-6 pt-6 pb-16">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-[var(--text-tertiary)]" />
            <h2 className="text-base font-medium text-[var(--text-primary)]">Blocks</h2>
          </div>
          {/* Save as template — only when blocks exist */}
          {dayBlocks.length > 0 && !savingTemplate && (
            <button
              onClick={() => setSavingTemplate(true)}
              className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--color-accent)] transition-colors uppercase tracking-wide"
            >
              Save template
            </button>
          )}
          {savingTemplate && (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); if (e.key === 'Escape') { setSavingTemplate(false); setTemplateName('') } }}
                placeholder={dateLabel}
                className="text-[11px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] w-28"
              />
              <button onClick={handleSaveTemplate} className="text-[11px] text-[var(--color-accent)] hover:opacity-70">Save</button>
              <button onClick={() => { setSavingTemplate(false); setTemplateName('') }} className="text-[11px] text-[var(--text-tertiary)] hover:opacity-70">×</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleDayChange(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2 px-1.5">
            <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">{dateLabel}</span>
            {!isToday && (
              <button
                onClick={() => { setDayOffset(0); setShowNewBlock(false); setActiveBlockId(null) }}
                className="text-xs text-[var(--color-accent)] hover:opacity-70 transition-opacity"
              >
                Today
              </button>
            )}
          </div>
          <button
            onClick={() => handleDayChange(1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Templates row — only shown when templates exist ── */}
      {blockTemplates.length > 0 && (
        <div className="flex gap-2 pb-4 -mx-6 px-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {blockTemplates.map(tmpl => (
            <div key={tmpl.id} className="flex items-center gap-1 flex-shrink-0 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl pl-3 pr-1.5 py-1.5 group">
              <button
                onClick={() => handleApplyTemplate(tmpl)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
              >
                {tmpl.name}
              </button>
              <button
                onClick={() => onDeleteBlockTemplate?.(tmpl.id)}
                className="p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-[var(--text-tertiary)] hover:text-[var(--color-danger)]"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state or new block form (no cards yet) ── */}
      {dayBlocks.length === 0 && (
        !showNewBlock ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                No blocks for {isToday ? 'today' : 'this day'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Break your day into focused time blocks
              </p>
            </div>
            <button
              onClick={() => setShowNewBlock(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity liquid-press"
            >
              <Plus size={15} />
              Add first block
            </button>
          </div>
        ) : (
          <div className="surface rounded-2xl w-[280px]">
            <NewBlockForm
              blocks={dayBlocks}
              onCreate={handleCreate}
              onCancel={() => setShowNewBlock(false)}
            />
          </div>
        )
      )}

      {/* ── Horizontal scroll row (has cards) ── */}
      {dayBlocks.length > 0 && (
        <>
          <div
            className="flex gap-3 pb-3 -mx-6 px-6"
            style={{ overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {dayBlocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                tabs={tabs}
                isEditing={activeBlockId === block.id}
                onEditToggle={() => handleBlockClick(block.id)}
                onDelete={() => handleDelete(block.id)}
              />
            ))}

            {/* Inline add: form or dashed button */}
            {showNewBlock ? (
              <div className="surface rounded-2xl flex-shrink-0 w-[280px] min-h-[292px]">
                <NewBlockForm
                  blocks={dayBlocks}
                  onCreate={handleCreate}
                  onCancel={() => setShowNewBlock(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => { setShowNewBlock(true); setActiveBlockId(null) }}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-all liquid-press flex-shrink-0 w-[180px] min-h-[292px]"
              >
                <Plus size={18} />
                <span className="text-xs">New block</span>
              </button>
            )}
          </div>

          {/* ── Task picker (below blocks) ── */}
          {activeBlock && (
            <TaskPicker
              block={activeBlock}
              tabs={tabs}
              onToggle={(taskId) => onToggleTask(dateKey, activeBlock.id, taskId)}
            />
          )}
        </>
      )}
    </div>
  )
}
