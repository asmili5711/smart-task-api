# Auth & RBAC Module

This module adds secure authentication and role-based access control (RBAC) to the Smart Task Management API.

It supports user signup, login with JWT, protected routes, and admin-only access using reusable middleware.

## What This Module Does

- Registers new users
- Logs in users and returns a JWT token
- Hashes passwords before saving them
- Protects private routes with authentication middleware
- Restricts admin-only routes with role-based authorization

## Features

- Public signup endpoint
- Public login endpoint
- Password hashing using `bcryptjs`
- JWT-based authentication
- Protected route support
- Admin-only route support
- Reusable auth and role middleware
- MongoDB Atlas connection with Mongoose

## Roles

This module currently uses these roles:

- `USER`
- `ADMIN`

### Access Rules

- Any user can sign up
- Logged-in users can access protected routes
- Only `ADMIN` users can access admin-only routes

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


## API Endpoints

### Signup
`POST /api/auth/signup`

Request body:

```json
{
  "name": "John",
  "email": "john@example.com",
  "password": "123456"
}


Login
POST /api/auth/login

Request body:

{
  "email": "john@example.com",
  "password": "123456"
}
Response:

{
  "message": "Login successful",
  "token": "JWT_TOKEN"
}

Protected Route
GET /api/protected

Requires a valid JWT token.

Admin Route
GET /api/admin

Requires:

valid JWT token
user role must be ADMIN
Project Structure
src/
├── controllers/
│   └── authController.js
├── middleware/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
├── models/
│   └── User.js
├── routes/
│   └── authRoutes.js
Tech Stack
Node.js
Express.js
MongoDB Atlas
Mongoose
bcryptjs
jsonwebtoken
Security Notes
Passwords are hashed before storing
JWT is used for stateless authentication
Unauthorized requests return 401
Forbidden requests return 403
Passwords are not returned in API responses
Design Choices
Authentication and authorization are separated using middleware
JWT was chosen to keep authentication stateless and simple
RBAC is used to control access based on user role
The structure is kept modular for easier scaling and maintenance
Testing
Tested manually using Postman for:

Signup
Login
JWT authentication
Protected route access
Admin-only route access
Invalid token handling
Forbidden access handling
Limitations
Current limitations of this module:

No refresh token support
No password reset feature
No email verification
No rate limiting
Summary
This module provides the core security layer for the API by combining:

user authentication
password security
token-based access
role-based authorization