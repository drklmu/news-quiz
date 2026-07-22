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
    const [started, setStarted] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [playId, setPlayId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [ageGroup, setAgeGroup] = useState("");
    const [signupStatus, setSignupStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [signupError, setSignupError] = useState("");
    const [saveScore, setSaveScore] = useState(false);

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
        if (!isRunning || !started) return;
        const interval = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, [isRunning, started]);

    // Auto-reveal slices
    useEffect(() => {
        if (!isRunning || !started || selectedAnswer !== null || !currentQuestion) return;
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
    }, [revealedSlices, isRunning, started, selectedAnswer, sliceOrder, currentQuestion]);

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
    const savePlay = async (finalScore: number) => {
        try {
            const res = await fetch("/api/save-score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quiz: "picture", score: finalScore, seconds }),
            });
            if (!res.ok) throw new Error("save failed");
            const data = await res.json();
            setPlayId(data.playId);
            localStorage.setItem("lastPicturePlayId", data.playId);
        } catch (err) {
            console.error("Could not save score:", err);
        }
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
            const finalScore = newAnswers.filter(a => a.correct).length;
            savePlay(finalScore);
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

                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
                            Compare your results
                        </h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                            Sign up and we'll email you your ranking against all other players once today's results are in.
                        </p>

                        {signupStatus === "success" ? (
                            <div className="rounded-xl border border-green-500 bg-green-50 dark:bg-green-950 px-4 py-3 text-center">
                                <p className="text-green-700 dark:text-green-400 font-medium">You're signed up! ✓</p>
                                <p className="text-green-600 dark:text-green-500 text-sm mt-1">
                                    Check your email tonight for your ranking.
                                </p>
                            </div>
                        ) : (
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

                                {signupStatus === "error" && (
                                    <p className="text-sm text-red-600 dark:text-red-400 px-1">{signupError}</p>
                                )}

                                <button
                                    onClick={async () => {
                                        setSignupStatus("submitting");
                                        setSignupError("");
                                        try {
                                            const res = await fetch("/api/signup", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    quiz: "picture",
                                                    playId: playId ?? localStorage.getItem("lastPicturePlayId"),
                                                    name,
                                                    email,
                                                    ageGroup,
                                                }),
                                            });
                                            const data = await res.json();
                                            if (!res.ok) {
                                                setSignupError(data.error ?? "Something went wrong. Please try again.");
                                                setSignupStatus("error");
                                            } else {
                                                setSignupStatus("success");
                                            }
                                        } catch {
                                            setSignupError("Something went wrong. Please try again.");
                                            setSignupStatus("error");
                                        }
                                    }}
                                    disabled={signupStatus === "submitting"}
                                    className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-50"
                                >
                                    {signupStatus === "submitting" ? "Saving..." : "Send me my ranking tonight"}
                                </button>
                            </div>
                        )}
                    </div>
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
                        {!started && (
                            <>
                                <div className="absolute top-4 left-4 right-4 z-10">
                                    <div className="bg-zinc-800 dark:bg-zinc-700 text-white text-sm rounded-xl px-4 py-3 text-center">
                                        Each picture reveals itself one slice at a time. If you haven&apos;t answered by the 10th slice, it counts as a miss. One attempt per picture — no going back!
                                    </div>
                                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-zinc-800 dark:border-t-zinc-700" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-xl">
                                    <button
                                        onClick={() => { setStarted(true); setIsRunning(true); }}
                                        className="bg-white text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-zinc-100"
                                    >
                                        Start
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {started && (
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
                    )}

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