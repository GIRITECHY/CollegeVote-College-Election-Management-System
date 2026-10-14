# CollegeVote — College Election Management System

A secure, transparent, and responsive web-based election management application designed for college student council elections. Built with **Node.js**, **MySQL**, and modern vanilla web standards.

---

## 🌟 Key Features

* **Student Voting Portal**:
  * Secure student login with Student ID and encrypted passwords (bcrypt).
  * Candidate profile browser displaying manifestos, departments, and contesting positions.
  * Confidential ballot submission with double-confirmation screen.
  * **Strict One Student, One Vote**: Enforced at application and database schema level (unique composite constraint `(election_id, student_id)`) to completely block duplicate votes.

* **Administrator Control Center**:
  * Real-time metrics: voter turnout percentage, total votes cast, candidate count, active students.
  * Full Election Lifecycle: Create elections, edit parameters, open voting, and close voting.
  * Candidate Management: Add, edit, or remove candidate profiles and manifestos.
  * Student Roster: Search students, add students, edit details, and activate/deactivate accounts.

* **Live & Certified Results**:
  * Interactive candidate vote breakdown with proportional progress bars and percentages.
  * Automated winner declaration and tie-breaker detection.
  * Configurable visibility (live during voting or released after election close).

---

## 🏗️ Tech Stack

* **Frontend**: HTML5, Vanilla CSS3 (Custom Design System, Responsive, Mobile-friendly), Vanilla JavaScript (ES6+ async/await).
* **Backend**: Node.js, Vercel Serverless Functions (`api/**/*.js`).
* **Database**: MySQL / MariaDB (XAMPP compatible).
* **Authentication**: Cookie-based sessions with UUID tokens and bcrypt password hashing.

---

## 🚀 Quick Start (Local Setup with XAMPP)

### 1. Prerequisites
* **Node.js** (v18+)
* **XAMPP** (with MySQL started on port `3306`)
* **Git**

### 2. Database Setup
1. Start MySQL in your XAMPP Control Panel.
2. Import the schema and seed data into MySQL:
   ```bash
   mysql -u root < database/schema.sql
   mysql -u root < database/seed.sql
   ```

### 3. Installation & Run
1. Clone the repository:
   ```bash
   git clone https://github.com/GIRITECHY/CollegeVote-College-Election-Management-System.git
   cd CollegeVote-College-Election-Management-System
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Open your browser at: **`http://localhost:3000`**

---

## 🔑 Demo Credentials

| Role | Portal URL | Username / ID | Password |
| :--- | :--- | :--- | :--- |
| **Student** | `/student-login.html` | `STU001` (or `STU002` - `STU005`) | `student123` |
| **Admin** | `/admin-login.html` | `admin` | `admin123` |

---

## 📁 Project Structure

```
CollegeVote/
├── api/                   # Backend Serverless API endpoints
│   ├── auth/              # Login, logout, session check
│   ├── students/          # Student management & profile
│   ├── candidates/        # Candidate management
│   ├── elections/         # Election lifecycle (open/close)
│   ├── votes/             # Transactional vote submission
│   ├── results/           # Election results & metrics
│   └── health.js          # API & database health probe
├── css/
│   └── style.css          # Design system & responsive styles
├── database/
│   ├── schema.sql         # Database tables & constraints
│   └── seed.sql           # Demo accounts & elections
├── js/
│   ├── admin.js           # Admin portal logic
│   ├── auth.js            # Login/logout handlers
│   ├── common.js          # Utilities, badges, and API client
│   ├── results.js         # Results calculation & rendering
│   ├── student.js         # Student dashboard & candidate list
│   └── voting.js          # Ballot submission flow
├── lib/                   # Backend utilities (DB pool, auth, validation)
├── local-server.js        # Local dev server
├── vercel.json            # Vercel deployment configuration
├── package.json           # Project metadata & dependencies
└── *.html                 # Application pages
```

---

## 📄 License
ISC License &copy; 2026. Built for Academic Web Technologies Project.
