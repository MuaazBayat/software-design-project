# **Simple Guide to Frontend Testing with Jest**

This document explains how to write and run tests for our Next.js frontend using Jest and React Testing Library.

### **1\. ⚙️ Initial Setup**

Before you can run any tests, you need to make sure all the project dependencies are installed.  
Navigate to the services/frontend directory in your terminal and run:  
npm install

This command reads the package.json file and installs all the necessary libraries, including Jest, React Testing Library, and their configurations.

### **2\. ✍️ How to Write a Test**

We place all test files in a top-level \_\_tests\_\_ directory. Test files should always end with .test.js or .test.tsx.

#### **Mocking Components (Important\!)**

Sometimes, a component is too complex or relies on browser features that don't work in a test environment (like the \<Globe /\> component, which uses WebGL). In these cases, we **mock** the component. Mocking replaces the real component with a simple placeholder for our tests.  
**Example: Testing the Home Page with a Mocked Globe**  
Here is how we test our home page. Notice how jest.mock() is used at the top of the file to replace the real Globe with a simple div.  
// in: \_\_tests\_\_/HomePage.test.js

import { render, screen } from '@testing-library/react';  
import Home from '@/app/page';

// This line tells Jest: "When a file tries to import the Globe component,  
// give it this fake version instead of the real one."  
jest.mock('@/components/globe', () \=\> ({  
  Globe: () \=\> \<div data-testid="mock-globe" /\>,  
}));

describe('HomePage', () \=\> {  
  it('should render the mocked Globe component', () \=\> {  
    // 1\. Render the Home component  
    render(\<Home /\>);

    // 2\. Find the placeholder from our mock, not the real component  
    const mockGlobe \= screen.getByTestId('mock-globe');

    // 3\. Assert that our mock placeholder is in the document  
    expect(mockGlobe).toBeInTheDocument();  
  });  
});

### **3\. ▶️ How to Run Tests**

We have scripts in our package.json to make running tests easy.  
**To run all tests once:**  
npm run test

To run tests in "watch mode":  
This is very useful during development. It automatically re-runs the tests whenever you save a file.  
npm run test:watch

### **4\. 📊 How to Check Test Coverage**

Test coverage shows us what percentage of our code is being checked by our tests. It's a great way to see what parts of the application still need tests.  
**To run a coverage report:**  
npm run test:coverage

After running this command, you will see a summary table in your terminal. For a more detailed view, a coverage folder is created. Open the coverage/lcov-report/index.html file in your browser to see an interactive report showing exactly which lines of code were missed.  
**Note:** Our configuration is set up to show coverage for **all files** in the app, components, and hooks directories, even if they don't have any tests yet. This gives us a complete picture of our project's test health.