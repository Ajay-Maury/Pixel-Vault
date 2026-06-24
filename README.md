# Pixel Vault

A modern web application for uploading, managing, and sharing digital images. Built with React, TypeScript, and Tailwind CSS, featuring dark/light theme support, adaptive image modals, private share groups, and download analytics. Powered by a REST API backend with Cloudinary storage.

## Live Demo

🔗 [https://ui-pixel-vault.vercel.app](https://ui-pixel-vault.vercel.app)

## Features

### 🔐 Authentication
- JWT-based registration and login
- Password visibility toggle
- Password strength meter on registration
- Protected routes with automatic redirect

---

### Login Page
  <img width="1469" height="802" alt="login-page" src="https://github.com/user-attachments/assets/04813aac-25e1-4d9d-9675-4726edc595e7" />

---

### Register Page
  <img width="1470" height="800" alt="Create-account" src="https://github.com/user-attachments/assets/3b0ff975-6038-43d8-a186-378d898e0e8f" />

---

### 🖼️ Image Upload (Batch)
- Drag-and-drop or file picker — upload **up to 30 images** at once (5MB max per file)
- Client-side validation (MIME type, file size, count)
- Thumbnail grid with auto-extracted dimensions and per-file size
- **Per-file status badges**: queued / uploading / success / failed
- **Per-file upload progress** plus an overall progress bar
- **Partial-failure handling**: successful uploads are preserved even if some files fail
- **Retry** controls — retry a single failed upload or all failed uploads at once
- Bounded concurrency (3 parallel uploads) for responsive UX on slow networks
- **Grid selection & reordering**: include/exclude individual uploaded images and reorder them with ← / → controls before saving — ordered numbering badges show the final save order
- Shared metadata (title, description, keywords, privacy) applied to every saved image
- Cloud storage via Cloudinary

    <img width="1012" height="800" alt="Upload-Image" src="https://github.com/user-attachments/assets/180441b4-a612-48a8-837b-028fe2bb4fd3" />

---

### 🎨 Gallery
- Two grid modes: masonry and uniform grid
- Full-text search by title or keywords
- Pagination with page navigation — pagination only affects the returned data, **not the counts**
- My Library tab shows accurate `All / Public / Private` counts driven by the API's `totalCount`, `publicCount`, and `privateCount` for the current search and scope
- Privacy badges (🔒 Private / 🌐 Public) on library cards
- ---
- **Public Gallery** — browse all public images shared by users
<img width="1062" height="800" alt="Public Gallery" src="https://github.com/user-attachments/assets/515f6194-bb0b-4713-9f7d-4f764b3d6db8" />

---

- **My Library** — view only your own uploads with privacy filters (All / Public / Private)
<img width="1161" height="801" alt="My Library Gallery" src="https://github.com/user-attachments/assets/78003825-8b09-42e3-971e-3b9ca5a27500" />

---

### 🔍 Image Detail Modal (`src/components/ImageDetailModal.tsx`)
A single adaptive modal used everywhere an image is opened — My Library, Public Gallery, and Group Detail.

- **Adaptive layout** — side-by-side info panel for portrait images on desktop, stacked layout (title → image → details) for landscape/mobile
- **Fullscreen view** — click the image or the maximize icon to enter cursor-zoom fullscreen; press `Esc` or click anywhere to exit
- **Body-scroll lock** — opening the modal locks the underlying page; only the modal content scrolls
- **Single scroll container** — image and metadata scroll together so long info panels never desync from the picture
- **Metadata** — dimensions, file size, upload date, keyword chips, full image URL with copy-to-clipboard
- **Quick actions** — Copy URL, Open in new tab, Download
- **Owner controls** — inline edit (title / description / keywords / privacy toggle) and delete-with-confirmation, hidden when viewing outside your own library
- **Group context** — when opened from a Share Group, the Download button routes through the audited group-download endpoint instead of a direct link, and owner-only edit/delete are suppressed

  <img width="1278" height="801" alt="Image-Detail" src="https://github.com/user-attachments/assets/ab5ae8e0-e7dc-48e2-b953-a82acf14d5a7" />

---

### ✏️ Image Management (Owner Only)
- Edit title, description, and keywords inline
- Toggle privacy between public and private
- Delete images with confirmation dialog
- **Bulk actions in My Library**: select multiple images, then make Public/Private, add to a Share Group, or Delete in one click

  <img width="1168" height="800" alt="Edit-Image" src="https://github.com/user-attachments/assets/3b0b1e97-b38f-4f30-8b69-6bc268b1e5f0" />

---

### 👥 Share Groups (`src/pages/Groups.tsx`)
The Share Groups hub lets you privately share selected images with specific people.

- **Three tabs** — `Owned` (groups you created), `Joined` (groups you've accepted into), `Invites` (pending / accepted / rejected)
- **Create group** — name max 10 chars, unique per owner, enforced both client-side and server-side
- **Group cards** — show role (Owner / Member), member count, image count, and a quick Open action
- **Owner-only controls** — inline Rename and Delete on each owned group card
- **Invite management** — pending invites display Accept / Reject buttons, accepted invites jump straight into the group
- **Pending-invite badge** on the Groups nav link keeps unread invites visible across the app

---

### 🗂️ Group Detail (`src/pages/GroupDetail.tsx`)
The dedicated workspace for a single share group, with three tabs whose visibility depends on your role.

**Images tab** (owner + members)
- Searchable, paginated grid of shared images (counts reflect the full matched set, not just the current page)
- Click any image to open it in the shared `ImageDetailModal` (in group-download mode)
- Per-image Download button records the download in the backend audit log and streams the file as a blob
- **Owner-only** multi-select with a sticky action bar to bulk-remove images from the group
- **Owner-only** “Add Images” dialog — searches your library, supports multi-select with pagination, and adds picks to the group in one call

**Members tab** (owner + members)
- List of members with avatar initials, name, email, and a colored status pill (Pending / Accepted / Rejected)
- **Owner-only** remove button per row (works for both members and pending invites)
- **Owner-only** Invite dialog with debounced `/user/search` autocomplete — pick from suggestions or type a raw email; multiple invites at once via chip input

**Analytics tab** (owner only)
- Stat cards: Total Downloads, Unique Users, Top Image
- Top Images grid with thumbnails and per-image download counts
- Paginated Download History table — who downloaded what, when

---

### 👤 Profile Page
- Hero banner with avatar displaying user initials
- View account info and upload statistics
- Edit profile (first name, last name, gender)
- Change password with real-time strength indicator
- Quick-action grid: **Edit Profile**, **Change Password**, **Upload**, **My Library**, **Share Groups**

  <img width="1332" height="797" alt="Profilr-page" src="https://github.com/user-attachments/assets/1891bb7d-cd45-422e-b82f-901eb5ddff5c" />


### 🌗 Dark / Light Mode
- Toggle between dark and light themes from the navbar
- Preference persisted in localStorage
- Full design-token support for both modes

### 📱 Responsive Design
- Mobile-friendly layout across all pages
- Accessible UI components via shadcn/ui

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build Tool | [Vite](https://vitejs.dev/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) |
| Routing | [React Router v6](https://reactrouter.com/) |
| HTTP Client | [Axios](https://axios-http.com/) |
| State | [TanStack React Query](https://tanstack.com/query) |
| Notifications | [Sonner](https://sonner.emilkowal.dev/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Backend | REST API on [Render](https://render.com/) |
| Storage | [Cloudinary](https://cloudinary.com/) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm or [bun](https://bun.sh/)

### Installation

```sh
git clone https://github.com/Ajay-Maury/Pixel-Vault.git
cd Pixel-Vault
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_BASE_URL= <Backend Service URL>
```

### Backend Service

The backend service for this application is available here:
👉 [https://github.com/Ajay-Maury/Pixel-Vault-Backend](https://github.com/Ajay-Maury/Pixel-Vault-Backend.git)

Refer to the backend repository's README for the full list of REST endpoints, request/response shapes, and authentication details. The frontend wraps every backend endpoint in `src/lib/api.ts`.

### Running Locally

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project Structure

```
src/
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── ImageDetailModal.tsx # Adaptive image modal (fullscreen, edit, group-download mode)
│   ├── Navbar.tsx           # Global nav with Groups link + pending-invite badge
│   ├── NavLink.tsx
│   └── ThemeProvider.tsx    # Dark/light mode context
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   ├── api.ts               # Axios client + typed wrappers for every backend endpoint
│   ├── auth.ts              # Token + userId helpers
│   └── utils.ts
├── pages/
│   ├── Index.tsx            # Landing / home page
│   ├── Gallery.tsx          # Public gallery + My Library (with bulk actions)
│   ├── Groups.tsx           # Share Groups: Owned / Joined / Invites tabs
│   ├── GroupDetail.tsx      # Per-group Images / Members / Analytics tabs
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Upload.tsx           # Batch upload with progress, retry, reordering
│   ├── Profile.tsx          # Account hub w/ quick-action grid incl. Share Groups
│   └── NotFound.tsx
├── App.tsx                  # Routes (incl. /groups and /groups/:id under RequireAuth)
├── main.tsx
└── index.css                # Design tokens (light + dark)
```

## Contributing

Contributions welcome! Open issues or pull requests for improvements. For major changes, discuss in an issue first.

## License

MIT — see [LICENSE](LICENSE) for details.
