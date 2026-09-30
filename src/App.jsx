import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTimer } from './hooks/useTimer'
import { useAuth } from './hooks/useAuth'
import Header from './components/Header'
import SegmentControl from './components/SegmentControl'
import HeroSection from './components/HeroSection'
import TopicList from './components/TopicList'
import FloatingTimer from './components/FloatingTimer'
import TemplateModal from './components/TemplateModal'
import CountdownWidget from './components/CountdownWidget'
import TachycardiaTab from './components/TachycardiaTab'
import CalendarPage from './components/CalendarPage'
import BlocksPage from './components/BlocksPage'
import FocusMode from './components/FocusMode'
import Confetti from './components/Confetti'
import ReadOnlyBanner from './components/ReadOnlyBanner'
import EmptySections from './components/EmptySections'
import SignInDialog from './components/SignInDialog'
import { createEmptyTab } from './utils/templates'
import { getSetting, getListSuggestions } from './utils/settingsDefaults'
import { isAIAvailable, isSignedIn, generateSteps } from './services/aiService'
import { applyAction } from './utils/aiActions'
import FocusSession from './components/focus/FocusSession'
import { localDateKey } from './utils/dateKeys'

// Today's LOCAL date key (never UTC — see src/utils/dateKeys.js)
const getTodayKey = () => localDateKey()

