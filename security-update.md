# Security Update Checklist

Use this checklist on the `fix-security-issues` branch. Keep every change on this
branch until the dependency audits and test suites pass, then merge through
`dev` to `main`.

## 1. Confirm the Working Branch

- [X] 1.1. Switch to the security branch.

  ```bash
  git switch fix-security-issues
  ```

- [x] 1.2. Confirm the working tree is clean and the branch tracks its remote.

  ```bash
  git status --short --branch
  ```

- [x] 1.3. Confirm the security branch starts from the current `dev` commit. The
  expected output is `0 0`.

  ```bash
  git rev-list --left-right --count dev...fix-security-issues
  ```

## 2. Configure Dependabot

- [x] 2.1. Verify `.github/dependabot.yaml` contains the following configuration.

  ```yaml
  version: 2

  updates:
    - package-ecosystem: "uv"
      directory: "/"
      schedule:
        interval: "weekly"
        day: "monday"
      open-pull-requests-limit: 5

    - package-ecosystem: "npm"
      directory: "/web"
      schedule:
        interval: "weekly"
        day: "monday"
      open-pull-requests-limit: 5

    - package-ecosystem: "github-actions"
      directory: "/"
      schedule:
        interval: "weekly"
        day: "monday"
      open-pull-requests-limit: 5
  ```

- [ ] 2.2. Do not add `target-branch`. Dependabot security-update pull requests must
  target the repository's default branch, `main`.

- [ ] 2.3. Commit and push the Dependabot configuration.

  ```bash
  git add .github/dependabot.yaml
  git commit -m "Configure Dependabot updates"
  git push
  ```

- [ ] 2.4. In GitHub, open **Settings → Security and quality → Advanced Security**.

- [ ] 2.5. Enable the dependency graph.

- [ ] 2.6. Enable Dependabot alerts.

- [ ] 2.7. Enable Dependabot security updates.

- [ ] 2.8. Enable grouped security updates if grouped pull requests are desired.

- [ ] 2.9. Enable automatic dependency submission if it is available for the
  repository.

## 3. Record the Dependency Audit Baseline

- [ ] 3.1. Install the exact frontend dependencies from the committed lockfile.

  ```bash
  cd web
  npm ci
  ```

- [ ] 3.2. Run and record the frontend audit.

  ```bash
  npm audit
  cd ..
  ```

- [ ] 3.3. Synchronize the Python environment from `uv.lock`.

  ```bash
  uv sync
  ```

- [ ] 3.4. Run and record the Python dependency audit.

  ```bash
  uv run --with pip-audit pip-audit
  ```

- [ ] 3.5. Compare the local results with the open alerts under **Security →
  Dependabot alerts** on GitHub. Record any alert that is missing locally or
  refers to a different manifest.

## 4. Resolve Frontend Vulnerabilities

- [ ] 4.1. Apply non-breaking updates allowed by the existing npm version ranges.

  ```bash
  cd web
  npm audit fix
  ```

- [ ] 4.2. Do not run `npm audit fix --force`. Review major-version upgrades
  individually instead.

- [ ] 4.3. Run the audit again.

  ```bash
  npm audit
  ```

- [ ] 4.4. If necessary, update the directly affected development dependencies to
  patched versions.

  ```bash
  npm install --save-dev vitest@^4.1.11 @vitest/ui@^4.1.11 postcss@^8.5.23
  ```

- [ ] 4.5. Use `npm explain <package-name>` to identify the parent of every remaining
  vulnerable transitive dependency.

- [ ] 4.6. Confirm the frontend audit reports zero unresolved vulnerabilities, or
  document each upstream advisory that currently has no fix.

- [ ] 4.7. Run the frontend validation suite.

  ```bash
  npm run lint
  npm run test:run
  npm run build
  cd ..
  ```

- [ ] 4.8. Commit the frontend dependency changes.

  ```bash
  git add web/package.json web/package-lock.json
  git commit -m "Resolve frontend dependency vulnerabilities"
  ```

## 5. Resolve Direct Python Dependency Vulnerabilities

- [ ] 5.1. Update the following direct dependencies consistently in both
  `pyproject.toml` and `requirements.txt`:

  - `aiohttp` to at least `3.14.3`
  - `cryptography` to at least `50.0.0`
  - `pillow` to at least `12.3.0`
  - `pyasn1` to at least `0.6.4`
  - `pypdf` to at least `6.16.1` while remaining below `7.0.0`
  - `python-multipart` to at least `0.0.31`

- [ ] 5.2. Regenerate and install the Python lockfile.

  ```bash
  uv lock
  uv sync
  ```

- [ ] 5.3. Run the complete Python test suite.

  ```bash
  uv run pytest
  ```

- [ ] 5.4. Run the Python dependency audit again.

  ```bash
  uv run --with pip-audit pip-audit
  ```

- [ ] 5.5. Commit the direct Python dependency updates.

  ```bash
  git add pyproject.toml requirements.txt uv.lock
  git commit -m "Update vulnerable Python dependencies"
  ```

## 6. Resolve Transitive Python Vulnerabilities

