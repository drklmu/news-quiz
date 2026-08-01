import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../supabaseAdmin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
// Capitalize the first letter ONLY if the answer is entirely lowercase.
// Any existing uppercase (BlackBerry, iPhone, eBay, Baghdad) means the human
// cased it deliberately — leave it completely untouched.
function normalizeAnswer(text: string): string {
    if (text !== text.toLowerCase()) return text; // has a capital → trust it
    return text.charAt(0).toUpperCase() + text.slice(1);
}
export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateKey = searchParams.get("date_key");
    const commit = searchParams.get("commit") === "true";
    if (!dateKey) {
        return NextResponse.json({ error: "Missing date_key" }, { status: 400 });
    }

    const { data: theme, error } = await supabaseAdmin
        .from("picture_themes")
        .select("date_key, event_title, image_subjects, image_urls")
        .eq("date_key", dateKey)
        .single();

    if (error || !theme) {
        return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    const subjects = theme.image_subjects as string[];
    const urls = theme.image_urls as string[];
    if (!urls || urls.length === 0) {
        return NextResponse.json({ error: "No images for this theme" }, { status: 400 });
    }

    const results: any[] = [];

    for (let i = 0; i < urls.length; i++) {
        const pictureNumber = i + 1;
        const subject = normalizeAnswer(subjects[i] ?? "unknown");
        // Per-day mode overrides: force specific pictures to the opposite of the default odd/even rule
        const modeOverrides: Record<string, { visual?: number[]; category?: number[] }> = {
            "08-07": { visual: [6] }, // "Terrorists" — visual mode avoids a grim category taxonomy
        };
        const override = modeOverrides[dateKey];
        let isVisual = pictureNumber % 2 === 1;
        if (override?.visual?.includes(pictureNumber)) isVisual = true;
        if (override?.category?.includes(pictureNumber)) isVisual = false;

        const instruction = isVisual
            ? `This picture is revealed to the player one pie-slice at a time, so early on they see only a FRAGMENT of it. Generate three WRONG answer options that are things an early partial slice of THIS image could plausibly be mistaken for — based on shape, color, curve, or texture of parts of the image, NOT on category. For example, an elephant's trunk seen alone might be mistaken for a snake or a garden hose. The wrong answers should be convincing while the image is mostly hidden, even if they become obviously wrong once fully revealed. Each wrong answer must also be plausible in SCALE and everyday CONTEXT with the real subject — something the fragment could genuinely be at roughly the same physical size, not merely another object of similar shape at a wildly different size (e.g. do not suggest a car steering wheel for a wristwatch just because both are round). Each wrong answer must also be clearly WRONG once the full image is revealed — never a description that could also be true of the whole scene or its background. If the subject sits in a desert, do not offer "desert", "sand dunes", or "sunset over dunes" as a wrong answer; if it sits on a beach, do not offer "beach" or "ocean". The wrong answer must name a genuinely different thing, not a partial truth about the setting. Look at the actual image and reason about what its parts resemble.`
            : `Generate three WRONG answer options that belong to the SAME CATEGORY as the subject. They must be recognizable to an ordinary, non-expert adult — the kind of thing a typical person could name, not specialist sub-varieties only an enthusiast would know. For example, for a cocker spaniel, good wrongs are "Poodle", "German shepherd", "Beagle" — common, well-known dog breeds — NOT "English springer spaniel" or "Field spaniel", which only dog experts could distinguish. Aim for wrongs that are clearly the same category but comfortably known to a general audience. The wrong answers should test recognition, not expert knowledge.`;

        const prompt = `The correct answer for this image is "${subject}". ${instruction}

Write each wrong answer in sentence case: capitalize only the first letter and any proper nouns (brand names, place names, nationalities), everything else lowercase. For example "Chemical drums", "Dutch oven", "Red tablecloth". Reply with ONLY a JSON array of exactly three short wrong-answer strings, like ["Wrong one","Wrong two","Wrong three"]. No other text.`;

        try {
            const message = await anthropic.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 300,
                messages: [{
                    role: "user",
                    content: [
                        { type: "image", source: { type: "url", url: urls[i] } },
                        { type: "text", text: prompt },
                    ],
                }],
            });

            const content = message.content[0];
            if (content.type !== "text") throw new Error("Unexpected response");

            let cleaned = content.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            // Model sometimes wraps the array in prose — extract the array itself
            const firstBracket = cleaned.indexOf("[");
            const lastBracket = cleaned.lastIndexOf("]");
            if (firstBracket !== -1 && lastBracket !== -1) {
                cleaned = cleaned.slice(firstBracket, lastBracket + 1);
            }
            const wrongs = JSON.parse(cleaned) as string[];

            // Assemble the full choice set: correct answer + three wrongs, shuffled
            const allChoices = [subject, ...wrongs].sort(() => Math.random() - 0.5);

            results.push({
                picture: pictureNumber,
                mode: isVisual ? "visual" : "category",
                answer: subject,
                image_url: urls[i],
                choices: allChoices,
                wrongs, // shown separately so you can judge them at a glance
            });
        } catch (err: any) {
            results.push({
                picture: pictureNumber,
                mode: isVisual ? "visual" : "category",
                answer: subject,
                error: err?.message ?? String(err),
            });
        }
    }

    if (commit) {
        const anyErrors = results.some(r => r.error);
        if (anyErrors) {
            return NextResponse.json(
                { error: "Some pictures failed; nothing written. Fix and retry.", results },
                { status: 500 }
            );
        }

        const choicesForDb = results.map(r => ({
            image_url: r.image_url,
            answer: r.answer,
            choices: r.choices,
        }));

        const { error: writeError } = await supabaseAdmin
            .from("picture_themes")
            .update({ choices: choicesForDb })
            .eq("date_key", dateKey);

        if (writeError) {
            return NextResponse.json({ error: "Write failed: " + writeError.message }, { status: 500 });
        }

        return NextResponse.json({ date_key: dateKey, committed: true, count: choicesForDb.length });
    }

    return NextResponse.json({ date_key: dateKey, event_title: theme.event_title, results });

}