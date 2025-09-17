# 🎵 Serenade - Personalized Song Creator

A personalized AI music generation app built for HackMIT 2025! Serenade analyzes your Spotify listening habits to understand your musical taste, then uses Suno AI to generate custom songs tailored specifically to your preferences.

## ✨ Features

### 🎧 Smart Music Analysis
- **Spotify Integration**: Connect your Spotify account to analyze your top artists and genres
- **Genre Mapping**: Intelligent mapping of your Spotify listening history to descriptive music tags
- **Personalized Prompts**: AI suggestions based on your musical taste

### 🎵 AI Music Generation
- **Suno AI Integration**: Generate high-quality songs with AI using your personalized preferences
- **Real-time Progress**: Stream songs as they generate with live status updates
- **Custom Prompts**: Add your own descriptions and style tags

### 📊 Live Audio Visualization
- **Real-time Waveforms**: Dynamic frequency analysis that responds to the actual audio
- **Visual Feedback**: Beautiful waveform visualization that pulses with the music
- **Responsive Design**: Optimized display across all device sizes

### 🎮 Playback & Export
- **Audio Controls**: Built-in play/pause with scrubbing functionality
- **Download**: Save your generated songs as MP3 files
- **Multiple Songs**: Generate and manage multiple songs simultaneously

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env.local` file in your project root:

```env
# Suno AI API Key
SUNO_API_KEY=your_suno_api_key_here

# Anthropic API Key (for AI features)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Spotify OAuth Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/spotify/callback

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/auth/gmail/callback
```

### 2. Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an App"
3. Fill in app details:
   - **App Name**: "Serenade" (or your preferred name)
   - **App Description**: "Personalized AI music generation app"
4. Add Redirect URI: `http://127.0.0.1:3000/api/auth/spotify/callback`
5. Copy your Client ID and Client Secret to `.env.local`

**Important**: Use `127.0.0.1` instead of `localhost` for Spotify OAuth requirements.

### 3. Install and Run

```bash
# Install dependencies
npm install

# Start the development server
npm run dev -- --hostname 127.0.0.1
```

### 4. Using Serenade

1. **Open** `http://127.0.0.1:3000` in your browser
2. **Connect Spotify** to analyze your musical preferences
3. **Generate Songs** with AI-suggested prompts or your own ideas
4. **Watch** the live waveform visualization as your song plays
5. **Download** your creations to keep forever!

## 🛠 Technical Architecture

### Frontend Stack
- **Next.js 15.5.2** - React framework with App Router
- **React 19.1.0** - UI library with latest features
- **TypeScript 5** - Type safety throughout
- **Tailwind CSS 4** - Modern styling with Radix UI components
- **Web Audio API** - Real-time frequency analysis for waveforms

### Backend Services
- **Suno API Integration** - AI music generation
- **Spotify Web API** - User music preference analysis
- **Audio Proxy** - CORS bypass for waveform analysis
- **OAuth 2.0** - Secure authentication flows

### Key Components

```
/app
  /api
    /generate-music/route.ts     # Suno AI song generation
    /check-status/route.ts       # Generation status polling
    /audio-proxy/route.ts        # CORS bypass for audio analysis
    /auth/spotify/               # Spotify OAuth flow
  page.tsx                       # Main application UI

/lib
  suno-service.ts               # Suno API service layer
  spotify-service.ts            # Spotify integration & analysis

/components/ui
  waveform.tsx                  # Real-time audio visualization
  [various UI components]       # Radix UI component library
```

## 🔧 API Endpoints

### Music Generation
- `POST /api/generate-music` - Start AI song generation
- `POST /api/check-status` - Poll generation progress

### Authentication
- `GET /api/auth/spotify` - Initiate Spotify OAuth
- `GET /api/auth/spotify/callback` - Handle OAuth callback

### Audio Processing
- `GET /api/audio-proxy` - Proxy audio files with CORS headers

## 🎯 Advanced Features

### Spotify Genre Analysis
The app intelligently maps your Spotify listening history to music generation tags:
- Analyzes your top artists and their genres
- Maps complex genre data to descriptive tags
- Provides personalized song suggestions

### Real-time Waveform Visualization
- Uses Web Audio API for live frequency analysis
- Synchronized dual-audio system to bypass CORS restrictions
- Dynamic visualization that responds to actual audio content
- Optimized rendering with Canvas API and device pixel ratio scaling

### Smart Music Generation
- Contextual AI prompts based on your taste
- Multiple generation styles and moods
- Real-time streaming as songs generate

## 🐛 Troubleshooting

### Spotify OAuth Issues
- Ensure you're using `127.0.0.1:3000` not `localhost:3000`
- Verify redirect URI matches exactly in Spotify Dashboard
- Check that Client ID and Secret are correctly set

### Waveform Not Working
- Audio analysis requires CORS-enabled audio sources
- The app automatically uses an audio proxy for Suno URLs
- Check browser console for Web Audio API errors

### Generation Failures
- Verify your Suno API key is valid and active
- Check rate limits - generation takes 1-2 minutes per song
- Ensure prompts follow Suno's content guidelines

## 🎉 Built for HackMIT 2025

Serenade showcases the power of combining multiple AI services to create personalized experiences. Built with modern web technologies and designed for real-time interaction, it demonstrates how AI can understand user preferences and generate tailored creative content.

**Key Technologies**: Next.js 15, React 19, Suno AI, Spotify Web API, Web Audio API, TypeScript, Tailwind CSS

---

🎵 **Create your perfect soundtrack** • Powered by [Suno AI](https://suno.com) • Built with ❤️ for HackMIT 2025

📖 [HackMIT Presentation](https://www.figma.com/design/2cx9mem7ZHF3d8Pa0coO3J/HACKMIT-Presentation?node-id=0-1&t=epubLOfBNkR9x1Qc-1)