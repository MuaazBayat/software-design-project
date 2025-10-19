## Web-App

This section maps our web application implementation to the assessment rubric criteria.

---

### Accessibility

**Documentation:**

- [Color Scheme - Accessibility Considerations](../design/color-scheme.md#accessibility-considerations)
- [User Stories - Accessibility Features](../product/userstories-userjournals.md#journey-7--accessibility-first-use-screen-reader)

**Implementation:**

- **Contrast Ratios**: All color combinations meet WCAG 2.1 Level AA standards (minimum 4.5:1 for normal text, 3:1 for large text and UI components)
- **Semantic HTML**: Component library (shadcn/ui) built on semantic HTML elements
- **ARIA Support**: Screen reader-friendly with ARIA labels, live regions, and keyboard navigation
- **Focus Indicators**: Visible focus rings on all interactive elements
- **Color Space**: OKLCH color system ensures perceptually uniform brightness for better accessibility

**Evidence:**

- [docs/design/color-scheme.md](../design/color-scheme.md) sections "Accessibility Considerations" and "Focus Indicators"
- [docs/product/userstories-userjournals.md](../product/userstories-userjournals.md) Journey 7 describes accessibility-first user experience

---

### Aesthetics

**Documentation:**

- [Color Scheme & Design System](../design/color-scheme.md)
- [Wireframes](../design/ui-ux/wireframes.md)
- [Mockups](../design/ui-ux/mockups.md)

**Design System:**

- **Framework**: shadcn/ui (New York style) with Tailwind CSS v4
- **Color Palette**: Warm, inviting colors (Amber, Rose, Orange) for cultural connection theme
- **Consistent Styling**: Design tokens and CSS custom properties ensure consistency
- **Typography**: Geist Sans and Geist Mono fonts with clear hierarchy
- **Border Radius System**: Consistent rounded corners across all components
- **Component Patterns**: Standardized cards, buttons, badges, and interactive states

**Evidence:**

- [docs/design/color-scheme.md](../design/color-scheme.md) comprehensive design system documentation
- [docs/design/ui-ux/mockups.md](../design/ui-ux/mockups.md) visual mockups showing consistent aesthetic
- [docs/testing/strategy.md](../testing/strategy.md) user feedback on design improvements

---

### User Experience

**Documentation:**

- [User Stories & User Journeys](../product/userstories-userjournals.md)
- [Testing Strategy - User Feedback](../testing/strategy.md#user-testing--feedback)

**UX Features:**

- **Error Handling**: Friendly inline validation, toast notifications, and recovery options
- **Session Persistence**: Clerk authentication maintains login state across tabs/sessions
- **Performance**: Fast load times with Next.js SSR and optimized bundles
- **Loading States**: Clear feedback during async operations
- **Undo Actions**: 120-second undo window for sent messages
- **User Feedback Integration**: Google Forms for beta testing, bug tracker integration

**Evidence:**

- [docs/product/userstories-userjournals.md](../product/userstories-userjournals.md) comprehensive user journeys covering all flows
- [docs/testing/strategy.md](../testing/strategy.md) user feedback collection and integration process
- Journey maps show error handling, recovery paths, and edge cases

---

### Deployment

**Documentation:**

- [Technology Stack - Deployment](../implementation/technologyStack.md#deployment--infrastructure)

**Deployment Details:**

- **Platform**: Google Cloud Run (serverless)
- **URL**: [https://globetalk-frontend-388957617777.us-central1.run.app](https://globetalk-frontend-388957617777.us-central1.run.app)
- **Containerization**: Docker for consistent environments
- **CI/CD**: GitHub Actions for automated deployment
- **SSL/HTTPS**: Automatic HTTPS on Cloud Run

**Evidence:**

- [docs/implementation/technologyStack.md](../implementation/technologyStack.md) section "Deployment & Infrastructure"
- Live deployment URL above

---

### Performance

**Documentation:**

- [Technology Stack - Frontend](../implementation/technologyStack.md#frontend)
- [Testing Strategy](../testing/strategy.md)

**Performance Optimizations:**

- **Next.js**: Server-side rendering and static generation for fast initial loads
- **Turbopack**: Next-generation bundler for faster builds and hot reload
- **Lazy Loading**: Components and routes loaded on demand
- **Image Optimization**: Next.js automatic image optimization
- **Client-Side Caching**: React Query for data fetching and caching
- **Input Responsiveness**: Real-time validation with debouncing

**Evidence:**

- [docs/implementation/technologyStack.md](../implementation/technologyStack.md) explains Next.js and Turbopack choices
- [docs/testing/strategy.md](../testing/strategy.md) integration tests verify responsive behavior

---

### Features

**Documentation:**

- [Features](../product/features.md)
- [User Stories](../product/userstories-userjournals.md)
- [API Endpoints](../design/api/endpoints.md)

**Core Features:**

- **Random Matchmaking**: Language and timezone-based matching with preferences
- **Asynchronous Messaging**: 12-hour delayed delivery to simulate postal mail
- **Cultural Profiles**: Anonymous profiles with age range, hobbies, interests, region
- **Safety & Moderation**: Content flagging, blocking, profanity detection
- **Match Types**: One-time letters or long-term correspondence
- **Preference Profiles**: Onboarding flow to learn user preferences
- **Message Styling**: Custom fonts and formatting for personalized letters

**Evidence:**

- [docs/product/features.md](../product/features.md) lists all implemented features
- [docs/product/userstories-userjournals.md](../product/userstories-userjournals.md) demonstrates feature usage in context
- [docs/design/api/endpoints.md](../design/api/endpoints.md) shows backend support for features

---

### Responsiveness

**Documentation:**

- [Technology Stack - Frontend](../implementation/technologyStack.md#frontend)
- [Wireframes](../design/ui-ux/wireframes.md)
- [Mockups](../design/ui-ux/mockups.md)

**Responsive Design:**

- **Mobile-First**: Tailwind CSS utility-first approach with mobile breakpoints
- **Breakpoints**: sm, md, lg, xl, 2xl for different screen sizes
- **Flexible Layouts**: Flexbox and Grid for adaptive layouts
- **Touch-Friendly**: Appropriate touch targets for mobile devices
- **Viewport Meta**: Proper viewport configuration for mobile browsers
- **Testing**: Responsive design tested across devices in wireframes/mockups

**Evidence:**

- [docs/design/ui-ux/wireframes.md](../design/ui-ux/wireframes.md) shows desktop and mobile wireframes
- [docs/design/ui-ux/mockups.md](../design/ui-ux/mockups.md) demonstrates responsive layouts
- [docs/implementation/technologyStack.md](../implementation/technologyStack.md) explains Tailwind CSS choice for responsiveness

---

### Structure

**Documentation:**

- [Wireframes](../design/ui-ux/wireframes.md)
- [User Journeys](../product/userstories-userjournals.md)

**Navigation Structure:**

- **Clear Hierarchy**: Landing � Sign In � Dashboard � Match/Messages
- **Sidebar Navigation**: Persistent navigation for key features
- **Intuitive Flow**: Onboarding guides new users through profile creation and first match
- **Breadcrumbs**: Clear indication of current location
- **First-Time User**: Guided journey from landing page to first message (see Journey 1)
- **Minimal Complexity**: Focus on core pen pal experience without feature bloat

**Evidence:**

- [docs/design/ui-ux/wireframes.md](../design/ui-ux/wireframes.md) shows complete navigation structure
- [docs/product/userstories-userjournals.md](../product/userstories-userjournals.md) Journey 1 demonstrates first-time user flow
- User feedback indicates intuitive structure and clear navigation