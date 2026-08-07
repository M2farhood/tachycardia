import { migrate } from '@study/core'

// Export data as JSON file download
export const exportData = (data, filename = 'study-tracker-backup.json') => {
    const exportPayload = {
        ...data,
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0.0'
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

// Validate imported data structure
const validateImportData = (data) => {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid file format')
    }

    if (!Array.isArray(data.tabs)) {
        throw new Error('Missing tabs data')
    }

    for (const tab of data.tabs) {
        if (!tab.id || !tab.title || !Array.isArray(tab.topics)) {
            throw new Error('Invalid tab structure')
        }

        for (const topic of tab.topics) {
            if (!topic.id || !topic.name) {
                throw new Error('Invalid topic structure')
            }
        }
    }

    return true
}

// Import data from JSON file
export const importData = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result)
                validateImportData(data)

                // Clean up export-specific fields
                delete data.exportedAt
                delete data.exportVersion

                // Upgrade old backups to the current schema before loading them
                resolve(migrate(data))
            } catch (error) {
                reject(new Error(`Failed to import: ${error.message}`))
            }
        }

        reader.onerror = () => {
            reject(new Error('Failed to read file'))
        }

        reader.readAsText(file)
    })
}

// Calculate storage usage
export const getStorageUsage = () => {
    let totalSize = 0

    for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            totalSize += localStorage[key].length * 2 // UTF-16 uses 2 bytes per char
        }
    }

    const maxSize = 5 * 1024 * 1024 // 5MB typical limit
    const usedPercent = Math.round((totalSize / maxSize) * 100)

    return {
        used: totalSize,
        max: maxSize,
        percent: usedPercent,
        usedFormatted: formatBytes(totalSize),
        maxFormatted: formatBytes(maxSize)
    }
}

// Format bytes to human readable
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
