import { useState, useEffect, useRef } from 'react'
import { Play, Pause, CheckCircle, ArrowRight, Brain, Volume2, VolumeX, AlertCircle } from 'lucide-react'
import { askTachycardia } from '../services/aiService'

const FocusMode = ({
    activeTask,
    onComplete,
    onExit,
    onSkip,
    studyData
}) => {
    const [isPlaying, setIsPlaying] = useState(false)
    const [audioContext, setAudioContext] = useState(null)
    const [brownNoiseNode, setBrownNoiseNode] = useState(null)
    const [gainNode, setGainNode] = useState(null)
    const [showStuckMenu, setShowStuckMenu] = useState(false)
    const [aiAdvice, setAiAdvice] = useState('')
    const [isLoadingAi, setIsLoadingAi] = useState(false)
    const [subtasks, setSubtasks] = useState([])
    const [isCompleted, setIsCompleted] = useState(false)

    // Brown Noise Generator
    useEffect(() => {
        return () => {
            if (audioContext) {
                audioContext.close()
            }
        }
    }, [audioContext])

    const toggleBrownNoise = () => {
        if (isPlaying) {
            // Stop
            if (audioContext) audioContext.suspend()
            setIsPlaying(false)
        } else {
            // Start
            if (!audioContext) {
                const ctx = new (window.AudioContext || window.webkitAudioContext)()
                const bufferSize = 4096
                const whiteNoise = ctx.createScriptProcessor(bufferSize, 1, 1)

                whiteNoise.onaudioprocess = (e) => {
                    const output = e.outputBuffer.getChannelData(0)
                    for (let i = 0; i < bufferSize; i++) {
                        const white = Math.random() * 2 - 1
                        output[i] = (lastOut + (0.02 * white)) / 1.02
                        lastOut = output[i]
                        output[i] *= 3.5 // (roughly) compensate for gain
                    }
                }

                let lastOut = 0
                const gain = ctx.createGain()
                gain.gain.value = 0.1 // Low volume

                whiteNoise.connect(gain)
                gain.connect(ctx.destination)

                setAudioContext(ctx)
                setBrownNoiseNode(whiteNoise)
                setGainNode(gain)
            } else {
                audioContext.resume()
            }
            setIsPlaying(true)
        }
    }

    const handleImStuck = async () => {
        setShowStuckMenu(true)
        if (!activeTask || aiAdvice) return

        setIsLoadingAi(true)
        try {
            const prompt = `I'm stuck on the task: "${activeTask.name}". 
            Please give me a very brief, encouraging 3-step micro-plan to get started. 
            Format as a simple HTML list <ul><li>...</li></ul>.`

            const response = await askTachycardia(prompt, studyData)
            setAiAdvice(response)
        } catch (error) {
            setAiAdvice("Just take a deep breath. Start with the smallest possible step.")
        } finally {
            setIsLoadingAi(false)
        }
    }

    const handleComplete = () => {
        setIsCompleted(true)
        setTimeout(() => {
            onComplete(activeTask.id)
            setIsCompleted(false)
            setAiAdvice('')
            setShowStuckMenu(false)
        }, 1500) // Wait for animation
    }

    if (!activeTask) {
        return (
            <div className="fixed inset-0 z-50 bg-[#0f1115] flex flex-col items-center justify-center text-white p-6">
                <div className="text-center max-w-md">
                    <Brain size={64} className="mx-auto text-blue-400 mb-6 opacity-50" />
                    <h2 className="text-3xl font-bold mb-4">All Caught Up!</h2>
                    <p className="text-white/60 mb-8">No specific tasks found in this section. You're free to explore!</p>
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
                    <button onClick={toggleBrownNoise} className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all text-white/50 hover:text-white">
                        {isPlaying ? <Volume2 size={24} /> : <VolumeX size={24} />}
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

                <h1 className="text-4xl md:text-6xl font-bold mb-12 leading-tight animate-slide-up">
                    {activeTask.name}
                </h1>

                {/* Actions */}
                <div className="flex flex-col md:flex-row items-center gap-6 mt-8">
                    <button
                        onClick={handleComplete}
                        className="group relative px-12 py-6 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20 w-full md:w-auto overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        <span className="flex items-center gap-3">
                            <CheckCircle size={24} />
                            Mark Complete
                        </span>
                    </button>

                    <button
                        onClick={handleImStuck}
                        className="px-8 py-6 bg-[#1a1d24] hover:bg-[#252932] text-white/60 hover:text-white rounded-2xl font-medium text-lg transition-all w-full md:w-auto flex items-center justify-center gap-3"
                    >
                        <AlertCircle size={24} className="text-orange-400" />
                        I'm Stuck
                    </button>
                </div>

                <button
                    onClick={() => onSkip(activeTask.id)}
                    className="mt-12 text-white/20 hover:text-white/40 transition-colors flex items-center gap-2"
                >
                    Skip for now <ArrowRight size={16} />
                </button>
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
                            <div className="prose prose-invert max-w-none text-white/80">
                                {activeTask.subtasks && activeTask.subtasks.length > 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-white/60 mb-4">You already have specific steps. Starting with just one makes it easier!</p>
                                        {activeTask.subtasks.map(sub => (
                                            <div key={sub.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg active:bg-white/10 transition-colors">
                                                <div className={`w-4 h-4 rounded border ${sub.completed ? 'bg-green-500 border-green-500' : 'border-white/30'}`}></div>
                                                <span className={sub.completed ? 'line-through text-white/40' : ''}>{sub.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div dangerouslySetInnerHTML={{ __html: aiAdvice }} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default FocusMode
