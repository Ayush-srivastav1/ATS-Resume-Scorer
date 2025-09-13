// backend/atsResumeScorer.js
// Corrected ATS scoring logic - fixed weight mapping and more robust checks.

const DEFAULT_KEYWORDS = [
  "project management","leadership","communication","problem solving","team collaboration","analytics"
];

function calculateATSScore(resumeText, jobDescription) {
  resumeText = resumeText || "";
  jobDescription = jobDescription || "";

  const WEIGHTS = {
    "Keyword Match": 0.25,
    "Formatting": 0.15,
    "Experience": 0.15,
    "Education": 0.10,
    "Skills": 0.10,
    "ATS Parsability": 0.10,
    "Contact Info": 0.05,
    "Achievements": 0.05,
    "Style & Readability": 0.05
  };

  const scores = {};
  scores["Keyword Match"] = calculateKeywordScore(resumeText, jobDescription);
  scores["Formatting"] = calculateFormattingScore(resumeText);
  scores["Experience"] = calculateExperienceScore(resumeText);
  scores["Education"] = calculateEducationScore(resumeText);
  scores["Skills"] = calculateSkillsScore(resumeText);
  scores["ATS Parsability"] = calculateATSParseScore(resumeText);
  scores["Contact Info"] = calculateContactScore(resumeText);
  scores["Achievements"] = calculateAchievementsScore(resumeText);
  scores["Style & Readability"] = calculateStyleScore(resumeText);

  // Compute weighted total using explicit weight keys that match score keys
  const total = Object.keys(WEIGHTS).reduce((sum, key) => {
    const weight = WEIGHTS[key] || 0;
    const scoreVal = scores[key] || 0;
    return sum + scoreVal * weight;
  }, 0);

  return {
    totalScore: Math.max(0, Math.min(100, total * 100)),
    categoryScores: Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, Math.max(0, Math.min(100, v * 100))])
    ),
  };
}

// ---------- Helpers ----------
function normalize(text){ return (text||"").toString(); }

function calculateKeywordScore(resumeText, jobDescription){
  const r = normalize(resumeText).toLowerCase();
  const jd = normalize(jobDescription).toLowerCase();
  let keywords = [];
  if(jd.trim().length > 0){
    keywords = jd.split(/\W+/).filter(t=>t.length>2);
  } else {
    keywords = DEFAULT_KEYWORDS.slice();
  }
  const unique = Array.from(new Set(keywords));
  if(unique.length === 0) return 0;
  const matched = unique.filter(kw => kw && r.includes(kw));
  return Math.min(1.0, matched.length / unique.length);
}

function calculateFormattingScore(txt){
  const t = normalize(txt);
  let score = 1.0;
  // penalize runs of uppercase (likely inconsistent formatting like headings all-caps)
  if(/[A-Z]{8,}/.test(t)) score -= 0.25; // long all-caps words
  if(/[A-Z]{2,}/.test(t) && /[a-z]/.test(t) && /\n/.test(t)) score -= 0.1;
  const sections = ["experience","education","skills","summary"];
  const lower = t.toLowerCase();
  const missing = sections.filter(s => !lower.includes(s)).length;
  if(missing > 0) score -= 0.2;
  return Math.max(0, score);
}

function calculateExperienceScore(txt){
  const t = normalize(txt);
  const hasSection = /(work experience|professional experience|career)/i.test(t);
  if(!hasSection) return 0;
  const regex = /\b(\d+)\s*(?:\+|\-|to)?\s*(?:year|yr|years)\b/gi;
  let total = 0, m;
  while((m = regex.exec(t)) !== null){ total += parseInt(m[1]||0,10); }
  return Math.min(1.0, total/10);
}

function calculateEducationScore(txt){
  const t = normalize(txt);
  return /(bachelor|master|phd|degree|ba\b|bs\b|msc\b|b\.tech|btech)/i.test(t) ? 1.0 : 0.0;
}

function calculateSkillsScore(txt){
  const t = normalize(txt);
  return /(skills|technical skills|competencies|proficienc)/i.test(t) ? 1.0 : 0.5;
}

function calculateATSParseScore(txt){
  const t = normalize(txt);
  if(t.trim().length < 120) return 0; // too short to parse
  const nonword = (t.match(/[^\w\s%$€₹.,:\/()-]/g)||[]).length;
  const ratio = nonword / Math.max(1, t.length);
  if(ratio > 0.05) return 0.4; // lots of weird characters
  const sections = ["experience","education","skills"];
  const has = sections.some(s => t.toLowerCase().includes(s));
  return has ? 1.0 : 0.6;
}

function calculateContactScore(txt){
  const t = normalize(txt);
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(t);
  const hasPhone = /(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){7,14}\d/.test(t);
  if(hasEmail && hasPhone) return 1.0;
  if(hasEmail || hasPhone) return 0.5;
  return 0.0;
}

function calculateAchievementsScore(txt){
  const t = normalize(txt);
  const metricPattern = /[%$€₹]|\b\d{1,3}(?:,\d{3})+\b|\b(increased|reduced|improved|grew|growth|decreased|boosted)\b/ig;
  const found = (t.match(metricPattern)||[]).length;
  if(found >= 2) return 1.0;
  if(found === 1) return 0.6;
  return 0.2;
}

function calculateStyleScore(txt){
  const t = normalize(txt).toLowerCase();
  const weak = ["responsible for","worked on","familiar with","involved in","assisted with","participated in"];
  let bad = 0;
  weak.forEach(p => { if(t.includes(p)) bad++; });
  return Math.max(0, 1 - (bad * 0.25));
}

module.exports = { calculateATSScore };