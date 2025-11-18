# Tutoring Platform - Complete Educational Management System

## Overview

A comprehensive web-based tutoring platform that connects teachers, parents, and students with full-featured educational management capabilities. The system supports role-based access, student invitations, assignment tracking, progress monitoring, messaging, and payment management.

## Key Features

### Authentication & User Management
- **Teacher & Parent Signup**: Direct registration for teachers and parents
- **Student Invite-Only**: Students can only join through parent-sent invitations
- **Role-Based Access**: Three distinct user types with different permissions and dashboards

### Teacher Dashboard Features
- Create and assign homework/assignments with due dates and points
- Grade student submissions with feedback
- Upload and share study materials by subject and grade level
- Approve or reject tutor requests from parents
- Track student performance and progress
- Manage class schedules
- Give feedback to students (positive, constructive, general)
- View earnings and payment history
- Create and manage tutoring sessions
- Mark student attendance

### Parent Dashboard Features
- Track all children's assignments and progress
- Monitor student grades and feedback
- Invite students via email with unique invite codes
- View child-specific dashboards
- Manage subscription payments
- Request tutors for their children
- View attendance records
- Rate and review tutors
- Set parental controls (screen time, allowed hours, blocked features)

### Student Dashboard Features
- View and submit assignments
- Access uploaded study materials
- View feedback and grades from teachers
- See rewards, badges, and points earned
- Request clarifications on assignments
- View attendance records
- Check class schedule
- Join scheduled tutoring sessions

### Additional Features
- Real-time messaging system between all roles
- Progress reports and analytics
- Downloadable reports
- Earnings dashboard for teachers
- Payment tracking and subscription management

## Technology Stack

### Frontend
- React 18 with TypeScript
- Wouter for routing
- TanStack Query for data fetching and caching
- Tailwind CSS for styling
- Shadcn/UI components
- Lucide React icons

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM with PostgreSQL database
- Session-based authentication
- Zod for validation

### Database
- PostgreSQL (Neon-hosted)
- Prisma for migrations and queries
- Comprehensive relational schema

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/ui/      # Reusable UI components
│   │   ├── contexts/           # React contexts (Auth)
│   │   ├── hooks/              # Custom hooks
│   │   ├── lib/                # Utilities and config
│   │   ├── pages/              # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── StudentSignup.tsx
│   │   │   ├── TeacherDashboard.tsx
│   │   │   ├── ParentDashboard.tsx
│   │   │   └── StudentDashboard.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── index.html
├── server/
│   ├── db.ts                   # Prisma client instance
│   ├── storage.ts              # Database operations layer
│   ├── routes.ts               # API route handlers
│   ├── index.ts                # Server entry point
│   └── vite.ts                 # Vite dev server setup
├── shared/
│   └── schema.ts               # Shared TypeScript types and Zod schemas
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
└── package.json
```

## Data Model

### Core Entities
- **User**: Base user account (id, email, password, name, role)
- **Student**: Student profile linked to user and parent
- **Assignment**: Teacher-created homework assignments
- **StudentAssignment**: Individual student's assignment submission
- **Material**: Uploaded study materials
- **Schedule**: Class schedules
- **Session**: Tutoring sessions
- **Feedback**: Teacher feedback to students
- **Attendance**: Student attendance tracking
- **Payment**: Payment records
- **TutorRequest**: Parent requests for tutoring
- **Message**: Inter-user messaging
- **ProgressReport**: Student progress reports
- **Clarification**: Student questions on assignments
- **ParentalControl**: Parent-set restrictions
- **TutorRating**: Parent ratings of teachers
- **Earnings**: Teacher earnings tracking
- **StudentInvite**: Parent-sent student invitations

## API Routes

### Authentication
- `POST /api/auth/signup` - Teacher/Parent registration
- `POST /api/auth/login` - User login
- `POST /api/auth/signup/student` - Student signup via invite token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Student Invites
- `POST /api/invites/student` - Parent creates invite
- `GET /api/invites/student/parent` - Get parent's invites
- `GET /api/invites/student/:token` - Verify invite token

### Assignments
- `POST /api/assignments` - Create assignment (teachers)
- `GET /api/assignments/teacher` - Get teacher's assignments
- `GET /api/assignments/student/:studentId` - Get student's assignments
- `PATCH /api/student-assignments/:id/submit` - Submit assignment
- `PATCH /api/student-assignments/:id/grade` - Grade assignment (teachers)

### Materials
- `POST /api/materials` - Upload material (teachers)
- `GET /api/materials/teacher` - Get teacher's materials
- `GET /api/materials/student/:studentId` - Get materials for student's grade

### Other Endpoints
- Students, Sessions, Schedules, Feedback, Attendance
- Payments, Tutor Requests, Messages
- Progress Reports, Clarifications, Parental Controls
- Tutor Ratings, Earnings

## Authentication Flow

1. **Teachers & Parents**: Direct signup with email/password
2. **Students**: Cannot sign up directly
   - Parent creates student invite with email, name, and grade level
   - System generates unique invite token (UUID)
   - Parent shares token with student
   - Student uses token to complete signup
   - On successful signup, student account is linked to parent

## Running the Application

### Development
```bash
npm run dev
```
This will:
1. Run Prisma migrations
2. Start Express server on port 5000
3. Launch Vite dev server with HMR

### Production
```bash
npm run build
npm run start
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (automatically provided by Replit)

## User Preferences

- Communication style: Simple, everyday language
- Avoid technical jargon when explaining features to users

## Recent Changes (November 18, 2025)

### Latest Update
- **Messaging System**: Added full messaging functionality to all three dashboards (Teacher, Parent, Student)
  - Users can send messages to each other by specifying receiver ID
  - Messages displayed in chat-like interface with sender/receiver differentiation
  - Unread badge for new messages
  
- **Progress Reports & Analytics**: Implemented comprehensive reporting system
  - Teacher Dashboard: Create progress reports with grades, comments, strengths, and areas for improvement
  - Teacher Dashboard: Analytics dashboard showing total reports, students tracked, and earnings
  - Parent Dashboard: View child-specific progress reports
  - Both roles can download reports in JSON format
  
- **Bug Fixes**: 
  - Fixed student invite schema to properly handle auto-generated fields (parentId, token, status, dates)
  - Updated parent dashboard to display full invite tokens (previously truncated)
  - Upgraded password security from SHA-256 to bcrypt with proper salting

### Initial Implementation
- Complete rebuild of the platform with fresh codebase
- Implemented comprehensive database schema with Prisma
- Created role-based dashboards for all three user types
- Added student invite-only authentication system
- Built full CRUD operations for all features
- Integrated UI components with Shadcn/UI
- Implemented session-based authentication
- Added comprehensive API routes for all features

## Development Notes

- Uses Prisma for type-safe database operations
- All data persisted in PostgreSQL database
- Session-based authentication with secure password hashing
- Role-based access control throughout the application
- Comprehensive validation using Zod schemas
- Test IDs added to all interactive elements for testing
