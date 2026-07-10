"use client";
import { useState, useEffect, useRef } from "react";

const TOTAL_SLICES = 16;
const REVEAL_INTERVAL = 5000;

// Placeholder images for testing - we'll replace these with real Hawaii images

const TEST_QUESTIONS = [
    {
        image: "https://res.cloudinary.com/chvraqs8/image/upload/v1783707980/2026-07-07_01-pineapple_sh8yu8.jpg",
        answer: "Pineapple",
        choices: ["Pineapple", "Mango Tree", "Sugar Cane", "Coconut Palm"],
    },
    {
        image: "https://res.cloudinary.com/chvraqs8/image/upload/v1783707980/2026-07-07_02-beach_y4h7vd.jpg",
        answer: "Tropical Beach",
        choices: ["Tropical Beach", "Rocky Desert", "Arctic Tundra", "Mountain Lake"],
    },
    {
        image: "https://res.cloudinary.com/chvraqs8/image/upload/v1783707980/2026-07-07_03-magnum_pi_st0mgr.jpg",
        answer: "Magnum P.I.",
        choices: ["Magnum P.I.", "Miami Vice", "The Rockford Files", "Simon & Simon"],
    },
    {
        image: "https://res.cloudinary.com/chvraqs8/image/upload/v1783707979/2026-07-07_04-hawaii_flag_p04uyi.jpg",
        answer: "Hawaiian Flag",
        choices: ["Hawaiian Flag", "Fijian Flag", "Samoan Flag", "Puerto Rican Flag"],
    },
    {
        image: "https://res.cloudinary.com/chvraqs8/image/upload/v1783707979/2026-07-07_05-lei_flower_garland_p6bqj6.jpg",
        answer: "Lei Garland",
        choices: ["Lei Garland", "Mardi Gras Beads", "Flower Crown", "Marigold Necklace"],
    },
    {
        image: "https://res.cloudinary.com/chvraqs8/image/upload/v1783707980/2026-07-07_06-ukelele_ldz51d.jpg",
        answer: "Ukulele",
        choices: ["Ukulele", "Mandolin", "Banjo", "Balalaika"],
    },
    {
        image: "https://res.cloudinary.com/chvraqs8/image/upload/v1783707979/2026-07-07_07-hula_dancers_kbav1i.jpg",
        answer: "Hula Dancers",
        choices: ["Hula Dancers", "Flamenco Dancers", "Tahitian Dancers", "Balinese Dancers"],
    },
    {
        image: "https://res.cloudinary.com/chvraqs8/image/upload/v1783707979/2026-07-07_08-iolani_palace_afbrsx.jpg",
        answer: "Iolani Palace",
        choices: ["Iolani Palace", "Buckingham Palace", "Palace of Fine Arts", "Governor's Mansion"],
    },
    {
        image: "https://res.cloudinary.com/chvraqs8/image/upload/v1783707979/2026-07-07_09-hawaii_five-o_o2mhtt.jpg",
        answer: "Hawaii Five-O",
        choices: ["Hawaii Five-O", "Baywatch", "NCIS Los Angeles", "The A-Team"],
    },
    {
        image: "https://res.cloudinary.com/chvraqs8/image/upload/v1783707979/2026-07-07_10-shaka_sign_oblbyj.jpg",
        answer: "Shaka Sign",
        choices: ["Shaka Sign", "Thumbs Up", "Peace Sign", "Rock On Sign"],
    },
];

