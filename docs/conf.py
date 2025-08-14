# Configuration file for Sphinx

import os
import sys
from datetime import datetime

# Add your monorepo packages if needed
sys.path.insert(0, os.path.abspath("../"))

# -- Project information -----------------------------------------------------
project = "My Monorepo"
author = "Your Team"
copyright = f"{datetime.now().year}, {author}"
release = "0.1"

# -- General configuration ---------------------------------------------------
extensions = [
    "myst_parser",              # Allow Markdown
    "sphinx.ext.autodoc",        # Auto-generate API docs from Python docstrings
    "sphinx.ext.viewcode",       # Link to source code
    "sphinx.ext.napoleon",       # Google/NumPy docstring style
]

templates_path = ["_templates"]
exclude_patterns = []

# -- Options for HTML output -------------------------------------------------
html_theme = "furo"
html_static_path = ["_static"]
