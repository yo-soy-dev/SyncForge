# Coduet: Frontend

React client for [Coduet](../README.md), a real-time collaborative coding workspace with in-browser execution, AI review, video calls and a structured technical-interview mode.

**Live demo:** coming soon · **Backend:** see the [root README](../README.md) and [API reference](../docs/api.md)

![Landing page](../docs/landing.png)

## Features

- **Real-time collaboration:** multi-user editing with live cursors and presence, built on Yjs (CRDT) so concurrent edits merge without conflicts.
- **Run code in the browser:** JavaScript, TypeScript and Python, with stdin support.
- **AI assistant:** review, explain, fix and chat about your code.
- **AI suggestions you control:** the AI proposes a diff, you review it, and nothing changes until you accept. A restore point is saved first, and stale suggestions are detected if the code changed underneath.
- **Interview mode:** roles (owner, interviewer, candidate, observer), single-use candidate links, editor lock, a countdown timer, private scorecards, an event timeline and an exportable report.
- **Video calls:** peer-to-peer WebRTC for up to 6 people. Video and audio are never recorded.
- **Version history:** snapshots with one-click restore, a compare view, replay and Markdown export.
- **Invite links:** `/join/:code`, with redirect-back after login.
- **Accounts:** email signup, a guest demo, profile photos and password reset.
- **Responsive:** bottom-sheet panels on mobile, a custom Monaco theme and keyboard shortcuts (`Ctrl+Enter` run, `Ctrl+S` save, `Ctrl+K` command palette).

## Tech stack

React 18 · Vite · Tailwind CSS v4 · Monaco Editor · Yjs + y-monaco · Socket.IO client · Framer Motion · Axios · DOMPurify · Sonner · Lucide icons

The backend is a set of Node.js/Express services (MongoDB, Redis, Socket.IO) behind an API gateway; see the [architecture doc](../docs/architecture.md).

## Architecture

```
Browser (React)
 ├─ Monaco editor <-> Yjs document (CRDT)
 │        └─ Yjs updates relayed over Socket.IO <-> server <-> other clients
 ├─ REST (Axios) ──> rooms, files, snapshots, scorecards, AI, execution, auth
 ├─ WebRTC <-> other participants (signaling over the same socket)
 └─ Permission checks happen server-side for every edit and AI call
```

## Pages

| Route | Page |
|---|---|
| `/` | Landing |
| `/login`, `/signup` | Authentication, including the guest demo |
| `/dashboard` | Your rooms |
| `/join/:code` | Invite link: preview the room and join |
| `/room/:roomId` | The workspace: editor, run output, AI, call, history, interview tools |
| `/room/:roomId/replay` | Replay a room's history |
| `/interviews` | Interview rooms overview |
| `/problems` | Practice problems |
| `/settings` | Profile photo, preferences |

## Design system

A small token set in `src/index.css`: **ember** (primary action), **sync** cyan (live and collaboration), **AI** violet (everything AI) and **gold** (rare highlights). Each color has exactly one meaning.

## Getting started

The easiest way is to run the whole stack from the repository root (`docker compose up -d --build`, then open http://localhost); see the [development guide](../docs/development.md).

For frontend work with hot reload, start the backend with Docker and run Vite here:

```bash
npm install
cp .env.example .env     # then set the two URLs below
npm run dev              # http://localhost:5173
```

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Base URL of the API gateway, for example `http://localhost:3001`. Empty means "same origin" (use this behind nginx) |
| `VITE_SOCKET_URL` | URL of the collaboration service, for example `http://localhost:4003`. Empty means "same origin" |

Vite reads these when the app is **built or started**, so after changing them restart `npm run dev` (or rebuild the Docker image). The backend's `CLIENT_URL` must include the origin you open the app from, or the browser will block requests.

## Scripts

```bash
npm run dev       # start the dev server
npm run build     # production build in dist/
npm run preview   # serve the production build locally
```

## Screenshots

| Dashboard | Room | Interview mode |
|---|---|---|
| ![Dashboard](../docs/dashboard.png) | ![Room](../docs/room.png) | ![Interview mode](../docs/interview.png) |

## License

MIT. See [LICENSE](../LICENSE).