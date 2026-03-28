// FRONTEND/src/utils/generateRiskReport.js

import jsPDF from "jspdf";

import "jspdf-autotable";



/**

 * Generate a 1-page personalized Risk Evaluation report

 */

export async function generateRiskReportPDF({ user, formData, riskScore, category }) {

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();

  const now = new Date().toLocaleDateString();



  // Header

  doc.setFillColor(37, 99, 235);

  doc.rect(0, 0, pageW, 60, "F");

  doc.setFont("helvetica", "bold");

  doc.setFontSize(18);

  doc.setTextColor(255, 255, 255);

  doc.text("🧠 Dementia Tracker – Risk Evaluation Report", 40, 38);



  // Meta

  doc.setFontSize(10);

  doc.setTextColor(255, 255, 255);

  doc.text(`Generated: ${now}`, pageW - 150, 45);



  let y = 100;

  doc.setTextColor(17, 24, 39);

  doc.setFontSize(14);

  doc.text("User Information", 40, y);



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

  doc.text(`Age: ${user?.age || "N/A"}`, 200, y);

  doc.text(`Gender: ${user?.gender || "N/A"}`, 320, y);



  // Risk summary

  y += 40;

  doc.setFontSize(14);

  doc.text("Assessment Summary", 40, y);



  y += 25;

  const color =

    category === "Low" ? [34, 197, 94] : category === "Moderate" ? [234, 179, 8] : [239, 68, 68];

  doc.setTextColor(color[0], color[1], color[2]);

  doc.setFontSize(28);

  doc.text(`${Math.round(riskScore)}%  (${category})`, 40, y);

  doc.setTextColor(55, 65, 81);



  // Factors

  y += 50;

  doc.setFontSize(14);

  doc.text("Contributing Factors", 40, y);

  y += 15;

  const answers = Object.entries(formData || {});

  answers.forEach(([k, v]) => {

    doc.setFontSize(11);

    // Format key names nicely
    const formattedKey = k.replace(/([A-Z])/g, " $1").replace(/^\w/, c => c.toUpperCase());
    doc.text(`${formattedKey}: ${v}`, 60, (y += 18));

  });



  // Recommendations

  y += 30;

  doc.setFontSize(14);

  doc.text("Recommendations", 40, y);

  y += 20;

  doc.setFontSize(11);

  let msg =

    category === "Low"

      ? "Maintain healthy habits and regular cognitive engagement."

      : category === "Moderate"

      ? "Monitor your memory monthly and stay mentally active."

      : "Consult a healthcare professional for early evaluation.";

  doc.text(msg, 60, y, { maxWidth: pageW - 100 });



  // Footer disclaimer

  doc.setFontSize(9);

  doc.setTextColor(107, 114, 128);

  doc.text(

    "Disclaimer: This report provides indicative dementia-risk metrics and is not a clinical diagnosis.",

    40,

    800

  );



  doc.save(`Risk-Report-${userName.replace(/\s+/g, '-')}.pdf`);

}
