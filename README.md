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

```text
src/
├── controllers/
│   ├── authController.js
│   └── userController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   └── validate.js
├── models/
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   └── userRoutes.js
├── validators/
│   └── userValidation.js
```

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
