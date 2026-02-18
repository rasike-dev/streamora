export default function Home() {
  return (
    <main className="min-h-dvh p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Streamora</h1>
        <p className="text-sm text-gray-600">
          Creator-verified video platform (Phase 0–2 build)
        </p>
      </header>

      <section className="space-y-3">
        <a className="block rounded-xl border p-4" href="/login">
          Login
        </a>
        <a className="block rounded-xl border p-4" href="/dashboard">
          Creator Dashboard
        </a>
        <a className="block rounded-xl border p-4" href="/admin">
          Admin
        </a>
      </section>
    </main>
  );
}
