import { useState, useCallback, useMemo, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTimer } from './hooks/useTimer'
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
    addTab,
    deleteTab,
    reorderTopics,
    updateSettings,
    updateTimerSession,
    clearAllData
  } = useLocalStorage(null)

  const [activeTabId, setActiveTabId] = useState(null)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [showTachycardia, setShowTachycardia] = useState(false)

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

    updateTimerSession(null)
  }, [updateTimerSession, todayMinutes, totalMinutes, data?.settings?.timerDuration])

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

  // Calculate streak (simplified)
  const streak = useMemo(() => {
    if (!data?.tabs) return 0
    let totalCompleted = 0
    data.tabs.forEach(tab => {
      totalCompleted += tab.topics.filter(t => t.completed).length
    })
    return totalCompleted > 0 ? Math.min(Math.floor(totalCompleted / 3) + 1, 30) : 0
  }, [data?.tabs])

  // Calculate global stats
  const globalStats = useMemo(() => {
    if (!data?.tabs) return { completed: 0, total: 0 }
    let completed = 0
    let total = 0
    data.tabs.forEach(tab => {
      completed += tab.topics.filter(t => t.completed).length
      total += tab.topics.length
    })
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
            className="mt-4 text-blue-400 hover:underline"
          >
            Reset and start over
          </button>
        </div>
      </div>
    )
  }

  const completedCount = currentTab.topics.filter(t => t.completed).length
  const totalCount = currentTab.topics.length

  return (
    <div className="min-h-screen pb-safe">
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
      />

      {/* Segment Control */}
      <SegmentControl
        tabs={data.tabs}
        activeTabId={currentTab.id}
        onTabChange={(id) => { setActiveTabId(id); setShowTachycardia(false); }}
        onTabAdd={addTab}
        onTabDelete={handleTabDelete}
        onTabUpdate={updateTab}
        onTachycardiaClick={() => setShowTachycardia(!showTachycardia)}
        showTachycardia={showTachycardia}
      />

      {/* Tachycardia AI Tab or Regular Content */}
      {showTachycardia ? (
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
          <TopicList
            tab={currentTab}
            timerSession={data.timerSession}
            defaultDuration={data.settings.timerDuration}
            onTopicUpdate={updateTopic}
            onTopicAdd={addTopic}
            onTopicDelete={deleteTopic}
            onTimerStart={handleTimerStart}
            onReorderTopics={reorderTopics}
          />

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
