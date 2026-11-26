# SyncBeat

SyncBeat is a music listening platform where people listen to the same song at the same time
from different devices. A user creates a group, friends join with a code, QR or invite, and
playback (play, pause, seek, skip) stays in sync for everyone. On top of that, users keep a
personal library, like songs, build playlists and share them, and an admin portal manages
the music catalogue, users and playlists.

The project has two parts:

| Panel | Who uses it | Main features |
|---|---|---|
| **Client panel** | Registered users | Sign up / login, personal dashboard, music player, search, likes, playlists (create, share, accept), Top Charts, group listening rooms |
| **Admin panel** | Users with the `admin` role | Separate login, dashboard with live stats, music CRUD, client details, playlist management, popular songs |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 5, React Router 6, Tailwind CSS 4, shadcn/ui (Radix), TanStack Query, Zustand |
| Backend | Node.js 24, Express 4, Socket.IO 4 |
| Database | PostgreSQL with Sequelize 6 (hosted on Supabase) |
| Other | JWT auth in an httpOnly cookie, Yup validation (client and server), Resend for e-mail OTP, optional Redis cache |
| Hosting | Vercel (static frontend and the API as a serverless function) |

The repo is a **pnpm workspace** with two packages: `client` and `server`.

---

## How it works

### Authentication
- `POST /api/login` checks the password with bcrypt and sets a JWT in an httpOnly `token` cookie.
- `authMiddleware` reads the cookie on every protected request, loads the user, and rejects
  banned users (`isDeleted = true`).
- Admins are normal users with `role = 'admin'`. They sign in at `/admin/login`
  (`POST /api/admin/login`), which refuses non-admin accounts. Every `/api/admin/*` route also
  passes through `adminMiddleware`.
- New accounts verify their e-mail with a 6-digit OTP sent through Resend.

### Where songs come from
- **Search** uses an external music API (`VITE_SONG_URL`). Its song objects contain the name,
  artists, cover images (`image[]`) and audio links in several qualities (`download_url[]`).
- Whenever a song is played, liked or added to a playlist, it is saved once in the `songs` table
  (`songData` keeps the full object). The "All songs" catalogue and Top Charts read from this table.
- **Admins can add songs** by pasting an audio link and a cover image link. The server builds the
  same object shape as the music API (`Song.buildSongData`), so the player treats both kinds alike.

### Group listening (real-time sync)
- Group state (members, queue, playback position) lives **in server memory**
  (`server/socket/groupMusic/state.js`). Clients talk to it over Socket.IO.
- Each client measures its clock offset to the server (`time-sync-request`, median of recent
  round trips).
