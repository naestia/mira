# Work TODO App – Implementation Plan

## Project Overview
A full-stack TODO application for work use, built with Next.js and TypeScript. Users can manage tasks with priorities, due dates, tags, subtasks, and full-text search — with a polished dark mode UI.

---

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** NextAuth.js (credentials provider + session-based)
- **Styling:** Tailwind CSS with `next-themes` for dark mode
- **UI Components:** shadcn/ui
- **Form handling:** React Hook Form + Zod

---

## Project Structure
```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          # Protected layout with sidebar
│   │   ├── dashboard/page.tsx  # Main task view
│   │   └── settings/page.tsx   # User settings
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── tasks/
│   │   │   ├── route.ts         # GET (list), POST (create)
│   │   │   └── [id]/route.ts    # GET, PATCH, DELETE
│   │   ├── tags/route.ts
│   │   └── subtasks/[id]/route.ts
│   └── layout.tsx
├── components/
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskForm.tsx
│   │   ├── TaskFilters.tsx
│   │   └── SubtaskList.tsx
│   ├── ui/                      # shadcn/ui components
│   └── layout/
│       ├── Sidebar.tsx
│       └── ThemeToggle.tsx
├── lib/
│   ├── prisma.ts                # Prisma client singleton
│   ├── auth.ts                  # NextAuth config
│   └── validations.ts           # Zod schemas
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── types/
    └── index.ts
```

---

## Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String   // bcrypt hashed
  createdAt DateTime @default(now())
  tasks     Task[]
  tags      Tag[]
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      Status     @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  userId      String
  user        User       @relation(fields: [userId], references: [id])
  subtasks    Subtask[]
  tags        Tag[]      @relation("TaskTags")
}

model Subtask {
  id        String   @id @default(cuid())
  title     String
  done      Boolean  @default(false)
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model Tag {
  id     String @id @default(cuid())
  name   String
  color  String @default("#6366f1")
  userId String
  user   User   @relation(fields: [userId], references: [id])
  tasks  Task[] @relation("TaskTags")

  @@unique([name, userId])
}

enum Status {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

---

## Features & Implementation Details

### 1. Authentication
- Register with email + password (hashed with `bcryptjs`)
- Login via NextAuth.js credentials provider
- Session stored via JWT
- Protected routes using middleware (`middleware.ts`)
- Redirect unauthenticated users to `/login`

### 2. Task Management (CRUD)
- Create tasks with: title, optional description, priority, due date, and tags
- Edit tasks inline or via modal form
- Mark tasks as TODO / IN_PROGRESS / DONE
- Delete tasks with confirmation dialog
- All tasks scoped to the logged-in user

### 3. Subtasks
- Add/remove subtasks within a task
- Toggle subtask completion independently
- Show subtask progress (e.g. "2/5 done") on the TaskCard
- Subtasks cascade-delete with parent task

### 4. Tags / Categories
- Users can create and color-code their own tags
- Assign multiple tags to a task
- Tags are scoped per user

### 5. Priority Levels
- Four levels: LOW, MEDIUM, HIGH, URGENT
- Visually distinguished by color badges
- Sortable by priority in task list

### 6. Due Dates
- Optional date picker on task form
- Visual indicator for overdue tasks (red) and due-today tasks (yellow)

### 7. Search & Filter
- Full-text search by task title/description (client-side filtering for snappiness)
- Filter by: status, priority, tag, due date range
- Sort by: due date, priority, created date
- Filters persist in URL query params

### 8. Dark Mode
- System default with manual toggle via `next-themes`
- Toggle stored in localStorage
- Fully styled with Tailwind dark: variants

---

## API Routes

| Method | Endpoint              | Description                   |
|--------|-----------------------|-------------------------------|
| GET    | /api/tasks            | List all tasks (with filters) |
| POST   | /api/tasks            | Create a task                 |
| GET    | /api/tasks/[id]       | Get single task               |
| PATCH  | /api/tasks/[id]       | Update task                   |
| DELETE | /api/tasks/[id]       | Delete task                   |
| PATCH  | /api/subtasks/[id]    | Toggle subtask done           |
| DELETE | /api/subtasks/[id]    | Delete subtask                |
| GET    | /api/tags             | List user's tags              |
| POST   | /api/tags             | Create tag                    |
| DELETE | /api/tags/[id]        | Delete tag                    |

All API routes must validate the user session and scope queries to `userId`.

---

## Implementation Steps (for Claude Code)

### Step 1 – Project Setup
1. Initialize: `npx create-next-app@latest . --typescript --tailwind --app`
2. Install dependencies:
   ```
   npm install prisma @prisma/client next-auth bcryptjs
   npm install react-hook-form @hookform/resolvers zod
   npm install next-themes date-fns
   npm install -D @types/bcryptjs
   ```
3. Initialize shadcn/ui: `npx shadcn@latest init`
4. Add shadcn components: button, input, dialog, badge, popover, calendar, select, dropdown-menu, card, checkbox, separator, tooltip

### Step 2 – Database & Prisma
1. Create `prisma/schema.prisma` with the schema above
2. Set `DATABASE_URL` in `.env`
3. Run `npx prisma migrate dev --name init`
4. Create `lib/prisma.ts` singleton client
5. Optionally add `prisma/seed.ts` with sample data

### Step 3 – Authentication
1. Create `lib/auth.ts` with NextAuth config (credentials provider)
2. Add `/app/api/auth/[...nextauth]/route.ts`
3. Create register API route at `/app/api/register/route.ts`
4. Build `/app/(auth)/login/page.tsx` and `/app/(auth)/register/page.tsx`
5. Add `middleware.ts` to protect `/dashboard` and `/settings`

### Step 4 – Core Task API
1. Implement `/api/tasks/route.ts` (GET with filters, POST)
2. Implement `/api/tasks/[id]/route.ts` (GET, PATCH, DELETE)
3. Implement subtask and tag API routes
4. Add Zod validation to all routes via `lib/validations.ts`

### Step 5 – UI Components
1. Build `Sidebar.tsx` with navigation and user info
2. Build `TaskList.tsx` with `TaskCard.tsx` items
3. Build `TaskForm.tsx` modal for create/edit (with tag picker, date picker, priority select)
4. Build `TaskFilters.tsx` with search input and filter controls
5. Build `SubtaskList.tsx` inside task detail view
6. Add `ThemeToggle.tsx` in the header

### Step 6 – Dashboard Page
1. Wire up `/app/(app)/dashboard/page.tsx` to fetch tasks server-side
2. Add client-side filtering/search state
3. Handle optimistic UI updates on status toggle and subtask completion

### Step 7 – Polish
1. Add loading skeletons for task list
2. Add empty state illustration
3. Add toast notifications for CRUD actions (use shadcn `sonner` or `toast`)
4. Ensure full dark mode coverage
5. Make layout responsive for mobile

---

## Environment Variables
```
DATABASE_URL="postgresql://user:password@localhost:5432/todo_db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Definition of Done
- [ ] User can register and log in
- [ ] User can create, edit, and delete tasks
- [ ] Tasks support priority, due date, tags, and subtasks
- [ ] Search and filter work correctly
- [ ] Dark mode toggles and persists
- [ ] All data is user-scoped (no cross-user data leakage)
- [ ] App is responsive on mobile
- [ ] No TypeScript errors (`tsc --noEmit` passes)
