import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../supabaseAdmin";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rssFeeds = [
        { url: "https://feeds.npr.org/1002/rss.xml", name: "NPR" },
        { url: "https://www.pbs.org/newshour/feeds/rss/headlines", name: "PBS NewsHour" },
        { url: "https://www.cbsnews.com/latest/rss/main", name: "CBS News" },
        { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", name: "The New York Times" },
        { url: "https://abcnews.go.com/abcnews/usheadlines", name: "ABC News" },
        { url: "https://thehill.com/rss/syndicator/19110", name: "The Hill" },
        { url: "https://feeds.content.dowjones.io/public/rss/RSSUSnews", name: "The Wall Street Journal" },
        { url: "https://newsnationnow.com/feed", name: "NewsNation" },
        { url: "https://feeds.nbcnews.com/nbcnews/public/news", name: "NBC News" },
        { url: "https://feeds.washingtonpost.com/rss/national", name: "The Washington Post" },
    ];

    const Parser = (await import("rss-parser")).default;
    const parser = new Parser();

    const harvestLog: Record<string, any> = {};
    const rows: any[] = [];

    for (const feed of rssFeeds) {
        try {
            const parsed = await parser.parseURL(feed.url);

            const items = parsed.items.map((item: any) => {
                const rawDate = item.isoDate || item.pubDate || null;
                const published = rawDate ? new Date(rawDate) : null;
                const pubDate = published
                    ? published.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
                    : null;
                return {
                    source: feed.name,
                    title: item.title || "",
                    body: item.contentSnippet || item.content || item.summary || "",
                    url: item.link || null,
                    published_at: published ? published.toISOString() : null,
                    pub_date: pubDate,
                };
            });

            rows.push(...items);
            harvestLog[feed.name] = { fetched: items.length };
        } catch (error: any) {
            harvestLog[feed.name] = { error: error?.message ?? String(error) };
            console.error("Harvest error for " + feed.url + ":", error);
        }
    }

    let inserted = 0;
    if (rows.length > 0) {
        const { data, error } = await supabaseAdmin
            .from("article_pool")
            .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
            .select("id");
        if (error) {
            console.error("Pool insert failed:", error);
            return NextResponse.json({ error: "Pool insert failed", harvestLog }, { status: 500 });
        }
        inserted = data?.length ?? 0;
    }

    // Trim anything older than 14 days
    await supabaseAdmin
        .from("article_pool")
        .delete()
        .lt("harvested_at", new Date(Date.now() - 14 * 864e5).toISOString());

    console.log("Harvest log:", JSON.stringify(harvestLog, null, 2));
    return NextResponse.json({ harvested: rows.length, inserted, harvestLog });
}