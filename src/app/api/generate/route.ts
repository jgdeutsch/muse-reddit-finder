import { NextResponse } from "next/server";

interface MuseDungeonPage {
  name: string;
  url: string;
  type: string;
  keywords: string[];
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

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { title, selftext, relevantPages, allPages } = body;

    // Find additional relevant pages from the full question context
    const fullText = (title + " " + selftext).toLowerCase();
    const additionalPages: MuseDungeonPage[] = [];

    for (const page of allPages) {
      if (relevantPages.some(p => p.url === page.url)) continue;
      for (const keyword of page.keywords) {
        if (fullText.includes(keyword.toLowerCase())) {
          additionalPages.push(page);
          break;
        }
      }
    }

    const allRelevantPages = [...relevantPages, ...additionalPages].slice(0, 8);

    // Generate a slug from the title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    // Generate the answer page content
    const pageContent = generateAnswerPage({
      title,
      selftext,
      relevantPages: allRelevantPages,
    });

    return NextResponse.json({
      slug,
      content: pageContent,
      relevantPages: allRelevantPages,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate answer" },
      { status: 500 }
    );
  }
}

function generateAnswerPage({
  title,
  selftext,
  relevantPages,
}: {
  title: string;
  selftext: string;
  relevantPages: MuseDungeonPage[];
}): string {
  // Categorize pages by type
  const pagesByType: Record<string, MuseDungeonPage[]> = {};
  for (const page of relevantPages) {
    if (!pagesByType[page.type]) pagesByType[page.type] = [];
    pagesByType[page.type].push(page);
  }

  // Generate inline links for the answer
  const inlineLinks = relevantPages
    .map(p => `[${p.name}](${p.url})`)
    .join(", ");

  // Generate a comprehensive answer structure
  let content = `# ${cleanTitle(title)}

`;

  // Add a brief intro acknowledging the question
  content += `This guide addresses a common D&D 5e question about ${relevantPages.map(p => p.name.toLowerCase()).slice(0, 3).join(", ")}${relevantPages.length > 3 ? " and more" : ""}.

`;

  // If there's selftext, reference it
  if (selftext && selftext.length > 20) {
    content += `## The Question

> ${selftext.slice(0, 500)}${selftext.length > 500 ? "..." : ""}

`;
  }

  content += `## Quick Answer

`;

  // Generate answer sections based on page types
  if (pagesByType["Class"]) {
    content += `### Class Mechanics

`;
    for (const page of pagesByType["Class"]) {
      content += `The **[${page.name}](${page.url})** class has specific rules that apply here. Check out our comprehensive ${page.name} guide for all the details on class features, subclasses, and build optimization.

`;
    }
  }

  if (pagesByType["Feature"]) {
    content += `### Relevant Features

`;
    for (const page of pagesByType["Feature"]) {
      content += `**[${page.name}](${page.url})** is a key feature to understand for this question. Our guide covers exactly how it works, when you can use it, and common rulings.

`;
    }
  }

  if (pagesByType["Rule"] || pagesByType["Condition"]) {
    content += `### Rules & Conditions

`;
    for (const page of [...(pagesByType["Rule"] || []), ...(pagesByType["Condition"] || [])]) {
      content += `Understanding **[${page.name}](${page.url})** is essential here. This covers the official rules and how they interact with other game mechanics.

`;
    }
  }

  if (pagesByType["Spell"]) {
    content += `### Spells Involved

`;
    for (const page of pagesByType["Spell"]) {
      content += `**[${page.name}](${page.url})** - See our spell guide for casting time, range, components, and important rulings.

`;
    }
  }

  if (pagesByType["Race"]) {
    content += `### Racial Considerations

`;
    for (const page of pagesByType["Race"]) {
      content += `The **[${page.name}](${page.url})** race has unique traits that may affect this situation. Check our race guide for all racial features and lore.

`;
    }
  }

  if (pagesByType["Feat"]) {
    content += `### Feats

`;
    for (const page of pagesByType["Feat"]) {
      content += `**[${page.name}](${page.url})** may be relevant to your question. See our feat guide for prerequisites, benefits, and build synergies.

`;
    }
  }

  // Add a comprehensive resources section
  content += `## Related Resources

Here are all the MuseDungeon guides that can help with this topic:

`;

  for (const page of relevantPages) {
    content += `- **[${page.name}](${page.url})** (${page.type})\n`;
  }

  content += `
---

*Have more D&D 5e questions? Browse our [complete guides](https://musedungeon.com) for rules, classes, spells, and more.*
`;

  return content;
}

function cleanTitle(title: string): string {
  // Remove common Reddit prefixes and clean up
  return title
    .replace(/^\[.*?\]\s*/, "")
    .replace(/^(Question|Help|Rule|Rules):\s*/i, "")
    .replace(/\?+$/, "?")
    .trim();
}
