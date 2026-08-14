# Claritas E2E

A friendly window into automated testing — no terminal, no code required.

Claritas E2E is a web app that lets Product Owners and business users run, watch, and understand an automated Playwright end-to-end test suite from a normal web page. It's the companion project to [Provisio](https://github.com/RafBro8/provisio), and drives Provisio's own e2e suite live.

> Status: under active development. This README will be filled in with the full product overview, screenshots, and a live demo link as the project progresses.

## Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Socket.io client
- **Backend**: Node.js, Express, TypeScript, Socket.io
- **Database**: MongoDB (Mongoose)
- **Drives**: Provisio's Playwright e2e suite

## Project structure

```
claritas-e2e/
  client/    React frontend
  server/    Express + Socket.io backend
```

## Local development

Prerequisites: Node.js, Docker Desktop.

```bash
docker compose up -d      # starts local MongoDB (+ mongo-express UI at localhost:8081)
```

Backend and frontend setup instructions will be added as those pieces are built.

## Related project

[Provisio](https://github.com/RafBro8/provisio) — the appointment booking platform whose Playwright e2e suite this app runs and monitors.
