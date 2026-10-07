# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Reservation flow diagram

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
