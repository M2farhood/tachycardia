import { useState, useEffect, useRef } from 'react'
import { CheckCircle, ArrowRight, Brain, CloudRain, VolumeX, AlertCircle, Clock, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { askTachycardia, generateSubtasks } from '../services/aiService'

const FocusMode = ({
    activeTask,
    allTasks = [],
    onComplete,
    onExit,
    onStartTimer,
    onAddSubtasks,
    studyData
}) => {
    const [isPlaying, setIsPlaying] = useState(false)
    const [audioContext, setAudioContext] = useState(null)
    const [showStuckMenu, setShowStuckMenu] = useState(false)
    // const [aiAdvice, setAiAdvice] = useState('') // Deprecated in favor of subtasks
    const [isLoadingAi, setIsLoadingAi] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)
    const [isSkipping, setIsSkipping] = useState(false)

    // Task Carousel State
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
    const currentTask = allTasks[currentTaskIndex] || activeTask

    // AI Subtasks State
    const [suggestedSubtasks, setSuggestedSubtasks] = useState([])
    const [selectedSubtasks, setSelectedSubtasks] = useState({})

    // Initialize task index
    useEffect(() => {
        if (activeTask && allTasks.length > 0) {
            const idx = allTasks.findIndex(t => t.id === activeTask.id)
            if (idx !== -1) setCurrentTaskIndex(idx)
        }
    }, [activeTask, allTasks])

    // Cleanup Audio
    useEffect(() => {
        return () => {
            if (audioContext) {
                audioContext.close()
            }
        }
    }, [audioContext])

    // Rain Noise Generator (Pink Noise + LowPass Filter)
    const toggleRainNoise = () => {
        if (isPlaying) {
            if (audioContext) audioContext.suspend()
            setIsPlaying(false)
        } else {
            if (!audioContext) {
                const ctx = new (window.AudioContext || window.webkitAudioContext)()
                const bufferSize = 4096
                const pinkNoise = ctx.createScriptProcessor(bufferSize, 1, 1)

                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
                pinkNoise.onaudioprocess = (e) => {
                    const output = e.outputBuffer.getChannelData(0)
                    for (let i = 0; i < bufferSize; i++) {
                        const white = Math.random() * 2 - 1
                        b0 = 0.99886 * b0 + white * 0.0555179
                        b1 = 0.99332 * b1 + white * 0.0750759
                        b2 = 0.96900 * b2 + white * 0.1538520
                        b3 = 0.86650 * b3 + white * 0.3104856
                        b4 = 0.55000 * b4 + white * 0.5329522
                        b5 = -0.7616 * b5 - white * 0.0168980
                        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
                        output[i] *= 0.11 // Gain
                        b6 = white * 0.115926
                    }
                }

                // Lowpass filter to muffle it like rain
                const filter = ctx.createBiquadFilter()
                filter.type = 'lowpass'
                filter.frequency.value = 800

                const gain = ctx.createGain()
                gain.gain.value = 0.3

                pinkNoise.connect(filter)
                filter.connect(gain)
                gain.connect(ctx.destination)

                setAudioContext(ctx)
            } else {
                audioContext.resume()
            }
            setIsPlaying(true)
        }
    }

    const handleNextTask = () => {
        if (currentTaskIndex < allTasks.length - 1) {
            setIsSkipping(true)
            setTimeout(() => {
                setCurrentTaskIndex(prev => prev + 1)
                setIsSkipping(false)
            }, 300)
        }
    }

    const handlePrevTask = () => {
        if (currentTaskIndex > 0) {
            setIsSkipping(true)
            setTimeout(() => {
                setCurrentTaskIndex(prev => prev - 1)
                setIsSkipping(false)
            }, 300)
        }
    }

    const handleImStuck = async () => {
        setShowStuckMenu(true)
        if (suggestedSubtasks.length > 0) return // Don't regenerate if already have valid suggestions

        setIsLoadingAi(true)
        try {
            const subtasks = await generateSubtasks(currentTask.name, studyData)
            setSuggestedSubtasks(subtasks)
        } catch (error) {
            setSuggestedSubtasks(["Just start anywhere.", "Open your notes."])
        } finally {
            setIsLoadingAi(false)
        }
    }

    const handleAddSelectedSubtasks = () => {
        const toAdd = suggestedSubtasks.filter((_, i) => selectedSubtasks[i])
        if (toAdd.length > 0) {
            onAddSubtasks(currentTask.id, toAdd)
            setShowStuckMenu(false)
            setSuggestedSubtasks([]) // Clear
            setSelectedSubtasks({})
        }
    }

    const handleComplete = () => {
        setIsCompleted(true)
        setTimeout(() => {
            onComplete(currentTask.id)
            setIsCompleted(false)
            // Move to next task if available
            if (currentTaskIndex < allTasks.length - 1) {
                setCurrentTaskIndex(prev => prev + 1)
            } else if (allTasks.length > 1) {
                setCurrentTaskIndex(0) // Loop back or handle empty
            } else {
                onExit() // Exit if last task
            }
            setShowStuckMenu(false)
        }, 1500)
    }

    if (!currentTask) {
        return (
            <div className="fixed inset-0 z-50 bg-[#0f1115] flex flex-col items-center justify-center text-white p-6">
                <div className="text-center max-w-md">
                    <Brain size={64} className="mx-auto text-blue-400 mb-6 opacity-50" />
                    <h2 className="text-3xl font-bold mb-4">All Caught Up!</h2>
                    <p className="text-white/60 mb-8">No specific tasks found. You're free to explore!</p>
                    <button
                        onClick={onExit}
                        className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-all"
                    >
                        Exit Focus Mode
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={`fixed inset-0 z-50 bg-[#0a0c10] text-white flex flex-col transition-all duration-1000 ${isCompleted ? 'scale-110 opacity-0' : 'opacity-100'}`}>
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 to-transparent opacity-50 animate-pulse-slow pointer-events-none"></div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center p-6">
                <div className="flex items-center gap-4">
                    <button onClick={toggleRainNoise} className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all text-white/50 hover:text-white group" title="Rain Noise">
                        {isPlaying ? <CloudRain size={24} className="text-blue-400" /> : <VolumeX size={24} />}
                    </button>
                </div>

                {/* Task Counter/Carousel Header */}
                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full">
                    <button
                        onClick={handlePrevTask}
                        disabled={currentTaskIndex === 0}
                        className="text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium text-white/60">
                        Task {currentTaskIndex + 1} of {allTasks.length}
                    </span>
                    <button
                        onClick={handleNextTask}
                        disabled={currentTaskIndex === allTasks.length - 1}
                        className="text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <button onClick={onExit} className="px-4 py-2 text-sm text-white/40 hover:text-white transition-colors">
                    Exit Focus
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full text-center relative z-10">
                <div className="mb-8 text-blue-400 font-medium tracking-widest uppercase text-sm animate-fade-in">
                    Current Focus
                </div>

                <div className={`transition-all duration-300 transform ${isSkipping ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                    <h1 className="text-4xl md:text-6xl font-bold mb-12 leading-tight">
                        {currentTask.name}
                    </h1>
                </div>

                {/* Primary Actions */}
                <div className={`flex flex-col items-center gap-4 mt-8 transition-all duration-300 ${isSkipping ? 'opacity-0' : 'opacity-100'}`}>
                    <button
                        onClick={() => onStartTimer(currentTask.id)}
                        className="group relative px-12 py-6 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20 w-72 overflow-hidden flex items-center justify-center gap-3"
                    >
                        <Clock size={24} />
                        Start Session
                    </button>

                    <button
                        onClick={handleImStuck}
                        className="px-8 py-4 bg-[#1a1d24] hover:bg-[#252932] text-white/60 hover:text-white rounded-2xl font-medium text-lg transition-all w-72 flex items-center justify-center gap-3"
                    >
                        <AlertCircle size={24} className="text-orange-400" />
                        I'm Stuck
                    </button>

                    <button
                        onClick={handleComplete}
                        className="mt-4 text-white/30 hover:text-green-400 transition-colors flex items-center gap-2 text-sm"
                    >
                        <CheckCircle size={16} /> Mark as Complete
                    </button>
                </div>
            </div>

            {/* AI Advice Overlay */}
            {showStuckMenu && (
                <div className="absolute bottom-0 left-0 right-0 bg-[#15181e] border-t border-white/10 p-8 rounded-t-3xl animate-slide-up-panel z-20 shadow-2xl">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Brain className="text-purple-400" />
                                Let's break it down
                            </h3>
                            <button onClick={() => setShowStuckMenu(false)} className="text-white/40 hover:text-white">✕</button>
                        </div>

                        {isLoadingAi ? (
                            <div className="flex items-center justify-center py-8 text-white/40 gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                                Thinking...
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    {suggestedSubtasks.map((step, idx) => (
                                        <label key={idx} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-white/10">
                                            <input
                                                type="checkbox"
                                                checked={!!selectedSubtasks[idx]}
                                                onChange={(e) => setSelectedSubtasks(prev => ({ ...prev, [idx]: e.target.checked }))}
                                                className="w-5 h-5 rounded border-white/30 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-transparent"
                                            />
                                            <span className="text-white/90">{step}</span>
                                        </label>
                                    ))}
                                </div>

                                <button
                                    onClick={handleAddSelectedSubtasks}
                                    disabled={!Object.values(selectedSubtasks).some(Boolean)}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={20} />
                                    Add Selected Steps to Task
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default FocusMode
