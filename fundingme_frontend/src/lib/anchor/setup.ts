import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import IDL from './idl.json'

export const PROGRAM_ID = new PublicKey('DmcSC8vFAoLr756aDoqkV13S6kosdHHNuziRezhCcKUi')

export function getProvider() {
  if (typeof window === 'undefined') return null
  
  const { solana } = window as any
  if (!solana?.isPhantom || !solana.isConnected) return null
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const provider = new AnchorProvider(
    connection,
    solana,
    { commitment: 'confirmed' }
  )
  
  return provider
}

export function getProgram(provider: AnchorProvider): any {
  return new Program(IDL as any, provider)
}

export function getProjectPDA(userPublicKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('project'), userPublicKey.toBuffer()],
    PROGRAM_ID
  )
}

export async function getProjectAccount(
  program: any,
  projectPDA: PublicKey
) {
  try {
    return await program.account.projectAccount.fetch(projectPDA)
  } catch (error) {
    console.log('Project not found:', error)
    return null
  }
}