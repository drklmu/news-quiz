import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
    const { headline, body } = await request.json();
    const bodyText = typeof body === "string" ? body.slice(0, 1000) : "";
    const userPrompt = "Generate a quiz question for seniors about this news. Headline: " + headline + " Text: " + bodyText + " Reply with ONLY this JSON format: {\"question\": \"?\", \"choices\": [\"Correct\", \"Wrong1\", \"Wrong2\", \"Wrong3\"], \"correctAnswer\": \"Correct\", \"explanation\": \"Context first, then confirm correct answer.\"}";

    const message = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
        return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
    }

    const cleaned = content.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const quizData = JSON.parse(cleaned);
    quizData.choices = quizData.choices.sort(() => Math.random() - 0.5);
    return NextResponse.json(quizData);
}