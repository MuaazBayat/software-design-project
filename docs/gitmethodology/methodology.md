# Trunk-Based Development Strategy

This document outlines the **Trunk-Based Development (TBD)** methodology that our team of six will be adopting. TBD is a lightweight, disciplined, and highly collaborative branching strategy that fits our needs for continuous delivery of a large project with frequent two-week release cycles.

---

## Overview

Trunk-Based Development is a Git branching strategy where all developers work directly on a single branch — in our case, the **`develop`** branch (instead of `main` or `master`). Instead of creating long-lived feature branches, developers integrate small, incremental changes frequently. When new functionality isn’t fully ready for release, **feature flags (toggles)** are used to hide incomplete work from production users.

The **develop branch is always in a deployable state** and serves as the foundation for Continuous Integration (CI) and Continuous Delivery (CD).

---

## Workflow

1. **Start from `develop`**
   Developers pull the latest changes from `develop` before making updates.

2. **Create a short-lived feature branch**
   For each task, create a branch named `feature/<name_of_feature>`. Keep these branches short-lived (a few hours or days).

3. **Make small, frequent commits**
   Each commit should represent a small unit of work that can be quickly reviewed and merged.

4. **Feature Flags for unfinished work**
   Incomplete or experimental features are hidden behind flags so that code can be merged early without affecting production.

5. **Continuous Integration**
   Every commit triggers automated builds and tests to ensure stability.

6. **Continuous Delivery**
   The `develop` branch is always releasable, and deployments can happen as often as every commit or, in our case, every **two weeks**.

---

## Architecture (Conceptual)

```
   develop (deployable at all times)
      |-- feature/login-page → merged back quickly
      |-- feature/chat-system → merged back quickly
```

Unlike GitFlow, there are no long-lived `release` or `hotfix` branches. Instead, we use **one main branch (`develop`) plus short-lived `feature/` branches**.

---

## Pros

* ✅ **Always releasable**: `develop` stays production-ready at all times.
* ✅ **Fewer merge conflicts**: Small, frequent commits reduce the chance of “merge hell.”
* ✅ **High visibility**: Everyone sees each other’s changes quickly, encouraging collaboration.
* ✅ **Fast delivery**: Enables rapid releases and quick feedback loops.
* ✅ **Supports CI/CD**: Aligns perfectly with automated testing and continuous delivery pipelines.

---

## Cons

* ⚠️ **Requires discipline**: Developers must commit small, working chunks of code and avoid breaking `develop`.
* ⚠️ **Feature flags overhead**: Extra work is needed to manage toggles for incomplete features.
* ⚠️ **Challenging with large teams**: Works best with smaller, highly collaborative teams (like ours with 6 people).
* ⚠️ **Backwards compatibility issues**: Maintaining support for older releases can be tricky.

---

## Why We Chose TBD

For our **team of six building a large MVP website**, Trunk-Based Development with a `develop` trunk and `feature/` branches offers:

* **Minimal overhead**: No complex branching or merging workflows.
* **Frequent syncs**: Keeps everyone aligned since all changes land in `develop` quickly.
* **Two-week release cycle**: Ensures new features and bug fixes are continuously integrated and shipped.
* **Focus on collaboration**: Perfect for a team working together for the first time.

---

## Best Practices for Our Team

1. **Keep feature branches short-lived.**
   Merge them into `develop` within a few days.

2. **Keep commits small and frequent.**
   Aim for multiple commits per day rather than one large commit per week.

3. **Always run tests locally before pushing.**
   CI/CD will catch issues, but we should avoid breaking `develop`.

4. **Use feature flags generously.**
   Merge early, hide incomplete features behind flags.

5. **Perform frequent code reviews.**
   Use pull requests to review changes before merging into `develop`.

6. **Automate as much as possible.**
   Linting, testing, and deployment should be automated to reduce human error.

---

## Summary

Trunk-Based Development with `develop` as our trunk branch and short-lived `feature/` branches is a disciplined, collaborative workflow that aligns with our goals: **fast iteration, bi-weekly releases, and minimal Git overhead.** By committing small, frequent changes and relying on feature flags, our team of six can stay in sync, avoid messy merges, and ensure that our MVP is delivered reliably and on schedule.
