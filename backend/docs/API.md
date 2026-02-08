# API Documentation – Multivendor Food Delivery System

## Base URL

```
http://localhost:2002/api
```

All endpoints are prefixed with `/api`.

---

## Authentication

Protected endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

---

## Auth Endpoints (`/api/auth`)

### 1. Register Customer

|            |                      |
| ---------- | -------------------- |
| **Method** | `POST`               |
| **Path**   | `/api/auth/register` |
| **Auth**   | None                 |

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "StrongP@ss1",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "664a..."
  }
}
```

**Error Codes:** `400` Validation error · `409` Email/phone already exists

---

### 2. Login

|            |                   |
| ---------- | ----------------- |
| **Method** | `POST`            |
| **Path**   | `/api/auth/login` |
| **Auth**   | None              |

**Request Body:**

```json
{
  "emailOrPhone": "user@example.com",
  "password": "StrongP@ss1"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "664a...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "isEmailVerified": false
    }
  }
}
```

**Error Codes:** `401` Invalid credentials / Account locked · `400` Validation error

---

### 3. Refresh Token

|            |                     |
| ---------- | ------------------- |
| **Method** | `POST`              |
| **Path**   | `/api/auth/refresh` |
| **Auth**   | None                |

**Request Body:**

```json
{
  "refreshToken": "eyJ..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Error Codes:** `401` Invalid/expired refresh token

---

### 4. Logout

|            |                    |
| ---------- | ------------------ |
| **Method** | `POST`             |
| **Path**   | `/api/auth/logout` |
| **Auth**   | Required           |

**Request Body (optional):**

```json
{
  "refreshToken": "eyJ..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 5. Verify Email

|            |                                 |
| ---------- | ------------------------------- |
| **Method** | `GET`                           |
| **Path**   | `/api/auth/verify-email/:token` |
| **Auth**   | None                            |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Error Codes:** `401` Invalid/expired token

---

### 6. Resend Verification Email

|            |                                 |
| ---------- | ------------------------------- |
| **Method** | `POST`                          |
| **Path**   | `/api/auth/resend-verification` |
| **Auth**   | None                            |

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Verification email sent"
}
```

**Error Codes:** `400` Already verified · `404` User not found

---

### 7. Forgot Password

|            |                             |
| ---------- | --------------------------- |
| **Method** | `POST`                      |
| **Path**   | `/api/auth/forgot-password` |
| **Auth**   | None                        |

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent"
}
```

---

### 8. Reset Password

|            |                            |
| ---------- | -------------------------- |
| **Method** | `POST`                     |
| **Path**   | `/api/auth/reset-password` |
| **Auth**   | None                       |

**Request Body:**

```json
{
  "token": "abc123...",
  "newPassword": "NewStrongP@ss1"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Error Codes:** `400` Validation error · `401` Invalid/expired token

---

### 9. Change Password

|            |                             |
| ---------- | --------------------------- |
| **Method** | `PUT`                       |
| **Path**   | `/api/auth/change-password` |
| **Auth**   | Required                    |

**Request Body:**

```json
{
  "currentPassword": "OldP@ss1",
  "newPassword": "NewStrongP@ss1"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Codes:** `400` Validation error · `401` Current password incorrect

---

## User Endpoints (`/api/users`)

All user endpoints require authentication.

### 1. Get Current User Profile

|            |                 |
| ---------- | --------------- |
| **Method** | `GET`           |
| **Path**   | `/api/users/me` |
| **Auth**   | Required        |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "user": { "...user fields..." },
    "customerProfile": { "...profile fields..." }
  }
}
```

---

### 2. Update Profile

|            |                 |
| ---------- | --------------- |
| **Method** | `PUT`           |
| **Path**   | `/api/users/me` |
| **Auth**   | Required        |

**Request Body (all fields optional):**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phoneNumber": "+1987654321",
  "profileImage": "https://example.com/avatar.jpg",
  "dateOfBirth": "1995-06-15"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { "user": { "..." } }
}
```

**Error Codes:** `400` Validation / under 18 · `409` Phone already in use

---

### 3. Add Address

|            |                           |
| ---------- | ------------------------- |
| **Method** | `POST`                    |
| **Path**   | `/api/users/me/addresses` |
| **Auth**   | Required                  |

**Request Body:**

```json
{
  "type": "home",
  "street": "123 Main St",
  "apartment": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "US",
  "coordinates": { "latitude": 40.7128, "longitude": -74.006 },
  "isDefault": true
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Address added successfully",
  "data": { "address": { "..." } }
}
```

---

### 4. Update Address

|            |                                      |
| ---------- | ------------------------------------ |
| **Method** | `PUT`                                |
| **Path**   | `/api/users/me/addresses/:addressId` |
| **Auth**   | Required                             |

**Request Body:** Partial address fields.

**Success Response (200):**

```json
{
  "success": true,
  "message": "Address updated successfully",
  "data": { "address": { "..." } }
}
```

---

### 5. Delete Address

|            |                                      |
| ---------- | ------------------------------------ |
| **Method** | `DELETE`                             |
| **Path**   | `/api/users/me/addresses/:addressId` |
| **Auth**   | Required                             |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Address deleted"
}
```

