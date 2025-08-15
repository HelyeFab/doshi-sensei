import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
// @ts-ignore - rehype-prism-plus doesn't have types
import rehypePrismPlus from 'rehype-prism-plus';

export async function mdxToHtml(mdx: string) {
  return serialize(mdx, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        [rehypePrismPlus, { 
          showLineNumbers: true,
          ignoreMissing: true 
        }]
      ],
      format: 'mdx',
    },
  });
}