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
- **Dashboard Offset**: Main content uses `md:ml-[240px] pt-20 md:pt-0` to account for sidebar (desktop) and top bar (mobile)
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
    - Students: Invite-only system where parents generate unique tokens.
    - Role-Based Access: Distinct dashboards and permissions for Teacher, Parent, and Student roles.
- **File Upload System**:
    - **Cloudinary Integration**: All file uploads (assignments, materials, profile pictures) use Cloudinary storage
    - **Supported Formats**: Images (JPEG, JPG, PNG, GIF, WEBP) and PDFs with MIME type validation
    - **Assignment Files**: Optional file attachment during assignment creation (max 10MB)
    - **Material Files**: Required file upload for study materials (max 10MB)
    - **apiUpload Helper**: Dedicated FormData upload helper in `client/src/lib/queryClient.ts` that maintains consistent auth headers (Bearer token + session cookies) and error handling across all file upload operations
    - **UX Features**: File preview with name/size display, remove/clear buttons, automatic state reset on dialog close
    - **API Endpoints**: `/api/assignments/with-file` and `/api/materials/with-file` for multipart uploads
- **Core Features**:
    - **Teacher Dashboard**: Assignment creation/grading with file uploads, material uploads with file management, schedule management, feedback system, attendance tracking, earnings view, tutoring session management.
    - **Parent Dashboard**: Child progress tracking, assignment monitoring, student invitations, payment management, tutor requests (when enabled), attendance viewing, tutor rating.
    - **Student Dashboard**: Assignment submission, material access with file viewing, grade/feedback viewing, rewards/badges, clarification requests, schedule viewing, attendance viewing, session joining.
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

## External Dependencies
- **Database**: PostgreSQL (Neon-hosted)
- **Cloud Storage**: Cloudinary (for profile picture uploads)
- **Authentication**: Google OAuth (for Google Sign-In)
- **Email Service**: SMTP (for email verification and communication)