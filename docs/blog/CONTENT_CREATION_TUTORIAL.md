# Blog Content Creation Tutorial

## Quick Start

You have two ways to create blog posts:

1. **Quick Method**: Drop an MDX file in `/content/posts/`
2. **Full Control**: Use the Admin Dashboard

---

## Method 1: MDX File Drop (Fastest)

### Step 1: Create Your MDX File

Navigate to `/content/posts/` and create a new file:
```
content/posts/my-awesome-post.mdx
```

### Step 2: Add Frontmatter

Start your file with frontmatter between `---` marks:

```yaml
---
title: "My Awesome Japanese Learning Post"
slug: "my-awesome-post"
date: "2025-01-15"
tags: ["JLPT", "grammar", "study-tips"]
excerpt: "Learn the secrets to mastering Japanese grammar"
status: "published"
author: "Your Name"
cover: "/images/blog/my-image.jpg"
---

Your content starts here...
```

### Step 3: Write Your Content

Use Markdown with special components:

```markdown
## Introduction

This is a regular paragraph with **bold** and *italic* text.

### Using Special Components

<Callout type="info">
This is an info box - great for tips!
</Callout>

<Callout type="warning">
This is a warning - use for common mistakes
</Callout>

### Japanese Text with Furigana

The word <Ruby rt="にほんご">日本語</Ruby> means Japanese language.

### Embedding YouTube Videos

<YouTube id="dQw4w9WgXcQ" />

### Code Examples

\```javascript
console.log("Hello, World!");
\```
```

### Step 4: Save and View

1. Save your file
2. Visit `http://localhost:3004/blog`
3. Your post appears immediately!

---

## Method 2: Admin Dashboard (Full Features)

### Step 1: Access Blog Admin

1. Go to Admin Dashboard
2. Click "Create Blog Post" button
3. Or navigate to `/admin/blog/new`

### Step 2: Fill in Basic Information

#### Title and URL
- **Title**: Your post title (appears at the top)
- **URL Slug**: Automatically generated (you can customize)
  - Example: "Japanese Grammar Tips" → `japanese-grammar-tips`

#### Content
- Write in Markdown format
- Click "Preview" to see how it looks
- Use the same components as MDX files

### Step 3: Set Publishing Options

#### Status Options
1. **Draft**: Save without publishing (only you can see it)
2. **Published**: Live immediately
3. **Scheduled**: Set a future date/time

#### For Scheduled Posts:
- Choose "Scheduled" status
- Set publish date (e.g., 2025-01-20)
- Set publish time (e.g., 09:00 AM)
- Post will go live automatically!

### Step 4: Add Tags

Tags help with SEO and related posts:
1. Type a tag name
2. Click "Add" or press Enter
3. Suggested tags: JLPT, grammar, vocabulary, kanji, culture, study-tips

### Step 5: Upload Images (Optional)

#### Cover Image
- Appears at the top of your post
- Recommended size: 1200x630px
- Click "Choose File" → Select image → Auto-uploads

#### Social Media Image (OG Image)
- Appears when shared on social media
- If blank, uses cover image
- Same upload process

### Step 6: SEO Optimization (Optional but Recommended)

Leave these blank to use defaults, or customize:

- **SEO Title**: Custom title for Google (default: post title)
- **SEO Description**: Custom description for search results (default: excerpt)
- **Canonical URL**: Only if republishing from elsewhere

### Step 7: Save Your Post

- Click "Create Post" button
- Redirects to blog management page
- View your post live at `/blog/your-slug`

---

## Managing Existing Posts

### View All Posts
1. Go to Admin Dashboard
2. Click "Manage Blog"
3. See all posts with status, date, and views

### Edit a Post
1. Find your post in the list
2. Click "Edit" button
3. Make changes
4. Click "Update Post"

### Delete a Post
1. Find your post in the list
2. Click "Delete" button
3. Click again to confirm

---

## Content Writing Tips

### 1. Structure Your Posts

```markdown
# Main Title (auto-added from frontmatter)

## Introduction
Brief overview of what you'll cover

## Main Section 1
Deep dive into topic

### Subsection
Specific details

## Main Section 2
Another major point

## Conclusion
Wrap up and call to action
```

### 2. Use Components Effectively

