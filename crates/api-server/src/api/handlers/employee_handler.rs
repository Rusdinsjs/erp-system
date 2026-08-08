use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::application::dto::{
    ApiResponse, CreateEmployeeRequest, PaginationParams, UpdateEmployeeRequest,
};
use management_system_hr::domain::entities::Employee;
use management_system_core::shared::errors::AppError;

pub async fn list_employees(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<Employee>>, AppError> {
    let employees = state
        .employee_service
        .list(params.page(), params.per_page())
        .await?;
    Ok(Json(employees))
}

pub async fn get_employee(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Employee>, AppError> {
    let employee = state.employee_service.get_by_id(id).await?;
    Ok(Json(employee))
}

pub async fn create_employee(
    State(state): State<AppState>,
    Json(payload): Json<CreateEmployeeRequest>,
) -> Result<(StatusCode, Json<ApiResponse<Employee>>), AppError> {
    let employee = state.employee_service.create(payload).await?;
    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            employee,
            "Employee created",
        )),
    ))
}

pub async fn update_employee(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateEmployeeRequest>,
) -> Result<Json<ApiResponse<Employee>>, AppError> {
    let employee = state.employee_service.update(id, payload).await?;
    Ok(Json(ApiResponse::success_with_message(
        employee,
        "Employee updated",
    )))
}

pub async fn delete_employee(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    state.employee_service.delete(id).await?;
    Ok(Json(ApiResponse::success_with_message(
        (),
        "Employee deleted",
    )))
}

pub async fn create_employee_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<management_system_core::application::dto::CreateEmployeeUserRequest>,
) -> Result<Json<ApiResponse<Employee>>, AppError> {
    let employee = state.employee_service.create_user(id, payload).await?;
    Ok(Json(ApiResponse::success_with_message(
        employee,
        "User account created for employee",
    )))
}
