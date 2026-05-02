# Campus Marketplace

A peer-to-peer marketplace for university students to buy, sell, and give away items safely within their campus community.

---

## Overview

Campus Marketplace solves the trust problem with generic platforms like Craigslist and Facebook Marketplace by restricting access to verified university email holders only. Every user must verify their `.edu` email address before buying or selling. This creates a closed, accountable community where students can transact with confidence.

---

## Features

- **Email verification** — `.edu` email required to register and access the platform
- **Listings** — create, edit, and delete listings with up to 5 images each
- **Orders** — structured lifecycle: Pending → Accepted → Completed (or Cancelled/Rejected)
- **Reservation window** — accepted orders are reserved for 24 hours; expired reservations are released automatically via Celery
- **Stripe payments** — secure card payments; card data is never handled by the application server
- **Free item claims** — sellers can list items for free; buyers claim them without payment
- **In-app messaging** — buyers and sellers communicate per listing without sharing personal contact info
- **Reviews** — buyers leave reviews after completed transactions; ratings feed into seller trust scores
- **Trust score** — calculated from review ratings and completed transaction count
- **Report and block** — users can report listings and block other users; blocked users cannot message each other
- **Admin dashboard** — staff users can manage users, listings, orders, and view all payments

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Django 6 + Django REST Framework |
| Database | MySQL |
| Cache / Task Queue | Redis (Upstash) |
| Background Tasks | Celery + Celery Beat |
| Image Storage | Firebase Storage |
| Payments | Stripe |
| Authentication | JWT (SimpleJWT) |

---

## Architecture

The system is a modular monolith backend with distributed external services:

```
React Frontend
      │
      ▼
Django REST API
      │
      ├── MySQL (relational data)
      ├── Redis (cache + Celery broker)
      ├── Firebase Storage (listing images)
      └── Stripe (payment processing)
```

### Backend modules

| Module | Responsibility |
|---|---|
| `users/` | Registration, email verification, JWT auth, trust score, admin views |
| `listings/` | Listing CRUD, image upload, category filtering |
| `orders/` | Order lifecycle, reservation window, payment integration |
| `reviews/` | Review creation, validation, signals |
| `messaging/` | Buyer/seller messaging per listing |
| `reporting/` | User blocking and reporting |
| `config/` | Django settings, URL routing, Celery configuration |

---

## Design Patterns

- **Facade** — The REST API hides backend complexity from the frontend. A single `POST /api/orders/` call triggers validation, availability checks, order creation, and listing status updates.
- **Adapter** — External services (Stripe, Firebase, Redis) are wrapped behind service-layer adapters so the core logic is independent of their APIs.
- **State Machine** — Listings and orders have controlled status transitions enforced at the model and serializer level.
- **Observer** — Django signals trigger trust score recalculation automatically when reviews are created or deleted.
- **Repository** — Django ORM abstracts all database access; no raw SQL is written in business logic.

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- MySQL
- Redis (or Upstash Redis account)
- Firebase project with Storage enabled
- Stripe account
- Stripe CLI (for local webhook testing)

### Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a `.env` file in `backend/` with the following:

```
SECRET_KEY=your-django-secret-key
DEBUG=True
DATABASE_URL=mysql://user:password@localhost:3306/campus_marketplace
REDIS_URL=rediss://your-upstash-redis-url
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FIREBASE_CREDENTIALS=path/to/firebase-credentials.json
```

Run migrations and start the server:

```bash
python manage.py migrate
python manage.py runserver
```

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### Running all services

Open five terminal windows:

| Terminal | Command |
|---|---|
| 1 — Django | `cd backend && py manage.py runserver` |
| 2 — React | `cd frontend && npm run dev` |
| 3 — Stripe | `stripe listen --forward-to http://127.0.0.1:8000/api/orders/payments/webhook/` |
| 4 — Celery Worker | `cd backend && celery -A config worker --loglevel=info --pool=solo` |
| 5 — Celery Beat | `cd backend && celery -A config beat --loglevel=info` |

---

## Stripe Test Card

Use this card to test payments in development:

```
Card number:  4242 4242 4242 4242
Expiry:       Any future date
CVC:          Any 3 digits
```

---

## Project Structure

```
campus-marketplace/
├── backend/
│   ├── config/          # Django settings, URLs, Celery
│   ├── users/           # Auth, profiles, trust score, admin
│   ├── listings/        # Listing CRUD, image upload
│   ├── orders/          # Order lifecycle, payments
│   ├── reviews/         # Reviews and signals
│   ├── messaging/       # In-app messaging
│   ├── reporting/       # Block and report
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/         # Axios API wrappers
    │   ├── components/  # Reusable UI components
    │   └── pages/       # Page-level components
    └── package.json
```

---

## Team

- **Ameerat Bello** — Order management, buyer-to-seller flow, payments, messaging, signup school email verification and validation code, Stripe integration, block and report user safety features, create listing, edit listing, message and order notifications, Firebase and Redis integration.

- **Poojitha Ipparthi** — Signup and login pages, homepage, listings search, filters, and clear functionality, user profiles, frontend architecture, backend and environment setup, database implementation, business logic and validation, Django admin interface, and frontend dashboard, navbar, trust score logic, API creation, partial automated tests.

---

## Course

CSCI 5300 — Software Design  
East Tennessee State University, Spring 2026
Professor: Dr. Jeff Roach
