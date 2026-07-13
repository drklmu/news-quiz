import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getTodayDate() {
    return new Date().toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).split("/").reverse().join("-").replace(/(\d{4})-(\d{2})-(\d{2})/, "$1-$3-$2");
}

function getDateKey() {
    const d = new Date().toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        month: "2-digit",
        day: "2-digit",
    });
    const [month, day] = d.split("/");
    return `${month}-${day}`;
}

export async function GET() {
    const today = getTodayDate();
    const dateKey = getDateKey();

    // Check cache first
    const { data: cached } = await supabase
        .from("picture_quiz_cache")
        .select("*")
        .eq("quiz_date", today)
        .single();

    if (cached) {
        return NextResponse.json(cached);
    }

    // Look up today's theme
    const { data: theme, error: themeError } = await supabase
        .from("picture_themes")
        .select("*")
        .eq("date_key", dateKey)
        .single();

    if (themeError || !theme) {
        return NextResponse.json({ error: "No theme found for today" }, { status: 404 });
    }

    if (!theme.images_ready || !theme.image_urls) {
        // Fall back to most recent date with images ready
        const { data: fallback, error: fallbackError } = await supabase
            .from("picture_themes")
            .select("*")
            .eq("images_ready", true)
            .not("image_urls", "is", null)
            .not("choices", "is", null)
            .order("date_key", { ascending: false })
            .limit(1)
            .single();

        if (fallbackError || !fallback) {
            return NextResponse.json({ error: "No images available yet" }, { status: 404 });
        }

        // Use fallback theme
        const imageUrls = fallback.image_urls as string[];
        const choices = fallback.choices as any[];

        const questions = choices.map((q: any) => ({
            image_url: q.image_url,
            answer: q.answer,
            choices: q.choices,
        }));

        const cacheData = {
            quiz_date: today,
            date_key: fallback.date_key,
            event_title: fallback.event_title,
            event_year: fallback.event_year,
            event_description: fallback.event_description,
            questions,
        };

        await supabase.from("picture_quiz_cache").insert(cacheData);
        return NextResponse.json(cacheData);
    }

    // Build questions from image_urls and image_subjects
    const choices = theme.choices as any[];

    if (!choices) {
        return NextResponse.json({ error: "Choices not generated yet" }, { status: 404 });
    }

    const questions = choices.map((q: any) => ({
        image_url: q.image_url,
        answer: q.answer,
        choices: q.choices,
    }));

    const cacheData = {
        quiz_date: today,
        date_key: dateKey,
        event_title: theme.event_title,
        event_year: theme.event_year,
        event_description: theme.event_description,
        questions,
    };

    await supabase
        .from("picture_quiz_cache")
        .insert(cacheData);

    return NextResponse.json(cacheData);
}
