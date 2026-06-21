"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { getYesterdaysNews } from "./news";
export default function Home() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; chosen: string; correct: string }[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [signupStatus, setSignupStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
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
  useEffect(() => {
    getYesterdaysNews().then((articles) => {
      setNewsArticles(articles);
      console.log(articles);
    });
  }, []);
  const roundedSeconds = Math.floor(seconds / 10) * 10;
  const minutes = Math.floor(roundedSeconds / 60);
  const displaySeconds = roundedSeconds % 60;
  if (quizComplete) {
    const score = answers.filter(a => a.chosen === a.correct).length;
    const totalTime = minutes > 0 ? `${minutes} min ${displaySeconds} sec` : `${displaySeconds} sec`;

    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-start gap-8 py-32 px-16 bg-white dark:bg-black">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
              Quiz Complete!
            </h1>
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              You scored {score} out of {questions.length} in {totalTime}
            </p>
          </div>

          <div className="w-full max-w-md flex flex-col gap-6">
            {answers.map((answer, index) => (
              <div key={index} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Question {index + 1}
                </p>
                <p className="text-base font-semibold text-black dark:text-zinc-50 mb-4">
                  {answer.question}
                </p>
                <div className="flex flex-col gap-2">
                  <p className={`text-sm px-3 py-2 rounded-lg ${answer.chosen === answer.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    Your answer: {answer.chosen}
                  </p>
                  {answer.chosen !== answer.correct && (
                    <p className="text-sm px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
                      Correct answer: {answer.correct}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
              Compare your results
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Sign up to receive your ranking compared to all other quizzers tonight at midnight.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-base text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-base text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                <option value="">Select your age group</option>
                <option value="under-60">Under 60</option>
                <option value="60-65">60–65</option>
                <option value="66-70">66–70</option>
                <option value="71-75">71–75</option>
                <option value="76-80">76–80</option>
                <option value="81+">81+</option>
              </select>
              <button
                onClick={async () => {
                  setSignupStatus("submitting");

                  const { error } = await supabase
                    .from("signups")
                    .insert({ name: name, email: email, age_group: ageGroup });

                  if (error) {
                    setSignupStatus("error");
                  } else {
                    setSignupStatus("success");
                  }
                }}
                disabled={signupStatus === "submitting" || signupStatus === "success"}
                className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-50"
              >
                {signupStatus === "submitting" ? "Saving..." : signupStatus === "success" ? "You're signed up! ✓" : "Send me my ranking tonight"}
              </button>
            </div>
          </div>

        </main>
      </div>
    );
  }
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

          <p className="mt-4 min-h-[72px] text-base text-zinc-700 dark:text-zinc-300">
            {typedText}
          </p>

          <button
            onClick={() => {
              const newAnswers = [...answers, {
                question: currentQuestion.question,
                chosen: selectedAnswer ?? "",
                correct: currentQuestion.correctAnswer,
              }];
              setAnswers(newAnswers);

              if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setSelectedAnswer(null);
                setTypedText("");
                setIsRunning(true);
              } else {
                setQuizComplete(true);
                setIsRunning(false);
              }
            }}
            className={`mt-6 w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 ${selectedAnswer !== null && (typingComplete || selectedAnswer === currentQuestion.correctAnswer)
              ? "visible"
              : "invisible"
              }`}
          >
            {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish"}
          </button>
        </div>
      </main>
    </div>
  );
}
