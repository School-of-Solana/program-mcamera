import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'
import { PublicKey, Connection } from '@solana/web3.js'
import { FundingmeDapp } from './types'
import IDL from './idl.json'

export const PROGRAM_ID = new PublicKey('DmcSC8vFAoLr756aDoqkV13S6kosdHHNuziRezhCcKUi')

export function getProgram(provider: AnchorProvider): Program<FundingmeDapp> {
  return new Program(IDL as Idl, provider) as Program<FundingmeDapp>
}

export function getProjectPDA(userPublicKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('project'), userPublicKey.toBuffer()],
    PROGRAM_ID
  )
}

export async function getProjectAccount(
  program: Program<FundingmeDapp>,
  projectPDA: PublicKey
) {
  try {
    return await program.account.projectAccount.fetch(projectPDA)
  } catch (error) {
    console.log('Project not found:', error)
    return null
  }
}