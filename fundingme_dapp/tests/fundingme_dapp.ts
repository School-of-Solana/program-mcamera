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
});
