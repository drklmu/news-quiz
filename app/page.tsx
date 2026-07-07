export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black min-h-screen">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-8 py-16 px-8 bg-white dark:bg-black">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-3">
            Daily Brain Training
          </h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400">
            Two daily quizzes to keep your mind sharp
          </p>
        </div>

        <div className="w-full grid grid-cols-1 gap-6 sm:grid-cols-2">
          <a href="/news" className="group w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 hover:shadow-md transition-shadow">
            <div className="mb-4 text-4xl">📰</div>
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-2">
              News Quiz
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              Test your memory of yesterday&apos;s headlines. 10 questions, new every day.
            </p>
            <div className="inline-block bg-black text-white dark:bg-white dark:text-black px-5 py-2 rounded-xl font-medium">
              Play Now
            </div>
          </a>

          <div className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 opacity-60">
            <div className="mb-4 text-4xl">🖼️</div>
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-2">
              Picture Quiz
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              Identify everyday objects connected to a historical event. Coming soon.
            </p>
            <div className="inline-block bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400 px-5 py-2 rounded-xl font-medium">
              Coming Soon
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}