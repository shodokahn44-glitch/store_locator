import {
  ModuleRegistry,
  AllCommunityModule,
  ColDef,
  createGrid,
  GridApi,
  GridOptions,
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

app.innerHTML = `
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

let currentMode: SearchMode = "stores";

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
        setStatus("Address copied to clipboard.");
      } catch (error) {
        console.error("Failed to copy address:", error);
        showToast("Copy failed");
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
      badgeImg.removeAttribute("src");
      badgeImg.alt = "";
      badgeImg.classList.add("hidden");
    }
  }

  if (sundayEl) sundayEl.textContent = getHoursValue(normalizedStore.sunday);
  if (mondayEl) mondayEl.textContent = getHoursValue(normalizedStore.monday);
  if (tuesdayEl) tuesdayEl.textContent = getHoursValue(normalizedStore.tuesday);
  if (wednesdayEl) {
    wednesdayEl.textContent = getHoursValue(normalizedStore.wednesday);
  }
  if (thursdayEl) {
    thursdayEl.textContent = getHoursValue(normalizedStore.thursday);
  }
  if (fridayEl) fridayEl.textContent = getHoursValue(normalizedStore.friday);
  if (saturdayEl) {
    saturdayEl.textContent = getHoursValue(normalizedStore.saturday);
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeStoreDetailModal(): void {
  const modal = document.getElementById("storeDetailModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function openAddStoreModal(): void {
  const modal = document.getElementById("addStoreModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  const firstInput = document.getElementById(
    "add_store_name",
  ) as HTMLInputElement | null;
  firstInput?.focus();
}

function closeAddStoreModal(): void {
  const modal = document.getElementById("addStoreModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function openAddMediaModal(): void {
  const modal = document.getElementById("addMediaModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  const firstInput = document.getElementById(
    "add_media_title",
  ) as HTMLInputElement | null;
  firstInput?.focus();
}

function closeAddMediaModal(): void {
  const modal = document.getElementById("addMediaModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function openAddCrewModal(): void {
  const modal = document.getElementById("addCrewModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  const firstInput = document.getElementById(
    "add_crew_name",
  ) as HTMLInputElement | null;
  firstInput?.focus();
}

function closeAddCrewModal(): void {
  const modal = document.getElementById("addCrewModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function createDefaultRenderer(field: string) {
  return (params: { value?: unknown; data?: GridRow }) => {
    const value =
      params.value ??
      (params.data && typeof params.data === "object"
        ? (params.data as Record<string, unknown>)[field]
        : "");

    return String(value ?? "");
  };
}

function createWebsiteRenderer(field: string) {
  return (params: { value?: unknown; data?: GridRow }) => {
    const raw =
      params.value ??
      (params.data && typeof params.data === "object"
        ? (params.data as Record<string, unknown>)[field]
        : "");

    const text = String(raw ?? "").trim();
    if (!text) return "";

    const link = document.createElement("a");
    link.href = buildWebsiteUrl(text);
    link.textContent = text;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "store-link";
    return link;
  };
}

const storeColumnDefs: ColDef<GridRow>[] = [
  {
    headerName: "Store Name",
    field: "store_name",
    sortable: true,
    filter: true,
    cellRenderer: (params: { value?: string; data?: GridRow }) => {
      const data = (params.data ?? {}) as StoreRow;
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = params.value ?? data.store_name ?? "";
      link.className = "store-link";

      link.addEventListener("click", (event) => {
        event.preventDefault();
        openStoreDetailModal(data);
      });

      return link;
    },
  },
  { headerName: "Address", field: "address", sortable: true, filter: true },
  {
    headerName: "Address 2",
    field: "address_2",
    sortable: true,
    filter: true,
    valueGetter: (params) => getAddress2Value((params.data ?? {}) as StoreRow),
  },
  { headerName: "City", field: "city", sortable: true, filter: true },
  { headerName: "State", field: "state", sortable: true, filter: true },
  { headerName: "Zip", field: "zip", sortable: true, filter: true },
  { headerName: "Phone", field: "phone_number", sortable: true, filter: true },
  { headerName: "Country", field: "country", sortable: true, filter: true },
];

const mediaColumnDefs: ColDef<GridRow>[] = [
  {
    headerName: "Title",
    field: "title",
    sortable: true,
    filter: true,
    valueGetter: (params) => {
      const row = (params.data ?? {}) as MediaRow;
      return row.title ?? row.media_title ?? "";
    },
  },
  {
    headerName: "Type",
    field: "type",
    sortable: true,
    filter: true,
    valueGetter: (params) => {
      const row = (params.data ?? {}) as MediaRow;
      return row.type ?? row.media_type ?? "";
    },
  },
  {
    headerName: "Format",
    field: "format",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("format"),
  },
  {
    headerName: "Genre",
    field: "genre",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("genre"),
  },
  {
    headerName: "Platform",
    field: "platform",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("platform"),
  },
  {
    headerName: "Year",
    field: "year",
    sortable: true,
    filter: true,
    valueGetter: (params) => {
      const row = (params.data ?? {}) as MediaRow;
      return row.year ?? row.release_year ?? "";
    },
  },
  {
    headerName: "Company",
    field: "company",
    sortable: true,
    filter: true,
    valueGetter: (params) => {
      const row = (params.data ?? {}) as MediaRow;
      return row.company ?? row.studio ?? row.publisher ?? "";
    },
  },
  {
    headerName: "Location",
    field: "location",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("location"),
  },
  {
    headerName: "Website",
    field: "website",
    sortable: true,
    filter: true,
    cellRenderer: createWebsiteRenderer("website"),
  },
];

const crewColumnDefs: ColDef<GridRow>[] = [
  {
    headerName: "Name",
    field: "name",
    sortable: true,
    filter: true,
    valueGetter: (params) => {
      const row = (params.data ?? {}) as CrewRow;
      return (
        row.name ??
        [row.first_name, row.last_name]
          .filter((v) => String(v ?? "").trim() !== "")
          .join(" ")
      );
    },
  },
  {
    headerName: "Role",
    field: "role",
    sortable: true,
    filter: true,
    valueGetter: (params) => {
      const row = (params.data ?? {}) as CrewRow;
      return row.role ?? row.title ?? "";
    },
  },
  {
    headerName: "Department",
    field: "department",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("department"),
  },
  {
    headerName: "Email",
    field: "email",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("email"),
  },
  {
    headerName: "Phone",
    field: "phone",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("phone"),
  },
  {
    headerName: "City",
    field: "city",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("city"),
  },
  {
    headerName: "State",
    field: "state",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("state"),
  },
  {
    headerName: "Country",
    field: "country",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("country"),
  },
  {
    headerName: "Company",
    field: "company",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("company"),
  },
  {
    headerName: "Project",
    field: "project",
    sortable: true,
    filter: true,
    cellRenderer: createDefaultRenderer("project"),
  },
];

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

let gridApi: GridApi<GridRow> | null = null;
const createdGridApi = createGrid(gridElement, gridOptions);

if (!createdGridApi) {
  throw new Error("AG Grid failed to initialize.");
}

gridApi = createdGridApi;

function setGridRows(rows: GridRow[]): void {
  if (!gridApi) {
    throw new Error("AG Grid API is not initialized.");
  }

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
    sizeColumnsToFit?: () => void;
  };

  if (typeof api.setGridOption === "function") {
    api.setGridOption("columnDefs", columnDefs);
  }

  requestAnimationFrame(() => {
    try {
      api.sizeColumnsToFit?.();
    } catch (error) {
      console.warn("Grid column resize failed:", error);
    }
  });
}

function setStatus(message: string): void {
  const status = document.getElementById("status");
  if (status) status.textContent = message;
}

function showToast(message: string): void {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  if (toastTimer !== null) window.clearTimeout(toastTimer);

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 5000);
}

function getStoreFormValues(): StoreFormValues {
  return {
    store_name: getInputValue("store_name"),
    address: getInputValue("address"),
    address_2: getInputValue("address_2"),
    city: getInputValue("city"),
    state: getInputValue("state"),
    zip: getInputValue("zip"),
    phone_number: getInputValue("phone_number"),
    country: getInputValue("country"),
    quest_filter: getInputValue("quest_filter"),
  };
}

function getMediaFormValues(): MediaFormValues {
  return {
    title: getInputValue("media_title"),
    media_type: getInputValue("media_type"),
    format: getInputValue("media_format"),
    genre: getInputValue("media_genre"),
    platform: getInputValue("media_platform"),
    year: getInputValue("media_year"),
    company: getInputValue("media_company"),
    location: getInputValue("media_location"),
  };
}

function getCrewFormValues(): CrewFormValues {
  return {
    name: getInputValue("crew_name"),
    role: getInputValue("crew_role"),
    department: getInputValue("crew_department"),
    email: getInputValue("crew_email"),
    phone: getInputValue("crew_phone"),
    city: getInputValue("crew_city"),
    state: getInputValue("crew_state"),
    country: getInputValue("crew_country"),
    company: getInputValue("crew_company"),
    project: getInputValue("crew_project"),
  };
}

function getNewStoreFormValues(): NewStoreFormValues {
  return {
    store_name: getInputValue("add_store_name"),
    address: getInputValue("add_address"),
    address_2: getInputValue("add_address_2"),
    city: getInputValue("add_city"),
    state: getInputValue("add_state"),
    zip: getInputValue("add_zip"),
    phone_number: getInputValue("add_phone_number"),
    country: getInputValue("add_country"),
    quest: getInputValue("add_quest"),
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
    title: getInputValue("add_media_title"),
    media_type: getInputValue("add_media_type"),
    format: getInputValue("add_media_format"),
    genre: getInputValue("add_media_genre"),
    platform: getInputValue("add_media_platform"),
    year: getInputValue("add_media_year"),
    company: getInputValue("add_media_company"),
    location: getInputValue("add_media_location"),
    website: getInputValue("add_media_website"),
    notes: getInputValue("add_media_notes"),
  };
}

function getNewCrewFormValues(): NewCrewFormValues {
  return {
    name: getInputValue("add_crew_name"),
    role: getInputValue("add_crew_role"),
    department: getInputValue("add_crew_department"),
    email: getInputValue("add_crew_email"),
    phone: getInputValue("add_crew_phone"),
    city: getInputValue("add_crew_city"),
    state: getInputValue("add_crew_state"),
    country: getInputValue("add_crew_country"),
    company: getInputValue("add_crew_company"),
    project: getInputValue("add_crew_project"),
    website: getInputValue("add_crew_website"),
    notes: getInputValue("add_crew_notes"),
  };
}

const STORE_SEARCH_FIELD_IDS = [
  "store_name",
  "address",
  "address_2",
  "city",
  "state",
  "zip",
  "phone_number",
  "country",
  "quest_filter",
];

const MEDIA_SEARCH_FIELD_IDS = [
  "media_title",
  "media_type",
  "media_format",
  "media_genre",
  "media_platform",
  "media_year",
  "media_company",
  "media_location",
];

const CREW_SEARCH_FIELD_IDS = [
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
];

const ADD_STORE_FIELD_IDS = [
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
];

const ADD_MEDIA_FIELD_IDS = [
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
];

const ADD_CREW_FIELD_IDS = [
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
];

function forceHideSection(section: HTMLElement | null): void {
  if (!section) return;
  section.classList.add("hidden");
  section.style.display = "none";
}

function forceShowSection(section: HTMLElement | null): void {
  if (!section) return;
  section.classList.remove("hidden");
  section.style.display = "block";
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
  setStatus("Loading stores...");

  try {
    const params = new URLSearchParams();
    const values = getStoreFormValues();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== "") params.append(key, value);
    });

    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE}/api/stores?${queryString}`
      : `${API_BASE}/api/stores`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const parsed = (await response.json()) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("API response was not an array.");
    }

    const data = parsed.map((row) => normalizeStoreRow(row as StoreRow));

    setGridColumns(storeColumnDefs);
    setGridRows(data);
    setStatus(`${data.length} store(s) found.`);
  } catch (error) {
    console.error("fetchStores failed:", error);
    setStatus(
      error instanceof Error
        ? `Error loading store data: ${error.message}`
        : "Error loading store data.",
    );
  }
}

