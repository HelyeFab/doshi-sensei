import React from 'react';

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  // Convert markdown to HTML (basic conversion for now)
  const processContent = (text: string) => {
    let html = text;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium text-foreground mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-foreground mt-6 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-foreground mt-8 mb-4">$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p class="text-foreground/90 leading-relaxed mb-4">');
    
    // Lists
    html = html.replace(/^\* (.+)$/gim, '<li class="mb-1">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc list-inside text-foreground/90 mb-4 ml-4">$1</ul>');
    
    // Code blocks
    html = html.replace(/```([^`]+)```/g, '<pre class="bg-muted rounded-lg p-4 overflow-x-auto mb-4"><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
    
    // Wrap in paragraph tags
    html = '<p class="text-foreground/90 leading-relaxed mb-4">' + html + '</p>';
    
    return html;
  };
  
  return (
    <div 
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: processContent(content) }}
    />
  );
}