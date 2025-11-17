# HomeschoolSync Platform

## Overview

HomeschoolSync is a web-based platform designed to facilitate homeschooling coordination between students, parents, and tutors. The application provides role-based dashboards, assignment management, session tracking, progress monitoring, and messaging functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

HomeschoolSync follows a modern web application architecture with clear separation of concerns:

1. **Frontend**: React-based single-page application (SPA) with role-based views
2. **Backend**: Express.js server providing RESTful API endpoints
3. **Database**: PostgreSQL database with Prisma ORM for data access
4. **Authentication**: Firebase Authentication for user authentication and session management
5. **Real-time Features**: Currently limited, but the architecture supports expansion

The application uses a monorepo structure with client, server, and shared code folders. This enables strong type sharing between frontend and backend while maintaining separation of concerns.

## Key Components

### Frontend Architecture

1. **Client Application**
   - Built with React and TypeScript
   - Uses Wouter for lightweight routing
   - Employs TanStack (React) Query for data fetching and caching
   - Uses ShadCN/UI component library with Tailwind CSS for styling
   - Implements role-based views (student, parent, tutor)

2. **Key Pages**
   - Role-specific dashboards (Student, Parent, Tutor)
   - Assignments management
   - Session tracking and management
   - Progress visualization
   - Messaging system
   - Tutor request system (Parent/Tutor)
   - Learning materials management (Tutor upload/share, Student view/download)
   - Notifications center

3. **State Management**
   - Uses React Query for server state
   - React context for authentication state
   - Local state with useState for component-level state

### Backend Architecture

1. **API Server**
   - Express.js based REST API
   - Structured route handlers
   - Session-based authentication with multiple providers
   - Integration with OpenAI for session summaries

2. **Database Access**
   - Prisma ORM for type-safe database operations
   - Repository pattern through storage.ts

3. **Auth System**
   - **Multiple Authentication Methods:**
     - Google OAuth via Firebase Authentication
     - Email/Password authentication with email verification
   - **Security Features:**
     - Password hashing with bcrypt (10 rounds)
     - Email verification required for email/password signups
     - Session regeneration on login to prevent session fixation
     - Verification tokens with 24-hour expiry
     - Sanitized API responses (no password/token leakage)
     - Automatic storage clearing on logout and session expiration
   - **Session Management:**
     - PostgreSQL-backed sessions via connect-pg-simple
     - Secure session destruction on logout
     - Session-based authentication middleware
   - **Storage Security:**
     - Global fetch interceptor clears localStorage and sessionStorage on any 401 response
     - All logout handlers (Replit OAuth, Firebase, Email/Password) clear browser storage
     - Defense-in-depth with storage clearing in both queryClient and global fetch interceptor
     - Implemented in `client/src/lib/storage.ts` and `client/src/lib/fetchInterceptor.ts`

### Database Schema

The database schema includes tables for:
1. Users (with role-based differentiation)
2. Students
3. Subjects
4. Assignments
5. Student Assignments
6. Tutoring Sessions
7. Session Summaries
8. Messages
9. Student Progress
10. Tutor Requests (parent-tutor request/approval system)
11. Notifications (real-time notification system)
12. Learning Materials (file uploads and sharing system)

## Data Flow

1. **Authentication Flow**
   - **Google OAuth:**
     - User clicks "Sign in with Google"
     - Firebase handles OAuth flow
     - Server receives user info and checks for existing account
     - If account already exists: Modal popup appears asking user to confirm login
       - "Continue" → Proceeds with login
       - "Cancel" → Signs out from Firebase, no login
     - If new account: Creates user record
     - Session regenerated and user info stored
     - Frontend receives sanitized user data with `isExistingUser` flag
   
   - **Email/Password Signup:**
     - User submits signup form with email and password
     - Server hashes password and generates verification token
     - Verification email sent via SMTP
     - User clicks verification link in email
     - Email verified, user can now log in
   
   - **Email/Password Login:**
     - User submits credentials
     - Server validates password and checks email verification
     - If verified, session regenerated and user authenticated
     - Frontend receives sanitized user data
   
   - **Role-Based Onboarding:**
     - After any authentication method, if user has no role
     - User redirected to role selection page
     - User selects role (student, parent, or tutor)
     - Role saved and user redirected to appropriate dashboard

2. **Data CRUD Operations**
   - Frontend sends requests to the REST API
   - Backend validates requests and performs database operations
   - Responses are typed and consistent

3. **Role-Based Access**
   - User roles (student, parent, tutor) determine accessible views and actions
   - Data visibility is filtered based on relationships (e.g., parents see only their children's data)

4. **Messaging System with Relationship-Based Filtering**
   - **Parent Messaging:**
     - Parents can only message tutors with approved tutor request relationships
     - Fetches approved tutors via `/api/tutors/approved/parent/:parentId`
   - **Student Messaging:**
     - Students can only message tutors with approved relationships (through their parent)
     - Fetches approved tutors via `/api/tutors/approved/student/:studentId`
   - **Tutor Messaging:**
     - Tutors can message their assigned students
     - Fetches students via `/api/students/tutor/:tutorId`
   - **Authorization:**
     - All messaging endpoints verify user identity matches the resource owner
     - Only users with established relationships can communicate

## External Dependencies

1. **UI Components**
   - Comprehensive ShadCN/UI component library with Radix UI primitives
   - Tailwind CSS for styling

2. **Data Handling**
   - TanStack Query for data fetching, caching, and synchronization
   - Zod for schema validation and type safety

3. **Database**
   - PostgreSQL for data storage
   - Prisma ORM for database access
   - Neon Serverless Postgres client

4. **AI Integration**
   - OpenAI API for generating session summaries

5. **Authentication**
   - Firebase Authentication for Google OAuth
   - Bcrypt for password hashing
   - Nodemailer for email verification
   - SMTP integration (requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM secrets)

## Deployment Strategy

The application is configured for deployment on Replit with:

1. **Build Process**
   - Vite for frontend bundling
   - ESBuild for server bundling
   - Combined output for production deployment

2. **Runtime Configuration**
   - Environment variables for sensitive configuration
   - Production/development mode switching

3. **Database Provisioning**
   - PostgreSQL 16 module ready for use
   - Connection via DATABASE_URL environment variable

4. **Port Configuration**
   - Local port 5000 mapped to external port 80

To set up and run the application:
1. Ensure DATABASE_URL environment variable is set
2. For development: `npm run dev`
3. For production: `npm run build` followed by `npm run start`

## Development Guidelines

1. **Type Safety**
   - Use TypeScript throughout the codebase
   - Leverage shared types between frontend and backend

2. **API Development**
   - Follow RESTful principles
   - Use Zod for input validation
   - Maintain consistent error responses

3. **Database Migrations**
   - Use Prisma Migrate for schema migrations
   - Run `npx prisma db push` to sync schema changes
   - Run `npx prisma generate` to regenerate Prisma Client after schema changes

4. **UI Development**
   - Use ShadCN/UI components
   - Follow the established design system with CSS variables
   - Support both light and dark modes