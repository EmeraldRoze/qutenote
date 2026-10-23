// The featured-artist card catalog — Oct 15 2026 redesign, Send tab.
// Five artists, three cards each. Two are real artists with real artwork
// (@ellis_tolsma and @bobbybealspresents, files in public/cards/); the other
// three are color placeholders until more artists are onboarded.
//
// NOTE: apps/api/src/lib/submitNote.ts holds a server-side copy of the
// id → art mapping for printing. Keep the two in sync.

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
  avatar?: string // avatar circle color on the Send tab
  cards: CardDesign[]
}

export const ARTISTS: Artist[] = [
  {
    key: 'ellis-tolsma', name: 'Ellis Tolsma', handle: '@ellis_tolsma', featured: true, avatar: '#D5ADA3',
    cards: [
      { id: 'et-1', title: 'Insects', art: '/cards/ellis_tolsma/ellis_tolsma_1_insects.jpg', bg: '#E3D5CC' },
      { id: 'et-2', title: 'Furby', art: '/cards/ellis_tolsma/ellis_tolsma_2_furby.jpg', bg: 'var(--neon-pink)' },
      { id: 'et-3', title: 'Mermaid', art: '/cards/ellis_tolsma/ellis_tolsma_3_mermaid.jpg', bg: 'var(--lime)' },
    ],
  },
  {
    key: 'bobbybealspresents', name: 'Bobby Beals', handle: '@bobbybealspresents', avatar: '#EEFC4E',
    cards: [
      { id: 'bb-1', title: 'Horse', art: '/cards/bobbybealspresents/bobbybealspresents_1_horse.jpg', bg: '#F4ECE6' },
      { id: 'bb-2', title: 'Flower', art: '/cards/bobbybealspresents/bobbybealspresents_2_flower.jpg', bg: '#E9EDF1' },
      { id: 'bb-3', title: 'Roses', art: '/cards/bobbybealspresents/bobbybealspresents_3_roses.jpg', bg: '#F4ECE6' },
    ],
  },
  {
    key: 'artist-2', name: 'Artist 2', avatar: 'var(--neon-pink)',
    cards: [
      { id: 'a2-1', title: 'Coming soon', bg: 'var(--lavender-pale)', placeholder: true },
      { id: 'a2-2', title: 'Coming soon', bg: 'var(--lavender-light)', placeholder: true },
      { id: 'a2-3', title: 'Coming soon', bg: 'var(--ultraviolet)', placeholder: true },
    ],
  },
  {
    key: 'artist-3', name: 'Artist 3', avatar: 'var(--lime-tint)',
    cards: [
      { id: 'a3-1', title: 'Coming soon', bg: '#F2FBDA', placeholder: true },
      { id: 'a3-2', title: 'Coming soon', bg: 'var(--lime)', placeholder: true },
      { id: 'a3-3', title: 'Coming soon', bg: '#9FE870', placeholder: true },
    ],
  },
  {
    key: 'artist-4', name: 'Artist 4', avatar: 'var(--pink-pale)',
    cards: [
      { id: 'a4-1', title: 'Coming soon', bg: '#F4ECE6', placeholder: true },
      { id: 'a4-2', title: 'Coming soon', bg: 'var(--neon-pink)', placeholder: true },
      { id: 'a4-3', title: 'Coming soon', bg: '#D6407F', placeholder: true },
    ],
  },
]

export const CARD_LOOKUP: Record<string, CardDesign & { artist: string; handle?: string }> = {}
for (const a of ARTISTS) for (const c of a.cards) CARD_LOOKUP[c.id] = { ...c, artist: a.name, handle: a.handle }

// Notes sent before this catalog existed reference older ids — keep their
// thumbnails from breaking. (a5-* was the fifth placeholder artist, retired
// when @bobbybealspresents came on board.)
const FALLBACK = { title: 'A QuteNote card', bg: 'var(--lavender-pale)', artist: 'QuteNote' }
for (const old of ['design-1', 'design-2', 'design-3', 'lp-1', 'lp-2', 'lp-3', 'tm-1', 'tm-2', 'tm-3', 'id-1', 'id-2', 'id-3', 'km-1', 'km-2', 'km-3', 'ra-1', 'ra-2', 'ra-3', 'a5-1', 'a5-2', 'a5-3']) {
  if (!CARD_LOOKUP[old]) CARD_LOOKUP[old] = { id: old, ...FALLBACK }
}
