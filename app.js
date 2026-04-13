// ============================================
//  AI Resume Analyzer — app.js
//  OpenRouter API (Bilkul FREE - India mein kaam karta hai!)
// ============================================

const loadingMsgs = [
  "Resume structure parse ho rahi hai...",
  "Skills extract kar raha hoon...",
  "Job market se match kar raha hoon...",
  "Score calculate ho raha hai...",
  "Final report ready ho rahi hai..."
];

let API_KEY = "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";

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById("resumeText").value = ev.target.result;
  };
  reader.readAsText(file);
}

function showError(msg) {
  const box = document.getElementById("errorBox");
  box.textContent = msg;
  box.classList.add("show");
}
function hideError() {
  document.getElementById("errorBox").classList.remove("show");
}

async function analyzeResume() {
  const resumeText = document.getElementById("resumeText").value.trim();
  const jobTitle   = document.getElementById("jobTitle").value.trim();
  const jobDomain  = document.getElementById("jobDomain").value.trim();

  if (!resumeText || resumeText.length < 50) {
    showError("Bhai, pehle resume text paste karo (kam se kam 50 characters)!");
    return;
  }
  hideError();

  document.getElementById("analyzeBtn").disabled = true;
  document.getElementById("inputSection").style.opacity = "0.4";
  document.getElementById("inputSection").style.pointerEvents = "none";
  document.getElementById("loadingState").classList.add("show");

  let mi = 0;
  const msgInterval = setInterval(() => {
    mi = (mi + 1) % loadingMsgs.length;
    document.getElementById("loadingMsg").textContent = loadingMsgs[mi];
  }, 1800);

  const jobContext = jobTitle
    ? `Target job: ${jobTitle}${jobDomain ? " in " + jobDomain : ""}`
    : "No specific job target mentioned.";

  const prompt = `You are an expert resume analyst and career coach. Analyze the following resume and return ONLY a valid JSON object (no markdown, no explanation outside JSON).

Resume:
"""
${resumeText}
"""

${jobContext}

Return this exact JSON structure:
{
  "score": <number 0-100>,
  "scoreLabel": <"Excellent"|"Good"|"Average"|"Needs Work">,
  "scoreSummary": "<2-sentence honest assessment in Hinglish or English>",
  "categories": [
    {"name": "Skills", "score": <0-100>},
    {"name": "Experience", "score": <0-100>},
    {"name": "Education", "score": <0-100>},
    {"name": "Presentation", "score": <0-100>}
  ],
  "haveSkills": ["<skill1>", "<skill2>"],
  "missingSkills": ["<skill1>", "<skill2>"],
  "jobs": [
    {"title": "<job title>", "company": "<Startup / MNC>", "match": <0-100>, "skills": ["<s1>","<s2>","<s3>"]},
    {"title": "<job title>", "company": "<Startup / MNC>", "match": <0-100>, "skills": ["<s1>","<s2>","<s3>"]},
    {"title": "<job title>", "company": "<Startup / MNC>", "match": <0-100>, "skills": ["<s1>","<s2>","<s3>"]}
  ],
  "tips": ["<tip1>", "<tip2>", "<tip3>", "<tip4>"]
}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "HTTP-Referer": "http://localhost:5500",
        "X-Title": "AI Resume Analyzer"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    clearInterval(msgInterval);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "API error " + res.status);
    }

    const data   = await res.json();
    const raw    = data.choices[0].message.content;
    const clean  = raw.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    renderResults(result);
  } catch (err) {
    clearInterval(msgInterval);
    document.getElementById("inputSection").style.opacity = "1";
    document.getElementById("inputSection").style.pointerEvents = "auto";
    document.getElementById("loadingState").classList.remove("show");
    document.getElementById("analyzeBtn").disabled = false;
    showError("Error: " + err.message);
  }
}

function renderResults(r) {
  document.getElementById("loadingState").classList.remove("show");
  document.getElementById("resultsSection").classList.add("show");

  const score = Math.round(r.score);
  const circumference = 238.76;
  const offset = circumference - (score / 100) * circumference;
  setTimeout(() => {
    document.getElementById("scoreArc").style.strokeDashoffset = offset;
  }, 100);

  let num = 0;
  const numEl = document.getElementById("scoreNum");
  const counter = setInterval(() => {
    num = Math.min(num + 2, score);
    numEl.innerHTML = num + '<span>/ 100</span>';
    if (num >= score) clearInterval(counter);
  }, 20);

  document.getElementById("scoreLabel").textContent   = r.scoreLabel   || "—";
  document.getElementById("scoreSummary").textContent = r.scoreSummary || "—";

  const barColors = ["#378ADD", "#1D9E75", "#D85A30", "#7F77DD"];
  const barsGrid  = document.getElementById("barsGrid");
  barsGrid.innerHTML = "";
  (r.categories || []).forEach((cat, i) => {
    const v = Math.round(cat.score);
    barsGrid.innerHTML += `
      <div class="bar-item">
        <div class="bar-label"><span>${cat.name}</span><strong>${v}%</strong></div>
        <div class="bar-track">
          <div class="bar-fill" id="bar${i}" style="width:0%;background:${barColors[i % 4]}"></div>
        </div>
      </div>`;
  });
  setTimeout(() => {
    (r.categories || []).forEach((cat, i) => {
      const el = document.getElementById("bar" + i);
      if (el) el.style.width = Math.round(cat.score) + "%";
    });
  }, 200);

  document.getElementById("haveSkills").innerHTML =
    (r.haveSkills || []).map((s) => `<span class="tag have">${s}</span>`).join("") ||
    '<span style="font-size:13px;color:#888">Skills detect nahi hue</span>';

  document.getElementById("missingSkills").innerHTML =
    (r.missingSkills || []).map((s) => `<span class="tag missing">${s}</span>`).join("") ||
    '<span style="font-size:13px;color:#888">Sab skills present hain!</span>';

  document.getElementById("jobsGrid").innerHTML = (r.jobs || [])
    .map((j) => {
      const cls = j.match >= 75 ? "high" : "med";
      return `
        <div class="job-card">
          <div>
            <h4>${j.title}</h4>
            <div class="company">${j.company}</div>
            <div class="jskills">
              ${(j.skills || []).map((s) => `<span class="jskill">${s}</span>`).join("")}
            </div>
          </div>
          <div class="match-pct ${cls}">${Math.round(j.match)}% match</div>
        </div>`;
    })
    .join("");

  document.getElementById("tipsList").innerHTML = (r.tips || [])
    .map((t) => `<div class="tip-item">${t}</div>`)
    .join("");
}

function resetApp() {
  document.getElementById("resultsSection").classList.remove("show");
  document.getElementById("inputSection").style.opacity = "1";
  document.getElementById("inputSection").style.pointerEvents = "auto";
  document.getElementById("analyzeBtn").disabled = false;
  document.getElementById("resumeText").value = "";
  document.getElementById("jobTitle").value   = "";
  document.getElementById("jobDomain").value  = "";
  document.getElementById("fileInput").value  = "";
  hideError();
  document.getElementById("scoreArc").style.strokeDashoffset = "238.76";
  document.getElementById("scoreNum").innerHTML = '0<span>/ 100</span>';
}