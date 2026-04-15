# School Management System Project Structure

This document explains the purpose of the main folders and files in the project and how they work together.

## 1. Project Overview

The repository is split into two major parts:

- `backend/` handles the API, database, authentication, file uploads, PDF generation, and real-time notifications.
- `frontend/` is the React application that renders the user interface, talks to the API, and listens to socket updates.

The application supports roles such as student and teacher. Teachers can manage attendance, marks, notes, timetable entries, and notices. Students can view the data assigned to them and receive notifications.

## 2. Root Level Files

### `PROJECT_STRUCTURE.md`
This document. It is the project guide for understanding the codebase.

### `backend/`
Contains the Node.js and Express API server, MongoDB models, and backend utilities.

### `frontend/`
Contains the React client application.

### `package-lock.json` files
If present inside `backend/` or `frontend/`, they lock dependency versions so installs are reproducible.

### `.gitignore`
Prevents generated or sensitive files from being committed.

## 3. Backend Structure

### 3.1 Backend Entry Files

#### `backend/server.js`
The main server start-up file.

What it does:

- Loads environment variables.
- Creates the HTTP server from the Express app.
- Initializes Socket.io for live events.
- Connects to MongoDB.
- Starts the server on the configured port.

How it works:

- It imports the Express app from `backend/app.js`.
- It attaches the Socket.io instance to the app so controllers can emit events.
- It opens the database connection before the app starts serving requests.

#### `backend/app.js`
The Express application configuration file.

What it does:

- Registers JSON parsing middleware.
- Configures CORS.
- Serves uploaded files from the `uploads/` folder.
- Mounts all API route modules under `/api`.

How it works:

- It is separate from `server.js` so the app can be imported in tests without starting a real server.
- It sets a default no-op `io` emitter for test and non-socket contexts.

#### `backend/config/db.js`
Database connection helper.

What it does:

- Centralizes MongoDB connection logic if used by scripts or future refactors.

Current role:

- The live server currently connects in `server.js`, so this file is a shared utility rather than the primary connection entry point.

### 3.2 Backend Configuration

#### `backend/package.json`
Defines backend scripts and dependencies.

Key scripts:

- `start` runs the server.
- `test` runs the Jest test suite.
- `seed:school` loads sample school data.
- `backfill:attendance-subject` runs the attendance backfill script.

#### `backend/jest.config.js`
Jest configuration for backend tests.

What it does:

- Sets the test environment.
- Configures Jest behavior for the backend test suite.

#### `backend/.env`
Local environment variables.

Typical values:

- `MONGO_URI` for MongoDB connection.
- `JWT_SECRET` for signing tokens.
- `PORT` for the server port.
- `CLIENT_URL` or `CLIENT_URLS` for CORS.

This file should stay local and not be committed with secrets.

### 3.3 Backend Middleware

#### `backend/middleware/authMiddleware.js`
JWT authentication guard.

What it does:

- Reads the bearer token from the request.
- Verifies the token.
- Loads the user from MongoDB.
- Attaches the user to `req.user`.

How it works:

- Protected routes use this middleware before controller logic runs.

#### `backend/middleware/roleMiddleware.js`
Role-based authorization guard.

What it does:

- Checks whether the current user has one of the allowed roles.
- Blocks access if the user does not match the required role.

How it works:

- Routes for teacher-only or student-only features use this middleware after authentication.

### 3.4 Backend Models

#### `backend/models/User.js`
User account schema.

Stores:

- Name
- Email
- Password hash
- Role
- Class assignment for students or teachers

How it is used:

- Authentication, authorization, class membership, and dashboard identity all rely on this model.

#### `backend/models/Attendance.js`
Attendance record schema.

Stores:

- Student reference
- Class name
- Subject
- Date
- Status such as present or absent
- Teacher who marked it

How it is used:

- Attendance pages and attendance analytics read and write this model.

