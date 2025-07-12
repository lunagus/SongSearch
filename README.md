# SongSeek

---

## 💭 WHY?

I got tired of trying to find a suitable tool that would let me convert large Deezer playlists to Spotify or other services automatically. Most were paywalled, throttled, or feature-limited. So I built **SongSeek** to offer a fast, free, and accurate alternative. It features a rich UX and real-time tracking to convert music libraries between platforms like Spotify, YouTube Music, Deezer, and Apple Music with high accuracy.

**SongSeek** fetches metadata from source links and redirects users to the equivalent track or playlist on the target platform.

---

## FEATURES: 

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
| Source        | Target(s)                | Supported |
|---------------|--------------------------|-----------|
| Spotify       | YouTube Music            | ✅        |
| YouTube Music | Spotify                  | ✅        |
| Deezer        | Spotify, YouTube Music   | ✅        |
| Apple Music   | Spotify, YouTube Music   | ✅        |
| Tidal         | Spotify, YouTube Music   | ✅        |
| Amazon Music  | Spotify, YouTube Music   | ✅        |

### 🎧 Track-by-Track Conversion
- One-click track conversions between all platforms
- Search and result previews
- Direct links and auto-scrolling to results

### 🛠 Advanced
- Manual search + batch fix for failed matches
- OAuth with auto-refresh for Spotify & YouTube Music
- Persistent session + progress tracking
- Multi-platform search (Spotify, Deezer, YouTube Music, Apple Music, Tidal, Amazon Music)
- Admin dashboard with conversion analytics

---

## 🎯 Platform Support

| Platform       | Import Playlist | Export Playlist | Track Conversion | Search | OAuth |
|----------------|----------------|----------------|------------------|--------|-------|
| Spotify        | ✅              | ✅             | ✅               | ✅     | ✅    |
| YouTube Music  | ✅              | ✅             | ✅               | ✅     | ✅    |
| Deezer         | ✅              | ⌛             | ✅               | ✅     | ⌛    |
| Apple Music    | ✅              | ❌             | ✅               | ✅     | ❌    |
| Tidal          | ✅              | ❌             | ✅               | ✅     | ❌    |
| Amazon Music   | ✅              | ❌             | ✅               | ✅     | ❌    |

> 🔹 Note: YouTube Music has quota limits — large conversions may exhaust daily tokens.

> 🔹 Deezer Status: Playlist export requires OAuth, but Deezer's developer portal is temporarily closed for new applications. Track conversion and search work via public API.

### What This Means:
- **Spotify**: Full bidirectional support (import/export playlists, track conversion, search, OAuth)
- **YouTube Music**: Full bidirectional support (import/export playlists, track conversion, search, OAuth)
- **Deezer**: Import playlists and convert tracks (export blocked by developer portal closure)
- **Apple Music**: Import playlists via web scraping, convert individual tracks, search
- **Tidal**: Import playlists and tracks via public API, convert tracks, search
- **Amazon Music**: Import playlists and tracks via headless browser, convert tracks, search

> API restrictions on music services limit functionalities.

---

## 📖 How It Works

### 🎵 Playlist Conversion (3 Steps)
1. **Paste your playlist link** and choose a target platform.
2. **Login if required** via OAuth.
3. **Watch it convert in real time**, see results and manually fix any unmatched tracks

### 🎶 Track Conversion
- Paste any track link
- Select your target platform
- View results + links instantly

---

## 🚧 Coming Soon

### 🔨 Feature Roadmap

| Feature                    | Status        |
|----------------------------|---------------|
| Deezer Export w/ OAuth     | ⏳ Waiting |
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
| Tidal/Amazon Music issues   | Web scraping may fail if site structure changes                         |
| Track not found | Use the manual fix UI to search and replace unmatched tracks |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Commit & push your changes
4. Open a Pull Request

---

## 🏆 Acknowledgments

Huge thanks to the open tools and libraries that made this possible:

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Deezer API](https://developers.deezer.com/api)
- [Node.js](https://nodejs.org/) – free, open-source runtime environment
- [shadcn/ui](https://ui.shadcn.com) – beautiful and accessible React components 
- [Next.js](https://nextjs.org) & [React](https://react.dev) – modern UI framework
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) – for real-time UI

---