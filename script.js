const textarea = document.getElementById("promptInput");
const charCount = document.querySelector(".char-count");
const summarizeBtn = document.getElementById("condenseBtn");
const elaborateBtn = document.getElementById("elaborateBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeToggleLabel = document.getElementById("themeToggleLabel");
const chatContainer = document.getElementById("chatContainer");
const emptyState = document.getElementById("emptyState");

const fileInput = document.getElementById("fileInput");
const attachBtn = document.getElementById("attachBtn");
const toggleCameraModalBtn = document.getElementById("toggleCameraModalBtn");
const cameraModal = document.getElementById("cameraModal");
const closeCameraBtn = document.getElementById("closeCameraBtn");

const cameraVideo = document.getElementById("cameraVideo");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const cameraStatus = document.getElementById("cameraStatus");
const captureBtn = document.getElementById("captureBtn");
const uploadImageBtn = document.getElementById("uploadImageBtn");
const toggleCameraBtn = document.getElementById("toggleCameraBtn");
const cameraImageInput = document.getElementById("cameraImageInput");
const workspace = document.getElementById("workspace");
const greetingTitle = document.getElementById("greetingTitle");
let cameraStream = null, typingAnimationId = 0, convertMode = "summarize";

const greetings = [
  "Ready to condense?",
  "What can I simplify for you today?",
  "Paste your text to begin.",
  "Let's make things brief.",
  "What are you working on?",
  "How can Brevify help?"
];

function randomizeGreeting() {
  if (greetingTitle) {
    greetingTitle.innerText = greetings[Math.floor(Math.random() * greetings.length)];
  }
}
randomizeGreeting();

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  if (themeToggleLabel) {
    themeToggleLabel.innerText = isDark ? "Light Mode" : "Dark Mode";
  }
  const themeIcon = document.getElementById("themeIcon");
  if (themeIcon) {
    themeIcon.innerHTML = isDark
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  }
}
applyTheme(localStorage.getItem("brevify-theme") || "dark"); // Default to dark for chat look
themeToggleBtn.addEventListener("click", () => {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("brevify-theme", next);
});

function updateWordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  charCount.innerText = `${words} words`;
}
textarea.addEventListener("input", () => {
  updateWordCount(textarea.value);
  // Auto resize textarea
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
});

attachBtn.addEventListener("click", () => fileInput.click());
toggleCameraModalBtn.addEventListener("click", () => {
  cameraModal.style.display = "flex";
  startCamera();
});
closeCameraBtn.addEventListener("click", () => {
  cameraModal.style.display = "none";
  stopCamera();
});

