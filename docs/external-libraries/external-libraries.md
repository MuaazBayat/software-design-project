# External Libraries & Dependencies

This document provides a comprehensive overview of all external libraries and dependencies used across the GlobeTalk project, organized by service and functionality.

## Frontend Service (Next.js/React)

### Core Framework & Runtime
- **Next.js** (15.2.4): Full-stack React framework with app router, server-side rendering, and API routes
- **React** (19.0.0): Core UI library for building component-based interfaces
- **React DOM** (19.0.0): DOM-specific methods for React components
- **TypeScript** (^5): Type-safe JavaScript superset for enhanced development experience

### Authentication & Security
- **@clerk/nextjs** (^6.31.1): Complete authentication solution with user management, sign-in/sign-up flows
- **@supabase/supabase-js** (^2.56.1): Client library for Supabase backend-as-a-service integration

### UI Components & Styling
- **@radix-ui/react-*** (various): Unstyled, accessible UI primitives
  - `react-accordion`, `react-alert-dialog`, `react-avatar`, `react-checkbox`
  - `react-dialog`, `react-dropdown-menu`, `react-popover`, `react-select`
  - `react-tabs`, `react-tooltip`, and many others
- **Tailwind CSS** (^4): Utility-first CSS framework for rapid UI development
- **@tailwindcss/postcss** (^4): PostCSS integration for Tailwind
- **tailwind-merge** (^3.3.1): Utility for merging Tailwind classes
- **class-variance-authority** (^0.7.1): Type-safe variant API for component styling
- **clsx** (^2.1.1): Utility for constructing className strings conditionally
- **next-themes** (^0.4.6): Theme switching for Next.js applications

### Form Handling & Validation
- **react-hook-form** (^7.62.0): Performant forms with easy validation
- **@hookform/resolvers** (^5.2.1): Validation resolvers for react-hook-form
- **zod** (^4.0.17): TypeScript-first schema validation library

### Data Visualization & Charts
- **recharts** (^2.15.4): React chart library built on D3
- **d3-*** libraries: Various D3 modules for data manipulation and visualization
- **cobe** (^0.6.4): WebGL globe visualization library

### UI Enhancement Libraries
- **motion** (^12.23.12): Motion library for React animations
- **embla-carousel-react** (^8.6.0): Carousel component library
- **react-day-picker** (^9.8.1): Date picker component
- **react-resizable-panels** (^3.0.4): Resizable panel layouts
- **sonner** (^2.0.7): Toast notification library
- **vaul** (^1.1.2): Drawer component for mobile interfaces
- **input-otp** (^1.4.2): One-time password input component
- **cmdk** (^1.1.1): Command palette component

### Internationalization & Localization
- **flag-icons** (^7.5.0): Country flag icon library
- **i18n-iso-countries** (^7.14.0): Country name translations and ISO codes
- **react-country-flag** (^3.1.0): Country flag components
- **world-countries** (^5.1.0): Comprehensive country data

### Date & Time Handling
- **date-fns** (^4.1.0): Modern JavaScript date utility library

### Utility Libraries
- **lucide-react** (^0.539.0): Beautiful & consistent icon toolkit

### Development & Testing Dependencies
- **ESLint** (^9): JavaScript/TypeScript linting
- **eslint-config-next** (15.2.4): Next.js ESLint configuration
- **@eslint/eslintrc** (^3): ESLint configuration utilities
- **Jest** (^30.1.1): JavaScript testing framework
- **@testing-library/react** (^16.3.0): React testing utilities
- **@testing-library/jest-dom** (^6.8.0): Custom Jest matchers
- **@testing-library/user-event** (^14.6.1): User interaction testing
- **jest-environment-jsdom** (^30.1.1): JSDOM environment for Jest
- **tw-animate-css** (^1.3.6): Animation utilities for Tailwind

### Type Definitions
- **@types/node** (^20): Node.js type definitions
- **@types/react** (^19): React type definitions
- **@types/react-dom** (^19): React DOM type definitions

## Backend Services (Python/FastAPI)

### Core Framework & ASGI Server
- **FastAPI** (0.116.1): Modern, fast web framework for building APIs with Python
- **Uvicorn** (0.35.0): ASGI server implementation for Python web applications
- **Starlette** (0.47.3): Lightweight ASGI framework (FastAPI dependency)
- **Python-multipart** (0.0.20): Streaming multipart parser for Python

