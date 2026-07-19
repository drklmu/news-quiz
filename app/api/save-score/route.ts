import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../supabaseAdmin";

const TABLES = {
    news: "news_quiz_scores",
    picture: "picture_quiz_scores_new",
} as const;

type QuizType = keyof typeof TABLES;

function isQuizType(value: unknown): value is QuizType {
    return value === "news" || value === "picture";
}
function getTodayDate() {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
    });
}

export async function POST(request: Request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { quiz, score, seconds } = body ?? {};

    if (!isQuizType(quiz)) {
        return NextResponse.json({ error: "Unknown quiz" }, { status: 400 });
    }
    if (!Number.isInteger(score) || score < 0 || score > 50) {
        return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 7200) {
        return NextResponse.json({ error: "Invalid time" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from(TABLES[quiz])
        .insert({
            score,
            seconds,
            quiz_date: getTodayDate(),
        })
        .select("play_id")
        .single();

    if (error) {
        console.error("save-score failed:", error);
        return NextResponse.json({ error: "Could not save score" }, { status: 500 });
    }

    return NextResponse.json({ playId: data.play_id });
}