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
  thumb?: 'esg';
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
    external: true,
    tint: '#e4dcc8',
    ratio: 0.8,
  },
  {
    slug: 'esg-reporting-module',
    title: 'ESG Reporting',
    blurb:
      'An ESG (Environmental, Social, and Governance) module designed as part of Tomie Technologies ERP product, integrated with modules like HR, Finance, and Supply Chain.',
    tags: ['Enterprise SaaS', 'Research', 'UI design'],
    href: 'esg-reporting-module/',
    thumb: 'esg',
    tint: '#9debec',
    ratio: 0.69,
  },
  {
    slug: 'swipe-remittance-app',
    title: 'Remittance App',
    blurb:
      'Swipe is an app for the foreign workforce to send money back home. This study looks at how the usability of key features like signing up, topping up, and sending money can be improved.',
    tags: ['Fintech', 'Research', 'Facilitation'],
    href: `${framer}/swipe-remittance-app`,
    external: true,
    tint: '#d5ddd0',
    ratio: 0.62,
  },
  {
    slug: 'docdoc-healthcare-report',
    title: 'Healthcare Report',
    blurb:
      'The report generation flow of the customer relationship management (CRM) system was redesigned for the consumer sales team to help consumers with their medical enquiries.',
    tags: ['Healthcare', 'Research', 'UI design'],
    href: `${framer}/docdoc-healthcare-report`,
    external: true,
    tint: '#dcd3e0',
    ratio: 0.8,
  },
  {
    slug: 'docdoc-library',
    title: 'Design Library',
    blurb:
      'A look at how we aligned our UI components with complex company specifications and Angular Material.',
    tags: ['Design system', 'Figma', 'Angular Material'],
    href: `${framer}/docdoc-library`,
    external: true,
    tint: '#e9d6ca',
    ratio: 0.72,
  },
  {
    slug: 'docdoc-breadcrumb',
    title: 'Breadcrumb',
    blurb:
      'Deep hierarchical layers of functions across an enterprise app left our own staff asking, "Where am I?"',
    tags: ['Healthcare', 'Research', 'UI design'],
    href: `${framer}/docdoc-breadcrumb`,
    external: true,
    tint: '#e8d9c4',
    ratio: 0.7,
  },
  {
    slug: 'four-leaves',
    title: 'Four Leaves',
    blurb: 'A concept redesign of the Four Leaves bakery website.',
    tags: ['Concept redesign', 'Website'],
    tint: '#d9e2d8',
    ratio: 0.62,
  },
  {
    slug: 'five-oars',
    title: 'Five Oars Coffee',
    blurb: 'A concept redesign of the Five Oars Coffee website.',
    tags: ['Concept redesign', 'Website'],
    tint: '#d3dbe3',
    ratio: 0.7,
  },
];
