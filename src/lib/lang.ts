/**
 * The conversation language: French, Arabic or English.
 *
 * The browser's own speech recogniser listens in exactly one language per
 * session, so somebody has to choose. The choice lives here, persists across
 * reloads, and is changed three ways:
 *
 *   - the L key cycles it by hand;
 *   - ElevenLabs Scribe, when a key is configured, detects the language of each
 *     utterance and reports it, so it follows the speaker with no key presses;
 *   - nothing else. The model answers in whatever language it was spoken to,
 *     and the voice is chosen from the text it actually produced (see
 *     `textLang`), so a French answer during an Arabic session still gets a
 *     French voice.
 */

export type Lang = 'fr' | 'ar' | 'en'

const KEY = 'jarvis.lang'
const ORDER: Lang[] = ['fr', 'ar', 'en']

/** BCP-47 tags for the browser recogniser. Tunisian Arabic where the engine
 *  has it; Chrome falls back to its general Arabic model when it does not. */
export const RECOGNITION_TAG: Record<Lang, string> = {
  fr: 'fr-FR',
  ar: 'ar-TN',
  en: 'en-GB',
}

export const LANG_NAME: Record<Lang, string> = {
  fr: 'Français',
  ar: 'العربية',
  en: 'English',
}

function load(): Lang {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'fr' || v === 'ar' || v === 'en') return v
  } catch {
    // Storage can be blocked; French is the default for Tunisian business use.
  }
  return 'fr'
}

let current: Lang = load()
const listeners = new Set<(l: Lang) => void>()

export function getLang(): Lang {
  return current
}

export function setLang(l: Lang): void {
  if (l === current) return
  current = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    // Not fatal: the choice simply won't survive a reload.
  }
  for (const fn of listeners) fn(l)
}

export function cycleLang(): Lang {
  setLang(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])
  return current
}

/** Called with the new language whenever it changes. Returns an unsubscribe. */
export function onLangChange(fn: (l: Lang) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Map a language code from a transcription service ("fra", "fr", "ara",
 * "eng" …) onto ours. Anything else returns null and is ignored.
 */
export function fromCode(code: unknown): Lang | null {
  if (typeof code !== 'string') return null
  const c = code.toLowerCase()
  if (c.startsWith('fr')) return 'fr'
  if (c.startsWith('ar')) return 'ar'
  if (c.startsWith('en')) return 'en'
  return null
}

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g
const FRENCH =
  /\b(le|la|les|des|du|est|et|une|un|pour|vous|nous|avec|dans|sur|pas|que|qui|ce|cette|au|aux|votre|dinars?|millimes?)\b|[éèêàùçôî]/gi
const ENGLISH =
  /\b(the|is|are|and|for|you|with|this|that|of|to|in|on|your|it|not|have|has)\b/gi

/**
 * The language a piece of text is written in, for choosing a voice. Arabic is
 * unambiguous from its script; French and English are told apart by their
 * commonest small words. A tie keeps the session language.
 */
export function textLang(text: string): Lang {
  const ar = text.match(ARABIC)?.length ?? 0
  const letters = text.replace(/[^\p{L}]/gu, '').length || 1
  if (ar / letters > 0.3) return 'ar'
  const fr = text.match(FRENCH)?.length ?? 0
  const en = text.match(ENGLISH)?.length ?? 0
  if (fr > en) return 'fr'
  if (en > fr) return 'en'
  return current === 'ar' ? 'fr' : current
}
