const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";
const MEMORIES_ENDPOINT = `${SUPABASE_URL}/rest/v1/memories`;
const VERIFY_ADMIN_ENDPOINT = `${SUPABASE_URL}/rest/v1/rpc/verify_admin_password`;
const DELETE_MEMORY_ENDPOINT = `${SUPABASE_URL}/rest/v1/rpc/delete_memory_with_password`;
const LIMIT = 280;

const form = document.getElementById("memory-form");
const input = document.getElementById("memory-input");
const submitBtn = document.getElementById("submit-btn");
const charCount = document.getElementById("char-count");
const statusText = document.getElementById("form-status");
const feed = document.getElementById("memory-feed");
const adminToggle = document.getElementById("admin-toggle");
const adminIndicator = document.getElementById("admin-indicator");

const state = {
  adminEnabled: false,
  adminPassword: ""
};

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra
  };
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(isoDate) {
  try {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return "Just now";
  }
}

function setAdminUi() {
  adminToggle.textContent = state.adminEnabled ? "Exit admin" : "Admin mode";
  adminIndicator.textContent = state.adminEnabled
    ? "Admin mode is on. Delete buttons are enabled."
    : "";
}

function cleanInput(raw) {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

async function verifyAdminPassword(password) {
  const response = await fetch(VERIFY_ADMIN_ENDPOINT, {
    method: "POST",
    headers: supabaseHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ admin_password: password })
  });

  if (!response.ok) {
    throw new Error("Admin verification failed");
  }

  const result = await response.json();
  return Boolean(result);
}

async function deleteMemory(memoryId) {
  if (!state.adminEnabled || !state.adminPassword) {
    adminIndicator.textContent = "Enable admin mode first.";
    return;
  }

  const confirmed = window.confirm("Delete this memory?");
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(DELETE_MEMORY_ENDPOINT, {
      method: "POST",
      headers: supabaseHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        memory_id: memoryId,
        admin_password: state.adminPassword
      })
    });

    if (!response.ok) {
      throw new Error("Delete failed");
    }

    const result = await response.json();
    if (!result) {
      adminIndicator.textContent = "Delete denied. Password may be incorrect.";
      return;
    }

    await loadMemories();
  } catch {
    adminIndicator.textContent = "Delete failed. Try again.";
  }
}

function renderFeed(items) {
  feed.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    const p = document.createElement("p");
    p.className = "feed-loading";
    p.textContent = "No memories yet. Be the first one.";
    feed.append(p);
    return;
  }

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "memory-item";

    const text = document.createElement("p");
    text.innerHTML = escapeHtml(item.text || "");

    const metaRow = document.createElement("div");
    metaRow.className = "memory-row";

    const meta = document.createElement("p");
    meta.className = "memory-meta";
    meta.textContent = formatDate(item.createdAt);

    metaRow.append(meta);

    if (state.adminEnabled) {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        deleteMemory(item.id);
      });
      metaRow.append(deleteBtn);
    }

    card.append(text, metaRow);
    feed.append(card);
  }
}

async function loadMemories() {
  feed.setAttribute("aria-busy", "true");

  if (!isConfigured()) {
    feed.innerHTML = "";
    const p = document.createElement("p");
    p.className = "feed-loading";
    p.textContent = "Set SUPABASE_URL and SUPABASE_ANON_KEY in config.js.";
    feed.append(p);
    feed.setAttribute("aria-busy", "false");
    return;
  }

  try {
    const response = await fetch(
      `${MEMORIES_ENDPOINT}?select=id,text,created_at&order=created_at.desc&limit=200`,
      {
        method: "GET",
        headers: supabaseHeaders()
      }
    );

    if (!response.ok) {
      throw new Error("Could not load memories");
    }

    const payload = await response.json();
    const items = payload.map((row) => ({
      id: row.id,
      text: row.text,
      createdAt: row.created_at
    }));
    renderFeed(items);
  } catch {
    feed.innerHTML = "";
    const p = document.createElement("p");
    p.className = "feed-loading";
    p.textContent = "Memories are unavailable right now. Try again later.";
    feed.append(p);
  } finally {
    feed.setAttribute("aria-busy", "false");
  }
}

input.addEventListener("input", () => {
  charCount.textContent = `${input.value.length}/${LIMIT}`;
});

adminToggle.addEventListener("click", async () => {
  if (!isConfigured()) {
    adminIndicator.textContent = "Missing Supabase config in config.js.";
    return;
  }

  if (state.adminEnabled) {
    state.adminEnabled = false;
    state.adminPassword = "";
    setAdminUi();
    await loadMemories();
    return;
  }

  const entered = window.prompt("Enter admin password");
  const password = cleanInput(entered || "");

  if (!password) {
    adminIndicator.textContent = "Admin mode cancelled.";
    return;
  }

  adminIndicator.textContent = "Checking password...";

  try {
    const ok = await verifyAdminPassword(password);
    if (!ok) {
      adminIndicator.textContent = "Invalid password.";
      return;
    }

    state.adminEnabled = true;
    state.adminPassword = password;
    setAdminUi();
    await loadMemories();
  } catch {
    adminIndicator.textContent = "Could not enter admin mode right now.";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = cleanInput(input.value);
  if (!text || text.length > LIMIT) {
    statusText.textContent = "Please enter up to 280 characters.";
    return;
  }

  if (!isConfigured()) {
    statusText.textContent = "Missing Supabase config in config.js.";
    return;
  }

  submitBtn.disabled = true;
  statusText.textContent = "Posting...";

  try {
    const response = await fetch(MEMORIES_ENDPOINT, {
      method: "POST",
      headers: supabaseHeaders({
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }),
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error("Post failed");
    }

    input.value = "";
    charCount.textContent = `0/${LIMIT}`;
    statusText.textContent = "Posted.";
    await loadMemories();
  } catch {
    statusText.textContent = "Could not post right now. Please try again.";
  } finally {
    submitBtn.disabled = false;
  }
});

setAdminUi();
loadMemories();
