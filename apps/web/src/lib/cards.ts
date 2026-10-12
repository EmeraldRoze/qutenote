// The featured-artist card catalog — App Screens board, Send tab.
// Five artists, three cards each. Only @ellis_tolsma has real artwork so
// far (the insect postcard); everyone else is a color placeholder until
// more artists are onboarded.

export interface CardDesign {
  id: string
  title: string
  art?: string // /cards/<artist>/<file> — real artwork, when present
  bg: string
  placeholder?: boolean
}

export interface Artist {
  key: string
  name: string
  handle?: string // real Instagram handle, when the artist is real
  featured?: boolean
  cards: CardDesign[]
}

export const ARTISTS: Artist[] = [
  {
    key: 'ellis-tolsma', name: 'Ellis Tolsma', handle: '@ellis_tolsma', featured: true,
    cards: [
      { id: 'et-1', title: 'Insect Collection', art: '/cards/ellis-tolsma/insects.jpg', bg: '#D9C9F1' },
      { id: 'et-2', title: 'Coming soon', bg: 'var(--neon-pink)', placeholder: true },
      { id: 'et-3', title: 'Coming soon', bg: 'var(--lime)', placeholder: true },
    ],
  },
  {
    key: 'artist-2', name: 'Artist 2',
    cards: [
      { id: 'a2-1', title: 'Coming soon', bg: 'var(--lavender-pale)', placeholder: true },
      { id: 'a2-2', title: 'Coming soon', bg: 'var(--lavender-light)', placeholder: true },
      { id: 'a2-3', title: 'Coming soon', bg: 'var(--ultraviolet)', placeholder: true },
    ],
  },
  {
    key: 'artist-3', name: 'Artist 3',
    cards: [
      { id: 'a3-1', title: 'Coming soon', bg: '#F2FBDA', placeholder: true },
      { id: 'a3-2', title: 'Coming soon', bg: 'var(--lime)', placeholder: true },
      { id: 'a3-3', title: 'Coming soon', bg: '#9FE870', placeholder: true },
    ],
  },
  {
    key: 'artist-4', name: 'Artist 4',
    cards: [
      { id: 'a4-1', title: 'Coming soon', bg: '#FDE8F2', placeholder: true },
      { id: 'a4-2', title: 'Coming soon', bg: 'var(--neon-pink)', placeholder: true },
      { id: 'a4-3', title: 'Coming soon', bg: '#D6407F', placeholder: true },
    ],
  },
  {
    key: 'artist-5', name: 'Artist 5',
    cards: [
      { id: 'a5-1', title: 'Coming soon', bg: 'var(--lilac)', placeholder: true },
      { id: 'a5-2', title: 'Coming soon', bg: 'var(--lavender-light)', placeholder: true },
      { id: 'a5-3', title: 'Coming soon', bg: 'var(--lavender-dark)', placeholder: true },
    ],
  },
]

export const CARD_LOOKUP: Record<string, CardDesign & { artist: string }> = {}
for (const a of ARTISTS) for (const c of a.cards) CARD_LOOKUP[c.id] = { ...c, artist: a.name }

// Notes sent before this catalog existed reference older ids — keep their
// thumbnails from breaking.
const FALLBACK = { title: 'A QuteNote card', bg: 'var(--lavender-pale)', artist: 'QuteNote' }
for (const old of ['design-1', 'design-2', 'design-3', 'lp-1', 'lp-2', 'lp-3', 'tm-1', 'tm-2', 'tm-3', 'id-1', 'id-2', 'id-3', 'km-1', 'km-2', 'km-3', 'ra-1', 'ra-2', 'ra-3']) {
  if (!CARD_LOOKUP[old]) CARD_LOOKUP[old] = { id: old, ...FALLBACK }
}