async function fetchMedia(): Promise<void> {
  setStatus("Loading media...");

  try {
    const params = new URLSearchParams();
    const values = getMediaFormValues();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== "") params.append(key, value);
    });

    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE}/api/media?${queryString}`
      : `${API_BASE}/api/media`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const parsed = (await response.json()) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("API response was not an array.");
    }

    const data = parsed.map((row) => normalizeMediaRow(row as MediaRow));

    setGridColumns(mediaColumnDefs);
    setGridRows(data);
    setStatus(`${data.length} media record(s) found.`);
  } catch (error) {
    console.error("fetchMedia failed:", error);
    setStatus(
      error instanceof Error
        ? `Error loading media data: ${error.message}`
        : "Error loading media data.",
    );
  }
}

async function fetchCrew(): Promise<void> {
  setStatus("Loading crew...");

  try {
    const params = new URLSearchParams();
    const values = getCrewFormValues();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== "") params.append(key, value);
    });

    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE}/api/crew?${queryString}`
      : `${API_BASE}/api/crew`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const parsed = (await response.json()) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("API response was not an array.");
    }

    const data = parsed.map((row) => normalizeCrewRow(row as CrewRow));

    setGridColumns(crewColumnDefs);
    setGridRows(data);
    setStatus(`${data.length} crew record(s) found.`);
  } catch (error) {
    console.error("fetchCrew failed:", error);
    setStatus(
      error instanceof Error
        ? `Error loading crew data: ${error.message}`
        : "Error loading crew data.",
    );
  }
}

