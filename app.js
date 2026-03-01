const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";
const MEMORIES_ENDPOINT = `${SUPABASE_URL}/rest/v1/memories`;
const LIMIT = 280;

const form = document.getElementById("memory-form");
const input = document.getElementById("memory-input");
const submitBtn = document.getElementById("submit-btn");
const charCount = document.getElementById("char-count");
const statusText = document.getElementById("form-status");
const feed = document.getElementById("memory-feed");

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

    const meta = document.createElement("p");
    meta.className = "memory-meta";
    meta.textContent = formatDate(item.createdAt);

    card.append(text, meta);
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

function cleanInput(raw) {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

input.addEventListener("input", () => {
  charCount.textContent = `${input.value.length}/${LIMIT}`;
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

loadMemories();
