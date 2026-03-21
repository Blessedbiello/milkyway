import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint } from "@solana/spl-token";
import fs from "fs";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const idl = JSON.parse(
    fs.readFileSync("target/idl/elastic_restaking.json", "utf-8")
  );
  const programId = new PublicKey("2R3H4JZieWZtvvpXvfoNtDC9vxMmiRVvbS618LwexhW7");
  const program = new Program(idl, provider);

  console.log("Deploying Elastic Restaking Protocol...");
  console.log("Program ID:", programId.toBase58());
  console.log("Authority:", provider.wallet.publicKey.toBase58());

  // Create stake and reward mints (same token for simplicity)
  const stakeMint = await createMint(
    provider.connection,
    (provider.wallet as any).payer,
    provider.wallet.publicKey,
    null,
    6
  );
  console.log("Stake Mint:", stakeMint.toBase58());

  const rewardMint = stakeMint; // Same mint for MVP
  const treasury = provider.wallet.publicKey;

  // Derive PDAs
  const [networkConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("network_config")],
    programId
  );
  const [stakeVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake_vault")],
    programId
  );

  console.log("Network Config PDA:", networkConfig.toBase58());
  console.log("Stake Vault PDA:", stakeVault.toBase58());

  // Initialize network
  const tx = await program.methods
    .initializeNetwork()
    .accounts({
      authority: provider.wallet.publicKey,
      networkConfig,
      stakeMint,
      rewardMint,
      treasury,
      stakeVault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log("Network initialized! Tx:", tx);

  // Save deployment info
  const deployInfo = {
    programId: programId.toBase58(),
    networkConfig: networkConfig.toBase58(),
    stakeVault: stakeVault.toBase58(),
    stakeMint: stakeMint.toBase58(),
    rewardMint: rewardMint.toBase58(),
    treasury: treasury.toBase58(),
    authority: provider.wallet.publicKey.toBase58(),
    cluster: provider.connection.rpcEndpoint,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deployInfo, null, 2)
  );
  console.log("Deployment info saved to deployment.json");
}

main().catch(console.error);