#### `backend/models/Marks.js`
Marks record schema.

Stores:

- Student reference
- Class name
- Subject
- Test name
- Marks obtained
- Total marks
- Teacher who entered the score

How it is used:

- Marks entry, marks listing, comparison views, and report generation depend on it.

#### `backend/models/ClassRoom.js`
Class-subject-teacher mapping schema.

Stores:

- Class name
- Subject
- Teacher ID

How it is used:

- Ties a teacher to a specific class and subject.
- Helps the app know which teacher owns which teaching assignment.

#### `backend/models/Note.js`
Study material schema.

Stores:

- Title
- Description
- Subject
- Class
- File URL
- Uploader

How it is used:

- Notes upload and notes listing pages rely on it.

#### `backend/models/Timetable.js`
Timetable entry schema.

Stores:

- Class
- Day
- Subject
- Start time
- End time
- File URL
- Uploader

How it is used:

- Timetable management and timetable display pages use it.

#### `backend/models/Notification.js`
Notification schema.

Stores:

- Message
- User ID
- Read state
- Timestamp

How it is used:

- Persistent notifications are stored here and also emitted through Socket.io for live updates.

### 3.5 Backend Controllers

#### `backend/controllers/authController.js`
Handles registration, login, and current-user lookup.

How it works:

- Validates credentials.
- Hashes passwords when registering users.
- Creates JWT tokens.
- Returns the authenticated user profile.

#### `backend/controllers/classController.js`
Handles class and subject assignment data.

How it works:

- Creates and lists `ClassRoom` records.
- Returns students or class-related data used by teacher pages.

#### `backend/controllers/attendanceController.js`
Handles attendance creation, upload, and listing.

How it works:

- Saves attendance records for a class and subject.
- Supports batch uploads.
- Uses the notification helper so attendance changes can notify students.

#### `backend/controllers/marksController.js`
Handles marks entry, upload, listing, detail lookup, update, and comparison data.

How it works:

- Stores marks for students.
- Supports teacher workflows for adding and updating grades.
- Triggers notifications when marks change.

#### `backend/controllers/noteController.js`
Handles note upload, listing, updating, and deletion.

How it works:

- Uses file upload middleware.
- Stores the uploaded file path in MongoDB.
- Serves notes to the correct class or role.

#### `backend/controllers/notificationController.js`
Handles notification retrieval and marking notifications as read.

How it works:

- Returns unread or all notifications for a user.
- Updates records when notifications are viewed.

#### `backend/controllers/reportController.js`
Generates PDF report output.

How it works:

- Pulls academic or attendance data from the database.
- Uses `pdfkit` to build a downloadable report.

#### `backend/controllers/timetableController.js`
Handles timetable CRUD operations.

How it works:

- Stores timetable entries.
- Lists schedules for a class.
- Supports teacher updates.

### 3.6 Backend Routes

Each route file connects HTTP paths to the controller methods.

#### `backend/routes/authRoutes.js`
Authentication endpoints.

Typical responsibilities:

- Register users
- Log users in
- Return the current user profile

#### `backend/routes/classRoutes.js`
Class and assignment endpoints.

Typical responsibilities:

- List classes
- Create class mappings
- Fetch students for a class

#### `backend/routes/attendanceRoutes.js`
Attendance endpoints.

Typical responsibilities:

- Mark attendance
- Upload attendance in bulk
- Read attendance data

#### `backend/routes/marksRoutes.js`
Marks endpoints.

Typical responsibilities:

- Create marks
- Upload multiple marks
- List marks
- Load comparison data
- Fetch or update a single record

#### `backend/routes/noteRoutes.js`
Notes endpoints.

Typical responsibilities:

- Upload a note file
- List notes
- Update or delete notes

#### `backend/routes/notificationRoutes.js`
Notification endpoints.

Typical responsibilities:

- Fetch notifications
- Mark notifications as read
- Send notices to a class

