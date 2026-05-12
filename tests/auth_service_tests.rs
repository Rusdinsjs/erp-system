use management_system::application::services::AuthService;
use management_system::infrastructure::repositories::{
    EmployeeRepository, RbacRepository, UserRepository,
};
use management_system::shared::utils::jwt::JwtConfig;
use uuid::Uuid;

mod common;

#[tokio::test]
async fn test_auth_flow() {
    // 1. Setup
    let pool = common::setup().await;

    let user_repo = UserRepository::new(pool.clone());
    let rbac_repo = RbacRepository::new(pool.clone());
    let employee_repo = EmployeeRepository::new(pool.clone());
    let jwt_config = JwtConfig::new("test_secret".to_string(), 24);

    let auth_service = AuthService::new(user_repo, rbac_repo, employee_repo, jwt_config);

    // 2. Register
    let unique_id = Uuid::new_v4();
    let email = format!("test_{}@example.com", unique_id);
    let password = "Password123";
    let name = "Test User";

    let reg_result = auth_service.register(&email, password, name).await;
    assert!(
        reg_result.is_ok(),
        "Registration failed: {:?}",
        reg_result.err()
    );

    let user = reg_result.unwrap();
    assert_eq!(user.email, email);
    assert_eq!(user.name, name);

    // 3. Login Success
    let login_result = auth_service.login(&email, password).await;
    assert!(
        login_result.is_ok(),
        "Login failed: {:?}",
        login_result.err()
    );

    let (login_user, token) = login_result.unwrap();
    assert_eq!(login_user.id, user.id);
    assert!(!token.is_empty(), "Token should not be empty");

    // 4. Login Failure (Wrong Password)
    let bad_login = auth_service.login(&email, "wrongpassword").await;
    assert!(bad_login.is_err(), "Login should fail with wrong password");

    // 5. Login Failure (Non-existent user)
    let no_user_login = auth_service.login("nonexistent@example.com", "any").await;
    assert!(
        no_user_login.is_err(),
        "Login should fail for non-existent user"
    );

    // 6. Weak Password Registration
    let weak_password = "weak";
    let weak_reg = auth_service
        .register("weak@example.com", weak_password, "Weak User")
        .await;
    assert!(
        weak_reg.is_err(),
        "Registration should fail with weak password"
    );
}
