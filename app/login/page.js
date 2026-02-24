import Link from "next/link";

export default function LoginPage() {
  console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-light text-stone-700 tracking-tight">
          Sign in
        </h1>
        <p className="mt-2 text-stone-500 text-sm">
          Google OAuth will be wired here.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="text-stone-500 text-sm hover:text-stone-700 underline"
          >
            ← Back
          </Link>
        </div>
      </div>
    </main>
  );
}
