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
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export async function POST(request: Request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { quiz, playId, name, email, ageGroup } = body ?? {};

    if (!isQuizType(quiz)) {
        return NextResponse.json({ error: "Unknown quiz" }, { status: 400 });
    }
    if (typeof playId !== "string" || playId.length < 10) {
        return NextResponse.json({ error: "Missing play reference" }, { status: 400 });
    }

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
        return NextResponse.json(
            { error: "Please check your email address." },
            { status: 400 }
        );
    }

    const cleanName = typeof name === "string" ? name.trim().slice(0, 80) : "";
    if (cleanName.length === 0) {
        return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }

    const cleanAge = typeof ageGroup === "string" ? ageGroup.slice(0, 20) : null;

    // Subscriber must exist before a score can reference it
    const { error: subError } = await supabaseAdmin
        .from("subscribers")
        .upsert(
            { email: cleanEmail, name: cleanName, age_group: cleanAge },
            { onConflict: "email" }
        );

    if (subError) {
        console.error("subscriber upsert failed:", subError);
        return NextResponse.json({ error: "Could not save your details." }, { status: 500 });
    }

    // Attach the email to this play — only if it's today's and unclaimed
    const { data, error: claimError } = await supabaseAdmin
        .from(TABLES[quiz])
        .update({ email: cleanEmail })
        .eq("play_id", playId)
        .eq("quiz_date", getTodayDate())
        .is("email", null)
        .select("id");

    if (claimError) {
        if (claimError.code === "23505") {
            return NextResponse.json(
                { error: "You've already signed up for today's ranking." },
                { status: 409 }
            );
        }
        console.error("claim failed:", claimError);
        return NextResponse.json({ error: "Could not save your score." }, { status: 500 });
    }

    if (!data || data.length === 0) {
        return NextResponse.json(
            { error: "That result has expired. Play again to get your ranking." },
            { status: 404 }
        );
    }

    return NextResponse.json({ ok: true });
}