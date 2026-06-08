import Link from "next/link";

import { loadAllPosts } from "@/lib/content";

function yearGroups(posts: ReturnType<typeof loadAllPosts>) {
  const buckets = new Map<number, typeof posts>();
  posts.forEach((post) => {
    const year = new Date(post.date).getFullYear();
    const existing = buckets.get(year) ?? [];
    existing.push(post);
    buckets.set(year, existing);
  });
  return Array.from(buckets.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, group]) => [year, group] as const);
}

export default function BlogIndexPage() {
  const posts = loadAllPosts();
  const grouped = yearGroups(posts);

  return (
    <section className="blog-index">
      <header>
        <p className="eyebrow">Blog</p>
        <h1>Technical writing and experiment notes</h1>
        <p>Notebook-style posts with lightweight code, outputs, and explicit chart payloads.</p>
        <p>
          <a href="/feed.xml">RSS feed</a>
        </p>
      </header>

      <div className="post-list">
        {grouped.length ? (
          grouped.map(([year, items]) => (
            <section className="post-group" key={year}>
              <h2>{year}</h2>
              <div className="post-grid">
                {items.map((post) => (
                  <article className="post-card" key={post.slug}>
                    <h3>
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h3>
                    <p>{post.summary ?? "Read more."}</p>
                    <time dateTime={post.date}>{new Date(post.date).toISOString().slice(0, 10)}</time>
                    {post.tags.length ? <p className="post-tags">{post.tags.join(" ")}</p> : null}
                  </article>
                ))}
              </div>
            </section>
          ))
        ) : (
          <p>No posts are published yet.</p>
        )}
      </div>
    </section>
  );
}

