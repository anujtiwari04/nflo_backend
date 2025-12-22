const path = require("path");
const fs = require("fs");

const getEbook = (req, res) => {
  // Define path to the secure file
  // Adjust filename 'course-book.pdf' if yours is different

  const filePath = path.join(__dirname, "../secure_docs/course-book.pdf");

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "eBook file not found on server." });
  }

  // Stream the file
  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Length": stat.size,
    // 'inline' means "show in browser", 'attachment' means "force download"
    "Content-Disposition": "inline; filename=course-book.pdf", 
  });

  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
};

module.exports = { getEbook };