- When a song changes, the server picks a start time slightly in the future (based on the
  slowest member's latency). Every client loads the audio and starts at that exact server time.
- Every 10 seconds clients call `request-sync`. If a client has drifted more than 1 second, it seeks back.

### Personal player
- Outside a group, the Library, Playlist and Charts pages play songs in a personal player
  (`client/src/stores/playerStore.js`) with play, pause, next, previous, seek and volume.
- While the user is in a group, pressing play adds the song to the **group queue** instead
  (`client/src/hooks/usePlaySong.js`).
- Every play is recorded in `history_songs`, which powers "Recent", play counts and the dashboards.

### Playlist sharing
1. The owner shares a playlist with a user. This creates a `playlist_shares` row with status `pending`.
2. The recipient gets a real-time notification (socket event `playlist-share-received`) and can
   accept or decline, from the navbar bell or the Library page.
3. After accepting, the recipient becomes an **editor**: they can add and remove songs and rename
   the playlist. Only the owner can share it further or delete it. Nobody else can see it.
4. Edits notify the other editors live (`playlist-updated`).

---

## Folder structure

```
syncbeat/
├── api/
│   └── index.js            Vercel serverless entry: wraps the Express app + Socket.IO
├── client/                 React frontend (Vite)
├── server/                 Express + Socket.IO backend
├── vercel.json             Build settings and URL rewrites (/api/*, /socket.io/*, SPA fallback)
├── pnpm-workspace.yaml     Declares the client and server packages
└── .env.example            All environment variables in one place
```

### Backend: `server/`

```
server/
├── index.js                  Starts the HTTP server and Socket.IO (local / long-running mode)
├── app.js                    Express app: middleware, route mounting, error handler
├── config/constants.js       Bcrypt rounds, OTP expiry
├── constant.js               Cookie / JWT expiry
│
├── routes/                   URL → controller mapping
│   ├── userRoutes.js           /api/login, /register, /profile, password reset, ...
│   ├── songRoutes.js           /api/songs/*      catalogue, likes, recent, charts
│   ├── playlistRoutes.js       /api/playlists/*  playlists and sharing
│   ├── adminRoutes.js          /api/admin/*      admin login + admin-only routes
│   └── musicRoutes.js          /api/play-next/:songId  recommendations
│
├── controllers/              Request handlers (validate input, call DB/services, respond)
│   ├── userController.js       Auth, OTP, profile, login logs
│   ├── songController.js       Catalogue, like toggle, play tracking, charts
│   ├── playlistController.js   Playlist CRUD, songs, share / accept / leave
│   ├── adminController.js      Stats, clients, music CRUD, playlist management
│   └── dashboardController.js  Data for the user dashboard
│
├── services/                 Logic shared by several controllers
│   ├── songService.js          Validate song objects, record plays, Top Charts query
│   ├── playlistService.js      Access rules (owner/editor), playlist detail, notifications
│   └── playNextService.js      "Play next" recommendations (scoring + cache)
│
├── models/                   Sequelize models (one file per table)
│   ├── auth/                   userModel, otpModel, loginLogModel
│   └── music/                  Song, HistorySong, SongLike, Playlist, PlaylistSong,
│                               PlaylistShare, GroupSessionHistory, groupInviteModel
│       └── index.js            Associations between models
│
├── middleware/
│   ├── authMiddleware.js       Verifies the JWT cookie, blocks banned users
│   └── adminMiddleware.js      Allows only role = admin
│
├── socket/                   Real-time features
│   ├── index.js                Connection setup, user rooms, online users
│   ├── registry.js             Shared io instance so REST controllers can emit events
│   ├── online.js               Online / offline presence
│   ├── groupMusic.js           Time sync and state sync handlers
│   └── groupMusic/
│       ├── state.js            In-memory groups and helpers
│       ├── queue.js            Queue operations (add, skip, reorder, ...)
│       ├── queueHandlers.js    Socket events for the queue
│       ├── playbackHandlers.js Play / pause / seek / reactions
│       └── inviteHandlers.js   Create / join / leave groups, chat, group invites
│
├── scripts/
│   ├── migrate.js              Creates missing tables and columns (safe to re-run)
│   └── make-admin.js           Gives a user the admin role (or creates an admin account)
│
└── utils/
    ├── sequelize.js            Database connection
    ├── http.js                 asyncHandler, HttpError, paging and search helpers
    ├── helpers.js              Login metadata: browser, OS, IP, location
    ├── resend.js               E-mail templates and sending
    └── redis.js                Optional Redis cache (falls back to no cache)
```

A request flows like this: **route → middleware → controller → service/model → JSON response**.
Errors thrown in controllers wrapped with `asyncHandler` reach the error handler in `app.js`.
4xx messages are sent to the user; 5xx details are hidden in production.

### Frontend: `client/src/`

```
client/src/
├── main.jsx / App.jsx        App entry, providers, route tree
├── Routes.jsx                Route lists and guards (ProtectedRoutes, AdminRoutes)
│
├── Pages/                    One folder per screen
│   ├── Dashboard/              User dashboard
│   ├── GroupMusic/             Group listening room (player, queue, chat, invites, QR)
│   ├── Library/                All songs / Recent / Liked / Playlists, playlist page
│   ├── Charts/                 Top Charts
│   ├── Admin/                  Admin login, layout, dashboard, clients, music, playlists
│   └── Music/                  Shared helpers and CSS for the music screens
│
├── components/
│   ├── music/                  Song rows, like button, player bar, playlist dialogs,
│   │                           share-invite bell, real-time playlist listener
│   ├── Auth/                   Login, register, OTP verify, password reset, profile
│   ├── Modals/                 Profile edit, change password, login history
│   ├── ui/                     shadcn/ui building blocks (button, dialog, tabs, ...)
│   ├── Navbar.jsx              Top navigation for users
│   └── StatCard.jsx            Number cards used by both dashboards
│
├── api/                      Functions that call the backend (one file per area)
│   ├── http.js                 Shared axios instance (sends the auth cookie)
│   ├── music/library.js        Songs, likes, recent, charts, online search
│   ├── playlists.js            Playlists and sharing
│   ├── admin.js                Admin endpoints
│   └── dashboard.js            User dashboard
│
├── hooks/
│   ├── queries/                TanStack Query hooks (caching, refetching, mutations + toasts)
│   ├── usePlaySong.js          Play solo, or add to the group queue when in a group
│   └── useDebouncedValue.js    Debounce for search boxes
│
├── stores/                   Zustand stores (client-side state)
│   ├── playerStore.js          Personal player
│   ├── addToPlaylistStore.js   Opens the "Add to playlist" dialog from anywhere
│   └── groupMusic/             Group session, synced playback, invites
│
├── Context/                  React contexts: current user, socket connection, group music, theme
├── lib/                      Small pure helpers (song fields, formatting, auth redirect)
└── Utils/                    Older helpers (Cloudinary URLs, time-ago)
```

Data from the server is always fetched through `api/*` functions, wrapped in a hook from
`hooks/queries/`. Pages never call axios directly for these features.

---

## Database

| Table | Purpose |
|---|---|
| `users` | Accounts. `role` is `user` or `admin`; `isDeleted` means banned |
| `otps` | E-mail verification codes |
| `loginlogs` | Login history (browser, OS, IP, location) |
| `songs` | Song catalogue. `source` is `external` (music API) or `admin` (added by link); `isActive = false` hides a song |
| `history_songs` | One row per user and song: play count and last played time |
| `song_likes` | Which user liked which song |
| `playlists` | Playlists and their owner |
| `playlist_songs` | Songs in each playlist, in order, with who added them |
| `playlist_shares` | Share invites: `pending`, `accepted` or `declined` |
| `group_session_history` | Songs played in group sessions |
| `group_invites` | Invites to join a group session |

Deleting a playlist removes its songs and shares automatically (`ON DELETE CASCADE`).
Deleting a user also removes their playlists, likes and shares.

---

## API overview

All routes start with `/api`. *(login)* = requires a logged-in user, *(admin)* = admin only.

| Area | Endpoints |
|---|---|
| Auth | `POST /register`, `POST /verify/user`, `POST /login`, `GET /logout`, `POST /forgot-password`, `POST /reset-password` |
| Profile *(login)* | `GET /profile`, `POST /update-profile`, `POST /change-password`, `GET /login-logs` |
| Songs *(login)* | `GET /songs`, `GET /songs/recent`, `GET /songs/liked`, `GET /songs/liked-ids`, `GET /songs/charts`, `POST /songs/like`, `POST /songs/played` |
| Playlists *(login)* | `GET/POST /playlists`, `GET/PATCH/DELETE /playlists/:id`, `POST /playlists/:id/songs`, `DELETE /playlists/:id/songs/:songRefId`, `POST /playlists/:id/share`, `DELETE /playlists/:id/members/:userId`, `GET /playlists/shares/incoming`, `POST /playlists/shares/:shareId/accept\|decline` |
| Dashboard *(login)* | `GET /dashboard` |
| Admin | `POST /admin/login` |
| Admin *(admin)* | `GET /admin/stats`; `GET /admin/users`, `GET/PATCH /admin/users/:id`; `GET/POST /admin/songs`, `PUT/DELETE /admin/songs/:id`, `PATCH /admin/songs/:id/visibility`; `GET /admin/playlists`, `GET/PATCH/DELETE /admin/playlists/:id`, `DELETE /admin/playlists/:id/songs/:songRefId` |
| Recommendations | `GET /play-next/:songId` |

### Main socket events

| Direction | Events |
|---|---|
| Client → server | `setup`, `create-music-group`, `join-music-group`, `rejoin-music-group`, `leave-group`, `add-to-queue`, `play-next`, `add-playlist-to-queue`, `remove-from-queue`, `skip-song`, `song-ended`, `reorder-queue`, `music-change`, `music-playback`, `music-seek`, `song-reaction`, `chat-message`, `send-group-invite`, `time-sync-request`, `request-sync` |
| Server → client | `group-joined`, `queue-updated`, `music-update`, `playback-update`, `sync-state`, `new-message`, `group-invite-received`, `playlist-share-received`, `playlist-share-responded`, `playlist-updated`, `user_online`, `user_offline` |

---

## Getting started

### Requirements
- Node.js 24 and pnpm 9 (`corepack enable` installs the right pnpm)
- A PostgreSQL database (local, or the Supabase connection string)

### 1. Install

```bash
pnpm install
```

### 2. Environment variables

**`server/.env`**

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `DB_SSL` | no | `false` for a local Postgres without SSL (default: SSL on) |
| `JWT_SECRET` | yes | Secret used to sign login tokens |
| `RESEND_API_KEY`, `RESEND_EMAIL` | yes | Sending OTP and password-reset e-mails |
| `CLIENT_URL` | yes | Frontend URL, used in password-reset links |
| `NODE_ENV` | no | `production` turns on secure cookies and login history |
| `PORT` | no | API port (default `4000`) |
| `COOKIE_DOMAIN` | no | Cookie domain when the API and client use different subdomains |
| `REDIS_URL` | no | Enables caching for recommendations |
| `SONG_API_URL` | no | Recommendation API (has a default) |

**`client/.env`**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL, e.g. `http://localhost:4000` (empty = same origin) |
| `VITE_SONG_URL` | Music search API |

### 3. Prepare the database

```bash
pnpm --filter syncvibe-api db:migrate       # create tables / missing columns
pnpm --filter syncvibe-api make-admin you@example.com
# or create a fresh, already verified admin:
pnpm --filter syncvibe-api make-admin admin@example.com --create "Admin Name" "StrongPass@123"
```

`migrate.js` only adds what is missing. It never drops or changes existing data.

### 4. Run

```bash
pnpm dev            # client (Vite, port 5173) and server (port 4000) together
```

The server's `dev` script uses `nodemon`. If it isn't installed globally, run
`node index.js` inside `server/` instead.

- User app: `http://localhost:5173` (login → `/dashboard`)
- Admin portal: `http://localhost:5173/admin/login`

### 5. Build

```bash
pnpm build          # builds the client into client/dist
```

---

## Deployment

The project deploys to **Vercel** from the `main` branch (`vercel.json`):

- The client is built into `client/dist` and served as static files. Unknown paths fall back to
  `index.html`, so React Router handles them.
- `/api/*` and `/socket.io/*` are rewritten to `api/index.js`. That file loads the same Express app
  and Socket.IO setup as `server/index.js`.
- Login location is read from Vercel's geo headers, so it is only filled in on the deployed site.

Before deploying a version that adds tables or columns, run `db:migrate` against the production
database.

---

## Known limitations

- Group sessions are kept in server memory. Restarting the server ends active groups, and all
  members of a group must be connected to the same server instance.
- "Online now" and live group counts in the admin dashboard come from that same memory.
- Songs added by link only work if the audio URL allows direct playback in the browser (CORS and
  content type).
