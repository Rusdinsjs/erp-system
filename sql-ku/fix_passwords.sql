-- Fix corrupted password hashes
UPDATE users 
SET password_hash = '$argon2id$v=19$m=19456,t=2,p=1$TP8PZIwf0JaE1YEOZwgGMg$9z4WYIvT8BW65k1G8U05wN5Zun695WsylcWQBpg5bQQ';
