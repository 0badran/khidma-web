// Switching the language remounts the page, which would wipe a half-filled
// multi-step form. The drafts live in memory only (never in storage, since
// they can hold a password) and are restored once after a language switch.
const drafts = new Map<string, unknown>();
let carryUntil = 0;

export function keepDraftsForLocaleSwitch() {
  carryUntil = Date.now() + 5000;
}

export function readDraft<T>(key: string): T | undefined {
  if (Date.now() > carryUntil) {
    drafts.delete(key);
    return undefined;
  }
  return drafts.get(key) as T | undefined;
}

export function writeDraft(key: string, value: unknown) {
  drafts.set(key, value);
}

export function clearDraft(key: string) {
  drafts.delete(key);
}
