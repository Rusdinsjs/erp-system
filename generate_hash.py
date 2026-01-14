import argon2
ph = argon2.PasswordHasher()
print(ph.hash("admin123"))
