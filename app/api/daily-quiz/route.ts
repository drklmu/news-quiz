import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

async function generateQuestion(headline: string, body: string, source: string) {
    const bodyText = typeof body === "string" ? body.slice(0, 1000) : "";

    const rules = [
        "1) Ask directly about the news event. NEVER use phrases like According to, Based on, In this article, In this news story, or ANY reference to an article or story.",
        "2) Keep explanation to maximum 2 sentences.",
        "3) Start the explanation with exactly: According to " + source + ",",
        "4) NEVER use bare references like the article, the story, the headline, the text without naming the source. Always say a " + source + " article or a " + source + " report.",
        "5) If referencing an expert or quote, say an expert quoted in a " + source + " report.",
        "6) NEVER include pound signs or British pounds in any answer choice.",
        "7) All 4 choices must be plausible.",
        "8) Correct answer must be first in the choices array.",
        "9) If the article is primarily about UK domestic politics, frame it from an international perspective."
    ].join(" ");

    const userPrompt = "Generate a quiz question for US seniors about this news from " + source + ". Headline: " + headline + " Text: " + bodyText + " Reply with ONLY this JSON: {\"question\": \"?\", \"choices\": [\"Correct\", \"Wrong1\", \"Wrong2\", \"Wrong3\"], \"correctAnswer\": \"Correct\", \"explanation\": \"According to " + source + ", [context and reasoning], which is why the correct answer is [answer].\"} RULES: " + rules;

    const message = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response");

    const cleaned = content.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const quizData = JSON.parse(cleaned);

    const bannedInQuestion = ["the article", "the story", "the headline", "the text", "this news story", "described in this", "mentioned in this", "£"];
    const bannedInExplanation = ["the article", "the headline and", "the text", "clearly state", "explicitly state", "explicitly states", "states that", "the report states"];
    const questionLower = quizData.question.toLowerCase();
    const explanationLower = quizData.explanation.toLowerCase();
    const choicesText = quizData.choices.join(" ").toLowerCase();

    if (bannedInQuestion.some((p: string) => questionLower.includes(p)) ||
        bannedInExplanation.some((p: string) => explanationLower.includes(p)) ||
        choicesText.includes("£") ||
        !explanationLower.startsWith("according to")) {
        return null;
    }

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

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    yesterday.setHours(0, 0, 0, 0);

    const sections = ["world", "us-news", "business", "technology"];
    const allArticles: any[] = [];

    for (const section of sections) {
        const url = "https://content.guardianapis.com/search?section=" + section + "&show-fields=headline,trailText,bodyText&page-size=2&order-by=newest&api-key=" + process.env.NEXT_PUBLIC_GUARDIAN_API_KEY;
        const response = await fetch(url);
        const data = await response.json();

        const guardianFiltered = data.response.results
            .filter((a: any) => {
                if (a.type === "liveblog") return false;
                const pubDate = new Date(a.webPublicationDate);
                return pubDate >= yesterday;
            })
            .map((a: any) => ({ ...a, source: "The Guardian" }));

        allArticles.push(...guardianFiltered);
    }

    const rssFeeds = [
        { url: "https://feeds.npr.org/1002/rss.xml", name: "NPR" },
        { url: "https://www.pbs.org/newshour/feeds/rss/headlines", name: "PBS NewsHour" },
        { url: "https://www.cbsnews.com/latest/rss/main", name: "CBS News" },
        { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", name: "The New York Times" },
    ];

    const Parser = (await import("rss-parser")).default;
    const parser = new Parser();

    for (const feed of rssFeeds) {
        try {
            const parsed = await parser.parseURL(feed.url);
            const items = parsed.items
                .filter((item: any) => {
                    if (!item.pubDate && !item.isoDate) return true;
                    const pubDate = new Date(item.pubDate || item.isoDate);
                    return pubDate >= yesterday;
                })
                .slice(0, 6)
                .map((item: any) => ({
                    webTitle: item.title || "",
                    fields: {
                        bodyText: item.contentSnippet || item.content || item.summary || "",
                        trailText: item.contentSnippet || item.summary || "",
                    },
                    source: feed.name,
                }));
            allArticles.push(...items);
        } catch (error) {
            console.error("RSS feed error for " + feed.url + ":", error);
        }
    }

    const scoredArticles = allArticles.map((article: any) => {
        const title = (article.webTitle || "").toLowerCase();
        const titleWords = title.split(" ").filter((w: string) => w.length > 4);

        let score = 0;
        for (const other of allArticles) {
            if (other === article) continue;
            const otherTitle = (other.webTitle || "").toLowerCase();
            const matches = titleWords.filter((w: string) => otherTitle.includes(w)).length;
            if (matches >= 2) score++;
        }

        return { ...article, relevanceScore: score };
    });

    scoredArticles.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
    const selected = scoredArticles.slice(0, 15);

    const results = await Promise.all(
        selected.map(async (article: any) => {
            const bodyContent = article.fields?.bodyText || article.fields?.trailText || "";
            const title = article.webTitle || "";

            if (bodyContent.includes("£") || title.includes("£")) return null;

            const yearPattern = /\b(19|20)\d{2}\b/g;
            const yearsInTitle = title.match(yearPattern) || [];
            const currentYear = new Date().getFullYear();
            const hasOldYear = yearsInTitle.some((y: string) => parseInt(y) < currentYear - 1);
            if (hasOldYear) return null;

            return await generateQuestion(
                title,
                bodyContent,
                article.source || "The Guardian"
            );
        })
    );

    const validQuestions = results.filter((q) => q !== null).slice(0, 10);

    await supabase
        .from("daily_quiz")
        .insert({ quiz_date: today, questions: validQuestions });

    return NextResponse.json({ questions: validQuestions });
}