// Basic utility helpers
function midSalary(job) {
  return (job.minLpa + job.maxLpa) / 2;
}

function formatNumber(num) {
  if (num === 0) return "0";
  if (!num || Number.isNaN(num)) return "–";
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toLocaleString("en-IN");
}

function formatLpa(num) {
  if (!num || Number.isNaN(num)) return "–";
  return num.toFixed(1) + " LPA";
}

// Filtering
function applyFilters(data, { role, city, skill, minSalaryLpa }) {
  return data.filter((job) => {
    if (role && job.role !== role) return false;
    if (city && job.city !== city) return false;
    if (skill && !job.skills.includes(skill)) return false;
    if (minSalaryLpa && midSalary(job) < minSalaryLpa) return false;
    return true;
  });
}

// Aggregations
function aggregateCounts(data, key) {
  const counts = {};
  data.forEach((job) => {
    const val = job[key];
    counts[val] = (counts[val] || 0) + 1;
  });
  return counts;
}

function aggregateSkills(data) {
  const counts = {};
  data.forEach((job) => {
    job.skills.forEach((s) => {
      counts[s] = (counts[s] || 0) + 1;
    });
  });
  return counts;
}

function averageSalaryBy(data, key) {
  const sums = {};
  const counts = {};
  data.forEach((job) => {
    const k = job[key];
    const m = midSalary(job);
    sums[k] = (sums[k] || 0) + m;
    counts[k] = (counts[k] || 0) + 1;
  });
  const result = {};
  Object.keys(sums).forEach((k) => {
    result[k] = sums[k] / counts[k];
  });
  return result;
}

function globalMedianSalary(data) {
  const mids = data.map(midSalary).sort((a, b) => a - b);
  if (mids.length === 0) return 0;
  const mid = Math.floor(mids.length / 2);
  if (mids.length % 2 === 0) {
    return (mids[mid - 1] + mids[mid]) / 2;
  }
  return mids[mid];
}

function pythonSqlPremium(data) {
  const both = data.filter(
    (job) => job.skills.includes("Python") && job.skills.includes("SQL")
  );
  const others = data.filter(
    (job) => !(job.skills.includes("Python") && job.skills.includes("SQL"))
  );
  const avgBoth =
    both.reduce((sum, j) => sum + midSalary(j), 0) / (both.length || 1);
  const avgOthers =
    others.reduce((sum, j) => sum + midSalary(j), 0) / (others.length || 1);
  if (!avgBoth || !avgOthers) return 0;
  return ((avgBoth - avgOthers) / avgOthers) * 100;
}

// Chart management
const chartRegistry = {};

function createOrUpdateChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (chartRegistry[id]) {
    chartRegistry[id].data = config.data;
    if (config.options) {
      chartRegistry[id].options = config.options;
    }
    chartRegistry[id].update();
  } else {
    chartRegistry[id] = new Chart(ctx, config);
  }
}

// Populate filters
function populateFilters(data) {
  const roleSelect = document.getElementById("filterRole");
  const citySelect = document.getElementById("filterCity");
  const skillSelect = document.getElementById("filterSkill");

  const roles = Array.from(new Set(data.map((j) => j.role))).sort();
  const cities = Array.from(new Set(data.map((j) => j.city))).sort();
  const skills = Array.from(
    new Set(
      data.reduce((acc, j) => {
        j.skills.forEach((s) => acc.push(s));
        return acc;
      }, [])
    )
  ).sort();

  const addOptions = (select, values) => {
    values.forEach((val) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });
  };

  addOptions(roleSelect, roles);
  addOptions(citySelect, cities);
  addOptions(skillSelect, skills);
}

// Update KPI cards and hero stats
function updateStatsAndKpis(allData, filteredData) {
  const totalJobs = allData.length;
  const median = globalMedianSalary(allData);
  const pythonSqlBoost = pythonSqlPremium(allData);

  const statTotalJobs = document.getElementById("statTotalJobs");
  const statTopCities = document.getElementById("statTopCities");
  const statMedianSalary = document.getElementById("statMedianSalary");

  if (statTotalJobs) statTotalJobs.textContent = formatNumber(totalJobs);
  if (statMedianSalary) statMedianSalary.textContent = formatLpa(median);

  const cityCounts = aggregateCounts(allData, "city");
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city]) => city)
    .join(", ");
  if (statTopCities) statTopCities.textContent = topCities;

  const kpiTotalJobs = document.getElementById("kpiTotalJobs");
  const kpiAvgSalary = document.getElementById("kpiAvgSalary");
  const kpiTopSkills = document.getElementById("kpiTopSkills");

  if (kpiTotalJobs) kpiTotalJobs.textContent = formatNumber(filteredData.length);

  const avgSalary =
    filteredData.reduce((sum, j) => sum + midSalary(j), 0) /
    (filteredData.length || 1);
  if (kpiAvgSalary) kpiAvgSalary.textContent = formatLpa(avgSalary);

  const skillCounts = aggregateSkills(filteredData);
  const topSkillString = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s)
    .join(" · ");
  if (kpiTopSkills) {
    kpiTopSkills.textContent = topSkillString || "No data";
  }

  // Also slightly tweak one of the textual insights in DOM based on pythonSqlBoost if needed.
  const insightNode = document.querySelector(
    "#insights .insight-card:first-of-type p"
  );
  if (insightNode && pythonSqlBoost) {
    const rounded = Math.round(pythonSqlBoost / 5) * 5; // e.g. ~30%
    insightNode.innerHTML =
      "Fresher roles that require both <strong>Python</strong> and <strong>SQL</strong> offer around <strong>" +
      rounded +
      "% higher median salary</strong> compared to generic IT support or non-technical roles.";
  }
}

