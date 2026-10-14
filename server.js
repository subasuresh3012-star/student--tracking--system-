const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "students.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const starter = [
      { id: 1, name: "Asha R", department: "B.Sc CS", year: "II Year", attendance: 92, marks: 85, status: "Present" },
      { id: 2, name: "Bharathi S", department: "B.Com", year: "II Year", attendance: 88, marks: 78, status: "Present" },
      { id: 3, name: "Deepa K", department: "B.Sc Maths", year: "I Year", attendance: 76, marks: 68, status: "Absent" }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(starter, null, 2));
  }
}
function readStudents() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function writeStudents(students) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2));
}
function cleanStudent(body) {
  return {
    name: String(body.name || "").trim(),
    department: String(body.department || "").trim(),
    year: String(body.year || "").trim(),
    attendance: Number(body.attendance),
    marks: Number(body.marks),
    status: body.status === "Absent" ? "Absent" : "Present"
  };
}
function validate(student) {
  if (!student.name || !student.department || !student.year) return "Please fill in name, department, and year.";
  if (!Number.isFinite(student.attendance) || student.attendance < 0 || student.attendance > 100) return "Attendance must be between 0 and 100.";
  if (!Number.isFinite(student.marks) || student.marks < 0 || student.marks > 100) return "Marks must be between 0 and 100.";
  return null;
}

app.get("/api/students", (req, res) => res.json(readStudents()));

app.post("/api/students", (req, res) => {
  const student = cleanStudent(req.body);
  const error = validate(student);
  if (error) return res.status(400).json({ error });
  const students = readStudents();
  const nextId = students.reduce((max, s) => Math.max(max, s.id), 0) + 1;
  const created = { id: nextId, ...student };
  students.push(created);
  writeStudents(students);
  res.status(201).json(created);
});

app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const student = cleanStudent(req.body);
  const error = validate(student);
  if (error) return res.status(400).json({ error });
  const students = readStudents();
  const index = students.findIndex(s => s.id === id);
  if (index < 0) return res.status(404).json({ error: "Student not found." });
  students[index] = { id, ...student };
  writeStudents(students);
  res.json(students[index]);
});

app.delete("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const students = readStudents();
  const updated = students.filter(s => s.id !== id);
  if (updated.length === students.length) return res.status(404).json({ error: "Student not found." });
  writeStudents(updated);
  res.json({ success: true });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`Student Tracking System running at http://localhost:${PORT}`);
});