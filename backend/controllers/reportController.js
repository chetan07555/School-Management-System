const PDFDocument = require("pdfkit");

exports.generateReport = (req, res) => {
  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  doc.text("Student Report");
  doc.text("Marks and Attendance");

  doc.end();
};