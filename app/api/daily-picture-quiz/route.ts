import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../supabaseAdmin";

function getTodayDate() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
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
    const { data: cached } = await supabaseAdmin
        .from("picture_quiz_cache")
        .select("*")
        .eq("quiz_date", today)
        .single();

    if (cached) {
        return NextResponse.json(cached);
    }

    // Look up today's theme
    const { data: theme, error: themeError } = await supabaseAdmin
        .from("picture_themes")
        .select("*")
        .eq("date_key", dateKey)
        .single();

    if (themeError || !theme) {
        return NextResponse.json({ error: "No theme found for today" }, { status: 404 });
    }

    if (!theme.images_ready || !theme.image_urls) {
        // Fall back to most recent date with images ready
        const { data: fallback, error: fallbackError } = await supabaseAdmin
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
            affiliate_angle: fallback.affiliate_angle,
            affiliate_links: fallback.affiliate_links,
        };

        const { error: cacheError } = await supabaseAdmin
            .from("picture_quiz_cache")
            .insert(cacheData);
        if (cacheError) console.error("Picture cache insert failed:", cacheError);

        return NextResponse.json(cacheData);
    }

    // Build questions from choices
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
        affiliate_angle: theme.affiliate_angle,
        affiliate_links: theme.affiliate_links,
    };

    const { error: cacheError } = await supabaseAdmin
        .from("picture_quiz_cache")
        .insert(cacheData);
    if (cacheError) console.error("Picture cache insert failed:", cacheError);

    return NextResponse.json(cacheData);
}