#### `backend/routes/reportRoutes.js`
Report endpoints.

Typical responsibilities:

- Generate PDF reports for students

#### `backend/routes/timetableRoutes.js`
Timetable endpoints.

Typical responsibilities:

- Create timetable entries
- List schedules
- Update and delete entries

### 3.7 Backend Utilities

#### `backend/utils/generateToken.js`
Creates JWT tokens.

How it works:

- Signs a payload with `JWT_SECRET`.
- Typically gives tokens a fixed expiration window.

#### `backend/utils/calculateAttendance.js`
Calculates attendance summary values.

How it works:

- Turns attendance records into a percentage or count summary.

#### `backend/utils/notifications.js`
Shared notification and class-matching logic.

What it does:

- Normalizes class names.
- Builds class-matching regex patterns.
- Creates notification records.
- Emits Socket.io events to connected clients.

Why it matters:

- This keeps attendance, marks, and class-based notifications consistent across the app.

#### `backend/utils/uploadPath.js`
Converts file paths into a web-safe URL form.

How it works:

- Helps the frontend consume uploaded file paths from Windows-style paths or local storage paths.

### 3.8 Backend Scripts

#### `backend/scripts/seedSchoolData.js`
Seeds sample school data into MongoDB.

What it does:

- Creates sample students and teachers.
- Builds class-to-subject-to-teacher mappings.
- Prints a summary of what was created.

Use case:

- Development setup and repeatable test data.

#### `backend/scripts/clearDatabase.js`
Deletes all documents from the main collections.

What it does:

- Clears users, attendance, classes, marks, notes, notifications, and timetables.

Use case:

- Full reset during local development or cleanup.

#### `backend/scripts/migrateAttendanceSubjects.js`
Backfills missing attendance subject values.

What it does:

- Finds records with empty or missing subject values.
- Sets a fallback subject for old records.

Use case:

- Data migration for older records created before the subject field was standardized.

#### `backend/scripts/backfillAttendanceSubjectByDate.js`
Targeted attendance backfill utility.

What it does:

- Accepts class, teacher, date, and subject arguments.
- Updates attendance records for a specific day.

Use case:

- Manual correction of old attendance data.

### 3.9 Backend Tests

#### `backend/tests/api.test.js`
Backend test suite.

What it does:

- Uses `supertest` to exercise API behavior.
- Mocks the database models and middleware so tests run without a live MongoDB instance.

Use case:

- Verifying route structure and controller behavior.

### 3.10 Backend Data and Runtime Files

#### `backend/uploads/`
Stored uploaded files.

What it is:

- A persistent folder for uploaded notes or related file attachments.

How it works:

- Files are saved here by the note upload flow and served statically through Express.

#### `backend/node_modules/`
Installed backend dependencies.

What it is:

- Generated by the package manager.
- Not part of the source logic.

## 4. Frontend Structure

### 4.1 Frontend Entry Files

#### `frontend/src/index.js`
React app bootstrap file.

What it does:

- Renders the root React application.
- Wraps the app in `BrowserRouter` so route navigation works.
- Imports global styles.
- Calls web vitals reporting.

#### `frontend/src/App.js`
Main route registry and app initialization logic.

What it does:

- Defines all app routes.
- Guards protected pages using `ProtectedRoute`.
- Initializes the Socket.io connection when a token exists.
- Restores the user session if a token is stored but the user object is missing.

How it works:

- This file is the top-level navigation map for the entire React app.

### 4.2 Frontend Configuration

#### `frontend/package.json`
Defines frontend dependencies and scripts.

Key scripts:

- `start` launches the dev server.
- `build` creates the production bundle.
- `test` runs the React test runner.

#### `frontend/README.md`
Project-level frontend notes.

What it usually contains:

- Setup steps
- Available scripts
- Development guidance

#### `frontend/package-lock.json`
Locks dependency versions for the frontend.

### 4.3 Frontend Pages

