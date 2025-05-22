# HomeschoolSync Platform

## Overview

HomeschoolSync is a web-based platform designed to facilitate homeschooling coordination between students, parents, and tutors. The application provides role-based dashboards, assignment management, session tracking, progress monitoring, and messaging functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

HomeschoolSync follows a modern web application architecture with clear separation of concerns:

1. **Frontend**: React-based single-page application (SPA) with role-based views
2. **Backend**: Express.js server providing RESTful API endpoints
3. **Database**: PostgreSQL database with Drizzle ORM for data access
4. **Authentication**: Replit Auth for user authentication and session management
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
   - Role-specific dashboards
   - Assignments management
   - Session tracking and management
   - Progress visualization
   - Messaging system

3. **State Management**
   - Uses React Query for server state
   - React context for authentication state
   - Local state with useState for component-level state

### Backend Architecture

1. **API Server**
   - Express.js based REST API
   - Structured route handlers
   - Session-based authentication with Replit Auth
   - Integration with OpenAI for session summaries

2. **Database Access**
   - Drizzle ORM for type-safe database operations
   - Repository pattern through storage.ts

3. **Auth System**
   - Leverages Replit Auth for authentication
   - Session management with PostgreSQL-backed sessions

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

## Data Flow

1. **Authentication Flow**
   - User logs in via Replit Auth
   - Server creates a session and stores it in the database
   - Frontend receives user data and renders appropriate role-based view

2. **Data CRUD Operations**
   - Frontend sends requests to the REST API
   - Backend validates requests and performs database operations
   - Responses are typed and consistent

3. **Role-Based Access**
   - User roles (student, parent, tutor) determine accessible views and actions
   - Data visibility is filtered based on relationships (e.g., parents see only their children's data)

## External Dependencies

1. **UI Components**
   - Comprehensive ShadCN/UI component library with Radix UI primitives
   - Tailwind CSS for styling

2. **Data Handling**
   - TanStack Query for data fetching, caching, and synchronization
   - Zod for schema validation and type safety

3. **Database**
   - PostgreSQL for data storage
   - Drizzle ORM for database access
   - Neon Serverless Postgres client

4. **AI Integration**
   - OpenAI API for generating session summaries

5. **Authentication**
   - Replit Auth for user authentication

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
   - Use Drizzle Kit for schema migrations
   - Run `npm run db:push` to apply schema changes

4. **UI Development**
   - Use ShadCN/UI components
   - Follow the established design system with CSS variables
   - Support both light and dark modes