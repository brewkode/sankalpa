import LoginButton from "./LoginButton";

export default function Landing() {
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
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
