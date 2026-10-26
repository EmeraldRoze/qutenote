import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { PROMPTS, OCCASIONS } from '../../lib/prompts'
import { ARTISTS, CARD_LOOKUP } from '../../lib/cards'
import { uploadPhoto } from '../../lib/uploadPhoto'
import { HANDWRITING_PEN, PENS, penStyle, DEFAULT_PEN } from '../../lib/pens'
import { useHandwritingFontFace } from '../../lib/handwriting/useHandwritingFontFace'
import { fetchHandwritingProgress } from '../../lib/handwriting/api'
import { varyHandwrittenText, renderAltCounts } from '../../lib/handwriting/variants'
import { useAuth } from '../../context/AuthContext'
import QEmoji from '../../components/QEmoji'
import TabBar from '../../components/TabBar'
import StepRecipient from './StepRecipient'
import { askForAddressByText } from '../../lib/inviteText'
import { listDrafts, saveDraft, deleteDraft, getDraft, type CardDraft } from '../../lib/drafts'
import VoiceNoteSheet, { formatSeconds } from '../../components/VoiceNoteSheet'
import FlowerText from '../../components/FlowerText'
import { trackFunnel, trackFeature, trackError } from '../../lib/analytics'
import { encodeSecret } from '../../lib/secret'
import QIcon from '../../components/QIcon'

// The four-step send flow, rebuilt to the Oct 15 2026 redesign:
// pick a card → who's it for → write your note → preview and mail.
// When the recipient is already known (?toName= deep link from a birthday
// or a profile), step 2 is skipped and the flow counts as 3 steps.

export interface NoteData {
  recipientId: string
  recipientName: string
  occasionType: string
  cardDesignType: 'ARTIST' | 'USER_UPLOAD'
  cardDesignId?: string
  cardImageUrl?: string
  noteText: string
  toneUsed: string
  fontChoice: string
  // A recorded voice note, held in memory until MAIL IT uploads it
  voiceDataUrl?: string
  voiceDuration?: number
}

const primaryPill: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
  width: '100%', height: '56px', borderRadius: '28px', border: '2px solid var(--outline)',
  boxSizing: 'border-box', cursor: 'pointer',
  background: 'var(--btn)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700,
  fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase',
}

// Secondary actions (SAVE DRAFT, Edit this note): card-white fill, same outline
const secondaryPill: React.CSSProperties = {
  ...primaryPill,
  background: 'var(--card)',
}

const KNOWN_PENS = [HANDWRITING_PEN.value, ...PENS.map((p) => p.value)]

/* ── Small shared pieces ────────────────────────────────────────── */

function BackCircle({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Back" style={{
      width: '44px', height: '44px', borderRadius: '50%', background: 'var(--light-blush)',
      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--ink)', padding: 0,
    }}>
      <QIcon name="chevron-left" size={18} />
    </button>
  )
}

