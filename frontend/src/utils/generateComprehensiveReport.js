import jsPDF from "jspdf";



/**

 * Generate a formal Dementia Assessment Report PDF for all test results

 * Compatible with browser and ES modules

 */

export function generateComprehensivePDFReport(userProfile = {}, testResults = [], options = {}) {

  try {

    const pdf = new jsPDF("p", "pt", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();

    const margin = 40;

    let y = 50;



    // ===== Header =====

    const clinicName = options.clinicName || "Cognitive Health Assessment Center";

    pdf.setFont("helvetica", "bold");

    pdf.setFontSize(18);

    pdf.setTextColor(44, 62, 80);

    pdf.text(clinicName, pageWidth / 2, y, { align: "center" });



    y += 25;

    pdf.setFontSize(14);

    pdf.text("Dementia Assessment Report", pageWidth / 2, y, { align: "center" });



    // ===== Patient Info =====

    y += 40;

    pdf.setFontSize(12);

    pdf.setTextColor(0, 0, 0);

    pdf.setFont("helvetica", "bold");

    pdf.text("Patient Details:", margin, y);

    pdf.setFont("helvetica", "normal");



    y += 20;

    // Get user name - handle both formats
    let userName = "Unknown";
    if (userProfile?.name) {
      userName = userProfile.name;
    } else if (userProfile?.first_name || userProfile?.last_name) {
      userName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || "Unknown";
    }

    pdf.text(`Name: ${userName}`, margin, y);

    y += 18;

    pdf.text(`Date of Assessment: ${new Date().toLocaleDateString()}`, margin, y);



    // ===== Tests Conducted =====

    y += 30;

    pdf.setFont("helvetica", "bold");

    pdf.text("Tests Conducted:", margin, y);

    y += 15;



    const header = ["Sr.", "Test Name", "Score", "Max Score", "Remarks"];

    const rows = [];



    // Convert your test result data

    const maxScore = 10;

    let totalScore = 0;



    testResults.forEach((test, i) => {

      // Handle different test name fields
      const name = test.test_type || test.testName || "Unknown Test";
      
      // Get score - handle both score/max_score format
      const score = Number(test.score) || 0;
      const testMaxScore = Number(test.max_score) || maxScore;
      
      // Normalize score to 0-10 scale if needed
      const normalizedScore = testMaxScore === 10 ? score : (score / testMaxScore) * 10;
      
      totalScore += normalizedScore;

      let remarks = "—";

      const percent = (normalizedScore / maxScore) * 100;

      if (percent >= 90) remarks = "Excellent";

      else if (percent >= 75) remarks = "Good";

      else if (percent >= 50) remarks = "Fair";

      else remarks = "Needs Improvement";

      // Format test name nicely
      const formattedName = name
        .replace(/_/g, " ")
        .replace(/\b\w/g, l => l.toUpperCase());

      rows.push([

        (i + 1).toString(),

        formattedName,

        normalizedScore.toFixed(1),

        maxScore.toString(),

        remarks,

      ]);

    });



    if (rows.length === 0) {

      rows.push(["—", "No Test Data", "—", "—", "—"]);

    }



    // Manual table drawing (no autoTable dependency)

    const colWidths = [30, 200, 80, 80, 120];

    const tableX = margin;

    const startY = y + 10;



    pdf.setFontSize(11);

    pdf.setFillColor(37, 99, 235);

    pdf.setTextColor(255, 255, 255);

    pdf.rect(tableX, startY - 12, pageWidth - margin * 2, 20, "F");



    let colX = tableX + 5;

    header.forEach((h, i) => {

      pdf.text(h, colX, startY);

      colX += colWidths[i];

    });



    y = startY + 10;

    pdf.setTextColor(44, 62, 80);



    rows.forEach((r, idx) => {

      if (y > 750) {

        pdf.addPage();

        y = 60;

      }

      if (idx % 2 === 0) {

        pdf.setFillColor(245, 247, 250);

        pdf.rect(tableX, y - 10, pageWidth - margin * 2, 20, "F");

      }

      let cellX = tableX + 5;

      r.forEach((cell, i) => {

        pdf.text(String(cell), cellX, y);

        cellX += colWidths[i];

      });

      y += 20;

    });



    // ===== Total Score =====

    const avgScore = Math.round((totalScore / (rows.length * maxScore)) * 100) || 0;

    y += 15;

    pdf.setFont("helvetica", "bold");

    pdf.text("Total Score:", margin, y);

    pdf.setFont("helvetica", "normal");

    pdf.text(`${avgScore} / 100`, margin + 80, y);



    // ===== Interpretation =====

    y += 25;

    pdf.setFont("helvetica", "bold");

    pdf.text("Interpretation:", margin, y);

    pdf.setFont("helvetica", "normal");

    y += 15;

    pdf.text("• 90–100: Normal cognitive function", margin + 10, y);

    y += 15;

    pdf.text("• 75–89: Mild cognitive impairment", margin + 10, y);

    y += 15;

    pdf.text("• 50–74: Moderate cognitive impairment", margin + 10, y);

    y += 15;

    pdf.text("• Below 50: Severe cognitive impairment", margin + 10, y);



    // ===== Recommendations =====

    y += 30;

    pdf.setFont("helvetica", "bold");

    pdf.text("Recommendations:", margin, y);

    pdf.setFont("helvetica", "normal");

    y += 15;

    [

      "Consult a neurologist or geriatric specialist for further evaluation.",

      "Maintain a healthy diet rich in omega-3, antioxidants, and vitamins.",

      "Engage in regular physical and cognitive activities (puzzles, reading).",

      "Ensure adequate sleep and stress management.",

      "Follow up as advised by your doctor.",

    ].forEach((r) => {

      pdf.text(`• ${r}`, margin + 10, y);

      y += 15;

    });



    // ===== Footer =====

    pdf.setFontSize(9);

    pdf.setTextColor(100);

    pdf.setFont("helvetica", "italic");

    pdf.text(

      "This report is for informational purposes only and is not a medical diagnosis.",

      margin,

      800

    );



    // Save PDF with proper filename
    const fileName = `Dementia_Assessment_${userName.replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);

  } catch (err) {

    console.error("PDF generation failed:", err);

    alert("Failed to generate report. Check console for details.");

  }

}
