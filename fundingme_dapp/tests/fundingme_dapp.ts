import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FundingmeDapp } from "../target/types/fundingme_dapp";
import * as assert from "assert";

// Helper function to create a project
async function createProject(
  program: Program<FundingmeDapp>, 
  user: anchor.web3.Keypair, 
  projectName: string = "My Project", 
  financialTarget: number = 1000
) {
  // Find the project PDA
  const [projectAccountPdaAddr] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("project"), user.publicKey.toBuffer()],
    program.programId
  );

  // Airdrop SOL to the user
  const airdropToUser = await anchor.getProvider().connection.requestAirdrop(
    user.publicKey,
    anchor.web3.LAMPORTS_PER_SOL
  );
  await anchor.getProvider().connection.confirmTransaction(airdropToUser);

  // Create the project
  const createProjectTx = await program.methods
    .createProject(projectName, new anchor.BN(financialTarget))
    .accounts({
      user: user.publicKey,
      project: projectAccountPdaAddr,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([user])
    .rpc({ commitment: "confirmed" });
  
  console.log("Create project transaction signature:", createProjectTx);

  return projectAccountPdaAddr;
}

describe("Should initializate a project", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.fundingmeDapp as Program<FundingmeDapp>;
  const user = anchor.web3.Keypair.generate();

  it("Is initialized!", async () => {
    const [projectAccountPdaAddr] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("project"), user.publicKey.toBuffer()],
      program.programId
    );

    // Airdrop SOL to the owner to pay for transaction fees
    const airdropSignature = await anchor.getProvider().connection.requestAirdrop(
      user.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await anchor.getProvider().connection.confirmTransaction(airdropSignature);

    // Call the create_project function with required parameters
    const tx = await program.methods
      .createProject("My Project", new anchor.BN(1000))
      .accounts({
        user: user.publicKey,
        project: projectAccountPdaAddr,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc({ commitment: "confirmed" });

    // Fetch the created project account to verify
    const projectAccount = await program.account.projectAccount.fetch(projectAccountPdaAddr);
    assert.strictEqual(projectAccount.name, "My Project", "The name of the project should match to: My Project");
    assert.strictEqual(projectAccount.balance.toNumber(), 0, "The project account balance should be initialized with 0");
    assert.strictEqual(projectAccount.financialTarget.toNumber(), 1000, "The financeial target of the project should be initialized with 1000");

    console.log("Your transaction signature", tx);
    console.log("Project created:", projectAccount);
  });
});

describe("Donate testings", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.fundingmeDapp as Program<FundingmeDapp>;

  it("Should accept donations", async () => {
    const user = anchor.web3.Keypair.generate();
    const donor = anchor.web3.Keypair.generate();
    
    // Create a project using helper function
    const projectAccountPdaAddr = await createProject(program, user, "My Project", 1000);

    // Airdrop SOL to the donor
    const airdropSignature = await anchor.getProvider().connection.requestAirdrop(
      donor.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await anchor.getProvider().connection.confirmTransaction(airdropSignature);

    // Get initial balances
    const initialDonorBalance = await anchor.getProvider().connection.getBalance(donor.publicKey);
    const initialProjectAccount = await program.account.projectAccount.fetch(projectAccountPdaAddr);
    const initialProjectBalance = initialProjectAccount.balance.toNumber();

    // Donate 0.1 SOL (100_000_000 lamports)
    const donationAmount = new anchor.BN(100_000_000);
    const tx = await program.methods
      .donate(donationAmount)
      .accounts({
        user: donor.publicKey,
        project: projectAccountPdaAddr,
      })
      .signers([donor])
      .rpc({ commitment: "confirmed" });

    // Verify the donation was successful
    const updatedProjectAccount = await program.account.projectAccount.fetch(projectAccountPdaAddr);
    const finalDonorBalance = await anchor.getProvider().connection.getBalance(donor.publicKey);

    // Check that project balance increased by donation amount
    assert.strictEqual(
      updatedProjectAccount.balance.toNumber(), 
      initialProjectBalance + donationAmount.toNumber(),
      "Project balance should increase by donation amount"
    );

    // Check that donor balance decreased (account for transaction fees)
    // The donor should have paid at least the transaction fee, so balance should be less than initial
    assert.ok(
      finalDonorBalance < initialDonorBalance,
      "Donor balance should decrease due to transaction fees"
    );

    console.log("Donation transaction signature:", tx);
    console.log("Project balance after donation:", updatedProjectAccount.balance.toNumber());
    console.log("Donor balance change:", initialDonorBalance - finalDonorBalance, "lamports");
  });

  it("Should handle multiple donations", async () => {
    const user = anchor.web3.Keypair.generate();
    const donor1 = anchor.web3.Keypair.generate();
    const donor2 = anchor.web3.Keypair.generate();
    
    // Create a project using helper function
    const projectAccountPdaAddr = await createProject(program, user, "Multiple Donations Project", 1000);

    // Airdrop SOL to both donors
    const airdrop1Promise = anchor.getProvider().connection.requestAirdrop(donor1.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    const airdrop2Promise = anchor.getProvider().connection.requestAirdrop(donor2.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    
    const [airdrop1Sig, airdrop2Sig] = await Promise.all([airdrop1Promise, airdrop2Promise]);
    
    await Promise.all([
      anchor.getProvider().connection.confirmTransaction(airdrop1Sig),
      anchor.getProvider().connection.confirmTransaction(airdrop2Sig)
    ]);

    // Get initial project balance
    const initialProjectAccount = await program.account.projectAccount.fetch(projectAccountPdaAddr);
    const initialBalance = initialProjectAccount.balance.toNumber();

    // First donation: 0.05 SOL
    const donation1Amount = new anchor.BN(50_000_000);
    const donation1Tx = await program.methods
      .donate(donation1Amount)
      .accounts({
        user: donor1.publicKey,
        project: projectAccountPdaAddr,
      })
      .signers([donor1])
      .rpc({ commitment: "confirmed" });
    
    console.log("First donation transaction signature:", donation1Tx);

    // Second donation: 0.15 SOL
    const donation2Amount = new anchor.BN(150_000_000);
    const donation2Tx = await program.methods
      .donate(donation2Amount)
      .accounts({
        user: donor2.publicKey,
        project: projectAccountPdaAddr,
      })
      .signers([donor2])
      .rpc({ commitment: "confirmed" });
    
    console.log("Second donation transaction signature:", donation2Tx);

    // Verify total donations
    const finalProjectAccount = await program.account.projectAccount.fetch(projectAccountPdaAddr);
    const expectedBalance = initialBalance + donation1Amount.toNumber() + donation2Amount.toNumber();
    
    assert.strictEqual(
      finalProjectAccount.balance.toNumber(),
      expectedBalance,
      "Project balance should reflect sum of all donations"
    );

    console.log("Total project balance after multiple donations:", finalProjectAccount.balance.toNumber());
  });

  it("Should track donation progress towards financial target", async () => {
    const user = anchor.web3.Keypair.generate();
    const donor = anchor.web3.Keypair.generate();
    
    // Create a project with a small target for easier testing (1000 lamports = 0.000001 SOL)
    const targetAmount = 1000;
    const projectAccountPdaAddr = await createProject(program, user, "Target Test Project", targetAmount);

    // Airdrop SOL to the donor
    const airdropSignature = await anchor.getProvider().connection.requestAirdrop(
      donor.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await anchor.getProvider().connection.confirmTransaction(airdropSignature);

    // Get initial project state
    const initialProjectAccount = await program.account.projectAccount.fetch(projectAccountPdaAddr);
    
    // Verify initial state
    assert.strictEqual(initialProjectAccount.balance.toNumber(), 0, "Initial balance should be 0");
    assert.strictEqual(initialProjectAccount.financialTarget.toNumber(), targetAmount, "Financial target should match");

    // Make a donation that exactly meets the target
    const donationAmount = new anchor.BN(targetAmount);
    const tx = await program.methods
      .donate(donationAmount)
      .accounts({
        user: donor.publicKey,
        project: projectAccountPdaAddr,
      })
      .signers([donor])
      .rpc({ commitment: "confirmed" });

    // Verify the project has reached its financial target
    const finalProjectAccount = await program.account.projectAccount.fetch(projectAccountPdaAddr);
    
    assert.strictEqual(
      finalProjectAccount.balance.toNumber(),
      targetAmount,
      "Project balance should exactly match the financial target"
    );

    // Check funding percentage
    const fundingPercentage = (finalProjectAccount.balance.toNumber() / finalProjectAccount.financialTarget.toNumber()) * 100;
    assert.strictEqual(fundingPercentage, 100, "Project should be 100% funded");

    // Check that project status is updated to TargetReached
    assert.deepStrictEqual(finalProjectAccount.status, { targetReached: {} }, "Project status should be TargetReached when target is met");

    console.log("Final donation transaction signature:", tx);
    console.log(`Project funding: ${fundingPercentage.toFixed(2)}% of target`);
    console.log(`Target: ${finalProjectAccount.financialTarget.toNumber()} lamports`);
    console.log(`Current balance: ${finalProjectAccount.balance.toNumber()} lamports`);
    console.log("Project status:", finalProjectAccount.status);
  });

  it("Should handle donations that exceed the financial target", async () => {
    const user = anchor.web3.Keypair.generate();
    const donor = anchor.web3.Keypair.generate();
    
    // Create a project with a small target (1000 lamports)
    const targetAmount = 1000;
    const projectAccountPdaAddr = await createProject(program, user, "Exceed Target Project", targetAmount);

    // Airdrop SOL to the donor
    const airdropSignature = await anchor.getProvider().connection.requestAirdrop(
      donor.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await anchor.getProvider().connection.confirmTransaction(airdropSignature);

    // Make a donation that exceeds the target by 50% (1500 lamports)
    const donationAmount = new anchor.BN(1500);
    const tx = await program.methods
      .donate(donationAmount)
      .accounts({
        user: donor.publicKey,
        project: projectAccountPdaAddr,
      })
      .signers([donor])
      .rpc({ commitment: "confirmed" });

    // Verify the project has exceeded its financial target
    const finalProjectAccount = await program.account.projectAccount.fetch(projectAccountPdaAddr);
    
    assert.strictEqual(
      finalProjectAccount.balance.toNumber(),
      1500,
      "Project balance should reflect the full donation amount"
    );

    // Check that the project is overfunded
    const fundingPercentage = (finalProjectAccount.balance.toNumber() / finalProjectAccount.financialTarget.toNumber()) * 100;
    assert.ok(fundingPercentage > 100, "Project should be overfunded (>100%)");
    assert.strictEqual(fundingPercentage, 150, "Project should be exactly 150% funded");

    // Check that project status is updated to TargetReached since target is exceeded
    assert.deepStrictEqual(finalProjectAccount.status, { targetReached: {} }, "Project status should be TargetReached when target is exceeded");

    const excessAmount = finalProjectAccount.balance.toNumber() - finalProjectAccount.financialTarget.toNumber();
    
    console.log("Exceed target transaction signature:", tx);
    console.log(`Project funding: ${fundingPercentage.toFixed(2)}% of target`);
    console.log(`Target: ${finalProjectAccount.financialTarget.toNumber()} lamports`);
    console.log(`Current balance: ${finalProjectAccount.balance.toNumber()} lamports`);
    console.log(`Excess amount: ${excessAmount} lamports (${((excessAmount / finalProjectAccount.financialTarget.toNumber()) * 100).toFixed(2)}% over target)`);
    console.log("Project status:", finalProjectAccount.status);
  });

  it("Should track partial funding progress", async () => {
    const user = anchor.web3.Keypair.generate();
    const donor1 = anchor.web3.Keypair.generate();
    const donor2 = anchor.web3.Keypair.generate();
    
    // Create a project with a larger target (10000 lamports)
    const targetAmount = 10000;
    const projectAccountPdaAddr = await createProject(program, user, "Partial Funding Project", targetAmount);

    // Airdrop SOL to both donors
    const airdrop1Promise = anchor.getProvider().connection.requestAirdrop(donor1.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    const airdrop2Promise = anchor.getProvider().connection.requestAirdrop(donor2.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    
    const [airdrop1Sig, airdrop2Sig] = await Promise.all([airdrop1Promise, airdrop2Promise]);
    
    await Promise.all([
      anchor.getProvider().connection.confirmTransaction(airdrop1Sig),
      anchor.getProvider().connection.confirmTransaction(airdrop2Sig)
    ]);

    // First donation: 25% of target (2500 lamports)
    const donation1Amount = new anchor.BN(2500);
    const tx1 = await program.methods
      .donate(donation1Amount)
      .accounts({
        user: donor1.publicKey,
        project: projectAccountPdaAddr,
      })
      .signers([donor1])
      .rpc({ commitment: "confirmed" });

    // Check funding after first donation
    let projectAccount = await program.account.projectAccount.fetch(projectAccountPdaAddr);
    let fundingPercentage = (projectAccount.balance.toNumber() / projectAccount.financialTarget.toNumber()) * 100;
    
    assert.strictEqual(fundingPercentage, 25, "Project should be 25% funded after first donation");
    assert.ok(fundingPercentage < 100, "Project should be partially funded (<100%)");
    
    // Check that project status is still Active since target is not reached
    assert.deepStrictEqual(projectAccount.status, { active: {} }, "Project status should remain Active when partially funded");

    console.log("First partial donation transaction signature:", tx1);
    console.log(`After first donation - Project funding: ${fundingPercentage.toFixed(2)}% of target`);
    console.log("Project status after first donation:", projectAccount.status);

    // Second donation: Additional 40% of target (4000 lamports)
    const donation2Amount = new anchor.BN(4000);
    const tx2 = await program.methods
      .donate(donation2Amount)
      .accounts({
        user: donor2.publicKey,
        project: projectAccountPdaAddr,
      })
      .signers([donor2])
      .rpc({ commitment: "confirmed" });

    // Check final funding status
    const finalProjectAccount = await program.account.projectAccount.fetch(projectAccountPdaAddr);
    const finalFundingPercentage = (finalProjectAccount.balance.toNumber() / finalProjectAccount.financialTarget.toNumber()) * 100;
    
    assert.strictEqual(finalFundingPercentage, 65, "Project should be 65% funded after both donations");
    assert.ok(finalFundingPercentage < 100, "Project should still be partially funded (<100%)");

    // Check that project status is still Active since target is not reached
    assert.deepStrictEqual(finalProjectAccount.status, { active: {} }, "Project status should remain Active when still partially funded");

    const remainingAmount = finalProjectAccount.financialTarget.toNumber() - finalProjectAccount.balance.toNumber();
    const remainingPercentage = 100 - finalFundingPercentage;

    console.log("Second partial donation transaction signature:", tx2);
    console.log(`Final funding status: ${finalFundingPercentage.toFixed(2)}% of target`);
    console.log(`Target: ${finalProjectAccount.financialTarget.toNumber()} lamports`);
    console.log(`Current balance: ${finalProjectAccount.balance.toNumber()} lamports`);
    console.log(`Remaining needed: ${remainingAmount} lamports (${remainingPercentage.toFixed(2)}% to reach target)`);
    console.log("Final project status:", finalProjectAccount.status);
  });
});
