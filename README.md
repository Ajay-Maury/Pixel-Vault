
# Pixel Vault

Pixel Vault is a modern web application for managing, showcasing, and sharing digital assets. Built with a focus on performance, scalability, and developer experience, it leverages the latest frontend technologies and best practices.


## Table of Contents

- [Project Overview](#project-overview)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Custom Domain](#custom-domain)
- [Contributing](#contributing)
- [License](#license)


## Project Overview

Pixel Vault enables users to upload, browse, and manage images in a seamless, responsive interface. The project is structured for maintainability and extensibility, making it easy to add new features or integrate with external services.

## Features

- **User Authentication**: Secure registration and login with JWT-based session management.
- **Image Upload**: Drag-and-drop or file picker upload with client-side validation (type, size, preview, metadata extraction).
- **Gallery**: Responsive, searchable gallery with public and private image filtering, pagination, and two grid modes (masonry/grid).
- **Image Detail Modal**: View image details, metadata, keywords, and perform actions (copy URL, open, download, edit, delete).
- **Image Editing**: Owners can edit title, description, keywords, and privacy (public/private) of their images.
- **Image Deletion**: Owners can delete their images with confirmation.
- **Profile Page**: View account info, upload stats, and (identity-verified) password change UI.
- **Password Strength Meter**: Real-time feedback on password strength during registration and password change.
- **Search**: Full-text search by title or keywords in both public and private libraries.
- **Privacy Controls**: Mark images as public or private; only public images are visible to all users.
- **Cloud Storage Integration**: Images are uploaded to and served from Cloudinary.
- **Responsive UI**: Mobile-friendly, accessible design using shadcn/ui and Tailwind CSS.
- **Error Handling & Toasts**: User feedback for all actions (success, error, loading states).
- **404 Not Found Page**: Friendly error page for invalid routes.
- **Modern Tooling**: Built with Vite, React, TypeScript, and modular component structure.
- **Extensible Architecture**: Easy to add new features, pages, or integrate with APIs.


## Live Demo

Access the live project at: [https://ui-pixel-vault.vercel.app](https://ui-pixel-vault.vercel.app)

## Tech Stack

- [Vite](https://vitejs.dev/) — Lightning-fast build tool
- [React](https://react.dev/) — Component-based UI library
- [TypeScript](https://www.typescriptlang.org/) — Static type checking
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) — Accessible, customizable UI components

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/) (for dependency management)

### Installation

Clone the repository and install dependencies:

```sh
git clone https://github.com/Ajay-Maury/Pixel-Vault.git
cd Pixel-Vault
npm install # or bun install
```

### Running Locally

Start the development server:

```sh
npm run dev # or bun run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173) by default.

## Development

- Source code is located in the `src/` directory.
- UI components are organized under `src/components/` and `src/components/ui/`.
- Pages are in `src/pages/`.
- Utility functions and hooks are in `src/lib/` and `src/hooks/` respectively.
- Tests are in `src/test/`.

### Recommended Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit with clear messages.
3. Run tests and lint your code before pushing.
4. Open a pull request for review.

## Deployment

To deploy, use the Lovable platform:

1. Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID)
2. Click on **Share → Publish**

Alternatively, you can deploy to your preferred platform (Vercel, Netlify, etc.) by building the project:

```sh
npm run build
# or
bun run build
```

## Custom Domain

To connect a custom domain:

1. Go to **Project > Settings > Domains** in Lovable
2. Click **Connect Domain**
3. Follow the [custom domain setup guide](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Contributing

Contributions are welcome! Please open issues or pull requests for any improvements or bug fixes. For major changes, discuss them in an issue first.

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
