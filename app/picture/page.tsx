"use client";
import { useState, useEffect, useRef } from "react";

const TOTAL_SLICES = 16;
const REVEAL_INTERVAL = 5000;

export default function PictureQuiz() {
    const [quizData, setQuizData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [alreadyPlayed, setAlreadyPlayed] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [revealedSlices, setRevealedSlices] = useState<number[]>([]);
    const [sliceOrder, setSliceOrder] = useState<number[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [quizComplete, setQuizComplete] = useState(false);
    const [answers, setAnswers] = useState<{ correct: boolean }[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    function getTodayDate() {
        return new Date().toLocaleDateString("en-US", {
            timeZone: "America/New_York",
            year: "numeric", month: "2-digit", day: "2-digit",
        }).split("/").reverse().join("-").replace(/(\d{4})-(\d{2})-(\d{2})/, "$1-$3-$2");
    }

    // Fetch quiz data
    useEffect(() => {
        const today = getTodayDate();
        const played = localStorage.getItem("lastPlayedPictureDate");
        if (played === today) {
            setAlreadyPlayed(true);
            setIsLoading(false);
            return;
        }

        fetch("/api/daily-picture-quiz")
            .then(res => {
                if (!res.ok) throw new Error("Failed to load");
                return res.json();
            })
            .then(data => {
                if (!data.questions || data.questions.length === 0) throw new Error("No questions");
                setQuizData(data);
                setIsLoading(false);
                setIsRunning(true);
            })
            .catch(() => {
                setLoadError(true);
                setIsLoading(false);
            });
    }, []);

    const questions = quizData?.questions || [];
    const currentQuestion = questions[currentIndex];

    // Initialize slices when question changes
    useEffect(() => {
        if (!currentQuestion) return;
        const order = Array.from({ length: TOTAL_SLICES }, (_, i) => i).sort(() => Math.random() - 0.5);
        setSliceOrder(order);
        setRevealedSlices([order[0]]);
    }, [currentIndex, quizData]);

    // Timer
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, [isRunning]);

    // Auto-reveal slices
    useEffect(() => {
        if (!isRunning || selectedAnswer !== null || !currentQuestion) return;
        if (revealedSlices.length === 10) {
            setRevealedSlices(sliceOrder);
            setSelectedAnswer("__timeout__");
            setIsRunning(false);
            return;
        }
        if (revealedSlices.length >= TOTAL_SLICES) return;
        const timeout = setTimeout(() => {
            setRevealedSlices(prev => [...prev, sliceOrder[prev.length]]);
        }, REVEAL_INTERVAL);
        return () => clearTimeout(timeout);
    }, [revealedSlices, isRunning, selectedAnswer, sliceOrder, currentQuestion]);

    // Draw canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const size = canvas.width;
        const cx = size / 2;
        const cy = size / 2;
        const radius = size * 0.72;
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        revealedSlices.forEach(sliceIndex => {
            const startAngle = (sliceIndex / TOTAL_SLICES) * Math.PI * 2 - Math.PI / 2;
            const endAngle = ((sliceIndex + 1) / TOTAL_SLICES) * Math.PI * 2 - Math.PI / 2;
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
        });
    }, [revealedSlices]);

    const handleAnswer = (choice: string) => {
        setSelectedAnswer(choice);
        setIsRunning(false);
        setRevealedSlices(Array.from({ length: TOTAL_SLICES }, (_, i) => i));
    };

    const handleNext = () => {
        const isCorrect = selectedAnswer === currentQuestion.answer;
        const newAnswers = [...answers, { correct: isCorrect }];
        setAnswers(newAnswers);

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setSelectedAnswer(null);
            setIsRunning(true);
        } else {
            setQuizComplete(true);
            setIsRunning(false);
            localStorage.setItem("lastPlayedPictureDate", getTodayDate());
        }
    };

    const score = answers.filter(a => a.correct).length;
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    const timeDisplay = minutes > 0 ? `${minutes} min ${displaySeconds} sec` : `${displaySeconds} sec`;

    // Screens
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black font-sans">
                <p className="text-zinc-500 dark:text-zinc-400">Loading today's picture quiz...</p>
            </div>
        );
    }

    if (alreadyPlayed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black font-sans p-8">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-black dark:text-white mb-3">You've already played today!</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Come back tomorrow for a new set of pictures.</p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black font-sans p-8">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-black dark:text-white mb-3">Something went wrong</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-6">Could not load today's picture quiz. Try again later.</p>
                </div>
            </div>
        );
    }

    if (!currentQuestion && !quizComplete) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black font-sans p-8">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-black dark:text-white mb-3">No pictures available today</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Check back tomorrow!</p>
                </div>
            </div>
        );
    }

    if (quizComplete) {
        return (
            <div className="flex flex-col items-center justify-start min-h-screen bg-zinc-50 dark:bg-black font-sans py-16 px-4">
                <div className="w-full max-w-md flex flex-col gap-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Quiz Complete!</h1>
                        <p className="text-xl text-zinc-500 dark:text-zinc-400">
                            You scored {score} out of {questions.length} in {timeDisplay}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-6">
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-2">Today's theme was:</p>
                        <p className="text-black dark:text-white font-semibold text-lg mb-2">
                            {quizData?.event_title} ({quizData?.event_year})
                        </p>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                            {quizData?.event_description}
                        </p>
                    </div>

                    <a href="/picture" className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-center">
                        See Tomorrow's Quiz
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-start min-h-screen bg-zinc-50 dark:bg-black font-sans py-16 px-4">
            <div className="w-full max-w-md flex flex-col gap-6">

                <div className="text-center">
                    <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Picture Quiz</h1>
                    <p className="text-xl text-zinc-500 dark:text-zinc-400">What do you see?</p>
                </div>

                <div className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col h-[700px] overflow-hidden">

                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-zinc-500">Picture {currentIndex + 1} of {questions.length}</p>
                        <p className="text-sm text-zinc-500">⏱ {timeDisplay}</p>
                    </div>

                    <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 mb-4">
                        <img
                            src={currentQuestion.image_url}
                            alt="Quiz image"
                            className="w-full h-full object-cover"
                            ref={el => { imageRef.current = el; }}
                        />
                        <canvas
                            ref={canvasRef}
                            width={600}
                            height={600}
                            className="absolute inset-0 w-full h-full"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        {currentQuestion.choices.map((choice: string) => (
                            <button
                                key={choice}
                                onClick={() => selectedAnswer === null && handleAnswer(choice)}
                                className={`rounded-xl border px-4 py-3 text-left transition-colors ${selectedAnswer === null
                                        ? "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                        : choice === currentQuestion.answer
                                            ? "border-green-500 bg-green-50 dark:bg-green-950"
                                            : selectedAnswer === choice
                                                ? "border-red-500 bg-red-50 dark:bg-red-950"
                                                : "border-zinc-200 opacity-50 dark:border-zinc-700"
                                    }`}
                            >
                                {choice}
                            </button>
                        ))}
                    </div>

                    {selectedAnswer === "__timeout__" && (
                        <div className="mt-4 rounded-xl border border-red-500 bg-red-50 dark:bg-red-950 px-4 py-3 text-center">
                            <p className="text-red-600 dark:text-red-400 font-medium">⏰ Time's up!</p>
                            <p className="text-red-500 text-sm mt-1">The correct answer was: <strong>{currentQuestion.answer}</strong></p>
                        </div>
                    )}

                    <button
                        onClick={handleNext}
                        className={`mt-4 w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 ${selectedAnswer !== null ? "visible" : "invisible"
                            }`}
                    >
                        {currentIndex < questions.length - 1 ? "Next Picture" : "See Results"}
                    </button>

                </div>
            </div>
        </div>
    );
}