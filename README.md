# CollegeVote

A web-based election management system for college student council elections. The application uses a static HTML/CSS/JavaScript frontend, Node.js serverless API routes, and MySQL/MariaDB.

## Features

- Student sign-in and candidate browsing
- Confidential ballots with one-vote-per-student enforcement
- Admin tools for elections, candidates, and student accounts
- Election results, turnout metrics, and winner/tie detection
- Responsive interface for desktop and mobile

## Stack

- **Frontend:** HTML, CSS, and vanilla JavaScript
- **API:** Node.js serverless functions compatible with Vercel
- **Database:** MySQL or MariaDB
- **Authentication:** HTTP-only cookie sessions and bcrypt password hashes

## Local setup

1. Install Node.js 18 or newer and start MySQL/MariaDB.
2. Create the database using the included SQL files:

   ```bash
   mysql -u root < database/schema.sql
   mysql -u root < database/seed.sql
   ```

3. Copy `.env.example` to `.env` and set the database credentials and a session secret.
4. Install dependencies and start the local app:

   ```bash
   npm install
   npm start
   ```

5. Visit `http://localhost:3000`.

The local server serves files from `public/` and dispatches `/api/*` requests to the same handlers used by Vercel.

## Demo accounts

| Role | Page | Username / ID | Password |
| --- | --- | --- | --- |
| Student | `/student-login.html` | `STU001`–`STU005` | `student123` |
| Admin | `/admin-login.html` | `admin` | `admin123` |

Change demo credentials before using a deployed instance.

## Project structure

```text
CollegeVote/
├── api/                    # Vercel serverless API routes
│   ├── auth/               # Sign-in, sign-out, and session routes
│   ├── candidates/         # Candidate list and management
│   ├── elections/          # Election list and lifecycle
│   ├── results/            # Election result data
│   ├── students/           # Student roster and profile
│   ├── votes/              # Ballot submission
│   └── health.js           # Database health endpoint
├── database/               # Database schema and demo seed data
├── lib/                    # Shared database, authentication, validation
├── public/                 # Deployable static frontend
│   ├── assets/
│   │   ├── css/style.css
│   │   └── js/              # Page-specific frontend modules and shared helpers
│   └── *.html               # Application pages
├── scripts/
│   └── local-server.js      # Local static and API development server
├── .env.example
├── package.json
└── vercel.json
```

## Deployment

Deploy the repository with Vercel and configure the database and session environment variables in the project settings. Vercel serves the frontend from `public/` and discovers API handlers under `api/`.

## License

ISC License © 2026. Built for an Academic Web Technologies Project.
