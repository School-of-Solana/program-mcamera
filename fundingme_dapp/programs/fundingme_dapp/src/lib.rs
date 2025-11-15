use anchor_lang::prelude::*;

declare_id!("DmcSC8vFAoLr756aDoqkV13S6kosdHHNuziRezhCcKUi");

#[program]
pub mod fundingme_dapp {
    use super::*;

    pub fn create_project(
        ctx: Context<CreateProject>,
        name: String,
        financial_target: u64,
    ) -> Result<()> {        
        let project = &mut ctx.accounts.project;
        project.owner = *ctx.accounts.user.key;
        project.name = name;
        project.financial_target = financial_target;
        project.balance = 0;
        project.status = "Active".to_string();
        project.bump = ctx.bumps.project;

        msg!("Greetings from: {:?}", ctx.program_id);
        msg!("Project Name: {}", project.name.to_string());
        msg!("Project Owner pubkey: {}", project.key().to_string());
        msg!("Project Data pubkey: {}", project.owner.key().to_string());
        msg!("Financial Target: {}", project.financial_target.to_string());
        msg!("Status: {}", project.status.to_string());
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateProject<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 5000, //  8 + 2 + 4 + 200 + 1,
        seeds = [b"project", user.key().as_ref()],
        bump,
    )]
    pub project: Account<'info, ProjectAccount>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct ProjectAccount {
    owner: Pubkey,
    name: String,
    financial_target: u64,
    balance: u64,
    status: String,
    bump: u8,
}
