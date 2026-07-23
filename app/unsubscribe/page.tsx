"use client";
import { useState, useEffect } from "react";

export default function Unsubscribe() {
    const [token, setToken] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setToken(params.get("token"));
    }, []);

    const unsubscribe = async () => {
        setStatus("working");
        try {
            const res = await fetch("/api/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessage(data.error ?? "Something went wrong.");
                setStatus("error");
            } else {
                setStatus("done");
            }
        } catch {
            setMessage("Something went wrong. Please try again.");
            setStatus("error");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black font-sans p-8">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-8 text-center">
                {status === "done" ? (
                    <>
                        <h1 className="text-2xl font-semibold text-black dark:text-white mb-3">
                            You&apos;ve been unsubscribed
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            You won&apos;t receive any more ranking emails. You&apos;re always welcome to play the quiz.
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-semibold text-black dark:text-white mb-3">
                            Unsubscribe from quiz emails?
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                            You&apos;ll stop receiving your daily ranking results.
                        </p>

                        {status === "error" && (
                            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{message}</p>
                        )}

                        <button
                            onClick={unsubscribe}
                            disabled={!token || status === "working"}
                            className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-50"
                        >
                            {status === "working" ? "Unsubscribing..." : "Yes, unsubscribe me"}
                        </button>

                        {!token && (
                            <p className="text-sm text-zinc-500 mt-4">
                                This link seems incomplete. Please use the link from your email.
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}