// Build charts
function updateCharts(filteredData) {
  const roleCounts = aggregateCounts(filteredData, "role");
  const roleLabels = Object.keys(roleCounts);
  const roleValues = Object.values(roleCounts);

  createOrUpdateChart("chartRoles", {
    type: "bar",
    data: {
      labels: roleLabels,
      datasets: [
        {
          label: "Job postings",
          data: roleValues,
          backgroundColor: "#2563eb",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { ticks: { font: { size: 11 } } },
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  });

  const skillCounts = aggregateSkills(filteredData);
  const skillEntries = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]);
  const topSkillEntries = skillEntries.slice(0, 8);
  const skillLabels = topSkillEntries.map(([s]) => s);
  const skillValues = topSkillEntries.map(([, c]) => c);

  createOrUpdateChart("chartSkills", {
    type: "bar",
    data: {
      labels: skillLabels,
      datasets: [
        {
          label: "Appearances",
          data: skillValues,
          backgroundColor: "#10b981",
          borderRadius: 8,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  });

  const avgSalaryRole = averageSalaryBy(filteredData, "role");
  const salaryRoleLabels = Object.keys(avgSalaryRole);
  const salaryRoleValues = Object.values(avgSalaryRole);

  createOrUpdateChart("chartSalaryByRole", {
    type: "bar",
    data: {
      labels: salaryRoleLabels,
      datasets: [
        {
          label: "Avg Salary (LPA)",
          data: salaryRoleValues,
          backgroundColor: "#6366f1",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatLpa(ctx.parsed.y),
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => val + "L",
          },
        },
      },
    },
  });

  const cityCounts = aggregateCounts(filteredData, "city");
  const cityLabels = Object.keys(cityCounts);
  const cityValues = Object.values(cityCounts);

  createOrUpdateChart("chartCityHeatmap", {
    type: "bar",
    data: {
      labels: cityLabels,
      datasets: [
        {
          label: "Postings",
          data: cityValues,
          backgroundColor: cityValues.map(
            (v) => `rgba(37,99,235,${0.25 + (v / Math.max(...cityValues || [1])) * 0.6})`
          ),
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 11 } } },
        y: { beginAtZero: true },
      },
    },
  });

  // Skill vs salary - treat skill stacks as combined labels
  const stackMap = {};
  filteredData.forEach((job) => {
    const key = job.skills
      .filter((s) => ["Python", "SQL", "JavaScript", "React", "Java", "Excel"].includes(s))
      .sort()
      .join(" + ");
    if (!key) return;
    if (!stackMap[key]) {
      stackMap[key] = { total: 0, count: 0 };
    }
    stackMap[key].total += midSalary(job);
    stackMap[key].count += 1;
  });

  const stackLabels = Object.keys(stackMap);
  const stackValues = stackLabels.map(
    (k) => stackMap[k].total / stackMap[k].count
  );

  createOrUpdateChart("chartSkillVsSalary", {
    type: "bar",
    data: {
      labels: stackLabels,
      datasets: [
        {
          label: "Avg Salary (LPA)",
          data: stackValues,
          backgroundColor: "#f97316",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatLpa(ctx.parsed.y),
          },
        },
      },
      scales: {
        x: {
          ticks: {
            font: { size: 10 },
            callback: (val, idx) => stackLabels[idx].slice(0, 18) + (stackLabels[idx].length > 18 ? "…" : ""),
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => val + "L",
          },
        },
      },
    },
  });
}

// Dark mode toggle
function setupThemeToggle() {
  const btn = document.getElementById("themeToggle");
  const icon = btn?.querySelector(".theme-icon");
  const stored = localStorage.getItem("jm-theme");
  if (stored === "dark") {
    document.body.classList.add("dark");
    if (icon) icon.textContent = "🌙";
  }

  btn?.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("jm-theme", isDark ? "dark" : "light");
    if (icon) icon.textContent = isDark ? "🌙" : "☀️";
  });
}

// Initialize everything
document.addEventListener("DOMContentLoaded", () => {
  if (!Array.isArray(jobData) || jobData.length === 0) return;

  populateFilters(jobData);

  const roleSelect = document.getElementById("filterRole");
  const citySelect = document.getElementById("filterCity");
  const skillSelect = document.getElementById("filterSkill");
  const salaryRange = document.getElementById("filterSalaryRange");
  const salaryLabel = document.getElementById("filterSalaryValue");
  const resetBtn = document.getElementById("resetFilters");

  const getFilterState = () => ({
    role: roleSelect.value,
    city: citySelect.value,
    skill: skillSelect.value,
    minSalaryLpa: Number(salaryRange.value) || 0,
  });

  const updateAll = () => {
    const state = getFilterState();
    if (salaryLabel) {
      salaryLabel.textContent = `${state.minSalaryLpa} LPA+`;
    }
    const filtered = applyFilters(jobData, state);
    updateStatsAndKpis(jobData, filtered);
    updateCharts(filtered);
  };

  roleSelect.addEventListener("change", updateAll);
  citySelect.addEventListener("change", updateAll);
  skillSelect.addEventListener("change", updateAll);
  salaryRange.addEventListener("input", updateAll);
  resetBtn.addEventListener("click", () => {
    roleSelect.value = "";
    citySelect.value = "";
    skillSelect.value = "";
    salaryRange.value = 0;
    updateAll();
  });

  const footerYear = document.getElementById("footerYear");
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  setupThemeToggle();
  updateAll();
});

