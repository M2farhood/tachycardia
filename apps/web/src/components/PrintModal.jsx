import { useState } from 'react'
import { X, Printer, Check } from 'lucide-react'

const PrintModal = ({ isOpen, onClose, tabs }) => {
  const [selectedTabs, setSelectedTabs] = useState(new Set(tabs.map(t => t.id)))
  const [printAll, setPrintAll] = useState(true)

  if (!isOpen) return null

  const toggleTab = (tabId) => {
    const newSet = new Set(selectedTabs)
    if (newSet.has(tabId)) {
      newSet.delete(tabId)
    } else {
      newSet.add(tabId)
    }
    setSelectedTabs(newSet)
    setPrintAll(newSet.size === tabs.length)
  }

  const toggleAll = () => {
    if (printAll) {
      setSelectedTabs(new Set())
      setPrintAll(false)
    } else {
      setSelectedTabs(new Set(tabs.map(t => t.id)))
      setPrintAll(true)
    }
  }

  const handlePrint = () => {
    // Create print content
    const selectedTabsData = tabs.filter(t => selectedTabs.has(t.id))

    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Study Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            color: #1e293b;
            line-height: 1.5;
            background: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .header p {
            font-size: 14px;
            color: #64748b;
          }
          .section {
            margin-bottom: 32px;
            page-break-inside: avoid;
          }
          .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
          }
          .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
          }
          .section-progress {
            font-size: 14px;
            color: #64748b;
            background: #f1f5f9;
            padding: 4px 12px;
            border-radius: 20px;
          }
          .topics {
            list-style: none;
          }
          .topic {
            display: flex;
            align-items: flex-start;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .topic:last-child {
            border-bottom: none;
          }
          .checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid #cbd5e1;
            border-radius: 4px;
            margin-right: 14px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 2px;
          }
          .checkbox.checked {
            background: #3b82f6;
            border-color: #3b82f6;
          }
          .checkbox.checked::after {
            content: '✓';
            color: white;
            font-size: 14px;
            font-weight: bold;
          }
          .topic-content {
            flex: 1;
          }
          .topic-name {
            font-size: 16px;
            font-weight: 500;
            color: #1e293b;
          }
          .topic-name.completed {
            text-decoration: line-through;
            color: #94a3b8;
          }
          .topic-category {
            font-size: 13px;
            color: #64748b;
            margin-top: 4px;
          }
          .notes-section {
            margin-top: 16px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .notes-title {
            font-size: 13px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .notes-content {
            font-size: 14px;
            color: #475569;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
          }
          
          /* Print Button Styles */
          .print-actions {
            position: sticky;
            top: 0;
            background: white;
            padding: 20px 0;
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 30px;
            text-align: center;
            z-index: 100;
          }
          .btn-print {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.5);
            transition: background 0.2s;
          }
          .btn-print:hover {
            background: #2563eb;
          }

          @media print {
            body { padding: 0; }
            .section { page-break-inside: avoid; }
            .print-actions { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>

        <div class="header">
          <h1>📚 Study Tracker</h1>
          <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        ${selectedTabsData.map(tab => {
      const completed = tab.topics.filter(t => t.completed).length
      const total = tab.topics.length
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0

      return `
            <div class="section">
              <div class="section-header">
                <span class="section-title">${tab.title}</span>
                <span class="section-progress">${completed}/${total} (${percent}%)</span>
              </div>
              <ul class="topics">
                ${tab.topics.map(topic => `
                  <li class="topic">
                    <div class="checkbox ${topic.completed ? 'checked' : ''}"></div>
                    <div class="topic-content">
                      <div class="topic-name ${topic.completed ? 'completed' : ''}">${topic.name}</div>
                      <div class="topic-category">${topic.category}</div>
                    </div>
                  </li>
                `).join('')}
              </ul>
              ${tab.notes ? `
                <div class="notes-section">
                  <div class="notes-title">Notes</div>
                  <div class="notes-content">${tab.notes}</div>
                </div>
              ` : ''}
            </div>
          `
    }).join('')}
        
        <div class="footer">
          Made with ❤️ in MUCOM & by Mohammed Farhood
        </div>
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    // Auto-print attempt, but keep window open
    printWindow.onload = () => {
      // Small delay to ensure styles render on mobile
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-backdrop animate-fade-in">
      <div className="surface rounded-2xl shadow-2xl max-w-sm w-full animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Printer size={18} />
            Print
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--surface-2)] rounded-full transition-colors"
          >
            <X size={18} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-[13px] text-[var(--text-secondary)] mb-4">Select sections to print:</p>

          {/* Select All */}
          <button
            onClick={toggleAll}
            className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-xl mb-3 transition-colors"
          >
            <span className="text-[var(--text-primary)] font-medium">All Sections</span>
            <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${printAll ? 'bg-accent' : 'border border-[var(--border)]'
              }`}>
              {printAll && <Check size={14} className="text-white" />}
            </div>
          </button>

          {/* Individual sections */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {tabs.map(tab => {
              const isSelected = selectedTabs.has(tab.id)
              const completed = tab.topics.filter(t => t.completed).length
              const total = tab.topics.length

              return (
                <button
                  key={tab.id}
                  onClick={() => toggleTab(tab.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--surface-1)] rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <span className="text-[var(--text-secondary)] text-[13px]">{tab.title}</span>
                      <span className="text-[var(--text-tertiary)] text-[11px] ml-2">{completed}/{total}</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-accent' : 'border border-[var(--border)]'
                    }`}>
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 pt-0">
          <button
            onClick={handlePrint}
            disabled={selectedTabs.size === 0}
            className="w-full py-3 bg-accent hover:opacity-90 disabled:bg-[var(--surface-3)] disabled:text-[var(--text-tertiary)] text-white font-medium rounded-xl transition-colors liquid-press"
          >
            Print {selectedTabs.size > 0 ? `(${selectedTabs.size} section${selectedTabs.size > 1 ? 's' : ''})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrintModal
