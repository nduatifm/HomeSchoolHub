# Tutoring Platform - Complete Educational Management System

## Overview
A comprehensive web-based tutoring platform designed to connect teachers, parents, and students. It offers a full suite of educational management capabilities, including role-based access, student invitations, assignment tracking, progress monitoring, real-time messaging, and payment management. The platform aims to streamline educational interactions and enhance the learning experience.

## User Preferences
- Communication style: Simple, everyday language
- Avoid technical jargon when explaining features to users

## System Architecture

### UI/UX Decisions
The platform utilizes React 18 with TypeScript for the frontend, styled with Tailwind CSS and Shadcn/UI components for a modern and consistent design. The platform features a **modern, colorful dashboard design** inspired by contemporary educational platforms:

- **Modern Vertical Sidebar**: Dark navy sidebar (fixed left, 96px wide) with icon navigation for quick access to key sections
- **Vibrant Color Palette**: Purple, green, coral, and orange accent colors for visual hierarchy and engagement
- **Welcome Cards**: Personalized hero cards with gradient backgrounds and call-to-action buttons
- **Colorful Stat Cards**: Vibrant metric cards with icons, gradients, and hover effects
- **Rounded Design Language**: Generous border-radius (1rem default, up to 3rem on cards) for friendly, modern aesthetic
- **Modern Dialogs & Dropdowns**: 
  - All dialogs feature rounded corners (3xl), enhanced shadows, and backdrop blur effects
  - Instagram-style ModernCombobox for user selection with searchable interface, avatar previews, and gradient themes
  - Form inputs with rounded borders, focus rings, and smooth transitions
  - Button animations with scale effects on hover and click

Icons are provided by Lucide React. The profile management features a modern tabbed interface for easy navigation and role-specific fields. All interactive elements include `data-testid` attributes for robust testing and full keyboard accessibility support.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Wouter for routing, TanStack Query for data fetching, Shadcn/UI, Tailwind CSS.
- **Backend**: Node.js with Express, TypeScript, Prisma ORM, Zod for validation, session-based authentication.
- **Authentication**:
    - Teachers & Parents: Direct signup via email/password or Google Sign-In. Email verification is mandatory.
    - Students: Invite-only system where parents generate unique tokens.
    - Role-Based Access: Distinct dashboards and permissions for Teacher, Parent, and Student roles.
- **Core Features**:
    - **Teacher Dashboard**: Assignment creation/grading, material uploads, schedule management, feedback system, attendance tracking, earnings view, tutoring session management.
    - **Parent Dashboard**: Child progress tracking, assignment monitoring, student invitations, payment management, tutor requests, attendance viewing, tutor rating.
    - **Student Dashboard**: Assignment submission, material access, grade/feedback viewing, rewards/badges, clarification requests, schedule viewing, attendance viewing, session joining.
    - **Additional**: Real-time messaging, progress reports, analytics, downloadable reports, comprehensive profile management with Cloudinary integration for profile pictures.

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