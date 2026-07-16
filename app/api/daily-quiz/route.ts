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

async function generateQuestion(headline: string, body: string, source: string, pubDate: string) {
    const bodyText = typeof body === "string" ? body.slice(0, 1000) : "";

    const rules = [
        "1) Ask directly about the news event in the QUESTION field. NEVER use phrases like According to, Based on, In this article, In this news story in the question. This rule applies ONLY to the question, NOT the explanation.",
        "2) Keep explanation to maximum 2 sentences.",
        "3) Start the explanation with exactly: According to " + source + " (" + pubDate + "),",
        "4) NEVER use bare references like the article, the story, the headline, the text without naming the source. Always say a " + source + " article or a " + source + " report.",
        "5) If referencing an expert or quote, say an expert quoted in a " + source + " report.",
        "6) NEVER include pound signs or British pounds in any answer choice.",
        "7) All 4 choices must be plausible.",
        "8) Correct answer must be first in the choices array.",
        "9) If the article is primarily about UK domestic politics, frame it from an international perspective."
    ].join(" ");

    const userPrompt = "Generate a quiz question for US seniors about this news from " + source + " published on " + pubDate + ". Headline: " + headline + " Text: " + bodyText + " Reply with ONLY this JSON: {\"question\": \"?\", \"choices\": [\"Correct\", \"Wrong1\", \"Wrong2\", \"Wrong3\"], \"correctAnswer\": \"Correct\", \"explanation\": \"According to " + source + " (" + pubDate + "), FILL IN CONTEXT HERE. The correct answer is FILL IN ANSWER HERE.\"} RULES: " + rules;

    const message = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response");

    const cleaned = content.text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .replace(/[\x00-\x1F\x7F]/g, " ")
        .trim();
    const quizData = JSON.parse(cleaned);

    if (quizData.explanation) {
        quizData.explanation = quizData.explanation.replace(
            /^According to [^()\n]+?,\s*/i,
            "According to " + source + " (" + pubDate + "), "
        );
    }

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

    const now = new Date();

    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    const todayString = getTodayDate();

    const allArticles: any[] = [];

    const rssFeeds = [
        { url: "https://feeds.npr.org/1002/rss.xml", name: "NPR" },
        { url: "https://www.pbs.org/newshour/feeds/rss/headlines", name: "PBS NewsHour" },
        { url: "https://www.cbsnews.com/latest/rss/main", name: "CBS News" },
        { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", name: "The New York Times" },
        { url: "https://abcnews.go.com/abcnews/usheadlines", name: "ABC News" },
        { url: "https://thehill.com/rss/syndicator/19110", name: "The Hill" },
        { url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", name: "The Wall Street Journal" },
        { url: "https://newsnationnow.com/feed", name: "NewsNation" },
        { url: "https://feeds.nbcnews.com/nbcnews/public/news", name: "NBC News" },
        { url: "https://feeds.washingtonpost.com/rss/national", name: "The Washington Post" },
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
                    const pubDateString = pubDate.toLocaleDateString("en-US", {
                        timeZone: "America/New_York",
                        year: "numeric", month: "2-digit", day: "2-digit"
                    }).split("/").reverse().join("-").replace(/(\d{4})-(\d{2})-(\d{2})/, "$1-$3-$2");
                    if (!(pubDate >= threeDaysAgo && pubDateString < todayString)) return false;
                    // Filter out non-English articles
                    const title = (item.title || "").toLowerCase();
                    const spanishWords = ["la ", "el ", "los ", "las ", " de ", " del ", " en ", " con ", " por ", " para ", " que ", " una ", " sobre ", " tras "];
                    const spanishCount = spanishWords.filter(w => title.includes(w)).length;
                    return spanishCount < 3;
                })
                .slice(0, 5)
                .map((item: any) => ({
                    webTitle: item.title || "",
                    fields: {
                        bodyText: item.contentSnippet || item.content || item.summary || "",
                        trailText: item.contentSnippet || item.summary || "",
                    },
                    source: feed.name,
                    pubDate: item.isoDate || item.pubDate || null,
                }));


            allArticles.push(...items);
        } catch (error) {
            console.error("RSS feed error for " + feed.url + ":", error);
        }
    }
    console.log("Total articles:", allArticles.length);
    allArticles.forEach(a => console.log(a.source, "|", (a.webTitle || "").slice(0, 60)));
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
    const selected: any[] = [];
    let sportsCount = 0;
    const sportsWords = ["game", "match", "score", "player", "team", "league", "tournament", "championship", "soccer", "football", "basketball", "baseball", "tennis", "golf", "fifa", "nba", "nfl", "mlb", "nhl", "world cup"];

    for (const article of scoredArticles) {
        const title = (article.webTitle || "").toLowerCase();
        const titleWords = title.split(" ").filter((w: string) => w.length > 5);

        const isDuplicate = selected.some((chosen: any) => {
            const chosenTitle = (chosen.webTitle || "").toLowerCase();
            const matches = titleWords.filter((w: string) => chosenTitle.includes(w)).length;
            return matches >= 2;
        });

        if (isDuplicate) continue;

        // Limit sports articles to 1
        const isSports = sportsWords.some(w => title.includes(w));
        if (isSports && sportsCount >= 1) continue;
        if (isSports) sportsCount++;

        selected.push(article);
        if (selected.length >= 15) break;
    }

    const results = await Promise.all(
        selected.map(async (article: any) => {
            const bodyContent = article.fields?.bodyText || article.fields?.trailText || "";
            const title = article.webTitle || "";

            if (bodyContent.includes("£") || title.includes("£")) return null;

            const roundupWords = ["developments", "updates", "roundup", "briefing", "wrap", "latest", "live", "recap", "highlights", "newsletter", "one year", "years ago", "anniversary", "look back", "then and now"];
            if (roundupWords.some((w: string) => title.toLowerCase().includes(w))) return null;

            const yearPattern = /\b(19|20)\d{2}\b/g;
            const yearsInTitle = title.match(yearPattern) || [];
            const currentYear = new Date().getFullYear();
            const hasOldYear = yearsInTitle.some((y: string) => parseInt(y) < currentYear - 1);
            if (hasOldYear) return null;

            const rawDate = article.pubDate || article.isoDate || null;
            const articleDate = rawDate ? new Date(rawDate).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York",
            }) : "recently";

            return await generateQuestion(
                title,
                bodyContent,
                article.source || "NPR",
                articleDate
            );
        })
    );

    const validQuestions = results.filter((q) => q !== null).slice(0, 10);

    if (validQuestions.length === 0) {
        return NextResponse.json({ error: "No questions generated" }, { status: 500 });
    }

    await supabase
        .from("daily_quiz")
        .insert({ quiz_date: today, questions: validQuestions });

    return NextResponse.json({ questions: validQuestions });
}