# Capstone — Consolidated Reference

---

## Table of Contents

1. [Overview](#overview)
2. [Schedule](#schedule)
3. [Boilerplate Templates](#boilerplate-templates)
4. [Deliverable 1 — Project Pitch](#deliverable-1--project-pitch)
5. [Deliverable 2 — Code Review](#deliverable-2--code-review)
6. [Deliverable 3 — Deployment](#deliverable-3--deployment)
7. [Deliverable 4 — Capstone Defense](#deliverable-4--capstone-defense)
8. [Deliverable 5 — Capstone Presentation](#deliverable-5--capstone-presentation)

---

## Overview

Congratulations! You've made it to the Capstone project!

### Goals

The purpose of the Capstone is to:

- have a _polished_ project that you can show off and talk about with employers
- review and synthesize all the material you've learned so far
- work with a team on a professional project

This is _not_ the time to:

- launch a startup and make money
- learn shallowly in a different language and ecosystem
- learn a complex new library

### Objectives

At a high level, a capstone project requires demonstration of the following abilities.

#### Project Management

- Use Git to version control code
- Collaborate with other developers on GitHub

#### Frontend

- Design React components based on project specs
- Provide an interface for users to send CRUD requests to an API
- Dynamically render components based on data from an API
- Display different views to authenticated users
- Create an accessible and aesthetically pleasing user experience

#### Backend

- Design a database schema of coherent relational models based on project specs
- Query a relational database for requested data
- Securely handle user account information
- Design a RESTful API with documented endpoints
- Architect Express middleware and routers
- Serve data from a seeded database

---

## Schedule

You will have roughly 10 blocks to work on your Capstone project.

| Block | Milestone                     |
| ----- | ----------------------------- |
| 1     | Project Pitch and approval    |
| 2     | Work on MVP                   |
| 3     | Work on MVP                   |
| 4     | Work on MVP                   |
| 5     | Code Review                   |
| 6     | Deployment                    |
| 7     | Proofread and polish code     |
| 8     | Capstone Defense              |
| 9     | Finishing touches             |
| 10    | Capstone Presentation         |

---

## Boilerplate Templates

Once your pitch has been approved, you are ready to start coding. While you are welcome to
start from scratch, you may also use the following templates with initial boilerplate code.

- [Backend Template](https://github.com/FullstackAcademy/capstone-backend)
- [Frontend Template](https://github.com/FullstackAcademy/capstone-frontend)

---

## Deliverable 1 — Project Pitch

On Canvas, submit a document that includes:

- 30 second elevator pitch for your project
- Concrete core features that will be implemented in the MVP
- Stretch goal features
- Your project management system
  - high-level tickets on what needs to be done
  - how tickets will be assigned

The document should also include the following technical details:

- detailed database schema with all tables, properties, and relations defined
- list of API endpoints and how they interact with the tables
- detailed [wireframe](https://en.wikipedia.org/wiki/Website_wireframe) of your frontend
  - all pages, forms, routes, etc
- a [user story](https://en.wikipedia.org/wiki/User_story) for each MVP feature

You will be using this document to pitch your capstone to your instructor. In that
meeting, the instructor will approve your pitch or give you feedback on what needs to be
fixed. **Do not start the project until your pitch has been approved.**

Be ambitious, but also be prepared to scope down! There (almost certainly) will not be
enough time to develop everything perfectly, but you can and are encouraged to continue
working on this project after you graduate!

> **Tip:** Need an idea? Feel free to use example ideas provided by your instructor.
> You do not need to come up with your own original idea.

---

## Deliverable 2 — Code Review

Aim to have at least one core feature implemented and pushed to GitHub. Instructors will
give written feedback on your code, so make sure your main branch is clean and
presentable!

### Code Guidelines

#### Functionality

- Make sure the core feature is (mostly) working. Don't worry about edge cases.
- The code in the main branch works on multiple machines.

#### Code Style

- Delete unused variables, imports, logs, etc.
- Delete reference code, such as TODO comments or template files.
- _Consistently_ format each file.
- Follow consistent naming conventions, such as:
  - `PascalCase` for React components and files
  - `camelCase` for variables and function names
  - nouns for variable names
  - verbs for function names
- Spell check your files and fix any typos.
- Use meaningful and descriptive names for your variables and functions.
- Avoid abbreviations and prefer explicitly spelling words out.
- Abstract shared logic into separate functions and files instead of repeating code.

#### Documentation

- Comments should be at a higher level than the code itself. Avoid repeating code.
- Prefer code that is self-documenting over comments (e.g. descriptive variable names).
- If you got code from an outside source, credit the source in a comment.
- Document all components and functions — 1–2 sentence descriptions are plenty.
- Write a thorough README file that includes:
  - overview with a description, problem statement, goals, screenshots, etc
  - core distinguishing features of the project
  - tech stack: technologies, tools, and frameworks used
  - architecture overview: folder structure, system design, etc

### Submission

Submit the links to your frontend and backend repositories.

---

## Deliverable 3 — Deployment

### Backend

We will be using [Render](https://render.com/) to host our backend. The database and the API will be hosted separately.

#### Getting Started

1. Make an account on Render and connect it to your GitHub account.
2. If asked where to install Render, select your **backend** repository.

#### Database

Create and host a new database on Render.

1. On Render, click "+ New" at the top and select "Postgres".
2. Give the database a name.
3. Scroll down to the pricing options and choose the "Free" tier.
4. Scroll to the bottom and click the "Create Database" button.
   - You will be redirected to the "Info" page for the newly created database.
5. Copy the **External Database URL** under the "Connections" section.
   - You may have to wait a few seconds until the database is ready.

> **Warning:** Your one free Render database will expire after 90 days. At that time,
> you will only be able to start a new database.

Complete the following steps in your _local_ backend repository.

6. Change `DATABASE_URL` in `.env` to the external database URL.
7. Add `NODE_ENV=production` to your `.env` file.
8. Initialize the schema of the external database:
   ```
   psql replace_with_external_url -f db/schema.sql
   ```
   Example: `psql postgresql://user:pass@render.com/capstone_database -f db/schema.sql`
9. Seed the external database:
   ```
   npm run db:seed
   ```

Your database is now deployed and seeded.

> **Warning:** Be careful with CRUD operations, especially if you are in a team!
> This will now permanently affect the external database.

> **Tip:** You can temporarily undo the changes in your `.env` file if you want
> to continue working on your local development database.

#### API

Create and host a new web service on Render.

1. Click "+ New" at the top and select "Web Service".
2. In the "Source Code" section, connect your **backend** repository.
3. Give your API a name.
4. Set the "Build Command": `npm install`
5. Leave the "Start Command" as `npm run start`.
6. Set the "Instance Type" to "Free".
7. Expand the "Advanced" section → click "+ Add" under "Secret Files".
8. Set the "Filename" to `.env`.
9. Copy and paste the contents of your `.env` file into the "Contents" textarea.
10. Click "Create Web Service."

Your backend is now deployed. It will automatically redeploy whenever changes are pushed to your repository's `main` branch on GitHub.

---

### Frontend

We will be using [Netlify](https://www.netlify.com/) to host our frontend.

1. Make an account on Netlify and connect it to your GitHub account.
2. In the "Projects" tab, click "Add new project" → "Import an existing project".
3. Select "GitHub" and authorize Netlify.
4. Click "Configure Netlify on GitHub".
5. Give Netlify access to your **frontend** repository (must be public).
6. Enter a site name, which determines the public URL.
7. Set the "Build command": `npm run build`
8. Set the "Publish directory": `dist`
9. Click "Add environment variables" → "Import from a .env file".
10. Enter the following (use your actual deployed backend URL):
    ```
    VITE_API_URL=https://your-deployed-backend.onrender.com
    ```
11. Click the "Deploy" button.

> **Warning:** Do _not_ include a `/` at the end of the backend URL. You will run into
> network issues if there is a trailing slash.

Your frontend is now deployed and will automatically redeploy on pushes to `main`.

---

### Connect the Services

1. Go to the "Environment" page of your deployed API on Render.
2. Click "Edit" in the "Secret Files" section.
3. Click "Contents" to edit the secret file.
4. Add a new line:
   ```
   CORS_ORIGIN=https://your-frontend.netlify.app
   ```
5. Click "Done".
6. Click "Save, rebuild, and deploy".

> **Warning:** Do _not_ include a `/` at the end of the Netlify URL. You will run into
> CORS issues if there is a trailing slash.

Your fullstack web application is now deployed and available on the internet!

### Submission

Submit the links to your deployed frontend and backend.

---

## Deliverable 4 — Capstone Defense

It's not enough to just build a project — you also have to talk about it in an interview!

You will participate in a formal "tell me about your project" interview with your
instructor. The interview will start with a question about one of your app's core
features, and then branch off into follow-up questions about your project architecture.

### Goals

- Effectively communicate architectural decisions
- Discuss the trade-offs that come with using specific technologies
- Walk through the vertical slice of a request-response cycle from frontend to backend

### Topics

Study the following topics and be ready to discuss _what_ you used and _why_.

> **Tip — General script for talking about your project:**
>
> "We noticed this PROBLEM while we were working on FEATURE. We considered OPTION A,
> but ultimately decided on OPTION B because of these TECHNICAL REASONS. We also thought
> about OPTION C, but OPTION B does XYZ much better, which is what we needed."

#### React

- state-driven UI
- data-UI lifecycle
- React vs vanilla DOM
- context
- component structure
- routing

#### Node

- npm, package.json, dependencies
- Node vs browser

#### Express

- RESTful API
- routing
- request-response cycle
- middleware

#### PostgreSQL

- relational vs non-relational databases
- relationships between tables
- SQL

---

## Deliverable 5 — Capstone Presentation

You'll have 5–10 minutes to present your Capstone project.

### Structure

1. Introduction / Elevator Pitch
2. Overview of core features and concepts
3. Overview of architecture & technical solutions
4. Potential stretch goals
5. Questions from the audience

### Tips

- Have a strong introduction.
- Speak with clear, measured delivery.
- Smooth handoffs / segues / sign-offs.
- Avoid discussing trivial UI steps such as logging in.
- Focus on interactions that are a critical part of the app's identity.
- Cite interesting facts not evident from the visuals.
- Focus more on solutions you developed, less on APIs you leveraged.
- Avoid cluttering slides with too much detail.
- Use a BIG FONT SIZE.
- End on an invitation to check out your repo / app.

### Tell a Narrative

Frame your app with a specific story, as if documenting a real user's moment-by-moment
use. A good story gives the audience a direct template to imagine themselves in.

#### Example 1

**Worst:**
> Hangout is an app for people to connect with their friends. The permissions structure
> allows people to invite other people to those events.

**Better:**
> College students use Hangout to plan social events. Hangout can be used to plan
> everything from private parties to campus-wide ragers.

**Best:**
> It's three weeks until Collin's big Halloween party. He wants everyone on campus to show
> up. Collin makes a party invite on Hangout. Finn just got his invite to the big party.
> Because Collin set the permissions to "Public", Finn is inviting guests that Collin
> isn't connected with — exactly what Collin wanted.

#### Example 2

**Worst:**
> Pothole Patrol is an app that cities use to manage their pothole problems. Road workers
> and city administrators work together to track the work being done.

**Better:**
> Collin fixes potholes for the city of Chicago. As he does his work, he takes pictures
> and reports his work to city administrators with Pothole Patrol. Then, he'll receive his
> next assignment through the app.

**Best:**
> Collin works on a road crew fixing potholes in the city of Chicago. He's out working on
> a pothole at the corner of Chicago and Franklin. Once he's done filling in, he uploads a
> picture of it to Pothole Patrol. His manager Finn receives the picture right away and
> schedules Collin's next pothole down the road at Chicago and Wells.
