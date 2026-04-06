import {
  ModuleRegistry,
  AllCommunityModule,
  ColDef,
  createGrid,
  GridApi,
  GridOptions,
  ICellRendererParams,
  ValueGetterParams,
  CellClickedEvent,
} from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./styles.css";

// REQUIRED FOR AG GRID v35+
ModuleRegistry.registerModules([AllCommunityModule]);

const nesQuestParticipant = "/nesQuestParticipant.png";
const n64QuestParticipant = "/n64QuestParticipant.png";
const snesQuestParticipant = "/snesQuestParticipant.png";
const allQuestParticipant = "/allQuestParticipant.png";

/**
 * Security hardening:
 * - force HTTPS on production domain
 * - upgrade any accidental insecure asset requests
 */
if (
  window.location.hostname === "nathansalyer.com" ||
  window.location.hostname === "www.nathansalyer.com"
) {
  if (window.location.protocol !== "https:") {
    window.location.replace(
      `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }
}

function ensureSecurityMetaTag(): void {
  const existing = document.querySelector(
    'meta[http-equiv="Content-Security-Policy"]',
  );
  if (existing) return;

  const meta = document.createElement("meta");
  meta.httpEquiv = "Content-Security-Policy";
  meta.content = "upgrade-insecure-requests; block-all-mixed-content;";
  document.head.appendChild(meta);
}

ensureSecurityMetaTag();

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "";

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

function assetUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

// AUDIO
const bgMusic = new Audio(assetUrl("/background.mp3"));
bgMusic.loop = true;
bgMusic.volume = 0.25;
bgMusic.preload = "auto";

const clickSound = new Audio(assetUrl("/click.mp3"));
clickSound.volume = 0.5;
clickSound.preload = "auto";

function playClick(): void {
  clickSound.currentTime = 0;
  void clickSound.play().catch(() => {});
}

let musicStarted = false;
let musicMuted = false;
let toastTimer: number | null = null;

function startMusic(): void {
  if (!musicStarted && !musicMuted) {
    void bgMusic
      .play()
      .then(() => {
        musicStarted = true;
        updateMusicButton();
      })
      .catch((err) => {
        console.error("Music failed to start:", err);
      });
  }
}

function toggleMusic(): void {
  if (bgMusic.paused) {
    void bgMusic
      .play()
      .then(() => {
        musicStarted = true;
        musicMuted = false;
        updateMusicButton();
      })
      .catch((err) => {
        console.error("Music toggle play failed:", err);
      });
  } else {
    bgMusic.pause();
    musicMuted = true;
    updateMusicButton();
  }
}

function updateMusicButton(): void {
  const btn = document.getElementById("musicToggleBtn");
  if (!btn) return;
  btn.textContent = bgMusic.paused ? "Music: Off" : "Music: On";
}

function updateVolumeLabel(value: number): void {
  const label = document.getElementById("volumeValue");
  if (!label) return;
  label.textContent = `${Math.round(value * 100)}%`;
}

type SearchMode = "stores" | "media" | "crew";

type AuthUser = {
  id: string;
  username: string;
  email: string;
};

type MeResponse = { ok: true; user: AuthUser } | { error: string };

interface StoreRow {
  store_name?: string;
  store_id?: number;
  address?: string;
  address_2?: string;
  ["address 2"]?: string;
  city?: string;
  state?: string;
  zip?: string | number;
  phone_number?: string;
  country?: string;
  sunday?: string;
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  website?: string;
  nes_quest?: boolean;
  n64_quest?: boolean;
  snes_quest?: boolean;
  nintendo_quest?: boolean;
  super_nintendo_quest?: boolean;
  [key: string]: unknown;
}

interface MediaRow {
  title?: string;
  media_title?: string;
  type?: string;
  media_type?: string;
  format?: string;
  genre?: string;
  platform?: string;
  year?: string | number;
  release_year?: string | number;
  company?: string;
  studio?: string;
  publisher?: string;
  location?: string;
  notes?: string;
  website?: string;
  image?: string;
  [key: string]: unknown;
}

interface CrewRow {
  name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  title?: string;
  department?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  company?: string;
  project?: string;
  notes?: string;
  website?: string;
  [key: string]: unknown;
}

type GridRow = StoreRow | MediaRow | CrewRow;

interface StoreFormValues {
  store_name: string;
  address: string;
  address_2: string;
  city: string;
  state: string;
  zip: string;
  phone_number: string;
  country: string;
  quest_filter: string;
}

interface MediaFormValues {
  title: string;
  media_type: string;
  format: string;
  genre: string;
  platform: string;
  year: string;
  company: string;
  location: string;
}

interface CrewFormValues {
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  company: string;
  project: string;
}

interface NewStoreFormValues {
  store_name: string;
  address: string;
  address_2: string;
  city: string;
  state: string;
  zip: string;
  phone_number: string;
  country: string;
  quest: string;
  sunday_hours: string;
  monday_hours: string;
  tuesday_hours: string;
  wednesday_hours: string;
  thursday_hours: string;
  friday_hours: string;
  saturday_hours: string;
}

interface NewMediaFormValues {
  title: string;
  media_type: string;
  format: string;
  genre: string;
  platform: string;
  year: string;
  company: string;
  location: string;
  website: string;
  notes: string;
}

interface NewCrewFormValues {
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  company: string;
  project: string;
  website: string;
  notes: string;
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("App element not found.");
}

let currentMode: SearchMode = "stores";
let currentUser: AuthUser | null = null;
let gridApi: GridApi<GridRow> | null = null;

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  const rawText = await response.text();
  let parsed: unknown = {};
  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch {
    parsed = rawText;
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as { error?: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return parsed as T;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderLoading(): void {
  app!.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <h1>Loading...</h1>
      </div>
    </div>
  `;
}

function renderAuthScreen(): void {
  app!.innerHTML = `
    <div class="page retro-shell auth-shell">
      <div class="auth-center-wrap">
        <div class="panel retro-panel auth-retro-card">
          <div class="auth-logo-wrap">
            <img src="${assetUrl("/logo.png")}" alt="Neo Retro Store Locator" class="hero-logo auth-logo" />
          </div>

          <h1 class="auth-title">Neo Retro Login</h1>
          <p class="auth-subtitle">Sign in or create an account</p>

          <div id="auth-message" class="auth-message"></div>

          <div class="mode-switcher auth-tabs">
            <button id="show-login" class="retro-btn accent" type="button">Login</button>
            <button id="show-register" class="retro-btn secondary" type="button">Register</button>
          </div>

          <form id="login-form" class="auth-form retro-auth-form">
            <div class="search-grid auth-grid">
              <div>
                <label for="login-email">Email</label>
                <input id="login-email" type="email" required />
              </div>

              <div>
                <label for="login-password">Password</label>
                <input id="login-password" type="password" required />
              </div>
            </div>

            <div class="button-row auth-button-row">
              <button class="retro-btn accent" type="submit">Login</button>
              <button class="retro-btn secondary logout-floating">Logout</button>
            </div>
          </form>

          <form id="register-form" class="auth-form retro-auth-form hidden" style="display:none;">
            <div class="search-grid auth-grid">
              <div>
                <label for="register-username">Username</label>
                <input id="register-username" type="text" required />
              </div>

              <div>
                <label for="register-email">Email</label>
                <input id="register-email" type="email" required />
              </div>

              <div>
                <label for="register-password">Password</label>
                <input id="register-password" type="password" required />
              </div>
            </div>

            <div class="button-row auth-button-row">
              <button class="retro-btn success" type="submit">Create Account</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const authMessage = document.getElementById("auth-message");
  const loginForm = document.getElementById(
    "login-form",
  ) as HTMLFormElement | null;
  const registerForm = document.getElementById(
    "register-form",
  ) as HTMLFormElement | null;
  const showLogin = document.getElementById(
    "show-login",
  ) as HTMLButtonElement | null;
  const showRegister = document.getElementById(
    "show-register",
  ) as HTMLButtonElement | null;

  function setAuthMessage(message: string, isError = false): void {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.className = `auth-message ${isError ? "error" : "success"}`;
  }

  function showLoginTab(): void {
    if (loginForm) {
      loginForm.classList.remove("hidden");
      loginForm.style.display = "block";
    }
    if (registerForm) {
      registerForm.classList.add("hidden");
      registerForm.style.display = "none";
    }

    showLogin?.classList.add("accent");
    showLogin?.classList.remove("secondary");
    showRegister?.classList.add("secondary");
    showRegister?.classList.remove("accent");
    setAuthMessage("");
  }

  function showRegisterTab(): void {
    if (registerForm) {
      registerForm.classList.remove("hidden");
      registerForm.style.display = "block";
    }
    if (loginForm) {
      loginForm.classList.add("hidden");
      loginForm.style.display = "none";
    }

    showRegister?.classList.add("accent");
    showRegister?.classList.remove("secondary");
    showLogin?.classList.add("secondary");
    showLogin?.classList.remove("accent");
    setAuthMessage("");
  }

  showLogin?.addEventListener("click", showLoginTab);
  showRegister?.addEventListener("click", showRegisterTab);

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email =
      (
        document.getElementById("login-email") as HTMLInputElement | null
      )?.value.trim() ?? "";
    const password =
      (document.getElementById("login-password") as HTMLInputElement | null)
        ?.value ?? "";

    try {
      setAuthMessage("Logging in...");
      const result = await apiRequest<{ ok: true; user: AuthUser }>(
        apiUrl("/api/auth/login"),
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      currentUser = result.user;
      renderAppShell(result.user);
      initializeAppAfterRender();
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : "Login failed",
        true,
      );
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username =
      (
        document.getElementById("register-username") as HTMLInputElement | null
      )?.value.trim() ?? "";
    const email =
      (
        document.getElementById("register-email") as HTMLInputElement | null
      )?.value.trim() ?? "";
    const password =
      (document.getElementById("register-password") as HTMLInputElement | null)
        ?.value ?? "";

    try {
      setAuthMessage("Creating account...");
      const result = await apiRequest<{ ok: true; user: AuthUser }>(
        apiUrl("/api/auth/register"),
        {
          method: "POST",
          body: JSON.stringify({ username, email, password }),
        },
      );
      currentUser = result.user;
      renderAppShell(result.user);
      initializeAppAfterRender();
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : "Registration failed",
        true,
      );
    }
  });

  showLoginTab();
}

function renderAppShell(_user: AuthUser): void {
  app!.innerHTML = `
    <div class="page retro-shell">
      <header class="page-hero">
        <div class="hero-logo-wrap">
          <img src="${assetUrl("/logo.png")}" alt="Neo Retro Store Locator" class="hero-logo" />
        </div>
        <p class="hero-tagline">Search stores, media, crew, add new locations, and keep the catalog synced.</p>
      </header>

      <section class="top-row">
        <div class="panel retro-panel music-panel">
          <h2>Soundtrack</h2>

          <div class="audio-panel">
            <div class="audio-controls">
              <button id="musicToggleBtn" class="retro-btn secondary" type="button">Music: On</button>

              <label class="volume-wrap" for="volumeSlider">
                <span>Volume</span>
                <input id="volumeSlider" type="range" min="0" max="100" value="25" />
                <span id="volumeValue">25%</span>
              </label>
            </div>

            <div class="music-info">
              <div class="song-title">♫ Nintendo Quest Theme Song</div>
              <div class="song-artist">John McCarthy - Nintendo Quest (Official 8-bit Soundtrack)</div>
            </div>
          </div>
        </div>

        <div class="panel retro-panel search-panel">
          <div class="mode-switcher">
            <button id="modeStoresBtn" class="retro-btn accent" type="button">Store Search</button>
            <button id="modeMediaBtn" class="retro-btn secondary" type="button">Media Search</button>
            <button id="modeCrewBtn" class="retro-btn secondary" type="button">Crew Search</button>
          </div>

          <h2 id="searchPanelTitle">Search Stores</h2>

<div id="storeSearchSection" class="search-section" style="display:block;">
  <div class="search-grid">
    <div>
      <label for="store_name">Store Name</label>
      <input id="store_name" type="text" />
    </div>

    <div>
      <label for="address">Address</label>
      <input id="address" type="text" />
    </div>

    <div>
      <label for="address_2">Address 2</label>
      <input id="address_2" type="text" />
    </div>

    <div>
      <label for="city">City</label>
      <input id="city" type="text" />
    </div>

    <div>
      <label for="state">State / Province</label>
      <input id="state" type="text" />
    </div>

    <div>
      <label for="zip">Zip / Postal Code</label>
      <input id="zip" type="text" />
    </div>

    <div>
      <label for="phone_number">Phone Number</label>
      <input id="phone_number" type="text" />
    </div>

    <div>
      <label for="country">Country</label>
      <select id="country">
        <option value="">All Countries</option>
        <option value="USA">USA</option>
        <option value="Canada">Canada</option>
      </select>
    </div>

    <div>
      <label for="quest_filter">Quest Participated In</label>
      <select id="quest_filter">
        <option value="">Select a Quest</option>
        <option value="nes_quest">Nintendo Quest</option>
        <option value="snes_quest">Super Nintendo Quest</option>
        <option value="n64_quest">Nintendo 64 Quest</option>
      </select>
    </div>
  </div>

  <div class="button-row">
    <button id="searchBtn" class="retro-btn" type="button">Search</button>
    <button id="clearBtn" class="retro-btn secondary" type="button">Clear</button>
    <button id="loadAllBtn" class="retro-btn accent" type="button">Load All</button>
    <button id="openModalBtn" class="join-btn" type="button">Join the Quest</button>
  </div>

  <div class="search-panel-footer">
    <button id="logoutBtn" class="retro-btn secondary logout-floating-btn" type="button">Logout</button>
  </div>
</div>

          <div id="mediaSearchSection" class="search-section hidden" style="display:none;">
            <div class="search-grid">
              <div>
                <label for="media_title">Title</label>
                <input id="media_title" type="text" />
              </div>

              <div>
                <label for="media_type">Media Type</label>
                <input id="media_type" type="text" />
              </div>

              <div>
                <label for="media_format">Format</label>
                <input id="media_format" type="text" />
              </div>

              <div>
                <label for="media_genre">Genre</label>
                <input id="media_genre" type="text" />
              </div>

              <div>
                <label for="media_platform">Platform</label>
                <input id="media_platform" type="text" />
              </div>

              <div>
                <label for="media_year">Year</label>
                <input id="media_year" type="text" />
              </div>

              <div>
                <label for="media_company">Company / Studio / Publisher</label>
                <input id="media_company" type="text" />
              </div>

              <div>
                <label for="media_location">Location</label>
                <input id="media_location" type="text" />
              </div>
            </div>

            <div class="button-row">
              <button id="mediaSearchBtn" class="retro-btn" type="button">Search Media</button>
              <button id="mediaClearBtn" class="retro-btn secondary" type="button">Clear</button>
              <button id="mediaLoadAllBtn" class="retro-btn accent" type="button">Load All Media</button>
              <button id="openAddMediaBtn" class="retro-btn success" type="button">Add Media</button>
            </div>
          </div>

          <div id="crewSearchSection" class="search-section hidden" style="display:none;">
            <div class="search-grid">
              <div>
                <label for="crew_name">Name</label>
                <input id="crew_name" type="text" />
              </div>

              <div>
                <label for="crew_role">Role / Title</label>
                <input id="crew_role" type="text" />
              </div>

              <div>
                <label for="crew_department">Department</label>
                <input id="crew_department" type="text" />
              </div>

              <div>
                <label for="crew_email">Email</label>
                <input id="crew_email" type="text" />
              </div>

              <div>
                <label for="crew_phone">Phone</label>
                <input id="crew_phone" type="text" />
              </div>

              <div>
                <label for="crew_city">City</label>
                <input id="crew_city" type="text" />
              </div>

              <div>
                <label for="crew_state">State / Province</label>
                <input id="crew_state" type="text" />
              </div>

              <div>
                <label for="crew_country">Country</label>
                <input id="crew_country" type="text" />
              </div>

              <div>
                <label for="crew_company">Company</label>
                <input id="crew_company" type="text" />
              </div>

              <div>
                <label for="crew_project">Project</label>
                <input id="crew_project" type="text" />
              </div>
            </div>

            <div class="button-row">
              <button id="crewSearchBtn" class="retro-btn" type="button">Search Crew</button>
              <button id="crewClearBtn" class="retro-btn secondary" type="button">Clear</button>
              <button id="crewLoadAllBtn" class="retro-btn accent" type="button">Load All Crew</button>
              <button id="openAddCrewBtn" class="retro-btn success" type="button">Add Crew</button>
            </div>
          </div>
        </div>
      </section>

      <div id="status" class="status-bar">Ready.</div>
      <div id="toast" class="toast">Added to the Quest 🚀</div>

      <div id="storeGrid" class="ag-theme-alpine retro-grid"></div>

      <div id="addStoreModal" class="modal-overlay hidden" aria-hidden="true">
        <div class="modal-card retro-panel">
          <div class="modal-header">
            <h2>Join the Quest</h2>
            <button id="closeAddStoreBtn" class="modal-close-btn" type="button">×</button>
          </div>

          <div class="search-grid modal-grid">
            <div>
              <label for="add_store_name">Store Name</label>
              <input id="add_store_name" type="text" required />
            </div>

            <div>
              <label for="add_address">Address</label>
              <input id="add_address" type="text" required />
            </div>

            <div>
              <label for="add_address_2">Address 2</label>
              <input id="add_address_2" type="text" />
            </div>

            <div>
              <label for="add_city">City</label>
              <input id="add_city" type="text" required />
            </div>

            <div>
              <label for="add_state">State / Province</label>
              <input id="add_state" type="text" required />
            </div>

            <div>
              <label for="add_zip">Zip / Postal Code</label>
              <input id="add_zip" type="text" required />
            </div>

            <div>
              <label for="add_phone_number">Phone Number</label>
              <input id="add_phone_number" type="text" required />
            </div>

            <div>
              <label for="add_country">Country</label>
              <select id="add_country" required>
                <option value="">Select Country</option>
                <option value="USA">USA</option>
                <option value="Canada">Canada</option>
              </select>
            </div>

            <div>
              <label for="add_quest">Quest Participated In</label>
              <select id="add_quest">
                <option value="">None</option>
                <option value="nes">Nintendo Quest</option>
                <option value="snes">Super Nintendo Quest</option>
                <option value="n64">Nintendo 64 Quest</option>
                <option value="all">All Quests</option>
              </select>
            </div>
          </div>

          <div class="modal-hours-section">
            <h3>Hours of Operation</h3>

            <div class="hours-grid">
              <label for="add_sun_open">Sunday</label>
              <input type="time" id="add_sun_open" />
              <span class="to-text">to</span>
              <input type="time" id="add_sun_close" />

              <label for="add_mon_open">Monday</label>
              <input type="time" id="add_mon_open" />
              <span class="to-text">to</span>
              <input type="time" id="add_mon_close" />

              <label for="add_tue_open">Tuesday</label>
              <input type="time" id="add_tue_open" />
              <span class="to-text">to</span>
              <input type="time" id="add_tue_close" />

              <label for="add_wed_open">Wednesday</label>
              <input type="time" id="add_wed_open" />
              <span class="to-text">to</span>
              <input type="time" id="add_wed_close" />

              <label for="add_thu_open">Thursday</label>
              <input type="time" id="add_thu_open" />
              <span class="to-text">to</span>
              <input type="time" id="add_thu_close" />

              <label for="add_fri_open">Friday</label>
              <input type="time" id="add_fri_open" />
              <span class="to-text">to</span>
              <input type="time" id="add_fri_close" />

              <label for="add_sat_open">Saturday</label>
              <input type="time" id="add_sat_open" />
              <span class="to-text">to</span>
              <input type="time" id="add_sat_close" />
            </div>
          </div>

          <div class="button-row modal-actions">
            <button id="submitAddStoreBtn" class="retro-btn success" type="button">Add to Quest</button>
            <button id="cancelAddStoreBtn" class="retro-btn secondary" type="button">Cancel</button>
          </div>
        </div>
      </div>

      <div id="addMediaModal" class="modal-overlay hidden" aria-hidden="true">
        <div class="modal-card retro-panel">
          <div class="modal-header">
            <h2>Add Media</h2>
            <button id="closeAddMediaBtn" class="modal-close-btn" type="button">×</button>
          </div>

          <div class="search-grid modal-grid">
            <div>
              <label for="add_media_title">Title</label>
              <input id="add_media_title" type="text" />
            </div>
            <div>
              <label for="add_media_type">Media Type</label>
              <input id="add_media_type" type="text" />
            </div>
            <div>
              <label for="add_media_format">Format</label>
              <input id="add_media_format" type="text" />
            </div>
            <div>
              <label for="add_media_genre">Genre</label>
              <input id="add_media_genre" type="text" />
            </div>
            <div>
              <label for="add_media_platform">Platform</label>
              <input id="add_media_platform" type="text" />
            </div>
            <div>
              <label for="add_media_year">Year</label>
              <input id="add_media_year" type="text" />
            </div>
            <div>
              <label for="add_media_company">Company</label>
              <input id="add_media_company" type="text" />
            </div>
            <div>
              <label for="add_media_location">Location</label>
              <input id="add_media_location" type="text" />
            </div>
            <div>
              <label for="add_media_website">Website</label>
              <input id="add_media_website" type="text" />
            </div>
            <div>
              <label for="add_media_notes">Notes</label>
              <input id="add_media_notes" type="text" />
            </div>
          </div>

          <div class="button-row modal-actions">
            <button id="submitAddMediaBtn" class="retro-btn success" type="button">Save Media</button>
            <button id="cancelAddMediaBtn" class="retro-btn secondary" type="button">Cancel</button>
          </div>
        </div>
      </div>

      <div id="addCrewModal" class="modal-overlay hidden" aria-hidden="true">
        <div class="modal-card retro-panel">
          <div class="modal-header">
            <h2>Add Crew</h2>
            <button id="closeAddCrewBtn" class="modal-close-btn" type="button">×</button>
          </div>

          <div class="search-grid modal-grid">
            <div>
              <label for="add_crew_name">Name</label>
              <input id="add_crew_name" type="text" />
            </div>
            <div>
              <label for="add_crew_role">Role / Title</label>
              <input id="add_crew_role" type="text" />
            </div>
            <div>
              <label for="add_crew_department">Department</label>
              <input id="add_crew_department" type="text" />
            </div>
            <div>
              <label for="add_crew_email">Email</label>
              <input id="add_crew_email" type="text" />
            </div>
            <div>
              <label for="add_crew_phone">Phone</label>
              <input id="add_crew_phone" type="text" />
            </div>
            <div>
              <label for="add_crew_city">City</label>
              <input id="add_crew_city" type="text" />
            </div>
            <div>
              <label for="add_crew_state">State / Province</label>
              <input id="add_crew_state" type="text" />
            </div>
            <div>
              <label for="add_crew_country">Country</label>
              <input id="add_crew_country" type="text" />
            </div>
            <div>
              <label for="add_crew_company">Company</label>
              <input id="add_crew_company" type="text" />
            </div>
            <div>
              <label for="add_crew_project">Project</label>
              <input id="add_crew_project" type="text" />
            </div>
            <div>
              <label for="add_crew_website">Website</label>
              <input id="add_crew_website" type="text" />
            </div>
            <div>
              <label for="add_crew_notes">Notes</label>
              <input id="add_crew_notes" type="text" />
            </div>
          </div>

          <div class="button-row modal-actions">
            <button id="submitAddCrewBtn" class="retro-btn success" type="button">Save Crew</button>
            <button id="cancelAddCrewBtn" class="retro-btn secondary" type="button">Cancel</button>
          </div>
        </div>
      </div>

      <div id="storeDetailModal" class="modal-overlay hidden" aria-hidden="true">
        <div class="modal-card retro-panel store-detail-card">
          <div class="modal-header">
            <h2>Store Details</h2>
            <button id="closeStoreDetailBtn" class="modal-close-btn" type="button">×</button>
          </div>

          <div class="store-detail-body">
            <div class="store-detail-section">
              <div class="store-detail-main-grid">
                <div class="store-detail-info">
                  <div class="store-detail-row">
                    <strong>Store Name:</strong>
                    <span id="detail_store_name"></span>
                  </div>

                  <div class="store-detail-row address-row">
                    <strong>Address:</strong>
                    <a id="detail_address_link" href="#" target="_blank" rel="noopener noreferrer"></a>
                  </div>

                  <div class="store-detail-row">
                    <strong>Phone:</strong>
                    <a id="detail_phone_link" href="#"></a>
                  </div>

                  <div class="store-detail-row">
                    <strong>Website:</strong>
                    <a id="detail_website_link" href="#" target="_blank" rel="noopener noreferrer"></a>
                  </div>

                  <div class="detail-address-actions">
                    <button id="detail_directions_btn" class="retro-btn accent" type="button">Get Directions</button>
                    <button id="detail_copy_btn" class="retro-btn secondary" type="button">Copy Address</button>
                  </div>
                </div>

                <div class="store-detail-badge-wrap">
                  <img id="detail_quest_badge" class="quest-participant-badge hidden" alt="Quest Participant Badge" />
                </div>
              </div>
            </div>

            <div class="store-detail-section">
              <h3>Store Hours</h3>
              <div class="detail-hours-grid">
                <div class="hours-row"><span>Sunday:</span><span id="detail_sunday_hours"></span></div>
                <div class="hours-row"><span>Monday:</span><span id="detail_monday_hours"></span></div>
                <div class="hours-row"><span>Tuesday:</span><span id="detail_tuesday_hours"></span></div>
                <div class="hours-row"><span>Wednesday:</span><span id="detail_wednesday_hours"></span></div>
                <div class="hours-row"><span>Thursday:</span><span id="detail_thursday_hours"></span></div>
                <div class="hours-row"><span>Friday:</span><span id="detail_friday_hours"></span></div>
                <div class="hours-row"><span>Saturday:</span><span id="detail_saturday_hours"></span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getStatusEl(): HTMLElement | null {
  return document.getElementById("status");
}

function setStatus(message: string): void {
  const status = getStatusEl();
  if (status) status.textContent = message;
}

function showToast(message: string): void {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

function ensureGridIsVisible(): void {
  const gridEl = document.getElementById("storeGrid") as HTMLDivElement | null;
  if (!gridEl) return;

  gridEl.style.display = "block";
  gridEl.style.visibility = "visible";
  gridEl.style.width = "100%";
  gridEl.style.height = "560px";
  gridEl.style.minHeight = "560px";
}

function getAddress2Value(store: StoreRow): string {
  return String(store.address_2 ?? store["address 2"] ?? "").trim();
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeStoreRow(row: StoreRow): StoreRow {
  return {
    ...row,
    address_2: String(row.address_2 ?? row["address 2"] ?? "").trim(),
    zip: row.zip ?? "",
    nes_quest: normalizeBoolean(row.nes_quest ?? row.nintendo_quest),
    snes_quest: normalizeBoolean(row.snes_quest ?? row.super_nintendo_quest),
    n64_quest: normalizeBoolean(row.n64_quest),
  };
}

function normalizeMediaRow(row: MediaRow): MediaRow {
  return { ...row };
}

function normalizeCrewRow(row: CrewRow): CrewRow {
  const first = String(row.first_name ?? "").trim();
  const last = String(row.last_name ?? "").trim();
  const name = String(row.name ?? "").trim();

  return {
    ...row,
    name: name || [first, last].filter(Boolean).join(" "),
  };
}

function formatAddress(store: StoreRow): string {
  return [
    store.address,
    getAddress2Value(store),
    store.city,
    store.state,
    store.zip,
    store.country,
  ]
    .filter((part) => String(part ?? "").trim() !== "")
    .map((part) => String(part).trim())
    .join(", ");
}

function buildGoogleMapsLink(store: StoreRow): string {
  const fullAddress = formatAddress(store);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
}

function buildGoogleMapsDirectionsLink(store: StoreRow): string {
  const fullAddress = formatAddress(store);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
}

function buildWebsiteUrl(website?: string): string {
  if (!website) return "#";
  const trimmed = website.trim();
  if (!trimmed) return "#";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function getHoursValue(value?: string): string {
  return value && value.trim() ? value : "Not Available";
}

function getInputValue(id: string): string {
  const element = document.getElementById(id) as
    | HTMLInputElement
    | HTMLSelectElement
    | null;
  return element?.value ?? "";
}

function setInputValue(id: string, value: string): void {
  const element = document.getElementById(id) as
    | HTMLInputElement
    | HTMLSelectElement
    | null;
  if (element) element.value = value;
}

function buildDayHours(openId: string, closeId: string): string {
  const open = getInputValue(openId).trim();
  const close = getInputValue(closeId).trim();

  if (!open && !close) return "";
  if (open && close) return `${open} - ${close}`;
  if (open) return `Opens at ${open}`;
  return `Closes at ${close}`;
}

function getQuestBadgeSrc(store: StoreRow): string | null {
  const normalized = normalizeStoreRow(store);

  const nes = normalized.nes_quest === true;
  const n64 = normalized.n64_quest === true;
  const snes = normalized.snes_quest === true;

  if (nes && n64 && snes) return allQuestParticipant;
  if (snes) return snesQuestParticipant;
  if (n64) return n64QuestParticipant;
  if (nes) return nesQuestParticipant;

  return null;
}

function getQuestBadgeAlt(store: StoreRow): string {
  const normalized = normalizeStoreRow(store);

  const nes = normalized.nes_quest === true;
  const n64 = normalized.n64_quest === true;
  const snes = normalized.snes_quest === true;

  if (nes && n64 && snes) {
    return "Nintendo Quest, Super Nintendo Quest, and Nintendo 64 Quest Participant";
  }
  if (snes) return "Super Nintendo Quest Participant";
  if (n64) return "Nintendo 64 Quest Participant";
  if (nes) return "Nintendo Quest Participant";

  return "Quest Participant";
}

function openStoreDetailModal(store: StoreRow): void {
  const normalizedStore = normalizeStoreRow(store);

  const modal = document.getElementById("storeDetailModal");
  if (!modal) return;

  const addressLink = document.getElementById(
    "detail_address_link",
  ) as HTMLAnchorElement | null;
  const phoneLink = document.getElementById(
    "detail_phone_link",
  ) as HTMLAnchorElement | null;
  const websiteLink = document.getElementById(
    "detail_website_link",
  ) as HTMLAnchorElement | null;
  const directionsBtn = document.getElementById(
    "detail_directions_btn",
  ) as HTMLButtonElement | null;
  const copyBtn = document.getElementById(
    "detail_copy_btn",
  ) as HTMLButtonElement | null;
  const badgeImg = document.getElementById(
    "detail_quest_badge",
  ) as HTMLImageElement | null;

  const storeNameEl = document.getElementById("detail_store_name");
  const sundayEl = document.getElementById("detail_sunday_hours");
  const mondayEl = document.getElementById("detail_monday_hours");
  const tuesdayEl = document.getElementById("detail_tuesday_hours");
  const wednesdayEl = document.getElementById("detail_wednesday_hours");
  const thursdayEl = document.getElementById("detail_thursday_hours");
  const fridayEl = document.getElementById("detail_friday_hours");
  const saturdayEl = document.getElementById("detail_saturday_hours");

  const fullAddress = formatAddress(normalizedStore);
  const mapsUrl = fullAddress ? buildGoogleMapsLink(normalizedStore) : "#";
  const directionsUrl = fullAddress
    ? buildGoogleMapsDirectionsLink(normalizedStore)
    : "#";
  const badgeSrc = getQuestBadgeSrc(normalizedStore);

  const websiteUrl = buildWebsiteUrl(normalizedStore.website);
  const phoneNumber = normalizedStore.phone_number?.trim() ?? "";
  const phoneHref = phoneNumber
    ? `tel:${phoneNumber.replace(/[^\d+]/g, "")}`
    : "#";
  const websiteText = normalizedStore.website?.trim() ?? "";

  if (storeNameEl) storeNameEl.textContent = normalizedStore.store_name ?? "";

  if (addressLink) {
    addressLink.textContent = fullAddress || "Address not available";
    addressLink.href = mapsUrl;
    addressLink.style.pointerEvents = fullAddress ? "auto" : "none";
  }

  if (phoneLink) {
    phoneLink.textContent = phoneNumber || "Not Available";
    phoneLink.href = phoneHref;
    phoneLink.style.pointerEvents = phoneNumber ? "auto" : "none";
  }

  if (websiteLink) {
    websiteLink.textContent = websiteText || "Not Available";
    websiteLink.href = websiteUrl;
    websiteLink.style.pointerEvents = websiteText ? "auto" : "none";
  }

  if (directionsBtn) {
    directionsBtn.disabled = !fullAddress;
    directionsBtn.onclick = () => {
      if (!fullAddress) return;
      window.open(directionsUrl, "_blank", "noopener,noreferrer");
    };
  }

  if (copyBtn) {
    copyBtn.disabled = !fullAddress;
    copyBtn.onclick = async () => {
      if (!fullAddress) return;

      try {
        await navigator.clipboard.writeText(fullAddress);
        showToast("Address copied 📋");
      } catch (error) {
        console.error("Clipboard copy failed:", error);
        setStatus("Could not copy address.");
      }
    };
  }

  if (badgeImg) {
    if (badgeSrc) {
      badgeImg.src = badgeSrc;
      badgeImg.alt = getQuestBadgeAlt(normalizedStore);
      badgeImg.classList.remove("hidden");
    } else {
      badgeImg.src = "";
      badgeImg.alt = "";
      badgeImg.classList.add("hidden");
    }
  }

  if (sundayEl) sundayEl.textContent = getHoursValue(normalizedStore.sunday);
  if (mondayEl) mondayEl.textContent = getHoursValue(normalizedStore.monday);
  if (tuesdayEl) tuesdayEl.textContent = getHoursValue(normalizedStore.tuesday);
  if (wednesdayEl)
    wednesdayEl.textContent = getHoursValue(normalizedStore.wednesday);
  if (thursdayEl)
    thursdayEl.textContent = getHoursValue(normalizedStore.thursday);
  if (fridayEl) fridayEl.textContent = getHoursValue(normalizedStore.friday);
  if (saturdayEl)
    saturdayEl.textContent = getHoursValue(normalizedStore.saturday);

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeStoreDetailModal(): void {
  const modal = document.getElementById("storeDetailModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function openModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function getStoreFormValues(): StoreFormValues {
  return {
    store_name: getInputValue("store_name").trim(),
    address: getInputValue("address").trim(),
    address_2: getInputValue("address_2").trim(),
    city: getInputValue("city").trim(),
    state: getInputValue("state").trim(),
    zip: getInputValue("zip").trim(),
    phone_number: getInputValue("phone_number").trim(),
    country: getInputValue("country").trim(),
    quest_filter: getInputValue("quest_filter").trim(),
  };
}

function getMediaFormValues(): MediaFormValues {
  return {
    title: getInputValue("media_title").trim(),
    media_type: getInputValue("media_type").trim(),
    format: getInputValue("media_format").trim(),
    genre: getInputValue("media_genre").trim(),
    platform: getInputValue("media_platform").trim(),
    year: getInputValue("media_year").trim(),
    company: getInputValue("media_company").trim(),
    location: getInputValue("media_location").trim(),
  };
}

function getCrewFormValues(): CrewFormValues {
  return {
    name: getInputValue("crew_name").trim(),
    role: getInputValue("crew_role").trim(),
    department: getInputValue("crew_department").trim(),
    email: getInputValue("crew_email").trim(),
    phone: getInputValue("crew_phone").trim(),
    city: getInputValue("crew_city").trim(),
    state: getInputValue("crew_state").trim(),
    country: getInputValue("crew_country").trim(),
    company: getInputValue("crew_company").trim(),
    project: getInputValue("crew_project").trim(),
  };
}

function clearStoreForm(): void {
  [
    "store_name",
    "address",
    "address_2",
    "city",
    "state",
    "zip",
    "phone_number",
    "country",
    "quest_filter",
  ].forEach((id) => setInputValue(id, ""));
}

function clearMediaForm(): void {
  [
    "media_title",
    "media_type",
    "media_format",
    "media_genre",
    "media_platform",
    "media_year",
    "media_company",
    "media_location",
  ].forEach((id) => setInputValue(id, ""));
}

function clearCrewForm(): void {
  [
    "crew_name",
    "crew_role",
    "crew_department",
    "crew_email",
    "crew_phone",
    "crew_city",
    "crew_state",
    "crew_country",
    "crew_company",
    "crew_project",
  ].forEach((id) => setInputValue(id, ""));
}

function getNewStoreFormValues(): NewStoreFormValues {
  return {
    store_name: getInputValue("add_store_name").trim(),
    address: getInputValue("add_address").trim(),
    address_2: getInputValue("add_address_2").trim(),
    city: getInputValue("add_city").trim(),
    state: getInputValue("add_state").trim(),
    zip: getInputValue("add_zip").trim(),
    phone_number: getInputValue("add_phone_number").trim(),
    country: getInputValue("add_country").trim(),
    quest: getInputValue("add_quest").trim(),
    sunday_hours: buildDayHours("add_sun_open", "add_sun_close"),
    monday_hours: buildDayHours("add_mon_open", "add_mon_close"),
    tuesday_hours: buildDayHours("add_tue_open", "add_tue_close"),
    wednesday_hours: buildDayHours("add_wed_open", "add_wed_close"),
    thursday_hours: buildDayHours("add_thu_open", "add_thu_close"),
    friday_hours: buildDayHours("add_fri_open", "add_fri_close"),
    saturday_hours: buildDayHours("add_sat_open", "add_sat_close"),
  };
}

function getNewMediaFormValues(): NewMediaFormValues {
  return {
    title: getInputValue("add_media_title").trim(),
    media_type: getInputValue("add_media_type").trim(),
    format: getInputValue("add_media_format").trim(),
    genre: getInputValue("add_media_genre").trim(),
    platform: getInputValue("add_media_platform").trim(),
    year: getInputValue("add_media_year").trim(),
    company: getInputValue("add_media_company").trim(),
    location: getInputValue("add_media_location").trim(),
    website: getInputValue("add_media_website").trim(),
    notes: getInputValue("add_media_notes").trim(),
  };
}

function getNewCrewFormValues(): NewCrewFormValues {
  return {
    name: getInputValue("add_crew_name").trim(),
    role: getInputValue("add_crew_role").trim(),
    department: getInputValue("add_crew_department").trim(),
    email: getInputValue("add_crew_email").trim(),
    phone: getInputValue("add_crew_phone").trim(),
    city: getInputValue("add_crew_city").trim(),
    state: getInputValue("add_crew_state").trim(),
    country: getInputValue("add_crew_country").trim(),
    company: getInputValue("add_crew_company").trim(),
    project: getInputValue("add_crew_project").trim(),
    website: getInputValue("add_crew_website").trim(),
    notes: getInputValue("add_crew_notes").trim(),
  };
}

function clearAddStoreForm(): void {
  [
    "add_store_name",
    "add_address",
    "add_address_2",
    "add_city",
    "add_state",
    "add_zip",
    "add_phone_number",
    "add_country",
    "add_quest",
    "add_sun_open",
    "add_sun_close",
    "add_mon_open",
    "add_mon_close",
    "add_tue_open",
    "add_tue_close",
    "add_wed_open",
    "add_wed_close",
    "add_thu_open",
    "add_thu_close",
    "add_fri_open",
    "add_fri_close",
    "add_sat_open",
    "add_sat_close",
  ].forEach((id) => setInputValue(id, ""));
}

function clearAddMediaForm(): void {
  [
    "add_media_title",
    "add_media_type",
    "add_media_format",
    "add_media_genre",
    "add_media_platform",
    "add_media_year",
    "add_media_company",
    "add_media_location",
    "add_media_website",
    "add_media_notes",
  ].forEach((id) => setInputValue(id, ""));
}

function clearAddCrewForm(): void {
  [
    "add_crew_name",
    "add_crew_role",
    "add_crew_department",
    "add_crew_email",
    "add_crew_phone",
    "add_crew_city",
    "add_crew_state",
    "add_crew_country",
    "add_crew_company",
    "add_crew_project",
    "add_crew_website",
    "add_crew_notes",
  ].forEach((id) => setInputValue(id, ""));
}

function forceHideSection(section: HTMLElement | null): void {
  if (!section) return;
  section.style.display = "none";
  section.classList.add("hidden");
}

function forceShowSection(section: HTMLElement | null): void {
  if (!section) return;
  section.style.display = "block";
  section.classList.remove("hidden");
}

function createDefaultRenderer(
  field: string,
): (params: ICellRendererParams<GridRow>) => string {
  return (params: ICellRendererParams<GridRow>): string => {
    const row = params.data;
    if (!row) return "";
    const value = (row as Record<string, unknown>)[field] ?? params.value ?? "";
    return String(value ?? "");
  };
}

const storeColumnDefs: ColDef<GridRow>[] = [
  {
    headerName: "Store Name",
    field: "store_name",
    cellRenderer: (params: ICellRendererParams<GridRow>): HTMLElement => {
      const data = (params.data ?? {}) as StoreRow;
      const link = document.createElement("a");

      link.href = "#";
      link.textContent = String(data.store_name ?? "");
      link.className = "store-link";

      link.addEventListener("click", (event) => {
        event.preventDefault();
        openStoreDetailModal(data);
      });

      return link;
    },
  },
  {
    headerName: "Address",
    valueGetter: (params: ValueGetterParams<GridRow>): string =>
      formatAddress((params.data ?? {}) as StoreRow),
  },
  {
    headerName: "Phone",
    field: "phone_number",
    cellRenderer: createDefaultRenderer("phone_number"),
  },
  {
    headerName: "Country",
    field: "country",
    cellRenderer: createDefaultRenderer("country"),
  },
  {
    headerName: "Website",
    field: "website",
    cellRenderer: createDefaultRenderer("website"),
  },
];

const mediaColumnDefs: ColDef<GridRow>[] = [
  {
    headerName: "Title",
    field: "title",
    cellRenderer: (params: ICellRendererParams<GridRow>): string => {
      const row = (params.data ?? {}) as MediaRow;
      return String(row.title ?? row.media_title ?? "");
    },
  },
  {
    headerName: "Media Type",
    field: "media_type",
    cellRenderer: (params: ICellRendererParams<GridRow>): string => {
      const row = (params.data ?? {}) as MediaRow;
      return String(row.media_type ?? row.type ?? "");
    },
  },
  {
    headerName: "Format",
    field: "format",
    cellRenderer: createDefaultRenderer("format"),
  },
  {
    headerName: "Genre",
    field: "genre",
    cellRenderer: createDefaultRenderer("genre"),
  },
  {
    headerName: "Platform",
    field: "platform",
    cellRenderer: createDefaultRenderer("platform"),
  },
  {
    headerName: "Year",
    field: "year",
    cellRenderer: (params: ICellRendererParams<GridRow>): string => {
      const row = (params.data ?? {}) as MediaRow;
      return String(row.year ?? row.release_year ?? "");
    },
  },
  {
    headerName: "Company",
    field: "company",
    cellRenderer: (params: ICellRendererParams<GridRow>): string => {
      const row = (params.data ?? {}) as MediaRow;
      return String(row.company ?? row.studio ?? row.publisher ?? "");
    },
  },
  {
    headerName: "Location",
    field: "location",
    cellRenderer: createDefaultRenderer("location"),
  },
];

const crewColumnDefs: ColDef<GridRow>[] = [
  {
    headerName: "Name",
    field: "name",
    cellRenderer: (params: ICellRendererParams<GridRow>): string => {
      const row = (params.data ?? {}) as CrewRow;
      return String(
        row.name ??
          [row.first_name ?? "", row.last_name ?? ""].filter(Boolean).join(" "),
      );
    },
  },
  {
    headerName: "Role",
    field: "role",
    cellRenderer: (params: ICellRendererParams<GridRow>): string => {
      const row = (params.data ?? {}) as CrewRow;
      return String(row.role ?? row.title ?? "");
    },
  },
  {
    headerName: "Department",
    field: "department",
    cellRenderer: createDefaultRenderer("department"),
  },
  {
    headerName: "Email",
    field: "email",
    cellRenderer: createDefaultRenderer("email"),
  },
  {
    headerName: "Phone",
    field: "phone",
    cellRenderer: createDefaultRenderer("phone"),
  },
  {
    headerName: "City",
    field: "city",
    cellRenderer: createDefaultRenderer("city"),
  },
  {
    headerName: "State",
    field: "state",
    cellRenderer: createDefaultRenderer("state"),
  },
  {
    headerName: "Country",
    field: "country",
    cellRenderer: createDefaultRenderer("country"),
  },
  {
    headerName: "Company",
    field: "company",
    cellRenderer: createDefaultRenderer("company"),
  },
  {
    headerName: "Project",
    field: "project",
    cellRenderer: createDefaultRenderer("project"),
  },
];

function initGrid(): void {
  const gridElement = document.querySelector<HTMLDivElement>("#storeGrid");
  if (!gridElement) throw new Error("Grid element not found.");

  const gridOptions: GridOptions<GridRow> = {
    columnDefs: storeColumnDefs,
    rowData: [],
    pagination: true,
    paginationPageSize: 25,
    animateRows: true,
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 120,
    },
  };

  const createdGridApi = createGrid(gridElement, gridOptions);
  if (!createdGridApi) {
    throw new Error("AG Grid failed to initialize.");
  }

  gridApi = createdGridApi;
}

function setGridRows(rows: GridRow[]): void {
  if (!gridApi) throw new Error("AG Grid API is not initialized.");

  const api = gridApi as GridApi<GridRow> & {
    setRowData?: (rowData: GridRow[]) => void;
    setGridOption?: (key: string, value: unknown) => void;
    sizeColumnsToFit?: () => void;
    refreshCells?: () => void;
    redrawRows?: () => void;
  };

  if (typeof api.setGridOption === "function") {
    api.setGridOption("rowData", rows);
  } else if (typeof api.setRowData === "function") {
    api.setRowData(rows);
  } else {
    throw new Error("No supported AG Grid row update method found.");
  }

  requestAnimationFrame(() => {
    try {
      api.redrawRows?.();
      api.refreshCells?.();
      api.sizeColumnsToFit?.();
    } catch (error) {
      console.warn("Grid refresh failed:", error);
    }
  });
}

function setGridColumns(columnDefs: ColDef<GridRow>[]): void {
  if (!gridApi) return;

  const api = gridApi as GridApi<GridRow> & {
    setGridOption?: (key: string, value: unknown) => void;
    setColumnDefs?: (defs: ColDef<GridRow>[]) => void;
    sizeColumnsToFit?: () => void;
  };

  if (typeof api.setGridOption === "function") {
    api.setGridOption("columnDefs", columnDefs);
  } else if (typeof api.setColumnDefs === "function") {
    api.setColumnDefs(columnDefs);
  }

  requestAnimationFrame(() => {
    try {
      api.sizeColumnsToFit?.();
    } catch (error) {
      console.warn("Column sizing failed:", error);
    }
  });
}

function showSearchSection(mode: SearchMode): void {
  currentMode = mode;

  const storeSection = document.getElementById(
    "storeSearchSection",
  ) as HTMLElement | null;
  const mediaSection = document.getElementById(
    "mediaSearchSection",
  ) as HTMLElement | null;
  const crewSection = document.getElementById(
    "crewSearchSection",
  ) as HTMLElement | null;
  const title = document.getElementById("searchPanelTitle");
  const openModalBtn = document.getElementById(
    "openModalBtn",
  ) as HTMLButtonElement | null;

  forceHideSection(storeSection);
  forceHideSection(mediaSection);
  forceHideSection(crewSection);

  document.getElementById("modeStoresBtn")?.classList.remove("accent");
  document.getElementById("modeMediaBtn")?.classList.remove("accent");
  document.getElementById("modeCrewBtn")?.classList.remove("accent");

  document.getElementById("modeStoresBtn")?.classList.add("secondary");
  document.getElementById("modeMediaBtn")?.classList.add("secondary");
  document.getElementById("modeCrewBtn")?.classList.add("secondary");

  if (mode === "stores") {
    forceShowSection(storeSection);
    if (title) title.textContent = "Search Stores";
    document.getElementById("modeStoresBtn")?.classList.add("accent");
    document.getElementById("modeStoresBtn")?.classList.remove("secondary");
    setGridColumns(storeColumnDefs);
    if (openModalBtn) openModalBtn.style.display = "inline-flex";
  }

  if (mode === "media") {
    forceShowSection(mediaSection);
    if (title) title.textContent = "Search Media";
    document.getElementById("modeMediaBtn")?.classList.add("accent");
    document.getElementById("modeMediaBtn")?.classList.remove("secondary");
    setGridColumns(mediaColumnDefs);
    if (openModalBtn) openModalBtn.style.display = "none";
  }

  if (mode === "crew") {
    forceShowSection(crewSection);
    if (title) title.textContent = "Search Crew";
    document.getElementById("modeCrewBtn")?.classList.add("accent");
    document.getElementById("modeCrewBtn")?.classList.remove("secondary");
    setGridColumns(crewColumnDefs);
    if (openModalBtn) openModalBtn.style.display = "none";
  }

  setGridRows([]);
  setStatus(`Ready for ${mode} search.`);
}

async function fetchStores(): Promise<void> {
  setStatus("Loading stores.");

  try {
    const params = new URLSearchParams();
    const values = getStoreFormValues();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== "") params.append(key, value);
    });

    const queryString = params.toString();
    const url = queryString
      ? apiUrl(`/api/stores?${queryString}`)
      : apiUrl("/api/stores");

    const parsed = await apiRequest<unknown>(url, {
      method: "GET",
    });

    if (!Array.isArray(parsed)) {
      throw new Error("API response was not an array.");
    }

    const rows = parsed.map((row) => normalizeStoreRow(row as StoreRow));
    setGridRows(rows);
    setStatus(`Loaded ${rows.length} store${rows.length === 1 ? "" : "s"}.`);
  } catch (error) {
    console.error("fetchStores failed:", error);
    setStatus(
      error instanceof Error
        ? `Error loading stores: ${error.message}`
        : "Error loading stores.",
    );
    setGridRows([]);
  }
}

async function fetchMedia(): Promise<void> {
  setStatus("Loading media.");

  try {
    const params = new URLSearchParams();
    const values = getMediaFormValues();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== "") params.append(key, value);
    });

    const queryString = params.toString();
    const url = queryString
      ? apiUrl(`/api/media?${queryString}`)
      : apiUrl("/api/media");

    const parsed = await apiRequest<unknown>(url, {
      method: "GET",
    });

    if (!Array.isArray(parsed)) {
      throw new Error("API response was not an array.");
    }

    const rows = parsed.map((row) => normalizeMediaRow(row as MediaRow));
    setGridRows(rows);
    setStatus(
      `Loaded ${rows.length} media item${rows.length === 1 ? "" : "s"}.`,
    );
  } catch (error) {
    console.error("fetchMedia failed:", error);
    setStatus(
      error instanceof Error
        ? `Error loading media: ${error.message}`
        : "Error loading media.",
    );
    setGridRows([]);
  }
}

async function fetchCrew(): Promise<void> {
  setStatus("Loading crew.");

  try {
    const params = new URLSearchParams();
    const values = getCrewFormValues();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== "") params.append(key, value);
    });

    const queryString = params.toString();
    const url = queryString
      ? apiUrl(`/api/crew?${queryString}`)
      : apiUrl("/api/crew");

    const parsed = await apiRequest<unknown>(url, {
      method: "GET",
    });

    if (!Array.isArray(parsed)) {
      throw new Error("API response was not an array.");
    }

    const rows = parsed.map((row) => normalizeCrewRow(row as CrewRow));
    setGridRows(rows);
    setStatus(
      `Loaded ${rows.length} crew member${rows.length === 1 ? "" : "s"}.`,
    );
  } catch (error) {
    console.error("fetchCrew failed:", error);
    setStatus(
      error instanceof Error
        ? `Error loading crew: ${error.message}`
        : "Error loading crew.",
    );
    setGridRows([]);
  }
}

