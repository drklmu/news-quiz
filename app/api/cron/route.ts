import { NextResponse } from "next/server";
import { buildOrGetTodaysQuiz } from "../daily-quiz/route";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const questions = await buildOrGetTodaysQuiz();
        return NextResponse.json({
            message: "Quiz ready",
            count: questions.length,
        });
    } catch (err) {
        console.error("cron build failed:", err);
        return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
    }
}