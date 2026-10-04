# Satora Lab — Enterprise Office & Project Management System

Comprehensive office, project management, financial accounting, and deliverable tracking platform built for **Satora Lab** based on their Google Sheets operational system.

---

## 🚀 Key Highlights & Capabilities

- **Brand & Visuals**: Precision Satora Lab branding with deep slate black (`#0F172A`), electric blue (`#2563EB` / `#0284C7`), clean white, and custom SVG emblem.
- **Regional Accounting**: Default currency in **BDT (৳)** formatted in Bangladesh numerical units (`৳1,50,000`). All schedules, time stamps, and deadlines operate in **Asia/Dhaka (BST, UTC+6)**.
- **Strict Server-Enforced RBAC**: User permissions (view/create/edit/delete, salary confidentiality, and project scope) are verified and enforced in backend Express API endpoints (`/api/*`), redacting sensitive salaries and budgets before payloads leave the server.
- **Financial Accounting Engine**:
  - `Project Cash Profit = Payments Received (Cash In) − Direct Project Expenses Paid`.
  - `Outstanding Payment = Contract Value − Payments Received` (overpayments displayed separately).
  - `Monthly Cash Profit = Income Received That Month − Expenses Paid That Month`.
  - `Company Net Profit/Loss = Total Income Received − All Expenses Paid (Direct Costs + Payroll + Overhead)`.
  - Contract budgets are tracked separately from cash revenues received.
  - Staff salaries are base reference rates; payroll is recorded once as an explicit expense transaction without automatic duplication.
- **PWA & Android Support with Offline Sync**:
  - Full Progressive Web App with Web App Manifest, Service Worker asset and API caching, and in-app install prompt (`PWAInstallButton`).
  - Offline mutation queue: offline edits are buffered locally in `localStorage` and automatically synchronized via `/api/settings/sync` upon reconnection.
- **Google Sheets Migration**:
  - Guided import tool for legacy Google Sheets (Projects, Transactions, Employees, Clients, Tasks).
  - Downloadable CSV templates for all resources.
  - CSV export for monthly financial statements and transaction logs.
- **Security Audit Trail**: Chronological immutable log of all role modifications, financial transactions, project edits, and system actions.

---

## 👥 Role-Based Access Control (RBAC) Matrix

| Role | Scope | Projects | Employees | Salary Access | Finance / Accounts | Reports | Settings |
|---|---|---|---|---|---|---|---|
| **Super Admin** | All Company | View, Create, Edit, Delete | View, Create, Edit, Delete | **Visible** | View, Create, Edit, Delete | View, Export | Full Config & RBAC |
| **Management** | All Company | View, Create, Edit | View (Read-Only) | Redacted | View (Read-Only) | View, Export | Read-Only |
| **Finance Controller** | All Company | View (Read-Only) | View (Read-Only) | **Visible** | View, Create, Edit, Delete | View, Export | No Access |
| **HR & People** | All Company | View (Read-Only) | View, Create, Edit, Delete | **Visible** | Disburse Payroll Only | No Access | No Access |
| **Project Manager** | Assigned Projects Only | View, Create, Edit | View (Read-Only) | Redacted | Only if explicitly granted | No Access | No Access |
| **Team Member** | Assigned Projects & Tasks | View Assigned Only | View (Read-Only) | Redacted | Restricted | No Access | No Access |
| **Viewer** | All Company (Read-Only) | View (Read-Only) | View (Read-Only) | Redacted | Restricted | Read-Only | No Access |

---

## 📁 Codebase Architecture