async function loadAllStores(): Promise<void> {
  clearStoreForm();
  await fetchStores();
}

async function loadAllMedia(): Promise<void> {
  clearMediaForm();
  await fetchMedia();
}

async function loadAllCrew(): Promise<void> {
  clearCrewForm();
  await fetchCrew();
}

async function addStore(): Promise<void> {
  const values = getNewStoreFormValues();

  if (
    !values.store_name ||
    !values.address ||
    !values.city ||
    !values.state ||
    !values.zip ||
    !values.country
  ) {
    setStatus("Please complete the required store fields.");
    return;
  }

  const payload = {
    store_name: values.store_name,
    address: values.address,
    address_2: values.address_2,
    city: values.city,
    state: values.state,
    zip: values.zip,
    phone_number: values.phone_number,
    country: values.country,
    sunday: values.sunday_hours,
    monday: values.monday_hours,
    tuesday: values.tuesday_hours,
    wednesday: values.wednesday_hours,
    thursday: values.thursday_hours,
    friday: values.friday_hours,
    saturday: values.saturday_hours,
    nes_quest: values.quest === "nes" || values.quest === "all",
    snes_quest: values.quest === "snes" || values.quest === "all",
    n64_quest: values.quest === "n64" || values.quest === "all",
  };

  try {
    setStatus("Saving store.");
    await apiRequest(apiUrl("/api/stores"), {
      method: "POST",
      body: JSON.stringify(payload),
    });

    clearAddStoreForm();
    closeModal("addStoreModal");
    showToast("Added to the Quest 🚀");
    setStatus("Store added successfully.");

    if (currentMode !== "stores") {
      showSearchSection("stores");
    }

    await fetchStores();
  } catch (error) {
    console.error("addStore failed:", error);
    setStatus(
      error instanceof Error
        ? `Error adding store: ${error.message}`
        : "Error adding store.",
    );
  }
}

