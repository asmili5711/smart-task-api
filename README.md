# Smart Task API

This project is a Node.js and Express API for smart task management. It includes authentication, role-based access control, and user management features built in separate feature branches and documented together here.

## Overview

The API is split into two main parts:

- Authentication and RBAC
- User management and profile APIs

Together, they provide secure signup, login, protected routes, admin-only access, and validated user CRUD operations.

## Features

- User signup
- User login with JWT authentication
- Password hashing using `bcryptjs`
- Protected routes using middleware
- Role-based access control
- Admin-only route protection
- View and update own profile
- Admin user management APIs
- Request validation using Joi
- MongoDB Atlas connection with Mongoose

## Roles

The application currently uses these roles:

- `USER`
- `ADMIN`
- `MANAGER` for admin-created users

### Access Rules

- Any user can sign up
- Signup always creates a `USER`
- Logged-in users can access protected routes
- Only `ADMIN` users can access admin-only routes
- Users can manage only their own profile
- Admins can manage users
- Admins cannot create another `ADMIN`
- Admins cannot delete their own account
- Admins cannot delete another admin

## Authentication Flow

1. A user signs up with `name`, `email`, and `password`
2. The password is hashed before storing it in the database
3. The user logs in with valid credentials
4. The server verifies the credentials
5. A JWT token is generated and returned
6. The client sends the token in the `Authorization` header
7. Middleware verifies the token before allowing access to protected routes

## Token Format

Send the token like this in request headers:

```http
Authorization: Bearer <token>
```

## API Endpoints

### Authentication

#### Signup
`POST /api/auth/signup`

Request body:

```json
{
  "name": "John",
  "email": "john@example.com",
  "password": "123456"
}
```

#### Login
`POST /api/auth/login`

Request body:

```json
{
  "email": "john@example.com",
  "password": "123456"
}
```

Response:

```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN"
}
```

### Protected Routes

#### Protected Route
`GET /api/protected`

Requires a valid JWT token.

#### Admin Route
`GET /api/admin`

Requires:

- valid JWT token
- user role must be `ADMIN`

### User Management

#### Get My Profile
`GET /api/users/me`

Returns the authenticated user's profile.

#### Update My Profile
`PUT /api/users/me`

Request body:

```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

#### Create User by Admin
`POST /api/users`

Request body:

```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "123456",
  "role": "USER"
}
```

Allowed roles for this endpoint:

- `USER`
- `MANAGER`

#### Get All Users
`GET /api/users`

Returns the list of all users. Admin only.

#### Get User by ID
`GET /api/users/:id`

Returns a single user by MongoDB ObjectId. Admin only.

#### Delete User by ID
`DELETE /api/users/:id`

Deletes a user by MongoDB ObjectId. Admin only.

## Validation Rules

- `name` must be at least 2 characters
- `email` must be valid
- `password` must be at least 6 characters
- `role` is optional on admin create
- Unknown fields are stripped from request bodies
- Invalid ObjectId values return `400`
- Profile update requires at least one field

## Project Structure

## Project Structure

```text
src/
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   └── taskController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   └── validate.js
├── models/
│   ├── User.js
│   └── Task.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   └── taskRoutes.js
├── validators/
│   ├── userValidation.js
│   └── taskValidation.js


## Tech Stack

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- `bcryptjs`
- `jsonwebtoken`
- `joi`

## Security Notes

- Passwords are hashed before storing
- JWT is used for stateless authentication
- Unauthorized requests return `401`
- Forbidden requests return `403`
- Not found responses return `404`
- Passwords are not returned in API responses

## Design Choices

- Authentication and authorization are separated using middleware
- JWT was chosen to keep authentication stateless and simple
- RBAC is used to control access based on user role
- Validation is separated from controller logic
- The structure is kept modular for easier scaling and maintenance

## Testing

Tested manually using Postman for:

- Signup
- Login
- JWT authentication
- Protected route access
- Admin-only route access
- Profile access and update
- Admin user creation
- Listing users
- Getting and deleting users by ID
- Invalid input validation
- Invalid ObjectId handling
- RBAC restrictions
- Self-delete prevention
- Admin-delete-admin prevention

## Limitations

Current limitations of this module:

- No refresh token support
- No password reset feature
- No email verification
- No rate limiting

## Summary

This API combines:

- user authentication
- password security
- token-based access
- role-based authorization
- profile management
- admin user management




