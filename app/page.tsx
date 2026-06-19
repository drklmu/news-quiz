"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
export default function Home() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const questions = [
    {
      question: "Which city hosted yesterday's big climate summit?",
      choices: ["Paris", "Tokyo", "Berlin", "Nairobi"],
      correctAnswer: "Nairobi",
      explanation: "Nairobi hosted the UN Climate Summit, bringing together leaders from across Africa and beyond.",
    },
    {
      question: "Which company announced a major product launch yesterday?",
      choices: ["Apple", "Samsung", "Google", "Microsoft"],
      correctAnswer: "Apple",
      explanation: "Apple unveiled its newest device at a press event, drawing significant media attention.",
    },
    {
      question: "Which sport saw a record-breaking performance yesterday?",
      choices: ["Tennis", "Swimming", "Athletics", "Cycling"],
      correctAnswer: "Swimming",
      explanation: "A swimmer broke a world record at an international competition held yesterday.",
    },
  ];
  const currentQuestion = questions[currentQuestionIndex];
  const [typedText, setTypedText] = useState("");
  const typingComplete = typedText.length === currentQuestion.explanation.length;
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);
  useEffect(() => {
    if (selectedAnswer === null || selectedAnswer === currentQuestion.correctAnswer) return;

    setTypedText("");
    let index = 0;

    const typingInterval = setInterval(() => {
      index++;
      setTypedText(currentQuestion.explanation.slice(0, index));

      if (index >= currentQuestion.explanation.length) {
        clearInterval(typingInterval);
      }
    }, 45);

    return () => clearInterval(typingInterval);
  }, [selectedAnswer]);
  const roundedSeconds = Math.floor(seconds / 10) * 10;
  const minutes = Math.floor(roundedSeconds / 60);
  const displaySeconds = roundedSeconds % 60;
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-start gap-8 py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Daily News Quiz
          </h1>
          <p className="max-w-md text-xl text-zinc-600 dark:text-zinc-400">
            Test your memory of yesterday&apos;s news
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              ⏱ {minutes > 0 ? `${minutes} min ${displaySeconds} sec` : `${displaySeconds} sec`}
            </p>
          </div>

          <h2 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">
            {currentQuestion.question}
          </h2>

          <div className="flex flex-col gap-3">
            {currentQuestion.choices.map((choice) => (
              <button
                key={choice}
                onClick={() => {
                  setSelectedAnswer(choice);
                  setIsRunning(false);
                }}
                className={`rounded-xl border px-4 py-3 text-left ${selectedAnswer === null
                  ? "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  : choice === currentQuestion.correctAnswer && (selectedAnswer === currentQuestion.correctAnswer || typingComplete)
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : selectedAnswer === choice
                      ? "border-red-500 bg-red-50 dark:bg-red-950"
                      : "border-zinc-200 opacity-50"
                  }`}
              >
                {choice}
              </button>
            ))}
          </div>

          {typedText && (
            <p className="mt-4 text-base text-zinc-700 dark:text-zinc-300">
              {typedText}
            </p>
          )}

          {selectedAnswer !== null && (typingComplete || selectedAnswer === currentQuestion.correctAnswer) && (
            <button
              onClick={() => {
                if (currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                }
                setSelectedAnswer(null);
                setTypedText("");
                setIsRunning(true);
              }}
              className="mt-6 w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