async function addMedia(): Promise<void> {
  const values = getNewMediaFormValues();

  if (!values.title) {
    setStatus("Please enter a title for media.");
    return;
  }

  const payload = {
    title: values.title,
    media_type: values.media_type,
    format: values.format,
    genre: values.genre,
    platform: values.platform,
    year: values.year,
    company: values.company,
    location: values.location,
    website: values.website,
    notes: values.notes,
  };

  try {
    setStatus("Saving media.");

    await apiRequest(apiUrl("/api/media"), {
      method: "POST",
      body: JSON.stringify(payload),
    });

    clearAddMediaForm();
    closeModal("addMediaModal");
    showToast("Media added 🎬");
    setStatus("Media added successfully.");

    if (currentMode !== "media") {
      showSearchSection("media");
    }

    await fetchMedia();
  } catch (error) {
    console.error("addMedia failed:", error);
    setStatus(
      error instanceof Error
        ? `Error adding media: ${error.message}`
        : "Error adding media.",
    );
  }
}

async function addCrew(): Promise<void> {
  const values = getNewCrewFormValues();

  if (!values.name) {
    setStatus("Please enter a name for crew.");
    return;
  }

  const payload = {
    name: values.name,
    role: values.role,
    department: values.department,
    email: values.email,
    phone: values.phone,
    city: values.city,
    state: values.state,
    country: values.country,
    company: values.company,
    project: values.project,
    website: values.website,
    notes: values.notes,
  };

  try {
    setStatus("Saving crew.");

    await apiRequest(apiUrl("/api/crew"), {
      method: "POST",
      body: JSON.stringify(payload),
    });

    clearAddCrewForm();
    closeModal("addCrewModal");
    showToast("Crew added 🎥");
    setStatus("Crew added successfully.");

    if (currentMode !== "crew") {
      showSearchSection("crew");
    }

    await fetchCrew();
  } catch (error) {
    console.error("addCrew failed:", error);
    setStatus(
      error instanceof Error
        ? `Error adding crew: ${error.message}`
        : "Error adding crew.",
    );
  }
}

