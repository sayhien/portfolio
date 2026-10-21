import type { ImageMetadata } from 'astro';
import type { CaseIconKind } from '../components/CaseIcon.astro';
import esgThumb from '../assets/esg/thumbnail.jpg';
import chatbotThumb from '../assets/project-ai-chatbot.png';
import remittanceThumb from '../assets/project-remittance.jpg';
import healthcareThumb from '../assets/project-healthcare-report.jpg';
import libraryThumb from '../assets/project-design-library.jpg';
import breadcrumbThumb from '../assets/project-breadcrumb.jpg';

export const site = {
  name: 'Loo Say Hien',
  role: 'UI/UX Designer, Singapore',
  email: 'sayhien@gmail.com',
  whatsapp: '+65 8777 7862',
  whatsappLink: 'https://wa.me/6587777862',
  resume: 'https://sayhien.github.io/Resume/',
  linkedin: 'https://www.linkedin.com/in/loo-say-hien-05094260/',
  heroLine: 'Some designers see the galaxy. Some see the grass. I see both, and I know when to zoom in.',
  footerLine: 'From the product\u2019s direction to the gap between two buttons, every layer gets the same care.',
  intro:
    'Passionate UI/UX Designer with nine years of experience crafting efficient solutions that bridge user needs and business goals. Proficient in translating dense data and complex regulatory frameworks into intuitive, scalable interfaces.',
};

export type Project = {
  slug: string;
  title: string;
  blurb: string;
  tags: string[];
  href?: string;
  external?: boolean;
  thumb?: ImageMetadata;
  thumbAlt?: string;
  tint: string;
  ratio: number; // placeholder height / width
  icon?: CaseIconKind;
  /** One line for the More case studies cards at the end of a case study. */
  nextBlurb?: string;
};

export const projects: Project[] = [
  {
    slug: 'ai-chatbot',
    icon: 'chat',
    nextBlurb: 'Turned a chatbot service page into a clear journey where prospects can try the product before talking to sales.',
    title: 'AI Chatbot Service',
    blurb:
      'I designed an AI Chatbot service page for SimplifyNext which resolves common UX problems found in the service pages of their competitors. The new page guides prospects through a clear, self-qualifying journey with interactive demo, social proof, and tailored content.',
    tags: ['UX consulting', 'Research', 'UI design'],
    href: 'ai-chatbot/',
    thumb: chatbotThumb,
    thumbAlt: 'A friendly service robot chatting with a businessman, with a speech bubble between them',
    tint: '#12312b',
    ratio: 0.8,
  },
  {
    slug: 'esg-reporting-module',
    icon: 'globe',
    nextBlurb: 'Designed a clean ESG reporting module that makes complex sustainability data feel simple to manage.',
    title: 'ESG Reporting',
    blurb:
      'An ESG (Environmental, Social, and Governance) module designed as part of Tomie Technologies ERP product, integrated with modules like HR, Finance, and Supply Chain.',
    tags: ['Enterprise SaaS', 'Research', 'UI design'],
    href: 'esg-reporting-module/',
    thumb: esgThumb,
    thumbAlt: 'Tomie ESG reporting dashboard on a laptop, with the status distribution donut and an 82 percent compliance confidence card',
    tint: '#122a2c',
    ratio: 0.69,
  },
  {
    slug: 'swipe-remittance-app',
    icon: 'remit',
    nextBlurb: 'Redesigned a high dropoff remittance flow into a simple experience users actually finish.',
    title: 'Remittance App',
    blurb:
      'Swipe is an app for the foreign workforce to send money back home. This study looks at how the usability of key features like signing up, topping up, and sending money can be improved.',
    tags: ['Fintech', 'Research', 'Facilitation'],
    href: 'swipe-remittance-app/',
    thumb: remittanceThumb,
    thumbAlt: 'A mother hugging her child beside two phones showing the Swipe app sending Singapore dollars to Philippine pesos',
    tint: '#1c2a3f',
    ratio: 0.62,
  },
  {
    slug: 'docdoc-healthcare-report',
    icon: 'report',
    nextBlurb: 'Merged two reporting apps into one workflow, so member reps work faster without switching tools.',
    title: 'Healthcare Report',
    blurb:
      'The report generation flow of the customer relationship management (CRM) system was redesigned for the consumer sales team to help consumers with their medical enquiries.',
    tags: ['Healthcare', 'Research', 'UI design'],
    href: 'docdoc-healthcare-report/',
    thumb: healthcareThumb,
    thumbAlt: 'docdoc case management screen with a discovery report, doctor profiles and price scores, beside a smiling customer service agent',
    tint: '#122a2c',
    ratio: 0.8,
  },
  {
    slug: 'docdoc-library',
    icon: 'library',
    nextBlurb: 'Built and kept a library of reusable components for an enterprise healthcare product.',
    title: 'Design Library',
    blurb:
      'A look at how we aligned our UI components with complex company specifications and Angular Material.',
    tags: ['Design system', 'Figma', 'Angular Material'],
    href: 'docdoc-library/',
    thumb: libraryThumb,
    thumbAlt: 'docdoc Library: a large panel of design components, including provider cards with star ratings, lists, label and value tables and section links, on a teal background',
    tint: '#2b2338',
    ratio: 0.72,
  },
  {
    slug: 'docdoc-breadcrumb',
    icon: 'crumb',
    nextBlurb: 'Solved the “where am I?” problem in a deeply layered enterprise app with a breadcrumb trail.',
    title: 'Breadcrumb',
    blurb:
      'Deep hierarchical layers of functions across an enterprise app left our own staff asking, "Where am I?"',
    tags: ['Healthcare', 'Research', 'UI design'],
    href: 'docdoc-breadcrumb/',
    thumb: breadcrumbThumb,
    thumbAlt: 'docdoc Edit restriction screen under a large breadcrumb reading Policy administration, then an ellipsis that opens a menu of Edit policy and Edit plan, then Edit restriction',
    tint: '#122a2c',
    ratio: 0.7,
  },
  {
    slug: 'four-leaves',
    title: 'Four Leaves',
    blurb: 'A concept redesign of the Four Leaves bakery website.',
    tags: ['Concept redesign', 'Website'],
    tint: '#1c2b36',
    ratio: 0.62,
  },
  {
    slug: 'five-oars',
    title: 'Five Oars Coffee',
    blurb: 'A concept redesign of the Five Oars Coffee website.',
    tags: ['Concept redesign', 'Website'],
    tint: '#2b2338',
    ratio: 0.7,
  },
];

/** Links to other case studies, in the order given, for the end of a case study page. */
export function caseLinks(slugs: string[]) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return slugs.map((slug) => {
    const p = projects.find((item) => item.slug === slug);
    if (!p?.href) throw new Error(`No case study page for "${slug}"`);
    return { title: p.title, blurb: p.nextBlurb ?? p.blurb, href: base + p.href, icon: p.icon };
  });
}
