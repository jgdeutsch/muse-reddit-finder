import { NextResponse } from "next/server";

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

interface DeployRequest {
  answerPage: AnswerPage;
}

const GITHUB_REPO = "jgdeutsch/muse-dungeon";
const FILE_PATH = "src/data/answers.ts";

export async function POST(request: Request) {
  try {
    const body: DeployRequest = await request.json();
    const { answerPage } = body;

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: "GitHub token not configured", manualInstructions: true },
        { status: 400 }
      );
    }

    // Get the current file content from GitHub
    const getFileResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!getFileResponse.ok) {
      throw new Error(`Failed to get file: ${await getFileResponse.text()}`);
    }

    const fileData = await getFileResponse.json();
    const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");

    // Check if this answer already exists
    if (currentContent.includes(`slug: "${answerPage.slug}"`)) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        message: "Answer already exists in the repository",
        url: `https://musedungeon.com/answers/${answerPage.category}/${answerPage.slug}/`,
      });
    }

    // Find the answerPages array and add the new entry
    const arrayMatch = currentContent.match(
      /export const answerPages: AnswerPage\[\] = \[([\s\S]*?)\];/
    );

    if (!arrayMatch) {
      throw new Error("Could not find answerPages array in file");
    }

    const existingContent = arrayMatch[1].trim();
    const newEntry = JSON.stringify(answerPage, null, 2)
      .split("\n")
      .map((line, i) => (i === 0 ? line : "  " + line))
      .join("\n");

    let newArrayContent: string;
    if (existingContent === "" || existingContent.includes("// Example structure")) {
      newArrayContent = `\n  ${newEntry},\n`;
    } else {
      newArrayContent = `${existingContent}\n  ${newEntry},\n`;
    }

    const newFileContent = currentContent.replace(
      /export const answerPages: AnswerPage\[\] = \[([\s\S]*?)\];/,
      `export const answerPages: AnswerPage[] = [${newArrayContent}];`
    );

    // Commit the updated file
    const updateResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Add answer: ${answerPage.title}`,
          content: Buffer.from(newFileContent).toString("base64"),
          sha: fileData.sha,
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to update file: ${await updateResponse.text()}`);
    }

    const updateData = await updateResponse.json();

    return NextResponse.json({
      success: true,
      message: "Answer deployed successfully! Vercel will auto-deploy from the commit.",
      commitUrl: updateData.commit.html_url,
      url: `https://musedungeon.com/answers/${answerPage.category}/${answerPage.slug}/`,
    });
  } catch (error) {
    console.error("Deploy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deployment failed" },
      { status: 500 }
    );
  }
}
