# Wine Cellar Management Application

## Overview

This is a full-stack wine cellar management application built with React, Express.js, PostgreSQL, and Drizzle ORM. The application allows users to manage their wine collections, import wine data via spreadsheets, and leverage AI to enhance wine information and analyze wine labels.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query (TanStack Query) for server state
- **Build Tool**: Vite
- **Component Library**: Radix UI primitives with custom styling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy using scrypt for password hashing
- **Session Management**: express-session with PostgreSQL store (connect-pg-simple)
- **File Handling**: Multer for file uploads and CSV processing

### Data Storage
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with schema-first approach
- **Session Store**: PostgreSQL-backed session storage
- **File Storage**: Temporary file system storage for uploaded spreadsheets

## Key Components

### Wine Management
- Wine CRUD operations with comprehensive metadata (vintage, producer, region, grape varieties, etc.)
- Quantity tracking and consumption status
- Storage location and bin number management
- Drinking window recommendations with AI enhancement

### Spreadsheet Import System
- CSV file processing and parsing
- Intelligent field mapping with AI assistance
- Data validation and duplicate detection
- Batch wine creation with user confirmation

### AI Integration
- **Wine Enhancement**: Anthropic Claude integration for wine data enrichment
- **Label Recognition**: Image analysis for wine label identification and collection matching
- **Drinking Window Prediction**: AI-powered recommendations for optimal drinking periods

### Authentication & Authorization
- User registration and login with encrypted passwords
- Session-based authentication
- User-scoped data access

## Data Flow

1. **User Authentication**: Login credentials → Passport.js → Session creation → User context
2. **Wine Management**: Client operations → Express routes → Drizzle ORM → PostgreSQL
3. **Spreadsheet Import**: File upload → CSV parsing → AI field mapping → User confirmation → Batch insert
4. **AI Enhancement**: Wine data → Anthropic API → Enhanced metadata → Database update
5. **Label Matching**: Image upload → Claude vision analysis → Collection matching → Match results

## External Dependencies

### Core Dependencies
- **@anthropic-ai/sdk**: AI-powered wine analysis and enhancement
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **@tanstack/react-query**: Client-side state management and caching
- **drizzle-orm**: Type-safe database ORM

### UI Dependencies
- **@radix-ui/***: Accessible UI primitive components
- **tailwindcss**: Utility-first CSS framework
- **@tailwindcss/vite**: Tailwind CSS integration for Vite

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety and developer experience
- **esbuild**: Production build optimization

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20
- **Development Server**: Vite dev server with HMR
- **Database**: Neon PostgreSQL instance
- **Port Configuration**: Local port 5000, external port 80

### Production Build
- **Frontend**: Vite build to static assets
- **Backend**: esbuild bundling for Node.js runtime
- **Deployment Target**: Replit autoscale infrastructure
- **Environment Variables**: Database connection and API keys via environment

### Database Management
- **Schema Management**: Drizzle migrations
- **Connection Pooling**: Neon serverless with WebSocket support
- **Session Storage**: PostgreSQL-backed sessions for scalability

## Changelog

```
Changelog:
- June 13, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```