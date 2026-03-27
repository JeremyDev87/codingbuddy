FROM python:3.12-slim

# Install Node.js (needed for project context scanning in hooks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Copy project files (context provided by CI)
COPY . .

# Install Python test dependencies
RUN pip install --no-cache-dir -r tests/e2e/plugin-hooks/requirements.txt

# Configure git for tests (conftest.py uses git init)
RUN git config --global user.name "CI Bot" \
    && git config --global user.email "ci@test.local" \
    && git config --global init.defaultBranch main

# Run E2E tests
CMD ["python3", "-m", "pytest", "tests/e2e/plugin-hooks/", "-v", "--timeout=30", "--tb=short"]
