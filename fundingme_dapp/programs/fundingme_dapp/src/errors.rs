use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Invalid project status for this operation")]
    InvalidProjectStatus,
}
