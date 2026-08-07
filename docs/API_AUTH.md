# API Authentication Guide - ERPQu 1.0

ERPQu 1.0 menggunakan JSON Web Tokens (JWT) berbasis HMAC SHA-256 untuk otentikasi aman di seluruh rute API.

---

## 🔑 Header & Query Authorization

Semua rute API terlindungi membutuhkan Token JWT yang valid.

### 1. Authorization via HTTP Header (Default)
Format standar:
```http
Authorization: Bearer <jwt_token_here>
```

### 2. Authorization via Query Parameter (`?token=...`)
Khusus untuk elemen HTML yang tidak mendukung custom HTTP Header secara langsung (seperti tag `<img>`, preview PDF/preview dokumen, dan *asset media streaming*), server ERPQu 1.0 mendukung ekstraksi JWT melalui parameter URL:
```http
GET /api/uploads/assets/photo.png?token=<jwt_token_here>
```

---

## 🔐 Flow Otentikasi & Rute Utama

1. **Login User**: `POST /api/auth/login`
   - **Request**: `{ "email": "admin@example.com", "password": "..." }`
   - **Response**: `{ "success": true, "token": "...", "user": { ... } }`
2. **Autentikasi Sesi**: Rute dilindungi memeriksa klaim JWT (`user_id`, `role_code`, `role_level`).
3. **Masa Berlaku Token**: Token berlaku selama 24 jam.

---

## ⚠️ Penanganan Error Status Code

- **`401 Unauthorized`**: Token tidak ditemukan, kadaluarsa, atau tanda tangan HMAC tidak valid.
- **`403 Forbidden`**: Pengguna tidak memiliki izin role/DocPerm yang cukup.
- **`404 Not Found`**: Resource atau entitas tidak ditemukan di database.
