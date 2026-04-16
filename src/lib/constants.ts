export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'ST Pay Admin'
export const API_BASE_URL = import.meta.env.VITE_API_BASE ?? ''

export const API_TIMEOUT_MS = 15_000
export const QUERY_STALE_TIME_MS = 30_000

export const GUIDES_BADGE_LAUNCH_ISO = '2026-03-16T00:00:00Z'
export const GUIDES_BADGE_DURATION_DAYS = 30

export function isGuidesBadgeNewVisible(now: Date = new Date()): boolean {
	const launchDate = new Date(GUIDES_BADGE_LAUNCH_ISO)
	const visibleUntil = new Date(launchDate.getTime() + GUIDES_BADGE_DURATION_DAYS * 24 * 60 * 60 * 1000)
	return now < visibleUntil
}
