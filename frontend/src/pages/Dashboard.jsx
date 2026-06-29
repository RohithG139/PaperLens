import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getUserHistory, getTrendingTopics, getUserStats } from "../services/api";

// ─── API helpers ────────────────────────────────────────────────────────────

const fetchRecentSearches = async (userId) => {
  const { data } = await getUserHistory(userId);
  // data = { userId, total, entries: [{id, query, searchedAt}] }
  return (data.entries || []).map((e) => ({
    id: e.id,
    query: e.query,
    createdAt: e.searchedAt,
  }));
};

const fetchTrendingTopics = async () => {
  const { data } = await getTrendingTopics();
  // data = [{topic, tag, growth}]
  const growthMap = { high: 1200, medium: 700, low: 350 };
  return data.map((item, idx) => ({
    id: idx + 1,
    topic: item.topic,
    count: growthMap[item.growth] || 500,
  }));
};

const fetchStats = async (userId) => {
  const { data } = await getUserStats(userId);
  return data;
};

// ─── Skeleton helpers ────────────────────────────────────────────────────────

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-700/50 ${className}`}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-gray-800 border border-gray-700 p-5">
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="h-8 w-16" />
      <SkeletonBlock className="h-3 w-32" />
    </div>
  );
}

function SearchRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-800 border border-gray-700 p-4">
      <SkeletonBlock className="h-5 w-5 shrink-0 rounded" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/4" />
      </div>
    </div>
  );
}

function TopicChipSkeleton() {
  return <SkeletonBlock className="h-9 w-32 rounded-full" />;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, colorClass = "text-violet-400" }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-gray-800 border border-gray-700 p-5 hover:border-violet-600 transition-colors">
      <div className={`text-2xl ${colorClass}`}>{icon}</div>
      <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mt-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Quick Action Button ─────────────────────────────────────────────────────

function QuickAction({ icon, label, description, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.99] ${accent}`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-semibold text-white text-sm">{label}</span>
      <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
        {description}
      </span>
    </button>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getFirstName(user) {
  if (!user) return "Researcher";
  if (user.name) return user.name.split(" ")[0];
  if (user.email) return user.email.split("@")[0];
  return "Researcher";
}

// ─── Mock fallbacks ───────────────────────────────────────────────────────────

const MOCK_STATS = {
  totalSearches: 42,
  savedPapers: 17,
  comparisons: 5,
};

