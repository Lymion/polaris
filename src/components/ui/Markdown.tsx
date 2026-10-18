import { memo, type ReactElement } from "react";
import renderMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  p: ({ children }) => <p className="leading-relaxed [&:not(:first-child)]:mt-3">{children}</p>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-star-300">{children}</ol>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-orbit-400">{children}</ul>,
  li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="text-muted">{children}</em>,
  h1: ({ children }) => <p className="mt-4 font-semibold first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mt-4 font-semibold first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mt-4 font-semibold first:mt-0">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-orbit-300 underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-fg/[0.08] px-1.5 py-0.5 text-[0.9em]">{children}</code>,
  blockquote: ({ children }) => <blockquote className="mt-3 border-l-2 border-star-400/50 pl-3 text-muted">{children}</blockquote>,
  hr: () => <hr className="my-4 border-line" />,
};

// Parsing is the expensive part of rendering a message, and finished messages never change,
// so keep their rendered trees. Measured: re-parsing the whole chat history on every streamed
// chunk blocked the main thread for up to 115ms at a time (4x CPU throttle).
const cache = new Map<string, ReactElement>();
const MAX_CACHED = 150;

function render(text: string, cached: boolean) {
  // react-markdown's sync `Markdown` is a plain function (no hooks), so calling it directly is safe.
  if (!cached) return renderMarkdown({ children: text, remarkPlugins: [remarkGfm], components });
  let tree = cache.get(text);
  if (!tree) {
    tree = renderMarkdown({ children: text, remarkPlugins: [remarkGfm], components });
    cache.set(text, tree);
    if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string);
  }
  return tree;
}

/** `live`: text still streaming in. It changes every chunk, so it isn't cached. */
export const Markdown = memo(function Markdown({ children, live = false }: { children: string; live?: boolean }) {
  return <div className="text-sm sm:text-[15px]">{render(children, !live)}</div>;
});
