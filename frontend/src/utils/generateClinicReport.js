// FRONTEND/src/utils/generateClinicReport.js

import jsPDF from "jspdf";

import "jspdf-autotable";



/**

 * Generates a formal Dementia Assessment Report PDF

 * for all cognitive tests taken by a patient.

 * 

 * Usage:

 * generateClinicReport({ user, tests })

 */

export function generateClinicReport({ user, tests }) {

  if (!user || !tests || tests.length === 0) {

    alert("No test data available to generate report.");

    return;

  }



  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();

  const marginX = 50;

  let y = 60;



  // HEADER

  doc.setFont("helvetica", "bold");

  doc.setFontSize(16);

  doc.text("[Clinic/Center Name & Logo]", marginX, y);

  y += 20;

  doc.setFontSize(14);

  doc.text("Dementia Assessment Report", marginX, y);

  y += 30;



  // PATIENT DETAILS

  // Get user name - handle both formats
  let userName = "___________________";
  if (user?.name) {
    userName = user.name;
  } else if (user?.first_name || user?.last_name) {
    userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || "___________________";
  }

  doc.setFont("helvetica", "bold");

  doc.setFontSize(12);

  doc.text("Patient Details:", marginX, y);

  doc.setFont("helvetica", "normal");

  y += 20;

  doc.text(`• Name: ${userName}`, marginX, y);

  y += 18;

  doc.text(`• Date of Assessment: ${new Date().toLocaleDateString()}`, marginX, y);

  y += 25;



  // TESTS TABLE

  doc.setFont("helvetica", "bold");

  doc.text("Tests Conducted:", marginX, y);

  y += 10;



  const tableBody = tests.map((t, i) => {

    // Handle different test name fields
    const testName = t.test_type || t.testType || t.testName || "—";
    
    // Calculate score (normalized to 0-10, then to 0-100 for display)
    const score = t.score || 0;
    const maxScore = t.max_score || 10;
    const normalizedScore = (score / maxScore) * 10; // Convert to 0-10 scale
    const displayScore = (normalizedScore * 10).toFixed(1); // Convert to 0-100 scale for display

    return [

      i + 1,

      testName,

      displayScore,

      100, // Max score is 100 in this format

      "__________________________",

    ];

  });



  doc.autoTable({

    startY: y + 15,

    head: [["Sr. No", "Test Name", "Score", "Max Score", "Remarks"]],

    body: tableBody,

    styles: { fontSize: 10, cellPadding: 4 },

    headStyles: { fillColor: [37, 99, 235], textColor: 255 },

    alternateRowStyles: { fillColor: [249, 250, 251] },

    margin: { left: marginX, right: marginX },

  });



  const finalY = doc.lastAutoTable.finalY + 25;



  // SCORE SUMMARY

  const avg =

    tests.length > 0

      ? ((tests.reduce((a, t) => {

          const score = t.score || 0;

          const maxScore = t.max_score || 10;

          const normalizedScore = (score / maxScore) * 10; // Convert to 0-10 scale

          return a + (normalizedScore * 10); // Convert to 0-100 scale

        }, 0) / tests.length)).toFixed(1)

      : 0;



  doc.setFont("helvetica", "bold");

  doc.setFontSize(12);

  doc.text("Total Score:", marginX, finalY);

  y = finalY + 18;

  doc.setFont("helvetica", "normal");

  doc.text(`• Average Score: ${avg} / 100`, marginX, y);

  y += 20;



  // INTERPRETATION

  doc.setFont("helvetica", "bold");

  doc.text("Interpretation:", marginX, y);

  y += 18;

  doc.setFont("helvetica", "normal");

  doc.setFontSize(11);

  doc.text("• 90–100: Normal cognitive function", marginX, y);

  y += 16;

  doc.text("• 75–89: Mild cognitive impairment", marginX, y);

  y += 16;

  doc.text("• 50–74: Moderate cognitive impairment", marginX, y);

  y += 16;

  doc.text("• Below 50: Severe cognitive impairment", marginX, y);

  y += 25;



  // RECOMMENDATIONS

  doc.setFont("helvetica", "bold");

  doc.setFontSize(12);

  doc.text("Recommendations:", marginX, y);

  y += 18;

  doc.setFont("helvetica", "normal");

  doc.setFontSize(11);

  const recs = [

    "Consult a neurologist or geriatric specialist for further evaluation.",

    "Maintain a healthy diet rich in omega-3, antioxidants, and vitamins.",

    "Engage in regular physical and cognitive activities (puzzles, reading).",

    "Ensure adequate sleep and stress management.",

    "Follow up as advised by your doctor.",

  ];

  recs.forEach((r) => {

    doc.text(`• ${r}`, marginX, (y += 16), { maxWidth: pageWidth - 100 });

  });



  // FOOTER

  doc.setFont("helvetica", "italic");

  doc.setFontSize(9);

  doc.setTextColor(120);

  doc.text(

    "This report provides indicative cognitive performance data and is not a medical diagnosis.",

    marginX,

    790

  );



  // SAVE

  doc.save(`Dementia-Assessment-${userName.replace(/\s+/g, '-')}.pdf`);

}