**Error Codes:** `400` Cannot delete only address · `404` Address not found

---

### 6. Set Default Address

|            |                                                  |
| ---------- | ------------------------------------------------ |
| **Method** | `PATCH`                                          |
| **Path**   | `/api/users/me/addresses/:addressId/set-default` |
| **Auth**   | Required                                         |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Default address updated",
  "data": { "address": { "..." } }
}
```

---

### 7. Update Customer Preferences

|            |                             |
| ---------- | --------------------------- |
| **Method** | `PUT`                       |
| **Path**   | `/api/users/me/preferences` |
| **Auth**   | Required (customer only)    |

**Request Body:**

```json
{
  "dietaryPreferences": ["vegetarian", "gluten-free"],
  "notifications": {
    "email": true,
    "sms": false,
    "push": true,
    "orderUpdates": true,
    "promotions": false
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": { "preferences": { "..." } }
}
```

---

### 8. Add Favorite Restaurant

|            |                                         |
| ---------- | --------------------------------------- |
| **Method** | `POST`                                  |
| **Path**   | `/api/users/me/favorites/:restaurantId` |
| **Auth**   | Required (customer only)                |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Added to favorites"
}
```

---

### 9. Remove Favorite Restaurant

|            |                                         |
| ---------- | --------------------------------------- |
| **Method** | `DELETE`                                |
| **Path**   | `/api/users/me/favorites/:restaurantId` |
| **Auth**   | Required (customer only)                |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Removed from favorites"
}
```

---

### 10. Get Favorite Restaurants

|            |                           |
| ---------- | ------------------------- |
| **Method** | `GET`                     |
| **Path**   | `/api/users/me/favorites` |
| **Auth**   | Required (customer only)  |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": { "favorites": ["...restaurant objects..."] }
}
```

---

### 11. Deactivate Account

|            |                 |
| ---------- | --------------- |
| **Method** | `DELETE`        |
| **Path**   | `/api/users/me` |
| **Auth**   | Required        |

**Request Body:**

```json
{
  "password": "CurrentP@ss1"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Account deactivated"
}
```

**Error Codes:** `400` Password required · `401` Password incorrect

---

## Common Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["optional", "array", "of", "details"]
}
```

## Password Requirements

- Minimum 8 characters, maximum 128
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

## Rate Limits

| Endpoint       | Limit                         |
| -------------- | ----------------------------- |
| Login          | 5 requests / 15 min per IP    |
| Registration   | 3 requests / 1 hour per IP    |
| Password Reset | 3 requests / 1 hour per email |
| General API    | 100 requests / 15 min per IP  |
