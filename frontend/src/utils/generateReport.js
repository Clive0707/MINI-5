import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate a PDF assessment report for the user
 * @param {Object} user - User object with name and other details
 * @param {Array} testResults - Array of test results with test_type, score, max_score
 */
export const generateReport = (user, testResults) => {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Test name mapping
  const testNameMap = {
    'pattern_recognition': 'Pattern Recognition Test',
    'stroop': 'Stroop Test',
    'word_recall': 'Word Recall Test',
    'story_recall': 'Story Test'
  };
  
  // Get latest result for each test type
  const latestResults = {};
  testResults.forEach(result => {
    const testType = result.test_type;
    if (!latestResults[testType] || 
        new Date(result.completed_at) > new Date(latestResults[testType].completed_at)) {
      latestResults[testType] = result;
    }
  });
  
  // Prepare table data
  const tableData = [];
  const testOrder = ['pattern_recognition', 'stroop', 'word_recall', 'story_recall'];
  let totalScore = 0;
  let testsFound = 0;
  
  testOrder.forEach((testType, index) => {
    const result = latestResults[testType];
    if (result) {
      // Convert score from 0-10 scale to 0-25 scale for report
      const scaledScore = (result.score / result.max_score) * 25;
      totalScore += scaledScore;
      testsFound++;
      
      // Determine remarks based on percentage
      const percentage = (result.score / result.max_score) * 100;
      let remarks = '';
      if (percentage >= 90) {
        remarks = 'Excellent';
      } else if (percentage >= 75) {
        remarks = 'Good';
      } else if (percentage >= 50) {
        remarks = 'Fair';
      } else {
        remarks = 'Needs Improvement';
      }
      
      tableData.push([
        index + 1,
        testNameMap[testType] || testType,
        scaledScore.toFixed(1),
        '25',
        remarks
      ]);
    } else {
      // No result found for this test
      tableData.push([
        index + 1,
        testNameMap[testType] || testType,
        'N/A',
        '25',
        'Not Completed'
      ]);
    }
  });
  
  // Calculate average score
  const averageScore = testsFound > 0 ? (totalScore / testsFound) : 0;
  
  // Determine interpretation
  let interpretation = '';
  if (averageScore >= 90) {
    interpretation = 'Normal cognitive function';
  } else if (averageScore >= 75) {
    interpretation = 'Mild impairment';
  } else if (averageScore >= 50) {
    interpretation = 'Moderate impairment';
  } else {
    interpretation = 'Severe impairment';
  }
  
  // Set up PDF content
  let yPos = 20;
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Dementia Tracker – Assessment Report', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Patient Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Details:', 20, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  const userName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : (user?.name || 'N/A');
  doc.text(`• Name: ${userName}`, 25, yPos);
  yPos += 7;
  
  const assessmentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`• Date of Assessment: ${assessmentDate}`, 25, yPos);
  yPos += 15;
  
  // Tests Conducted Table
  doc.setFont('helvetica', 'bold');
  doc.text('Tests Conducted:', 20, yPos);
  yPos += 10;
  
  doc.autoTable({
    startY: yPos,
    head: [['Sr. No', 'Test Name', 'Score', 'Max Score', 'Remarks']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 70 },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { cellWidth: 45 }
    }
  });
  
  // Get the final Y position after the table
  yPos = doc.lastAutoTable.finalY + 15;
  
  // Total Score and Average Score
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Score: ${totalScore.toFixed(1)} / 100`, 20, yPos);
  yPos += 7;
  doc.text(`Average Score: ${averageScore.toFixed(1)} / 100`, 20, yPos);
  yPos += 10;
  
  // Interpretation
  doc.setFont('helvetica', 'bold');
  doc.text('Interpretation:', 20, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.text('• 90–100 → Normal cognitive function', 25, yPos);
  yPos += 6;
  doc.text('• 75–89 → Mild impairment', 25, yPos);
  yPos += 6;
  doc.text('• 50–74 → Moderate impairment', 25, yPos);
  yPos += 6;
  doc.text('• Below 50 → Severe impairment', 25, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'bold');
  if (averageScore >= 90) {
    doc.setTextColor(46, 204, 113);
  } else if (averageScore >= 75) {
    doc.setTextColor(243, 156, 18);
  } else {
    doc.setTextColor(231, 76, 60);
  }
  doc.text(`Current Assessment: ${interpretation}`, 20, yPos);
  doc.setTextColor(0, 0, 0); // Reset to black
  yPos += 15;
  
  // Recommendations
  doc.setFont('helvetica', 'bold');
  doc.text('Recommendations:', 20, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  const recommendations = [
    'Consult a neurologist or geriatric specialist.',
    'Maintain a healthy diet rich in omega-3 and antioxidants.',
    'Engage in regular exercise and cognitive activities.',
    'Manage stress and ensure adequate sleep.',
    'Follow up regularly as advised by your doctor.'
  ];
  
  recommendations.forEach((rec, index) => {
    doc.text(`• ${rec}`, 25, yPos);
    yPos += 6;
  });
  
  // Footer
  yPos = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('This report is generated by Dementia Tracker for educational and monitoring purposes only.', 105, yPos, { align: 'center' });
  yPos += 5;
  doc.text('It is not a substitute for professional medical advice. Please consult with healthcare providers.', 105, yPos, { align: 'center' });
  
  // Generate filename
  const username = userName.replace(/\s+/g, '_').toLowerCase();
  const filename = `${username}_assessment.pdf`;
  
  // Save the PDF
  doc.save(filename);
  
  return filename;
};

