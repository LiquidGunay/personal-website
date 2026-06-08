import { notFound } from "next/navigation";

import { CellDetails } from "@/components/CellDetails";
import { PostBlocks } from "@/components/PostBlocks";
import { loadAllPosts, loadPostBySlug } from "@/lib/content";

type BlogPostPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return loadAllPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: BlogPostPageProps) {
  const post = loadPostBySlug(params.slug);
  if (!post || post.status === "draft") {
    return {
      title: "Post not found",
      description: "The requested post is unavailable.",
    };
  }
  return {
    title: post.title,
    description: post.summary ?? "Technical blog post.",
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = loadPostBySlug(params.slug);
  if (!post || post.status === "draft") {
    notFound();
  }

  return (
    <article className="post-page">
      <header className="post-header">
        <p className="eyebrow">Article</p>
        <h1>{post!.title}</h1>
        <p>{new Date(post!.date).toISOString().slice(0, 10)}</p>
        {post!.tags.length ? <p className="post-tags">{post!.tags.map((tag) => `#${tag}`).join(" ")}</p> : null}
      </header>

      <div className="post-layout">
        <section>
          <PostBlocks blocks={post!.blocks} />
        </section>
        <CellDetails blocks={post!.blocks} />
      </div>
    </article>
  );
}

