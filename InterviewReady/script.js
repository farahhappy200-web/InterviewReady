function setYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}

function validateUrl(value) {
  if (!value) return true; // optional
  try {
    const u = new URL(value);
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
}

function validateForm({ major, position, jobLink, resumeFile }) {
  let valid = true;

  const majorError = document.getElementById('major-error');
  const posError = document.getElementById('position-error');
  const jobError = document.getElementById('jobLink-error');
  const resumeError = document.getElementById('resume-error');

  // Reset
  majorError.textContent = '';
  posError.textContent = '';
  jobError.textContent = '';
  resumeError.textContent = '';

  if (!major.trim()) {
    majorError.textContent = 'Please enter your major.';
    valid = false;
  }
  if (!position.trim()) {
    posError.textContent = 'Please enter the internship position/title.';
    valid = false;
  }
  if (!validateUrl(jobLink)) {
    jobError.textContent = 'Please enter a valid URL.';
    valid = false;
  }

  if (resumeFile) {
    const allowed = ['application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(resumeFile.type)) {
      resumeError.textContent = 'Unsupported file type. Please upload PDF or DOCX.';
      valid = false;
    }
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (resumeFile.size > maxBytes) {
      resumeError.textContent = 'File too large. Max 5MB.';
      valid = false;
    }
  }

  return valid;
}

async function extractTextFromFile(file) {
  if (!file) return '';
  // Minimal client-only approach: attempt to read text for doc/pdf; not perfect.
  // For PDFs/DOCX, many browsers return empty text; a production app would use a WASM parser.
  const text = await file.text().catch(() => '');
  return text.slice(0, 20000); // limit
}

function deriveFocusAreas(major, position, jobDescriptionText) {
  const lowerMajor = major.toLowerCase();
  const lowerPos = position.toLowerCase();
  const lowerJd = (jobDescriptionText || '').toLowerCase();

  const areas = new Set();

  // Heuristics based on major and position
  if (lowerMajor.includes('computer')) {
    areas.add('Data Structures & Algorithms');
    areas.add('System Design Basics');
    areas.add('Behavioral: Projects & Impact');
  }
  if (lowerPos.includes('software') || lowerPos.includes('swe') || lowerPos.includes('developer')) {
    areas.add('Coding Interview Practice');
    areas.add('Debugging & Code Review');
  }
  if (lowerPos.includes('data') && (lowerPos.includes('science') || lowerPos.includes('analyst'))) {
    areas.add('Statistics & Probability');
    areas.add('SQL & Data Manipulation');
    areas.add('Machine Learning Fundamentals');
  }
  if (lowerPos.includes('product')) {
    areas.add('Product Sense & Prioritization');
    areas.add('Analytical Case Questions');
  }

  // From job description keywords
  if (lowerJd.includes('python')) areas.add('Python Fundamentals & Idioms');
  if (lowerJd.includes('java')) areas.add('Java Fundamentals & OOP');
  if (lowerJd.includes('javascript') || lowerJd.includes('typescript')) areas.add('JS/TS Fundamentals');
  if (lowerJd.includes('sql')) areas.add('SQL Querying');
  if (lowerJd.includes('aws') || lowerJd.includes('azure') || lowerJd.includes('gcp')) areas.add('Cloud Basics');

  if (areas.size === 0) {
    areas.add('Role Fundamentals');
    areas.add('Behavioral Storytelling');
  }

  return Array.from(areas);
}

function generatePlan({ major, position, jobLink, resumeText, jobDescriptionText }) {
  const focusAreas = deriveFocusAreas(major, position, jobDescriptionText);

  const sections = [];

  sections.push({
    title: 'Focus Areas',
    items: focusAreas.map(a => `Study: ${a}`)
  });

  sections.push({
    title: 'Behavioral Prep',
    items: [
      'Craft 3-5 STAR stories (Situation, Task, Action, Result).',
      'Align stories to leadership/communication, conflict, and impact themes.',
      'Practice concise 1-2 minute delivery for each story.'
    ]
  });

  sections.push({
    title: 'Technical Practice',
    items: [
      'Daily 45-60 minutes problem solving; alternate topics.',
      'Mock interview weekly with a peer or mentor.',
      'Review 1-2 key projects; prepare “deep dive” angles.'
    ]
  });

  if (jobLink) {
    sections.push({
      title: 'Job Posting Review',
      items: [
        `Analyze the requirements in the posting: ${jobLink}.`,
        'Identify 5 most frequent keywords and map them to your stories.',
        'Draft a tailored elevator pitch emphasizing relevant skills.'
      ]
    });
  }

  if (resumeText) {
    sections.push({
      title: 'Resume Tailoring (based on your upload)',
      items: [
        'Verify bullet points start with strong action verbs and quantify impact.',
        'Ensure technologies and outcomes align with the role’s requirements.',
        'Refine top third of resume to highlight role-relevant strengths.'
      ]
    });
  }

  sections.push({
    title: 'Week-by-Week Plan (2 weeks)',
    items: [
      'Week 1: Focus on fundamentals + build 2 STAR stories.',
      'Week 2: Intensify mock interviews + targeted review from posting.'
    ]
  });

  return sections;
}

function renderPlan(sections) {
  const results = document.getElementById('results');
  const plan = document.getElementById('plan');
  results.classList.remove('hidden');
  results.setAttribute('aria-busy', 'true');
  plan.innerHTML = '';

  for (const section of sections) {
    const el = document.createElement('div');
    el.className = 'plan-section';

    const h3 = document.createElement('h3');
    h3.textContent = section.title;
    el.appendChild(h3);

    const ul = document.createElement('ul');
    for (const item of section.items) {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    }
    el.appendChild(ul);

    plan.appendChild(el);
  }

  results.setAttribute('aria-busy', 'false');
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  const major = document.getElementById('major').value;
  const position = document.getElementById('position').value;
  const jobLink = document.getElementById('jobLink').value;
  const resumeInput = document.getElementById('resume');
  const resumeFile = resumeInput.files && resumeInput.files[0];

  const ok = validateForm({ major, position, jobLink, resumeFile });
  if (!ok) return;

  // Optional fetch of job description text if URL is same-origin; otherwise skip.
  let jobDescriptionText = '';
  try {
    if (jobLink && new URL(jobLink).origin === location.origin) {
      const resp = await fetch(jobLink);
      if (resp.ok) jobDescriptionText = await resp.text();
    }
  } catch {}

  const resumeText = await extractTextFromFile(resumeFile);
  const sections = generatePlan({ major, position, jobLink, resumeText, jobDescriptionText });
  renderPlan(sections);
}

function init() {
  setYear();
  const form = document.getElementById('intake-form');
  form.addEventListener('submit', handleSubmit);
}

window.addEventListener('DOMContentLoaded', init);
