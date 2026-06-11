# API Documentation

## Overview

The Acaripole API is a RESTful service that communicates with JSON payloads. All requests should include `Content-Type: application/json`.

## Base URL

```
Development:  http://localhost:3000/api
Production:   https://api.acaripole.com/api
```

## Response Format

### Success Response (2xx)
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

## Authentication

Requests to protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

## Endpoints

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-05-18T10:30:00Z"
}
```

## Planned Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123",
  "passwordConfirm": "password123"
}
```

### Users

#### Get Current User
```http
GET /api/users/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-05-18T10:30:00Z"
  }
}
```

#### Update User
```http
PUT /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

## Pagination (Future)

List endpoints will support pagination:

```http
GET /api/users?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

## Rate Limiting (Future)

- Limit: 100 requests per minute per IP
- Headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "User not found"
}
```

Common error messages:
- "Invalid request body"
- "Missing required field: {field}"
- "User not found"
- "Email already in use"
- "Unauthorized"
- "Internal server error"

## CORS

The API allows requests from:
- Development: `http://localhost:5173`
- Production: `https://acaripole.com`

## Testing API

### Using cURL
```bash
curl -X GET http://localhost:3000/api/health
```

### Using Thunder Client (VS Code)
1. Install Thunder Client extension
2. Create new request
3. Set method and URL
4. Add headers if needed
5. Execute

### Using Postman
1. Import collection (future)
2. Set base URL to `http://localhost:3000/api`
3. Test endpoints

## Changelog

### v0.0.1 (Initial)
- Health check endpoint
- Planned endpoints for authentication & users
