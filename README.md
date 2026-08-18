# SAKURA - Secure Archive System

SAKURA is a digital document archiving system built for SMP Negeri 4 Cikarang Barat. It replaces manual, paper-based recordkeeping with a centralized system for uploading, organizing, searching, and managing school documents.

This repository contains the frontend application, built with React, TypeScript, and Vite.

## Demo

Watch a demo of the application here: [SAKURA Demo](https://drive.google.com/file/d/1Cx6fMGDt0KSZLF3uTgkKOlhIJiciuRYi/view?usp=sharing)

## Features

- Digital archive management: upload, categorize, and search documents
- OCR (text extraction from scanned or photographed documents) via Tesseract.js
- In-browser PDF preview
- Excel import/export for bulk data
- Authentication and role-based access control
- Responsive UI built with shadcn/ui
- Dark/light theme support

## User Roles

SAKURA supports role-based access, with each role scoped to a different level of the archiving workflow:

- **Admin** - Has full access to the system. Manages user accounts and role assignments, oversees all archived documents across the school, configures system-wide settings, and can audit or correct records submitted by other roles.
- **Principal** - Has an oversight-level view of the school's archives. Can browse and search all documents, review and approve records submitted by teachers, and generate reports/summaries of the school's archiving activity, without managing user accounts or system configuration.
- **Teacher (Guru)** - Uploads and manages documents relevant to their own classes or administrative duties (e.g. lesson materials, student records, reports). Can search and view their own submitted archives, but has no access to other users' management functions.

## Tech Stack

| Category | Technology |
|---|---|
| Build tool | Vite |
| Language | TypeScript |
| UI framework | React 18 |
| Routing | React Router DOM |
| Styling | Tailwind CSS, shadcn/ui (Radix UI primitives) |
| Data fetching / state | TanStack React Query, Axios |
| Forms & validation | React Hook Form, Zod |
| Icons | Lucide React |
| Animation | Framer Motion |
| OCR | Tesseract.js |
| PDF rendering | pdf.js (pdfjs-dist) |
| Excel import/export | SheetJS (xlsx) |
| Charts | Recharts |
| Notifications | Sonner |
| Testing | Vitest, Testing Library |
| Linting | ESLint |

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "feat: add your feature"`)
4. Push the branch (`git push origin feature/your-feature`)
5. Open a pull request

## Developed By

Group 5 Capstone Project - President University.
Built for SMP Negeri 4 Cikarang Barat.

## Contact

For questions or bug reports, open an [issue](https://github.com/SAKURA-DMS/sakura-frontend/issues) in this repository.