Each file in `frontend/src/pages/` is a screen in the application.

#### `frontend/src/pages/WelcomePage.js`
Landing page shown before login.

How it works:

- Introduces the school management system.
- Provides links to login and registration.
- Displays marketing or overview sections.

#### `frontend/src/pages/LoginPage.js`
Login form.

How it works:

- Collects email and password.
- Sends credentials to the backend.
- Saves auth data when login succeeds.

#### `frontend/src/pages/RegisterPage.js`
User registration form.

How it works:

- Collects name, email, password, role, and class when needed.
- Sends a registration request to the backend.

#### `frontend/src/pages/DashboardPage.js`
Main post-login dashboard.

How it works:

- Loads overview data for the current user.
- Shows quick links and summary cards.
- For teachers, also displays recent updates and school activity information.

#### `frontend/src/pages/ClassesPage.js`
Class overview and assignment page.

How it works:

- Shows class data relevant to the logged-in user.
- Lets teachers review class and subject assignments.

#### `frontend/src/pages/AttendancePage.js`
Attendance marking page.

How it works:

- Lets teachers mark attendance for a class.
- Submits attendance records to the backend.

#### `frontend/src/pages/AttendanceListPage.js`
Attendance records list page.

How it works:

- Shows saved attendance entries.
- Supports analytics or review flows for teachers and students.

#### `frontend/src/pages/MarksPage.js`
Marks entry page.

How it works:

- Lets teachers enter marks for a test.
- Sends marks data to the backend.

#### `frontend/src/pages/MarksListPage.js`
Marks overview page.

How it works:

- Lists mark records.
- Gives teachers a path to update an existing record.

#### `frontend/src/pages/UpdateMarksPage.js`
Marks edit page.

How it works:

- Loads one mark record.
- Allows teachers to update test name and score values.
- Saves the updated record back to the backend.

#### `frontend/src/pages/NotesPage.js`
Notes upload and browse page.

How it works:

- Teachers upload study material files.
- Students filter and search available notes.
- Uses file URL helpers so uploaded files can be opened in the browser.

#### `frontend/src/pages/TimetablePage.js`
Timetable management page.

How it works:

- Lets teachers upload or manage timetable data.
- Shows timetable entries to users.

#### `frontend/src/pages/NotificationsPage.js`
Notification and notice-board page.

How it works:

- Students see notices and unread alerts.
- Teachers can post class notices.
- The page also marks notifications as read after they are fetched.

#### `frontend/src/pages/ReportPage.js`
Report access page.

How it works:

- Lets students open or download their generated PDF report.
- Teachers or non-students are redirected to the dashboard.

### 4.4 Frontend Components

#### `frontend/src/components/ProtectedRoute.js`
Route guard component.

What it does:

- Checks whether the user is authenticated.
- Redirects to login if not.

#### `frontend/src/components/PageShell.js`
Common layout wrapper.

What it does:

- Renders the sidebar.
- Wraps page content in the common application layout.
- Displays page titles, subtitles, and action buttons consistently.

#### `frontend/src/components/Sidebar.js`
Main navigation sidebar.

What it does:

- Shows navigation links based on the logged-in user role.
- Provides logout action.
- Drives the primary in-app navigation experience.

#### `frontend/src/components/ui/`
Placeholder directory for reusable UI pieces.

Current status:

- This folder is empty after cleanup and can be reused later for shared components.

### 4.5 Frontend Services

#### `frontend/src/services/api.js`
Axios client for API requests.

What it does:

- Points requests to the backend base URL.
- Automatically attaches the stored token.
- Clears auth when the API returns unauthorized responses.

#### `frontend/src/services/socket.js`
Socket.io client wrapper.

What it does:

- Creates and manages the live socket connection.
- Listens for real-time updates from the backend.
- Helps the UI react to new attendance, marks, or notification events.

### 4.6 Frontend Utilities

