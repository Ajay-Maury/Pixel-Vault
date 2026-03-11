
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

### 🖼️ Image Upload
- Drag-and-drop or file picker upload
- Client-side validation (type, size)
- Image preview before upload
- Metadata extraction (dimensions, file size)
- Title, description, keywords, and privacy (public/private) settings
- Cloud storage via Cloudinary

### 🎨 Gallery
- Two grid modes: masonry and uniform grid
- Full-text search by title or keywords
- Pagination with page navigation
- Privacy badges (🔒 Private / 🌐 Public) on library cards
- **Public Gallery** — browse all public images shared by users
- **My Library** — view only your own uploads with privacy filters (All / Public / Private)

### 🔍 Image Detail Modal
- Adaptive layout based on image dimensions (portrait vs landscape)
- Full-size image display without wasted space
- View metadata: dimensions, size, upload date, keywords
- Copy image URL to clipboard
- Open image in new tab or download

### ✏️ Image Management (Owner Only)
- Edit title, description, and keywords inline
- Toggle privacy between public and private
- Delete images with confirmation dialog

### 👤 Profile Page
- Hero banner with avatar displaying user initials
- View account info and upload statistics
- Edit profile (first name, last name, gender)
- Change password with real-time strength indicator
- Quick-action grid: Edit Profile, Change Password, Upload, My Library

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
Get Backend Service Repository [Here](https://github.com/Ajay-Maury/-Pixel-Vault-Backend.git)

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
| POST | `/image/search` | Search images (title/keywords) |
| POST | `/image/minio-upload` | Upload image file |
| POST | `/image/save` | Save image metadata |
| PUT | `/image/:id` | Update image (title, description, keywords, privacy) |
| DELETE | `/image/:id` | Delete an image |

All `/image/*` endpoints require `Authorization: Bearer <token>` header.

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
