import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FundingmeDapp } from "../target/types/fundingme_dapp";
import * as assert from "assert";

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
