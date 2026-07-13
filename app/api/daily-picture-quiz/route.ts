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
        return NextResponse.json({ error: "Images not ready for today" }, { status: 404 });
    }

    // Build questions from image_urls and image_subjects
    const imageUrls = theme.image_urls as string[];
    const imageSubjects = theme.image_subjects as string[];

    const questions = imageUrls.map((url: string, index: number) => ({
        image: url,
        answer: imageSubjects[index],
        choices: generateChoices(imageSubjects[index], imageSubjects),
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

function generateChoices(correct: string, allSubjects: string[]): string[] {
    // Pick 3 wrong answers from other subjects
    const others = allSubjects.filter(s => s !== correct);
    const shuffled = others.sort(() => Math.random() - 0.5);
    const wrong = shuffled.slice(0, 3);
    // Combine and shuffle
    return [correct, ...wrong].sort(() => Math.random() - 0.5);
}