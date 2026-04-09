import Link from 'next/link'

export default function Home() {
  return (
    <main>
      <h1>Welcome to lingoFlow</h1>
      <p>Please <Link href="/register">register</Link> to get started.</p>
    </main>
  )
}
