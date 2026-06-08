import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="hero">
      <p className="eyebrow">Not found</p>
      <h1>404 · This page does not exist</h1>
      <p>The requested page is not part of the current minimal site layout.</p>
      <div className="hero-actions">
        <Link href="/">Back to home</Link>
        <Link href="/blog">Explore blog</Link>
      </div>
    </section>
  );
}

