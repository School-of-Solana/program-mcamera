import { PublicKey } from '@solana/web3.js'

// Import the IDL type
export type FundingmeDapp = {
  version: '0.1.0'
  name: 'fundingme_dapp'
  instructions: [
    {
      name: 'claimRefund'
      accounts: [
        { name: 'donator'; isMut: true; isSigner: true },
        { name: 'project'; isMut: true; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false }
      ]
      args: []
    },
    {
      name: 'closeFailedProject'
      accounts: [
        { name: 'user'; isMut: true; isSigner: true },
        { name: 'project'; isMut: true; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false }
      ]
      args: []
    },
    {
      name: 'closeProject'
      accounts: [
        { name: 'user'; isMut: true; isSigner: true },
        { name: 'project'; isMut: true; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false }
      ]
      args: []
    },
    {
      name: 'createProject'
      accounts: [
        { name: 'user'; isMut: true; isSigner: true },
        { name: 'project'; isMut: true; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false }
      ]
      args: [
        { name: 'name'; type: 'string' },
        { name: 'financialTarget'; type: 'u64' }
      ]
    },
    {
      name: 'donate'
      accounts: [
        { name: 'user'; isMut: true; isSigner: true },
        { name: 'project'; isMut: true; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false }
      ]
      args: [{ name: 'amount'; type: 'u64' }]
    },
    {
      name: 'getDonatorCount'
      accounts: [
        { name: 'user'; isMut: true; isSigner: true },
        { name: 'project'; isMut: true; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false }
      ]
      args: []
      returns: 'u64'
    },
    {
      name: 'withdraw'
      accounts: [
        { name: 'user'; isMut: true; isSigner: true },
        { name: 'project'; isMut: true; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false }
      ]
      args: []
    }
  ]
  accounts: [
    {
      name: 'projectAccount'
      type: {
        kind: 'struct'
        fields: [
          { name: 'owner'; type: 'publicKey' },
          { name: 'name'; type: 'string' },
          { name: 'financialTarget'; type: 'u64' },
          { name: 'balance'; type: 'u64' },
          { name: 'status'; type: { defined: 'ProjectStatus' } },
          { name: 'donators'; type: { vec: { defined: 'Donator' } } },
          { name: 'bump'; type: 'u8' }
        ]
      }
    }
  ]
  types: [
    {
      name: 'Donator'
      type: {
        kind: 'struct'
        fields: [
          { name: 'user'; type: 'publicKey' },
          { name: 'amount'; type: 'u64' }
        ]
      }
    },
    {
      name: 'ProjectStatus'
      type: {
        kind: 'enum'
        variants: [
          { name: 'Active' },
          { name: 'Paused' },
          { name: 'TargetReached' },
          { name: 'Success' },
          { name: 'Failed' }
        ]
      }
    }
  ]
  errors: [
    { code: 6000; name: 'InvalidProjectStatus'; msg: 'Invalid project status for this operation' },
    { code: 6001; name: 'ProjectWithdrawNotAvailable'; msg: 'Project is not available for this withdraw operation' },
    { code: 6002; name: 'UserNotAuthorized'; msg: 'User not authorized for this operation' }
  ]
}

// Simplified types to avoid complex IDL constraints
export type ProjectAccount = {
  owner: PublicKey
  name: string
  financialTarget: any
  balance: any
  status: ProjectStatus
  donators: Donator[]
  bump: number
}

export type Donator = {
  user: PublicKey
  amount: number
}

export type ProjectStatus = 
  | { active: Record<string, never> }
  | { paused: Record<string, never> }
  | { targetReached: Record<string, never> }
  | { success: Record<string, never> }
  | { failed: Record<string, never> }

export type ProjectData = {
  owner: PublicKey
  name: string
  financialTarget: number
  balance: number
  status: ProjectStatus
  donators: Donator[]
  bump: number
}