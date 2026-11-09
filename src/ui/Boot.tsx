import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useStore } from '../store'

/**
 * The start-up sequence, in AI-Compta colours, on the Iron Man boot it quotes.
 *
 * Four beats, in order, cyan on black:
 *   1. an angular status bar — "INITIATING SYSTEM" — over a scrolling boot log,
 *      with a segmented bar filling left to right;
 *   2. concentric reticle rings assembling inward until "J.A.R.V.I.S" resolves
 *      at the centre;
 *   3. an invoice schematic — a document being read, with tax call-outs;
 *   4. the triangular arc reactor lighting from a dim outline to full glow,
 *      which is the hand-off into the live scene behind it.
 *
 * It is one full-frame overlay driven by a small stage clock rather than four
 * components, so the timing is legible in one place. Everything is SVG and CSS
 * — no images to load, nothing that can arrive late and stall the first beat.
 */

/** The stage boundaries, in milliseconds from power-on. `done` is when the
 *  overlay dissolves; App owns the actual hand-off, this is only for pacing. */
const T = { rings: 2600, suit: 5200, reactor: 7200 }

const LOG = [
  'PLAN COMPTABLE TUNISIEN ........ OK',
  'TVA / RETENUE À LA SOURCE ...... OK',
  'TEIF / EL FATOORA .............. OK',
  'OCR FACTURES ................... OK',
  'FR / AR / EN ................... OK',
  'AI-COMPTA ...................... EN LIGNE',
]

type Stage = 'bar' | 'rings' | 'suit' | 'reactor'

export function Boot() {
  const phase = useStore((s) => s.phase)
  const reduced = useReducedMotion()
  const [t, setT] = useState(0)

  // A single clock: elapsed milliseconds since the boot phase began. Every
  // stage reads from it, so nothing can drift out of step with anything else.
  //
  // Driven by setInterval over wall-clock time, NOT requestAnimationFrame —
  // rAF is throttled to a crawl (and paused outright) whenever the tab is not
  // the focused one, which froze the sequence on its first beat. An interval
  // reading Date.now advances by real elapsed time whatever the browser does
  // with its frame budget: throttling can cost smoothness, never correctness.
  useEffect(() => {
    if (phase !== 'boot') {
      setT(0)
      return
    }
    const start = Date.now()
    setT(0)
    const id = setInterval(() => setT(Date.now() - start), 50)
    return () => clearInterval(id)
  }, [phase])

  if (phase !== 'boot') return null

  const stage: Stage =
    t >= T.reactor ? 'reactor' : t >= T.suit ? 'suit' : t >= T.rings ? 'rings' : 'bar'

  const logShown = Math.min(LOG.length, Math.floor((t / T.rings) * (LOG.length + 1)))
  const barPct = Math.min(1, t / (T.rings - 300))

  return (
    <AnimatePresence>
      <motion.div
        className="boot"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 0.8 }}
      >
        {/* ---- beat 1: the status bar, dimming once its work is done ---- */}
        <div className={`boot-bar ${stage !== 'bar' ? 'boot-bar-dim' : ''}`}>
          <div className="boot-bar-frame">
            <span className="boot-bar-title">
              INITIATING SYSTEM 1<span className="boot-dots">…</span>
              <span className="boot-cursor" />
            </span>
            <div className="boot-seg">
              {Array.from({ length: 22 }, (_, i) => (
                <span
                  key={i}
                  className="boot-seg-cell"
                  data-on={i / 22 < barPct ? '1' : '0'}
                />
              ))}
            </div>
          </div>
          <div className="boot-log">
            {LOG.slice(0, logShown).map((l) => (
              <div key={l} className="boot-log-line">
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* ---- beats 2-4: the centre stage ---- */}
        <div className="boot-stage">
          {stage === 'rings' && <Rings reduced={!!reduced} />}
          {stage === 'suit' && <Suit reduced={!!reduced} />}
          {stage === 'reactor' && <Reactor reduced={!!reduced} t={t - T.reactor} />}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ beat 2 */

/** Concentric reticle rings drawing inward, with the name resolving last. */
function Rings({ reduced }: { reduced: boolean }) {
  const ease = 'easeOut'
  const ring = (r: number, delay: number, dash: string, w = 1) => (
    <motion.circle
      cx="0"
      cy="0"
      r={r}
      className="boot-ring"
      strokeDasharray={dash}
      strokeWidth={w}
      initial={reduced ? { opacity: 1 } : { opacity: 0, rotate: -40, scale: 1.15 }}
      animate={{ opacity: 1, rotate: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease }}
    />
  )
  return (
    <svg className="boot-rings" viewBox="-160 -160 320 320">
      <g>
        {ring(150, 0.0, '3 6')}
        {ring(128, 0.08, '40 8 12 8', 1.4)}
        {ring(104, 0.16, '2 4')}
        {ring(84, 0.24, '30 6 6 6', 1.6)}
        {ring(60, 0.34, '1 3')}
      </g>
      <motion.text
        x="0"
        y="6"
        className="boot-name"
        initial={reduced ? { opacity: 1 } : { opacity: 0, letterSpacing: '1.4em' }}
        animate={{ opacity: 1, letterSpacing: '0.42em' }}
        transition={{ duration: 0.7, delay: 0.5, ease }}
      >
        J.A.R.V.I.S
      </motion.text>
      <motion.text
        x="0"
        y="30"
        className="boot-tag"
        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9, ease }}
      >
        AI-COMPTA
      </motion.text>
    </svg>
  )
}

