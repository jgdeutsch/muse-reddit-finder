import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

interface MuseDungeonPage {
  name: string;
  url: string;
  type: string;
  keywords?: string[];
}

interface GenerateRequest {
  question: string;
  title: string;
  selftext: string;
  subreddit: string;
  redditUrl: string;
  relevantPages: MuseDungeonPage[];
  allPages: MuseDungeonPage[];
}

interface AnswerPage {
  slug: string;
  title: string;
  question: string;
  category: "rules" | "character-building" | "mechanics" | "dm-advice";
  description: string;
  sections: { id: string; title: string; content: string }[];
  relatedPages: { name: string; url: string; type: string }[];
  sourceUrl?: string;
  createdAt: string;
}

// Determine category based on content and subreddit
function determineCategory(
  title: string,
  selftext: string,
  subreddit: string,
  pageTypes: string[]
): AnswerPage["category"] {
  const text = (title + " " + selftext).toLowerCase();

  // DM-specific questions
  if (subreddit.toLowerCase() === "dmacademy") return "dm-advice";
  if (text.includes("dm") || text.includes("dungeon master") || text.includes("running")) {
    return "dm-advice";
  }

  // Character building questions
  if (
    text.includes("build") ||
    text.includes("multiclass") ||
    text.includes("optimization") ||
    text.includes("which class") ||
    text.includes("best race") ||
    pageTypes.includes("Class") ||
    pageTypes.includes("Race") ||
    pageTypes.includes("Feat")
  ) {
    return "character-building";
  }

  // Rules questions
  if (
    text.includes("rule") ||
    text.includes("how does") ||
    text.includes("can i") ||
    text.includes("allowed") ||
    pageTypes.includes("Condition") ||
    pageTypes.includes("Rule")
  ) {
    return "rules";
  }

  return "mechanics";
}

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { title, selftext, redditUrl, relevantPages, allPages, subreddit } = body;

    // Find additional relevant pages from the full question context
    const fullText = (title + " " + selftext).toLowerCase();
    const additionalPages: MuseDungeonPage[] = [];

    for (const page of allPages) {
      if (relevantPages.some((p) => p.url === page.url)) continue;
      for (const keyword of page.keywords || []) {
        if (fullText.includes(keyword.toLowerCase())) {
          additionalPages.push(page);
          break;
        }
      }
    }

    const allRelevantPages = [...relevantPages, ...additionalPages].slice(0, 8);
    const pageTypes = [...new Set(allRelevantPages.map((p) => p.type))];

    // Generate a slug from the title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    // Paraphrase the question and generate a clean title
    const paraphrasedQ = paraphraseQuestion(title, selftext);
    const pageTitle = generatePageTitle(paraphrasedQ, allRelevantPages);

    // Determine category
    const category = determineCategory(title, selftext, subreddit, pageTypes);

    // Generate sections with first-person DM voice
    const sections = generateSections(pageTitle, selftext, allRelevantPages);

    // Build the AnswerPage object
    const answerPage: AnswerPage = {
      slug,
      title: pageTitle,
      question: paraphrasedQ,
      category,
      description: `My take on a common D&D 5e question: ${pageTitle.slice(0, 120)}`,
      sections,
      relatedPages: allRelevantPages.map((p) => ({
        name: p.name,
        url: p.url,
        type: p.type,
      })),
      sourceUrl: redditUrl,
      createdAt: new Date().toISOString(),
    };

    // Try to write to muse-dungeon answers.ts (works in local dev only)
    let writtenToFile = false;
    const museDungeonPath = path.join(
      process.cwd(),
      "..",
      "muse-dungeon",
      "src",
      "data",
      "answers.ts"
    );

    try {
      if (fs.existsSync(museDungeonPath)) {
        const currentContent = fs.readFileSync(museDungeonPath, "utf-8");

        // Find the answerPages array and add the new entry
        const arrayMatch = currentContent.match(
          /export const answerPages: AnswerPage\[\] = \[([\s\S]*?)\];/
        );

        if (arrayMatch) {
          const existingContent = arrayMatch[1].trim();
          const newEntry = JSON.stringify(answerPage, null, 2)
            .split("\n")
            .map((line, i) => (i === 0 ? line : "  " + line))
            .join("\n");

          let newArrayContent: string;
          if (existingContent === "" || existingContent.includes("// Example structure")) {
            // Empty or only has comments
            newArrayContent = `\n  ${newEntry},\n`;
          } else {
            newArrayContent = `${existingContent}\n  ${newEntry},\n`;
          }

          const newFileContent = currentContent.replace(
            /export const answerPages: AnswerPage\[\] = \[([\s\S]*?)\];/,
            `export const answerPages: AnswerPage[] = [${newArrayContent}];`
          );

          fs.writeFileSync(museDungeonPath, newFileContent);
          writtenToFile = true;
        }
      }
    } catch (writeError) {
      console.log("Could not write to muse-dungeon (expected in production):", writeError);
    }

    // Generate markdown preview
    const markdownContent = generateMarkdownPreview(answerPage);

    return NextResponse.json({
      slug,
      category,
      content: markdownContent,
      answerPage,
      relevantPages: allRelevantPages,
      writtenToFile,
      museDungeonUrl: `https://musedungeon.com/answers/${category}/${slug}/`,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate answer" },
      { status: 500 }
    );
  }
}

