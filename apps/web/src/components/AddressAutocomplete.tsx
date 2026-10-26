import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

// Type the start of a street address and pick a real one (Emerald, Oct 26).
// Suggestions come from Lob, the same company that prints and mails the
// postcard, so anything offered here is somewhere mail can actually go.
//
// If Lob has nothing to say — no live key yet, no match, no network — this
// behaves exactly like a plain text field. It must never block typing.

export interface AddressPick {
  line1: string
  city: string
  state: string
  zip: string
}

export default function AddressAutocomplete({ value, onChange, onPick, style, placeholder, ...rest }: {
  value: string
  onChange: (v: string) => void
  onPick: (a: AddressPick) => void
  style?: React.CSSProperties
  placeholder?: string
  [key: string]: unknown
}) {
  const [matches, setMatches] = useState<AddressPick[]>([])
  const [open, setOpen] = useState(false)
  const picked = useRef(false)

  useEffect(() => {
    if (picked.current) { picked.current = false; return }
    const q = value.trim()
    if (q.length < 4) { setMatches([]); return }
    const t = setTimeout(async () => {
      try {
        const r = await api.get(`/address/autocomplete?q=${encodeURIComponent(q)}`)
        setMatches(r.data.data ?? [])
        setOpen(true)
      } catch { setMatches([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [value])

  function choose(a: AddressPick) {
    picked.current = true
    setOpen(false)
    setMatches([])
    onPick(a)
  }

  return (
    <span style={{ position: 'relative', display: 'block', width: '100%' }}>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => matches.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="address-line1"
        name="address-line1"
        style={style}
      />
      {open && matches.length > 0 && (
        <ul style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 40, margin: 0,
          padding: '4px 0', listStyle: 'none', background: 'var(--card)',
          border: '1.5px solid var(--outline)', borderRadius: '14px',
          boxShadow: '0 12px 30px rgba(74,36,36,0.16)', overflow: 'hidden',
        }}>
          {matches.map((m, i) => (
            <li key={`${m.line1}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(m)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: '18px',
                  color: 'var(--ink)', textTransform: 'none', letterSpacing: 0, fontWeight: 400,
                }}
              >
                <strong style={{ fontWeight: 700 }}>{m.line1}</strong>
                <br />
                {m.city}, {m.state} {m.zip}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
