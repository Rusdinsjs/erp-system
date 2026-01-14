use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

fn main() {
    let password = "admin123";
    let seed_hash = "$argon2id$v=19$m=19456,t=2,p=1$7FSBqJLqHv3j3D1fE2cmLA$M2H2AXqxWu2cqjLnmFB8FvXKmeFO7hhZnFVD7dEbQcE";

    println!("Testing password: '{}'", password);
    println!("Testing hash: '{}'", seed_hash);

    let parsed_hash = PasswordHash::new(seed_hash).unwrap();
    let argon2 = Argon2::default();

    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(_) => println!("SUCCESS: Hash matches password!"),
        Err(e) => {
            println!("FAILURE: Hash verification failed: {}", e);

            // Generate a correct hash to compare
            let salt = SaltString::generate(&mut OsRng);
            let new_hash = argon2
                .hash_password(password.as_bytes(), &salt)
                .unwrap()
                .to_string();
            println!(
                "Here is a VALID hash for '{}' using current config:\n{}",
                password, new_hash
            );
        }
    }
}
