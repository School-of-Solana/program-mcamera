use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ProjectStatus {
    Active,
    Paused,
    TargetReached,
    Success,
    Failed,
}
