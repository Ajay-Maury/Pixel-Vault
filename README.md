
# Pixel Vault

A modern web application for uploading, managing, and sharing digital images. Built with React, TypeScript, and Tailwind CSS, featuring dark/light theme support, adaptive image modals, and a REST API backend with Cloudinary storage.

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
### 🔍 Image Detail Modal
- Adaptive layout based on image dimensions (portrait vs landscape)
- Full-size image display without wasted space
- View metadata: dimensions, size, upload date, keywords
- Copy image URL to clipboard
- Open image in new tab or download

  <img width="1278" height="801" alt="Image-Detail" src="https://github.com/user-attachments/assets/ab5ae8e0-e7dc-48e2-b953-a82acf14d5a7" />

---
### ✏️ Image Management (Owner Only)
- Edit title, description, and keywords inline
- Toggle privacy between public and private
- Delete images with confirmation dialog

  <img width="1168" height="800" alt="Edit-Image" src="https://github.com/user-attachments/assets/3b0b1e97-b38f-4f30-8b69-6bc268b1e5f0" />

---
### 👤 Profile Page
- Hero banner with avatar displaying user initials
- View account info and upload statistics
- Edit profile (first name, last name, gender)
- Change password with real-time strength indicator
- Quick-action grid: Edit Profile, Change Password, Upload, My Library

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

### Running Locally

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user/register` | Register a new user |
| POST | `/user/login` | Login and receive JWT |
| PUT | `/user/change-password` | Change Password |
| GET | `/user/profile` | Get Logged-in user profile |
| PUT | `/user/profile` | Update user profile |
| POST | `/image/search` | Search images (title/keywords). Returns `{ data, totalCount, privateCount, publicCount }` — counts reflect the full matched set, not the current page |
| POST | `/image/minio-upload` | Upload up to 30 image files (`images` field, `multipart/form-data`) |
| POST | `/image/save` | Save metadata for one (`imageUrl`) or many (`imageUrls[]`) uploaded images |
| PUT | `/image/:id` | Update image (title, description, keywords, privacy) |
| DELETE | `/image/:id` | Delete an image |

All `/image/*` and `/user/*` (instead of register and login) all endpoints require `Authorization: Bearer <token>` header.

## Project Structure

```
src/
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── ImageDetailModal.tsx
│   ├── Navbar.tsx
│   ├── NavLink.tsx
│   └── ThemeProvider.tsx   # Dark/light mode context
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   ├── api.ts             # Axios client & API functions
│   ├── auth.ts            # Auth helpers (token, userId)
│   └── utils.ts
├── pages/
│   ├── Index.tsx           # Landing / home page
│   ├── Gallery.tsx         # Public gallery + My Library
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Upload.tsx
│   ├── Profile.tsx
│   └── NotFound.tsx
├── App.tsx
├── main.tsx
└── index.css              # Design tokens (light + dark)
```

## Contributing

Contributions welcome! Open issues or pull requests for improvements. For major changes, discuss in an issue first.

## License

MIT — see [LICENSE](LICENSE) for details.
