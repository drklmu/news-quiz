const Anthropic = require("@anthropic-ai/sdk");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function generateChoicesForDate(dateKey) {
    console.log(`Generating choices for date: ${dateKey}`);

    // Fetch the theme
    const { data: theme, error } = await supabase
        .from("picture_themes")
        .select("*")
        .eq("date_key", dateKey)
        .single();

    if (error || !theme) {
        console.error("Theme not found for date:", dateKey);
        return;
    }

    if (!theme.image_urls || !theme.images_ready) {
        console.error("Images not ready for date:", dateKey);
        return;
    }

    const imageUrls = theme.image_urls;
    const imageSubjects = theme.image_subjects;

    console.log(`Found ${imageUrls.length} images for: ${theme.event_title}`);

    const questions = [];

    for (let i = 0; i < imageUrls.length; i++) {
        const subject = imageSubjects[i];
        const url = imageUrls[i];

        console.log(`  Generating choices for image ${i + 1}: ${subject}`);

        const prompt = `You are helping create a picture quiz where users identify objects from partially revealed images.

The correct answer for this image is: "${subject}"

Generate exactly 3 WRONG answer choices that are visually similar to "${subject}" — meaning they could plausibly look the same in a partially revealed photo. The wrong answers should be things that share visual characteristics (similar colors, textures, shapes, or environments) that would make them genuinely confusing in a partial reveal.

Rules:
- Wrong answers must be visually similar, NOT just thematically related
- Each wrong answer should be 2-5 words maximum
- Never include the correct answer in wrong answers
- Return ONLY a JSON array of 3 strings, no other text

Example for "Sandy beach": ["Rocky shoreline", "Desert sand dunes", "Gravel riverbank"]

Now generate for: "${subject}"`;

        const message = await anthropic.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 200,
            messages: [{ role: "user", content: prompt }],
        });

        const content = message.content[0];
        if (content.type !== "text") continue;

        const cleaned = content.text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        let wrongAnswers;
        try {
            wrongAnswers = JSON.parse(cleaned);
        } catch (e) {
            console.error(`  Failed to parse choices for ${subject}:`, cleaned);
            wrongAnswers = ["Similar object 1", "Similar object 2", "Similar object 3"];
        }

        // Combine and shuffle
        const allChoices = [subject, ...wrongAnswers].sort(() => Math.random() - 0.5);

        questions.push({
            image_url: url,
            answer: subject,
            choices: allChoices,
        });

        console.log(`  Choices: ${allChoices.join(", ")}`);
    }

    // Save to Supabase
    const { error: updateError } = await supabase
        .from("picture_themes")
        .update({ choices: questions })
        .eq("date_key", dateKey);

    if (updateError) {
        console.error("Failed to save choices:", updateError);
    } else {
        console.log(`\nSuccessfully saved choices for ${dateKey}!`);
        console.log("Review them in Supabase and fix any bad ones.");
        console.log("Then set images_ready = true if not already done.");
    }
}

// Get date from command line argument
const dateKey = process.argv[2];
if (!dateKey) {
    console.error("Usage: node generate-picture-choices.js MM-DD");
    console.error("Example: node generate-picture-choices.js 07-07");
    process.exit(1);
}

generateChoicesForDate(dateKey);