function attachAutoSearch(
  id: string,
  callback: () => void | Promise<void>,
  eventName: "input" | "change" = "input",
): void {
  document.getElementById(id)?.addEventListener(eventName, () => {
    void Promise.resolve(callback());
  });
}

function bindEvents(): void {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      await apiRequest(apiUrl("/api/auth/logout"), { method: "POST" });
      currentUser = null;
      renderAuthScreen();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Logout failed.");
    }
  });

  document.getElementById("musicToggleBtn")?.addEventListener("click", () => {
    playClick();
    toggleMusic();
  });

  const volumeSlider = document.getElementById(
    "volumeSlider",
  ) as HTMLInputElement | null;
  volumeSlider?.addEventListener("input", () => {
    const value = Number(volumeSlider.value) / 100;
    bgMusic.volume = value;
    clickSound.volume = Math.min(1, value + 0.25);
    updateVolumeLabel(value);
  });

  document.getElementById("modeStoresBtn")?.addEventListener("click", () => {
    playClick();
    showSearchSection("stores");
  });

  document.getElementById("modeMediaBtn")?.addEventListener("click", () => {
    playClick();
    showSearchSection("media");
  });

  document.getElementById("modeCrewBtn")?.addEventListener("click", () => {
    playClick();
    showSearchSection("crew");
  });

  document.getElementById("searchBtn")?.addEventListener("click", () => {
    playClick();
    void fetchStores();
  });
  document.getElementById("clearBtn")?.addEventListener("click", () => {
    playClick();
    clearStoreForm();
    setGridRows([]);
    setStatus("Store filters cleared.");
  });
  document.getElementById("loadAllBtn")?.addEventListener("click", () => {
    playClick();
    void loadAllStores();
  });

  document.getElementById("mediaSearchBtn")?.addEventListener("click", () => {
    playClick();
    void fetchMedia();
  });
  document.getElementById("mediaClearBtn")?.addEventListener("click", () => {
    playClick();
    clearMediaForm();
    setGridRows([]);
    setStatus("Media filters cleared.");
  });
  document.getElementById("mediaLoadAllBtn")?.addEventListener("click", () => {
    playClick();
    void loadAllMedia();
  });

  document.getElementById("crewSearchBtn")?.addEventListener("click", () => {
    playClick();
    void fetchCrew();
  });
  document.getElementById("crewClearBtn")?.addEventListener("click", () => {
    playClick();
    clearCrewForm();
    setGridRows([]);
    setStatus("Crew filters cleared.");
  });
  document.getElementById("crewLoadAllBtn")?.addEventListener("click", () => {
    playClick();
    void loadAllCrew();
  });

  document.getElementById("openModalBtn")?.addEventListener("click", () => {
    playClick();
    openModal("addStoreModal");
  });
  document
    .getElementById("closeAddStoreBtn")
    ?.addEventListener("click", () => closeModal("addStoreModal"));
  document
    .getElementById("cancelAddStoreBtn")
    ?.addEventListener("click", () => closeModal("addStoreModal"));
  document
    .getElementById("submitAddStoreBtn")
    ?.addEventListener("click", () => {
      playClick();
      void addStore();
    });

  document.getElementById("openAddMediaBtn")?.addEventListener("click", () => {
    playClick();
    openModal("addMediaModal");
  });
  document
    .getElementById("closeAddMediaBtn")
    ?.addEventListener("click", () => closeModal("addMediaModal"));
  document
    .getElementById("cancelAddMediaBtn")
    ?.addEventListener("click", () => closeModal("addMediaModal"));
  document
    .getElementById("submitAddMediaBtn")
    ?.addEventListener("click", () => {
      playClick();
      void addMedia();
    });

  document.getElementById("openAddCrewBtn")?.addEventListener("click", () => {
    playClick();
    openModal("addCrewModal");
  });
  document
    .getElementById("closeAddCrewBtn")
    ?.addEventListener("click", () => closeModal("addCrewModal"));
  document
    .getElementById("cancelAddCrewBtn")
    ?.addEventListener("click", () => closeModal("addCrewModal"));
  document.getElementById("submitAddCrewBtn")?.addEventListener("click", () => {
    playClick();
    void addCrew();
  });

  document
    .getElementById("closeStoreDetailBtn")
    ?.addEventListener("click", () => closeStoreDetailModal());

  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        (modal as HTMLElement).classList.add("hidden");
        (modal as HTMLElement).setAttribute("aria-hidden", "true");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal-overlay").forEach((modal) => {
        (modal as HTMLElement).classList.add("hidden");
        (modal as HTMLElement).setAttribute("aria-hidden", "true");
      });
    }
  });

  [
    "store_name",
    "address",
    "address_2",
    "city",
    "state",
    "zip",
    "phone_number",
  ].forEach((id) => attachAutoSearch(id, fetchStores));

  attachAutoSearch("country", fetchStores, "change");
  attachAutoSearch("quest_filter", fetchStores, "change");

  [
    "media_title",
    "media_type",
    "media_format",
    "media_genre",
    "media_platform",
    "media_year",
    "media_company",
    "media_location",
  ].forEach((id) => attachAutoSearch(id, fetchMedia));

  [
    "crew_name",
    "crew_role",
    "crew_department",
    "crew_email",
    "crew_phone",
    "crew_city",
    "crew_state",
    "crew_country",
    "crew_company",
    "crew_project",
  ].forEach((id) => attachAutoSearch(id, fetchCrew));
}

function initializeAppAfterRender(): void {
  ensureGridIsVisible();
  initGrid();
  bindEvents();
  updateMusicButton();
  updateVolumeLabel(bgMusic.volume);
  showSearchSection("stores");

  document.addEventListener(
    "click",
    () => {
      startMusic();
    },
    { once: true },
  );

  void loadAllStores();
}

async function boot(): Promise<void> {
  renderLoading();

  try {
    const me = await apiRequest<MeResponse>(apiUrl("/api/auth/me"));
    if ("ok" in me && me.ok) {
      currentUser = me.user;
      renderAppShell(me.user);
      initializeAppAfterRender();
      return;
    }
  } catch {
    // not logged in
  }

  renderAuthScreen();
}

void boot();