#### Info Boxes for Tips
```jsx
<Callout type="info">
💡 Pro tip: Practice shadowing 15 minutes daily
</Callout>
```

#### Warnings for Common Mistakes
```jsx
<Callout type="warning">
⚠️ Common mistake: Don't confuse は and が
</Callout>
```

#### Success Messages
```jsx
<Callout type="success">
✅ Great job! You've mastered this concept
</Callout>
```

#### Japanese with Furigana
```jsx
<Ruby rt="かんじ">漢字</Ruby> means Chinese characters
```

### 3. SEO Best Practices

#### Title Guidelines
- Keep under 60 characters
- Include target keyword
- Make it compelling

#### Good Examples:
- "Master JLPT N3 Grammar in 30 Days: Complete Guide"
- "10 Japanese Study Mistakes You're Making (And How to Fix Them)"

#### Tags
- Use 3-5 relevant tags
- Mix broad and specific
- Example: ["JLPT N3", "grammar", "study-tips", "particles"]

#### Excerpt
- 150-160 characters ideal
- Include main keyword
- Make it enticing

---

## Publishing Workflow

### For Quick Posts
1. Write MDX file
2. Set `status: "published"`
3. Drop in folder
4. Done! 🎉

### For Planned Content
1. Create in admin as "draft"
2. Review and edit
3. Schedule for optimal time (morning JST recommended)
4. Let system auto-publish

### For Series
1. Create all posts as drafts
2. Schedule them weekly
3. Cross-link between posts
4. Use consistent tags

---

## Image Guidelines

### Where to Store Images
- **Option 1**: Upload via admin (auto-uploads to Firebase)
- **Option 2**: Place in `/public/images/blog/`

### Image Optimization
- **Format**: WebP or optimized JPG
- **Cover images**: 1200x630px (16:9 ratio)
- **In-post images**: Max 1000px wide
- **File size**: Keep under 200KB

### Using Images in Content
```markdown
![Alt text for accessibility](/images/blog/my-image.jpg)
```

---

## Markdown Cheat Sheet

### Text Formatting
```markdown
**bold text**
*italic text*
***bold and italic***
~~strikethrough~~
```

### Lists
```markdown
- Unordered item 1
- Unordered item 2
  - Nested item

1. Ordered item 1
2. Ordered item 2
   1. Nested item
```

### Links
```markdown
[Link text](https://example.com)
[Internal link](/blog/another-post)
```

### Quotes
```markdown
> This is a blockquote
> It can span multiple lines
```

### Tables
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
```

### Code
````markdown
Inline `code` in text

```javascript
// Code block with syntax highlighting
function learn() {
  return "Japanese";
}
```
````

---

## Advanced Features

### Embedding Tweets
Currently not supported, but you can screenshot and use as image.

### Custom HTML
You can use HTML directly:
```html
<div style="background: #f0f0f0; padding: 20px; border-radius: 8px;">
  Custom styled content
</div>
```

### Math Equations
Currently not supported. Use images for complex formulas.

---

## Troubleshooting

### Post Not Appearing?
1. Check status is "published"
2. If scheduled, check date is in the past
3. Verify slug is unique
4. Check for MDX syntax errors

### Images Not Loading?
1. Verify file path is correct
2. Check image is in `/public/images/blog/`
3. For uploaded images, check Firebase Storage

### Formatting Broken?
1. Validate MDX syntax
2. Check all tags are closed
3. Verify frontmatter format

---

## Quick Commands

### View Your Blog
```
http://localhost:3004/blog
```

### Admin Dashboard
```
http://localhost:3004/admin/blog
```

### Create New Post
```
http://localhost:3004/admin/blog/new
```

---

## Best Practices

1. **Consistency**: Post regularly (weekly is ideal)
2. **Length**: Aim for 800-1500 words
3. **Images**: Include at least one image
4. **Internal Links**: Link to related posts
5. **Call to Action**: End with next steps
6. **Proofread**: Check spelling and grammar
7. **Test**: Preview before publishing

---

## Need Help?

- Technical issues: Check `/docs/blog/TECHNICAL_ARCHITECTURE.md`
- Content ideas: Focus on JLPT prep, study techniques, cultural insights
- SEO questions: Use tools like Google Keyword Planner

Happy blogging! 📝✨