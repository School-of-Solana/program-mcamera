import { useWallet, useConnection } from '@solana/wallet-adapter-react'

export function useSimpleSolana() {
  const wallet = useWallet()
  const { connection } = useConnection()

  return {
    wallet,
    connection,
    account: wallet.publicKey ? { address: wallet.publicKey.toString() } : null,
    client: {
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    }
  }
}