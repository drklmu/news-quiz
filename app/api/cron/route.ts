import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).split("/").reverse().join("-").replace(/(\d{4})-(\d{2})-(\d{2})/, "$1-$3-$2");

    const { data: existing } = await supabase
        .from("daily_quiz")
        .select("quiz_date")
        .eq("quiz_date", today)
        .single();

    if (existing) {
        return NextResponse.json({ message: "Quiz already generated for today" });
    }

    const baseUrl = process.env.VERCEL_URL
        ? "https://" + process.env.VERCEL_URL
        : "http://localhost:3000";

    const response = await fetch(baseUrl + "/api/daily-quiz", {
        method: "GET",
    });

    if (!response.ok) {
        return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
    }

    return NextResponse.json({ message: "Quiz generated successfully for " + today });
}