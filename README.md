
# Pixel Vault

A modern, dark-themed web application for uploading, managing, and sharing digital images. Built with React, TypeScript, and Tailwind CSS, powered by a REST API backend with Cloudinary storage.

## Live Demo

🔗 [https://ui-pixel-vault.vercel.app](https://ui-pixel-vault.vercel.app)

## Features

### 🔐 Authentication
- JWT-based registration and login
- Password visibility toggle
- Password strength meter on registration
- Protected routes with automatic redirect


### Login Page
 <img width="1469" height="802" alt="login-page" src="https://github.com/user-attachments/assets/5973d2e0-4b3b-4076-bc56-8342996252a1" />

### Register Page
 <img width="1469" height="802" alt="login-page" src="https://github.com/user-attachments/assets/b3556095-3d8b-4793-a026-2fd64edd4cb6" />


### 🖼️ Image Upload
- Drag-and-drop or file picker upload
- Client-side validation (type, size)
- Image preview before upload
- Metadata extraction (dimensions, file size)
- Title, description, keywords, and privacy (public/private) settings
- Cloud storage via Cloudinary
  
  <img width="1012" height="800" alt="Upload-Image" src="https://github.com/user-attachments/assets/180441b4-a612-48a8-837b-028fe2bb4fd3" />


### 🎨 Gallery
- Two grid modes: masonry and uniform grid
- Full-text search by title or keywords
- Pagination with page navigation
- Privacy badges (🔒 Private / 🌐 Public) on library cards

- **Public Gallery** — browse all public images shared by users
  
  <img width="1062" height="800" alt="Public Gallery" src="https://github.com/user-attachments/assets/515f6194-bb0b-4713-9f7d-4f764b3d6db8" />

- **My Library** — view only your own uploads with privacy filters (All / Public / Private)
  
  <img width="1161" height="801" alt="My Library Gallery" src="https://github.com/user-attachments/assets/78003825-8b09-42e3-971e-3b9ca5a27500" />

### 🔍 Image Detail Modal
- View full image with metadata (dimensions, size, upload date, keywords)
- Copy image URL to clipboard
- Open image in new tab
- Download image
  
  <img width="1161" height="801" alt="Image-Detail" src="https://github.com/user-attachments/assets/8c7406e8-b804-4d9c-ae1a-b22148dda7cc" />


### ✏️ Image Editing (Owner Only)
- Edit title, description, and keywords inline
- Toggle privacy between public and private
- Delete images with confirmation dialog
  
  <img width="1168" height="800" alt="Edit-Image" src="https://github.com/user-attachments/assets/3b0b1e97-b38f-4f30-8b69-6bc268b1e5f0" />


### 👤 Profile Page
- View account info and upload statistics
- Password change UI with identity verification
  
  <img width="1021" height="800" alt="Account" src="https://github.com/user-attachments/assets/d9963af8-a772-4ef8-b99c-39da3bac42e1" />


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
│   ├── ui/              # shadcn/ui components
│   ├── ImageDetailModal.tsx
│   ├── Navbar.tsx
│   └── NavLink.tsx
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   ├── api.ts           # Axios client & API functions
│   ├── auth.ts          # Auth helpers (token, userId)
│   └── utils.ts
├── pages/
│   ├── Gallery.tsx      # Public gallery + My Library
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Upload.tsx
│   ├── Profile.tsx
│   └── NotFound.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## Contributing

Contributions welcome! Open issues or pull requests for improvements. For major changes, discuss in an issue first.

## License

MIT — see [LICENSE](LICENSE) for details.
