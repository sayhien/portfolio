import type { Section } from './CaseStudy.astro';

/** Two digit section numbers (01, 02, ...) that match the side navigation. */
export function sectionNumber(sections: Section[]) {
  return (id: string) => {
    const index = sections.findIndex((section) => section.id === id);
    if (index < 0) throw new Error(`Unknown section "${id}"`);
    return String(index + 1).padStart(2, '0');
  };
}
