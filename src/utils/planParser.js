/**
 * Plan Parser - Extracts study tasks from AI-generated study plans
 * Supports multiple formats from ChatGPT, Claude, etc.
 * Supports hierarchical lists and automatic weight distribution
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
 * Supports hierarchical lists and automatic weight distribution
 */
export function parsePlan(text) {
    if (!text || typeof text !== 'string') return []

    const tasks = []
    const lines = text.split('\n')

    // State machine variables
    let currentCategory = null
    let currentCategoryWeight = 0
    let currentCategoryTasks = []

    // Helper to finalize a category and distribute weights
    const finalizeCategory = () => {
        if (currentCategoryTasks.length > 0) {
            // Check if we need to distribute weight
            const tasksWithoutWeight = currentCategoryTasks.filter(t => !t.weight)

            if (currentCategoryWeight > 0 && tasksWithoutWeight.length > 0) {
                // Distribute remaining weight evenly
                const distributedWeight = parseFloat((currentCategoryWeight / currentCategoryTasks.length).toFixed(1))

                currentCategoryTasks.forEach(t => {
                    if (!t.weight) {
                        t.weight = distributedWeight
                    }
                })
            }

            tasks.push(...currentCategoryTasks)
            currentCategoryTasks = []
        }
    }

    // Regex Patterns

    // 1. Header/Category Pattern: specific emphasis, weight.
    const headerPattern = /^[-•*]?\s*(?:\*\*)?(.+?)(?:\*\*)?\s*(?:[-–:]\s*(\d+\.?\d*)\s*h(?:ours?)?)?(?:\s*(?:\[|\()Weight:?\s*(\d+)%?(?:\]|\)))?$/i

    // 2. Task Pattern: Standard task with optional details - accepts simple bullets
    const anyBulletPattern = /^(\s*)[-•*+]\s+(.+?)(?:\s*[-–]\s*(\d+\.?\d*)\s*h(?:ours?)?)?(?:\s*(?:\[|\()Weight:?\s*(\d+)%?(?:\]|\)))?$/i

    // 3. Fallback date patterns for direct tasks
    const emojiPattern = /📅\s*([A-Za-z]+\s+\d{1,2}):\s*(.+?)(?:\s*[-–]\s*(\d+\.?\d*)\s*h)?(?:\s*(?:\[|\()Weight:?\s*(\d+)%?(?:\]|\)))?$/i
    const dayPattern = /Day\s*\d+\s*\(([^)]+)\):\s*(.+?)(?:\s*[-–]\s*(.+?))?(?:\s*(?:\[|\()Weight:?\s*(\d+)%?(?:\]|\)))?$/i

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd() // Keep indentation
        const trimmed = line.trim()
        if (!trimmed) continue

        // Try specific patterns first (Dates/Days - these are usually tasks)
        // If matched, they are tasks immediately (unless we are inside a category, then maybe add to it?)
        // Let's assume date patterns are tasks.

        let specificTask = null
        let match = trimmed.match(emojiPattern) || trimmed.match(dayPattern)

        if (match) {
            specificTask = {
                name: match[2].trim(),
                date: parseDate(match[1]),
                duration: match[3] ? parseFloat(match[3]) : null,
                weight: match[4] ? parseFloat(match[4]) : null
            }
        }

        if (specificTask) {
            // Add directly
            tasks.push({
                id: `import-${Date.now()}-${tasks.length}`,
                name: specificTask.name,
                category: currentCategory || null, // Inherit if exists
                date: specificTask.date,
                dateFormatted: formatDate(specificTask.date),
                duration: specificTask.duration,
                durationFormatted: specificTask.duration ? `${specificTask.duration}h` : null,
                weight: specificTask.weight,
                selected: true
            })
            continue
        }

        // List Logic
        const bulletMatch = line.match(anyBulletPattern)

        if (bulletMatch) {
            const indent = bulletMatch[1].length
            const content = bulletMatch[2].trim()
            const duration = bulletMatch[3] ? parseFloat(bulletMatch[3]) : null
            const weight = bulletMatch[4] ? parseFloat(bulletMatch[4]) : null

            // Heuristic: Is this a Header or a Task?
            let isHeader = false

            // Rule 1: Next line is indented relative to this
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1]
                const nextBullet = nextLine.match(anyBulletPattern)
                if (nextBullet && nextBullet[1].length > indent) {
                    isHeader = true
                }
            }

            // Rule 2: High weight (>5%), no duration, looks like a title
            if (!isHeader && weight && weight > 5 && !duration && content.length < 50) {
                isHeader = true
            }

            if (isHeader) {
                // New Category found! 
                finalizeCategory() // Flush previous
                currentCategory = content.replace(/\s*[-–]\s*\d+.*$/, '') // Clean trailing info
                currentCategoryWeight = weight || 0
                // Don't add this as a task, it's a container
                continue
            } else {
                // It's a task/sub-task
                const task = {
                    name: content,
                    date: parseDate(content),
                    duration: duration,
                    weight: weight
                }

                // If we are inside a category, add to queue for processing
                if (currentCategory) {
                    currentCategoryTasks.push({
                        id: `import-${Date.now()}-${tasks.length + currentCategoryTasks.length}`,
                        name: task.name,
                        category: currentCategory,
                        date: task.date,
                        dateFormatted: formatDate(task.date),
                        duration: task.duration,
                        durationFormatted: task.duration ? `${task.duration}h` : null,
                        weight: task.weight,
                        selected: true
                    })
                    continue
                }

                // If no category, add as loose task
                tasks.push({
                    id: `import-${Date.now()}-${tasks.length}`,
                    name: task.name,
                    category: null,
                    date: task.date,
                    dateFormatted: formatDate(task.date),
                    duration: task.duration,
                    durationFormatted: task.duration ? `${task.duration}h` : null,
                    weight: task.weight,
                    selected: true
                })
            }
        }
    }

    finalizeCategory() // Flush last batch
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
            category: t.category || '',
            weight: t.weight || null,
            notes: t.duration ? `Estimated: ${t.durationFormatted}` : ''
        }))
}
