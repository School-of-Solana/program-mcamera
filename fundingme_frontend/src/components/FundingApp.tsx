'use client'

import { useState, useEffect } from 'react'
import { useSimpleSolana } from '@/components/solana/use-simple-solana'
import { Connection, PublicKey, clusterApiUrl, SystemProgram } from '@solana/web3.js'
import { AnchorProvider, BN, Wallet } from '@coral-xyz/anchor'
import { getProgram, getProjectPDA, getProjectAccount, getProvider, PROGRAM_ID } from '@/lib/anchor/setup'
import { ProjectData, ProjectStatus } from '@/lib/anchor/types'
import { toast } from 'sonner'

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

export default function FundingApp() {
  const { wallet, connection, account } = useSimpleSolana()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [financialTarget, setFinancialTarget] = useState('')
  const [donationAmount, setDonationAmount] = useState('')
  const [searchAddress, setSearchAddress] = useState('')

  const publicKey = wallet?.publicKey

  // Get provider
  const getProvider = () => {
    if (!wallet || !wallet.signTransaction || !wallet.signAllTransactions) return null
    
    const walletAdapter = {
      publicKey: wallet.publicKey!,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions.bind(wallet),
    }
    return new AnchorProvider(connection, walletAdapter as Wallet, { commitment: 'confirmed' } as any)
  }

  // Fetch project for current user
  const fetchMyProject = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first')
      return
    }
    try {
      setLoading(true)
      const provider = getProvider()
      if (!provider) {
        toast.error('Wallet not connected properly')
        return
      }

      const program = getProgram(provider)
      const [projectPDA] = getProjectPDA(publicKey)
      
      const projectAccount = await getProjectAccount(program, projectPDA)
      
      if (projectAccount) {
        setProject({
          owner: projectAccount.owner,
          name: projectAccount.name,
          financialTarget: projectAccount.financialTarget.toNumber(),
          balance: projectAccount.balance.toNumber(),
          status: projectAccount.status,
          donators: projectAccount.donators.map((d: { user: PublicKey; amount: { toNumber(): number } }) => ({
            user: d.user,
            amount: d.amount.toNumber()
          })),
          bump: projectAccount.bump
        } as any)
        toast.success('Project loaded successfully!')
      } else {
        setProject(null)
        toast.info('No project found for your wallet')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      setProject(null)
      toast.error('Error loading project. Make sure you are connected to the correct network.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch project for any address
  const fetchProject = async (ownerPubkey: PublicKey) => {
    try {
      const provider = getProvider()
      if (!provider) return

      const program = getProgram(provider)
      const [projectPDA] = getProjectPDA(ownerPubkey)
      
      const projectAccount = await getProjectAccount(program, projectPDA)
      
      if (projectAccount) {
        setProject({
          owner: projectAccount.owner,
          name: projectAccount.name,
          financialTarget: projectAccount.financialTarget.toNumber(),
          balance: projectAccount.balance.toNumber(),
          status: projectAccount.status,
          donators: projectAccount.donators.map((d: { user: PublicKey; amount: { toNumber(): number } }) => ({
            user: d.user,
            amount: d.amount.toNumber()
          })),
          bump: projectAccount.bump
        } as any)
        toast.success('Project loaded successfully!')
      } else {
        setProject(null)
        toast.info('No project found for this address')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      setProject(null)
      toast.error('Error fetching project')
    }
  }

  // Search for project by owner address
  const searchProject = async () => {
    if (!searchAddress.trim()) {
      toast.error('Please enter a valid address')
      return
    }
    
    try {
      const ownerPubkey = new PublicKey(searchAddress.trim())
      await fetchProject(ownerPubkey)
    } catch (_error) {
      toast.error('Invalid address format')
    }
  }

  // Create project
  const createProject = async () => {
    if (!publicKey || !projectName || !financialTarget) {
      toast.error('Please fill in all fields')
      return
    }
    
    setLoading(true)
    try {
      const provider = getProvider()
      if (!provider) return

      const program = getProgram(provider)
      const [projectPDA] = getProjectPDA(publicKey)

      const targetLamports = new BN(parseFloat(financialTarget) * 1e9)

      const tx = await (program as any).methods
        .createProject(projectName, targetLamports)
        .accounts({
          user: publicKey,
          project: projectPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      setProjectName('')
      setFinancialTarget('')
      await fetchMyProject()
      toast.success('Project created successfully!')
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Error creating project. Make sure you don\'t already have a project.')
    }
    setLoading(false)
  }

  // Donate to project
  const donate = async () => {
    if (!publicKey || !donationAmount || !project) {
      toast.error('Please enter donation amount')
      return
    }
    
    setLoading(true)
    try {
      const provider = getProvider()
      if (!provider) return

      const program = getProgram(provider)
      const [projectPDA] = getProjectPDA(project.owner)
      
      const amountLamports = new BN(parseFloat(donationAmount) * 1e9)

      const tx = await (program as any).methods
        .donate(amountLamports)
        .accounts({
          user: publicKey,
          project: projectPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      setDonationAmount('')
      await fetchProject(project.owner)
      toast.success('Donation successful!')
    } catch (error) {
      console.error('Error donating:', error)
      toast.error('Error making donation')
    }
    setLoading(false)
  }

  // Close project
  const closeProject = async () => {
    if (!publicKey || !project) return
    
    setLoading(true)
    try {
      const provider = getProvider()
      if (!provider) return

      const program = getProgram(provider)
      const [projectPDA] = getProjectPDA(project.owner)

      const tx = await (program as any).methods
        .closeProject()
        .accounts({
          user: publicKey,
          project: projectPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      await fetchProject(project.owner)
      toast.success('Project status updated!')
    } catch (error) {
      console.error('Error closing project:', error)
      toast.error('Error updating project status')
    }
    setLoading(false)
  }

  // Withdraw funds
  const withdraw = async () => {
    if (!publicKey || !project) return
    
    setLoading(true)
    try {
      const provider = getProvider()
      if (!provider) return

      const program = getProgram(provider)
      const [projectPDA] = getProjectPDA(project.owner)

      const tx = await (program as any).methods
        .withdraw()
        .accounts({
          user: publicKey,
          project: projectPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      await fetchProject(project.owner)
      toast.success('Funds withdrawn successfully!')
    } catch (error) {
      console.error('Error withdrawing:', error)
      toast.error('Error withdrawing funds')
    }
    setLoading(false)
  }

  // Claim refund
  const claimRefund = async () => {
    if (!publicKey || !project) return
    
    setLoading(true)
    try {
      const provider = getProvider()
      if (!provider) return

      const program = getProgram(provider)
      const [projectPDA] = getProjectPDA(project.owner)

      const tx = await (program as any).methods
        .claimRefund()
        .accounts({
          donator: publicKey,
          project: projectPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      await fetchProject(project.owner)
      toast.success('Refund claimed successfully!')
    } catch (error) {
      console.error('Error claiming refund:', error)
      toast.error('Error claiming refund')
    }
    setLoading(false)
  }

  // Close failed project
  const closeFailedProject = async () => {
    if (!publicKey || !project) return
    
    setLoading(true)
    try {
      const provider = getProvider()
      if (!provider) return

      const program = getProgram(provider)
      const [projectPDA] = getProjectPDA(project.owner)

      const tx = await (program as any).methods
        .closeFailedProject()
        .accounts({
          user: publicKey,
          project: projectPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      setProject(null)
      toast.success('Failed project closed successfully!')
    } catch (error) {
      console.error('Error closing failed project:', error)
      toast.error('Error closing failed project')
    }
    setLoading(false)
  }

  // Load user's project on wallet connect
  useEffect(() => {
    if (publicKey) {
      fetchMyProject()
    }
  }, [publicKey])

  const getStatusText = (status: ProjectStatus) => {
    if ('active' in status) return 'Active'
    if ('targetReached' in status) return 'Target Reached'
    if ('success' in status) return 'Success'
    if ('failed' in status) return 'Failed'
    if ('paused' in status) return 'Paused'
    return 'Unknown'
  }

  const getStatusColor = (status: ProjectStatus) => {
    if ('active' in status) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
    if ('targetReached' in status) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
    if ('success' in status) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
    if ('failed' in status) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
    if ('paused' in status) return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50'
    return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50'
  }

  const isOwner = project && publicKey && project.owner.equals(publicKey)
  const isDonator = project && publicKey && project.donators.some(d => d.user.equals(publicKey))
  const progress = project ? (project.balance / project.financialTarget) * 100 : 0

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">FundingMe dApp</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Decentralized crowdfunding platform on Solana</p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Please connect your wallet to use the dApp</p>
            <p className="text-sm text-gray-500">Use the wallet button in the header to connect</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">FundingMe dApp</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Decentralized crowdfunding platform on Solana</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Connected: {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}</p>
        </div>

        {/* Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Search Projects</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Enter project owner address to search..."
            />
            <button
              onClick={searchProject}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Search
            </button>
            <button
              onClick={fetchMyProject}
              disabled={loading}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              My Project
            </button>
          </div>
        </div>

        {/* Create Project Section */}
        {!project && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Create New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Financial Target (SOL)</label>
                <input
                  type="number"
                  value={financialTarget}
                  onChange={(e) => setFinancialTarget(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter target amount in SOL"
                  step="0.1"
                />
              </div>
              <button
                onClick={createProject}
                disabled={loading || !projectName || !financialTarget}
                className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50 hover:bg-blue-700"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        )}

        {/* Project Details Section */}
        {project && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`px-2 py-1 rounded text-sm font-semibold ${getStatusColor(project.status)}`}>
                    {getStatusText(project.status)}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Owner: {isOwner ? 'You' : `${project.owner.toString().slice(0, 8)}...`}
                </p>
              </div>
              {isOwner && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Your Project
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progress: {progress.toFixed(1)}%</span>
                <span className="text-sm">
                  {(project.balance / 1e9).toFixed(2)} / {(project.financialTarget / 1e9).toFixed(2)} SOL
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full transition-all duration-300 ${
                    progress >= 100 ? 'bg-green-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
              {progress >= 100 && (
                <div className="mt-2 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 font-semibold text-sm">
                    🎉 Funding goal reached! The project owner can now close the project and withdraw funds.
                  </p>
                </div>
              )}
              {'failed' in project.status && (
                <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 font-semibold text-sm">
                    ⚠️ Project failed. All donators must withdraw their funds before the project owner can close this project.
                  </p>
                  {project.donators.length > 0 ? (
                    <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                      Waiting for {project.donators.length} donator{project.donators.length > 1 ? 's' : ''} to claim refunds.
                    </p>
                  ) : (
                    <p className="text-green-700 dark:text-green-300 text-xs mt-1">
                      ✅ All donators have withdrawn. Project can now be closed.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Donators List */}
            {project.donators.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Donators ({project.donators.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {project.donators.map((donator, index) => (
                    <div key={index} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <span className="font-mono">
                        {donator.user.equals(publicKey!) ? 
                          'You' : 
                          `${donator.user.toString().slice(0, 8)}...${donator.user.toString().slice(-4)}`
                        }
                      </span>
                      <span className="font-semibold">{(donator.amount / 1e9).toFixed(2)} SOL</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              {/* Donation Section */}
              {'active' in project.status && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Make a Donation (SOL)</label>
                  <div className="flex space-x-3">
                    <input
                      type="number"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Amount in SOL"
                      step="0.1"
                    />
                    <button
                      onClick={donate}
                      disabled={loading || !donationAmount}
                      className="bg-green-600 text-white px-8 py-3 rounded-lg disabled:opacity-50 hover:bg-green-700"
                    >
                      {loading ? 'Donating...' : 'Donate'}
                    </button>
                  </div>
                </div>
              )}

              {/* Owner Actions */}
              {isOwner && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Owner Actions:</h4>
                  
                  {('active' in project.status || 'targetReached' in project.status) && (
                    <button
                      onClick={closeProject}
                      disabled={loading}
                      className="w-full bg-yellow-600 text-white py-3 rounded-lg disabled:opacity-50 hover:bg-yellow-700"
                    >
                      {loading ? 'Processing...' : 'Close Project'}
                    </button>
                  )}
                  
                  {'success' in project.status && (
                    <button
                      onClick={withdraw}
                      disabled={loading}
                      className="w-full bg-purple-600 text-white py-3 rounded-lg disabled:opacity-50 hover:bg-purple-700"
                    >
                      {loading ? 'Withdrawing...' : 'Withdraw All Funds'}
                    </button>
                  )}

                  {'failed' in project.status && project.donators.length === 0 && (
                    <button
                      onClick={closeFailedProject}
                      disabled={loading}
                      className="w-full bg-red-600 text-white py-3 rounded-lg disabled:opacity-50 hover:bg-red-700"
                    >
                      {loading ? 'Closing...' : 'Close Failed Project (Delete Account)'}
                    </button>
                  )}
                </div>
              )}

              {/* Refund Actions */}
              {'failed' in project.status && isDonator && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Refund Available:</h4>
                  <button
                    onClick={claimRefund}
                    disabled={loading}
                    className="w-full bg-red-600 text-white py-3 rounded-lg disabled:opacity-50 hover:bg-red-700"
                  >
                    {loading ? 'Claiming...' : 'Claim Your Refund'}
                  </button>
                </div>
              )}
            </div>

            {/* Status Info */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Project Information:</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>• Program ID: {PROGRAM_ID.toString()}</p>
                <p>• Network: Devnet</p>
                <p>• Total Raised: {(project.balance / 1e9).toFixed(4)} SOL</p>
                <p>• Target: {(project.financialTarget / 1e9).toFixed(4)} SOL</p>
                <p>• Donators Count: {project.donators.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}