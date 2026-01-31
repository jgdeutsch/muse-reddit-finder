"use client";

import { useState, useEffect } from "react";

interface MuseDungeonMatch {
  name: string;
  url: string;
  type: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--accent)" }}>
            Muse Dungeon Reddit Finder
          </h1>
          <p className="text-lg opacity-80">
            D&amp;D questions on Reddit that{" "}
            <a
              href="https://musedungeon.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              MuseDungeon.com
            </a>{" "}
            can help answer
          </p>
        </header>

        {/* Content */}
        {loading && (
          <div className="text-center py-20">
            <div
              className="inline-block w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
            <p className="mt-4 opacity-70">Searching Reddit for D&amp;D questions...</p>
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
            <p>No matching posts found at the moment.</p>
            <p className="text-sm mt-2">Try again later for fresh questions!</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-6">
            {posts.map((post, index) => (
              <article
                key={index}
                className="rounded-xl p-6 transition-all hover:scale-[1.01]"
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
                      className="text-lg font-semibold hover:underline block mb-1"
                    >
                      {post.title}
                    </a>
                    <div className="flex items-center gap-3 text-sm opacity-60">
                      <span className="font-medium" style={{ color: "#ff4500" }}>
                        r/{post.subreddit}
                      </span>
                      <span>{timeAgo(post.created)}</span>
                      <span>{post.score} pts</span>
                      <span>{post.comments} comments</span>
                      {post.flair && (
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: "var(--border)" }}
                        >
                          {post.flair}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post Preview */}
                {post.selftext && (
                  <p className="text-sm opacity-70 mb-4 line-clamp-2">
                    {post.selftext}...
                  </p>
                )}

                {/* MuseDungeon Matches */}
                <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="text-xs uppercase tracking-wide opacity-50 mb-2">
                    Relevant MuseDungeon Pages:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {post.museDungeonMatches.map((match, idx) => (
                      <a
                        key={idx}
                        href={match.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                        style={{
                          backgroundColor: "rgba(124, 58, 237, 0.15)",
                          border: "1px solid var(--accent)",
                        }}
                      >
                        <span>{match.name}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: getTypeColor(match.type),
                            color: "#fff",
                          }}
                        >
                          {match.type}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-sm opacity-50">
          <p>
            Powered by{" "}
            <a
              href="https://musedungeon.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              MuseDungeon.com
            </a>{" "}
            - Your D&amp;D 5e Reference
          </p>
        </footer>
      </div>
    </div>
  );
}
