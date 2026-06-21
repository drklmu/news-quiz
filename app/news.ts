export async function getYesterdaysNews() {
    const apiKey = process.env.NEXT_PUBLIC_GUARDIAN_API_KEY;
    const sections = ["world", "us-news", "business", "technology", "sport"];

    const allArticles: any[] = [];

    for (const section of sections) {
        const url = `https://content.guardianapis.com/search?section=${section}&show-fields=headline,trailText,bodyText&page-size=5&order-by=newest&api-key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        allArticles.push(...data.response.results);
    }

    const articles = allArticles.filter(
        (article: any) => article.type !== "liveblog"
    );

    return articles;
}