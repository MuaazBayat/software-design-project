# Stakeholder Reviews Sprint 2

## Meeting 1 – Aug 23, 2025

### Summary
Mohammed Bangie’s presentation sought clarification on sprint requirements and automated testing, with Tapiwa Mazarura providing detailed responses on core features, bug allowances, and the importance of various testing types, especially for APIs. The team also discussed stakeholder meeting frequency, user feedback mechanisms, and the need for comprehensive documentation.  

Key talking points included:  
- Number of core features  
- Automated testing  
- Stakeholder meetings  
- API usage  
- User feedback  
- Project methodology  
- Documentation  

### Details
- **Sprint Requirements and Core Features**  
  Mohammed Bangie asked about the number of features to implement and bug allowances. Tapiwa clarified that at least one complete core feature is required, more can be implemented, and at most one non-severe bug is allowed. All features from the wireframes must be implemented.  

- **Automated Testing**  
  Questions were raised about UI and API testing. Tapiwa emphasized unit tests, with integration tests being most challenging, especially for APIs in Docker. Tests must check JSON responses and UI rendering, including type matching.  

- **Stakeholder Meetings and API Usage**  
  Meetings must occur at least once a week, aiming for three total. Meetings will involve demos and feedback. The team discussed external API usage and rate limits; Muaaz suggested implementing rate limits at the API level.  

- **User Feedback, Project Methodology, and Documentation**  
  The team agreed to use Google Forms for feedback. Documentation must cover meetings, bug tracking, databases, third-party code, authentication, and automated testing. Tapiwa emphasized documenting proof of bug fixes.  

- **Sprint 3 and 4 Focus**  
  Sprint 3 will polish the application, Sprint 4 will focus on presentations and final documentation.  

### Suggested Next Steps
- Tapiwa to double-check rubric on core features and bug allowance, and recommend bug tracking software.  
- Mohammed Bangie to schedule two more stakeholder meetings and update Sufyaan and Muhammad Hoosen.  
- Muaaz to send transcripts to Mohammed Bangie.  
- Team to identify core features and test while coding.  
- Team to consider limiting database requests.  

---

## Meeting 2 – Aug 26, 2025

### Summary
Arno Strauss and Muaaz Bayat presented updated wireframes. Tapiwa appreciated the design but noted inconsistencies and inquired about the matching algorithm. Discussions also covered rejection limits, fallback plans for APIs, and backend architecture. Mohammed Bangie advocated for microservices, which Tapiwa supported. The use of external libraries for moderation was also raised.  

### Details
- **Wireframes and UI Design**  
  Updated wireframes included landing page, Tinder-like matching, inbox, compose letter, and cultural explorer. Tapiwa appreciated the design and suggested a dark mode.  

- **Pen Pal Matching Algorithm**  
  Muaaz explained that recommendations are based on user data and improve with feedback. The team discussed endless swiping and ensuring continuous matches.  

- **Rejection Limit and Data Utility**  
  Tapiwa warned about continuous rejections reducing data value. Solutions included hard limits or forced matches. Forced matches should remain algorithm-based.  

- **UI Uniformity and Onboarding**  
  Tapiwa noted inconsistencies in headers/nav bars. Team confirmed styling not finalized. Onboarding is a one-time process to train the algorithm.  

- **Cultural Explorer Feature**  
  Designed to promote cultural learning with quizzes from an external API. Tapiwa advised a fallback plan in case the API fails.  

- **Microservices vs Monolithic Backend**  
  Mohammed and Muaaz advocated for microservices. Tapiwa strongly advised against reverting to monolith, supporting their current architecture.  

- **Use of External Libraries**  
  Allowed in principle, but Tapiwa will confirm with Brandon. Libraries will aid moderation API with regex-based profanity detection.  

### Suggested Next Steps
- Tapiwa to confirm external library usage with Brandon.  
- Next meeting scheduled for Saturday at 4:00 PM (final stakeholder meeting).  

---

## Meeting 3 – Aug 30, 2025

### Summary
The team presented Cultural Explorer, preference profile, matchmaking API, and messaging feature. Tapiwa provided feedback on UI cohesion, testing methodologies, and documentation. Sprint 1 feedback points were revisited, including version control and implementation. The team also clarified user feedback strategies.  

### Details
- **Meeting Goals and UI Cohesion**  
  Team showcased UI/backend progress. Concern raised about inconsistent design; Tapiwa confirmed cohesive design is required.  

- **Cultural Explorer Feature**  
  Muaaz presented functionality; Tapiwa suggested using flag colors in cards (bonus feature).  

- **Preference Profile and Matchmaking API**  
  Rameez demoed preference profiles and matchmaking options. Forced input for profiles will be enforced at sign-up.  

- **Messaging Feature and Text Editor**  
  Arno showcased text editor with formatting and prompts. Tapiwa praised the work.  

- **Readability Rating and UI/Backend Connection**  
  Arno explained readability ratings. Mohammed described backend APIs for search and pagination.  

- **Backend Testing and Coverage**  
  Tapiwa advised 50% test coverage for current sprint, aiming for 80% in later sprints.  

- **Testing Methodologies and Mocking**  
  Unit vs integration testing clarified. Mocking database acceptable but must be reliable.  

- **UI Testing and API Security**  
  UI testing includes rendering and interactions. API security not expected to include JWTs yet.  

- **User Feedback and Bug Tracking**  
  Internal bugs tracked in GitHub issues; external feedback via Google Forms. External testing requires at least two outside users.  

- **Third-Party Code Documentation**  
  Major features require detailed documentation; minor features can have brief notes.  

- **Sprint Progress and Hidden Requirements**  
  Team on track. Hidden requirements should be implemented by Sprint 4.  

- **Sprint 1 Feedback**  
  - **Version Control**: Low marks due to no branching strategy and no main branch protection.  
  - **Developer Guides/Git Methodology**: Mostly done; Git methodology overlaps with branching.  
  - **Project Management**: Tapiwa unsure why marks were low, will investigate.  
  - **Implementation**: Questions on UI completeness and authentication expectations.  

- **Sprint 2 and Project Polish**  
  Team must ensure at least 50% code coverage and consistent design.  

### Suggested Next Steps
- Arno: Add readability rating info, update “new letter” button, add templates.  
- Muaaz: Integrate quiz API with Cultural Explorer.  
- Rameez: Fix matchmaking page color scheme.  
- Mohammed Bangie: Investigate mocked DB reliability, explore end-to-end testing DB.  
- Team: Use Google Form for external feedback.  
- Tapiwa: Investigate project management mark, confirm Sprint 1 rubric details.  

