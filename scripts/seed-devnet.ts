import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import BN from "bn.js";
import fs from "fs";

function u32ToLeBuffer(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

function encodeFixedString(str: string, len: number): number[] {
  const bytes = Buffer.alloc(len);
  bytes.write(str, "utf-8");
  return Array.from(bytes);
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const deployInfo = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
  const programId = new PublicKey(deployInfo.programId);
  const idl = JSON.parse(
    fs.readFileSync("target/idl/elastic_restaking.json", "utf-8")
  );
  const program = new Program(idl, provider);
  const payer = (provider.wallet as any).payer as Keypair;

  const stakeMint = new PublicKey(deployInfo.stakeMint);
  const rewardMint = new PublicKey(deployInfo.rewardMint);
  const [networkConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("network_config")],
    programId
  );

  console.log("Seeding devnet with demo data...\n");

  // === Register 4 Services ===
  const services = [
    { name: "Oracle Network", threshold: 5000, prize: 1_000_000, isBase: true },
    { name: "Bridge Protocol", threshold: 6000, prize: 2_000_000, isBase: false },
    { name: "DEX Sequencer", threshold: 5000, prize: 1_500_000, isBase: false },
    { name: "Data Availability", threshold: 4000, prize: 800_000, isBase: false },
  ];

  for (let i = 0; i < services.length; i++) {
    const svc = services[i];
    const [servicePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("service"), u32ToLeBuffer(i)],
      programId
    );
    const [rewardVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_vault"), u32ToLeBuffer(i)],
      programId
    );

    try {
      await program.methods
        .registerService(
          encodeFixedString(svc.name, 32),
          encodeFixedString(`https://elastic-restaking.dev/services/${i}`, 128),
          svc.threshold,
          new BN(svc.prize),
          svc.isBase
        )
        .accounts({
          authority: payer.publicKey,
          networkConfig,
          service: servicePda,
          rewardMint,
          rewardVault,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log(`  Registered service ${i}: ${svc.name}`);
    } catch (e: any) {
      console.log(`  Service ${i} already exists or error: ${e.message?.slice(0, 80)}`);
    }
  }

  // === Create validator using the payer wallet (avoids airdrop rate limits) ===
  const validators = [payer];
  const depositAmount = 100_000_000; // 100 tokens (6 decimals)

  // Create token account for payer and mint stake tokens
  const payerTokenAccount = await createAssociatedTokenAccount(
    provider.connection,
    payer,
    stakeMint,
    payer.publicKey
  ).catch(async () => {
    // Already exists, fetch it
    return await getAssociatedTokenAddress(stakeMint, payer.publicKey);
  });

  await mintTo(
    provider.connection,
    payer,
    stakeMint,
    payerTokenAccount,
    payer,
    depositAmount
  );

  const [validatorPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("validator"), payer.publicKey.toBuffer()],
    programId
  );
  const [stakeVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake_vault")],
    programId
  );

  try {
    await program.methods
      .depositStake(new BN(depositAmount))
      .accounts({
        depositor: payer.publicKey,
        networkConfig,
        validatorState: validatorPda,
        depositorTokenAccount: payerTokenAccount,
        stakeVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log(
      `  Validator 0: ${payer.publicKey.toBase58().slice(0, 8)}... deposited ${depositAmount / 1_000_000} tokens`
    );
  } catch (e: any) {
    console.log(`  Validator 0 error: ${e.message?.slice(0, 80)}`);
  }

  // === Allocate to services (target d* = 2.0) ===
  const allocPerService = depositAmount; // Full stake to each (elastic)

  for (let vi = 0; vi < validators.length; vi++) {
    const validator = validators[vi];
    // Each validator allocates to 2 services (degree = 2.0)
    const serviceIndices = [vi % 4, (vi + 1) % 4];

    for (const si of serviceIndices) {
      const [allocationPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("allocation"),
          validator.publicKey.toBuffer(),
          u32ToLeBuffer(si),
        ],
        programId
      );
      const [servicePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("service"), u32ToLeBuffer(si)],
        programId
      );

      try {
        await program.methods
          .allocateStake(si, new BN(allocPerService))
          .accounts({
            authority: validator.publicKey,
            networkConfig,
            validatorState: PublicKey.findProgramAddressSync(
              [Buffer.from("validator"), validator.publicKey.toBuffer()],
              programId
            )[0],
            service: servicePda,
            allocation: allocationPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log(
          `  Validator ${vi} → Service ${si}: allocated ${allocPerService / 1_000_000} tokens`
        );
      } catch (e: any) {
        console.log(`  Allocation v${vi}→s${si} error: ${e.message?.slice(0, 80)}`);
      }
    }
  }

  console.log("\nDevnet seeding complete!");
  console.log(`  Services: ${services.length}`);
  console.log(`  Validators: ${validators.length}`);
  console.log(`  Target restaking degree: 2.0x`);

  // Save validator keys for reference
  const seedInfo = {
    services: services.map((s, i) => ({ ...s, id: i })),
    validators: validators.map((v, i) => ({
      index: i,
      publicKey: v.publicKey.toBase58(),
    })),
    seededAt: new Date().toISOString(),
  };
  fs.writeFileSync("seed-info.json", JSON.stringify(seedInfo, null, 2));
  console.log("Seed info saved to seed-info.json");
}

main().catch(console.error);
