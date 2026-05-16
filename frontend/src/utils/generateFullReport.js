// FRONTEND/src/utils/generateFullReport.js

import jsPDF from "jspdf";

import html2canvas from "html2canvas";

import "jspdf-autotable";



/**

 * Generate a full multi-page report of all test results

 */

export async function generateFullReportPDF({ user, tests, risk, chartRef }) {

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();

  const now = new Date().toLocaleDateString();



  // Header

  doc.setFillColor(37, 99, 235);

  doc.rect(0, 0, pageW, 60, "F");

  doc.setFont("helvetica", "bold");

  doc.setFontSize(18);

  doc.setTextColor(255, 255, 255);

  doc.text("🧠 Dementia Tracker – Cognitive Performance Report", 40, 38);

  doc.setFontSize(10);

  doc.text(`Generated: ${now}`, pageW - 150, 45);



  let y = 100;

  doc.setTextColor(17, 24, 39);

  doc.setFontSize(14);

  doc.text("User Summary", 40, y);



  y += 20;

  doc.setFontSize(11);

  // Get user name - handle both formats
  let userName = "N/A";
  if (user?.name) {
    userName = user.name;
  } else if (user?.first_name || user?.last_name) {
    userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || "N/A";
  }

  doc.text(`Name: ${userName}`, 40, y);

  doc.text(`Age: ${user?.age || "N/A"}`, 180, y);

  doc.text(`Gender: ${user?.gender || "N/A"}`, 280, y);



  y += 30;

  doc.setFontSize(11);

  // Calculate average score (normalized to 0-10 scale)
  const avg = tests?.length > 0 
    ? (tests.reduce((a, t) => {
        // Handle both score/max_score format and direct score format
        const score = t.score || 0;
        const maxScore = t.max_score || 10;
        const normalizedScore = (score / maxScore) * 10;
        return a + normalizedScore;
      }, 0) / tests.length).toFixed(1)
    : 0;

  const riskColor =

    risk?.category === "Low"

      ? [34, 197, 94]

      : risk?.category === "Moderate"

      ? [234, 179, 8]

      : [239, 68, 68];

  doc.text(`Total Tests: ${tests?.length || 0}`, 40, y);

  doc.text(`Average Score: ${avg}/10`, 180, y);

  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);

  doc.text(`Current Risk: ${risk?.category || "N/A"}`, 340, y);

  doc.setTextColor(17, 24, 39);



  // Chart snapshot (optional)

  if (chartRef?.current) {

    try {

      const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: "#fff" });

      const imgData = canvas.toDataURL("image/png");

      y += 40;

      doc.addImage(imgData, "PNG", 40, y, pageW - 80, 200);

      y += 220;

    } catch (error) {

      console.error("Error capturing chart:", error);

      // Continue without chart if capture fails

    }

  }



  // Table

  doc.setFontSize(14);

  doc.text("Detailed Test History", 40, y);

  y += 10;

  const rows =

    tests?.length > 0

      ? tests.map((t) => {

          // Handle different date field names
          const completionDate = t.completed_at || t.completionDate || new Date();
          
          // Handle different test type/name fields
          const testName = t.test_type || t.testType || t.testName || "-";
          
          // Calculate score (normalized to 0-10)
          const score = t.score || 0;
          const maxScore = t.max_score || 10;
          const normalizedScore = (score / maxScore) * 10;
          
          // Calculate percentage
          const percent = Math.round(normalizedScore * 10);
          
          // Calculate estimated risk
          const estRisk = Math.round((1 - normalizedScore / 10) * 100);

          return [

            new Date(completionDate).toLocaleDateString(),

            testName,

            normalizedScore.toFixed(1),

            `${percent}%`,

            `${estRisk}%`,

          ];

        })

      : [["–", "No tests available", "–", "–", "–"]];



  doc.autoTable({

    head: [["Date", "Test", "Score (/10)", "Percent", "Est. Risk (%)"]],

    body: rows,

    startY: y + 10,

    theme: "grid",

    styles: { fontSize: 10, cellPadding: 4 },

    headStyles: { fillColor: [37, 99, 235], textColor: 255 },

    alternateRowStyles: { fillColor: [249, 250, 251] },

    margin: { left: 40, right: 40 },

  });



  const endY = doc.lastAutoTable.finalY + 30;



  doc.setFontSize(11);

  doc.text("Insights", 40, endY);

  let insight =

    avg > 8

      ? "Excellent cognitive performance; continue current lifestyle."

      : avg > 5

      ? "Moderate performance; maintain regular assessments."

      : "Decline detected; consider medical consultation.";

  doc.text(insight, 60, endY + 20, { maxWidth: pageW - 100 });



  doc.setFontSize(9);

  doc.setTextColor(107, 114, 128);

  doc.text(

    "Disclaimer: This report provides indicative cognitive metrics and is not a medical diagnosis.",

    40,

    800

  );



  doc.save(`Cognitive-Report-${userName.replace(/\s+/g, '-')}.pdf`);

}
