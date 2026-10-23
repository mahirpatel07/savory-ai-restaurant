# AI Restaurant Management System

An advanced, full-stack AI-powered restaurant management system designed to handle customer reservations, seating, staff management, orders, and real-time updates seamlessly.

## Features

- **AI Reservation Agent:** Customers can book reservations via an AI chat interface.
- **Smart Table Allocation:** AI analyzes occupancy and conflicts to suggest available tables.
- **Admin Dashboard:** Manage reservations, tables, and staff in real-time.
- **Live Status Updates:** Customers receive real-time notifications about their reservation status.
- **Interactive UI:** Beautiful, animated frontend built with React, Framer Motion, and GSAP.

---

## Tech Stack

### Frontend
- **Framework:** React 19 + Vite + TypeScript
- **Styling & UI:** Tailwind CSS v4, Lucide React, react-icons
- **Animations & 3D:** Framer Motion, GSAP, Three.js, React Three Fiber/Drei, Lottie React, react-spring
- **Routing:** React Router DOM
- **Data Visualization:** Recharts, React CountUp
- **Forms & State:** React Hook Form
- **Real-Time Communication:** Socket.io-client
- **Exports:** jsPDF, xlsx
- **Voice/AI Integration:** Ultravox Client

### Backend
- **Runtime & Framework:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **AI & LLMs:** LangChain, LangGraph, Groq
- **Real-Time Communication:** Socket.io
- **Voice/Audio:** Deepgram SDK, Ultravox Client
- **Authentication & Security:** JWT (jsonwebtoken), bcryptjs, CORS
- **File Uploads:** Multer
- **Messaging & Notifications:** Twilio (SMS), Nodemailer (Email)
- **Validation:** Zod

---

## Reservation Flow Diagram

```mermaid
flowchart TD
    U[User] --> A[AI Chat]
    A --> A1[Name]
    A --> A2[Phone]
    A --> A3[Date]
    A --> A4[Time]
    A --> A5[Guests]
    A --> A6[Seating Preference]
    A --> API[Node.js API]
    API --> CHECK[AI Check Available Tables]
    CHECK --> DB[MongoDB]
    DB --> AVAIL{Available?}
    AVAIL -->|Yes| TABLE[Suggested Table]
    TABLE --> PENDING[Pending Reservation]
    PENDING --> ADMIN[Admin Panel]
    ADMIN --> ANALYZE[AI analyzes occupancy & conflicts]
    ANALYZE --> DECISION{Approve / Change Table / Decline}
    DECISION -->|Approve| SOCKET[Socket.io]
    DECISION -->|Change Table| ADMIN
    DECISION -->|Decline| SOCKET
    SOCKET --> CHAT[User AI Chat]
    CHAT --> APPROVED[🎉 Reservation Approved]
    CHAT --> TABLENO[Table Number]
    CHAT --> DT[Date & Time]
    CHAT --> STATUS[Live Status Updates]
```

## Getting Started

### Prerequisites
- Node.js installed
- MongoDB URI
- Environment variables configured (Groq, Twilio, Deepgram, JWT Secret, etc.)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

4. **Run the Backend:**
   ```bash
   cd backend
   npm run dev
   ```

5. **Run the Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```