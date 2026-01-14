/**
 * Plan Parser - Extracts study tasks from AI-generated study plans
 * Supports multiple formats from ChatGPT, Claude, etc.
 */

// Get current year for relative date parsing
const CURRENT_YEAR = new Date().getFullYear()

// Month name to number mapping
const MONTH_MAP = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
}

/**
 * Parse a date string into a Date object
 */
function parseDate(dateStr) {
    if (!dateStr) return null

    const cleaned = dateStr.trim().toLowerCase()

    // Try "Jan 15" or "January 15" format
    const monthDayMatch = cleaned.match(/^(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?$/i)
    if (monthDayMatch) {
        const month = MONTH_MAP[monthDayMatch[1].toLowerCase()]
        if (month !== undefined) {
            const day = parseInt(monthDayMatch[2], 10)
            return new Date(CURRENT_YEAR, month, day)
        }
    }

    // Try "15 Jan" or "15 January" format
    const dayMonthMatch = cleaned.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)$/i)
    if (dayMonthMatch) {
        const month = MONTH_MAP[dayMonthMatch[2].toLowerCase()]
        if (month !== undefined) {
            const day = parseInt(dayMonthMatch[1], 10)
            return new Date(CURRENT_YEAR, month, day)
        }
    }

    // Try ISO format or other parseable formats
    const parsed = new Date(dateStr)
    if (!isNaN(parsed.getTime())) {
        return parsed
    }

    return null
}

/**
 * Parse duration string to hours
 */
function parseDuration(durationStr) {
    if (!durationStr) return null

    const cleaned = durationStr.trim().toLowerCase()

    // Match patterns like "2h", "2 hours", "2.5h", "2:30", etc.
    const hourMatch = cleaned.match(/(\d+\.?\d*)\s*(?:h|hr|hrs|hour|hours)/i)
    if (hourMatch) {
        return parseFloat(hourMatch[1])
    }

    // Match patterns like "2:30" (hours:minutes)
    const timeMatch = cleaned.match(/^(\d+):(\d{2})$/)
    if (timeMatch) {
        return parseInt(timeMatch[1], 10) + parseInt(timeMatch[2], 10) / 60
    }

    // Match patterns like "90 min", "90 minutes"
    const minMatch = cleaned.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i)
    if (minMatch) {
        return parseInt(minMatch[1], 10) / 60
    }

    return null
}

/**
 * Format date for display
 */
function formatDate(date) {
    if (!date) return null
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
}

/**
 * Main parser function - extracts tasks from pasted study plan
 */
export function parsePlan(text) {
    if (!text || typeof text !== 'string') return []

    const tasks = []
    const lines = text.split('\n')
    const seen = new Set() // Avoid duplicates

    // Pattern 1: 📅 Jan 14: Topic Name - 2h
    const emojiPattern = /📅\s*([A-Za-z]+\s+\d{1,2}):\s*(.+?)(?:\s*[-–]\s*(\d+\.?\d*)\s*h)?$/i

    // Pattern 2: Day 1 (Jan 14): Topic - 2 hours
    const dayPattern = /Day\s*\d+\s*\(([^)]+)\):\s*(.+?)(?:\s*[-–]\s*(.+?))?$/i

    // Pattern 3: - Study Chapter 5 (2h) or • Topic (deadline: Jan 15)
    const bulletPattern = /^[\-•*]\s*(.+?)(?:\s*\((\d+\.?\d*)\s*h(?:ours?)?\))?(?:\s*\((?:deadline|due):\s*([^)]+)\))?$/i

    // Pattern 4: 1. Topic Name | Due: Jan 15 | 2h
    const numberedPattern = /^\d+\.\s*(.+?)(?:\s*\|\s*(?:Due|Deadline):\s*([A-Za-z]+\s+\d{1,2}))?(?:\s*\|\s*(\d+\.?\d*)\s*h)?$/i

    // Pattern 5: **Jan 14** - Topic Name (2 hours)
    const boldDatePattern = /\*\*([A-Za-z]+\s+\d{1,2})\*\*\s*[-–:]\s*(.+?)(?:\s*\((\d+\.?\d*)\s*h(?:ours?)?\))?$/i

    // Pattern 6: Topic Name [Jan 14] - 2h
    const bracketPattern = /^(.+?)\s*\[([A-Za-z]+\s+\d{1,2})\](?:\s*[-–]\s*(\d+\.?\d*)\s*h)?$/i

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        let task = null

        // Try each pattern
        let match = trimmed.match(emojiPattern)
        if (match) {
            task = {
                name: match[2].trim(),
                date: parseDate(match[1]),
                duration: match[3] ? parseFloat(match[3]) : null
            }
        }

        if (!task) {
            match = trimmed.match(dayPattern)
            if (match) {
                task = {
                    name: match[2].replace(/\s*[-–]\s*\d+\.?\d*\s*h.*$/i, '').trim(),
                    date: parseDate(match[1]),
                    duration: parseDuration(match[3])
                }
            }
        }

        if (!task) {
            match = trimmed.match(bulletPattern)
            if (match && match[1].length > 3) { // Avoid matching short strings
                task = {
                    name: match[1].trim(),
                    date: match[3] ? parseDate(match[3]) : null,
                    duration: match[2] ? parseFloat(match[2]) : null
                }
            }
        }

        if (!task) {
            match = trimmed.match(numberedPattern)
            if (match) {
                task = {
                    name: match[1].trim(),
                    date: match[2] ? parseDate(match[2]) : null,
                    duration: match[3] ? parseFloat(match[3]) : null
                }
            }
        }

        if (!task) {
            match = trimmed.match(boldDatePattern)
            if (match) {
                task = {
                    name: match[2].trim(),
                    date: parseDate(match[1]),
                    duration: match[3] ? parseFloat(match[3]) : null
                }
            }
        }

        if (!task) {
            match = trimmed.match(bracketPattern)
            if (match) {
                task = {
                    name: match[1].trim(),
                    date: parseDate(match[2]),
                    duration: match[3] ? parseFloat(match[3]) : null
                }
            }
        }

        // Add task if found and not duplicate
        if (task && task.name && task.name.length > 2) {
            const key = `${task.name}-${task.date?.getTime() || ''}`
            if (!seen.has(key)) {
                seen.add(key)
                tasks.push({
                    id: `import-${Date.now()}-${tasks.length}`,
                    name: task.name,
                    date: task.date,
                    dateFormatted: formatDate(task.date),
                    duration: task.duration,
                    durationFormatted: task.duration ? `${task.duration}h` : null,
                    selected: true // Default to selected for import
                })
            }
        }
    }

    // Sort by date if available
    tasks.sort((a, b) => {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return a.date.getTime() - b.date.getTime()
    })

    return tasks
}

/**
 * Convert parsed tasks to the app's topic format
 */
export function tasksToTopics(tasks) {
    return tasks
        .filter(t => t.selected)
        .map(t => ({
            id: `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: t.name,
            completed: false,
            notes: t.duration ? `Estimated: ${t.durationFormatted}` : ''
        }))
}