#### `frontend/src/utils/auth.js`
Local storage auth helpers.

What it does:

- Saves token and user data.
- Reads token and user data safely.
- Clears auth state on logout.

#### `frontend/src/utils/fileUrl.js`
File URL helper.

What it does:

- Converts backend file paths into browser-friendly URLs.

### 4.7 Frontend Styling

#### `frontend/src/index.css`
Global styles.

What it does:

- Sets the design system for layout, spacing, tables, cards, buttons, and responsive behavior.
- Controls most of the overall visual appearance of the app.

#### `frontend/src/App.css`
App-specific styles.

What it does:

- Keeps component-level or page-level styles that are specific to the React app shell.

### 4.8 Frontend Test and Utility Files

#### `frontend/src/reportWebVitals.js`
Web vitals reporting helper.

What it does:

- Measures performance metrics when enabled.

#### `frontend/src/App.test.js`
Legacy starter test file.

Current status:

- Removed from the current workspace cleanup because it was not used by the project.

#### `frontend/src/setupTests.js`
Test setup file for React Testing Library and Jest DOM helpers.

Current status:

- Also removed during cleanup because it was unused in the current project setup.

#### `frontend/src/logo.svg`
Default CRA logo asset.

Current status:

- Removed because the application uses its own branding and no longer relies on the starter logo.

### 4.9 Frontend Public Assets

#### `frontend/public/index.html`
HTML shell for the React app.

What it does:

- Provides the root `div` where React mounts.

#### `frontend/public/manifest.json`
Progressive web app metadata.

What it does:

- Supplies app name, icons, and install metadata.

#### `frontend/public/robots.txt`
Search engine crawling instructions.

What it does:

- Tells crawlers which paths can or cannot be indexed.

#### `frontend/public/favicon.ico`, `logo192.png`, `logo512.png`
Public icon assets.

What they do:

- Provide browser tab icons and install icons for the app.

### 4.10 Frontend Runtime and Generated Files

#### `frontend/build/`
Production build output.

Current status:

- This directory is generated by the frontend build process and should not be treated as source code.
- It was removed from the workspace cleanup because it is a build artifact.

#### `frontend/node_modules/`
Installed frontend dependencies.

Current status:

- Generated by the package manager and not part of the application logic.

## 5. How the Backend and Frontend Work Together

### Authentication

- The frontend sends login and registration requests to the backend auth routes.
- The backend creates JWT tokens and returns user data.
- The frontend stores the token and user in local storage.
- Protected routes and API requests use that stored token to keep the session active.

### Data Loading

- Pages such as attendance, marks, notes, timetable, and notifications load data from the backend API.
- Backend controllers query MongoDB models and return JSON responses.

### Real-Time Updates

- The backend can emit Socket.io events when teachers post new data.
- The frontend connects through `socket.js` and updates the UI when those events arrive.

### File Uploads

- Teachers upload files through the frontend forms.
- The backend stores the file in `backend/uploads/` and saves metadata in MongoDB.
- The frontend uses `fileUrl.js` to display or open those files correctly.

### Notifications

- Backend controller logic creates persistent notification records.
- The frontend notification page fetches those records and marks them read after they are shown.

## 6. Notes on Cleanup and Current State

- The unused frontend scaffold files and the ad hoc root/backend API test scripts were removed during cleanup.
- The `frontend/build/` folder was also removed because it is a generated artifact.
- The remaining source tree is the active project code.

## 7. Quick Reading Order

If you want to understand the app quickly, read the files in this order:

1. `backend/server.js`
2. `backend/app.js`
3. `backend/routes/authRoutes.js`
4. `backend/controllers/authController.js`
5. `frontend/src/index.js`
6. `frontend/src/App.js`
7. `frontend/src/services/api.js`
8. `frontend/src/services/socket.js`
9. `frontend/src/components/PageShell.js`
10. `frontend/src/pages/DashboardPage.js`
