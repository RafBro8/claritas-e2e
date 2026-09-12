# Claritas E2E

**A friendly window into automated testing — no terminal, no code, no IDE required.**

Claritas E2E is a web app that lets Product Owners and business users **run, watch, and understand** an automated end-to-end (E2E) test suite from a normal web page. It's the companion project to [Provisio](https://github.com/RafBro8/provisio), and it drives Provisio's own Playwright suite for real — including against Provisio's live deployment.

**Live demo:** [claritas-e2e.vercel.app](https://claritas-e2e.vercel.app)

[![CI](https://github.com/RafBro8/claritas-e2e/actions/workflows/ci.yml/badge.svg)](https://github.com/RafBro8/claritas-e2e/actions/workflows/ci.yml)

## Table of contents

1. [What is this app, in plain English?](#1-what-is-this-app-in-plain-english)
2. [Who is it for?](#2-who-is-it-for)
3. [A few words you'll see a lot](#3-a-few-words-youll-see-a-lot)
4. [Getting started](#4-getting-started)
5. [The sections, one by one](#5-the-sections-one-by-one)
6. [Smart features that help you](#6-smart-features-that-help-you)
7. [Why this app is useful](#7-why-this-app-is-useful)
8. [Frequently asked questions](#8-frequently-asked-questions)

## 1. What is this app, in plain English?

Behind Provisio there's a collection of **automated tests** that open the app like a real person would — clicking buttons, filling in forms, checking that the right thing shows up on screen. These are called **Playwright end-to-end specs** ("specs" for short).

Normally, only developers can run these tests, because it requires a terminal and some command-line know-how. **Claritas E2E removes that barrier.** It puts a clean, point-and-click interface on top of those tests so that anyone on the team can:

- Run any test (or several at once) with a single click.
- Watch the test happen **live**, line by line, as it runs.
- Read the result — did it pass or fail? — and open a detailed visual report.
- Get a plain-English hint about *why* a test failed: a real problem, or just the environment having a bad moment?

Think of it as a **dashboard for testing** — the same idea as a car dashboard: you don't need to understand the engine to read the speedometer and the warning lights.

## 2. Who is it for?

No prior testing or coding experience is assumed. Everyone — Product Owners, business analysts, and developers alike — sees and uses the same three screens: a **Dashboard** to run tests, **Run History** to look back at what happened, and **Scheduled Runs** to have tests run themselves. There's no login and no permission tiers here; the identity menu in the top-right just labels things with your name so the team knows who ran what.

## 3. A few words you'll see a lot

Don't worry about memorizing these — they're here for reference.

| Term | What it means for you |
|---|---|
| **Spec (or test)** | One automated test file that checks a specific piece of functionality. |
| **Run** | One attempt at executing one or more specs. A run ends as *passed*, *failed*, *skipped*, or *cancelled*. |
| **Environment** | Where the test points. **Local** spins the app up fresh just for the test. **Live** runs against Provisio's actual deployed site. |
| **Report** | A detailed, visual breakdown of a run that opens in a new tab. |
| **Headless** | "Invisible" mode — the browser runs in the background so tests finish faster. Turn it off to watch the browser window open and click through the app itself. |

## 4. Getting started

There's one quick, optional thing to set up — it lives in the **top-right corner**.

**Tell the app who you are.** Click the identity menu, enter your name and role. This isn't a login — it simply labels the app with your name so the team knows who's using it. You only need to do this once; the app remembers you.

**Pick your look.** The sun/moon icon next to it toggles light and dark mode. Dark is the default.

**Is the app connected?** A small dot in the sidebar shows green when the app has a live connection to the server (needed for watching a run in real time) and red if that connection is down.

## 5. The sections, one by one

### Dashboard — run tests and watch them live

The home screen and the heart of the app.

1. **Choose an environment** — Local or Live — using the selector at the top.
2. **Decide whether to watch** — leave *headless* off to see the browser, or on for speed.
3. **Select what to run.** Tick individual specs, or use *Select all* / *Clear*. A counter shows how many you've chosen.
4. Click **Run Selected**.

Once a run starts, a **live output panel** opens — a terminal-style feed that shows exactly what the test is doing, updating in real time. You can **cancel** a run in progress with the same button, which now reads Stop.

When it finishes: a clear **status** (passed/failed/skipped/cancelled) with counts and duration, a **View report** button when a detailed report is available, and — if it failed — a colour-coded badge with Claritas's best guess at *why* (more on that below).

### Run History — look back at past runs

A complete, filterable record of every run that's happened.

- Summary tiles at the top show totals: passed, failed, cancelled.
- A table lists each run with its status, specs, environment, duration, and start time.
- Filter by status, environment, or time period.
- Open any run's report, or reveal the same likely-cause badge you'd see fresh on the Dashboard, at any point later.
- The **Trigger** column says whether a person started the run or a schedule did, and you can filter on that.

### Scheduled Runs — have the tests run themselves

Nobody has to remember to click Run. A schedule runs the specs you choose, on a timetable you choose, and can email the result.

- **How often:** hourly, daily, every weekday, weekly — or a **custom** cron expression if you want something specific. As you pick, the dialog shows what it means in plain English ("Every weekday at 09:00") and the next three times it will run.
- **Times are yours.** A schedule remembers the time zone it was created in, so "09:00" stays 9am where you are, and stays correct across daylight-saving changes, even though the server itself runs on UTC.
- **What to run:** every spec, or a specific few. "All specs" includes any spec added to Provisio later, automatically.
- **Email the report** to any address (optional — see below).
- Each schedule can be **paused** and resumed, edited, deleted, or **run immediately** with the play button. Every run it starts appears in Run History, marked *Scheduled*.

**Setting up email.** Report emails only send once the server has mail settings; until then the page says so plainly, and each report is recorded as skipped rather than silently lost. Any SMTP provider works — a Gmail app password or a service like Resend — by setting `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally `MAIL_FROM` and `PUBLIC_URL` (which puts a link to the full report in the email). See `server/.env.example`.

**A note on timing.** The hosted demo's API sleeps after about 15 minutes of inactivity, because it's on a free plan. A schedule can't fire while the server is asleep — it runs the next time the server is awake. On a machine or paid plan that stays up, schedules fire on time.

## 6. Smart features that help you

### The "likely cause" badge — is it the test, or the environment?

Automated tests fail for two very different reasons:

1. **The application genuinely changed** — a button moved, a label was renamed — so the test needs updating.
2. **The environment had a bad moment** — a slow cold start, a dropped connection — and it's not really the test's fault at all.

Claritas tries to tell these apart **automatically**. When a run fails, it examines what happened and shows a colour-coded badge:

| Badge | Meaning |
|---|---|
| **Likely environment issue** (amber) | The app was unreachable, slow, or erroring — try again once things settle. |
| **Likely UI change** (violet) | The page didn't behave the way the test expected — probably needs an update. |
| **Cause unclear** (grey) | Not enough signal to be sure — worth a human look. |

Click the badge to see a plain-English list of exactly *why* it reached that conclusion, along with a confidence level. Before each run, Claritas also quietly checks whether the target environment is even reachable — so if it was already down, the badge can say so with real confidence, not a guess.

It's always a **suggestion**, never the final word — always confirm against the report.

### Live output and reports

Every run streams live, and finished runs keep a full visual report (with screenshots and step-by-step detail) you can open any time afterward from Run History.

## 7. Why this app is useful

- **No technical skills needed.** Run and read tests from a browser — no command line, no setup.
- **Faster feedback.** Check that a feature still works in minutes, without waiting on a developer.
- **Less noise, more signal.** The likely-cause badge helps you ignore environment blips and focus on real problems.
- **A shared, lasting record.** Every run — and every report — is saved and searchable, not lost the moment a terminal window closes.
- **Transparency for everyone.** Visibility that used to be developer-only, for the whole team.

## 8. Frequently asked questions

**Do I need to install anything?**
No. Claritas runs in your web browser. A developer runs the backend server; you just open the page.

**Will running a test break anything?**
Tests interact with a real app, not a mock — in Local mode that's a throwaway instance spun up just for the test; in **Live mode it's Provisio's actual deployed site**, since this is a personal project without a separate staging environment. Every test account and booking a spec creates uses a unique, timestamped identifier, so it's safe to run without colliding with anything else — but it's worth knowing Live mode is the real thing, not a sandbox.

**What's the difference between Local and Live?**
Local spins the app up fresh, just for the test, on the same machine running Claritas's backend. Live points at the real deployed Provisio site. If a test fails on Live, the likely-cause badge often points to whether the environment was reachable at all.

If you're trying this out on the **live demo** above rather than running Claritas locally yourself: only **Live** actually works there. Local mode needs Provisio's own dev servers running on the same machine as Claritas's backend, which isn't the case for the hosted version — trying it will just fail cleanly (and honestly get flagged as an environment issue by the badge, rather than crash anything).

**A test failed — what should I do?**
Open its report to see exactly what happened. Check the likely-cause badge: if it says environment issue, it's often worth simply trying again. If it says UI change, that's a real signal something in the app changed.

**Do I have to log in?**
No password login. Set your name once in the top-right so anything you run is labelled with who you are.

**Something isn't loading / the dot is red.**
The app has lost its connection to the server. Refresh the page; if it's still red, the backend may need a moment (free-tier hosting can take a little while to wake back up after being idle).

---

*Claritas E2E — making automated testing clear for everyone.*

## Related project

[Provisio](https://github.com/RafBro8/provisio) — the appointment booking platform whose Playwright e2e suite this app runs and monitors.
