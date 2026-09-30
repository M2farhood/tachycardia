import { migrate } from './migrations'

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
