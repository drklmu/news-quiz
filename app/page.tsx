"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
export default function Home() {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const correctAnswer: string = "Nairobi";
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);
  const roundedSeconds = Math.floor(seconds / 10) * 10;
  const minutes = Math.floor(roundedSeconds / 60);
  const displaySeconds = roundedSeconds % 60;
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
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Question 1 of 5
              </p>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                ⏱ {minutes > 0 ? `${minutes} min ${displaySeconds} sec` : `${displaySeconds} sec`}
              </p>
            </div>
            <h2 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">
              Which city hosted yesterday's big climate summit?
            </h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setSelectedAnswer("Paris");
                  setIsRunning(false);
                }}
                className={`rounded-xl border px-4 py-3 text-left ${selectedAnswer === null
                  ? "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  : "Paris" === correctAnswer
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : selectedAnswer === "Paris"
                      ? "border-red-500 bg-red-50 dark:bg-red-950"
                      : "border-zinc-200 opacity-50"
                  }`}>
                Paris
              </button>
              <button
                onClick={() => {
                  setSelectedAnswer("Tokyo");
                  setIsRunning(false);
                }}
                className={`rounded-xl border px-4 py-3 text-left ${selectedAnswer === null
                  ? "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  : "Tokyo" === correctAnswer
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : selectedAnswer === "Tokyo"
                      ? "border-red-500 bg-red-50 dark:bg-red-950"
                      : "border-zinc-200 opacity-50"
                  }`}>
                Tokyo
              </button>
              <button
                onClick={() => {
                  setSelectedAnswer("Berlin");
                  setIsRunning(false);
                }}
                className={`rounded-xl border px-4 py-3 text-left ${selectedAnswer === null
                  ? "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  : "Berlin" === correctAnswer
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : selectedAnswer === "Berlin"
                      ? "border-red-500 bg-red-50 dark:bg-red-950"
                      : "border-zinc-200 opacity-50"
                  }`}>
                Berlin
              </button>
              <button
                onClick={() => {
                  setSelectedAnswer("Nairobi");
                  setIsRunning(false);
                }}
                className={`rounded-xl border px-4 py-3 text-left ${selectedAnswer === null
                  ? "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  : "Nairobi" === correctAnswer
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : selectedAnswer === "Nairobi"
                      ? "border-red-500 bg-red-50 dark:bg-red-950"
                      : "border-zinc-200 opacity-50"
                  }`}>
                Nairobi
              </button>
            </div>
          </div></div>
      </main >
    </div >
  );
}
