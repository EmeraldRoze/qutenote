// Emerald's wax seal alphabet (Oct 23): each letter is a real wax heart with
// the initial pressed in. Profile and Account stamps show the FIRST initial
// only; names that don't start with A-Z get the blank seal.
export function waxLetterSrc(name: string): string {
  const letter = (name.trim()[0] ?? '').toUpperCase()
  return /^[A-Z]$/.test(letter) ? `/brand/wax/${letter}.png` : '/brand/wax_heart.png'
}

// Geometry of the heart within the heartless postmark stamp asset
// (postmark_stamp_heartless.png, 1272px wide): heart center and width,
// as fractions, so any render width can place the letter seal.
export const WAX_CENTER_X = 324 / 1272
export const WAX_CENTER_Y = 412 / 1272
export const WAX_WIDTH = 417 / 1272
