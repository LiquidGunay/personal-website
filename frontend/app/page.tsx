import ReactMarkdown from "react-markdown";

import { loadPage } from "@/lib/content";

const HOME = loadPage("home");

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => item.length > 0);
  return items.length ? items : fallback;
}

export default function HomePage() {
  const meta = HOME?.meta ?? {};
  const heroTitle = asString(meta.title, "TODO: site title");
  const heroTagline = asString(meta.hero_tagline, "TODO: hero tagline");
  const currentNote = typeof meta.current_note === "string" ? meta.current_note.trim() : "";
  const background = asString(meta.background, "TODO: background paragraph");
  const contactEmail = asString(meta.contact_email, "");
  const questions = asStringArray(meta.questions, [
    "TODO: question or problem 1",
    "TODO: question or problem 2",
    "TODO: question or problem 3",
    "TODO: question or problem 4",
  ]);
  const quotes = asStringArray(meta.quotes, [
    "TODO: quote 1",
    "TODO: quote 2",
    "TODO: quote 3",
    "TODO: quote 4",
  ]);

  return (
    <section className="home-shell">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__intro">
          <h1 id="home-title">{heroTitle}</h1>
          <div className="home-hero__tagline">
            <ReactMarkdown>{heroTagline}</ReactMarkdown>
          </div>
        </div>
        <div className="home-hero__aside">
          <div className="home-hero__signal" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {currentNote ? (
            <div className="home-hero__note">
              <ReactMarkdown>{currentNote}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      </section>

      <section className="home-background" aria-label="Background">
        <ReactMarkdown>{background}</ReactMarkdown>
      </section>

      <section className="home-section" aria-labelledby="home-questions-title">
        <h2 id="home-questions-title">What is on my mind</h2>
        <div className="home-questions">
          {questions.map((question, index) => (
            <article className="home-question" key={`${question}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <ReactMarkdown>{question}</ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-quotes-title">
        <h2 id="home-quotes-title">Principles that have stuck with me</h2>
        <div className="home-quotes">
          {quotes.map((quote, index) => (
            <blockquote key={`${quote}-${index}`}>
              <p>{quote}</p>
            </blockquote>
          ))}
        </div>
      </section>

      {contactEmail ? (
        <p className="home-contact">
          Contact me at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      ) : null}
    </section>
  );
}
