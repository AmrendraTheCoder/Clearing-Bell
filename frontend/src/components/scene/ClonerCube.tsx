import { Component, lazy, Suspense, useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Application } from '@splinetool/runtime'
import { ImageIcon, Pause, Play, RotateCcw } from 'lucide-react'
import './ClonerCube.css'

export const CLONER_CUBE_SCENE = 'https://prod.spline.design/jR3l1Vsa26e0CTYN/scene.splinecode'
const LOAD_TIMEOUT_MS = 25_000
type LoadState = 'loading' | 'ready' | 'error'
export type ClonerCubeProps = {
  poster?: string
  className?: string
  onLoad?: (application: Application) => void
}

class CubeBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

function CubePoster({ poster }: Pick<ClonerCubeProps, 'poster'>) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  return <div className="cloner-cube-poster" aria-hidden="true">
    {poster && failedSource !== poster ? <img src={poster} alt="" decoding="async" loading="eager" draggable={false} onError={() => setFailedSource(poster)} /> : <span className="cloner-cube-poster-label">Cloner Cube Binary</span>}
  </div>
}

// A retry gets a fresh lazy component as well as a fresh Spline application.
function CubeAttempt({ active, onLoaded, onFailure }: {
  active: boolean
  onLoaded: (application: Application) => void
  onFailure: () => void
}) {
  const [Runtime] = useState(() => lazy(() => import('./ClonerCubeRuntime')))
  return <CubeBoundary onFailure={onFailure}><Suspense fallback={null}><Runtime scene={CLONER_CUBE_SCENE} active={active} onLoaded={onLoaded} onFailure={onFailure} /></Suspense></CubeBoundary>
}

function CubeExperience({ poster, visible, onStill, onLoad }: Pick<ClonerCubeProps, 'poster' | 'onLoad'> & { visible: boolean; onStill: () => void }) {
  const [state, setState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [playing, setPlaying] = useState(true)
  const descriptionId = useId()
  const fail = useCallback(() => setState('error'), [])
  const loaded = useCallback((application: Application) => { setState('ready'); onLoad?.(application) }, [onLoad])

  useEffect(() => {
    if (state !== 'loading') return
    const timeout = window.setTimeout(fail, LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [state, attempt, fail])

  const retry = () => { setAttempt(current => current + 1); setState('loading'); setPlaying(true) }
  return <div className="cloner-cube-experience" data-state={state}>
    <div className="cloner-cube-stage" aria-busy={state === 'loading'}>
      {state !== 'ready' && <CubePoster poster={poster} />}
      {state !== 'error' && <div className={`cloner-cube-live${state === 'ready' ? ' is-ready' : ''}`} aria-hidden="true"><CubeAttempt key={attempt} active={visible && playing} onLoaded={loaded} onFailure={fail} /></div>}
      {state === 'loading' && <div className="cloner-cube-message" role="status"><span className="cloner-cube-progress" aria-hidden="true" /><span>Loading sculpture</span></div>}
      {state === 'error' && <div className="cloner-cube-message cloner-cube-error" role="status"><p>3D couldn’t load.</p><span>The still image is available. You can retry when ready.</span><button type="button" className="cloner-cube-button" onClick={retry}><RotateCcw size={16} aria-hidden="true" />Retry 3D</button></div>}
    </div>
    <div className="cloner-cube-footer">
      <p id={descriptionId}>{state === 'ready' ? 'Interactive sculpture' : state === 'loading' ? 'Cloner Cube Binary' : 'Still preview'}</p>
      <div className="cloner-cube-controls">
        {state === 'ready' && <button type="button" className="cloner-cube-button" aria-label={playing ? 'Pause 3D sculpture' : 'Play 3D sculpture'} aria-describedby={descriptionId} onClick={() => setPlaying(current => !current)}>{playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}<span>{playing ? 'Pause' : 'Play'}</span></button>}
        {state === 'ready' && <button type="button" className="cloner-cube-button" onClick={retry} aria-label="Reset sculpture view" title="Reset sculpture view"><RotateCcw size={16} aria-hidden="true" /></button>}
        <button type="button" className="cloner-cube-button cloner-cube-still" onClick={onStill}><ImageIcon size={16} aria-hidden="true" /><span>Still image</span></button>
      </div>
    </div>
  </div>
}

/** A decorative brand sculpture, deliberately separate from financial data. */
export function ClonerCube({ poster, className = '', onLoad }: ClonerCubeProps) {
  const host = useRef<HTMLElement>(null)
  const [entered, setEntered] = useState(() => typeof window !== 'undefined' && !('IntersectionObserver' in window))
  const [visible, setVisible] = useState(() => typeof window !== 'undefined' && !('IntersectionObserver' in window))
  const [pageVisible, setPageVisible] = useState(() => typeof document !== 'undefined' && document.visibilityState !== 'hidden')
  const [smallScreen, setSmallScreen] = useState(() => typeof window === 'undefined' || window.matchMedia('(max-width: 767px)').matches)
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [optedIn, setOptedIn] = useState(false)
  const [stillOnly, setStillOnly] = useState(false)

  useEffect(() => {
    const small = window.matchMedia('(max-width: 767px)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateSmall = () => setSmallScreen(small.matches)
    const updateReduced = () => { setReducedMotion(reduced.matches); if (reduced.matches) setOptedIn(false) }
    const updateVisibility = () => setPageVisible(document.visibilityState !== 'hidden')
    small.addEventListener('change', updateSmall)
    reduced.addEventListener('change', updateReduced)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      small.removeEventListener('change', updateSmall)
      reduced.removeEventListener('change', updateReduced)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  useEffect(() => {
    const element = host.current
    if (!element || !('IntersectionObserver' in window)) return
    const near = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setEntered(true); near.disconnect() }
    }, { rootMargin: '160px' })
    const inView = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    near.observe(element)
    inView.observe(element)
    return () => { near.disconnect(); inView.disconnect() }
  }, [])

  const eligible = !stillOnly && (optedIn || (!smallScreen && !reducedMotion))
  const activate = () => { setEntered(true); setStillOnly(false); setOptedIn(true) }
  return <figure ref={host} className={`cloner-cube ${className}`} aria-label="Cloner Cube Binary, a decorative Spline sculpture">
    {eligible && entered ? <CubeExperience poster={poster} visible={visible && pageVisible} onStill={() => setStillOnly(true)} onLoad={onLoad} /> : <div className="cloner-cube-preview" data-state="preview">
      <div className="cloner-cube-stage"><CubePoster poster={poster} /></div>
      <div className="cloner-cube-footer"><p>{reducedMotion ? 'Still preview · reduced motion' : 'Cloner Cube Binary'}</p><button type="button" className="cloner-cube-button" onClick={activate}><Play size={16} aria-hidden="true" />Activate 3D</button></div>
    </div>}
    <figcaption className="sr-only">A decorative white voxel cube with mint accents. It does not represent orders, prices or market activity.</figcaption>
  </figure>
}

export default ClonerCube