function generateSections(
  title: string,
  selftext: string,
  relevantPages: MuseDungeonPage[]
): AnswerPage["sections"] {
  const sections: AnswerPage["sections"] = [];

  // Categorize pages by type
  const pagesByType: Record<string, MuseDungeonPage[]> = {};
  for (const page of relevantPages) {
    if (!pagesByType[page.type]) pagesByType[page.type] = [];
    pagesByType[page.type].push(page);
  }

  // Introduction section - first person DM voice
  sections.push({
    id: "introduction",
    title: "Quick Answer",
    content: `I see this question come up a lot in my games and online communities. It touches on ${relevantPages
      .map((p) => p.name.toLowerCase())
      .slice(0, 3)
      .join(", ")}${relevantPages.length > 3 ? " and more" : ""}. Let me break down how I handle this at my table.`,
  });

  // The original question if available
  if (selftext && selftext.length > 20) {
    sections.push({
      id: "original-question",
      title: "The Question",
      content: `Here's the full context of what was asked:\n\n> ${selftext.slice(0, 800).replace(/\n/g, "\n> ")}${selftext.length > 800 ? "..." : ""}`,
    });
  }

  // Class mechanics section - first person DM voice
  if (pagesByType["Class"]) {
    sections.push({
      id: "class-mechanics",
      title: "Class Mechanics",
      content: pagesByType["Class"]
        .map(
          (page) =>
            `When it comes to the **${page.name}**, I always refer players to my [${page.name} guide](https://musedungeon.com${page.url}). I've put together everything you need to know about the class features, subclass options, and how to build an effective character.`
        )
        .join("\n\n"),
    });
  }

  // Features section - first person DM voice
  if (pagesByType["Feature"]) {
    sections.push({
      id: "relevant-features",
      title: "Relevant Features",
      content: pagesByType["Feature"]
        .map(
          (page) =>
            `**[${page.name}](https://musedungeon.com${page.url})** is something I've had to rule on many times. In my guide, I explain exactly how it works RAW (Rules As Written) and share how I typically rule on edge cases at my table.`
        )
        .join("\n\n"),
    });
  }

  // Rules & Conditions section - first person DM voice
  const rulesAndConditions = [
    ...(pagesByType["Rule"] || []),
    ...(pagesByType["Condition"] || []),
  ];
  if (rulesAndConditions.length > 0) {
    sections.push({
      id: "rules-conditions",
      title: "Rules & Conditions",
      content: rulesAndConditions
        .map(
          (page) =>
            `Understanding **[${page.name}](https://musedungeon.com${page.url})** is crucial here. I've broken down the official rules and explained how they interact with other mechanics. This is one of those areas where I've seen a lot of table variation, so I try to cover both RAW and common house rules.`
        )
        .join("\n\n"),
    });
  }

  // Spells section - first person DM voice
  if (pagesByType["Spell"]) {
    sections.push({
      id: "spells",
      title: "Spells Involved",
      content: pagesByType["Spell"]
        .map(
          (page) =>
            `**[${page.name}](https://musedungeon.com${page.url})** — I've written up a full breakdown including casting time, range, components, and my rulings on common questions players ask about this spell.`
        )
        .join("\n\n"),
    });
  }

  // Races section - first person DM voice
  if (pagesByType["Race"]) {
    sections.push({
      id: "racial-considerations",
      title: "Racial Considerations",
      content: pagesByType["Race"]
        .map(
          (page) =>
            `The **[${page.name}](https://musedungeon.com${page.url})** has some unique traits that come into play here. I cover all the racial features, ability score bonuses, and lore in my race guide — it's one of the more popular picks I see at my tables.`
        )
        .join("\n\n"),
    });
  }

  // Feats section - first person DM voice
  if (pagesByType["Feat"]) {
    sections.push({
      id: "feats",
      title: "Feats",
      content: pagesByType["Feat"]
        .map(
          (page) =>
            `**[${page.name}](https://musedungeon.com${page.url})** is relevant here. In my feat guide, I go over the prerequisites, exactly what you get, and which builds synergize best with it. I also share my thoughts on when it's worth taking versus other options.`
        )
        .join("\n\n"),
    });
  }

  return sections;
}