```
├── /data/
│   └── database.json          # Persistent JSON database with atomic writes & initial seed
├── /server/
│   ├── db.ts                  # Database manager, atomic file writer, and audit logger
│   ├── types.ts               # Core TypeScript entities, roles, and permission types
│   └── routes/
│       ├── auth.ts            # User profile, role switcher, and user invitation endpoints
│       ├── projects.ts        # Projects CRUD, assigned-only filtering, financial redactions
│       ├── employees.ts       # Employee directory with server-side salary protection & payroll
│       ├── clients.ts         # Client CRM accounts & associated project payment tracking
│       ├── transactions.ts    # Income/expense ledger, invoice generation, partial payments
│       ├── tasks.ts           # Deliverable tasks, assignees, deadlines, and overdue detection
│       ├── reports.ts         # Monthly cash flow statement & CSV export
│       ├── settings.ts        # Company config, reset seed, and offline queue sync
│       └── migration.ts       # Google Sheets CSV parser and sample template generator
├── /server.ts                 # Full-stack entrypoint: Express + Vite middlewares (dev) / static (prod)
├── /src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx         # Dhaka clock, role switcher, PWA installer, notifications
│   │   │   ├── Sidebar.tsx        # Responsive navigation with role permission badges
│   │   │   ├── OfflineBanner.tsx  # Network status and offline mutation auto-sync indicator
│   │   │   ├── PWAInstallButton.tsx # Chromium / Android / iOS PWA install dialog
│   │   │   └── ConfirmModal.tsx   # Deletion and sensitive action confirmation dialog
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx  # KPIs, 6-month cash flow chart, status breakdown, deadlines
│   │   ├── projects/
│   │   │   ├── ProjectsPage.tsx   # Searchable table, filters, budgets, cash profit, overdue flags
│   │   │   ├── ProjectFormModal.tsx # Project creation & multi-assignee selection
│   │   │   └── ProjectDetailModal.tsx # Comprehensive drawer with linked tasks & transactions
│   │   ├── tasks/
│   │   │   ├── TasksPage.tsx      # Multi-view master board (Kanban, List, Calendar, Timeline)
│   │   │   ├── TaskKanban.tsx     # Column sprint board (To Do, In Progress, Review, Done)
│   │   │   ├── TaskCalendar.tsx   # Monthly calendar view in Asia/Dhaka
│   │   │   ├── TaskTimeline.tsx   # Visual Gantt project deliverable spans
│   │   │   └── TaskFormModal.tsx  # Task creation and assignee management
│   │   ├── finance/
│   │   │   ├── FinancePage.tsx    # Cash ledger, BDT vouchers, invoice list, partial payments
│   │   │   ├── TransactionFormModal.tsx # Income / expense logger with project allocations
│   │   │   └── InvoiceModal.tsx   # Printable / PDF invoice generator and payment recorder
│   │   ├── reports/
│   │   │   └── MonthlyReportsPage.tsx # Formal Dhaka BST income statement & CSV export
│   │   ├── employees/
│   │   │   ├── EmployeesPage.tsx  # Staff directory, salary locks, and single-click payroll
│   │   │   └── EmployeeFormModal.tsx # Staff profile modal
│   │   ├── clients/
│   │   │   ├── ClientsPage.tsx    # CRM profiles, project history, and payment summaries
│   │   │   └── ClientFormModal.tsx # Client partner modal
│   │   └── settings/
│   │       ├── SettingsPage.tsx   # Company settings, RBAC table, audit trail, reset tool
│   │       ├── UserManagementModal.tsx # User invite & granular permission overrides
│   │       └── SheetsMigrationModal.tsx # CSV migration importer with template download
│   ├── services/
│   │   └── api.ts             # Typed API client with offline mutation buffer & sync
│   ├── utils/
│   │   └── formatters.ts      # BDT currency, Dhaka timezone dates, and status styling
│   ├── App.tsx                # Master container & page router
│   ├── index.css              # Tailwind CSS styles & print media rules
│   └── main.tsx               # Client entry point
├── /public/
│   ├── logo.svg               # Satora Lab brand emblem
│   ├── manifest.json          # PWA web manifest
│   └── sw.js                  # Service Worker for offline asset & API caching
```

---

## 🔐 Default Administrator & Evaluation Personas

To test the system across roles, use the **Persona Switcher** in the top navigation bar or authenticate with:

1. **Super Admin (Founder & Lead Architect)**:
   - Name: **Asaduzzaman Rocky**
   - Email: `asaduzzamanrocky@gmail.com`
   - Role: `super_admin` (Full access, user permissions, audit logs, reset tool)
2. **Operations Director**:
   - Name: **Tasmia Rahman** (`tasmia@satoralab.com`)
   - Role: `management` (High-level dashboard & reports; salary details redacted)
3. **Financial Controller**:
   - Name: **Kamrul Hasan** (`kamrul@satoralab.com`)
   - Role: `finance` (Full ledger, invoice creation, payroll, salary visibility)
4. **People & HR Lead**:
   - Name: **Farhana Kabir** (`farhana@satoralab.com`)
   - Role: `hr` (Employee management, salary visibility, single-click payroll)
5. **Principal Project Manager**:
   - Name: **Zubair Ahmed** (`zubair@satoralab.com`)
   - Role: `project_manager` (Assigned projects and deliverables only; financial data restricted)
6. **Senior Engineer**:
   - Name: **Nafis Fuad** (`nafis@satoralab.com`)
   - Role: `team_member` (Assigned tasks and deliverables only)
7. **Board Advisor**:
   - Name: **Sabrina Sultana** (`sabrina@satoralab.com`)
   - Role: `viewer` (Read-only access)

---

## 📱 Android App & PWA Installation (On-The-Go)

1. **Android (Chrome/Edge)**: Open the web application. Tap the **Install App** button in the header (or browser menu → **Add to Home screen**).
2. **iOS Safari**: Tap **Share → Add to Home Screen**.
3. **Offline Sync**: When disconnected, you can continue managing tasks and projects. The offline banner will show queued mutations and automatically sync them to the database once a connection is re-established.

---

## ⚙️ Development & Production Deployment

### Local Development
```bash
npm install
npm run dev
```
The Express server runs on port 3000, serving API endpoints under `/api/*` and Vite dev assets.

### Production Build & Launch
```bash
npm run build
npm start
```
Produces an optimized static bundle in `/dist`, served directly by Express with full API routing.
