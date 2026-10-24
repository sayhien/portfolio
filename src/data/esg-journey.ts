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
  painPoints: string[];
  opportunities: string[];
};

// Two distinct pain points and two opportunities per stage, so no stage repeats another.
export const journeyStages: JourneyStage[] = [
  {
    name: 'Planning and Initiation',
    description: 'Start the reporting cycle, notify departments, set goals.',
    image: stage1,
    actors: 'ESG Manager, Department heads, Senior management',
    tools: 'Email, In-app alerts, Scheduling',
    painPoints: ['Roles and responsibilities are unclear', 'Departments don’t know their GRI requirements'],
    opportunities: ['A short guide for each department’s GRI duties', 'Deadlines set and tracked in one place'],
  },
  {
    name: 'Data Collection',
    description: 'Departments gather data for their GRI duties.',
    image: stage2,
    actors: 'Department heads, Department staff',
    tools: 'Surveys, Assessments, External data',
    painPoints: ['Suppliers send data late or inaccurately', 'Collecting by hand from many sites is slow'],
    opportunities: ['Standard templates for every department', 'Pull data automatically from other systems'],
  },
  {
    name: 'Data Input',
    description: 'Enter data into the ESG module through GRI forms.',
    image: stage3,
    actors: 'Department staff',
    tools: 'ERP ESG module, Input forms',
    painPoints: ['Forms are complex, so entry errors creep in', 'Errors surface late, with no live checks'],
    opportunities: ['Clear forms with help text and live validation', 'Save drafts and finish later'],
  },
  {
    name: 'Data Validation',
    description: 'Review the data and resolve discrepancies.',
    image: stage4,
    actors: 'Department staff, ESG Manager',
    tools: 'Validation tools, Collaboration',
    painPoints: ['Figures don’t match between departments', 'Fields are missing or incomplete'],
    opportunities: ['Automatic checks for completeness', 'A status view that shows where validation is stuck'],
  },
  {
    name: 'Consolidation',
    description: 'The ESG Manager combines data into a draft report.',
    image: stage5,
    actors: 'ESG Manager',
    tools: 'Reporting features',
    painPoints: ['Data arrives in different formats', 'Hard to know if data is up to date'],
    opportunities: ['One shared format for every department', 'Alerts when data is missing or out of date'],
  },
  {
    name: 'Review and Approval',
    description: 'Department heads and management review and fix issues.',
    image: stage6,
    actors: 'Department heads, Senior management',
    tools: 'Document review, Meeting tools',
    painPoints: ['Approvals stall because the steps are unclear', 'Reviewers and data owners rarely talk'],
    opportunities: ['A clear approval flow with named owners', 'Comments on each answer, with version history'],
  },
  {
    name: 'Finalization',
    description: 'Add narratives, format the report, run final checks.',
    image: stage7,
    actors: 'ESG Manager',
    tools: 'Report generation, Formatting tools',
    painPoints: ['Writing narratives takes a long time', 'Easy to miss a GRI standard'],
    opportunities: ['Narrative templates and auto filled data', 'A checklist of every GRI standard'],
  },
  {
    name: 'Submission and Dissemination',
    description: 'Publish or submit the report, then archive it.',
    image: stage8,
    actors: 'ESG Manager',
    tools: 'Website, Regulatory portals',
    painPoints: ['Manual submission causes delays', 'Past reports are hard to search'],
    opportunities: ['Submit straight to the required portals', 'A secure, searchable archive'],
  },
];
