/**
 * HTML Sanitizer for Anki card content
 * Prevents XSS attacks while preserving formatting
 */

// Allowed HTML tags for Anki content
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'strike', 's',
  'span', 'div', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'img', 'audio', 'video', 'source', // Media tags
  'ruby', 'rt', 'rp', // Japanese support
  'sup', 'sub', 'mark', 'del', 'ins',
  'font', 'center' // Legacy Anki tags
];

// Allowed attributes for specific tags
const ALLOWED_ATTRIBUTES: { [tag: string]: string[] } = {
  'img': ['src', 'alt', 'width', 'height', 'style', 'class'],
  'audio': ['src', 'controls', 'preload', 'autoplay', 'class'],
  'video': ['src', 'controls', 'width', 'height', 'poster', 'class'],
  'source': ['src', 'type'],
  'span': ['style', 'class'],
  'div': ['style', 'class', 'id'],
  'p': ['style', 'class'],
  'table': ['style', 'class', 'border', 'cellpadding', 'cellspacing'],
  'td': ['style', 'colspan', 'rowspan', 'align', 'valign'],
  'th': ['style', 'colspan', 'rowspan', 'align', 'valign'],
  'font': ['color', 'size', 'face'],
  'center': ['style']
};

// Allowed CSS properties
const ALLOWED_CSS_PROPERTIES = [
  'color', 'background-color', 'font-size', 'font-weight', 
  'font-style', 'text-decoration', 'text-align', 'margin',
  'padding', 'border', 'width', 'height', 'display',
  'float', 'clear', 'vertical-align', 'line-height',
  'max-width', 'max-height', 'min-width', 'min-height',
  'object-fit', 'border-radius', 'box-shadow'
];

// Dangerous protocols to block
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

export class HTMLSanitizer {
  /**
   * Sanitize HTML content from Anki cards
   */
  static sanitize(html: string): string {
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = html;

    // Recursively clean all elements
    this.cleanElement(container);

    return container.innerHTML;
  }

  /**
   * Recursively clean an element and its children
   */
  private static cleanElement(element: Element): void {
    // Get all child elements (create array to avoid live collection issues)
    const children = Array.from(element.children);

    for (const child of children) {
      const tagName = child.tagName.toLowerCase();

      // Remove disallowed tags
      if (!ALLOWED_TAGS.includes(tagName)) {
        // Move children up before removing the element
        while (child.firstChild) {
          element.insertBefore(child.firstChild, child);
        }
        child.remove();
        continue;
      }

      // Clean attributes
      this.cleanAttributes(child, tagName);

      // Recursively clean children
      this.cleanElement(child);
    }

    // Clean text nodes for script content
    const textNodes = Array.from(element.childNodes).filter(
      node => node.nodeType === Node.TEXT_NODE
    );

    for (const textNode of textNodes) {
      if (textNode.textContent) {
        // Remove any script tags that might be in text
        textNode.textContent = textNode.textContent.replace(
          /<script[^>]*>[\s\S]*?<\/script>/gi,
          ''
        );
      }
    }
  }

  /**
   * Clean attributes of an element
   */
  private static cleanAttributes(element: Element, tagName: string): void {
    const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || [];
    const attributes = Array.from(element.attributes);

    for (const attr of attributes) {
      const attrName = attr.name.toLowerCase();

      // Remove disallowed attributes
      if (!allowedAttrs.includes(attrName)) {
        element.removeAttribute(attr.name);
        continue;
      }

      // Special handling for different attributes
      switch (attrName) {
        case 'src':
        case 'href':
          // Clean URLs
          const url = attr.value.trim().toLowerCase();
          if (DANGEROUS_PROTOCOLS.some(proto => url.startsWith(proto))) {
            element.removeAttribute(attr.name);
          }
          break;

        case 'style':
          // Clean CSS
          attr.value = this.sanitizeCSS(attr.value);
          break;

        case 'class':
          // Allow classes but sanitize
          attr.value = attr.value.replace(/[^\w\s-]/g, '');
          break;
      }
    }

    // Remove event handlers
    const eventAttrs = attributes.filter(attr => 
      attr.name.toLowerCase().startsWith('on')
    );
    for (const eventAttr of eventAttrs) {
      element.removeAttribute(eventAttr.name);
    }
  }

  /**
   * Sanitize CSS styles
   */
  private static sanitizeCSS(css: string): string {
    const styles = css.split(';').map(style => style.trim()).filter(Boolean);
    const cleanedStyles: string[] = [];

    for (const style of styles) {
      const [property, value] = style.split(':').map(s => s.trim());
      
      if (!property || !value) continue;

      // Check if property is allowed
      if (ALLOWED_CSS_PROPERTIES.includes(property.toLowerCase())) {
        // Remove dangerous values
        if (!value.includes('expression') && 
            !value.includes('javascript:') &&
            !value.includes('behavior')) {
          cleanedStyles.push(`${property}: ${value}`);
        }
      }
    }

    return cleanedStyles.join('; ');
  }

  /**
   * Sanitize plain text (escapes HTML)
   */
  static sanitizeText(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check if HTML content appears safe (quick check)
   */
  static isSafeHTML(html: string): boolean {
    const dangerous = [
      /<script/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<form/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers
      /expression\s*\(/i, // CSS expressions
      /import\s+/i,
      /vbscript:/i
    ];

    return !dangerous.some(pattern => pattern.test(html));
  }
}

/**
 * React hook for sanitized HTML
 */
export function useSanitizedHTML(html: string): { __html: string } {
  return {
    __html: HTMLSanitizer.sanitize(html)
  };
}