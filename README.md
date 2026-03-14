# Talkitive

A real-time audio-only voice chat app built with **Vite + React** and **LiveKit**.

## Features

- Audio-only voice rooms with speaker detection (green glow ring)
- Mute / leave controls
- Dynamic soundboard — broadcast sound effects to all participants via LiveKit data channel
- Session timer (MM:SS / HH:MM:SS)
- Optional profile picture (stored in browser memory, no database)
- Dark gaming HUD aesthetic

## Stack

| Layer             | Tech                                                    |
| ----------------- | ------------------------------------------------------- |
| Frontend          | Vite 8 + React 19                                       |
| Voice             | LiveKit (`@livekit/components-react`, `livekit-client`) |
| Backend           | Node.js + Express + `livekit-server-sdk`                |
| Deploy – frontend | Vercel                                                  |
| Deploy – backend  | Railway                                                 |

---

## Local Development

### 1. Clone

```bash
git clone https://github.com/Sopanha9/talkative
cd talkative
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in your LiveKit credentials in .env
npm install
node server.js
# Runs on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# .env already points to http://localhost:3001 for local dev
npm install
npm run dev
# Opens http://localhost:5173
```

---

## Deployment

### Backend → Railway

1. Push project to GitHub (this repo).
2. Create a new Railway project → deploy from GitHub → select the `backend/` root directory.
3. Add environment variables from `backend/.env.example` in the Railway dashboard.
4. Copy the generated Railway URL (e.g. `https://talkative-backend.up.railway.app`).

### Frontend → Vercel

1. Import the GitHub repo in Vercel → set **Root Directory** to `frontend/`.
2. Add environment variable:
   ```
   VITE_TOKEN_SERVER_URL=https://your-railway-backend.up.railway.app
   ```
3. Deploy — Vercel runs `npm run build` automatically.

---

## Environment Variables

### `backend/.env`

| Variable             | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `LIVEKIT_URL`        | Your LiveKit cloud WebSocket URL (`wss://...livekit.cloud`) |
| `LIVEKIT_API_KEY`    | LiveKit API key                                             |
| `LIVEKIT_API_SECRET` | LiveKit API secret                                          |
| `PORT`               | Server port (default `3001`)                                |

### `frontend/.env`

| Variable                | Description                          |
| ----------------------- | ------------------------------------ |
| `VITE_TOKEN_SERVER_URL` | Full URL of the backend token server |

---

## License

MIT
