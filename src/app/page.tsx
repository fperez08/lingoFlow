import Link from 'next/link'

export default function Home() {
  return (
    <main>
      <h1>Welcome to lingoFlow</h1>
      <p>
        <Link href="/register">Register</Link> or <Link href="/login">Login</Link> to get started.
      </p>
    </main>
  )
}
