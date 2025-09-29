# DrainSentry Monitoring System

## Overview

DrainSentry is a comprehensive IoT monitoring system designed to track water levels and waste bin status in real-time. The application provides a web dashboard for monitoring multiple devices, receiving alerts, and analyzing historical data. It integrates with Arduino-based IoT devices that collect sensor data and communicate through Firebase Realtime Database. The system features push notifications, device management, contact management, and data visualization capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion for smooth UI transitions

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **API Design**: RESTful endpoints with proper error handling middleware
- **Real-time Data**: Firebase Realtime Database for device data synchronization

### Data Storage Solutions
- **Primary Database**: PostgreSQL (configured via Drizzle) for user accounts, device metadata, and application settings
- **Real-time Database**: Firebase Realtime Database for live sensor data, device readings, and historical data
- **Schema Management**: Drizzle Kit for database migrations and schema management

### Authentication and Authorization
- **Authentication Provider**: Firebase Authentication with Google OAuth and email/password
- **Session Management**: Express sessions with PostgreSQL storage
- **Token Verification**: Firebase ID token verification on the server
- **Access Control**: Session-based authentication for API endpoints

### Push Notifications
- **Service**: Firebase Cloud Messaging (FCM) for push notifications
- **Architecture**: Service worker for background message handling
- **Features**: Critical alerts for water levels, waste bin fullness, and device offline status
- **Storage**: FCM tokens stored in PostgreSQL with user associations

### External Dependencies

- **Firebase Services**: Authentication, Realtime Database, and Cloud Messaging for complete IoT data pipeline
- **Database**: PostgreSQL via Neon serverless for application data
- **UI Components**: Radix UI primitives with shadcn/ui implementation
- **Charts**: Recharts for responsive data visualization
- **Deployment**: Firebase Hosting for static asset serving
- **Build Tools**: Vite for fast development and optimized production builds
- **ORM**: Drizzle ORM for type-safe database operations

### IoT Device Integration
- **Communication Protocol**: Arduino devices communicate via HTTP requests to Firebase Realtime Database
- **Data Structure**: Hierarchical data organization by user, device, and timestamp
- **Real-time Sync**: Automatic data synchronization between devices and web dashboard
- **Device Management**: Registration, status tracking, and threshold configuration through the web interface