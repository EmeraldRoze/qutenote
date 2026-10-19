// Card drafts, saved on this device (Emerald, build 42: a Save draft option
// under MAIL IT, with drafts surfaced on the Send screen and in Settings).

export interface CardDraft {
  id: string
  savedAt: string
  note: Record<string, unknown> // the SendFlow NoteData snapshot
}

const KEY = 'qn_card_drafts'

export function listDrafts(): CardDraft[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function saveDraft(note: Record<string, unknown>, existingId?: string): CardDraft {
  const drafts = listDrafts().filter((d) => d.id !== existingId)
  const draft: CardDraft = {
    id: existingId ?? `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
    note,
  }
  localStorage.setItem(KEY, JSON.stringify([draft, ...drafts].slice(0, 20)))
  return draft
}

export function deleteDraft(id: string) {
  localStorage.setItem(KEY, JSON.stringify(listDrafts().filter((d) => d.id !== id)))
}

export function getDraft(id: string): CardDraft | undefined {
  return listDrafts().find((d) => d.id === id)
}
