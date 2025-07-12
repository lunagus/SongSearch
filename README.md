# SongSeek 🎵

---

## 📚 Table of Contents

- [🚀 Why SongSeek?](#-why-songseek)
- [✨ Features](#-features)
- [🎯 Platform Support](#-platform-support)
- [📖 How It Works](#-how-it-works)
- [🚧 Coming Soon](#-coming-soon)
- [🐛 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)
- [🙏 Acknowledgments](#-acknowledgments)

---

## 🚀 Why SongSeek?

I got tired of trying to find a suitable tool that would let me convert my big Deezer playlists to Spotify or other services automatically. Most were paywalled, throttled, or feature-limited. So I created a fast, free, no-nonsense solution with rich UX and real-time tracking to quickly convert music track links and playlists from one platform to another. SongSeek converts your entire music library between Spotify, YouTube Music, Deezer, and Apple Music with high accuracy, fetching metadata from the source link and redirecting users to the equivalent track or created playlist on the target platform.

---

## ✨ Features

### 🔍 Intelligent Matching
- Smart title + artist search across platforms
- Excellent match accuracy with manual fix options

### ⚡ Performance
- Real-time updates via Server-Sent Events
- Background processing for large playlists
- Lazy loading & caching for speed

### 🎨 Interface
- Mobile-first responsive design
- Dark/Light themes with smooth animations
- Drag & drop and clipboard integration

### 🔄 Cross-Platform Playlist Conversion
| Conversion | Supported |
|------------|-----------|
| Deezer → Spotify | ✅ |
| Spotify → YouTube Music | ✅ |
| YouTube → Spotify | ✅ |
| Apple Music → Spotify / YouTube | ✅ |

### 🎧 Track-by-Track Conversion
- One-click track conversions between all platforms
- Search and result previews
- Direct links and auto-scrolling to results

### 🛠 Advanced
- Manual search + batch fix for failed matches
- OAuth with auto-refresh for Spotify & YouTube
- Persistent session + progress tracking
- Multi-platform search (Spotify, Deezer, YouTube, Apple Music)
- Admin dashboard with conversion analytics

---

## 🎯 Platform Support

| Platform         | Import Playlist | Export Playlist | Track Conversion | Search | OAuth |
|------------------|------------------|------------------|------------------|--------|-------|
| Spotify          | ✅               | ✅               | ✅               | ✅     | ✅    |
| Deezer           | ✅               | 🔄               | ✅               | ✅     | ❌    |
| YouTube Music    | ✅               | ✅               | ✅               | ✅     | ✅    |
| Apple Music      | ✅ (scrape)      | ❌               | ✅               | ✅     | ❌    |
| SoundCloud       | 🔄               | ❌               | 🔄               | 🔄     | 🔄    |

> 🔹 Note: YouTube Music has quota limits — large conversions may exhaust daily tokens.

### **What This Means:**
- **Spotify**: Full bidirectional support - import and export playlists, convert tracks, search
- **Deezer**: Import playlists and convert tracks (export coming soon with OAuth)
- **YouTube Music**: Full bidirectional support with OAuth authentication
- **Apple Music**: Import playlists via web scraping, convert individual tracks
- **SoundCloud**: Coming soon with full integration

---

## 📖 How It Works

### 🎵 Playlist Conversion (3 Steps)
1. **Paste your playlist link** and choose a target platform.
2. **Login if required** via OAuth.
3. **Watch it convert in real time**, see results and manually fix any unmatched tracks

### 🎧 Track Conversion
- Paste any track link
- Select your target platform
- View results + links instantly

---

## 🚧 Coming Soon

### 🔨 Feature Roadmap

| Feature                    | Status        |
|----------------------------|---------------|
| SoundCloud Integration     | 🛠 In Progress |
| Deezer Export w/ OAuth     | 🛠 In Progress |
| Apple Music Export         | 🧩 Researching |
| Bulk Upload via File       | 🔜 Planned     |
| UI for Failed Matches Fix  | 🔜 Planned     |

---

## 🐛 Troubleshooting

| Issue                        | Solution                                                                 |
|-----------------------------|--------------------------------------------------------------------------|
| Redirect URI mismatch       | Check your `.env` and developer portal values                           |
| YouTube quota exceeded      | Wait 24 hours or request a higher quota                                  |
| Playlist stuck or incomplete| Refresh; large lists may take time                                       |
| Token expired               | Handled automatically with token refresh                                 |
| Apple Music issues          | Try a different link or refresh if scraping fails                       |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Commit & push your changes
4. Open a Pull Request

---

## 🙏 Acknowledgments

Huge thanks to the open tools and libraries that made this possible:

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Deezer API](https://developers.deezer.com/api)
- [Node.js](https://nodejs.org/) – free, open-source runtime environment
- [shadcn/ui](https://ui.shadcn.com) – beautiful and accessible React components 
- [Next.js](https://nextjs.org) & [React](https://react.dev) – modern UI framework
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) – for real-time UI

---
