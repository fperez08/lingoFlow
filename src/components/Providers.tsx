'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiClientProvider } from '@/lib/api-client'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider>
        {children}
      </ApiClientProvider>
    </QueryClientProvider>
  )
}
