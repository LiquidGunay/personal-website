import Link from "next/link";

import { loadAllPosts, loadPage } from "@/lib/content";

const ABOUT = loadPage("about");

function toString(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export default function HomePage() {
  const posts = loadAllPosts();
  const featuredPosts = posts.slice(0, 3);
  const heroTitle = toString(ABOUT?.meta.hero_title) || "Minimalist tech journal";
  const heroTagline = toString(
    ABOUT?.meta.hero_tagline || ABOUT?.meta.tagline,
  );

  return (
    <section className="home-shell">
      <section className="hero">
        <p className="eyebrow">Technical notes · Research notes · Design notes</p>
        <h1>{heroTitle}</h1>
        {heroTagline ? <p>{heroTagline}</p> : null}
        <p>
          I publish practical technical writing focused on machine learning systems, uncertainty, and reproducible
          research workflows.
        </p>
        <div className="hero-actions">
          <Link href="/about">Read about me</Link>
          <Link href="/blog">Browse blog</Link>
        </div>
      </section>

      <section className="home-recent">
        <h2>Latest writing</h2>
        {featuredPosts.length ? (
          <div className="post-grid">
            {featuredPosts.map((post) => (
              <Link href={`/blog/${post.slug}`} className="post-card" key={post.slug}>
                <h3>{post.title}</h3>
                <p>{post.summary ?? "Post"}</p>
                <time dateTime={post.date}>{new Date(post.date).toISOString().slice(0, 10)}</time>
              </Link>
            ))}
          </div>
        ) : (
          <p>No published posts yet.</p>
        )}
      </section>
    </section>
  );
}

