# **Simple Guide to Testing with Pytest**

This document outlines our simple and effective strategy for writing and running automated tests using pytest. Following these steps will ensure our tests are organized, easy to write, and maintainable.

### **1\. 🖥️ Create a Virtual Environment (venv)**

Before installing anything, we should create a virtual environment. This creates an isolated space for our project's dependencies, preventing conflicts with other projects.  
Step A: Create the environment  
Run this command in your project's root directory. This will create a new folder named .venv.  
python \-m venv .venv

Step B: Activate the environment  
You must activate the environment every time you work on the project.

* **On Windows:**  
  .venv\\Scripts\\activate

* **On macOS and Linux:**  
  source .venv/bin/activate

You'll know it's active when you see (.venv) at the beginning of your terminal prompt.

### **2\. 🚀 Setup & Installation**

With your virtual environment active, you can now install pytest and other testing tools. If the project has a requirements.txt file, you can install everything at once.  
**Option A: Install all project requirements**  
pip install \-r requirements.txt

**Option B: Install pytest manually**  
pip install pytest

### **3\. 📂 Project Folder Structure**

To keep our tests organized and separate from our application code, we will use a dedicated tests directory that mirrors the services directory structure.  
**Crucially**, we must add empty \_\_init\_\_.py files to our directories. These files tell Python to treat the directories as "packages," which is what allows our import system to work correctly.  
your-project-root/  
├── .venv/                      \# \<-- Your virtual environment folder  
├── services/  
│   ├── \_\_init\_\_.py             \# \<-- Makes 'services' a package  
│   ├── core/  
│   │   ├── \_\_init\_\_.py         \# \<-- Makes 'core' a sub-package  
│   │   └── some\_core\_logic.py  
│   └── matchmaking/  
│       ├── \_\_init\_\_.py  
│       └── some\_matchmaking\_logic.py  
│  
└── tests/  
    ├── \_\_init\_\_.py             \# \<-- Makes 'tests' a package  
    ├── core/  
    │   ├── \_\_init\_\_.py  
    │   └── test\_core\_logic.py  \# \<-- Test file for core logic  
    └── matchmaking/  
        ├── \_\_init\_\_.py  
        └── test\_matchmaking\_logic.py

### **4\. ✍️ Writing Your First Test**

Tests are easy to write. Just follow these two rules:

1. Test filenames must start with test\_.  
2. Test function names must start with test\_.

**Example:**  
Let's say we have a simple function in services/core/some\_core\_logic.py:  
\# services/core/some\_core\_logic.py

def add(a, b):  
    """A simple function that adds two numbers."""  
    return a \+ b

Now, we write a test for it in tests/core/test\_core\_logic.py:  
\# tests/core/test\_core\_logic.py

\# Import the function we want to test  
from services.core.some\_core\_logic import add

def test\_add\_positive\_numbers():  
    """  
    Tests if the add function works with positive numbers.  
    """  
    \# 'assert' checks if a condition is true. If not, the test fails.  
    assert add(2, 3\) \== 5

def test\_add\_negative\_numbers():  
    """  
    Tests the add function with negative numbers.  
    """  
    assert add(-5, \-5) \== \-10

### **5\. 💡 Understanding Imports in Tests**

How you import your code is important. We will primarily use **absolute imports**.  
An **absolute import** is the full path to the function starting from the project root. It's clear and unambiguous.  
\# This is an ABSOLUTE import  
from services.core.some\_core\_logic import add

Sometimes, within the application code itself, you might see a **relative import**, which uses a dot (.). The dot simply means "from the same directory."  
**Example of a relative import in services/core/main.py:**  
\# in: services/core/main.py

\# This means "from the 'utils' file in this same 'core' folder"  
from .utils import helper\_function

**For our tests, we should always prefer absolute imports** because we run them from the root directory, which makes the services package visible everywhere.

### **6\. ▶️ How to Run Tests**

Running the tests is the easiest part.

1. Open your terminal.  
2. Make sure your **virtual environment is active**.  
3. Navigate to the **project's root directory**.  
4. Run the following command:

pytest  
\`\`\`pytest\` will automatically find and run all the tests in the \`tests\` directory and give you a clear report of what passed and what failed.

\---

\#\#\# 7\. 📊 Measuring Test Coverage (Advanced)

Test coverage tells us what percentage of our code is being exercised by our tests. We can measure this using the \`pytest-cov\` plugin.

\*\*Step A: Install \`pytest-cov\`\*\*  
\`\`\`bash  
pip install pytest-cov

Step B: Run tests with a coverage report  
To see a simple report in your terminal, run pytest with the \--cov flag. You should specify which directory to measure (in our case, services).  
pytest \--cov=services

Step C: Generate a detailed HTML report (Recommended)  
This is the most useful feature. It creates an interactive web page showing exactly which lines of code were and were not covered by tests.  
pytest \--cov=services \--cov-report=html

After this command finishes, a new htmlcov directory will be created. Open the index.html file inside it to explore the detailed report.