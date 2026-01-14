# 📚 Study Tracker

A universal, customizable study progress tracker with Pomodoro timer support and AI study companion. Built as a Progressive Web App (PWA) that works on any device - desktop, Android, or iOS.

## ✨ Features

### Core Functionality
- **📋 Customizable Topics** - Create, edit, and organize your study topics
- **📁 Multiple Sections** - Organize topics into tabs/sections by subject
- **⏱️ Pomodoro Timer** - Built-in 15/25/50 minute focus timer
- **✅ Progress Tracking** - Visual progress circle for each section
- **📝 Quick Notes** - Per-section notes for key concepts
- **🔄 Drag & Drop** - Reorder topics by dragging

### 💓 Tachycardia AI (NEW!)
Your intelligent study companion powered by Gemini/Mistral AI:
- **Smart Suggestions** - Get personalized study recommendations
- **Task Management** - Ask AI to add tasks directly to your to-do list
- **Study Planning** - Generate study schedules based on your progress
- **Motivation** - Get encouragement when you need it
- **Progress Analysis** - Understand how you're doing

### Editing Capabilities
- **Inline Editing** - Click on any topic, category, or tab name to edit
- **Add/Delete** - Easily add new topics or sections, delete with confirmation
- **Templates** - Start with Medical, Academic, Language, or Blank templates

### Timer Features
- **Persistent Timer** - Continues running even if you close the tab
- **Browser Notifications** - Get alerted when your study session ends
- **Audio Alerts** - Pleasant chime when timer completes
- **Per-Topic Timing** - Start a timer for any specific topic

### Data Management
- **Auto-Save** - All changes saved automatically to localStorage
- **Export/Import** - Back up your tracker or share with others as JSON
- **Storage Indicator** - See how much data you're using

### PWA Features
- **Installable** - Add to home screen on Android/iOS
- **Works Offline** - Full functionality without internet
- **Fast Loading** - Service worker caches all assets

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/study-tracker.git
cd study-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables (for AI features)

Create a `.env` file in the root directory:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_MISTRAL_API_KEY=your_mistral_api_key_here  # Optional fallback
```

Get your API key from:
- **Gemini**: [Google AI Studio](https://aistudio.google.com/)
- **Mistral**: [Mistral AI](https://console.mistral.ai/)

> Note: AI features work with either key. Gemini is primary, Mistral is fallback.

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Framework preset: **Vite**
5. Add environment variables in Vercel dashboard
6. Click Deploy!

Your app will be live at `https://your-project.vercel.app`

## 📱 Install as PWA

### Android (Chrome)
1. Open your deployed site in Chrome
2. Tap the menu (⋮) → "Add to Home screen"
3. Tap "Add" to confirm

### iOS (Safari)
1. Open your deployed site in Safari
2. Tap the Share button (□↑)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm

### Desktop (Chrome/Edge)
1. Click the install icon (⊕) in the address bar
2. Click "Install"

## 🎯 How to Use

### First Time Setup
1. Choose a template or start from scratch
2. Customize section names and topics
3. Start studying!

### Using Tachycardia AI 💓
1. Click the pink **Tachycardia** button in the tab bar
2. Ask questions like:
   - "What should I study next?"
   - "Add a task called 'Review Chapter 5' to my first section"
   - "Help me plan my week"
   - "Motivate me!"
3. AI can directly add tasks to your to-do list!

### Editing Content
- **Double-click** tab names to rename sections
- **Click** on topic names or categories to edit inline
- **Click + Add Section** to create new tabs
- **Click + Add Topic** to add new topics
- **Hover** over a topic to reveal the delete button

### Using the Timer
1. Click the ▶️ button next to any topic
2. A timer banner appears at the top
3. Focus on your studies!
4. Get notified when time is up
5. Click ⏸️ to pause or ✕ to cancel

### Backing Up Your Data
1. Click the ⚙️ Settings icon
2. Click "Export My Tracker"
3. A JSON file downloads automatically

### Importing Data
1. Click the ⚙️ Settings icon
2. Click "Import Tracker"
3. Select your JSON backup file

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **vite-plugin-pwa** - PWA support
- **Gemini/Mistral AI** - AI chat features

## 📁 Project Structure

```
study-tracker/
├── public/
│   └── icons/           # PWA icons
├── src/
│   ├── components/      # React components
│   │   └── TachycardiaTab.jsx  # AI chat interface
│   ├── hooks/           # Custom React hooks
│   │   └── useAIChat.js        # AI chat hook
│   ├── services/        # External services
│   │   └── aiService.js        # Gemini/Mistral integration
│   ├── utils/           # Utility functions
│   ├── App.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

## 🖨️ Printing

Click the **Print** button to generate a clean, printer-friendly version of your study list.

## ⚠️ Data Storage

Your data is stored in localStorage (~5MB limit). Export backups regularly!

## 📄 License

MIT License - feel free to use for your own projects!

---

Made with ❤️ for students everywhere