/* ------------------------------------------------------------------ beat 3 */

/**
 * The invoice schematic — where the film flashes the armour blueprint, this
 * flashes the thing JARVIS spends his days reading: a document with its lines
 * and totals drawing in, flanked by tax call-outs. Same read, AI-Compta's job.
 */
function Suit({ reduced }: { reduced: boolean }) {
  return (
    <svg className="boot-suit" viewBox="-200 -150 400 300">
      <motion.g
        className="boot-suit-fig"
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* An invoice: the sheet, then its lines filling in as it is read. */}
        <motion.path
          className="boot-wire"
          d="M-62,-118 L40,-118 L62,-96 L62,118 L-62,118 Z M40,-118 L40,-96 L62,-96"
          initial={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        <path className="boot-wire" d="M-46,-96 L6,-96 M-46,-84 L-10,-84" />
        <path
          className="boot-wire boot-wire-dim"
          d="M-46,-56 L46,-56 M-46,-40 L46,-40 M-46,-24 L46,-24 M-46,-8 L46,-8 M-46,8 L46,8 M10,-62 L10,14"
        />
        <path className="boot-wire" d="M4,40 L46,40 M4,56 L46,56 M4,76 L46,76" />
        <circle className="boot-wire" cx="-30" cy="84" r="14" />
        <path className="boot-wire boot-wire-dim" d="M-38,84 L-32,90 L-22,78" />
      </motion.g>

      {[-150, 150].map((x, i) => (
        <motion.g
          key={x}
          className="boot-callout"
          initial={reduced ? { opacity: 1 } : { opacity: 0, x: x > 0 ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
        >
          <circle className="boot-wire" cx={x} cy="-10" r="26" strokeDasharray="30 6 6 6" />
          <circle className="boot-wire boot-wire-dim" cx={x} cy="-10" r="15" />
          <circle className="boot-wire" cx={x} cy="-10" r="3" />
          <path
            className="boot-wire boot-wire-dim"
            d={x > 0 ? `M${x - 26},-10 L60,-10` : `M${x + 26},-10 L-60,-10`}
          />
        </motion.g>
      ))}
      <text x="-150" y="34" className="boot-tag">TVA / TTC</text>
      <text x="150" y="34" className="boot-tag">TEIF</text>
    </svg>
  )
}

/* ------------------------------------------------------------------ beat 4 */

/** The triangular chest reactor, lighting from a dim outline to full glow. */
function Reactor({ reduced, t }: { reduced: boolean; t: number }) {
  const glow = reduced ? 1 : Math.min(1, Math.max(0, t / 1400))
  const seg = Array.from({ length: 16 }, (_, i) => i)
  return (
    <svg
      className="boot-reactor"
      viewBox="-120 -120 240 240"
      style={{ ['--glow' as string]: glow }}
    >
      {seg.map((i) => {
        const a = (i / seg.length) * Math.PI * 2 - Math.PI / 2
        const on = i / seg.length < glow * 1.05
        return (
          <line
            key={i}
            x1={Math.cos(a) * 70}
            y1={Math.sin(a) * 70}
            x2={Math.cos(a) * 100}
            y2={Math.sin(a) * 100}
            className={on ? 'boot-r-seg boot-r-on' : 'boot-r-seg'}
          />
        )
      })}
      <circle className="boot-r-ring" cx="0" cy="0" r="102" />
      <circle className="boot-r-ring boot-r-ring-in" cx="0" cy="0" r="66" />
      <path className="boot-r-tri" d="M0,-52 L46,30 L-46,30 Z" />
      <path className="boot-r-tri boot-r-tri-in" d="M0,-30 L28,20 L-28,20 Z" />
      <path className="boot-r-v" d="M-11,-4 L0,14 L11,-4" />
    </svg>
  )
}