function App() {
  const {
    data,
    isFirstVisit,
    readOnly,
    enterReadOnly,
    updateData,
    adoptCloudData,
    updateTab,
    updateTopic,
    addTopic,
    deleteTopic,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    addTab,
    deleteTab,
    reorderTopics,
    updateSettings,
    updateTimerSession,
    recordStudyDay,
    timeLog,
    recordStudyTime,
    calendar,
    addCalendarTask,
    toggleCalendarTask,
    editCalendarTask,
    deleteCalendarTask,
    clearCalendarDay,
    addCalendarSubtask,
    toggleCalendarSubtask,
    deleteCalendarSubtask,
    blocks,
    addBlock,
    deleteBlock,
    toggleTaskInBlock,
    blockTemplates,
    addBlockTemplate,
    deleteBlockTemplate,
    clearAllData
  } = useLocalStorage(null)

  // Auth hook - handles Google sign-in and cloud sync
  const {
    user,
    isLoading: isAuthLoading,
    isSyncing,
    syncStatus,
    signIn,
    refreshUser,
    signOut,
    isFirebaseConfigured
  } = useAuth(data, adoptCloudData, { readOnly, onFutureSchema: enterReadOnly })

  const [activeTabId, setActiveTabId] = useState(null)
  // Legacy device-local study time (localStorage only). Kept as the fallback for
  // documents that predate the synced `timeLog` field (schema v7).
  const [legacyTodayMinutes, setLegacyTodayMinutes] = useState(0)
  const [legacyTotalMinutes, setLegacyTotalMinutes] = useState(0)
  // Which full-page view replaces the dashboard: 'blocks' | 'calendar' | 'tachycardia' | null
  const [activeView, setActiveView] = useState(null)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [confettiActive, setConfettiActive] = useState(false)
  const touchStartX = useRef(null)
  // The full-screen session: { label, steps, phase: 'running'|'done', minimized, totalSeconds, nextUp } | null
  const [sessionOverlay, setSessionOverlay] = useState(null)
  const [showSignIn, setShowSignIn] = useState(false)
  const openSignIn = useCallback(() => setShowSignIn(true), [])
  // Latest document, so several AI changes applied back-to-back build on each other.
  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])

  const handleSectionComplete = useCallback(() => {
    setConfettiActive(true)
    setTimeout(() => setConfettiActive(false), 3500)
  }, [])

  const handleSwipe = useCallback((dx) => {
    if (!data?.tabs?.length) return
    const tabs = data.tabs
    const idx = tabs.findIndex(t => t.id === activeTabId)
    if (dx > 0 && idx > 0) setActiveTabId(tabs[idx - 1].id)           // swipe right → prev
    else if (dx < 0 && idx < tabs.length - 1) setActiveTabId(tabs[idx + 1].id) // swipe left → next
  }, [data?.tabs, activeTabId])

  const onTouchStart = useCallback((e) => { touchStartX.current = e.touches[0].clientX }, [])
  const onTouchEnd   = useCallback((e) => {
    if (touchStartX.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(dx) > 55) handleSwipe(-dx)
    touchStartX.current = null
  }, [handleSwipe])

  // Load study time from localStorage (legacy, device-local fallback)
  useEffect(() => {
    // Load today's time
    const storedDaily = localStorage.getItem('study_tracker_daily_time')
    if (storedDaily) {
      try {
        const parsed = JSON.parse(storedDaily)
        if (parsed.date === getTodayKey()) {
          setLegacyTodayMinutes(parsed.minutes || 0)
        } else {
          // New day, reset daily but keep total
          localStorage.setItem('study_tracker_daily_time', JSON.stringify({ date: getTodayKey(), minutes: 0 }))
          setLegacyTodayMinutes(0)
        }
      } catch {
        setLegacyTodayMinutes(0)
      }
    }

    // Load total time
    const storedTotal = localStorage.getItem('study_tracker_total_time')
    if (storedTotal) {
      try {
        setLegacyTotalMinutes(parseInt(storedTotal, 10) || 0)
      } catch {
        setLegacyTotalMinutes(0)
      }
    }
  }, [])

  // Displayed study time: prefer the synced `timeLog` (so the phone and the
  // laptop agree), fall back to the device-local localStorage keys for
  // documents that have no timeLog entries yet. Total = sum of all days.
  const hasTimeLog = useMemo(() => Object.keys(timeLog || {}).length > 0, [timeLog])

  const todayMinutes = useMemo(() => {
    if (!hasTimeLog) return legacyTodayMinutes
    return Math.round((Number(timeLog[getTodayKey()]) || 0) / 60)
  }, [hasTimeLog, timeLog, legacyTodayMinutes])

  const totalMinutes = useMemo(() => {
    if (!hasTimeLog) return legacyTotalMinutes
    const seconds = Object.values(timeLog).reduce((acc, s) => acc + (Number(s) || 0), 0)
    return Math.round(seconds / 60)
  }, [hasTimeLog, timeLog, legacyTotalMinutes])

  // Apply theme from settings
  useEffect(() => {
    if (data?.settings?.theme === 'light') {
      document.documentElement.classList.add('light-theme')
    } else {
      document.documentElement.classList.remove('light-theme')
    }
  }, [data?.settings?.theme])

  // Set initial active tab when data loads
  if (data && !activeTabId && data.tabs.length > 0) {
    setActiveTabId(data.tabs[0].id)
  }

  // Handle timer completion - track study time
  const handleTimerComplete = useCallback(() => {
    // The length the session was started with (pauses shrink totalSeconds).
    const plannedSeconds = data?.timerSession?.plannedSeconds || (data?.settings?.timerDuration || 25) * 60
    const duration = Math.round(plannedSeconds / 60)

    // Synced study time (schema v7). Written ALONGSIDE the legacy keys below,
    // never instead of them — an older client still reads only those keys.
    recordStudyTime(getTodayKey(), plannedSeconds)

    // Legacy device-local keys — still the source of truth for older clients.
    // Read-only mode means no writes at all, localStorage included.
    if (!readOnly) {
      const newTodayTotal = legacyTodayMinutes + duration
      setLegacyTodayMinutes(newTodayTotal)
      localStorage.setItem('study_tracker_daily_time', JSON.stringify({
        date: getTodayKey(),
        minutes: newTodayTotal
      }))

      const newTotal = legacyTotalMinutes + duration
      setLegacyTotalMinutes(newTotal)
      localStorage.setItem('study_tracker_total_time', newTotal.toString())
    }

    // Record today for the streak (synced; no-op if already recorded today)
    recordStudyDay(getTodayKey())

    // Keep the full-screen view open on a calm "done" card with what's next.
    const session = data?.timerSession
    const tab = data?.tabs?.find(t => t.id === session?.tabId)
    const next = tab?.topics.find(t => !t.completed && t.id !== session?.topicId)
    setSessionOverlay(prev => ({
      label: prev?.label || tab?.topics.find(t => t.id === session?.topicId)?.name || 'Study session',
      steps: prev?.steps || null,
      totalSeconds: plannedSeconds,
      phase: 'done',
      minimized: false,
      nextUp: next?.name || null,
    }))

    updateTimerSession(null)
  }, [updateTimerSession, recordStudyDay, recordStudyTime, readOnly, legacyTodayMinutes, legacyTotalMinutes, data?.settings?.timerDuration, data?.timerSession, data?.tabs])

  // Timer hook
  const { timeLeft, formattedTime, isRunning } = useTimer(
    data?.timerSession,
    handleTimerComplete,
    data?.settings?.isMuted,
    getSetting(data?.settings, 'sessionSound')
  )

  // Get current tab data
  const currentTab = useMemo(() => {
    if (!data?.tabs) return null
    return data.tabs.find(t => t.id === activeTabId) || data.tabs[0]
  }, [data?.tabs, activeTabId])

  // Real, date-based streak: consecutive days of logged study up to today.
  // If today hasn't been studied yet, the streak still counts up to yesterday.
  const streak = useMemo(() => {
    const dates = data?.studyDates
    if (!dates || dates.length === 0) return 0
    const studied = new Set(dates)
    const cursor = new Date()
    cursor.setHours(12, 0, 0, 0)
    if (!studied.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)

    let count = 0
    while (studied.has(localDateKey(cursor))) {
      count++
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [data?.studyDates])

  // Tasks from the lists that have a day (Topic.dueDate) → shown on that day in the calendar.
  const listTasksByDay = useMemo(() => {
    const byDay = {}
    for (const tab of data?.tabs || []) {
      for (const topic of tab.topics || []) {
        if (!topic.dueDate) continue
        ;(byDay[topic.dueDate] ||= []).push({ tabId: tab.id, tabTitle: tab.title, topic })
      }
    }
    return byDay
  }, [data?.tabs])

  // Calculate global stats (now supports weights)
  const globalStats = useMemo(() => {
    if (!data?.tabs) return { completed: 0, total: 0 }
    
    // Check if any topic in ANY tab uses weights
    const hasGlobalWeights = data.tabs.some(tab => tab.topics.some(t => (t.weight || 0) > 0))
    
    let completed = 0
    let total = 0
    
    if (hasGlobalWeights) {
      data.tabs.forEach(tab => {
        tab.topics.forEach(t => {
          const w = t.weight || 0
          total += w
          if (t.completed) completed += w
        })
      })
      // Prevent 0 total edge case
      if (total === 0) total = 100
    } else {
      data.tabs.forEach(tab => {
        completed += tab.topics.filter(t => t.completed).length
        total += tab.topics.length
      })
    }
    return { completed, total }
  }, [data?.tabs])

  // Handler functions
  // Start any session — from a task's play button, the floating play button,
  // or Focus mode — and show it full-screen. tabId/topicId may be null (a
  // plan item or free text), in which case `label` names it.
  const handleSessionStart = useCallback(({ tabId = null, topicId = null, minutes, label, steps = null }) => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    const seconds = Math.round((minutes || getSetting(data?.settings, 'timerDuration')) * 60)
    updateTimerSession({ tabId, topicId, startTime: Date.now(), totalSeconds: seconds, plannedSeconds: seconds, isRunning: true })
    setSessionOverlay({ label: label || 'Study session', steps, phase: 'running', minimized: false, totalSeconds: seconds, nextUp: null })
    setIsFocusMode(false)
  }, [data?.settings, updateTimerSession])

  const handleTimerStart = useCallback((tabId, topicId) => {
    const duration = data?.settings?.timerDuration || 25

    if (data?.timerSession?.tabId === tabId &&
      data?.timerSession?.topicId === topicId &&
      !data?.timerSession?.isRunning) {
      const remainingSeconds = timeLeft
      updateTimerSession({
        ...data.timerSession,
        isRunning: true,
        startTime: Date.now(),
        totalSeconds: remainingSeconds
      })
    } else {
      const topic = data?.tabs?.find(t => t.id === tabId)?.topics.find(t => t.id === topicId)
      handleSessionStart({ tabId, topicId, minutes: duration, label: topic?.name })
    }
  }, [data?.settings?.timerDuration, data?.timerSession, data?.tabs, updateTimerSession, timeLeft, handleSessionStart])

  const handleTimerPauseResume = useCallback(() => {
    if (!data?.timerSession) return

    if (data.timerSession.isRunning) {
      updateTimerSession({
        ...data.timerSession,
        isRunning: false,
        totalSeconds: timeLeft
      })
    } else {
      updateTimerSession({
        ...data.timerSession,
        isRunning: true,
        startTime: Date.now()
      })
    }
  }, [data?.timerSession, updateTimerSession, timeLeft])

  const handleTimerReset = useCallback(() => {
    updateTimerSession(null)
    setSessionOverlay(null)
  }, [updateTimerSession])

  // Apply AI-proposed changes (only ever after the owner tapped Apply).
  // Each call builds on the previous one; one write at the end.
  const applyAICalls = useCallback(async (calls) => {
    if (readOnly) return { ok: false, error: 'This data is read-only until you update the app.' }
    try {
      let next = dataRef.current
      for (const call of calls) {
        next = applyAction(next, {
          id: call.id,
          name: call.name || call.function?.name,
          arguments: call.arguments ?? call.function?.arguments,
        })
      }
      if (next !== dataRef.current) {
        dataRef.current = next
        updateData(next)
      }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }, [readOnly, updateData])

  const handleParkThought = useCallback((text) => {
    const t = String(text || '').trim()
    if (t) addCalendarTask(getTodayKey(), `💭 ${t}`)
  }, [addCalendarTask])

  const handleImport = useCallback((importedData) => {
    updateData(importedData)
    if (importedData.tabs.length > 0) {
      setActiveTabId(importedData.tabs[0].id)
    }
  }, [updateData])

  const handleClearAll = useCallback(() => {
    if (readOnly) return
    clearAllData()
    setActiveTabId(null)
    setLegacyTodayMinutes(0)
    setLegacyTotalMinutes(0)
    localStorage.removeItem('study_tracker_daily_time')
    localStorage.removeItem('study_tracker_total_time')
  }, [clearAllData, readOnly])

  const handleStartSession = useCallback(() => {
    if (!currentTab) return
    const incompleteTopic = currentTab.topics.find(t => !t.completed)
    if (incompleteTopic) {
      handleTimerStart(currentTab.id, incompleteTopic.id)
    }
  }, [currentTab, handleTimerStart])

  const handleTabDelete = useCallback((tabId) => {
    deleteTab(tabId)
    if (activeTabId === tabId && data?.tabs) {
      const remainingTabs = data.tabs.filter(t => t.id !== tabId)
      if (remainingTabs.length > 0) {
        setActiveTabId(remainingTabs[0].id)
      }
    }
  }, [deleteTab, activeTabId, data?.tabs])

  // Show template modal for first-time users
  if (isFirstVisit || !data) {
    return (
      <TemplateModal
        onSelect={updateData}
        onClose={() => { }}
      />
    )
  }

  const settings = data.settings
  const aiOn = isAIAvailable(settings)
  const hasTabs = data.tabs.length > 0

  const handleCreateFirstSection = (name) => {
    const tab = createEmptyTab()
    tab.title = name
    tab.emoji = ''
    addTab(tab)
    setActiveTabId(tab.id)
  }

  // Calculate progress (Weighted vs Standard)
  let completedCount = 0
  let totalCount = 0

  if (currentTab) {
    const hasWeights = currentTab.topics.some(t => (t.weight || 0) > 0)

    if (hasWeights) {
      // Weighted Mode: Section total is the sum of its topics' weights
      totalCount = currentTab.topics.reduce((acc, t) => acc + (t.weight || 0), 0)
      completedCount = currentTab.topics.reduce((acc, t) => {
        return acc + (t.completed ? (t.weight || 0) : 0)
      }, 0)
    } else {
      // Standard Mode: Count of completed topics
      completedCount = currentTab.topics.filter(t => t.completed).length
      totalCount = currentTab.topics.length
    }
  }

  return (
    <div className="min-h-screen pb-safe">
      <div className="app-container">
      {/* Data written by a newer version of the app — displayed, never written */}
      <ReadOnlyBanner visible={readOnly} />

      {/* Header */}
      <Header
        data={data}
        settings={data.settings}
        todayMinutes={todayMinutes}
        totalMinutes={totalMinutes}
        studyStreak={streak}
        onImport={handleImport}
        onClearAll={handleClearAll}
        onSettingsChange={updateSettings}
        // Auth props
        user={user}
        isAuthLoading={isAuthLoading}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
        onSignIn={openSignIn}
        onSignOut={signOut}
        onRefreshUser={refreshUser}
        isFirebaseConfigured={isFirebaseConfigured}
        isFocusMode={isFocusMode}
        onToggleFocus={() => setIsFocusMode(!isFocusMode)}
        activeView={activeView}
        onViewChange={setActiveView}
        showTachycardia={aiOn}
      />

      {/* Segment Control */}
      {/* Section tabs — the dashboard's own navigation */}
      {hasTabs && !activeView && (
        <SegmentControl
          tabs={data.tabs}
          activeTabId={currentTab.id}
          onTabChange={setActiveTabId}
          onTabAdd={(tab) => { addTab(tab); setActiveTabId(tab.id) }}
          onTabDelete={handleTabDelete}
          onTabUpdate={updateTab}
        />
      )}

      {isFocusMode && (
        <FocusMode
          data={data}
          currentTabId={currentTab?.id || null}
          settings={settings}
          onExit={() => setIsFocusMode(false)}
          onStartSession={handleSessionStart}
          onApplyActions={applyAICalls}
          onSignIn={openSignIn}
          isSignedIn={!!user && isSignedIn()}
        />
      )}

      {activeView === 'blocks' ? (
        <BlocksPage
          blocks={blocks}
          onAddBlock={addBlock}
          onDeleteBlock={deleteBlock}
          onToggleTask={toggleTaskInBlock}
          tabs={data.tabs}
          blockTemplates={blockTemplates}
          onAddBlockTemplate={addBlockTemplate}
          onDeleteBlockTemplate={deleteBlockTemplate}
        />
      ) : activeView === 'calendar' ? (
        <CalendarPage
          tasks={calendar}
          weekStart={getSetting(settings, 'weekStart')}
          carryOverTasks={getSetting(settings, 'carryOverTasks')}
          listTasks={listTasksByDay}
          onToggleListTask={(tabId, topic) => updateTopic(tabId, topic.id, {
            // Same rules as ticking it in the list (TopicList.handleToggleComplete).
            completed: !topic.completed,
            completedAt: topic.completed ? null : new Date().toISOString(),
            reviewStage: topic.completed ? 0 : (topic.reviewStage || 0),
          })}
          onAddTask={addCalendarTask}
          onToggleTask={toggleCalendarTask}
          onEditTask={editCalendarTask}
          onDeleteTask={deleteCalendarTask}
          onClearDay={clearCalendarDay}
          onAddSubtask={addCalendarSubtask}
          onToggleSubtask={toggleCalendarSubtask}
          onDeleteSubtask={deleteCalendarSubtask}
        />
      ) : activeView === 'tachycardia' && aiOn ? (
        <TachycardiaTab
          data={data}
          settings={settings}
          onApplyAction={(call) => applyAICalls([call])}
          onSignIn={openSignIn}
          isSignedIn={!!user && isSignedIn()}
          onBack={() => setActiveView(null)}
        />
      ) : !hasTabs ? (
        <EmptySections onCreate={handleCreateFirstSection} suggestions={getListSuggestions(settings)} />
      ) : (
        <>
          {/* One wide working sheet (DESIGN.md): countdown, the section band
              (progress lives in the title), the task line, then To do | Done. */}
          <div className="px-6 mt-4 no-print empty:mt-0">
            <CountdownWidget
              isEnabled={data.settings.countdownVisible}
              targetDate={data.settings.examDate}
            />
          </div>

          <HeroSection
            title={currentTab.title}
            completedCount={completedCount}
            totalCount={totalCount}
            globalCompletedCount={globalStats.completed}
            globalTotalCount={globalStats.total}
          />

          <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <TopicList
              tab={currentTab}
              timerSession={data.timerSession}
              defaultDuration={data.settings.timerDuration}
              onTopicUpdate={updateTopic}
              onTopicAdd={addTopic}
              onTopicDelete={deleteTopic}
              onTimerStart={handleTimerStart}
              onReorderTopics={reorderTopics}
              onSubtaskAdd={addSubtask}
              onSubtaskUpdate={updateSubtask}
              onSubtaskDelete={deleteSubtask}
              onSectionComplete={handleSectionComplete}
              spacedRepetitionEnabled={data.settings.spacedRepetition}
              hideCompleted={getSetting(settings, 'hideCompleted')}
            />
          </div>
        </>
      )}
      </div>{/* end app-container */}

      <SignInDialog
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSignIn={signIn}
      />

      <Confetti active={confettiActive} disabled={getSetting(settings, 'reduceMotion')} />

      {/* Full-screen session */}
      {sessionOverlay && !sessionOverlay.minimized && (
        <FocusSession
          label={sessionOverlay.label}
          steps={sessionOverlay.steps}
          nextUp={sessionOverlay.nextUp}
          phase={sessionOverlay.phase}
          timeLeft={sessionOverlay.phase === 'done' ? 0 : timeLeft}
          totalSeconds={sessionOverlay.totalSeconds}
          isRunning={!!data.timerSession?.isRunning}
          settings={settings}
          onPauseResume={handleTimerPauseResume}
          onStop={handleTimerReset}
          onMinimize={() => setSessionOverlay(s => s && { ...s, minimized: true })}
          onParkThought={handleParkThought}
          onStuck={aiOn && user ? () => generateSteps(sessionOverlay.label, data) : undefined}
          onFinish={() => setSessionOverlay(null)}
        />
      )}

      {/* Floating Timer — the minimised session, or a quick start */}
      {!(sessionOverlay && !sessionOverlay.minimized) && (
        <FloatingTimer
          isActive={!!data.timerSession}
          isRunning={data.timerSession?.isRunning}
          formattedTime={formattedTime}
          timeProgress={data.timerSession ? 1 - (timeLeft / (data.timerSession.plannedSeconds || data.timerSession.totalSeconds)) : 0}
          currentTopicName={
            sessionOverlay?.label ||
            (data.timerSession
              ? data.tabs.find(t => t.id === data.timerSession.tabId)?.topics.find(t => t.id === data.timerSession.topicId)?.name
              : null)
          }
          onPauseResume={handleTimerPauseResume}
          onReset={handleTimerReset}
          onStart={handleStartSession}
          onExpand={() => setSessionOverlay(s => s
            ? { ...s, minimized: false }
            : {
              label: data.tabs.find(t => t.id === data.timerSession?.tabId)?.topics.find(t => t.id === data.timerSession?.topicId)?.name || 'Study session',
              steps: null, phase: 'running', minimized: false, nextUp: null,
              totalSeconds: data.timerSession?.plannedSeconds || data.timerSession?.totalSeconds || 0,
            })}
        />
      )}
    </div>
  )
}

export default App
