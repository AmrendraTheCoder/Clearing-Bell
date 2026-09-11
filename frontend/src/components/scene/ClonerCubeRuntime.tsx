import { Application } from '@splinetool/runtime'
import { useEffect, useRef } from 'react'

type Props = {
  scene: string
  active: boolean
  onLoaded: (application: Application) => void
  onFailure: () => void
}
const INITIAL_ZOOM = 0.9

export default function ClonerCubeRuntime({ scene, active, onLoaded, onFailure }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const application = useRef<Application | null>(null)
  const resizeScene = useRef<(() => boolean) | null>(null)
  const shouldPlay = useRef(active)
  const callbacks = useRef({ onLoaded, onFailure })

  useEffect(() => { callbacks.current = { onLoaded, onFailure } }, [onLoaded, onFailure])
  useEffect(() => {
    shouldPlay.current = active
    const app = application.current
    if (!app) return
    try {
      if (active && app.isStopped) {
        if (resizeScene.current?.() !== false) app.play()
      }
      else if (!active && !app.isStopped) app.stop()
    } catch { callbacks.current.onFailure() }
  }, [active])

  useEffect(() => {
    const element = canvas.current
    const host = container.current
    if (!element || !host) return
    const controller = new AbortController()
    let cancelled = false
    let app: Application | null = null
    let observer: ResizeObserver | null = null
    let startupTimer: number | undefined
    const dispose = () => {
      try { app?.stop() } catch { /* Renderer initialization may have failed. */ }
      try { app?.dispose() } catch { /* A failed initialization still must not escape cleanup. */ }
    }
    const resize = () => {
      if (cancelled || !app || application.current !== app) return false
      // Resizing a stopped WebGL drawing buffer erases its last frame. Keep
      // that bitmap visible via CSS until playback resumes, then catch up.
      if (!shouldPlay.current && app.isStopped) return true
      try {
        const bounds = host.getBoundingClientRect()
        if (bounds.width > 0 && bounds.height > 0) {
          app.setSize(Math.round(bounds.width), Math.round(bounds.height))
          app.setZoom(INITIAL_ZOOM)
        }
        return true
      } catch { if (!cancelled) callbacks.current.onFailure(); return false }
    }
    try {
      app = new Application(element, { renderer: 'webgl', renderMode: 'auto', htmlContentMode: 'sandbox' })
      const attempt = app
      void attempt.load(scene, undefined, { signal: controller.signal }).then(() => {
        if (cancelled) return
        // Spline queues its render loop at the end of start(). Synchronize after
        // that task so an initial offscreen pause cannot be overwritten by it.
        startupTimer = window.setTimeout(() => {
          if (cancelled) return
          try {
            application.current = attempt
            resizeScene.current = resize
            attempt.setGlobalEvents(false)
            if (!resize()) return
            if (typeof ResizeObserver !== 'undefined') {
              observer = new ResizeObserver(resize)
              observer.observe(host)
            } else window.addEventListener('resize', resize)
            if (!shouldPlay.current) attempt.stop()
            callbacks.current.onLoaded(attempt)
          } catch { if (!cancelled) callbacks.current.onFailure() }
        }, 0)
      }).catch(() => { if (!cancelled) callbacks.current.onFailure() }).finally(() => {
        // start() can allocate renderer resources after async feature imports,
        // even if cleanup ran meanwhile. Dispose again after that work settles.
        if (cancelled) dispose()
      })
    } catch { callbacks.current.onFailure() }

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(startupTimer)
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      if (application.current === app) {
        application.current = null
        resizeScene.current = null
      }
      dispose()
    }
  }, [scene])

  return <div ref={container} className="cloner-cube-runtime"><canvas ref={canvas} /></div>
}
