import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Soft "rain" — pink noise through a low-pass filter. Created on the first
 * toggle (browsers need a tap before audio may start) and closed on unmount.
 */
export function useRainNoise() {
    const [isPlaying, setIsPlaying] = useState(false)
    const ctxRef = useRef(null)

    useEffect(() => () => {
        ctxRef.current?.close?.()
        ctxRef.current = null
    }, [])

    const toggle = useCallback(() => {
        if (isPlaying) {
            ctxRef.current?.suspend()
            setIsPlaying(false)
            return
        }
        try {
            if (!ctxRef.current) {
                const AC = window.AudioContext || window.webkitAudioContext
                if (!AC) return
                const ctx = new AC()
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
                        output[i] *= 0.11
                        b6 = white * 0.115926
                    }
                }

                const filter = ctx.createBiquadFilter()
                filter.type = 'lowpass'
                filter.frequency.value = 800
                const gain = ctx.createGain()
                gain.gain.value = 0.3

                pinkNoise.connect(filter)
                filter.connect(gain)
                gain.connect(ctx.destination)
                ctxRef.current = ctx
            } else {
                ctxRef.current.resume()
            }
            setIsPlaying(true)
        } catch (e) {
            console.error('Rain noise failed:', e)
        }
    }, [isPlaying])

    return { isPlaying, toggle }
}