function clearStoreForm(): void {
  STORE_SEARCH_FIELD_IDS.forEach((id) => setInputValue(id, ""));
}

function clearMediaForm(): void {
  MEDIA_SEARCH_FIELD_IDS.forEach((id) => setInputValue(id, ""));
}

function clearCrewForm(): void {
  CREW_SEARCH_FIELD_IDS.forEach((id) => setInputValue(id, ""));
}

function clearAddStoreForm(): void {
  ADD_STORE_FIELD_IDS.forEach((id) => setInputValue(id, ""));
  setInputValue("add_country", "");
  setInputValue("add_quest", "");
}

function clearAddMediaForm(): void {
  ADD_MEDIA_FIELD_IDS.forEach((id) => setInputValue(id, ""));
}

function clearAddCrewForm(): void {
  ADD_CREW_FIELD_IDS.forEach((id) => setInputValue(id, ""));
}

async function addStore(): Promise<void> {
  const values = getNewStoreFormValues();

  if (
    !values.store_name ||
    !values.address ||
    !values.city ||
    !values.state ||
    !values.zip ||
    !values.phone_number ||
    !values.country
  ) {
    setStatus("Please fill out all Join the Quest fields.");
    return;
  }

  let nes = false;
  let snes = false;
  let n64 = false;

  switch (values.quest) {
    case "nes":
      nes = true;
      break;
    case "snes":
      snes = true;
      break;
    case "n64":
      n64 = true;
      break;
    case "all":
      nes = true;
      snes = true;
      n64 = true;
      break;
  }

  const payload = {
    store_name: values.store_name,
    address: values.address,
    address_2: values.address_2 || "",
    city: values.city,
    state: values.state,
    zip: values.zip,
    phone_number: values.phone_number,
    country: values.country,
    nes_quest: nes,
    snes_quest: snes,
    n64_quest: n64,
    sunday: values.sunday_hours,
    monday: values.monday_hours,
    tuesday: values.tuesday_hours,
    wednesday: values.wednesday_hours,
    thursday: values.thursday_hours,
    friday: values.friday_hours,
    saturday: values.saturday_hours,
  };

  try {
    setStatus("Saving store...");

    const res = await fetch(`${API_BASE}/api/stores`, {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${rawText}`);
    }

    const result = rawText ? JSON.parse(rawText) : {};

    clearAddStoreForm();
    closeAddStoreModal();
    showToast("Added to the Quest 🚀");
    setStatus(
      result?.store_id !== undefined
        ? `Store added successfully. Store ID: ${result.store_id}`
        : "Store added successfully.",
    );

    if (currentMode !== "stores") {
      showSearchSection("stores");
    }

    await fetchStores();
  } catch (err) {
    console.error("addStore failed:", err);
    setStatus(
      err instanceof Error
        ? `Error adding store: ${err.message}`
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
    setStatus("Saving media...");

    const res = await fetch(`${API_BASE}/api/media`, {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${rawText}`);
    }

    clearAddMediaForm();
    closeAddMediaModal();
    showToast("Media added 🎬");
    setStatus("Media added successfully.");

    if (currentMode !== "media") {
      showSearchSection("media");
    }

    await fetchMedia();
  } catch (err) {
    console.error("addMedia failed:", err);
    setStatus(
      err instanceof Error
        ? `Error adding media: ${err.message}`
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
    setStatus("Saving crew...");

    const res = await fetch(`${API_BASE}/api/crew`, {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${rawText}`);
    }

    clearAddCrewForm();
    closeAddCrewModal();
    showToast("Crew added 🎥");
    setStatus("Crew added successfully.");

    if (currentMode !== "crew") {
      showSearchSection("crew");
    }

    await fetchCrew();
  } catch (err) {
    console.error("addCrew failed:", err);
    setStatus(
      err instanceof Error
        ? `Error adding crew: ${err.message}`
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
  startMusic();
  playClick();
  void fetchStores();
});

document.getElementById("clearBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  clearStoreForm();
  setGridRows([]);
  setStatus("Store filters cleared.");
});

document.getElementById("loadAllBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  clearStoreForm();
  void fetchStores();
});

document.getElementById("mediaSearchBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  void fetchMedia();
});

document.getElementById("mediaClearBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  clearMediaForm();
  setGridRows([]);
  setStatus("Media filters cleared.");
});

document.getElementById("mediaLoadAllBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  clearMediaForm();
  void fetchMedia();
});

document.getElementById("crewSearchBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  void fetchCrew();
});

document.getElementById("crewClearBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  clearCrewForm();
  setGridRows([]);
  setStatus("Crew filters cleared.");
});

document.getElementById("crewLoadAllBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  clearCrewForm();
  void fetchCrew();
});

document.getElementById("openModalBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  openAddStoreModal();
});

document.getElementById("openAddMediaBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  openAddMediaModal();
});

document.getElementById("openAddCrewBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  openAddCrewModal();
});

document.getElementById("submitAddStoreBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  void addStore();
});

document.getElementById("submitAddMediaBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  void addMedia();
});

document.getElementById("submitAddCrewBtn")?.addEventListener("click", () => {
  startMusic();
  playClick();
  void addCrew();
});

document.getElementById("cancelAddStoreBtn")?.addEventListener("click", () => {
  playClick();
  closeAddStoreModal();
});

document.getElementById("closeAddStoreBtn")?.addEventListener("click", () => {
  playClick();
  closeAddStoreModal();
});

document.getElementById("cancelAddMediaBtn")?.addEventListener("click", () => {
  playClick();
  closeAddMediaModal();
});

document.getElementById("closeAddMediaBtn")?.addEventListener("click", () => {
  playClick();
  closeAddMediaModal();
});

document.getElementById("cancelAddCrewBtn")?.addEventListener("click", () => {
  playClick();
  closeAddCrewModal();
});

document.getElementById("closeAddCrewBtn")?.addEventListener("click", () => {
  playClick();
  closeAddCrewModal();
});

document
  .getElementById("closeStoreDetailBtn")
  ?.addEventListener("click", () => {
    playClick();
    closeStoreDetailModal();
  });

document.getElementById("addStoreModal")?.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeAddStoreModal();
});

document.getElementById("addMediaModal")?.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeAddMediaModal();
});

document.getElementById("addCrewModal")?.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeAddCrewModal();
});

document
  .getElementById("storeDetailModal")
  ?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeStoreDetailModal();
  });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAddStoreModal();
    closeAddMediaModal();
    closeAddCrewModal();
    closeStoreDetailModal();
  }
});

document.getElementById("musicToggleBtn")?.addEventListener("click", () => {
  playClick();
  toggleMusic();
});

(
  document.getElementById("volumeSlider") as HTMLInputElement | null
)?.addEventListener("input", (e) => {
  const target = e.target as HTMLInputElement;
  const volume = Number(target.value) / 100;

  bgMusic.volume = volume;
  updateVolumeLabel(volume);

  if (volume === 0) {
    bgMusic.pause();
    musicMuted = true;
  } else {
    musicMuted = false;
  }

  updateMusicButton();
});

// Store autosearch
attachAutoSearch("store_name", fetchStores);
attachAutoSearch("address", fetchStores);
attachAutoSearch("address_2", fetchStores);
attachAutoSearch("city", fetchStores);
attachAutoSearch("state", fetchStores);
attachAutoSearch("zip", fetchStores);
attachAutoSearch("phone_number", fetchStores);
attachAutoSearch("country", fetchStores, "change");
attachAutoSearch("quest_filter", fetchStores, "change");

// Media autosearch
attachAutoSearch("media_title", fetchMedia);
attachAutoSearch("media_type", fetchMedia);
attachAutoSearch("media_format", fetchMedia);
attachAutoSearch("media_genre", fetchMedia);
attachAutoSearch("media_platform", fetchMedia);
attachAutoSearch("media_year", fetchMedia);
attachAutoSearch("media_company", fetchMedia);
attachAutoSearch("media_location", fetchMedia);

// Crew autosearch
attachAutoSearch("crew_name", fetchCrew);
attachAutoSearch("crew_role", fetchCrew);
attachAutoSearch("crew_department", fetchCrew);
attachAutoSearch("crew_email", fetchCrew);
attachAutoSearch("crew_phone", fetchCrew);
attachAutoSearch("crew_city", fetchCrew);
attachAutoSearch("crew_state", fetchCrew);
attachAutoSearch("crew_country", fetchCrew);
attachAutoSearch("crew_company", fetchCrew);
attachAutoSearch("crew_project", fetchCrew);

function bootstrap(): void {
  ensureGridIsVisible();
  updateMusicButton();
  updateVolumeLabel(bgMusic.volume);
  showSearchSection("stores");

  requestAnimationFrame(() => {
    void fetchStores();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
