// FRONTEND/src/utils/generateDashboardReport.js
// Generates a comprehensive patient report PDF from the dashboard

import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * Risk scale definition
 */
const RISK_SCALE = [
  { label: "Low Risk",      min: 0,  max: 33,  color: [34, 197, 94],   rgb: [34, 197, 94]   },
  { label: "Moderate Risk", min: 34, max: 66,  color: [234, 179, 8],   rgb: [234, 179, 8]   },
  { label: "High Risk",     min: 67, max: 100, color: [239, 68, 68],   rgb: [239, 68, 68]   },
];

/**
 * Resolve the risk category object from a category string or score number.
 */
function resolveRisk(riskAssessment) {
  if (!riskAssessment) return null;

  const category = (riskAssessment.category || "").toString().toLowerCase();
  const score    = Number(riskAssessment.score);

  if (category === "low")      return { ...RISK_SCALE[0], score };
  if (category === "moderate") return { ...RISK_SCALE[1], score };
  if (category === "high")     return { ...RISK_SCALE[2], score };

  // Fallback: derive from score if category not recognized
  if (!isNaN(score) && riskAssessment.score !== null) {
    for (const band of RISK_SCALE) {
      if (score >= band.min && score <= band.max) return { ...band, score };
    }
  }

  return null;
}

/**
 * Draw a horizontal risk bar (Low | Moderate | High) with a pointer.
 */
function drawRiskBar(doc, x, y, width, resolvedRisk) {
  const segW = width / 3;
  const barH = 16;

  const segments = [
    { label: "Low",      color: [34, 197, 94]  },
    { label: "Moderate", color: [234, 179, 8]  },
    { label: "High",     color: [239, 68, 68]  },
  ];

  segments.forEach((seg, i) => {
    // Fill segment
    doc.setFillColor(...seg.color);
    doc.rect(x + i * segW, y, segW, barH, "F");

    // Label inside segment
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(seg.label, x + i * segW + segW / 2, y + barH / 2 + 3, { align: "center" });
  });

  // Pointer triangle below the active segment
  if (resolvedRisk) {
    const cat = (resolvedRisk.label || "").toString().toLowerCase();
    let segIdx = 0;
    if (cat.includes("moderate")) segIdx = 1;
    else if (cat.includes("high"))     segIdx = 2;

    const triX = x + segIdx * segW + segW / 2;
    const triY = y + barH + 2;

    doc.setFillColor(44, 62, 80);
    doc.triangle(triX - 6, triY + 8, triX + 6, triY + 8, triX, triY, "F");
  }
}

/**
 * Main export: generate the comprehensive PDF report.
 * @param {{ user: object, tests: array, risk: object }} param0
 */