function generateMarkdownPreview(answerPage: AnswerPage): string {
  let content = `# ${answerPage.title}\n\n`;
  content += `*Category: ${answerPage.category}*\n\n`;
  content += `${answerPage.description}\n\n`;

  for (const section of answerPage.sections) {
    content += `## ${section.title}\n\n`;
    content += `${section.content}\n\n`;
  }

  content += `## Related Resources\n\n`;
  content += `Here are my other guides that can help with this topic:\n\n`;

  for (const page of answerPage.relatedPages) {
    content += `- **[${page.name}](https://musedungeon.com${page.url})** (${page.type})\n`;
  }

  content += `\n---\n\n`;
  content += `*Have more D&D 5e questions? Browse my [complete guides](https://musedungeon.com) for rules, classes, spells, and more. I'm always adding new content based on questions I see in the community.*\n`;

  return content;
}

function cleanTitle(title: string): string {
  return title
    .replace(/^\[.*?\]\s*/, "")
    .replace(/^(Question|Help|Rule|Rules):\s*/i, "")
    .replace(/\?+$/, "?")
    .trim();
}

// Paraphrase a Reddit question into a cleaner, more general form
function paraphraseQuestion(title: string, selftext: string): string {
  let q = cleanTitle(title);

  // Remove personal pronouns and make it more general
  q = q
    .replace(/\bmy\b/gi, "a")
    .replace(/\bI\b/g, "you")
    .replace(/\bI'm\b/gi, "you're")
    .replace(/\bI've\b/gi, "you've")
    .replace(/\bme\b/gi, "you")
    .replace(/\bour\b/gi, "the")
    .replace(/\bwe\b/gi, "players")
    .replace(/\bmy player('s)?\b/gi, "a player's")
    .replace(/\bmy DM\b/gi, "the DM")
    .replace(/\bin my game\b/gi, "in a game")
    .replace(/\bin my campaign\b/gi, "in a campaign");

  // Clean up awkward phrasing
  q = q
    .replace(/\s+/g, " ")
    .replace(/^(So|Hey|Hi|Hello|Ok so|Okay so),?\s*/i, "")
    .replace(/\s*\?\s*$/, "?")
    .trim();

  // Ensure it ends with a question mark if it's a question
  if (!q.endsWith("?") && (
    q.toLowerCase().startsWith("how") ||
    q.toLowerCase().startsWith("what") ||
    q.toLowerCase().startsWith("can") ||
    q.toLowerCase().startsWith("does") ||
    q.toLowerCase().startsWith("do") ||
    q.toLowerCase().startsWith("is") ||
    q.toLowerCase().startsWith("are") ||
    q.toLowerCase().startsWith("why") ||
    q.toLowerCase().startsWith("when") ||
    q.toLowerCase().startsWith("which")
  )) {
    q = q + "?";
  }

  return q;
}

// Generate a SEO-friendly title from the paraphrased question
function generatePageTitle(paraphrasedQuestion: string, relevantPages: MuseDungeonPage[]): string {
  // If the question is already short and clear, use it
  if (paraphrasedQuestion.length < 60) {
    return paraphrasedQuestion;
  }

  // Otherwise, try to create a shorter title based on the main topic
  const mainTopic = relevantPages[0]?.name || "";
  if (mainTopic) {
    // Extract the core question type
    const lowerQ = paraphrasedQuestion.toLowerCase();
    if (lowerQ.includes("how does") || lowerQ.includes("how do")) {
      return `How Does ${mainTopic} Work in D&D 5e?`;
    }
    if (lowerQ.includes("can you") || lowerQ.includes("can i")) {
      return `Can You Use ${mainTopic} in D&D 5e?`;
    }
    return `${mainTopic} Rules Explained — D&D 5e`;
  }

  // Truncate if too long
  return paraphrasedQuestion.slice(0, 57) + "...";
}
