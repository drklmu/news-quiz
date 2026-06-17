"use client";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Daily News Quiz
          </h1>
          <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
            Test your memory of yesterday's news
          </p><div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Question 1 of 5
            </p>
            <h2 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">
              Which city hosted yesterday's big climate summit?
            </h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSelectedAnswer("Paris")}
                className={`rounded-xl border px-4 py-3 text-left ${selectedAnswer === "Paris"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"}`}>
                Paris
              </button>
              <button
                onClick={() => setSelectedAnswer("Tokyo")}
                className={`rounded-xl border px-4 py-3 text-left ${selectedAnswer === "Tokyo"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"}`}>
                Tokyo
              </button>
              <button
                onClick={() => setSelectedAnswer("Berlin")}
                className={`rounded-xl border px-4 py-3 text-left ${selectedAnswer === "Berlin"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"}`}>
                Berlin
              </button>
              <button
                onClick={() => setSelectedAnswer("Nairobi")}
                className={`rounded-xl border px-4 py-3 text-left ${selectedAnswer === "Nairobi"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"}`}>
                Nairobi
              </button>
            </div>
          </div></div>
      </main>
    </div>
  );
}
