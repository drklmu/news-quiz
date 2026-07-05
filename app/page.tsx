"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
function getTodayDate() {
  return new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).split("/").reverse().join("-").replace(/(\d{4})-(\d{2})-(\d{2})/, "$1-$3-$2");
}
export default function Home() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; chosen: string; correct: string }[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [signupStatus, setSignupStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const questions = quizQuestions;
  const currentQuestion = questions[currentQuestionIndex];
  const [typedText, setTypedText] = useState("");
  const typingComplete = currentQuestion ? typedText.length === currentQuestion.explanation.length : false; const [seconds, setSeconds] = useState(0);
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
    fetch("/api/daily-quiz")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load quiz");
        return res.json();
      })
      .then((data) => {
        if (!data.questions || data.questions.length === 0) {
          throw new Error("No questions available");
        }
        setQuizQuestions(data.questions);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        setLoadError(true);
      });
  }, []);
  const roundedSeconds = Math.floor(seconds / 10) * 10;
  const minutes = Math.floor(roundedSeconds / 60);
  const displaySeconds = roundedSeconds % 60;
  const clampToSentences = (text: string, maxChars: number) => {
    if (text.length <= maxChars) return text;
    const truncated = text.slice(0, maxChars);
    const lastPeriod = Math.max(
      truncated.lastIndexOf(". "),
      truncated.lastIndexOf("! "),
      truncated.lastIndexOf("? ")
    );
    if (lastPeriod === -1) return "";
    return truncated.slice(0, lastPeriod + 1);
  };
  if (isLoading) {
    const clampToSentences = (text: string, maxChars: number) => {
      if (text.length <= maxChars) return text;
      const truncated = text.slice(0, maxChars);
      const lastPeriod = Math.max(
        truncated.lastIndexOf(". "),
        truncated.lastIndexOf("! "),
        truncated.lastIndexOf("? ")
      );
      if (lastPeriod === -1) return "";
      return truncated.slice(0, lastPeriod + 1);
    };
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-4 py-32 px-16 bg-white dark:bg-black">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-3">
              Preparing today&apos;s quiz...
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Reading the latest news and generating your questions
            </p>
          </div>
        </main>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-6 py-32 px-16 bg-white dark:bg-black">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-3">
              Something went wrong
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              We couldn&apos;t load today&apos;s quiz. This might be a temporary issue — please try again.
            </p>
            <button
              onClick={() => {
                setLoadError(false);
                setIsLoading(true);
                fetch("/api/daily-quiz")
                  .then((res) => {
                    if (!res.ok) throw new Error("Failed to load quiz");
                    return res.json();
                  })
                  .then((data) => {
                    if (!data.questions || data.questions.length === 0) {
                      throw new Error("No questions available");
                    }
                    setQuizQuestions(data.questions);
                    setIsLoading(false);
                  })
                  .catch(() => {
                    setIsLoading(false);
                    setLoadError(true);
                  });
              }}
              className="rounded-xl bg-black px-6 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }
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

          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col h-[700px] overflow-hidden">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
              Compare your results
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Sign up to receive your ranking compared to all other quizzers tonight at midnight.
            </p>
            <div className="flex flex-col gap-3 h-[220px] overflow-hidden">
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

                  const score = answers.filter(a => a.chosen === a.correct).length;
                  const { error } = await supabase
                    .from("signups")
                    .insert({
                      name: name,
                      email: email,
                      age_group: ageGroup,
                      score: score,
                      quiz_date: getTodayDate()
                    });

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

        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col h-[700px] overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              ⏱ {minutes > 0 ? `${minutes} min ${displaySeconds} sec` : `${displaySeconds} sec`}
            </p>
          </div>

          <h2 className="mb-6 h-[120px] overflow-hidden text-xl font-semibold text-black dark:text-zinc-50">
            {currentQuestion.question}
          </h2>

          <div className="flex flex-col gap-3">
            {currentQuestion.choices.map((choice: string) => (
              <button
                key={choice}
                onClick={() => {
                  setSelectedAnswer(choice);
                  setIsRunning(false);
                }}
                className={`rounded-xl border px-4 py-3 text-left min-h-[48px] max-h-[96px] overflow-hidden ${selectedAnswer === null
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

          <p className="mt-4 h-[192px] overflow-hidden text-base text-zinc-700 dark:text-zinc-300">
            {clampToSentences(typedText, 450)}
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
