import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const COLORS = ['#4f7fbf', '#34d399', '#f59e0b', '#e2e8f0', '#a78bfa', '#60a5fa']
const COUNT = 55

const rand = (a, b) => Math.random() * (b - a) + a

export default function Confetti({ active }) {
    const canvasRef = useRef(null)
    const rafRef    = useRef(null)
    const particles = useRef([])

    useEffect(() => {
        if (!active) return

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')

        canvas.width  = window.innerWidth
        canvas.height = window.innerHeight

        particles.current = Array.from({ length: COUNT }, () => ({
            x:        rand(canvas.width * 0.2, canvas.width * 0.8),
            y:        rand(-80, -10),
            vx:       rand(-3, 3),
            vy:       rand(-8, -2),   // shoot upward first
            gravity:  rand(0.18, 0.28),
            rotation: rand(0, 360),
            rotSpeed: rand(-6, 6),
            size:     rand(7, 13),
            color:    COLORS[Math.floor(Math.random() * COLORS.length)],
            shape:    Math.random() > 0.45 ? 'rect' : 'circle',
        }))

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            let alive = false

            for (const p of particles.current) {
                p.vy      += p.gravity
                p.x       += p.vx
                p.y       += p.vy
                p.rotation += p.rotSpeed

                const alpha = Math.max(0, 1 - Math.max(0, p.y) / (canvas.height * 0.85))
                if (alpha > 0 && p.y < canvas.height + 30) alive = true

                ctx.save()
                ctx.globalAlpha = alpha
                ctx.translate(p.x, p.y)
                ctx.rotate((p.rotation * Math.PI) / 180)
                ctx.fillStyle = p.color

                if (p.shape === 'circle') {
                    ctx.beginPath()
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
                    ctx.fill()
                } else {
                    ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7)
                }
                ctx.restore()
            }

            if (alive) rafRef.current = requestAnimationFrame(draw)
        }

        rafRef.current = requestAnimationFrame(draw)
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [active])

    if (!active) return null

    return createPortal(
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 9999, width: '100vw', height: '100vh' }}
        />,
        document.body
    )
}