### Database & ORM
- **Supabase** (2.18.1): Python client for Supabase backend-as-a-service
  - **postgrest** (1.1.1): PostgreSQL REST API client
  - **storage3** (0.12.1): Supabase Storage client
  - **supabase_auth** (2.12.3): Supabase authentication client
  - **supabase_functions** (0.10.1): Supabase Edge Functions client
  - **realtime** (2.7.0): Supabase Realtime client

### Data Validation & Serialization
- **Pydantic** (2.11.7): Data validation using Python type hints
- **pydantic_core** (2.33.2): Core functionality for Pydantic
- **annotated-types** (0.7.0): Reusable constraint types for Pydantic

### HTTP & Networking
- **httpx** (0.28.1): Modern HTTP client for Python
- **httpcore** (1.0.9): HTTP/1.1 and HTTP/2 implementation
- **h11** (0.16.0): Pure-Python HTTP/1.1 protocol implementation
- **h2** (4.3.0): HTTP/2 protocol implementation
- **hpack** (4.1.0): HTTP/2 header compression
- **hyperframe** (6.1.0): HTTP/2 framing layer
- **anyio** (4.10.0): Asynchronous compatibility layer
- **websockets** (15.0.1): WebSocket implementation

### Authentication & Security
- **PyJWT** (2.10.1): JSON Web Token implementation
- **bcrypt** (4.3.0): Password hashing library (Core service only)
- **passlib** (1.7.4): Password hashing utilities (Core service only)

### Content Moderation
- **better-profanity** (0.7.0): Profanity filtering library (Messaging & Moderation services)

### Configuration & Environment
- **python-dotenv** (1.1.1): Load environment variables from .env files
- **click** (8.2.1): Command line interface creation toolkit

### Date & Time Handling
- **python-dateutil** (2.9.0.post0): Extensions to Python datetime module

### Development & CLI Tools (Messaging Service)
- **FastAPI-CLI** (0.0.8): Command line interface for FastAPI
- **fastapi-cloud-cli** (0.1.5): Cloud deployment CLI for FastAPI
- **typer** (0.16.1): Modern CLI framework based on Python type hints
- **rich** (14.1.0): Rich text and beautiful formatting
- **rich-toolkit** (0.15.0): Additional utilities for Rich
- **Jinja2** (3.1.6): Template engine
- **markdown-it-py** (4.0.0): Markdown parser
- **Pygments** (2.19.2): Syntax highlighting
- **shellingham** (1.5.4): Tool to detect shell
- **watchfiles** (1.1.0): File watching utility
- **uvloop** (0.21.0): Fast event loop for asyncio (Unix only)

### Error Monitoring
- **sentry-sdk** (2.35.1): Error tracking and performance monitoring (Messaging service)

### Email Validation
- **email-validator** (2.3.0): Email validation library (Messaging service)
- **dnspython** (2.7.0): DNS toolkit (email validation dependency)

### Utility Libraries
- **six** (1.17.0): Python 2/3 compatibility utilities
- **idna** (3.10): Internationalized Domain Names in Applications
- **certifi** (2025.8.3): Mozilla's CA Bundle
- **sniffio** (1.3.1): Sniff out which async library is in use
- **typing_extensions** (4.15.0): Backported type hints
- **typing-inspection** (0.4.1): Runtime inspection utilities
- **packaging** (25.0): Core utilities for Python packages
- **deprecation** (2.1.0): Library for deprecating features
- **StrEnum** (0.4.15): String enumeration support
- **urllib3** (2.5.0): HTTP library with connection pooling
- **PyYAML** (6.0.2): YAML parser and emitter
- **MarkupSafe** (3.0.2): Safe string handling for templates
- **mdurl** (0.1.2): Markdown URL utilities
- **rignore** (0.6.4): Gitignore-style pattern matching

## Service-Specific Dependencies

### Core Service
The Core service handles user profiles and core API functionality. It includes additional security libraries:
- **bcrypt**: For secure password hashing
- **passlib**: For password validation and utilities

### Matchmaking Service
The Matchmaking service uses the standard FastAPI stack for connecting users based on preferences and compatibility.

### Messaging Service
The Messaging service includes the most comprehensive set of dependencies:
- **better-profanity**: For content filtering
- **email-validator**: For email validation
- **sentry-sdk**: For error monitoring and performance tracking
- **FastAPI-CLI**: For command-line operations
- **rich**: For enhanced terminal output

