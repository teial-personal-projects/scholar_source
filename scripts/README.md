# Scripts Directory

Utility scripts for ScholarSource development and testing.

## Available Scripts

### `test.py` - Unified Test Script

Comprehensive testing script with command-line options for various test scenarios.

**Usage:**
```bash
# Show help
python scripts/test.py --help

# Run all tests
python scripts/test.py --all

# Run specific tests
python scripts/test.py --setup           # Environment & file structure
python scripts/test.py --celery          # Celery configuration
python scripts/test.py --redis           # Redis connection
python scripts/test.py --refactored      # Refactored crew runner
python scripts/test.py --imports         # Module imports
python scripts/test.py --queue           # Task queue configuration

# Combine multiple tests
python scripts/test.py --setup --redis --celery
```

**Tests Available:**
- `--all` - Run all tests (unit/config tests only, no API integration)
- `--setup` - Test environment variables and file structure
- `--imports` - Test that all required modules can be imported
- `--celery` - Test Celery app configuration
- `--redis` - Test Redis connection (ping, set/get)
- `--queue` - Test task queue configuration (queues, routing, worker settings)
- `--refactored` - Test refactored crew runner functions
- `--api` - Test API rate limiting (requires running server on port 8000)

### `start_worker.sh` - Start Celery Worker

Starts a Celery worker for local development.

**Usage:**
```bash
./scripts/start_worker.sh
```

**What it does:**
1. Loads environment variables from `.env`
2. Activates virtual environment (if exists)
3. Checks Redis connection
4. Starts Celery worker with 2 concurrent workers
5. Processes tasks from `crew_jobs` and `default` queues

**Configuration:**
- Queues: `crew_jobs`, `default`
- Concurrency: 2 workers
- Log level: info

### `verify_setup.sh` - Verify Setup

Comprehensive setup verification script that checks all system components.

**Usage:**
```bash
./scripts/verify_setup.sh
```

**What it checks:**
1. `.env` file exists and loads
2. Virtual environment exists
3. Required environment variables are set
4. Python dependencies are installed
5. Celery configuration is valid
6. Redis connection works
7. Required files exist

**Exit codes:**
- `0` - All checks passed
- `1` - One or more checks failed

## Other Scripts

### `test_crew.py` - Manual Crew Execution Test

Standalone script for manually testing CrewAI execution with verbose output. Useful for debugging crew issues.

**Usage:**
```bash
python scripts/test_crew.py
```

This script runs a sample crew execution and displays verbose output. Use this when you need to debug crew behavior or agent interactions.

**Note:** For automated testing, use `python scripts/test.py --all` instead.

## Quick Start

**Verify everything is set up:**
```bash
./scripts/verify_setup.sh
```

**Run tests before starting development:**
```bash
python scripts/test.py --all
```

**Start the worker for development:**
```bash
./scripts/start_worker.sh
```
