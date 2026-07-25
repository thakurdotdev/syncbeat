# Deploying SyncBeat to Vercel (Monorepo)

SyncBeat is configured for single-project monorepo deployment on Vercel, serving both the **Vite React Frontend** and the **Express API + Socket.IO WebSockets** from a single Vercel deployment.

---

## 🚀 Quick Deployment Steps

### 1. Import Repository in Vercel
1. Push your code to your GitHub/GitLab/Bitbucket repository.
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** > **Project**.
3. Import your `syncbeat` repository.

### 2. Project Build Settings
When configuring the project in Vercel:
- **Framework Preset**: `Vite`
- **Root Directory**: `./` (leave default)
- **Build Command**: `pnpm build`
- **Output Directory**: `client/dist`

*(The included `vercel.json` automatically configures these settings).*

---

## 🔑 Environment Variables

Add the following Environment Variables in **Vercel Project Settings > Environment Variables**:

### Backend Environment Variables
| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (Neon, Supabase, Vercel Postgres, etc.) | `postgres://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Secret key for JWT signing | `your_super_secret_jwt_key` |
| `RESEND_API_KEY` | Resend API key for transactional emails | `re_123456789` |
| `FRONTEND_URL` | Deployed URL of your Vercel app | `https://syncbeat.vercel.app` |

### Frontend Environment Variables
| Variable | Description | Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | API Base URL | Leave blank or set to `https://syncbeat.vercel.app` |
| `VITE_SONG_URL` | Audio asset storage URL | `https://song.thakur.dev` |

---

## 📡 WebSockets (Socket.IO) & Serverless Notes

1. **Native WebSockets on Vercel**:
   - Vercel Functions natively support WebSocket connections for real-time Socket.IO events.
   - Socket.IO requests are automatically routed via `/socket.io/*` to the serverless function handler (`api/index.js`).

2. **Scaling & State Management (Optional)**:
   - For multi-instance scaling in production, you can attach `@socket.io/redis-adapter` using Upstash Redis (available via Vercel Marketplace) to sync socket rooms across function instances.

---

## 🛠 Local Testing & Building

- **Run Dev (Frontend + Backend in parallel)**:
  ```bash
  pnpm dev
  ```

- **Build Frontend**:
  ```bash
  pnpm build
  ```
