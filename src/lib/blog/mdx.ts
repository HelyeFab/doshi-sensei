// For now, we'll just return the raw MDX content and render it as markdown
// The full MDX setup can be configured later
export async function mdxToHtml(mdx: string) {
  // Strip frontmatter if present
  const contentWithoutFrontmatter = mdx.replace(/^---[\s\S]*?---\n/, '');
  return contentWithoutFrontmatter;
}