// Unified journey map for the ESG case study, transcribed from the
// original journey map image so it can be rendered as readable HTML.
import type { ImageMetadata } from 'astro';
import stage1 from '../assets/esg/journey/stage-1.png';
import stage2 from '../assets/esg/journey/stage-2.png';
import stage3 from '../assets/esg/journey/stage-3.png';
import stage4 from '../assets/esg/journey/stage-4.png';
import stage5 from '../assets/esg/journey/stage-5.png';
import stage6 from '../assets/esg/journey/stage-6.png';
import stage7 from '../assets/esg/journey/stage-7.png';
import stage8 from '../assets/esg/journey/stage-8.png';

export type JourneyStage = {
  name: string;
  description: string;
  image: ImageMetadata;
  actors: string;
  tools: string;
  meetings: string;
  painPoints: string[];
  opportunities: string[];
};

export const journeyStages: JourneyStage[] = [
  {
    name: 'Planning and Initiation',
    description: 'Start reporting cycle, notify departments, set goals.',
    image: stage1,
    actors: 'ESG Manager',
    tools: 'Email, in-app alerts, scheduling',
    meetings: 'Kick-off meeting for goal setting',
    painPoints: [
      'Lack of clear communication about roles and responsibilities',
      'Departments not understanding their specific GRI reporting requirements',
      'Difficulty in setting realistic timelines and deadlines',
    ],
    opportunities: [
      'Create a detailed guide or handbook for each department outlining their GRI responsibilities',
      'Schedule training sessions or webinars on GRI standards',
      'Use project management tools to set and track deadlines',
    ],
  },
  {
    name: 'Data Collection',
    description: 'Departments collect data per GRI responsibilities.',
    image: stage2,
    actors: 'Department heads',
    tools: 'Surveys, assessments, external data',
    meetings: 'Departmental data collection meeting',
    painPoints: [
      'Suppliers not providing timely or accurate data',
      'Difficulty in collecting data from multiple sites or regions',
      'Inconsistent data formats',
      'Time consuming manual data collection processes',
    ],
    opportunities: [
      'Standardize data collection forms and templates',
      'Implement automated data collection systems where possible, provide support for departments in data collection, such as dedicated help desks or training',
      'Integrate with external systems or APIs for data retrieval',
    ],
  },
  {
    name: 'Data Input',
    description: 'Enter data into ESG module, guided by GRI forms.',
    image: stage3,
    actors: 'Department staff',
    tools: 'ERP ESG module, input forms',
    meetings: 'None',
    painPoints: [
      'Complex or unclear input forms, data entry errors',
      'Departments not knowing where to find the required data',
      'Lack of real time validation leading to errors discovered late',
    ],
    opportunities: [
      'Design user friendly input forms with clear instructions and tooltips',
      'Implement validation rules to catch errors early',
      'Provide search or lookup features for data that departments might need to reference',
      'Allow departments to save drafts and return to forms later',
    ],
  },
  {
    name: 'Data Validation',
    description: 'Review and validate data, resolve discrepancies.',
    image: stage4,
    actors: 'Department staff, ESG Manager',
    tools: 'Validation tools, collaboration',
    meetings: 'Cross department validation meeting',
    painPoints: [
      'Discrepancies in data between departments',
      'Missing data or incomplete fields',
      'Time consuming manual validation processes',
      'Lack of transparency in who is responsible for what data',
    ],
    opportunities: [
      'Automate validation checks for completeness and accuracy, implement workflows for cross departmental data verification with clear roles',
      'Provide dashboards to track data validation status and identify bottlenecks',
      'Use chat or alerts or notifications to remind departments of pending validations',
    ],
  },
  {
    name: 'Consolidation',
    description: 'ESG Manager consolidates data, generates preliminary report.',
    image: stage5,
    actors: 'ESG Manager',
    tools: 'Reporting features',
    meetings: 'None',
    painPoints: [
      'Inconsistent data formats making consolidation difficult',
      'Missing data from some departments',
      'Errors in data aggregation',
      'Difficulty in ensuring data is up to date',
    ],
    opportunities: [
      'Standardize data formats and fields across departments',
      'Implement automated data consolidation tools that can handle different formats',
      'Provide alerts for missing or incomplete data',
      'Schedule regular data consolidation runs to keep data current',
    ],
  },
  {
    name: 'Review and Approval',
    description: 'Departments and senior management review, address issues.',
    image: stage6,
    actors: 'Department heads, senior management',
    tools: 'Document review, meeting tools',
    meetings: 'Final review and approval meeting',
    painPoints: [
      'Delays in the approval process due to unclear workflows',
      'Confusion over who is responsible for what',
      'Lack of communication between reviewers and data providers',
    ],
    opportunities: [
      'Implement a structured approval workflow with clear roles and responsibilities',
      'Provide a platform for commenting and resolving issues, such as a discussion forum or ticket system',
      'Schedule regular review meetings to discuss progress and resolve issues',
      'Use versioning to track changes during the review process',
    ],
  },
  {
    name: 'Finalization',
    description: 'Add narratives, format report per GRI, final checks.',
    image: stage7,
    actors: 'ESG Manager',
    tools: 'Report generation, formatting tools',
    meetings: 'None',
    painPoints: [
      'Time consuming to write narratives and explanations',
      'Ensuring that all GRI standards are covered and accurately reflected',
      'Formatting errors or inconsistencies in the report',
    ],
    opportunities: [
      'Provide templates for narrative sections that departments can fill in',
      'Automate report generation based on collected data with placeholders for narratives',
      'Implement a checklist to ensure all GRI standards are addressed',
      'Use style guides or formatting tools to maintain consistency',
    ],
  },
  {
    name: 'Submission and Dissemination',
    description: 'Publish or submit report, archive for future reference.',
    image: stage8,
    actors: 'ESG Manager',
    tools: 'Website, regulatory portals',
    meetings: 'None',
    painPoints: [
      'Manual submission processes leading to delays',
      'Ensuring the report is secure and compliant with privacy regulations',
      'Lack of searchable archives for historical data',
    ],
    opportunities: [
      'Automate report submission to designated portals or email addresses',
      'Implement secure, cloud based storage with search capabilities',
      'Provide access controls for different user roles to manage who can view or edit the report',
      'Archive reports with metadata for easy retrieval and comparison',
    ],
  },
];
