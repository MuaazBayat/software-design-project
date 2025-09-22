# Testing Strategy & Documentation

This document outlines our comprehensive testing strategy for the **Virtual Pen Pals** project. It covers current automated testing practices, plans for future integration tests, and our process for gathering and acting on user feedback.

---

## 1. Automated Testing

We use automated testing to ensure the quality and reliability of both our frontend and backend microservices. Our current focus is on **unit testing** to validate individual components and functions.

### 1.1 Tools & Frameworks

* **Frontend — Jest**: Unit tests for React components, functions, and helper modules in isolation.
* **Backend — pytest**: Tests for Python-based microservices and API logic with a simple, scalable style.

### 1.2 Unit Test Plan

Our unit test plan focuses on isolated testing of the smallest units of code.

#### Frontend Unit Tests

* **Component rendering**: Verify that components render correctly without errors.
* **Prop handling**: Ensure components correctly handle and display data passed via props.
* **State management**: Test that local state and state updates function as expected.
* **Helper functions**: Validate the logic of all utility and helper functions.

#### Backend Unit Tests

* **Function logic**: Confirm that individual functions return correct outputs for given inputs.
* **Database interactions (mocked)**: Verify that functions interacting with the database perform the correct queries, using mocked data to avoid reliance on a live database.

---

## 2. Integration Test Plan (Future)

Our next step is to implement a robust integration test plan. These tests will verify that different parts of the application work together correctly as a cohesive system.

* **UI → API integration**: Confirm that user actions on the frontend (e.g., clicking a **Send Message** button) trigger the corresponding API endpoint and that the UI updates based on the API response.
* **Microservice communication**: Ensure the Matchmaking API successfully communicates with the Messaging API to create a new thread.
* **End-to-end user flows**: Simulate real-world scenarios, such as a user registering, finding a pen pal, sending a message, and receiving a reply.

---

## 3. User Testing & Feedback

We maintain a formal user testing process to gather qualitative feedback on usability and to identify potential bugs.

### 3.1 Feedback Collection Process

* **Survey distribution**: A Google Form is shared with a group of beta testers.
https://docs.google.com/forms/d/10cfDYyo5fgt6F06BS2fH5IMsm67-RdC_Ie5k8KEF6nQ/edit?ts=68b5e3ed
* **Guided usage**: Testers are instructed to use the application and explore its features.
* **Bug reporting**: The Google Form allows users to submit bugs to our GitHub Projects bug tracker.
* **Backlog integration**: We regularly review the bug tracker and add reported issues to the backlog for prioritization and resolution.

### 3.2 Feedback Integration

We have begun integrating user feedback. User‑reported bugs from our GitHub Projects board have been added to the sprint backlog and will be addressed in upcoming sprints, demonstrating our commitment to continuous improvement.

### 3.3 Evidence
* **Beta tester submitted bug that is already closed**
    https://github.com/MuaazBayat/software-design-project/issues/100
    ![MockUps](images/Screenshot%20(9).png)
* **Before user feedback integration**
    ![MockUps](images/484002736-b26f099f-3adc-4b68-8a56-f7fb6deb6170.jpg)
* **After user feedback integration**
    ![MockUps](images/1000172192.jpg)
---
