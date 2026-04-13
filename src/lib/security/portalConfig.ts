export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const normalizeEmailList = (raw: string): string[] => {
  return raw
    .split(/[\n,;]/)
    .map((value) => normalizeEmail(value))
    .filter(Boolean)
}
