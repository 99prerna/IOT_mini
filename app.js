// Configuration
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4olJtqgvwwDUrGKVKagYtlnsBjMkFJUJvNpxc4jeKwhPX-k9Wh84S4onRYjJ3mQXoYzur_J6i1qBe/pub?output=csv";
let students = [];
let isOnline = true;

// DOM Elements
const tableBody = document.getElementById("tableBody");
const presentCount = document.getElementById("presentCount");
const absentCount = document.getElementById("absentCount");
const lastUpdated = document.getElementById("lastUpdated");
const refreshBtn = document.getElementById("refreshBtn");
const searchInput = document.querySelector(".search-box input");
const notificationCenter = document.getElementById("notificationCenter");

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  // Load data immediately
  fetchData();

  // Set up auto-refresh every 3 seconds
  setInterval(fetchData, 3000);

  // Set up event listeners
  refreshBtn.addEventListener("click", () => {
    refreshBtn.classList.add("refreshing");
    fetchData();
    setTimeout(() => {
      refreshBtn.classList.remove("refreshing");
    }, 1000);
  });

  searchInput.addEventListener("input", filterStudents);
});

// Main data fetching function
async function fetchData() {
  try {
    showNotification("Syncing with Google Sheets...", "info");
    lastUpdated.textContent = "Last sync: Updating...";

    const response = await fetch(`${SHEET_URL}&t=${Date.now()}`);
    if (!response.ok) throw new Error("Network error");

    const csvData = await response.text();
    const newStudents = processCSV(csvData);

    if (JSON.stringify(students) !== JSON.stringify(newStudents)) {
      students = newStudents;
      updateUI();
      showNotification("Attendance data updated!", "success");
    }

    isOnline = true;
    updateStatus(true);
  } catch (error) {
    console.error("Fetch error:", error);
    isOnline = false;
    updateStatus(false);

    // Try to load from localStorage
    const savedData = localStorage.getItem("attendanceData");
    if (savedData) {
      students = JSON.parse(savedData);
      updateUI();
      showNotification("Using offline data", "warning");
    } else {
      showNotification("Connection failed - no data available", "error");
    }
  }
}

// Process CSV data from Google Sheets
function processCSV(csv) {
  const rows = csv.split("\n").filter((row) => row.trim() !== "");
  const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());

  const processed = rows.slice(1).map((row) => {
    const values = row.split(",");
    return {
      uid: values[0]?.trim() || "",
      name: values[1]?.trim() || "",
      contact: values[2]?.trim() || "",
      attendance: values[3]?.trim().toLowerCase() || "absent",
    };
  });

  // Save to localStorage
  localStorage.setItem("attendanceData", JSON.stringify(processed));
  lastUpdated.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;

  return processed;
}

// Update the UI with current data
function updateUI() {
  // Update counts
  const present = students.filter((s) => s.attendance === "present").length;
  const absent = students.length - present;

  presentCount.textContent = present;
  absentCount.textContent = absent;

  // Update table
  renderTable(students);
}

// Render the student table
function renderTable(data) {
  tableBody.innerHTML = data
    .map(
      (student) => `
        <tr class="${student.attendance}">
            <td>${student.uid}</td>
            <td>
                <div class="student-info">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
                      student.name
                    )}&background=random" alt="${student.name}">
                    <span>${student.name}</span>
                </div>
            </td>
            <td>${student.contact}</td>
            <td>
                <span class="status-badge ${student.attendance}">
                    ${student.attendance === "present" ? "Present" : "Absent"}
                </span>
            </td>
            <td>
                <button class="action-btn edit-btn" data-uid="${student.uid}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-uid="${student.uid}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `
    )
    .join("");

  // Add event listeners to action buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const uid = e.currentTarget.getAttribute("data-uid");
      editStudent(uid);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const uid = e.currentTarget.getAttribute("data-uid");
      deleteStudent(uid);
    });
  });
}

// Filter students based on search input
function filterStudents() {
  const searchTerm = searchInput.value.toLowerCase();
  const filtered = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm) ||
      student.uid.toLowerCase().includes(searchTerm) ||
      student.contact.includes(searchTerm)
  );
  renderTable(filtered);
}

// Edit student function
function editStudent(uid) {
  const student = students.find((s) => s.uid === uid);
  if (!student) return;

  showNotification(`Editing ${student.name}`, "info");
  // In a real app, you would open a modal here
  console.log("Editing student:", student);
}

// Delete student function
function deleteStudent(uid) {
  if (confirm("Are you sure you want to delete this student?")) {
    students = students.filter((s) => s.uid !== uid);
    localStorage.setItem("attendanceData", JSON.stringify(students));
    updateUI();
    showNotification("Student deleted", "success");
  }
}

// Update connection status
function updateStatus(online) {
  const statusElement = document.querySelector("#statusIndicator");
  if (online) {
    statusElement.innerHTML =
      '<i class="fas fa-circle" style="color: var(--success)"></i> Online';
  } else {
    statusElement.innerHTML =
      '<i class="fas fa-circle" style="color: var(--danger)"></i> Offline';
  }
}

// Notification system
function showNotification(message, type) {
  const notification = document.createElement("div");
  notification.className = `notification ${type} show`;
  notification.innerHTML = `
        <i class="fas ${
          type === "success"
            ? "fa-check-circle"
            : type === "error"
            ? "fa-exclamation-circle"
            : type === "warning"
            ? "fa-exclamation-triangle"
            : "fa-info-circle"
        }"></i>
        <span>${message}</span>
        <button class="close-btn">&times;</button>
    `;

  notification.querySelector(".close-btn").addEventListener("click", () => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  });

  notificationCenter.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Export button functionality
document.getElementById("exportBtn").addEventListener("click", () => {
  if (!students.length) {
    showNotification("No data to export", "warning");
    return;
  }

  let csv = "UID,Name,Contact,Attendance\n";
  students.forEach((student) => {
    csv += `${student.uid},${student.name},${student.contact},${student.attendance}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute(
    "download",
    `attendance_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showNotification("Data exported successfully", "success");
});
