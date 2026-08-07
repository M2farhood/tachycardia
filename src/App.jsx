import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTimer } from './hooks/useTimer'
import { useAuth } from './hooks/useAuth'
import Header from './components/Header'
import SegmentControl from './components/SegmentControl'
import HeroSection from './components/HeroSection'
import TopicList from './components/TopicList'
import StatsCards from './components/StatsCards'
import FloatingTimer from './components/FloatingTimer'
import NotesSection from './components/NotesSection'
import TemplateModal from './components/TemplateModal'
import CountdownWidget from './components/CountdownWidget'
import TachycardiaTab from './components/TachycardiaTab'
import CalendarPage from './components/CalendarPage'
import BlocksPage from './components/BlocksPage'
import FocusMode from './components/FocusMode'
import Confetti from './components/Confetti'

// Helper to get today's date string
const getTodayKey = () => new Date().toISOString().split('T')[0]

function App() {
  const {
    data,
    isFirstVisit,
    updateData,
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
    signOut,
    isFirebaseConfigured
  } = useAuth(data, updateData)

  const [activeTabId, setActiveTabId] = useState(null)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [showTachycardia, setShowTachycardia] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showBlocks, setShowBlocks] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [confettiActive, setConfettiActive] = useState(false)
  const touchStartX = useRef(null)

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

  // Load study time from localStorage
  useEffect(() => {
    // Load today's time
    const storedDaily = localStorage.getItem('study_tracker_daily_time')
    if (storedDaily) {
      try {
        const parsed = JSON.parse(storedDaily)
        if (parsed.date === getTodayKey()) {
          setTodayMinutes(parsed.minutes || 0)
        } else {
          // New day, reset daily but keep total
          localStorage.setItem('study_tracker_daily_time', JSON.stringify({ date: getTodayKey(), minutes: 0 }))
          setTodayMinutes(0)
        }
      } catch {
        setTodayMinutes(0)
      }
    }

    // Load total time
    const storedTotal = localStorage.getItem('study_tracker_total_time')
    if (storedTotal) {
      try {
        setTotalMinutes(parseInt(storedTotal, 10) || 0)
      } catch {
        setTotalMinutes(0)
      }
    }
  }, [])

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
    const duration = data?.settings?.timerDuration || 25

    // Update today's time
    const newTodayTotal = todayMinutes + duration
    setTodayMinutes(newTodayTotal)
    localStorage.setItem('study_tracker_daily_time', JSON.stringify({
      date: getTodayKey(),
      minutes: newTodayTotal
    }))

    // Update all-time total
    const newTotal = totalMinutes + duration
    setTotalMinutes(newTotal)
    localStorage.setItem('study_tracker_total_time', newTotal.toString())

    // Record today for the streak (synced; no-op if already recorded today)
    recordStudyDay(getTodayKey())

    updateTimerSession(null)
  }, [updateTimerSession, recordStudyDay, todayMinutes, totalMinutes, data?.settings?.timerDuration])

  // Timer hook
  const { timeLeft, formattedTime, isRunning } = useTimer(
    data?.timerSession,
    handleTimerComplete,
    data?.settings?.isMuted
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
    const keyOf = (d) => d.toISOString().split('T')[0]

    const now = new Date()
    let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    if (!studied.has(keyOf(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1)

    let count = 0
    while (studied.has(keyOf(cursor))) {
      count++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
    return count
  }, [data?.studyDates])

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
  const handleTimerStart = useCallback((tabId, topicId) => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

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
      updateTimerSession({
        tabId,
        topicId,
        startTime: Date.now(),
        totalSeconds: duration * 60,
        isRunning: true
      })
    }
  }, [data?.settings?.timerDuration, data?.timerSession, updateTimerSession, timeLeft])

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
  }, [updateTimerSession])

  const handleNotesChange = useCallback((notes) => {
    if (currentTab) {
      updateTab(currentTab.id, { notes })
    }
  }, [currentTab, updateTab])

  const handleImport = useCallback((importedData) => {
    updateData(importedData)
    if (importedData.tabs.length > 0) {
      setActiveTabId(importedData.tabs[0].id)
    }
  }, [updateData])

  const handleClearAll = useCallback(() => {
    clearAllData()
    setActiveTabId(null)
    setTodayMinutes(0)
    setTotalMinutes(0)
    localStorage.removeItem('study_tracker_daily_time')
    localStorage.removeItem('study_tracker_total_time')
  }, [clearAllData])

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

  // Handle importing tasks from Plan Importer
  const handleImportTasks = useCallback((tabId, topics) => {
    topics.forEach(topic => {
      addTopic(tabId, topic)
    })
  }, [addTopic])

  // Show template modal for first-time users
  if (isFirstVisit || !data) {
    return (
      <TemplateModal
        onSelect={updateData}
        onClose={() => { }}
      />
    )
  }

  // Ensure we have a current tab
  if (!currentTab) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/60">No sections available.</p>
          <button
            onClick={() => handleClearAll()}
            className="mt-4 text-accent hover:underline"
          >
            Reset and start over
          </button>
        </div>
      </div>
    )
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
      {/* Header */}
      <Header
        data={data}
        settings={data.settings}
        todayMinutes={todayMinutes}
        totalMinutes={totalMinutes}
        onImport={handleImport}
        onClearAll={handleClearAll}
        onSettingsChange={updateSettings}
        onImportTasks={handleImportTasks}
        // Auth props
        user={user}
        isAuthLoading={isAuthLoading}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
        onSignIn={signIn}
        onSignOut={signOut}
        isFirebaseConfigured={isFirebaseConfigured}
        isFocusMode={isFocusMode}
        onToggleFocus={() => setIsFocusMode(!isFocusMode)}
      />

      {/* Segment Control */}
      <SegmentControl
        tabs={data.tabs}
        activeTabId={currentTab.id}
        onTabChange={(id) => { setActiveTabId(id); setShowTachycardia(false); }}
        onTabAdd={addTab}
        onTabDelete={handleTabDelete}
        onTabUpdate={updateTab}
        onTachycardiaClick={() => { setShowTachycardia(!showTachycardia); setShowCalendar(false); setShowBlocks(false); }}
        showTachycardia={showTachycardia}
        onCalendarClick={() => { setShowCalendar(!showCalendar); setShowTachycardia(false); setShowBlocks(false); }}
        showCalendar={showCalendar}
        onBlocksClick={() => { setShowBlocks(!showBlocks); setShowCalendar(false); setShowTachycardia(false); }}
        showBlocks={showBlocks}
      />

      {isFocusMode && currentTab && (
        <FocusMode
          activeTask={currentTab.topics.find(t => !t.completed)} // Initial active task
          allTasks={currentTab.topics.filter(t => !t.completed)} // All incomplete tasks for carousel
          onComplete={(taskId) => {
            updateTopic(currentTab.id, taskId, { completed: true })
          }}
          onExit={() => setIsFocusMode(false)}
          onStartTimer={(taskId) => handleTimerStart(currentTab.id, taskId)}
          onAddSubtasks={(taskId, newSubtasks) => {
            // Add each subtask
            newSubtasks.forEach(subName => {
              addSubtask(currentTab.id, taskId, {
                id: Date.now() + Math.random(), // Simple ID generation
                name: subName,
                completed: false
              })
            })
          }}
          studyData={data}
        />
      )}

      {showBlocks ? (
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
      ) : showCalendar ? (
        <CalendarPage
          isFocusMode={isFocusMode}
          tasks={calendar}
          onAddTask={addCalendarTask}
          onToggleTask={toggleCalendarTask}
          onEditTask={editCalendarTask}
          onDeleteTask={deleteCalendarTask}
          onClearDay={clearCalendarDay}
          onAddSubtask={addCalendarSubtask}
          onToggleSubtask={toggleCalendarSubtask}
          onDeleteSubtask={deleteCalendarSubtask}
        />
      ) : showTachycardia ? (
        <TachycardiaTab
          studyData={data}
          onBack={() => setShowTachycardia(false)}
          addTopic={addTopic}
        />
      ) : (
        <>
          {/* Countdown Widget */}
          <div className="px-6 mt-4 no-print empty:mt-0">
            <CountdownWidget
              isEnabled={data.settings.countdownVisible}
              targetDate={data.settings.examDate}
            />
          </div>

          {/* Hero Section */}
          <HeroSection
            title={currentTab.title}
            emoji={currentTab.emoji}
            subtitle={`Module ${data.tabs.indexOf(currentTab) + 1} of ${data.tabs.length}`}
            completedCount={completedCount}
            totalCount={totalCount}
            globalCompletedCount={globalStats.completed}
            globalTotalCount={globalStats.total}
          />

          {/* Topic List */}
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
          />
          </div>

          {/* Stats Cards */}
          <StatsCards
            studyStreak={streak}
            todayMinutes={todayMinutes}
            totalMinutes={totalMinutes}
          />

          {/* Notes Section */}
          <NotesSection
            notes={currentTab.notes || ''}
            onChange={handleNotesChange}
          />
        </>
      )}
      </div>{/* end app-container */}

      <Confetti active={confettiActive} />

      {/* Floating Timer */}
      <FloatingTimer
        isActive={!!data.timerSession}
        isRunning={data.timerSession?.isRunning}
        formattedTime={formattedTime}
        timeProgress={data.timerSession ? 1 - (timeLeft / data.timerSession.totalSeconds) : 0}
        currentTopicName={
          data.timerSession
            ? currentTab.topics.find(t => t.id === data.timerSession.topicId)?.name
            : null
        }
        onPauseResume={handleTimerPauseResume}
        onReset={handleTimerReset}
        onStart={handleStartSession}
      />
    </div>
  )
}

export default App
