import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { AuctionPhase } from '../../types'
import { SceneLoader } from './SceneLoader'

const ClearingScene = lazy(() => import('./ClearingScene'))
const splineScene = import.meta.env.VITE_SPLINE_SCENE_URL as string | undefined
const Spline = splineScene ? lazy(() => import('@splinetool/react-spline')) : null
type Props = { phase: AuctionPhase; reducedMotion?: boolean }
type SceneApp = { setVariable?: (name: string, value: string | number | boolean) => void }

class SceneBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="empty-state"><h3>One price. One settlement.</h3><p>The interactive view is unavailable on this device. All four steps remain available alongside it.</p></div> : this.props.children }
}

function SplineExperience({ scene, phase }: { scene: string; phase: AuctionPhase }) {
  const app = useRef<SceneApp | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => { app.current?.setVariable?.('phase', phase) }, [phase])
  useEffect(() => {
    if (ready) return
    const timeout = window.setTimeout(() => setFailed(true), 15000)
    return () => window.clearTimeout(timeout)
  }, [ready])
  if (!Spline || failed) return <ClearingScene phase={phase} reducedMotion />
  return <div className={`spline-experience ${ready ? 'ready' : ''}`}>
    {!ready && <SceneLoader />}
    <Spline scene={scene} renderOnDemand onLoad={loaded => { app.current = loaded as SceneApp; app.current.setVariable?.('phase', phase); setReady(true) }} />
  </div>
}

export function ProtocolScene({ phase, reducedMotion }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
      if (entry.isIntersecting) setEntered(true)
    }, { rootMargin: '100px' })
    if (container.current) observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={container} className="protocol-scene-host">
    {entered ? <SceneBoundary><Suspense fallback={<SceneLoader />}>
      {splineScene && !reducedMotion && visible ? <SplineExperience scene={splineScene} phase={phase} /> : <ClearingScene phase={phase} reducedMotion={reducedMotion || !visible} />}
    </Suspense></SceneBoundary> : <SceneLoader />}
  </div>
}
