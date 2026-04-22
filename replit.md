# Lyra Preparatory - Complete Educational Management System

## Overview
**Lyra Preparatory** is a comprehensive web-based tutoring platform designed to connect teachers, parents, and students. It offers a full suite of educational management capabilities, including role-based access, student invitations, assignment tracking, progress monitoring, real-time messaging, and payment management. The platform aims to streamline educational interactions and enhance the learning experience.

## User Preferences
- Communication style: Simple, everyday language
- Avoid technical jargon when explaining features to users

## System Architecture

### UI/UX Decisions
The platform utilizes React 18 with TypeScript for the frontend, styled with Tailwind CSS and Shadcn/UI components with a **Khan Academy-inspired design system** — clean, white backgrounds, calm educational green primary, labeled navigation, and progress-first layouts:

- **Design Inspiration**: Khan Academy — white/light backgrounds, calm educational green (`hsl(158 64% 36%)` ~ #1E8C64), minimal cognitive load, mobile-friendly
- **Branding**: "Lyra Preparatory" with BookOpen icon in primary green, displayed on all pages
- **Sidebar (ModernSidebar)**: 240px wide, white background with right border; icons + text labels; active state with green highlight; bottom profile/logout section; collapses to 56px hamburger top bar on mobile. Nav items match only active TabsContent per role.
- **Dashboard Offset**: Main content uses `md:ml-[240px] pt-20 md:pt-6` to account for sidebar (desktop) and mobile top bar (mobile)
- **Design Tokens** (index.css): `--primary: 158 64% 36%` (calm forest teal-green), `--success: 142 72% 36%`, `--warning: 38 92% 50%`, `--info: 217 91% 60%` (blue for info), all other tokens use semantic names
- **Stat Cards (ColorfulStatCard)**: White card with `accent` prop (blue/green/amber/purple/rose) - colored icon container + light tinted background
- **Welcome Banner (WelcomeCard)**: Solid primary-color strip with white text and role info
- **Auth Pages**: Two-panel layout (blue left panel + white form right) for Login/Signup; clean card layout for VerifyEmail/StudentSignup

Icons are provided by Lucide React. The profile management features a modern tabbed interface for easy navigation and role-specific fields. All interactive elements include `data-testid` attributes for robust testing and full keyboard accessibility support.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Wouter for routing, TanStack Query for data fetching, Shadcn/UI, Tailwind CSS.
- **Backend**: Node.js with Express, TypeScript, Prisma ORM, Zod for validation, session-based authentication.
- **Authentication**:
    - Teachers & Parents: Direct signup via email/password or Google Sign-In. Email verification is mandatory.
    - Students: Invite-only system using a short 6-character uppercase alphanumeric code (e.g. `A3KW9F`). Parents generate invites which produce both an internal UUID token and a human-readable short code. Students always type the short code manually on the signup page — no token in URLs. Signup supports both password and Google.
    - Role-Based Access: Distinct dashboards and permissions for Teacher, Parent, and Student roles.
- **File Upload System**:
    - **Cloudinary Integration**: All file uploads (assignments, materials, profile pictures) use Cloudinary storage
    - **Supported Formats**: Images (JPEG, JPG, PNG, GIF, WEBP) and PDFs with MIME type validation
    - **Assignment Files**: Optional file attachment during assignment creation (max 10MB)
    - **Material Files**: Multiple PDF attachments per classwork material — `attachments String[]` column in DB; teacher can add/remove individually; all popups and ReadView show each as its own numbered card (backward-compat: old single `url` PDF shown alongside new array)
    - **apiUpload Helper**: Dedicated FormData upload helper in `client/src/lib/queryClient.ts` that maintains consistent auth headers (Bearer token + session cookies) and error handling across all file upload operations
    - **UX Features**: File preview with name/size display, remove/clear buttons, automatic state reset on dialog close
    - **API Endpoints**: `/api/assignments/with-file` and `/api/materials/with-file` for multipart uploads
- **Core Features**:
    - **Teacher Dashboard**: Assignment creation/grading with file uploads, material uploads with file management, schedule management, feedback system, attendance tracking, earnings view, tutoring session management.
    - **Parent Dashboard**: Child progress tracking, assignment monitoring, student invitations, payment management, tutor requests (when enabled), attendance viewing, tutor rating.
    - **Student Dashboard**: Assignment submission, material access with file viewing, grade/feedback viewing, Day Streak metric (consecutive days with graded submissions via `submittedAt`), rewards/points, clarification requests, schedule viewing, attendance viewing, session joining.
    - **Additional**: Real-time messaging, progress reports, analytics, downloadable reports, comprehensive profile management with Cloudinary integration for profile pictures.
- **Tutor Request Mode Toggle**:
    - **Flexible Teacher Assignment System**: The platform supports two modes for connecting students with teachers:
    - **Mode OFF (Default - Direct Assignment)**: Students are automatically assigned to available teachers when they join. Best for small teams with 1-3 teachers.
    - **Mode ON (Request Flow)**: Parents must request a tutor for their children, and teachers can approve/reject requests. Better for larger teams with multiple teachers.
    - **System Settings API**: Controlled via `TUTOR_REQUEST_MODE` setting in the `SystemSettings` table
    - **Auto-Assignment**: When mode is OFF, new students are automatically assigned to the first available teacher
    - **UI Conditional Rendering**: Tutor request tabs/sections only appear in dashboards when the mode is ON
    - **API Endpoints**: 
        - `GET /api/system-settings/tutor-request-mode` - Check current mode (public)
        - `POST /api/system-settings` - Update settings (teacher only)

### System Design Choices
- **Database**: PostgreSQL hosted on Neon, managed with Prisma ORM for type-safe queries and migrations.
- **Data Model**: Comprehensive relational schema encompassing Users, Students, Assignments, Materials, Schedules, Sessions, Feedback, Attendance, Payments, Messages, Progress Reports, and more.
- **API**: RESTful API endpoints for authentication, student invites, assignments, materials, and various other functionalities, all protected by session-based authentication and validated using Zod.
- **Email System**: Dynamic base URL detection for email verification and password reset links.

### Admin / Super Admin System
- **Two-tier admin flags**: `isAdmin` and `isSuperAdmin` Boolean fields on the `User` model (default `false`)
- **Env-based seeding**: Set `SUPER_ADMIN_EMAIL` and/or `ADMIN_EMAIL` env vars; on server startup, `syncAdminFlags()` automatically promotes those users to their respective tier
- **Middleware**: `requireAdmin` (isAdmin OR isSuperAdmin) and `requireSuperAdmin` (isSuperAdmin only)
- **Admin API routes**:
  - `GET /api/admin/users` — list all users (admin+)
  - `PATCH /api/admin/users/:id/role` — change user role (super admin only)
  - `PATCH /api/admin/users/:id/admin` — toggle isAdmin flag (super admin only)
  - `PATCH /api/admin/users/:id/super-admin` — toggle isSuperAdmin flag (super admin only)
- **Admin page**: `/admin` route → `AdminUsers.tsx` — table with search, stat cards, avatar+badge user rows, ⋯ dropdown for super admins
- **Sidebar**: `ModernSidebar` shows "Admin Panel" link (with shield icon) for users with `isAdmin` or `isSuperAdmin`; shows "Super" badge for super admins
- **AuthContext**: User type includes `isAdmin?: boolean` and `isSuperAdmin?: boolean`

### In-App Notification System
- **Notification model**: `Notification` table in PostgreSQL with fields `id`, `userId`, `type`, `title`, `body`, `isRead`, `createdAt`
- **Storage methods**: `createNotification`, `getNotificationsForUser` (last 50), `getUnreadNotificationCount`, `markNotificationRead`, `markAllNotificationsRead`
- **API routes**:
  - `GET /api/notifications` — list notifications for current user
  - `GET /api/notifications/count` — unread count (polled every 30s)
  - `PATCH /api/notifications/read-all` — mark all as read
  - `PATCH /api/notifications/:id/read` — mark one as read
- **Trigger hooks** (fire-and-forget, never block the response):
  - New assignment posted → notify each assigned student
  - Regular assignment graded → notify student
  - Tutor request approved/rejected → notify parent
  - Progress report created → notify student + parent
  - Classroom assignment created (both routes) → notify all enrolled students
  - Student submits classroom assignment → notify teacher
  - Classroom submission graded → notify student
- **Sidebar bell**: "Notifications" nav item in `ModernSidebar` with unread badge; clicking opens a floating panel showing the last 50 notifications with timestamps, unread dot indicators, and "Mark all read" button

### Assignment Form Builder
- **`ClassroomAssignment.formSchema`** (JSONB, nullable): Array of `FormQuestion` objects (`{ id, type, label, required, options? }`). Supported types: `short`, `paragraph`, `multiple_choice`, `checkbox`.
- **`ClassroomSubmission.formAnswers`** (JSONB, nullable): Record mapping question `id` → answer (`string` or `string[]` for checkboxes).
- **Teacher UX**: "Add Form" toggle in Create/Edit assignment dialogs opens a `FormBuilder` (reusable component at `client/src/components/FormBuilder.tsx`) with add/remove questions, type selector, options editor, and required toggle.
- **Student UX**: When an assignment has `formSchema`, the submit dialog (in `StudentAssignmentsTab`) shows a `FormResponse` component instead of the free-text textarea. Students can still attach a file. `ClassworkDetail.tsx` student panel also uses `FormResponse` for form-based assignments.
- **Grading UX**: Teacher grading modal in `TeacherAssignmentsTab` shows `FormResponse` (read-only) when form answers exist. `ClassworkDetail` teacher panel likewise.
- **Indicators**: "N form questions" pill badge (violet) on assignment cards in teacher and student tabs, and in the assignment header on `ClassworkDetail`.
- **Backward compatible**: Assignments without `formSchema` behave exactly as before. No `type` field on assignments.

### Weighted Grading System (Task #115)
- **Four item types**: `ClassroomAssignment.assignmentType` expanded from `["assignment","test"]` to `["assignment","test","quiz","project"]`. Pill colours: Assignment=blue, Test=orange, Quiz=purple, Project=teal.
- **`GradingPolicy` model**: New Prisma model (migration `20260422124945_add_grading_policy`) — `id`, `classroomId` (FK→Classroom Cascade), `assignmentWeight`, `testWeight`, `quizWeight`, `projectWeight` (all `Int @default(25)`), `effectiveFrom DateTime @default(now())`. The record with the highest `id` is the active policy for a classroom.
- **Backend routes**:
  - `GET /api/classrooms/:id/grading-policy` — returns active policy or `null` (member auth)
  - `POST /api/classrooms/:id/grading-policy` — creates new policy snapshot; validates weights sum = 100 (owner only)
  - `GET /api/classrooms/:id/grade-breakdown/:studentId` — weighted grade breakdown: computes per-type average, renormalises weights excluding pending/zero types, returns `{ overall, isPartial, pendingTypes, policy, breakdown[] }` (teacher=any enrolled student; student=self; parent=their child only)
- **Frontend — Grade tabs**:
  - `TeacherGradesTab`: displays policy summary bar above table; column header pills show all 4 types in distinct colours; Total column shows weighted % (falls back to raw % when no policy).
  - `StudentGradesTab`: now receives `studentId` prop; replaces green banner with `GradeBreakdownPanel`.
  - `ParentGradesTab`: replaces green banner with `GradeBreakdownPanel`.
  - `GradeBreakdownPanel` (new): fetches `/grade-breakdown/:studentId`; shows overall weighted %, per-type bars with effective weight label; pending/zero-weight notes; all-pending neutral empty state.
- **Frontend — Assignment forms**: `NewAssignmentPage` and `EditAssignmentPage` both replace the 2-option toggle with a 4-option `<Select>` dropdown (placeholder "Select a type"; required before submit). `NewAssignmentPage` starts with no default type selected.
- **Frontend — Classroom Settings tab** (teacher only): new tab added to `ClassroomDetail`; renders `TeacherSettingsTab` with 4 weight inputs, live sum indicator (green at 100, red otherwise), visual stacked bar, and "Save Policy" button.
- **Shared types**: `itemTypes`, `ItemType`, `itemTypeLabels`, `GradingPolicy`, `InsertGradingPolicy`, `GradeBreakdown`, `GradeBreakdownItem` exported from `shared/schema.ts`.

### Slug System
- **`shared/slugify.ts`**: `slugify(text, id)` generates URL-safe slugs in format `<sanitized-title>-<id>` (e.g. `biology-101-3`). The ID suffix guarantees global uniqueness without any retry loop.
- **DB fields**: `slug` column added to `User`, `Assignment`, `Material`, `Classroom` (`@unique`), and scoped `@@unique([classroomId, slug])` on `ClassroomAssignment` and `ClassroomMaterial`.
- **Auto-generation**: Every `create*` method in `storage.ts` for the six affected models runs a two-step create+update to generate and save the slug immediately.
- **Storage helpers**: `getClassroomBySlug(slug)` and `getClassroomAssignmentBySlug(classroomId, slug)` added for routing needs.
- **Routes**: `resolveClassroom(param)` helper accepts either a numeric ID or a slug string. `requireClassroomOwner` and `requireClassroomMember` use it, so all nested classroom routes transparently accept both.
- **Frontend routes**: `/classrooms/:id` changed to `/classrooms/:slug` and `/classrooms/:slug/classwork/:classworkSlug` added (renders `ClassworkDetail.tsx`).
- **Dashboard links**: All "Open Classroom" / "View Classroom" links use `c.slug ?? c.id` — old classrooms without slugs fall back to numeric ID (backward compatible).
- **`ClassworkDetail.tsx`**: Assignment detail page showing grading form (teacher), submission form (student), or read-only view (parent). Reached via classroom slug + assignment slug URL.

## External Dependencies
- **Database**: PostgreSQL (Neon-hosted)
- **Cloud Storage**: Cloudinary (for profile picture uploads)
- **Authentication**: Google OAuth (for Google Sign-In)
- **Email Service**: SMTP (for email verification and communication)