'use client'

import { useState } from 'react'
import ImportVideoModal from '@/components/ImportVideoModal'

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleImportSuccess = () => {
    setIsModalOpen(false)
  }

  return (
    <main className="dashboard-page">
      <h1>Dashboard</h1>
      <p>Welcome to lingoFlow! You have successfully registered.</p>
      <button onClick={() => setIsModalOpen(true)}>Import Video</button>
      <ImportVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </main>
  )
}
