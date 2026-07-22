import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../supabaseAdmin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
        const subject = subjects[i] ?? "unknown";
        const isVisual = pictureNumber % 2 === 1; // odd = visual/slice, even = category

        const instruction = isVisual
            ? `This picture is revealed to the player one pie-slice at a time, so early on they see only a FRAGMENT of it. Generate three WRONG answer options that are things an early partial slice of THIS image could plausibly be mistaken for — based on shape, color, curve, or texture of parts of the image, NOT on category. For example, an elephant's trunk seen alone might be mistaken for a snake or a garden hose. The wrong answers should be convincing while the image is mostly hidden, even if they become obviously wrong once fully revealed. Each wrong answer must also be plausible in SCALE and everyday CONTEXT with the real subject — something the fragment could genuinely be at roughly the same physical size, not merely another object of similar shape at a wildly different size (e.g. do not suggest a car steering wheel for a wristwatch just because both are round). Look at the actual image and reason about what its parts resemble.`
            : `Generate three WRONG answer options that belong to the SAME CATEGORY as the subject and would be genuinely hard to distinguish from it — same type of object, era, or class. For example, a ukelele's category-wrongs might be mandolin, banjo, or balalaika. The wrong answers should test whether the player truly knows the subject, not trick them visually.`;

        const prompt = `The correct answer for this image is "${subject}". ${instruction}

Reply with ONLY a JSON array of exactly three short wrong-answer strings, like ["Wrong1","Wrong2","Wrong3"]. No other text.`;

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

            const cleaned = content.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
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