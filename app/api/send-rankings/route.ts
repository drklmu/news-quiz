import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../supabaseAdmin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getYesterdayDate() {
    const d = new Date(Date.now() - 864e5);
    return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

type Play = { email: string | null; score: number; seconds: number };

function rankAmong(plays: Play[], mine: Play) {
    const total = plays.length;
    const beaten = plays.filter(
        (p) => p.score < mine.score || (p.score === mine.score && p.seconds > mine.seconds)
    ).length;
    const percentile = total <= 1 ? null : Math.round((beaten / total) * 100);
    return { total, percentile };
}

function timeText(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}

function resultBlock(label: string, mine: Play, total: number, percentile: number | null) {
    const ranking =
        percentile === null
            ? "You were the only player — come back tomorrow to compete!"
            : `You did better than ${percentile}% of the ${total} people who played`;
    return `
      <div style="border:1px solid #e5e5e5; border-radius:12px; padding:24px; margin:24px 0;">
        <p style="margin:0 0 16px 0; font-size:18px; font-weight:bold; color:#000;">${label}</p>
        <p style="margin:0 0 4px 0; font-size:36px; font-weight:bold; color:#000;">
          ${mine.score}<span style="font-size:20px; color:#888;"> / 10</span>
        </p>
        <p style="margin:0 0 16px 0; color:#888; font-size:14px;">in ${timeText(mine.seconds)}</p>
        <p style="margin:0; color:#555; font-size:15px; line-height:1.5;">${ranking}</p>
      </div>`;
}

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizDate = getYesterdayDate();
    const formattedDate = new Date(quizDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
    });

    // Every play that day — anonymous included. This is the honest denominator.
    const [newsRes, picRes] = await Promise.all([
        supabaseAdmin.from("news_quiz_scores").select("email, score, seconds").eq("quiz_date", quizDate),
        supabaseAdmin.from("picture_quiz_scores_new").select("email, score, seconds").eq("quiz_date", quizDate),
    ]);

    if (newsRes.error || picRes.error) {
        console.error("Score read failed:", newsRes.error ?? picRes.error);
        return NextResponse.json({ error: "Could not read scores" }, { status: 500 });
    }

    const newsPlays = (newsRes.data ?? []) as Play[];
    const picPlays = (picRes.data ?? []) as Play[];

    // Recipients: anyone who played either quiz and left an email
    const emails = Array.from(
        new Set([...newsPlays, ...picPlays].filter((p) => p.email).map((p) => p.email as string))
    );

    if (emails.length === 0) {
        return NextResponse.json({ message: "No signed-up players for " + quizDate });
    }

    const { data: subs } = await supabaseAdmin
        .from("subscribers")
        .select("email, name, unsub_token, wants_news, wants_picture")
        .in("email", emails);

    const subByEmail = new Map((subs ?? []).map((s: any) => [s.email, s]));

    let emailsSent = 0;

    for (const email of emails) {
        const { data: alreadySent } = await supabaseAdmin
            .from("email_log")
            .select("email")
            .eq("email", email)
            .eq("quiz_date", quizDate)
            .maybeSingle();

        if (alreadySent) continue;

        const sub = subByEmail.get(email);
        if (!sub) continue;

        const myNews = sub.wants_news ? newsPlays.find((p) => p.email === email) : undefined;
        const myPic = sub.wants_picture ? picPlays.find((p) => p.email === email) : undefined;

        if (!myNews && !myPic) continue;

        let blocks = "";
        let logScore = 0;
        let logPercentile = 0;

        if (myNews) {
            const { total, percentile } = rankAmong(newsPlays, myNews);
            blocks += resultBlock("Daily News Quiz", myNews, total, percentile);
            logScore = myNews.score;
            logPercentile = percentile ?? 0;
        }
        if (myPic) {
            const { total, percentile } = rankAmong(picPlays, myPic);
            blocks += resultBlock("Daily Picture Quiz", myPic, total, percentile);
            if (!myNews) {
                logScore = myPic.score;
                logPercentile = percentile ?? 0;
            }
        }

        const firstName = (sub.name || "").split(" ")[0] || "there";
        const unsubUrl = `https://quiz.chap2.life/unsubscribe?token=${sub.unsub_token}`;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Georgia, serif; background-color:#f4f4f4; margin:0; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:white; border-radius:12px; overflow:hidden;">
    <div style="background:#000; padding:32px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:24px;">Your Quiz Results</h1>
      <p style="color:#aaa; margin:8px 0 0 0; font-size:14px;">${formattedDate}</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:18px; color:#333; margin:0 0 8px 0;">Hi ${firstName},</p>
      <p style="color:#555; line-height:1.6; margin:0;">Here's how you did, compared with everyone else who played.</p>
      ${blocks}
      <div style="text-align:center; margin:32px 0;">
        <a href="https://quiz.chap2.life" style="background:#000; color:white; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px;">Play Today's Quiz</a>
      </div>
    </div>
    <div style="background:#f9f9f9; padding:16px; text-align:center; border-top:1px solid #eee;">
      <p style="margin:0; color:#aaa; font-size:12px;">
        chap2.life · <a href="${unsubUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;

        const { error: emailError } = await resend.emails.send({
            from: "Daily Quiz <quiz@chap2.life>",
            to: email,
            subject: "Your quiz results — " + formattedDate,
            html: emailHtml,
        });

        if (emailError) {
            console.error("Send failed for " + email + ":", emailError);
            continue;
        }

        const { error: logError } = await supabaseAdmin.from("email_log").insert({
            email,
            quiz_date: quizDate,
            score: logScore,
            percentile: logPercentile,
        });
        if (logError) console.error("email_log insert failed:", logError);

        emailsSent++;
    }

    return NextResponse.json({ message: `Sent ${emailsSent} of ${emails.length} for ${quizDate}` });
}