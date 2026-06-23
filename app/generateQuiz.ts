export async function generateQuizFromArticles(articles: any[]) {
  const shuffled = articles.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 5);

  const quizQuestions = await Promise.all(
    selected.map(async (article) => {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: article.webTitle,
          body: article.fields?.bodyText || article.fields?.trailText || "",
        }),
      });

      const data = await response.json();
      return data;
    })
  );

  return quizQuestions;
}