### Moderation Service
The Moderation service focuses on content safety:
- **better-profanity**: For automated profanity detection and filtering

## Development Philosophy

### Frontend
- **Type Safety**: Heavy use of TypeScript and Zod for runtime validation
- **Accessibility**: Radix UI components ensure WCAG compliance
- **Performance**: Next.js app router for optimal loading and SEO
- **Developer Experience**: Comprehensive linting, testing, and development tools

### Backend
- **Async-First**: All services built on FastAPI's async foundation
- **Type Validation**: Pydantic models for request/response validation
- **Modern Python**: Leveraging Python 3.11+ features and type hints
- **Scalability**: Microservice architecture with independent deployments

### Common Patterns
- **Environment Configuration**: All services use python-dotenv/.env files
- **Database**: Unified Supabase integration across all services
- **Authentication**: JWT-based auth with Clerk (frontend) and PyJWT (backend)
- **Testing**: Jest (frontend) and pytest (backend) for comprehensive test coverage
- **Documentation**: Comprehensive docs using Sphinx and Markdown

## Major External Libraries & Rationale

### React (19.0.0)
**Why we chose React:**
- Industry-standard component-based architecture perfect for our complex UI needs
- Excellent ecosystem with extensive third-party libraries
- Strong TypeScript support for type-safe development
- Large community and extensive documentation
- React 19's new features improve performance and developer experience

### Next.js (15.2.4)
**Why we chose Next.js:**
- Full-stack React framework that eliminates the need for separate backend routing
- App Router provides excellent SEO and performance with server-side rendering
- Built-in API routes perfect for our microservice communication
- Automatic code splitting and optimization
- Excellent development experience with hot reloading and TypeScript support
- Seamless deployment to Vercel or other platforms

### Shadcn/UI (via Radix UI Components)
**Why we chose Shadcn/UI:**
- Copy-paste component library built on Radix UI primitives
- Fully accessible components (WCAG compliant) crucial for global reach
- Completely customizable with Tailwind CSS
- No runtime bundle size impact - components are copied into our codebase
- Modern, beautiful design system that matches our brand vision
- TypeScript-first approach with excellent type safety

### Tailwind CSS (v4)
**Why we chose Tailwind:**
- Utility-first approach enables rapid prototyping and consistent design
- Excellent responsive design capabilities for mobile-first development
- Small bundle size through automatic purging of unused styles
- Easy to maintain consistent spacing, colors, and typography
- v4 brings performance improvements and better developer experience

### Supabase (2.18.1)
**Why we chose Supabase:**
- Complete Backend-as-a-Service that eliminates infrastructure management
- Built-in authentication integrates seamlessly with Clerk
- PostgreSQL database with automatic API generation
- Real-time subscriptions perfect for live messaging features
- File storage for user avatars and cultural content
- Edge functions for serverless compute when needed
- Generous free tier suitable for development and initial deployment

### FastAPI (0.116.1)
**Why we chose FastAPI:**
- Modern Python framework with automatic API documentation (OpenAPI/Swagger)
- Excellent async support crucial for handling concurrent pen pal connections
- Built-in request/response validation using Pydantic
- Superior performance compared to Flask/Django for API-focused services
- Native TypeScript client generation from Python type hints
- Perfect fit for microservice architecture with clean separation of concerns

### Clerk Authentication
**Why we chose Clerk:**
- Complete authentication solution that handles user management complexity
- Multiple sign-in options (email, social providers) for global accessibility
- Built-in user profiles and metadata storage
- Excellent Next.js integration with minimal setup
- Handles security best practices (password hashing, session management)
- Scales from development to production without configuration changes

### Pydantic (2.11.7)
**Why we chose Pydantic:**
- Runtime data validation ensures API reliability
- Automatic conversion between Python types and JSON
- Excellent error messages help with debugging
- Seamless integration with FastAPI for automatic documentation
- Type hints improve code maintainability and IDE support

### TypeScript
**Why we chose TypeScript:**
- Catches bugs at compile time rather than runtime
- Excellent IDE support with autocomplete and refactoring
- Self-documenting code through type definitions
- Easier refactoring as the codebase grows
- Industry standard for modern React development
- Reduces onboarding time for new team members

### Zod (4.0.17)
**Why we chose Zod:**
- Runtime schema validation for form data and API responses
- TypeScript-first with automatic type inference
- Excellent integration with React Hook Form
- Clear error messages for user feedback
- Composable schemas that scale with application complexity