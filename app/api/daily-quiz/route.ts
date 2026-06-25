import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

async function generateQuestion(headline: string, body: string) {
    const bodyText = typeof body === "string" ? body.slice(0, 1000) : "";
    const userPrompt = "Generate a quiz question for US seniors about this news. Headline: " + headline + " Text: " + bodyText + " Reply with ONLY this JSON: {\"question\": \"?\", \"choices\": [\"Correct\", \"Wrong1\", \"Wrong2\", \"Wrong3\"], \"correctAnswer\": \"Correct\", \"explanation\": \"Context first, then confirm correct answer.\"} Rules: 1) Never start with According to. 2) Keep explanation to maximum 2 sentences. 3) All choices must be plausible. 4) Correct answer must be first in choices array.";

    const message = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response");

    const cleaned = content.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const quizData = JSON.parse(cleaned);
    quizData.choices = quizData.choices.sort(() => Math.random() - 0.5);
    return quizData;
}

export async function GET() {
    const today = getTodayDate();

    const { data: existing } = await supabase
        .from("daily_quiz")
        .select("questions")
        .eq("quiz_date", today)
        .single();

    if (existing) {
        return NextResponse.json({ questions: existing.questions });
    }

    const sections = ["world", "us-news", "business", "technology", "sport"];
    const allArticles: any[] = [];

    for (const section of sections) {
        const url = "https://content.guardianapis.com/search?section=" + section + "&show-fields=headline,trailText,bodyText&page-size=5&order-by=newest&api-key=" + process.env.NEXT_PUBLIC_GUARDIAN_API_KEY;
        const response = await fetch(url);
        const data = await response.json();
        allArticles.push(...data.response.results.filter((a: any) => a.type !== "liveblog"));
    }

    const shuffled = allArticles.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 10);

    const questions = await Promise.all(
        selected.map(async (article: any) => {
            return await generateQuestion(
                article.webTitle,
                article.fields?.bodyText || article.fields?.trailText || ""
            );
        })
    );

    await supabase
        .from("daily_quiz")
        .insert({ quiz_date: today, questions });

    return NextResponse.json({ questions });
}