## Task Management Module

This module adds task handling to the Smart Task API. It supports creating, viewing, updating, assigning, and deleting tasks with role-based access control.

### Features

- Create task
- View all tasks
- View task by id
- Update task
- Assign task to a user
- Delete task
- Pagination for task list
- Query validation for task list

### Roles & Access

- `ADMIN` can create, update, assign, view, and delete any task
- `MANAGER` can create tasks, view tasks they created, update their own tasks, and assign their own tasks
- `USER` can view assigned tasks and update task status if assigned

### API Endpoints

- `POST /api/tasks`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `PATCH /api/tasks/:id/assign`
- `DELETE /api/tasks/:id`

### Validation

- `title`, `priority`, `dueDate`, and `assignedTo` are validated
- invalid task ids return `400`
- invalid query params are rejected
- unknown fields are stripped

### Redis Cache Setup

Redis is used to cache the `GET /api/tasks` response so repeated task list requests can be served faster.

Environment variables used:

```env
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=60
```

If you run the project through WSL, start Redis inside WSL before starting the Node app:

```bash
sudo service redis-server start
redis-cli ping
```

If Redis is running correctly, `redis-cli ping` returns:

```text
PONG
```

How caching works:

- `GET /api/tasks` first checks Redis for a cached response
- if cache is found, the API returns the cached data
- if cache is missing or expired, the API fetches data from MongoDB
- the fresh response is saved in Redis for the number of seconds set in `CACHE_TTL_SECONDS`
- task cache is cleared after create, update, assign, and delete operations so old task data is not served

### Testing

Tested manually using Postman for:
- task creation
- task listing
- task details
- task update
- task assignment
- task deletion
- admin, manager, and user role restrictions

## Dashboard Stats Module

This module adds a dashboard summary endpoint for admin users.

### Features

- View total users
- View total admins
- View total managers
- View total normal users
- View total tasks
- View task counts by status
- View task counts by priority

### Roles & Access

- `ADMIN` can access dashboard stats
- `MANAGER` and `USER` cannot access dashboard stats

### API Endpoint

- `GET /api/dashboard/stats`

### Response Summary

The dashboard stats response includes:

- user counts by role
- task counts by status: `todo`, `in-progress`, `done`, `overdue`
- task counts by priority: `low`, `medium`, `high`

### Testing

Tested manually using Postman for:

- admin access to dashboard stats
- unauthorized access without token
- forbidden access for non-admin users
- returned counts for users, task statuses, and task priorities


## ⚙️ Background Job Processing (Queue System)

This project uses **BullMQ** (Redis-based queue) to handle background tasks asynchronously, improving performance and scalability.

### 🧠 Why Queue is Used

Instead of processing heavy or non-critical operations during API requests, jobs are offloaded to a background worker.

**Without Queue:**

```
API → Process everything → Slow response
```

**With Queue:**

```
API → Add job → Fast response
             ↓
        Worker processes job in background
```

---

## 🛠️ Technologies Used

* **BullMQ** – Job queue management
* **Redis** – Queue storage and job state management

---

## 🔄 Implemented Queues

### 1. Notification Queue

Handles task-related notifications.

**Triggers:**

* Task creation
* Task assignment

**Worker Responsibilities:**

* Saves notification in database
* Enables future support for in-app notifications and email delivery

---

### 2. AI Queue

Handles background processing for task insights.

**Trigger:**

* Task creation

**Worker Responsibilities:**

* Generates a placeholder AI insight
* Stores insight in the Task document

> Note: This will be upgraded with real LLM integration in a future feature branch.

---

## 🧱 Architecture Flow

```
API → Queue → Worker → Database
```

* API remains fast and non-blocking
* Workers handle processing asynchronously
* Results are persisted in MongoDB

---

## 🔁 Retry & Failure Handling

* Jobs are retried up to **3 times**
* Exponential backoff is applied between retries
* Failed jobs are retained in Redis for debugging

Basic failure logging is implemented to track job errors.

---

## ⚡ Benefits

* Faster API responses
* Improved scalability
* Separation of concerns
* Foundation for future features like:

  * Email notifications
  * AI-based task insights
  * Scheduled jobs (cron)

---

## 📌 Current Status

✔ Queue system implemented
✔ Notification processing stored in DB
✔ AI placeholder processing implemented
⚠ Advanced failure handling and monitoring can be added in future improvements

---


