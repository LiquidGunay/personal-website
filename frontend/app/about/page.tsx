import ReactMarkdown from "react-markdown";
import Link from "next/link";

import { loadPage, loadPostBySlug } from "@/lib/content";

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry): entry is string => entry.length > 0);
}

export default function AboutPage() {
  const page = loadPage("about");
  const meta = page?.meta ?? {};
  const title = asString(meta.title) ?? "About";
  const heroTitle = asString(meta.hero_title) ?? title;
  const heroTagline = asString(meta.hero_tagline) ?? asString(meta.tagline) ?? "";
  const location = asString(meta.location);
  const featuredSlug = asString(meta.featured_slug);

  const featured = featuredSlug ? loadPostBySlug(featuredSlug) : null;
  const links = Array.isArray(meta.links) ? meta.links : [];
  const quotes = asStringArray(meta.quotes);

  return (
    <article className="about-shell">
      <header className="about-header">
        <p className="eyebrow">About</p>
        <h1>{heroTitle}</h1>
        {heroTagline ? <p>{heroTagline}</p> : null}
        {location ? <p className="about-tagline">Based in {location}</p> : null}
      </header>

      <div className="post-layout">
        <section className="post-content">
          <ReactMarkdown>{page?.content ?? "About content is being prepared."}</ReactMarkdown>
          {featured ? (
            <p className="about-featured">
              <strong>Featured post:</strong>{" "}
              <Link href={`/blog/${featured.slug}`}>{featured.title}</Link>
            </p>
          ) : null}
        </section>

        <aside className="post-sidebar" aria-label="Persona details">
          <section className="post-sidebar__panel">
            <h2>Links</h2>
            <ul>
              {links.length ? (
                links.map((link, index) => {
                  if (typeof link !== "object" || link === null) {
                    return null;
                  }
                  const rawUrl = asString((link as Record<string, unknown>).url);
                  const rawLabel = asString((link as Record<string, unknown>).label);
                  const rawNote = asString((link as Record<string, unknown>).note);
                  if (!rawUrl || !rawLabel) {
                    return null;
                  }
                  return (
                    <li key={`${rawUrl}-${index}`}>
                      <a href={rawUrl}>{rawLabel}</a>
                      {rawNote ? <p>{rawNote}</p> : null}
                    </li>
                  );
                })
              ) : (
                <li>No links yet.</li>
              )}
            </ul>
          </section>

          <section className="post-sidebar__panel">
            <h2>Core principles</h2>
            <ul>
              {(quotes.length ? quotes : ["Build for clarity first.", "Ship for trust, then speed."]).map((quote, index) => (
                <li key={`${quote}-${index}`}>
                  <blockquote>“{quote}”</blockquote>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <p className="about-cta">
        <Link href="/blog">Read the blog</Link>
      </p>
    </article>
  );
}