function addMessage(role, content) {
  emptyState.style.display = "none";
  if (workspace) workspace.classList.remove("is-empty");
  
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${role}-message`;
  
  if (role === "assistant") {
    msgDiv.innerHTML = `
      <div class="message-card">
        <div class="response-toolbar">
          <button class="ctrl-btn copy-btn" title="Copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy</button>
          <button class="ctrl-btn edit-btn" title="Edit Mode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Edit</button>
          <button class="ctrl-btn action-btn" data-action="elaborate" title="Elaborate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg> Elaborate</button>
          <button class="ctrl-btn action-btn" data-action="shorten" title="Shorten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg> Shorten</button>
          <select class="ctrl-select action-select" data-action="tone" title="Change Tone">
            <option value="" disabled selected>Tone</option>
            <option value="Professional">Professional</option>
            <option value="Casual">Casual</option>
            <option value="Formal">Formal</option>
            <option value="Simple">Simple</option>
          </select>
          <select class="ctrl-select action-select" data-action="format" title="Convert To">
            <option value="" disabled selected>Format</option>
            <option value="Bullet points">Bullet Points</option>
            <option value="Paragraph">Paragraph</option>
          </select>
          <select class="ctrl-select action-select" data-action="language" title="Language">
            <option value="" disabled selected>Lang</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Spanish">Spanish</option>
          </select>
          <button class="ctrl-btn action-btn" data-action="regenerate" title="Regenerate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Regenerate</button>
          <span class="ai-refining-indicator" style="display:none;">AI refining...</span>
        </div>
        <div class="message-content" contenteditable="false"></div>
      </div>
    `;
    const contentEl = msgDiv.querySelector(".message-content");
    contentEl.innerHTML = content;
    setupMessageControls(msgDiv, contentEl);
  } else {
    msgDiv.innerText = content;
  }
  
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return role === "assistant" ? msgDiv.querySelector(".message-content") : msgDiv;
}

function setupMessageControls(card, contentEl) {
  const copyBtn = card.querySelector(".copy-btn");
  const editBtn = card.querySelector(".edit-btn");
  const actionBtns = card.querySelectorAll(".action-btn");
  const actionSelects = card.querySelectorAll(".action-select");
  const indicator = card.querySelector(".ai-refining-indicator");
  const toolbar = card.querySelector(".response-toolbar");

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(contentEl.innerText);
      copyBtn.classList.add("copy-success");
      copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied`;
      setTimeout(() => {
        copyBtn.classList.remove("copy-success");
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
      }, 2000);
    } catch(err) { alert("Failed to copy!"); }
  });

  editBtn.addEventListener("click", () => {
    const isEditing = contentEl.getAttribute("contenteditable") === "true";
    if (isEditing) {
      contentEl.setAttribute("contenteditable", "false");
      editBtn.style.color = "";
    } else {
      contentEl.setAttribute("contenteditable", "true");
      contentEl.focus();
      editBtn.style.color = "#8b5cf6";
    }
  });

  const handleRefine = async (action, value) => {
    const currentText = contentEl.innerText.trim();
    if (!currentText) return;

    toolbar.style.pointerEvents = "none";
    contentEl.classList.add("updating");
    indicator.style.display = "flex";

    try {
      const res = await fetch("/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentText, action, value })
      });
      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch(e) {}
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}. Did you restart the node server?`);
      
      contentEl.classList.remove("updating");
      await typeTextInElement(contentEl, data.refinedText);
    } catch(err) {
      contentEl.classList.remove("updating");
      alert("Refinement failed: " + err.message);
    } finally {
      indicator.style.display = "none";
      toolbar.style.pointerEvents = "auto";
      actionSelects.forEach(sel => sel.selectedIndex = 0);
    }
  };

  actionBtns.forEach(btn => btn.addEventListener("click", () => handleRefine(btn.dataset.action, "")));
  actionSelects.forEach(sel => sel.addEventListener("change", (e) => {
    if(e.target.value) handleRefine(sel.dataset.action, e.target.value);
  }));
}

async function typeTextInElement(element, full) {
  const id = ++typingAnimationId;
  const tokens = full ? full.split(/(\s+)/) : [];
  element.textContent = "";
  if (!tokens.length) return;
  const delay = tokens.length > 240 ? 2 : 8; // Drastically reduced delay for faster typing
  for (const token of tokens) {
    if (id !== typingAnimationId) return;
    element.textContent += token;
    chatContainer.scrollTop = chatContainer.scrollHeight;
    if (!/^\s+$/.test(token)) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (file.type === "text/plain") {
    const r = new FileReader();
    r.onload = e => {
      textarea.value = e.target.result;
      updateWordCount(textarea.value);
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    };
    r.readAsText(file);
    return;
  }
  if (file.type === "application/pdf") {
    const fd = new FormData();
    fd.append("file", file);
    fetch("/extract-pdf", { method: "POST", body: fd })
      .then(r => r.json())
      .then(d => {
        if (!d.text) throw new Error();
        textarea.value = d.text.trim();
        updateWordCount(textarea.value);
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
      })
      .catch(() => alert("PDF extraction failed. Make sure server is running!"));
    return;
  }
  alert("Only .txt and .pdf files are supported!");
});

function setCameraStatus(m) { if (cameraStatus) cameraStatus.innerText = m; }
function updateCameraUi(run) {
  if (cameraVideo) cameraVideo.style.display = run ? "block" : "none";
  if (cameraPlaceholder) cameraPlaceholder.style.display = run ? "none" : "flex";
  if (captureBtn) captureBtn.disabled = !run;
}
async function extractTextFromImageFile(file) {
  if (!window.Tesseract) throw new Error("OCR engine not loaded.");
  const result = await window.Tesseract.recognize(file, "eng", {
    logger: m => { if (m?.status === "recognizing text") setCameraStatus(`Scanning... ${Math.round((m.progress || 0) * 100)}%`); }
  });
  const text = (result?.data?.text || "").trim();
  if (!text) throw new Error("Could not detect readable text from image");
  return text;
}
async function startCamera() {
  if (cameraStream) return updateCameraUi(true);
  if (!navigator.mediaDevices?.getUserMedia) return alert("Camera is not supported in this browser.");
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    cameraVideo.srcObject = cameraStream;
    updateCameraUi(true);
    setCameraStatus("Camera live. Tap shutter to extract text.");
  } catch { alert("Could not access camera. Please allow permission."); }
}
function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
  cameraStream = null;
  if (cameraVideo) cameraVideo.srcObject = null;
  updateCameraUi(false);
  setCameraStatus("Camera stopped.");
}
async function captureAndExtract() {
  if (!cameraStream) await startCamera();
  if (!cameraStream) return;
  if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) return alert("Camera is still loading. Try again.");
  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  cameraCanvas.getContext("2d").drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
  setCameraStatus("Scanning text from frame...");
  cameraCanvas.toBlob(async blob => {
    try {
      const f = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
      const text = await extractTextFromImageFile(f);
      textarea.value = text;
      updateWordCount(text);
      cameraModal.style.display = "none";
      stopCamera();
    } catch (err) {
      setCameraStatus("Extraction failed.");
      alert(`OCR failed: ${err.message}`);
    }
  }, "image/jpeg", 0.92);
}
captureBtn?.addEventListener("click", captureAndExtract);
uploadImageBtn?.addEventListener("click", () => cameraImageInput.click());
toggleCameraBtn?.addEventListener("click", () => cameraStream ? stopCamera() : startCamera());
cameraImageInput?.addEventListener("change", async () => {
  const file = cameraImageInput.files[0];
  if (!file) return;
  setCameraStatus("Scanning text from image...");
  try {
    const text = await extractTextFromImageFile(file);
    textarea.value = text;
    updateWordCount(text);
    cameraModal.style.display = "none";
    stopCamera();
  } catch (err) {
    setCameraStatus("Extraction failed.");
    alert(`OCR failed: ${err.message}`);
  } finally {
    cameraImageInput.value = "";
  }
});
updateCameraUi(false);
updateWordCount("");

async function processText(mode) {
  const text = textarea.value.trim();
  if (!text) return alert("Enter some text first!");
  
  const outputLength = document.getElementById("lengthOption").value;
  const language = document.getElementById("languageOption").value;
  const focusOn = document.getElementById("focusOption").value;
  
  // Clear input
  textarea.value = "";
  textarea.style.height = 'auto';
  updateWordCount("");
  
  // Add user message
  addMessage("user", text);
  
  // Add assistant placeholder with AI loader
  const loaderHtml = `<div class="ai-loader"><span></span><span></span><span></span></div>`;
  const responseEl = addMessage("assistant", loaderHtml);
  
  summarizeBtn.disabled = true;
  elaborateBtn.disabled = true;
  
  try {
    const endpoint = mode === "summarize" ? "/summarize" : "/elaborate";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, outputLength, language, focusOn })
    });
    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : {};
    if (!response.ok) throw new Error(data.error || `Request failed with status ${response.status}`);
    const result = mode === "summarize" ? (data.summary || "No summary available") : (data.elaboratedText || "No elaborated text available");
    await typeTextInElement(responseEl, result);
  } catch (err) {
    responseEl.innerText = `Error: ${err.message}`;
  } finally {
    summarizeBtn.disabled = false;
    elaborateBtn.disabled = false;
  }
}

summarizeBtn.addEventListener("click", () => processText("summarize"));
elaborateBtn.addEventListener("click", () => processText("elaborate"));