const MOCK_TRENDING = [
  { id: 1, topic: "Large Language Models", count: 1240 },
  { id: 2, topic: "Retrieval-Augmented Generation", count: 980 },
  { id: 3, topic: "Diffusion Models", count: 870 },
  { id: 4, topic: "Graph Neural Networks", count: 760 },
  { id: 5, topic: "Vision Transformers", count: 710 },
  { id: 6, topic: "Reinforcement Learning", count: 690 },
  { id: 7, topic: "Federated Learning", count: 540 },
  { id: 8, topic: "Neural Architecture Search", count: 490 },
  { id: 9, topic: "Multimodal Learning", count: 460 },
  { id: 10, topic: "Contrastive Learning", count: 420 },
  { id: 11, topic: "Knowledge Distillation", count: 390 },
  { id: 12, topic: "Prompt Engineering", count: 370 },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data: recentSearches,
    isLoading: searchesLoading,
  } = useQuery({
    queryKey: ["recentSearches", user?.userId],
    queryFn: () => fetchRecentSearches(user.userId),
    enabled: !!user?.userId,
    retry: false,
    staleTime: 60_000,
  });

  const {
    data: trendingTopics,
    isLoading: trendingLoading,
  } = useQuery({
    queryKey: ["trendingTopics"],
    queryFn: fetchTrendingTopics,
    retry: false,
    staleTime: 5 * 60_000,
    placeholderData: MOCK_TRENDING,
  });

  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["userStats", user?.userId],
    queryFn: () => fetchStats(user.userId),
    enabled: !!user?.userId,
    retry: false,
    staleTime: 2 * 60_000,
    placeholderData: MOCK_STATS,
  });

  const displayStats = stats ?? MOCK_STATS;
  const displayTrending = trendingTopics ?? MOCK_TRENDING;
  const displaySearches = recentSearches ?? [];

  function handleReSearch(query) {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  function handleTopicClick(topic) {
    navigate(`/search?q=${encodeURIComponent(topic)}`);
  }

  const firstName = getFirstName(user);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12
      ? "Good morning"
      : greetingHour < 18
      ? "Good afternoon"
      : "Good evening";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">

        {/* ── Header / Welcome ── */}
        <section className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {greeting},{" "}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              {firstName}
            </span>{" "}
            👋
          </h1>
          <p className="text-gray-400 text-sm">
            Here is a summary of your research activity and what is trending today.
          </p>
        </section>

        {/* ── Stats Row ── */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Your Activity
          </h2>
          {statsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                icon="🔍"
                label="Total Searches"
                value={displayStats.totalSearches ?? 0}
                sub="Lifetime queries"
                colorClass="text-violet-400"
              />
              <StatCard
                icon="📄"
                label="Saved Papers"
                value={displayStats.savedPapers ?? 0}
                sub="In your library"
                colorClass="text-indigo-400"
              />
              <StatCard
                icon="⚖️"
                label="Comparisons"
                value={displayStats.comparisons ?? 0}
                sub="Side-by-side analyses"
                colorClass="text-sky-400"
              />
            </div>
          )}
        </section>

        {/* ── Quick Actions ── */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <QuickAction
              icon="🔎"
              label="New Search"
              description="Search across millions of academic papers instantly."
              onClick={() => navigate("/search")}
              accent="border-violet-700/60 bg-violet-950/40 hover:border-violet-500 hover:bg-violet-950/70"
            />
            <QuickAction
              icon="⚖️"
              label="Compare Papers"
              description="Select two or more papers and compare them side by side."
              onClick={() => navigate("/compare")}
              accent="border-indigo-700/60 bg-indigo-950/40 hover:border-indigo-500 hover:bg-indigo-950/70"
            />
            <QuickAction
              icon="🤖"
              label="Ask AI"
              description="Chat with an AI assistant about any research topic."
              onClick={() => navigate("/ask")}
              accent="border-sky-700/60 bg-sky-950/40 hover:border-sky-500 hover:bg-sky-950/70"
            />
          </div>
        </section>

        {/* ── Two-column lower section ── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

          {/* ── Recent Searches (3/5) ── */}
          <section className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Recent Searches
              </h2>
              {!searchesLoading && displaySearches.length > 0 && (
                <button
                  onClick={() => navigate("/search")}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  View all &rarr;
                </button>
              )}
            </div>

            {searchesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SearchRowSkeleton key={i} />
                ))}
              </div>
            ) : displaySearches.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-800/30 py-12 text-center">
                <span className="text-4xl mb-3">🔭</span>
                <p className="text-sm text-gray-400 font-medium">No searches yet</p>
                <p className="text-xs text-gray-600 mt-1">
                  Your recent queries will appear here.
                </p>
                <button
                  onClick={() => navigate("/search")}
                  className="mt-4 rounded-full bg-violet-600 hover:bg-violet-500 px-5 py-2 text-xs font-semibold text-white transition-colors"
                >
                  Start searching
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {displaySearches.map((item, idx) => (
                  <li key={item.id ?? idx}>
                    <button
                      onClick={() => handleReSearch(item.query)}
                      className="group w-full flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 p-4 text-left hover:border-violet-600 hover:bg-gray-800/80 transition-all"
                    >
                      <svg
                        className="shrink-0 h-4 w-4 text-gray-500 group-hover:text-violet-400 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                        />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                          {item.query}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.resultCount != null
                            ? `${item.resultCount} results · `
                            : ""}
                          {formatRelativeTime(item.createdAt ?? item.timestamp)}
                        </p>
                      </div>
                      <svg
                        className="shrink-0 h-4 w-4 text-gray-600 group-hover:text-violet-400 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Trending Topics (2/5) ── */}
          <section className="lg:col-span-2">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Trending Topics
            </h2>

            {trendingLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <TopicChipSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {displayTrending.map((item, idx) => {
                  const colorVariants = [
                    "border-violet-700/50 bg-violet-950/40 text-violet-300 hover:border-violet-500 hover:bg-violet-900/60",
                    "border-indigo-700/50 bg-indigo-950/40 text-indigo-300 hover:border-indigo-500 hover:bg-indigo-900/60",
                    "border-sky-700/50 bg-sky-950/40 text-sky-300 hover:border-sky-500 hover:bg-sky-900/60",
                    "border-teal-700/50 bg-teal-950/40 text-teal-300 hover:border-teal-500 hover:bg-teal-900/60",
                    "border-cyan-700/50 bg-cyan-950/40 text-cyan-300 hover:border-cyan-500 hover:bg-cyan-900/60",
                  ];
                  const colorClass = colorVariants[idx % colorVariants.length];
                  return (
                    <button
                      key={item.id ?? idx}
                      onClick={() => handleTopicClick(item.topic)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:scale-105 active:scale-95 ${colorClass}`}
                      title={
                        item.count
                          ? `${item.count.toLocaleString()} recent papers`
                          : item.topic
                      }
                    >
                      {item.topic}
                    </button>
                  );
                })}
              </div>
            )}

            {!trendingLoading && displayTrending.length > 0 && (
              <p className="mt-4 text-xs text-gray-600">
                Topics trending in the last 7 days across arXiv and Semantic Scholar.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
