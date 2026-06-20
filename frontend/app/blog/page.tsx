import { loadPage } from "@/lib/content";

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default function BlogIndexPage() {
  const home = loadPage("home");
  const blogStatus = asString(home?.meta.blog_status, "TODO: blog coming-soon note");

  return (
    <section className="blog-index blog-paused">
      <header>
        <h1>{blogStatus}</h1>
      </header>
    </section>
  );
}
