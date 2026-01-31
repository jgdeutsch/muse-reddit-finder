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

    // Clean the title
    const cleanedTitle = cleanTitle(title);

    // Determine category
    const category = determineCategory(title, selftext, subreddit, pageTypes);

    // Generate sections
    const sections = generateSections(cleanedTitle, selftext, allRelevantPages);

    // Build the AnswerPage object
    const answerPage: AnswerPage = {
      slug,
      title: cleanedTitle,
      question: title,
      category,
      description: `Comprehensive answer to: ${cleanedTitle.slice(0, 150)}`,
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

  // Introduction section
  sections.push({
    id: "introduction",
    title: "Quick Answer",
    content: `This guide addresses a common D&D 5e question about ${relevantPages
      .map((p) => p.name.toLowerCase())
      .slice(0, 3)
      .join(", ")}${relevantPages.length > 3 ? " and more" : ""}. Here's what you need to know.`,
  });

  // The original question if available
  if (selftext && selftext.length > 20) {
    sections.push({
      id: "original-question",
      title: "The Question",
      content: selftext.slice(0, 800) + (selftext.length > 800 ? "..." : ""),
    });
  }

  // Class mechanics section
  if (pagesByType["Class"]) {
    sections.push({
      id: "class-mechanics",
      title: "Class Mechanics",
      content: pagesByType["Class"]
        .map(
          (page) =>
            `The **${page.name}** class has specific rules that apply here. Check out our comprehensive [${page.name} guide](https://musedungeon.com${page.url}) for all the details on class features, subclasses, and build optimization.`
        )
        .join("\n\n"),
    });
  }

  // Features section
  if (pagesByType["Feature"]) {
    sections.push({
      id: "relevant-features",
      title: "Relevant Features",
      content: pagesByType["Feature"]
        .map(
          (page) =>
            `**[${page.name}](https://musedungeon.com${page.url})** is a key feature to understand for this question. Our guide covers exactly how it works, when you can use it, and common rulings.`
        )
        .join("\n\n"),
    });
  }

  // Rules & Conditions section
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
            `Understanding **[${page.name}](https://musedungeon.com${page.url})** is essential here. This covers the official rules and how they interact with other game mechanics.`
        )
        .join("\n\n"),
    });
  }

  // Spells section
  if (pagesByType["Spell"]) {
    sections.push({
      id: "spells",
      title: "Spells Involved",
      content: pagesByType["Spell"]
        .map(
          (page) =>
            `**[${page.name}](https://musedungeon.com${page.url})** - See our spell guide for casting time, range, components, and important rulings.`
        )
        .join("\n\n"),
    });
  }

  // Races section
  if (pagesByType["Race"]) {
    sections.push({
      id: "racial-considerations",
      title: "Racial Considerations",
      content: pagesByType["Race"]
        .map(
          (page) =>
            `The **[${page.name}](https://musedungeon.com${page.url})** race has unique traits that may affect this situation. Check our race guide for all racial features and lore.`
        )
        .join("\n\n"),
    });
  }

  // Feats section
  if (pagesByType["Feat"]) {
    sections.push({
      id: "feats",
      title: "Feats",
      content: pagesByType["Feat"]
        .map(
          (page) =>
            `**[${page.name}](https://musedungeon.com${page.url})** may be relevant to your question. See our feat guide for prerequisites, benefits, and build synergies.`
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
  content += `Here are all the MuseDungeon guides that can help with this topic:\n\n`;

  for (const page of answerPage.relatedPages) {
    content += `- **[${page.name}](https://musedungeon.com${page.url})** (${page.type})\n`;
  }

  content += `\n---\n\n`;
  content += `*Have more D&D 5e questions? Browse our [complete guides](https://musedungeon.com) for rules, classes, spells, and more.*\n`;

  return content;
}

function cleanTitle(title: string): string {
  return title
    .replace(/^\[.*?\]\s*/, "")
    .replace(/^(Question|Help|Rule|Rules):\s*/i, "")
    .replace(/\?+$/, "?")
    .trim();
}
