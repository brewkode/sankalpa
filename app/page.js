import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-light text-stone-700 tracking-tight">
          Sankalpa
        </h1>
        <p className="mt-2 text-stone-500 text-lg font-light">
          From intention to action.
        </p>
        <div className="mt-12">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-stone-800 text-stone-50 px-6 py-3 text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            Continue with Google
          </Link>
        </div>
      </div>
    </main>
  );
}
