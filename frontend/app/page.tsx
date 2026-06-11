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
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__intro">
          <p className="eyebrow">Technical notes / research engineering / systems</p>
          <h1 id="home-title">{heroTitle}</h1>
          {heroTagline ? <p className="home-hero__tagline">{heroTagline}</p> : null}
        </div>
        <div className="home-hero__note" aria-label="Current focus">
          <span>Now</span>
          <p>
            Writing about uncertainty-aware ML systems, semantic entropy analysis, and practical tooling for
            reproducible experiments.
          </p>
        </div>
        <div className="hero-actions" aria-label="Primary links">
          <Link href="/blog">Read the blog</Link>
          <Link href="/about">About</Link>
        </div>
      </section>

      <section className="home-recent" aria-labelledby="latest-writing">
        <div className="section-heading">
          <p className="eyebrow">Latest</p>
          <h2 id="latest-writing">Writing and experiment notes</h2>
        </div>
        {featuredPosts.length ? (
          <div className="essay-list">
            {featuredPosts.map((post, index) => (
              <article className="essay-row" key={post.slug}>
                <div className="essay-row__marker" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="essay-row__body">
                  <h3>
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>
                  <p>{post.summary ?? "Post"}</p>
                </div>
                <time dateTime={post.date}>{new Date(post.date).toISOString().slice(0, 10)}</time>
              </article>
            ))}
          </div>
        ) : (
          <p>No published posts yet.</p>
        )}
      </section>
    </section>
  );
}
