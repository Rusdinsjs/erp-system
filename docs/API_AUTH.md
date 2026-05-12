# API Authentication Guide

The Management System uses JSON Web Tokens (JWT) for secure authentication.

## Overview

All protected endpoints require a valid JWT token in the `Authorization` header.

**Header Format:**
```
Authorization: Bearer <your_token_here>
```

## Authentication Flow

1.  **Login**: Send credentials to `/api/auth/login`.
    -   **Response**: `200 OK` with `{ "token": "...", "user": { ... } }`.
2.  **Access**: Use the returned `token` for subsequent requests.
3.  **Expiry**: Tokens are valid for 24 hours (configurable).

## Endpoints

### 1. Login
**POST** `/api/auth/login`

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### 2. Register
**POST** `/api/auth/register` (Public)

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "Secret123!",
  "name": "John Doe"
}
```

## Error Handling

-   **401 Unauthorized**: Token is missing, invalid, or expired.
-   **403 Forbidden**: User lacks permission for the resource.

## RBAC (Role-Based Access Control)

Roles (Admin, User, etc.) determine permissions. The token claims include the user's role and permission scope. The backend validates these claims against the endpoint requirements.