- [ ] 6.1. Identify the dependency path for every remaining vulnerable package.

  ```bash
  uv tree --invert anyio
  uv tree --invert chromadb
  uv tree --invert crewai-tools
  uv tree --invert h2
  uv tree --invert hpack
  uv tree --invert json-repair
  uv tree --invert litellm
  uv tree --invert pydantic-settings
  uv tree --invert soupsieve
  ```

- [ ] 6.2. Attempt compatible lockfile upgrades for vulnerable transitive packages.

  ```bash
  uv lock --upgrade-package anyio
  uv lock --upgrade-package h2
  uv lock --upgrade-package hpack
  uv lock --upgrade-package json-repair
  uv lock --upgrade-package pydantic-settings
  uv lock --upgrade-package soupsieve
  ```

- [ ] 6.3. If a constraint blocks an update, update the direct parent dependency
  rather than forcing an incompatible transitive override.

- [ ] 6.4. Synchronize the environment and run the tests after each related group of
  dependency changes.

  ```bash
  uv sync
  uv run pytest
  ```

- [ ] 6.5. Run the Python audit again and record what remains.

  ```bash
  uv run --with pip-audit pip-audit
  ```

## 7. Upgrade the CrewAI Dependency Cluster

- [ ] 7.1. Review compatible releases for `crewai`, `crewai-tools`, `litellm`,
  `chromadb`, and `json-repair` as one dependency cluster.

- [ ] 7.2. Upgrade CrewAI and CrewAI Tools together. Do not force isolated transitive
  versions that violate CrewAI's declared constraints.

- [ ] 7.3. Regenerate and synchronize the Python lockfile.

  ```bash
  uv lock
  uv sync
  ```

- [ ] 7.4. Run the unit tests after the CrewAI upgrade.

  ```bash
  uv run pytest tests/unit
  ```

- [ ] 7.5. Run the integration tests after the CrewAI upgrade.

  ```bash
  uv run pytest tests/integration
  ```

- [ ] 7.6. Exercise a representative CrewAI study-resource job in the approved local
  or test environment. Do not test against production services without explicit
  authorization.

- [ ] 7.7. Run the Python audit again.

  ```bash
  uv run --with pip-audit pip-audit
  ```

- [ ] 7.8. Commit the tested CrewAI dependency-cluster upgrade separately.

## 8. Review Advisories Without a Patch

- [ ] 8.1. For every advisory without a fixed release, determine whether the affected
  dependency can be removed or replaced.

- [ ] 8.2. Determine whether the application invokes the vulnerable code path.

- [ ] 8.3. Document the advisory ID, affected package, exposure analysis, compensating
  controls, owner, and review date for every temporary exception.

- [ ] 8.4. Do not dismiss or mark an alert resolved solely to reduce the alert count.

## 9. Perform the Final Security and Quality Checks

- [ ] 9.1. Run the final frontend audit and validation suite.

  ```bash
  cd web
  npm ci
  npm audit
  npm run lint
  npm run test:run
  npm run build
  cd ..
  ```

- [ ] 9.2. Run the final backend audit and validation suite.

  ```bash
  uv sync
  uv run pytest
  uv run --with pip-audit pip-audit
  ```

- [ ] 9.3. Review authentication, authorization, input validation, uploaded-file
  handling, and outbound URL validation for regressions caused by dependency
  upgrades.

- [ ] 9.4. Check the working tree and review every changed file before pushing.

  ```bash
  git status
  git diff dev...HEAD
  ```

- [ ] 9.5. Push all tested security changes.

  ```bash
  git push origin fix-security-issues
  ```

## 10. Merge and Activate the Configuration

- [ ] 10.1. Open a pull request from `fix-security-issues` into `dev`.

- [ ] 10.2. Confirm all required checks pass on the pull request.

- [ ] 10.3. Merge `fix-security-issues` into `dev`.

- [ ] 10.4. Test the updated `dev` branch in the non-production environment.

- [ ] 10.5. Open a pull request from `dev` into `main`.

- [ ] 10.6. Confirm all required checks pass before merging into `main`.

- [ ] 10.7. Merge `dev` into `main`. Dependabot reads `.github/dependabot.yaml` from
  the default branch, so the configuration becomes active at this point.

- [ ] 10.8. Confirm **Insights → Dependency graph → Dependabot** shows successful
  update jobs for `uv`, npm, and GitHub Actions.

- [ ] 10.9. Confirm the default branch's Dependabot alerts close after GitHub rescans
  the updated manifests and lockfiles.

- [ ] 10.10. Investigate every remaining open alert and any Dependabot update-job error.

## 11. Resume Agents Work

- [ ] 11.1. Synchronize `dev` after the security work reaches `main`.

- [ ] 11.2. Recreate `agents-fix-v2` from the secured and tested `dev` branch.

- [ ] 11.3. Push `agents-fix-v2` and set its upstream before beginning agents work.

  ```bash
  git switch dev
  git pull --ff-only origin dev
  git switch -c agents-fix-v2
  git push -u origin agents-fix-v2
  ```