function StepRow({ onBack, stepIndex, stepCount }: { onBack: () => void; stepIndex: number; stepCount: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center', gap: '12px' }}>
      <BackCircle onClick={onBack} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>Step {stepIndex} of {stepCount}</span>
        <div aria-hidden style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: stepCount }).map((_, i) => (
            <span key={i} style={{ width: '28px', height: '5px', borderRadius: '3px', background: i < stepIndex ? 'var(--highlight)' : 'var(--progress-track)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// The clear header band at the top of the screen; height stays a multiple
// of 36 so the ruled lines below keep their rhythm.
function Band({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div className="title-band" style={{ height: `${height}px` }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 20px', width: '100%' }}>
        {children}
      </div>
    </div>
  )
}

// The postage stamp that floats top-right on the note so the writing wraps
// around it. Emerald, Oct 24: it IS the tab bar's SEND stamp, just without the
// word and with the heart centered. Built at the tab bar's exact 84x94 and
// scaled down as one piece, so the perforations keep the same proportions
// instead of turning into chunky bites at small sizes.
const NAV_STAMP_W = 84
const NAV_STAMP_H = 94

function StampSvg({ width = 56, style }: { width?: number; height?: number; style?: React.CSSProperties }) {
  const k = width / NAV_STAMP_W
  const { transform, ...boxStyle } = (style ?? {}) as React.CSSProperties
  return (
    <span aria-hidden style={{
      display: 'inline-block', width: `${width}px`, height: `${Math.round(NAV_STAMP_H * k)}px`,
      flex: 'none', ...boxStyle,
    }}>
      <span className="qn-stamp qn-stamp-tight" style={{
        display: 'flex', position: 'relative', boxSizing: 'border-box',
        width: `${NAV_STAMP_W}px`, height: `${NAV_STAMP_H}px`,
        transform: `scale(${k})${transform ? ` ${transform}` : ''}`, transformOrigin: 'top left',
        ['--qn-panel' as string]: '#BADAFF',
        // The scale shrinks .qn-stamp's edge shadow along with everything else,
        // which left this little stamp with no contrast against the paper
        // (Emerald, Oct 24). Blow the radii up by 1/k so what lands on screen
        // matches every other stamp in the app.
        filter: [
          `drop-shadow(0 0 ${(1.5 / k).toFixed(2)}px rgba(74,36,36,0.55))`,
          `drop-shadow(0 0 ${(4 / k).toFixed(2)}px rgba(74,36,36,0.3))`,
          `drop-shadow(0 0 ${(10 / k).toFixed(2)}px rgba(74,36,36,0.16))`,
        ].join(' '),
      }}>
        {/* the same wax heart and postmark waves the tab bar wears, centered */}
        <svg aria-hidden width="48" height="33" viewBox="0 0 44 30" style={{ margin: 'auto' }}>
          <image href="/brand/send_stamp_heart.png" x="-1" y="2.5" width="29" height="25.6" />
          <path d="M23 9c3-2 5-2 8 0s5 2 8 0M23 15c3-2 5-2 8 0s5 2 8 0M23 21c3-2 5-2 8 0s5 2 8 0" fill="none" stroke="#4A2424" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  )
}

/* ── The flow ───────────────────────────────────────────────────── */

export default function SendFlow() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState<'card' | 'recipient' | 'write' | 'review' | 'sent'>('card')
  const [note, setNote] = useState<Partial<NoteData>>({ occasionType: 'JUST_BECAUSE', fontChoice: DEFAULT_PEN, toneUsed: 'HEARTFELT' })
  const [sentNoteId, setSentNoteId] = useState<string | null>(null)
  const [skipRecipient, setSkipRecipient] = useState(false)

  const toName = params.get('toName') ?? undefined
  const toId = params.get('toId') ?? undefined
  const editId = params.get('edit') ?? undefined
  const draftParam = params.get('draft') ?? undefined
  const [draftId, setDraftId] = useState<string | undefined>(undefined)
  const [drafts, setDrafts] = useState(() => listDrafts())

  function update(data: Partial<NoteData>) {
    setNote((prev) => ({ ...prev, ...data }))
    if (data.fontChoice === 'SECRET') trackFeature('secret-pen')
    if (data.fontChoice === 'FLOWER') trackFeature('flower-pen')
  }

  // the send funnel, step by step (Emerald's analytics)
  useEffect(() => { trackFunnel('send', step) }, [step])

  // Editing a scheduled card (from Settings → Scheduled cards): load it,
  // jump straight to the write step; SAVE CHANGES patches text + pen.
  useEffect(() => {
    if (!editId) return
    api.get(`/notes/one/${editId}`).then((res) => {
      const n = res.data.data
      setNote({
        recipientId: n.recipientId,
        recipientName: n.recipient?.displayName ?? '',
        occasionType: n.occasionType,
        noteText: n.noteText,
        toneUsed: n.toneUsed ?? 'HEARTFELT',
        fontChoice: n.fontChoice,
        cardDesignType: n.cardDesignType,
        cardDesignId: n.cardDesignId ?? undefined,
        cardImageUrl: n.cardImageUrl ?? undefined,
      })
      setSentNoteId(n.id)
      setSkipRecipient(true)
      setStep('write')
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Picking a saved draft back up: restore the whole card and jump to write.
  useEffect(() => {
    if (!draftParam) return
    const d = getDraft(draftParam)
    if (!d) return
    setNote(d.note as Partial<NoteData>)
    setDraftId(d.id)
    setStep('write')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Replying to a scanned card: the sender's id comes straight from the card,
  // so they land on pick-a-card with their friend already filled in.
  useEffect(() => {
    if (!toId) return
    setSkipRecipient(true)
    update({ recipientId: toId, recipientName: toName ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deep link from a birthday or a profile: the recipient is already known,
  // so resolve them from the QT list, skip step 2, and count 3 steps.
  useEffect(() => {
    if (!toName || toId) return
    api.get('/connections').then((res) => {
      const list: { id: string; displayName: string }[] = res.data.data ?? []
      const q = toName.toLowerCase()
      const match = list.find((c) => c.displayName.toLowerCase() === q)
        ?? list.find((c) => c.displayName.split(' ')[0].toLowerCase() === q)
        ?? list.find((c) => c.displayName.toLowerCase().startsWith(q))
      if (match) {
        setSkipRecipient(true)
        update({ recipientId: match.id, recipientName: match.displayName })
      }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ORDER: string[] = skipRecipient ? ['card', 'write', 'review'] : ['card', 'recipient', 'write', 'review']
  const STEP_COUNT = ORDER.length
  const stepIndex = ORDER.indexOf(step === 'sent' ? 'review' : step) + 1

  function backFrom(current: typeof step) {
    if (current === 'recipient') setStep('card')
    else if (current === 'write') setStep(skipRecipient ? 'card' : 'recipient')
    else if (current === 'review') setStep('write')
  }

  const content: React.CSSProperties = { maxWidth: '480px', margin: '0 auto', padding: '0 20px' }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: step === 'card' ? '140px' : '40px' }}>

      {/* ── STEP 1: PICK A CARD (the Send tab) ───────────────────── */}
      {step === 'card' && (
        <>
          <Band height={144}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '30px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Send a little somethin'</h1>
          </Band>
          <div style={content}>
            {drafts.length > 0 && (
              <div style={{ marginTop: '18px', background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '16px', overflow: 'hidden' }}>
                {drafts.map((d: CardDraft, i: number) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: i < drafts.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                    <span style={{ fontSize: '20px' }}>📝</span>
                    <button onClick={() => { setNote(d.note as Partial<NoteData>); setDraftId(d.id); setStep('write') }} style={{
                      flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontFamily: 'var(--font-body)', textTransform: 'none', letterSpacing: 0,
                    }}>
                      <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                        Draft{(d.note as Partial<NoteData>).recipientName ? ` for ${(d.note as Partial<NoteData>).recipientName}` : ''}
                      </span>
                      <span style={{ display: 'block', fontSize: '13px', color: 'var(--ink-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {((d.note as Partial<NoteData>).noteText ?? 'No words yet').slice(0, 60)}
                      </span>
                    </button>
                    <button aria-label="Delete draft" onClick={() => { deleteDraft(d.id); setDrafts(listDrafts()) }} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', fontSize: '16px', padding: '4px',
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <CardPicker
              note={note} update={update}
              onWrite={() => setStep(note.recipientId ? 'write' : 'recipient')}
            />
          </div>
          <TabBar />
        </>
      )}

      {/* ── STEP 2: WHO'S IT FOR ─────────────────────────────────── */}
      {step === 'recipient' && (
        <>
          <Band height={180}>
            <StepRow onBack={() => backFrom('recipient')} stepIndex={stepIndex} stepCount={STEP_COUNT} />
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '26px', lineHeight: '36px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Who's it for?</h1>
              <QEmoji name="bff" size={56} style={{ flex: 'none', transform: 'rotate(4deg)', height: 'auto' }} />
            </div>
          </Band>
          <div style={content}>
            <StepRecipient
              note={note}
              initialQuery={toName}
              onChangeCard={() => setStep('card')}
              onNext={(data) => { update(data); setStep('write') }}
            />
          </div>
        </>
      )}

      {/* ── STEP 3: WRITE YOUR NOTE ──────────────────────────────── */}
      {step === 'write' && (
        <>
          <Band height={216}>
            <StepRow onBack={() => backFrom('write')} stepIndex={stepIndex} stepCount={STEP_COUNT} />
            <div style={{ marginTop: '16px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <QEmoji name="heart-sparkle" size={42} style={{ flex: 'none' }} />
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>To:&nbsp;<span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>{note.recipientName}</span></span>
              </div>
              <h1 style={{ margin: '14px 0 0', paddingRight: '90px', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '28px', lineHeight: '18px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Say the thing.</h1>
              <p style={{ margin: '6px 0 0', paddingRight: '90px', fontSize: '15px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>Put it in writing, QT</p>
              <QEmoji name="pen" size={92} style={{ position: 'absolute', right: 0, top: '8px', height: 'auto' }} />
            </div>
          </Band>
          <div style={content}>
            <WriteStep note={note} update={update} onNext={() => setStep('review')} />
          </div>
        </>
      )}

      {/* ── STEP 4: PREVIEW AND MAIL ─────────────────────────────── */}
      {step === 'review' && (
        <>
          <Band height={180}>
            <StepRow onBack={() => backFrom('review')} stepIndex={stepIndex} stepCount={STEP_COUNT} />
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '26px', lineHeight: '36px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Looking good, QT.</h1>
              <QEmoji name="mailbox" size={60} style={{ flex: 'none', transform: 'rotate(5deg)', height: 'auto' }} />
            </div>
          </Band>
          <div style={content}>
            <ReviewStep
              note={note as NoteData}
              editingNoteId={sentNoteId}
              canEditRecipient={!skipRecipient}
              onSent={(id) => { trackFunnel('send', 'mailed'); if (draftId) deleteDraft(draftId); setSentNoteId(id); setStep('sent') }}
              onEditNote={() => setStep('write')}
              onEditRecipient={() => setStep('recipient')}
              onSaveDraft={() => {
                trackFeature('drafts')
                // Audio is far too big for localStorage, so drafts keep everything but the voice note
                const { voiceDataUrl: _v, voiceDuration: _d, ...draftNote } = note
                const d = saveDraft(draftNote as Record<string, unknown>, draftId)
                setDraftId(d.id)
                setDrafts(listDrafts())
                setStep('card')
                window.scrollTo(0, 0)
              }}
            />
          </div>
        </>
      )}

      {/* ── IT'S ON ITS WAY ──────────────────────────────────────── */}
      {step === 'sent' && (
        <div style={{ ...content, textAlign: 'center', paddingTop: '90px' }}>
          <QEmoji name="mailbox" size={72} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '27px', letterSpacing: '-0.02em', color: 'var(--ink)', margin: '20px 0 10px' }}>It's on its way.</h2>
          <p style={{ fontSize: '15px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', marginBottom: '8px' }}>
            {note.recipientName?.split(' ')[0]} gets a real postcard in 3 to 5 business days.
          </p>
          <p style={{ fontSize: '16px', fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'var(--stamp-center)', marginBottom: '10px' }}>
            Go make their day.
          </p>
          <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', marginBottom: '26px' }}>
            Changed your mind about a word? You can edit this note for the next 2 hours.
          </p>
          <button
            style={{ ...secondaryPill, marginBottom: '12px' }}
            onClick={() => setStep('write')}
          >
            Edit this note
          </button>
          <button style={primaryPill} onClick={() => { setNote({ occasionType: 'JUST_BECAUSE', fontChoice: DEFAULT_PEN, toneUsed: 'HEARTFELT' }); setSentNoteId(null); setSkipRecipient(false); setStep('card') }}>
            Send another
          </button>
          <button
            style={{ ...primaryPill, background: 'var(--light-blush)', marginTop: '12px' }}
            onClick={() => navigate('/home')}
          >
            Back home
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Step 1: featured swipe panel, upload tile, artist rows ─────── */

const CARD_ROTATIONS = [-5, 4, -3]

function CardPicker({ note, update, onWrite }: {
  note: Partial<NoteData>
  update: (d: Partial<NoteData>) => void
  onWrite: () => void
}) {
  // Emerald, Oct 25: the panel holds the WHOLE library now — every artist's
  // cards in one swipe, and the name underneath changes with the card.
  const LIBRARY = useMemo(
    () => ARTISTS.flatMap((a, ai) => a.cards.map((card) => ({ card, artist: a, artistIdx: ai }))),
    [],
  )
  const [cardIdx, setCardIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Emerald, Oct 25: your own photo rides at the FRONT of the same deck, so
  // there is one panel, one swipe and one WRITE ON IT — no second button
  // sitting under the first.
  const DECK = useMemo(() => {
    const mine = note.cardImageUrl
      ? [{ card: { id: '__photo', title: 'Your photo', art: note.cardImageUrl, bg: 'var(--selected-fill)' }, artist: null as null, artistIdx: -1 }]
      : []
    return [...mine, ...LIBRARY]
  }, [note.cardImageUrl, LIBRARY])

  const current = DECK[Math.min(cardIdx, DECK.length - 1)]
  const artist = current.artist

  function selectIndex(i: number) {
    const item = DECK[i]
    if (!item) return
    setCardIdx(i)
    if (item.artistIdx === -1) update({ cardDesignType: 'USER_UPLOAD', cardDesignId: undefined })
    else update({ cardDesignType: 'ARTIST', cardDesignId: item.card.id, cardImageUrl: undefined })
  }

  function goToCard(i: number, smooth = true) {
    const el = panelRef.current
    if (!el || !DECK[i]) return
    selectIndex(i)
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }

  // Tapping an artist below swipes the panel to the first card they made.
  function selectArtist(i: number) {
    const first = DECK.findIndex((x) => x.artistIdx === i)
    if (first < 0) return
    goToCard(first)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onPanelScroll() {
    const el = panelRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== cardIdx && DECK[i]) selectIndex(i)
  }

  // On load: pick up where the note left off, or select the first card.
  useEffect(() => {
    const chosen = note.cardDesignId ? DECK.findIndex((x) => x.card.id === note.cardDesignId) : -1
    if (chosen > 0) {
      setCardIdx(chosen)
      requestAnimationFrame(() => {
        const el = panelRef.current
        if (el) el.scrollTo({ left: chosen * el.clientWidth, behavior: 'auto' })
      })
    } else if (!note.cardDesignId && !note.cardImageUrl) {
      update({ cardDesignType: 'ARTIST', cardDesignId: DECK[0].card.id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadError('')
    try {
      const url = await uploadPhoto(file)
      update({ cardDesignType: 'USER_UPLOAD', cardImageUrl: url, cardDesignId: undefined })
      setCardIdx(0)
      requestAnimationFrame(() => panelRef.current?.scrollTo({ left: 0, behavior: 'smooth' }))
    } catch (err: any) {
      const detail = err?.response?.data?.error ?? err?.message ?? 'unknown'
      setUploadError(`That photo didn't upload (${detail}). Try again, or pick a different one.`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <>
      {/* Featured swipe panel */}
      <div style={{ marginTop: '20px', height: '400px', borderRadius: '28px', background: 'var(--light-blush)', position: 'relative', overflow: 'hidden' }}>
        <div
          ref={panelRef}
          onScroll={onPanelScroll}
          style={{ overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', display: 'flex' }}
        >
          {DECK.map(({ card: c, artist: a }, i) => (
            <div key={c.id} style={{
              flex: '0 0 100%', height: '300px', scrollSnapAlign: 'start',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              paddingTop: '26px', boxSizing: 'border-box',
            }}>
              {c.art ? (
                <img src={c.art} alt={a ? `${c.title} postcard by ${a.handle ?? a.name}` : 'Your photo on the postcard'} style={{
                  height: '270px', width: 'auto', maxWidth: '86%', objectFit: 'cover', borderRadius: '4px',
                  transform: `rotate(${CARD_ROTATIONS[i % 3]}deg)`, boxShadow: '0 12px 24px rgba(74, 36, 36, 0.2)',
                }} />
              ) : (
                <div style={{
                  height: '270px', width: '202px', borderRadius: '4px', background: c.bg,
                  transform: `rotate(${CARD_ROTATIONS[i % 3]}deg)`, boxShadow: '0 12px 24px rgba(74, 36, 36, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>{c.title}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: '318px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
          {DECK.map((_, i) => (
            <span key={i} style={{ width: i === cardIdx ? '18px' : '5px', height: '5px', borderRadius: '3px', background: i === cardIdx ? 'var(--ink)' : '#C2B6AA', transition: 'width 0.2s' }} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: '18px', bottom: '18px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>{artist ? (artist.featured ? 'Featured this month' : 'October artist') : 'Your photo'}</span>
          <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>{artist ? (artist.handle ?? artist.name) : 'Tap below to swap it'}</span>
        </div>
        <button
          onClick={() => {
            selectIndex(cardIdx)
            onWrite()
          }}
          style={{
            position: 'absolute', right: '16px', bottom: '16px', height: '44px', padding: '0 18px',
            borderRadius: '22px', background: 'var(--btn)', color: 'var(--ink)',
            border: '2px solid var(--outline)', boxSizing: 'border-box', cursor: 'pointer',
            display: 'flex', alignItems: 'center', fontFamily: 'var(--font-body)',
            fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em',
          }}
        >WRITE ON IT</button>
      </div>

      {/* Upload your own photo */}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFilePicked} />
      {note.cardImageUrl ? (
        <div style={{
          marginTop: '16px', width: '100%', boxSizing: 'border-box', borderRadius: '18px', border: '2px solid var(--outline)',
          background: 'var(--card)', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
        }}>
          <img src={note.cardImageUrl} alt="" style={{ width: '48px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid var(--outline)', flex: 'none' }} />
          <button onClick={() => fileRef.current?.click()} style={{
            flex: 1, minHeight: '44px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)',
            textTransform: 'none', letterSpacing: 0, padding: 0,
          }}>
            {uploading ? 'Uploading…' : 'Your photo is on it. Tap to swap.'}
          </button>
        </div>
      ) : (
        <button className="qn-stamp" onClick={() => fileRef.current?.click()} style={{
          marginTop: '24px', width: '100%', minHeight: '84px', borderRadius: '18px', boxSizing: 'border-box',
          border: '10px solid transparent', background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
          fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--stamp-center)', cursor: 'pointer',
        }}>
          <QEmoji name="camera" size={54} style={{ height: '54px', width: 'auto', objectFit: 'contain', transform: 'translateY(-7px)' }} />
          {uploading ? 'UPLOADING…' : 'UPLOAD YOUR OWN PHOTO'}
        </button>
      )}
      {uploadError && (
        <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--error)', margin: '8px 0 0' }}>{uploadError}</p>
      )}

      {/* Artist list */}
      <h2 className="on-paper" style={{ margin: '30px 0 4px', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '20px', color: 'var(--ink)' }}>October artists</h2>
      <p className="on-paper" style={{ margin: '0 0 14px', fontSize: '15px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>5 artists, 3 cards each.<br /><br />New ones every month :)</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ARTISTS.map((a, i) => {
          const active = i === current.artistIdx && !note.cardImageUrl
          return (
            <div key={a.key} style={{
              background: 'var(--card)', borderRadius: '18px', padding: '14px',
              border: active ? '2px solid var(--outline)' : '1.5px solid var(--outline)',
            }}>
              <button onClick={() => selectArtist(i)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', border: 0, background: 'transparent',
                padding: 0, minHeight: '44px', fontFamily: 'var(--font-body)', color: 'var(--ink)',
                cursor: 'pointer', textTransform: 'none', letterSpacing: 0,
              }}>
                <span aria-hidden style={{ width: '36px', height: '36px', borderRadius: '50%', background: a.avatar ?? 'var(--light-blue)', border: '1.5px solid var(--outline)' }} />
                <span style={{ fontSize: '16px', fontWeight: 700 }}>{a.handle ?? a.name}</span>
              </button>
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                {a.cards.map((c) => (
                  <button
                    key={c.id}
                    aria-label={`${c.title} card by ${a.handle ?? a.name}, write on it`}
                    onClick={() => {
                      // Tap a card, go write on it (Emerald, Oct 18)
                      update({ cardDesignType: 'ARTIST', cardDesignId: c.id, cardImageUrl: undefined })
                      onWrite()
                    }}
                    style={{
                      height: '104px', padding: 0, borderRadius: '8px', border: '1.5px solid var(--outline)',
                      background: c.bg ?? 'var(--card)', overflow: 'hidden', cursor: 'pointer',
                    }}
                  >
                    {c.art && <img src={c.art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── Step 3: ruled note card with the stamp the text wraps around ──
   The writing area is a contentEditable div, so the floated stamp in the
   top-right corner gets true text wrap (a <textarea> can't wrap around a
   float). The div stays uncontrolled — state mirrors it, never rewrites
   it, except when a prompt drops in a starter line. */

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

const NOTE_LIMIT = 450
const PEN_PREVIEW_SIZE: Record<string, number> = {
  [HANDWRITING_PEN.value]: 17, FRAUNCES: 19, SORA: 16, DM_MONO: 15, ROCK_SALT: 13, SECRET: 24,
}

function WriteStep({ note, update, onNext }: {
  note: Partial<NoteData>
  update: (d: Partial<NoteData>) => void
  onNext: () => void
}) {
  const [recording, setRecording] = useState(false)
  const [promptsOpen, setPromptsOpen] = useState(false)
  const [promptPage, setPromptPage] = useState(0)
  const [hasHandwriting, setHasHandwriting] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const occasion = note.occasionType ?? 'JUST_BECAUSE'
  const allPrompts = PROMPTS[occasion] ?? PROMPTS['JUST_BECAUSE'] ?? []
  const visible = allPrompts.slice(promptPage * 3, promptPage * 3 + 3)
  useHandwritingFontFace() // loads + registers the font (if any) so the note can use it

  useEffect(() => { setPromptPage(0) }, [occasion])
  useEffect(() => { fetchHandwritingProgress().then((r) => setHasHandwriting(r.hasFont)).catch(() => {}) }, [])

  // Seed the editor once; afterwards the DOM is the source of truth.
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerText = note.noteText ?? ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pens from before the Oct 2026 lineup (and "You" without a font) fall back to the default.
  useEffect(() => {
    const v = note.fontChoice ?? ''
    if (!KNOWN_PENS.includes(v)) update({ fontChoice: DEFAULT_PEN })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function readEditor() {
    const el = editorRef.current
    if (!el) return
    let text = el.innerText.replace(/\u00a0/g, ' ')
    if (text === '\n') text = '' // an empty contentEditable often keeps one <br>
    if (text.length > NOTE_LIMIT) {
      el.innerText = text.slice(0, NOTE_LIMIT)
      text = el.innerText
      placeCaretAtEnd(el)
    }
    update({ noteText: text })
  }

  function insertPrompt(p: string) {
    const clean = p.replace(/[…:.]+\s*$/, '')
    const next = ((note.noteText ?? '') + (note.noteText ? '\n' : '') + clean + ' ').trimStart().slice(0, NOTE_LIMIT)
    update({ noteText: next })
    const el = editorRef.current
    if (el) {
      el.innerText = next
      el.focus()
      placeCaretAtEnd(el)
    }
  }

  const count = (note.noteText ?? '').length
  // The Secret and Flower pens transform in the PREVIEW — while writing you
  // stay readable (editing symbols you can't read would be chaos).
  const isSecretPen = note.fontChoice === 'SECRET'
  const isFlowerPen = note.fontChoice === 'FLOWER'
  const penFont = isSecretPen || isFlowerPen
    ? { fontFamily: "'Fraunces', serif", fontStyle: 'italic' as const, fontSize: '20px' }
    : penStyle(note.fontChoice)

  // Selected pen: the palette 4 selected state, dashed rosy brown on a
  // light-blush fill (one pen stays obviously picked by the fill).
  const penPill = (selected: boolean): React.CSSProperties => ({
    flex: 'none', minHeight: '52px', padding: '6px 18px', borderRadius: '26px', cursor: 'pointer',
    border: selected ? '2px dashed var(--outline)' : '1.5px solid var(--outline)',
    background: selected ? 'var(--selected-fill)' : 'var(--card)',
    color: 'var(--ink)', textTransform: 'none', letterSpacing: 0, fontWeight: 400, lineHeight: '18px',
  })

  return (
    <>
      {/* The note card: ruled paper, stamp top-right, writing wraps around it */}
      <div style={{ marginTop: '22px', position: 'relative' }}>
        <div onClick={() => { if (document.activeElement !== editorRef.current) { editorRef.current?.focus(); placeCaretAtEnd(editorRef.current!) } }} style={{
          height: '232px', boxSizing: 'border-box', overflowY: 'auto', cursor: 'text',
          border: '1.5px solid var(--outline)', borderRadius: '18px', backgroundColor: 'var(--card)',
          backgroundImage: "url('/brand/paper_texture.png'), repeating-linear-gradient(transparent, transparent 35px, var(--divider) 35px, var(--divider) 36px)",
          backgroundAttachment: 'local', backgroundPosition: '0 18px',
          padding: '18px 18px 14px 20px',
        }}>
          <StampSvg width={52} height={62} style={{ float: 'right', margin: '2px 0 8px 14px', transform: 'rotate(4deg)' }} />
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline
            aria-label={`Your note to ${note.recipientName ?? 'your QT'}`}
            onInput={readEditor}
            onBeforeInput={(e: any) => {
              if ((note.noteText ?? '').length >= NOTE_LIMIT && typeof e.inputType === 'string' && e.inputType.startsWith('insert')) e.preventDefault()
            }}
            style={{
              outline: 'none', minHeight: '180px',
              ...penFont, lineHeight: '36px', color: 'var(--note-ink)',
              overflowWrap: 'break-word', whiteSpace: 'pre-wrap',
            }}
          />
          {count === 0 && (
            <span aria-hidden style={{
              position: 'absolute', top: '18px', left: '20px', right: '86px', pointerEvents: 'none',
              ...penFont, lineHeight: '36px', color: 'var(--placeholder)',
            }}>
              Write from the heart. Or open a prompt below.
            </span>
          )}
        </div>
      </div>
      <div style={{ margin: '8px 0 0', display: 'flex', justifyContent: isSecretPen || isFlowerPen ? 'space-between' : 'flex-end', alignItems: 'center', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
        {isSecretPen && <span>🤫 Prints in the Secret Language, peek at the preview.</span>}
        {isFlowerPen && <span>🌷 Blooms into bouquets, peek at the preview.</span>}
        <span>{count}/{NOTE_LIMIT}</span>
      </div>

      {/* I NEED WORDS: prompt chips, with the occasion picker inside */}
      <div style={{ marginTop: '18px' }}>
        <button className="qn-stamp" aria-expanded={promptsOpen} onClick={() => setPromptsOpen(!promptsOpen)} style={{
          width: '232px', minHeight: '52px', boxSizing: 'border-box', borderRadius: '16px',
          border: '10px solid transparent', background: 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0 14px',
          fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--ink)', cursor: 'pointer',
        }}>
          <QEmoji name="thought-bubble" size={30} style={{ height: 'auto' }} />
          <span style={{ flex: 1, textAlign: 'left' }}>I NEED WORDS</span>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: promptsOpen ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" /></svg>
        </button>

        {promptsOpen && (
          <div style={{ padding: '14px', border: '1.5px solid var(--outline)', borderRadius: '16px', background: 'var(--card)', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {OCCASIONS.map((o) => {
                const selected = occasion === o.value
                return (
                  <button key={o.value} onClick={() => update({ occasionType: o.value })} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', minHeight: '36px', padding: '4px 12px',
                    borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    fontWeight: 700, fontSize: '12px', letterSpacing: '0.04em', textTransform: 'none',
                    background: selected ? 'var(--selected-fill)' : 'var(--card)',
                    border: selected ? '2px dashed var(--outline)' : '1.5px solid var(--outline)',
                    color: 'var(--ink)',
                  }}>
                    <QEmoji name={o.art} size={16} />{o.label}
                  </button>
                )
              })}
            </div>
            {visible.map((p) => (
              <button key={p} onClick={() => insertPrompt(p)} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: '8px',
                borderRadius: '10px', border: '1.5px solid var(--outline)', background: 'var(--cream)',
                fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', cursor: 'pointer',
                textTransform: 'none', letterSpacing: 0, fontWeight: 400,
              }}>
                {p}
              </button>
            ))}
            {allPrompts.length > 3 && (
              <button onClick={() => setPromptPage((promptPage + 1) % Math.ceil(allPrompts.length / 3))} style={{
                background: 'none', border: 'none', color: 'var(--stamp-center)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', letterSpacing: '0.1em',
              }}>
                ↻ MORE PROMPTS
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pick your pen */}
      <h2 style={{ margin: '22px 0 0', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '18px', color: 'var(--ink)' }}>Pick your pen</h2>
      {!hasHandwriting && (
        <a href="/handwriting" style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--stamp-center)', margin: '6px 0 0', textDecoration: 'underline' }}>Teach QuteNote your own handwriting →</a>
      )}
      <div role="radiogroup" aria-label="Pen" style={{ marginTop: '12px', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
        {hasHandwriting && (
          <button role="radio" aria-checked={note.fontChoice === HANDWRITING_PEN.value}
            onClick={() => update({ fontChoice: HANDWRITING_PEN.value })}
            style={{
              ...penPill(note.fontChoice === HANDWRITING_PEN.value),
              fontFamily: HANDWRITING_PEN.family, fontSize: `${PEN_PREVIEW_SIZE[HANDWRITING_PEN.value]}px`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
            <span>Your</span><span>handwriting</span>
          </button>
        )}
        {PENS.map((p) => {
          const selected = note.fontChoice === p.value
          return (
            <button key={p.value} role="radio" aria-checked={selected} onClick={() => update({ fontChoice: p.value })} style={{
              ...penPill(selected),
              fontFamily: p.family, fontStyle: p.italic ? 'italic' : 'normal', fontSize: `${PEN_PREVIEW_SIZE[p.value] ?? 16}px`,
              // the cipher strokes are hairline-thin at chip size — fatten them
              ...(p.value === 'SECRET' ? { WebkitTextStroke: '0.8px currentColor' } : {}),
            }}>
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Voice note — they scan the QR on the printed card to hear it */}
      {note.voiceDataUrl ? (
        <div style={{
          marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px',
          background: 'var(--card)', border: '2px solid var(--outline)', borderRadius: '16px', padding: '12px 16px',
        }}>
          <QEmoji name="mic" size={34} />
          <span style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
            Voice note on the card · {formatSeconds(note.voiceDuration ?? 0)}
            <span style={{ display: 'block', fontSize: '12px', fontWeight: 400, color: 'var(--ink-mid)' }}>They scan the card to hear you</span>
          </span>
          <button onClick={() => setRecording(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--stamp-center)', letterSpacing: '0.06em',
          }}>REDO</button>
          <button aria-label="Remove voice note" onClick={() => update({ voiceDataUrl: undefined, voiceDuration: undefined })} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', fontSize: '16px', padding: '4px',
          }}>✕</button>
        </div>
      ) : (
        <button onClick={() => { trackFeature('voice-note'); setRecording(true) }} style={{
          marginTop: '20px', width: '100%', minHeight: '56px', borderRadius: '16px', boxSizing: 'border-box',
          border: '2px solid var(--outline)', background: 'var(--card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--ink)', cursor: 'pointer',
        }}>
          <QEmoji name="mic" size={32} />
          ADD A VOICE NOTE
        </button>
      )}

      <button
        style={{ ...primaryPill, marginTop: '24px', opacity: (note.noteText ?? '').trim().length >= 3 ? 1 : 0.45 }}
        disabled={(note.noteText ?? '').trim().length < 3}
        onClick={onNext}
      >
        PREVIEW MY CARD
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>

      {recording && (
        <VoiceNoteSheet
          onClose={() => setRecording(false)}
          onDone={(v) => { update({ voiceDataUrl: v.dataUrl, voiceDuration: v.duration }); setRecording(false) }}
        />
      )}
    </>
  )
}

/* ── Step 4: front/back preview, send-now, allowance, MAIL IT ───── */

function ReviewStep({ note, onSent, onEditNote, onEditRecipient, onSaveDraft, editingNoteId, canEditRecipient }: {
  note: NoteData
  onSent: (id: string | null) => void
  onEditNote: () => void
  onEditRecipient: () => void
  onSaveDraft: () => void
  editingNoteId: string | null
  canEditRecipient: boolean
}) {
  const { user, refreshUser } = useAuth()
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [buying, setBuying] = useState(false)
  useHandwritingFontFace()

  // Out of monthly cards and no purchased extras? Offer a one-time $7.95 card.
  const outOfCards = !editingNoteId && !!user
    && (user.notesUsed ?? 0) >= (user.notesAllowance ?? 0)
    && (user.giftedCredits ?? 0) <= 0
  async function buyExtraCard() {
    trackFeature('extra-card')
    setBuying(true)
    setError('')
    try {
      const r = await api.post('/stripe/buy-card', {})
      window.open(r.data.data.url, '_blank')
    } catch {
      setError("Couldn't start the purchase. Try again in a moment.")
    } finally {
      setBuying(false)
    }
  }
  // When they come back from Stripe, pick up the new credit automatically.
  useEffect(() => {
    if (!outOfCards) return
    const onFocus = () => refreshUser?.()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outOfCards])

  // Letter variations: in the You pen, repeated letters cycle through the
  // person's alternate takes so the preview reads like a real hand.
  const [altMap, setAltMap] = useState<Record<string, number>>({})
  useEffect(() => {
    if (note.fontChoice !== HANDWRITING_PEN.value) return
    fetchHandwritingProgress().then((r) => setAltMap(renderAltCounts(r.glyphs))).catch(() => {})
  }, [note.fontChoice])
  const displayNoteText = note.fontChoice === HANDWRITING_PEN.value
    ? varyHandwrittenText(note.noteText ?? '', altMap)
    : note.fontChoice === 'SECRET'
      ? encodeSecret(note.noteText ?? '')
      : note.noteText

  const design = note.cardDesignId ? CARD_LOOKUP[note.cardDesignId] : undefined
  const frontArt = note.cardImageUrl ?? design?.art

  // Free mode: no prices, just the monthly allowance count.
  const allowanceLine = user && (user.giftedCredits ?? 0) > 0 && (user.notesUsed ?? 0) >= (user.notesAllowance ?? 0)
    ? 'Your extra card, ready to mail'
    : user && typeof user.notesAllowance === 'number' && user.notesAllowance > 0
      ? `${Math.min((user.notesUsed ?? 0) + 1, user.notesAllowance)} of your ${user.notesAllowance} this month`
      : 'Included this month'

  // Send now, or schedule it to land near a chosen day (Emerald, Oct 18)
  const [mailWhen, setMailWhenRaw] = useState<'now' | 'schedule'>('now')
  const setMailWhen = (v: 'now' | 'schedule') => { if (v === 'schedule') trackFeature('scheduling'); setMailWhenRaw(v) }
  const [scheduleDate, setScheduleDate] = useState('')
  const minScheduleDate = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })()
  const maxScheduleDate = (() => { const d = new Date(); d.setDate(d.getDate() + 365); return d.toISOString().slice(0, 10) })()

  async function handleSend() {
    if (mailWhen === 'schedule' && !scheduleDate) {
      setError('Pick the day of the occasion, or switch to Send now.')
      return
    }
    setSending(true)
    setError('')
    try {
      if (editingNoteId) {
        await api.patch(`/notes/${editingNoteId}`, { noteText: note.noteText, fontChoice: note.fontChoice })
        onSent(editingNoteId)
      } else {
        // The voice note rides along: upload the audio first, attach its id
        let voiceUploadId: string | undefined
        if (note.voiceDataUrl) {
          const up = await api.post('/uploads', { dataUrl: note.voiceDataUrl })
          voiceUploadId = up.data.data.id
        }
        const r = await api.post('/notes', {
          recipientId: note.recipientId,
          occasionType: note.occasionType,
          noteText: note.noteText,
          toneUsed: note.toneUsed,
          fontChoice: note.fontChoice,
          cardDesignType: note.cardDesignType,
          cardDesignId: note.cardDesignId,
          cardImageUrl: note.cardImageUrl,
          ...(voiceUploadId ? { voiceUploadId } : {}),
          ...(mailWhen === 'schedule' && scheduleDate
            ? { scheduledFor: new Date(scheduleDate + 'T12:00:00').toISOString() }
            : {}),
        })
        onSent(r.data.data.id ?? null)
      }
    } catch (err: any) {
      // The allowance-exceeded 403 (and anything else) shows the server's own message.
      const msg = err.response?.data?.error ?? ''
      trackError(`mail-failed: ${(msg || err?.message || 'unknown').slice(0, 80)}`)
      setError(msg || 'Something went sideways. Try again.')
    } finally {
      setSending(false)
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    border: 0, borderRadius: '20px', background: active ? 'var(--card)' : 'transparent', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)',
    textTransform: 'none', letterSpacing: 0,
  })

  return (
    <>
      {/* Front / Back switch */}
      <div role="tablist" aria-label="Card side" style={{
        marginTop: '16px', marginLeft: 'auto', marginRight: 'auto', width: '220px', height: '44px',
        borderRadius: '22px', background: 'var(--light-blush)', padding: '4px', boxSizing: 'border-box',
        display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      }}>
        <button role="tab" aria-selected={side === 'front'} onClick={() => setSide('front')} style={tabStyle(side === 'front')}>Front</button>
        <button role="tab" aria-selected={side === 'back'} onClick={() => setSide('back')} style={tabStyle(side === 'back')}>Back</button>
      </div>

      {/* The card */}
      <div style={{ marginTop: '16px', minHeight: '330px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {side === 'front' ? (
          frontArt ? (
            <img src={frontArt} alt={design ? `Front of the card: ${design.title} by ${design.handle ?? design.artist}` : 'Front of the card: your photo'} style={{
              maxHeight: '320px', maxWidth: '92%', width: 'auto', borderRadius: '6px',
              transform: 'rotate(-2deg)', boxShadow: '0 14px 28px rgba(74, 36, 36, 0.2)',
            }} />
          ) : (
            <div style={{
              height: '320px', width: '240px', borderRadius: '6px', background: design?.bg ?? 'var(--selected-fill)',
              transform: 'rotate(-2deg)', boxShadow: '0 14px 28px rgba(74, 36, 36, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>{design?.title ?? 'Your card'}</span>
            </div>
          )
        ) : (
          <div style={{
            width: '100%', maxWidth: '360px', minHeight: '320px', boxSizing: 'border-box',
            background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '6px',
            transform: 'rotate(2deg)', boxShadow: '0 14px 28px rgba(74, 36, 36, 0.2)',
            backgroundImage: "url('/brand/paper_texture.png'), repeating-linear-gradient(transparent, transparent 35px, var(--divider) 35px, var(--divider) 36px)",
            backgroundPosition: '0 16px',
            padding: '16px 16px 12px 18px', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <StampSvg width={44} height={52} style={{ float: 'right', margin: '0 0 8px 12px', transform: 'rotate(4deg)' }} />
              {note.fontChoice === 'FLOWER' ? (
                <FlowerText text={note.noteText ?? ''} size={58} />
              ) : (
                <p style={{
                  margin: 0, ...penStyle(note.fontChoice), lineHeight: '36px', color: 'var(--note-ink)',
                  whiteSpace: 'pre-wrap', overflowWrap: 'break-word',
                  filter: 'grayscale(1)', // cards print black-and-white — emoji preview honestly
                }}>
                  {displayNoteText}
                </p>
              )}
            </div>
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>To: {note.recipientName}</span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink-muted)' }}>address hidden</span>
              <button onClick={onEditNote} style={{
                marginLeft: 'auto', minHeight: '32px', padding: 0, background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--stamp-center)',
              }}>EDIT</button>
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div style={{ marginTop: '16px', background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '18px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1.5px solid var(--outline)' }}>
          <span style={{ flex: 1, fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>To</span>
          <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>{note.recipientName}</span>
          {canEditRecipient && (
            <button onClick={onEditRecipient} style={{
              minHeight: '32px', padding: 0, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--stamp-center)',
            }}>EDIT</button>
          )}
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--outline)' }}>
          <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>When should it mail?</span>
          <div role="radiogroup" aria-label="When to mail" style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['now', 'schedule'] as const).map((opt) => {
              const selected = mailWhen === opt
              return (
                <button key={opt} role="radio" aria-checked={selected} onClick={() => setMailWhen(opt)} style={{
                  flex: 'none', minHeight: '40px', padding: '0 14px', borderRadius: '20px',
                  border: selected ? '2px dashed var(--outline)' : '1.5px solid var(--outline)',
                  background: selected ? 'var(--selected-fill)' : 'var(--card)',
                  fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)',
                  textTransform: 'none', letterSpacing: 0, cursor: 'pointer',
                }}>{opt === 'now' ? 'Send now' : 'Schedule it'}</button>
              )
            })}
          </div>
          {mailWhen === 'schedule' && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                What day is the occasion?
                <input
                  type="date"
                  value={scheduleDate}
                  min={minScheduleDate}
                  max={maxScheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  style={{
                    display: 'block', marginTop: '4px', width: '100%', height: '44px', padding: '0 12px', boxSizing: 'border-box',
                    borderRadius: '10px', border: '1.5px solid var(--outline)', background: 'var(--card)',
                    fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)',
                  }}
                />
              </label>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink-muted)' }}>
                We'll mail it a few days ahead. Mail is tricky, we do our best to land it close to the date. 💌
              </span>
            </div>
          )}
        </div>
        {note.voiceDataUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1.5px solid var(--outline)' }}>
            <span style={{ flex: 1, fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>Voice note</span>
            <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>🎤 {formatSeconds(note.voiceDuration ?? 0)} · they scan to hear it</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
          <span style={{ flex: 1, fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>This card</span>
          <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>{allowanceLine}</span>
        </div>
      </div>
      <p style={{ margin: '10px 4px 0', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
        {mailWhen === 'schedule'
          ? 'Scheduled cards wait in Settings → Scheduled cards, editable until the day they mail.'
          : 'Changed your mind? You can edit it for 2 hours after you send.'}
      </p>

      {error && (
        <div style={{ background: 'var(--error-pale)', color: 'var(--error)', borderRadius: '12px', padding: '12px 16px', marginTop: '14px', fontSize: '14px', fontFamily: 'var(--font-body)' }}>
          {error}
          {/* No address? Don't dead-end — text them for it (Emerald, Oct 18) */}
          {/address/i.test(error) && (
            <button
              onClick={() => askForAddressByText(note.recipientName?.split(' ')[0])}
              style={{
                display: 'block', width: '100%', marginTop: '10px', height: '46px', borderRadius: '23px', boxSizing: 'border-box',
                border: '2px solid var(--outline)', background: 'var(--btn)', color: 'var(--ink)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em',
              }}
            >
              TEXT THEM FOR THEIR ADDRESS
            </button>
          )}
        </div>
      )}

      {outOfCards && (
        <div style={{ background: 'var(--error-pale)', borderRadius: '12px', padding: '12px 16px', marginTop: '14px', fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--error)' }}>
          You've sent all your cards for this month. More unlock on the 1st, or add one now.
          <button onClick={buyExtraCard} disabled={buying} style={{
            display: 'block', width: '100%', marginTop: '10px', height: '46px', borderRadius: '23px', boxSizing: 'border-box',
            border: '2px solid var(--outline)', background: 'var(--btn)', color: 'var(--ink)', cursor: 'pointer', opacity: buying ? 0.7 : 1,
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em',
          }}>
            {buying ? 'OPENING…' : 'ADD AN INDIVIDUAL CARD · $7.95'}
          </button>
        </div>
      )}

      <button style={{ ...primaryPill, marginTop: '18px', opacity: sending || outOfCards ? 0.7 : 1 }} disabled={sending || outOfCards} onClick={handleSend}>
        {sending ? 'SENDING…' : editingNoteId ? 'SAVE CHANGES' : 'MAIL IT'}
      </button>
      {!editingNoteId && (
        <button onClick={onSaveDraft} style={{
          display: 'block', width: '100%', marginTop: '10px', height: '48px', borderRadius: '24px', boxSizing: 'border-box',
          background: 'var(--card)', border: '2px solid var(--outline)', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', color: 'var(--ink)',
        }}>
          SAVE DRAFT
        </button>
      )}
    </>
  )
}
