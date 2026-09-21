# A small team Git workflow

## Start working

```bash
git clone https://github.com/rithika-kambala/tabletrail-dbms.git
cd tabletrail-dbms
git switch main
git pull --ff-only origin main
git switch -c feat/your-feature
npm ci
```

Keep database, backend, frontend and documentation work in focused changes. Before editing shared schema or checkout logic, agree on table/route changes with teammates. Never commit `.env`, database passwords, API keys, or generated dependency folders.

## Commit one completed change

```bash
git status
git diff
git add database/queries.sql
git commit -m "feat: add customer repeat-visit query"
git push -u origin feat/your-feature
```

Open a pull request on GitHub. Ask a teammate to review and require green tests. Merge the pull request, then each student runs `git switch main` and `git pull --ff-only origin main`.

## Bring main into your feature branch

```bash
git fetch origin
git switch feat/your-feature
git merge origin/main
```

If Git reports a conflict, open the named file and find `<<<<<<<`, `=======`, and `>>>>>>>`. Read both changes, keep the correct combined version, remove the markers, and test it. Do not blindly choose one side.

```bash
git add path/to/resolved-file
git commit -m "fix: resolve shared menu changes"
git push
```

Use `git merge --abort` if you need to return to the state before an unresolved merge. Do not force-push shared main.

## What changed and why

| Feature          | Files to review/commit                                 | Why                                                               | Suggested commit                                                         |
| ---------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Database         | database/*.sql                                         | Normalized schema, seed facts, reports, stored routines and audit | feat: add normalized restaurant database and transactional checkout      |
| Backend          | backend/, root package files                           | Authorization, validation, API, seed script and integration tests | feat: implement authorized restaurant API and database integration tests |
| Interface        | frontend/                                              | Workspace, forms, reports and guest feedback                      | feat: add restaurant workspace                                           |
| Automated checks | tests/, playwright.config.js, .github/workflows/ci.yml | Reproducible MySQL and browser verification                       | test: add MySQL and browser workflow checks                              |
| Documentation    | README.md, docs/, screenshots/, LICENSE                | Setup, explanation, report, viva and evidence                     | docs: finish project report and setup guide                              |

The generated initial implementation is already committed in focused groups. Use `git log --oneline` to inspect the exact history and `git show <commit>` to study each feature. Future changes should follow the same pattern.
