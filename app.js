const $ = (id) => document.getElementById(id);
let students = [];

$("today").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
async function loadStudents() {
  try {
    students = await api("/api/students");
    render();
  } catch (error) {
    $("studentTable").innerHTML = `<tr><td colspan="7" class="empty">Could not connect to backend. Please start the server.</td></tr>`;
    showToast(error.message);
  }
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
}
function render() {
  const query = $("searchInput").value.trim().toLowerCase();
  const filtered = students.filter(s => `${s.name} ${s.department} ${s.year}`.toLowerCase().includes(query));
  $("totalCount").textContent = students.length;
  $("presentCount").textContent = students.filter(s => s.status === "Present").length;
  $("absentCount").textContent = students.filter(s => s.status === "Absent").length;
  const avg = students.length ? Math.round(students.reduce((sum, s) => sum + Number(s.marks), 0) / students.length) : 0;
  $("averageMarks").textContent = `${avg}%`;
  $("recordCount").textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;
  if (!filtered.length) {
    $("studentTable").innerHTML = `<tr><td colspan="7" class="empty">${students.length ? "No matching students found." : "No student records yet. Click “Add Student” to begin."}</td></tr>`;
    return;
  }
  $("studentTable").innerHTML = filtered.map(s => `
    <tr>
      <td><div class="student-cell"><span class="student-avatar">${escapeHtml(initials(s.name))}</span><span>${escapeHtml(s.name)}</span></div></td>
      <td>${escapeHtml(s.department)}</td><td>${escapeHtml(s.year)}</td>
      <td class="progress-cell"><div class="progress-label"><span>${s.attendance}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${s.attendance}%"></div></div></td>
      <td class="marks">${s.marks}%</td><td><span class="status ${s.status}">${s.status}</span></td>
      <td><div class="actions"><button class="small-btn" data-edit="${s.id}">Edit</button><button class="small-btn delete" data-delete="${s.id}">Delete</button></div></td>
    </tr>`).join("");
  document.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => openModal(Number(btn.dataset.edit))));
  document.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => deleteStudent(Number(btn.dataset.delete))));
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function openModal(id = null) {
  $("studentForm").reset();
  $("formError").textContent = "";
  $("studentId").value = "";
  $("modalTitle").textContent = id ? "Edit Student" : "Add Student";
  if (id) {
    const s = students.find(item => item.id === id);
    if (!s) return;
    $("studentId").value = s.id;
    $("name").value = s.name;
    $("department").value = s.department;
    $("year").value = s.year;
    $("attendance").value = s.attendance;
    $("marks").value = s.marks;
    $("status").value = s.status;
  } else {
    $("attendance").value = 0;
    $("marks").value = 0;
    $("status").value = "Present";
  }
  $("modalBackdrop").hidden = false;
  $("name").focus();
}
function closeModal() { $("modalBackdrop").hidden = true; }
function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}
async function deleteStudent(id) {
  const student = students.find(s => s.id === id);
  if (!student || !confirm(`Delete ${student.name}'s record?`)) return;
  try {
    await api(`/api/students/${id}`, { method: "DELETE" });
    await loadStudents();
    showToast("Student record deleted.");
  } catch (error) { showToast(error.message); }
}
$("addStudentBtn").addEventListener("click", () => openModal());
$("closeModal").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);
$("modalBackdrop").addEventListener("click", event => { if (event.target === $("modalBackdrop")) closeModal(); });
$("searchInput").addEventListener("input", render);
$("studentForm").addEventListener("submit", async event => {
  event.preventDefault();
  const id = $("studentId").value;
  const payload = {
    name: $("name").value,
    department: $("department").value,
    year: $("year").value,
    attendance: Number($("attendance").value),
    marks: Number($("marks").value),
    status: $("status").value
  };
  try {
    await api(id ? `/api/students/${id}` : "/api/students", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    closeModal();
    await loadStudents();
    showToast(id ? "Student record updated." : "Student added successfully.");
  } catch (error) { $("formError").textContent = error.message; }
});
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });
loadStudents();