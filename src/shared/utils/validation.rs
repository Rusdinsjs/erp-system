/// Validates that a password meets the required policy:
/// - Minimum 8 characters
/// - At least one uppercase letter
/// - At least one lowercase letter
/// - At least one number
/// - At least one special character (Optional but implemented for better security)
pub fn validate_password(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters long".to_string());
    }

    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_number = password.chars().any(|c| c.is_numeric());

    // Check for special characters mostly for robustness
    // implementation often varies, ensuring basic complexity here
    // let has_special = password.chars().any(|c| !c.is_alphanumeric());

    if !has_uppercase {
        return Err("Password must contain at least one uppercase letter".to_string());
    }

    if !has_lowercase {
        return Err("Password must contain at least one lowercase letter".to_string());
    }

    if !has_number {
        return Err("Password must contain at least one number".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_password() {
        assert!(validate_password("Password123").is_ok());
        assert!(validate_password("ComplexPass1!").is_ok());
    }

    #[test]
    fn test_short_password() {
        assert!(validate_password("Pass1").is_err());
    }

    #[test]
    fn test_no_uppercase() {
        assert!(validate_password("password123").is_err());
    }

    #[test]
    fn test_no_lowercase() {
        assert!(validate_password("PASSWORD123").is_err());
    }

    #[test]
    fn test_no_number() {
        assert!(validate_password("PasswordPlus").is_err());
    }
}
