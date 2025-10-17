"""
Root conftest.py for custom pytest plugins and fixtures.
"""
import subprocess
import sys
import pytest

def pytest_addoption(parser):
    """Add custom command line options."""
    parser.addoption(
        "--split-coverage",
        action="store_true",
        default=False,
        help="Run unit and integration tests separately with individual coverage reports"
    )

def pytest_cmdline_main(config):
    """Intercept pytest command line to handle split coverage."""
    if config.getoption("--split-coverage"):
        run_split_coverage()
        # Return non-zero to prevent normal pytest execution
        return 0

def run_split_coverage():
    """Run unit and integration tests with separate coverage reports."""
    print("\n" + "="*90)
    print("SEPARATE COVERAGE REPORTS FOR UNIT AND INTEGRATION TESTS")
    print("="*90)
    
    test_types = [
        ("UNIT", "unit"),
        ("INTEGRATION", "integration")
    ]
    
    results = {}
    
    for test_name, marker in test_types:
        print(f"\n{'='*90}")
        print(f"Running {test_name} Tests with Coverage")
        print(f"{'='*90}\n")
        
        cmd = [
            sys.executable, "-m", "pytest",
            "-m", marker,
            "--cov=services",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov_" + marker.lower(),
            "-v",
            "--tb=short"
        ]
        
        result = subprocess.run(cmd)
        results[test_name] = result.returncode
    
    # Summary
    print(f"\n{'='*90}")
    print("COVERAGE SUMMARY")
    print(f"{'='*90}")
    for test_name, exit_code in results.items():
        status = "✓ PASSED" if exit_code == 0 else "✗ FAILED"
        print(f"{test_name:15} tests: {status}")
    
    print(f"\nHTML Coverage Reports:")
    print(f"  - Unit tests:        htmlcov_unit/index.html")
    print(f"  - Integration tests: htmlcov_integration/index.html")
    print(f"{'='*90}\n")
    
    # Return non-zero if any tests failed
    if any(code != 0 for code in results.values()):
        sys.exit(1)