export default function PictureQuiz() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [revealedSlices, setRevealedSlices] = useState<number[]>([]);
    const [sliceOrder, setSliceOrder] = useState<number[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(true);
    const [seconds, setSeconds] = useState(0);
    const [quizComplete, setQuizComplete] = useState(false);
    const [answers, setAnswers] = useState<{ correct: boolean }[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const currentQuestion = TEST_QUESTIONS[currentIndex];

    // Generate random slice order on mount and when question changes
    useEffect(() => {
        const order = Array.from({ length: TOTAL_SLICES }, (_, i) => i)
            .sort(() => Math.random() - 0.5);
        setSliceOrder(order);
        setRevealedSlices([order[0]]);
    }, [currentIndex]);

    // Timer
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, [isRunning]);

    // Auto-reveal slices every 5 seconds
    useEffect(() => {
        if (!isRunning || selectedAnswer !== null) return;

        if (revealedSlices.length === 10) {
            // Failed — reveal all remaining slices at once
            setRevealedSlices(sliceOrder);
            setSelectedAnswer("__timeout__");
            setIsRunning(false);
            return;
        }

        if (revealedSlices.length >= TOTAL_SLICES) return;

        const timeout = setTimeout(() => {
            setRevealedSlices(prev => [
                ...prev,
                sliceOrder[prev.length]
            ]);
        }, REVEAL_INTERVAL);
        return () => clearTimeout(timeout);
    }, [revealedSlices, isRunning, selectedAnswer, sliceOrder]);

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

        // Draw black overlay
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Cut out revealed slices
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

        if (currentIndex < TEST_QUESTIONS.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setSelectedAnswer(null);
            setIsRunning(true);
        } else {
            setQuizComplete(true);
        }
    };

    const score = answers.filter(a => a.correct).length;
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    const timeDisplay = minutes > 0 ? `${minutes} min ${displaySeconds} sec` : `${displaySeconds} sec`;

    if (quizComplete) {
        return (
            <div className="flex flex-col items-center justify-start min-h-screen bg-zinc-50 dark:bg-black font-sans py-16 px-4">
                <div className="w-full max-w-md flex flex-col gap-6">

                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
                            Picture Quiz
                        </h1>
                        <p className="text-xl text-zinc-500 dark:text-zinc-400">
                            What do you see?
                        </p>
                    </div>

                    <div className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col gap-4">

                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-500">Picture {currentIndex + 1} of {TEST_QUESTIONS.length}</p>
                            <p className="text-sm text-zinc-500">⏱ {timeDisplay}</p>
                        </div>

                        {/* Image with reveal overlay */}
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700">
                            <img
                                src={currentQuestion.image}
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

                        {/* Answer choices */}
                        <div className="flex flex-col gap-3">
                            {currentQuestion.choices.map((choice) => (
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
                            <div className="rounded-xl border border-red-500 bg-red-50 dark:bg-red-950 px-4 py-3 text-center">
                                <p className="text-red-600 dark:text-red-400 font-medium">⏰ Time's up — no answer selected</p>
                                <p className="text-red-500 dark:text-red-500 text-sm mt-1">The correct answer was: <strong>{currentQuestion.answer}</strong></p>
                            </div>
                        )}

                        {selectedAnswer !== null && (
                            <button
                                onClick={handleNext}
                                className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            >
                                {currentIndex < TEST_QUESTIONS.length - 1 ? "Next Picture" : "See Results"}
                            </button>
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
                    <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
                        Picture Quiz
                    </h1>
                    <p className="text-xl text-zinc-500 dark:text-zinc-400">
                        What do you see?
                    </p>
                </div>

                <div className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col gap-4">

                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-500">Picture {currentIndex + 1} of {TEST_QUESTIONS.length}</p>
                        <p className="text-sm text-zinc-500">⏱ {timeDisplay}</p>
                    </div>

                    <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700">
                        <img
                            src={currentQuestion.image}
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
                        {currentQuestion.choices.map((choice) => (
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
                        <div className="rounded-xl border border-red-500 bg-red-50 dark:bg-red-950 px-4 py-3 text-center">
                            <p className="text-red-600 dark:text-red-400 font-medium">⏰ Time's up — no answer selected</p>
                            <p className="text-red-500 dark:text-red-500 text-sm mt-1">The correct answer was: <strong>{currentQuestion.answer}</strong></p>
                        </div>
                    )}

                    {selectedAnswer !== null && (
                        <button
                            onClick={handleNext}
                            className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                        >
                            {currentIndex < TEST_QUESTIONS.length - 1 ? "Next Picture" : "See Results"}
                        </button>
                    )}

                </div>
            </div>
        </div>
    );
}