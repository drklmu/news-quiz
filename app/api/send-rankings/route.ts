import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

function getTodayDate() {
    return new Date().toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).split("/").reverse().join("-").replace(/(\d{4})-(\d{2})-(\d{2})/, "$1-$3-$2");
}

function getYesterdayDate() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).split("/").reverse().join("-").replace(/(\d{4})-(\d{2})-(\d{2})/, "$1-$3-$2");
}

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizDate = getYesterdayDate();
    const today = getTodayDate();
    const formattedDate = new Date(quizDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric"
    });

    const { data: signups, error: signupError } = await supabase
        .from("signups")
        .select("name, email, age_group, score, quiz_date")
        .eq("quiz_date", quizDate);

    if (signupError || !signups || signups.length === 0) {
        return NextResponse.json({ message: "No signups found for " + quizDate });
    }

    const totalParticipants = signups.length;
    let emailsSent = 0;

    for (const signup of signups) {
        const { data: alreadySent } = await supabase
            .from("email_log")
            .select("email")
            .eq("email", signup.email)
            .eq("quiz_date", quizDate)
            .single();

        if (alreadySent) continue;

        const userScore = signup.score || 0;
        const scoredBelow = signups.filter((s: any) => (s.score || 0) < userScore).length;
        const percentile = Math.round((scoredBelow / totalParticipants) * 100);
        const rankingMessage = totalParticipants === 1
            ? "You were today's only quizzer — come back tomorrow to compete!"
            : "You scored better than " + percentile + "% of today's " + totalParticipants + " quizzers";
        const firstName = (signup.name || "").split(" ")[0] || "there";

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Daily News Quiz Results</title>
</head>
<body style="font-family: Georgia, serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <div style="background: #000; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Daily News Quiz</h1>
<p style="color: #aaa; margin: 8px 0 0 0; font-size: 14px;">Your results for ${formattedDate}</p>
    </div>

    <div style="padding: 32px;">
      <p style="font-size: 18px; color: #333; margin: 0 0 24px 0;">Hi ${firstName},</p>
      
      <p style="color: #555; line-height: 1.6;">Here are your results from yesterday's Daily News Quiz:</p>

      <div style="background: #f9f9f9; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Score</p>
        <p style="margin: 0; font-size: 48px; font-weight: bold; color: #000;">${userScore}<span style="font-size: 24px; color: #888;"> / 10</span></p>
      </div>

      <div style="background: #000; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #aaa; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Ranking</p>
        <p style="margin: 0; font-size: 48px; font-weight: bold; color: white;">${percentile}<span style="font-size: 24px; color: #aaa;">th percentile</span></p>
<p style="margin: 8px 0 0 0; color: #aaa; font-size: 14px;">${rankingMessage}</p>
      </div>

      <p style="color: #555; line-height: 1.6;">Come back tomorrow for a fresh set of questions about today's news!</p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://news-quiz-tan.vercel.app" style="background: #000; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Take Today's Quiz</a>
      </div>
    </div>

    <div style="background: #f9f9f9; padding: 16px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; color: #aaa; font-size: 12px;">Daily News Quiz · chap2.life · <a href="#" style="color: #aaa;">Unsubscribe</a></p>
    </div>

  </div>
</body>
</html>`;

        const { error: emailError } = await resend.emails.send({
            from: "Daily News Quiz <quiz@chap2.life>",
            to: signup.email,
            subject: "Your Daily News Quiz Results — " + quizDate,
            html: emailHtml,
        });

        if (!emailError) {
            await supabase.from("email_log").insert({
                email: signup.email,
                quiz_date: quizDate,
                score: userScore,
                percentile: percentile,
            });
            emailsSent++;
        }
    }

    return NextResponse.json({
        message: "Emails sent: " + emailsSent + " of " + totalParticipants + " signups for " + quizDate
    });
}