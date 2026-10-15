import type { ImageMetadata } from 'astro';
import esgThumb from '../assets/esg/thumbnail.png';
import chatbotThumb from '../assets/project-ai-chatbot.png';
import remittanceThumb from '../assets/project-remittance.png';
import healthcareThumb from '../assets/project-healthcare-report.png';
import libraryThumb from '../assets/project-design-library.png';
import breadcrumbThumb from '../assets/project-breadcrumb.png';

export const site = {
  name: 'Loo Say Hien',
  role: 'UI/UX Designer, Singapore',
  email: 'sayhien@gmail.com',
  whatsapp: '+65 8777 7862',
  whatsappLink: 'https://wa.me/6587777862',
  resume: 'https://drive.google.com/file/d/13u9pgyVhQqCZbH7HiNLpko5YZB1jMeDf/view?usp=sharing',
  linkedin: 'https://www.linkedin.com/in/loo-say-hien-05094260/',
  intro:
    'Passionate UI/UX Designer with nine years of experience crafting efficient solutions that bridge user needs and business goals. Proficient in translating dense data and complex regulatory frameworks into intuitive, scalable interfaces.',
};

// Case studies not yet rebuilt still point to the live Framer pages.
const framer = 'https://sayhien.framer.website';

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
};

export const projects: Project[] = [
  {
    slug: 'ai-chatbot',
    title: 'AI Chatbot Service',
    blurb:
      'I designed an AI Chatbot service page for SimplifyNext which resolves common UX problems found in the service pages of their competitors. The new page guides prospects through a clear, self-qualifying journey with interactive demo, social proof, and tailored content.',
    tags: ['UX consulting', 'Research', 'UI design'],
    href: `${framer}/ai-chatbot`,
    thumb: chatbotThumb,
    thumbAlt: 'A friendly service robot chatting with a businessman, with a speech bubble between them',
    external: true,
    tint: '#12312b',
    ratio: 0.8,
  },
  {
    slug: 'esg-reporting-module',
    title: 'ESG Reporting',
    blurb:
      'An ESG (Environmental, Social, and Governance) module designed as part of Tomie Technologies ERP product, integrated with modules like HR, Finance, and Supply Chain.',
    tags: ['Enterprise SaaS', 'Research', 'UI design'],
    href: 'esg-reporting-module/',
    thumb: esgThumb,
    thumbAlt: 'ESG reporting dashboard for Tomie Technologies shown on a laptop, with the status distribution and compliance confidence cards',
    tint: '#122a2c',
    ratio: 0.69,
  },
  {
    slug: 'swipe-remittance-app',
    title: 'Remittance App',
    blurb:
      'Swipe is an app for the foreign workforce to send money back home. This study looks at how the usability of key features like signing up, topping up, and sending money can be improved.',
    tags: ['Fintech', 'Research', 'Facilitation'],
    href: `${framer}/swipe-remittance-app`,
    thumb: remittanceThumb,
    thumbAlt: 'A mother hugging her child beside two phones showing the Swipe app sending Singapore dollars to Philippine pesos',
    external: true,
    tint: '#1c2a3f',
    ratio: 0.62,
  },
  {
    slug: 'docdoc-healthcare-report',
    title: 'Healthcare Report',
    blurb:
      'The report generation flow of the customer relationship management (CRM) system was redesigned for the consumer sales team to help consumers with their medical enquiries.',
    tags: ['Healthcare', 'Research', 'UI design'],
    href: `${framer}/docdoc-healthcare-report`,
    thumb: healthcareThumb,
    thumbAlt: 'docdoc case management screen with a discovery report, doctor profiles and price scores, beside a smiling customer service agent',
    external: true,
    tint: '#122a2c',
    ratio: 0.8,
  },
  {
    slug: 'docdoc-library',
    title: 'Design Library',
    blurb:
      'A look at how we aligned our UI components with complex company specifications and Angular Material.',
    tags: ['Design system', 'Figma', 'Angular Material'],
    href: `${framer}/docdoc-library`,
    thumb: libraryThumb,
    thumbAlt: 'docdoc design library showing tables, provider cards, label and value lists and section navigation',
    external: true,
    tint: '#2b2338',
    ratio: 0.72,
  },
  {
    slug: 'docdoc-breadcrumb',
    title: 'Breadcrumb',
    blurb:
      'Deep hierarchical layers of functions across an enterprise app left our own staff asking, "Where am I?"',
    tags: ['Healthcare', 'Research', 'UI design'],
    href: `${framer}/docdoc-breadcrumb`,
    thumb: breadcrumbThumb,
    thumbAlt: 'docdoc policy administration screen with a long breadcrumb trail shortened to Policy administration, then Edit restriction',
    external: true,
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
