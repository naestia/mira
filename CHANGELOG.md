# Changelog

All notable changes to Mira will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta] - 2026-04-17

First beta release of Mira, a task management and incident tracking application.

### Added

#### Authentication & Users
- User registration with email and password (bcrypt hashed)
- Login via email or username
- JWT-based sessions via NextAuth.js
- User profile management (name, username)
- Password change functionality
- Forced password change flow for admin-created accounts

#### Task Management
- Task CRUD with title, description, priority, and due date
- Status workflow: TODO, IN_PROGRESS, DONE
- Priority levels: LOW, MEDIUM, HIGH, URGENT
- Subtasks with independent completion tracking
- User-scoped color-coded tags
- Full-text search by title/description
- Filtering by status, priority, and tag
- Sorting by due date, priority, or created date
- Visual due date indicators (overdue, due today)

#### Groups & Collaboration
- Personal groups (invisible, auto-created per user)
- Shared groups for team collaboration
- Group discovery page
- Join request workflow (request, approve, reject)
- Bitmask permission system (VIEW, CREATE, EDIT, DELETE, MANAGE)
- Member permission management

#### Incident Management
- Incident creation with title, description, and severity
- Severity levels: LOW, MEDIUM, HIGH, CRITICAL
- Status workflow: OPEN, INVESTIGATING, RESOLVED
- Visual StatusStepper for status progression
- Timeline with automatic event logging
- Manual note-adding to timelines
- Time-to-resolve calculation for resolved incidents
- Active/Resolved tabs with filtering and search

#### Notifications
- In-app notification bell with unread count
- Notifications for HIGH/CRITICAL incidents
- Notifications for status changes and resolutions
- Click-to-navigate to related incident
- Mark all as read functionality

#### Admin Portal
- Role-based access control (USER, ADMIN)
- Admin dashboard with system-wide stats
- User management (list, create, edit, activate/deactivate, soft-delete)
- Admin password reset for any user
- Role promotion/demotion with safety guards
- Protected admin accounts
- Incident oversight across all users
- App settings (registration toggle, task limits)

#### UI/UX
- Dark mode with system preference detection
- Manual theme toggle with persistence
- Responsive design with collapsible sidebar
- Toast notifications for actions
- Confirmation dialogs for destructive actions
- Loading skeletons and spinners

#### Deployment
- Docker and Docker Compose support
- Kubernetes manifests with Kustomize
- Database migration job for Kubernetes

### Not Yet Implemented
- Email alerts for CRITICAL incidents
- Task limits enforcement
- Email notifications
