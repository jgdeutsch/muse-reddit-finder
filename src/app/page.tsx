"use client";

import { useState, useEffect } from "react";

interface MuseDungeonMatch {
  name: string;
  url: string;
  type: string;
  keywords?: string[];
}

interface RedditPost {
  title: string;
  url: string;
  subreddit: string;
  selftext: string;
  created: string;
  comments: number;
  score: number;
  flair: string | null;
  museDungeonMatches: MuseDungeonMatch[];
}

interface GeneratedPage {
  slug: string;
  content: string;
  relevantPages: MuseDungeonMatch[];
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    Class: "#e6a020",
    Race: "#20b880",
    Condition: "#e08040",
    Rule: "#90908a",
    Feature: "#c08020",
    Spell: "#7c3aed",
    Feat: "#c070e0",
  };
  return colors[type] || "#888";
}

export default function Home() {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [allPages, setAllPages] = useState<MuseDungeonMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedPage, setGeneratedPage] = useState<GeneratedPage | null>(null);
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch("/api/reddit");
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch posts");
        }
        const data = await response.json();
        setPosts(data.posts);
        setAllPages(data.museDungeonPages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  async function generateAnswer(post: RedditPost) {
    setGenerating(post.url);
    setSelectedPost(post);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: post.title,
          selftext: post.selftext,
          subreddit: post.subreddit,
          redditUrl: post.url,
          relevantPages: post.museDungeonMatches,
          allPages: allPages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate answer");
      }

      const data = await response.json();
      setGeneratedPage(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  }

  function closeModal() {
    setGeneratedPage(null);
    setSelectedPost(null);
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--accent)" }}>
            Muse Dungeon Content Generator
          </h1>
          <p className="text-lg opacity-80">
            Find D&D questions from the last 24 hours and generate answer pages for{" "}
            <a
              href="https://musedungeon.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              MuseDungeon.com
            </a>
          </p>
        </header>

        {/* Content */}
        {loading && (
          <div className="text-center py-20">
            <div
              className="inline-block w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
            <p className="mt-4 opacity-70">Searching Reddit for D&D questions (last 24h)...</p>
          </div>
        )}

        {error && (
          <div
            className="rounded-lg p-6 text-center"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--red)" }}
          >
            <p style={{ color: "var(--red)" }}>{error}</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-20 opacity-70">
            <p>No matching posts found in the last 24 hours.</p>
            <p className="text-sm mt-2">Check back later for fresh questions!</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm opacity-60 mb-4">
              Found {posts.length} questions from the last 24 hours that match MuseDungeon content
            </p>
            {posts.map((post, index) => (
              <article
                key={index}
                className="rounded-xl p-5 transition-all hover:scale-[1.005]"
                style={{
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Post Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-semibold hover:underline block mb-1"
                    >
                      {post.title}
                    </a>
                    <div className="flex items-center gap-3 text-xs opacity-60">
                      <span className="font-medium" style={{ color: "#ff4500" }}>
                        r/{post.subreddit}
                      </span>
                      <span>{timeAgo(post.created)}</span>
                      <span>{post.score} pts</span>
                      <span>{post.comments} comments</span>
                    </div>
                  </div>
                  <button
                    onClick={() => generateAnswer(post)}
                    disabled={generating === post.url}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "#fff",
                    }}
                  >
                    {generating === post.url ? "Generating..." : "Generate Answer"}
                  </button>
                </div>

                {/* Post Preview */}
                {post.selftext && (
                  <p className="text-sm opacity-60 mb-3 line-clamp-2">{post.selftext}...</p>
                )}

                {/* MuseDungeon Matches */}
                <div className="flex flex-wrap gap-1.5">
                  {post.museDungeonMatches.map((match, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: "rgba(124, 58, 237, 0.1)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span>{match.name}</span>
                      <span
                        className="px-1 py-0.5 rounded text-[10px]"
                        style={{
                          backgroundColor: getTypeColor(match.type),
                          color: "#fff",
                        }}
                      >
                        {match.type}
                      </span>
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Generated Page Modal */}
        {generatedPage && selectedPost && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
            onClick={closeModal}
          >
            <div
              className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
              style={{ backgroundColor: "var(--background)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                className="p-4 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <h2 className="font-bold text-lg" style={{ color: "var(--accent)" }}>
                    Generated Answer Page
                  </h2>
                  <p className="text-xs opacity-60">
                    Slug: /answers/{generatedPage.slug}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(generatedPage.content)}
                    className="px-3 py-1.5 rounded text-sm font-medium"
                    style={{ backgroundColor: "var(--green)", color: "#fff" }}
                  >
                    Copy Markdown
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-3 py-1.5 rounded text-sm font-medium"
                    style={{ backgroundColor: "var(--border)" }}
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Original Question Reference */}
                <div
                  className="mb-6 p-4 rounded-lg text-sm"
                  style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
                >
                  <p className="text-xs uppercase tracking-wide opacity-50 mb-2">
                    Original Reddit Question:
                  </p>
                  <a
                    href={selectedPost.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    {selectedPost.title}
                  </a>
                </div>

                {/* Linked Resources */}
                <div className="mb-6">
                  <p className="text-xs uppercase tracking-wide opacity-50 mb-2">
                    MuseDungeon Resources Used ({generatedPage.relevantPages.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {generatedPage.relevantPages.map((page, idx) => (
                      <a
                        key={idx}
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:scale-105 transition-transform"
                        style={{
                          backgroundColor: "rgba(124, 58, 237, 0.15)",
                          border: "1px solid var(--accent)",
                        }}
                      >
                        {page.name}
                        <span
                          className="px-1 py-0.5 rounded text-[10px]"
                          style={{ backgroundColor: getTypeColor(page.type), color: "#fff" }}
                        >
                          {page.type}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Generated Markdown Preview */}
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-50 mb-2">
                    Generated Markdown:
                  </p>
                  <pre
                    className="p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap"
                    style={{
                      backgroundColor: "var(--card-bg)",
                      border: "1px solid var(--border)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {generatedPage.content}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-sm opacity-50">
          <p>
            Content generator for{" "}
            <a
              href="https://musedungeon.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              MuseDungeon.com
            </a>{" "}
            - Your D&D 5e Reference
          </p>
        </footer>
      </div>
    </div>
  );
}
