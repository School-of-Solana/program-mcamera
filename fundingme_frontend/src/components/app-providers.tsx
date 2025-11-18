'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { ReactQueryProvider } from './react-query-provider'
import { SimpleSolanaProvider } from '@/components/solana/simple-solana-provider'
import { Toaster } from 'sonner'
import React from 'react'

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ReactQueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <SimpleSolanaProvider>
          {children}
          <Toaster />
        </SimpleSolanaProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  )
}