export async function generateDashboardReport({ user, tests = [], risk }) {
  console.log("Generating Dashboard Report with data:", { user, testsCount: tests?.length, risk });
  
  try {
    const doc     = new jsPDF({ unit: "pt", format: "a4" });
    const pageW   = doc.internal.pageSize.getWidth();
    const pageH   = doc.internal.pageSize.getHeight();
    const margin  = 40;
    const now     = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });

    // Resolve user name - extremely safe string conversion
    let userName = "N/A";
    const u = user || {};
    if (u.name) {
      userName = u.name.toString();
    } else if (u.first_name || u.last_name) {
      userName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || "N/A";
    }

    const resolvedRisk = resolveRisk(risk);

    // ─────────────────────────────────────────────
    // HEADER BANNER
    // ─────────────────────────────────────────────
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 72, "F");

    // Emoji/Icon substitute
    doc.setFillColor(255, 255, 255);
    doc.circle(margin + 10, 36, 12, "F");
    doc.setFillColor(37, 99, 235);
    doc.circle(margin + 10, 36, 9, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text("Dementia Tracker - Comprehensive Patient Report", margin + 28, 33);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${now}`, margin + 28, 52);

    // ─────────────────────────────────────────────
    // PATIENT DETAILS SECTION
    // ─────────────────────────────────────────────
    let y = 95;

    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, pageW - margin * 2, 80, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, pageW - margin * 2, 80, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text("Patient Details", margin + 10, y + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);

    const col1 = margin + 10;
    const col2 = margin + 190;
    const col3 = margin + 360;

    const age    = u.age    || "N/A";
    const gender = u.gender || "N/A";
    const email  = u.email  || "N/A";

    doc.setFont("helvetica", "bold"); doc.text("Name:",   col1, y + 40);
    doc.setFont("helvetica", "normal"); doc.text(userName, col1 + 40, y + 40);

    doc.setFont("helvetica", "bold"); doc.text("Age:",    col2, y + 40);
    doc.setFont("helvetica", "normal"); doc.text(age.toString(), col2 + 28, y + 40);

    doc.setFont("helvetica", "bold"); doc.text("Gender:", col3, y + 40);
    doc.setFont("helvetica", "normal"); doc.text(gender.toString(), col3 + 44, y + 40);

    doc.setFont("helvetica", "bold"); doc.text("Email:",  col1, y + 60);
    doc.setFont("helvetica", "normal"); doc.text(email.toString(), col1 + 37, y + 60);

    y += 100;

    // ─────────────────────────────────────────────
    // TRACKED DATA SUMMARY
    // ─────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text("Tracked Assessment Data", margin, y);
    y += 8;

    const testArray = Array.isArray(tests) ? tests : [];
    const totalTests = testArray.length;
    const avgPerf = totalTests > 0
      ? Math.round(testArray.reduce((s, t) => {
          const score = Number(t?.score) || 0;
          const maxS  = Number(t?.max_score) || 10;
          const pct   = t?.percentage ?? Math.round((score / maxS) * 100);
          return s + (Number(pct) || 0);
        }, 0) / totalTests)
      : 0;

    let lastTestDate = "N/A";
    if (totalTests > 0) {
      try {
        const sorted = testArray.filter(t => t?.completed_at).sort((a,b) => new Date(b.completed_at) - new Date(a.completed_at));
        if (sorted.length > 0) {
          lastTestDate = new Date(sorted[0].completed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        }
      } catch (e) {
        console.warn("Could not parse dates for summary", e);
      }
    }

    // Three summary boxes
    const boxW = (pageW - margin * 2 - 20) / 3;
    const boxH = 60;
    const boxes = [
      { label: "Tests Completed", value: totalTests.toString(), color: [239, 246, 255] },
      { label: "Average Score",   value: `${avgPerf}%`,        color: [240, 253, 244] },
      { label: "Last Test",       value: lastTestDate,         color: [255, 251, 235] },
    ];

    boxes.forEach((b, i) => {
      const bx = margin + i * (boxW + 10);
      const by = y + 6;

      doc.setFillColor(...b.color);
      doc.roundedRect(bx, by, boxW, boxH, 6, 6, "F");
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(bx, by, boxW, boxH, 6, 6, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(17, 24, 39);
      doc.text(b.value, bx + boxW / 2, by + 28, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(b.label, bx + boxW / 2, by + 46, { align: "center" });
    });

    y += boxH + 26;

    // ─────────────────────────────────────────────
    // RISK ASSESSMENT SECTION
    // ─────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text("Risk Assessment Score", margin, y);
    y += 14;

    if (resolvedRisk) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);

      const scoreText = (resolvedRisk.score !== null && !isNaN(resolvedRisk.score))
        ? `Risk Score: ${resolvedRisk.score} / 100`
        : "Risk Score: N/A";

      doc.text(scoreText, margin, y);
      y += 6;

      drawRiskBar(doc, margin, y, pageW - margin * 2, resolvedRisk);
      y += 42;

      const baseC = resolvedRisk.rgb || [200,200,200];
      doc.setFillColor(...baseC.map(c => Math.min(255, c + 160)));
      doc.roundedRect(margin, y, pageW - margin * 2, 44, 6, 6, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...baseC);
      doc.text(`Patient Risk Level: ${resolvedRisk.label}`, pageW / 2, y + 16, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text("Scale: Low (0-33) | Moderate (34-66) | High (67-100)", pageW / 2, y + 33, { align: "center" });

      y += 60;
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("No risk assessment data available.", margin, y);
      y += 24;
    }

    // ─────────────────────────────────────────────
    // TEST HISTORY TABLE
    // ─────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text("Detailed Test History", margin, y);
    y += 8;

    const tableRows = totalTests > 0
      ? testArray.map((t, i) => {
          const d = t?.completed_at ? new Date(t.completed_at).toLocaleDateString() : "Unknown";
          const n = (t?.test_type || "Unknown").toString().replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
          const s = Number(t?.score) || 0;
          const ms = Number(t?.max_score) || 10;
          const p = t?.percentage ?? Math.round((s / ms) * 100);
          const er = Math.round((1 - s / ms) * 100);
          const rl = er < 34 ? "Low" : er < 67 ? "Moderate" : "High";
          return [(i + 1).toString(), d, n, `${s}/${ms}`, `${p}%`, rl];
        })
      : [["-", "-", "No tests recorded", "-", "-", "-"]];

    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        head: [["#", "Date", "Test Name", "Score", "Performance", "Est. Risk"]],
        body: tableRows,
        startY: y + 4,
        theme: "grid",
        styles:          { fontSize: 9, cellPadding: 4 },
        headStyles:      { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { halign: "center", cellWidth: 22 },
          5: { halign: "center" },
        },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            const val = data.cell.raw ? data.cell.raw.toString() : "";
            if (val === "Low")      data.cell.styles.textColor = [34, 197, 94];
            else if (val === "Moderate") data.cell.styles.textColor = [180, 130, 0];
            else if (val === "High")     data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = "bold";
          }
        }
      });
      y = doc.lastAutoTable.finalY + 20;
    } else {
      console.warn("doc.autoTable is not a function. Table skipped.");
      doc.text("Table plugin not loaded correctly.", margin, y + 20);
      y += 40;
    }

    // ─────────────────────────────────────────────
    // DISCLAIMER
    // ─────────────────────────────────────────────
    const disclaimerText =
      "This report is generated for tracking and informational purposes only. It is not a medical diagnosis. " +
      "Please consult a qualified healthcare professional for medical advice.";

    if (y + 70 > pageH - 30) {
      doc.addPage();
      y = 50;
    }

    const disclaimerY = Math.max(y + 20, pageH - 80);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, disclaimerY - 10, pageW - margin, disclaimerY - 10);
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin, disclaimerY - 4, pageW - margin * 2, 52, 4, 4, "F");
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(margin, disclaimerY - 4, pageW - margin * 2, 52, 4, 4, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text("Medical Disclaimer", margin + 10, disclaimerY + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(92, 55, 12);
    doc.text(disclaimerText, margin + 10, disclaimerY + 25, {
      maxWidth: pageW - margin * 2 - 20,
      lineHeightFactor: 1.5,
    });

    const safeN = userName.replace(/[^a-z0-9]/gi, '-');
    doc.save(`Patient-Report-${safeN}-${new Date().toISOString().slice(0, 10)}.pdf`);
    return true;
  } catch (error) {
    console.error("FATAL ERROR IN PDF UTILITY:", error);
    throw error;
  }
}
