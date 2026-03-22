# Ledger Client

Frontend for the Ledger application. This app is built for mobile-first day-to-day usage and connects to the Ledger backend API for authentication, master data management, orders, progress tracking, reports, and profile preferences.

## What This Project Does

The client gives users a practical dashboard for:

- authentication and password recovery
- creating customers, manufacturers, qualities, and orders
- tracking order progress
- exporting reports
- managing profile settings, WhatsApp groups, and financial year selection

The UI is built around operational workflows rather than generic CRUD screens.

## Tech Stack

- React
- Vite
- Tailwind CSS
- Redux Toolkit
- React Router
- React Hook Form
- Yup validation
- Axios
- TanStack React Table
- React Toastify
- Vite PWA plugin

## Main Features

- mobile-first responsive dashboard
- protected routes with cookie-based auth token usage
- Redux-based session state
- order creation with autocomplete-driven master data inputs
- order progress workflow for pending orders
- table views with pagination, search, and sorting
- profile page with financial year selection
- report downloads from backend Excel endpoints
- persisted theme preference with local no-flicker fallback
- PWA-ready setup

## Routes

Public pages:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`

Protected pages:

- `/`
- `/customers`
- `/manufacturers`
- `/orders`
- `/order-progress`
- `/quality`
- `/reports`
- `/profile`

## Project Structure

```txt
src/
  components/
  hooks/
  lib/
  pages/
  routes/
  store/
  utils/
  validation/
```

## Environment Variable

This app expects:

```env
API_BASE_URL=http://localhost:8000/api
```

## Local Development

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

## UI Highlights

- dedicated dashboard shell for mobile + desktop
- reusable table abstraction on top of TanStack Table
- inline actions for edit/delete/message workflows
- order form optimized for repeated operator entry
- profile-driven financial year switching that affects orders and reports

## Interviewer Notes

This frontend is a good example of:

- integrating a real business workflow with a custom API
- balancing form-heavy UX with mobile constraints
- keeping reusable state and data-fetching utilities organized
- handling auth, theming, preferences, and dashboard navigation in one app
- connecting operational UI to backend concepts like financial year, processed quantity, and report exports

## Backend Pair

This app is designed to work with the sibling backend:

- `../ledger-server`
