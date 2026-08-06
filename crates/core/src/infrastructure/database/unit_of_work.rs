//! Unit of Work — QKRN-005
//!
//! Transaction abstraction backed by a single `sqlx::Transaction<'static, Postgres>`.
//! A business service uses `UnitOfWork` to persist document header, lines,
//! ledger effects, audit records and outbox entries inside the **same**
//! database transaction, ensuring atomicity.
//!
//! # Usage
//!
//! ```rust,ignore
//! let mut uow = UnitOfWork::begin(&pool).await?;
//! // Pass `uow.tx()` where sqlx accepts `&mut Transaction<'_, Postgres>`
//! // or use `uow.conn()` for a `&mut PgConnection`.
//! my_repo.insert(&doc, &mut *uow.tx()).await?;
//! uow.commit().await?;  // or uow.rollback().await?
//! ```

use sqlx::{postgres::PgConnection, PgPool, Postgres, Transaction};

use crate::domain::errors::{DomainError, DomainResult};

/// Owns a live `sqlx::Transaction` for the lifetime of a business operation.
///
/// Dropping without calling `commit` automatically issues a rollback.
pub struct UnitOfWork {
    /// The inner transaction.  Wrapped in `Option` so we can `take()` on commit/rollback.
    tx: Option<Transaction<'static, Postgres>>,
}

impl UnitOfWork {
    /// Begin a new database transaction.
    ///
    /// # Safety
    /// The `PgPool` must outlive this `UnitOfWork`. The `'static` lifetime
    /// here is an internal implementation detail; the pool is referenced
    /// through the connection held by `Transaction` and is not truly `'static`.
    /// This is the standard approach for UoW in single-threaded async Rust when
    /// avoiding self-referential structs.
    pub async fn begin(pool: &PgPool) -> DomainResult<Self> {
        let tx = pool
            .begin()
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        // SAFETY: We extend the lifetime from the pool's lifetime to 'static.
        // The pool must outlive this UnitOfWork; callers own the pool, which
        // is typically an Arc<PgPool> with application lifetime.
        let tx: Transaction<'static, Postgres> = unsafe { std::mem::transmute(tx) };
        Ok(Self { tx: Some(tx) })
    }

    /// Obtain a mutable reference to the inner `Transaction`.
    ///
    /// Use `&mut *uow.tx()` to get a `&mut PgConnection` for sqlx `execute` / `fetch_*`.
    ///
    /// # Panics
    ///
    /// Panics if called after `commit` or `rollback`.
    pub fn tx(&mut self) -> &mut Transaction<'static, Postgres> {
        self.tx
            .as_mut()
            .expect("UnitOfWork: transaction already consumed (commit or rollback was called)")
    }

    /// Obtain a `&mut PgConnection` directly from the underlying transaction.
    ///
    /// This is the ergonomic form for passing into sqlx query builder's
    /// `.execute()` / `.fetch_*()` methods without extra derefs.
    pub fn conn(&mut self) -> &mut PgConnection {
        use std::ops::DerefMut;
        self.tx().deref_mut()
    }

    /// Commit the transaction.
    pub async fn commit(mut self) -> DomainResult<()> {
        let tx = self
            .tx
            .take()
            .expect("UnitOfWork: transaction already consumed");
        tx.commit()
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    /// Explicitly roll back the transaction.
    ///
    /// Dropping `UnitOfWork` also rolls back automatically (sqlx semantics).
    pub async fn rollback(mut self) -> DomainResult<()> {
        let tx = self
            .tx
            .take()
            .expect("UnitOfWork: transaction already consumed");
        tx.rollback()
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }
}
