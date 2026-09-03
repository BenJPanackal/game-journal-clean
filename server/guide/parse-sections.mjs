/** Strip HTML to plain text for section parsing. */
export function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Pull wiki-style sections (Where to Find, Stats, etc.) from page text or HTML.
 * @returns {{ title: string, body: string }[]}
 */
export function extractWikiSections(rawHtmlOrText) {
  const html = String(rawHtmlOrText || '');
  const sections = [];

  const headingRe = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  const headings = [];
  while ((match = headingRe.exec(html)) !== null) {
    headings.push({
      index: match.index,
      end: match.index + match[0].length,
      title: stripHtml(match[2]),
    });
  }

  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].end;
    const end = i + 1 < headings.length ? headings[i + 1].index : html.length;
    const chunk = html.slice(start, end);
    const body = stripHtml(chunk);
    if (body.length > 20) {
      sections.push({ title: headings[i].title, body: body.slice(0, 4000) });
    }
  }

  if (sections.length === 0) {
    const plain = stripHtml(html);
    if (plain.length > 40) sections.push({ title: 'Page', body: plain.slice(0, 6000) });
  }

  return sections;
}

/** Prefer location / stats sections for guide answers. */
export function pickGuideSections(sections) {
  const priority = /where to find|location|how to get|requirements|stats|weapon skill|overview|description/i;
  const ranked = [...sections].sort((a, b) => {
    const pa = priority.test(a.title) ? 0 : 1;
    const pb = priority.test(b.title) ? 0 : 1;
    return pa - pb || a.title.localeCompare(b.title);
  });
  return ranked.slice(0, 4);
}

export function formatFactsAnswer(sections, pageTitle) {
  const picked = pickGuideSections(sections);
  if (picked.length === 0) {
    return { answer: `No structured sections found on the wiki page for “${pageTitle}”.`, sections: [] };
  }
  const parts = picked.map((s) => `**${s.title}**\n${s.body}`);
  return {
    answer: parts.join('\n\n'),
    sections: picked,
  };
}
