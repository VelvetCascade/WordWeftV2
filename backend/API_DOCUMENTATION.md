
# WordWeft API Documentation

Base URL: `http://localhost:8080/api`

## Authentication

### Login
**POST** `/auth/login`
Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "token": "ey... (JWT)",
  "type": "Bearer",
  "id": "651...",
  "username": "user123",
  "email": "user@example.com",
  "avatarUrl": "...",
  "roles": ["ROLE_USER"]
}
```

### Signup
**POST** `/auth/signup`
Registers a new user.

**Request Body:**
```json
{
  "username": "writer_extraordinaire",
  "email": "writer@example.com",
  "password": "StrongPassword123!"
}
```

**Response (200 OK):**
Returns same structure as Login response (auto-login).

---

## User Management

**Headers Required**: `Authorization: Bearer <token>`

### Get Current User Profile
**GET** `/users/me`

**Response (200 OK):**
```json
{
  "id": "...",
  "username": "writer_extraordinaire",
  "email": "writer@example.com",
  "avatarUrl": "...",
  "joinDate": "2024-06-15",
  "stats": {
    "booksRead": 0,
    "chaptersRead": 0,
    "favoriteGenres": []
  }
}
```

### Update Profile
**PATCH** `/users/me`

**Request Body** (All fields optional):
```json
{
  "name": "New Display Name",
  "avatarUrl": "http://...",
  "bio": "I write sci-fi."
}
```

### Change Password
**PUT** `/users/me/password`

**Request Body:**
```json
{
  "oldPassword": "oldPassword123!",
  "newPassword": "newSecurePassword123!"
}
```

**Response (200 OK):**
String message confirming update.
