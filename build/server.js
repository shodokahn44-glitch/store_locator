"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ag_grid_community_1 = require("ag-grid-community");
require("ag-grid-community/styles/ag-grid.css");
require("ag-grid-community/styles/ag-theme-alpine.css");
require("./styles.css");
const nesQuestParticipant = "/nesQuestParticipant.png";
const n64QuestParticipant = "/n64QuestParticipant.png";
const snesQuestParticipant = "/snesQuestParticipant.png";
const allQuestParticipant = "/allQuestParticipant.png";
/**
 * Security hardening:
 * - force HTTPS on production domain
 * - upgrade any accidental insecure asset requests
 */
if (window.location.hostname === "nathansalyer.com" ||
    window.location.hostname === "www.nathansalyer.com") {
    if (window.location.protocol !== "https:") {
        window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`);
    }
}
function ensureSecurityMetaTag() {
    const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existing)
        return;
    const meta = document.createElement("meta");
    meta.httpEquiv = "Content-Security-Policy";
    meta.content = "upgrade-insecure-requests; block-all-mixed-content;";
    document.head.appendChild(meta);
}
ensureSecurityMetaTag();
const API_BASE = window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://store-locator-api-5stv.onrender.com";
function assetUrl(path) {
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
function playClick() {
    clickSound.currentTime = 0;
    void clickSound.play().catch(() => { });
}
let musicStarted = false;
let musicMuted = false;
let toastTimer = null;
function startMusic() {
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
function toggleMusic() {
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
    }
    else {
        bgMusic.pause();
        musicMuted = true;
        updateMusicButton();
    }
}
function updateMusicButton() {
    const btn = document.getElementById("musicToggleBtn");
    if (!btn)
        return;
    btn.textContent = bgMusic.paused ? "Music: Off" : "Music: On";
}
function updateVolumeLabel(value) {
    const label = document.getElementById("volumeValue");
    if (!label)
        return;
    label.textContent = `${Math.round(value * 100)}%`;
}
const app = document.querySelector("#app");
if (!app) {
    throw new Error("App element not found.");
}
app.innerHTML = `
  <div class="page retro-shell">
    <header class="page-hero">
      <div class="hero-logo-wrap">
        <img src="${assetUrl("/logo.png")}" alt="Neo Retro Store Locator" class="hero-logo" />
      </div>
      <p class="hero-tagline">Search stores, add new locations, and keep the catalog synced.</p>
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
        <h2>Search Stores</h2>

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
              <option value="">All Quests</option>
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
              <div><strong>Sunday:</strong> <span id="detail_sunday_hours"></span></div>
              <div><strong>Monday:</strong> <span id="detail_monday_hours"></span></div>
              <div><strong>Tuesday:</strong> <span id="detail_tuesday_hours"></span></div>
              <div><strong>Wednesday:</strong> <span id="detail_wednesday_hours"></span></div>
              <div><strong>Thursday:</strong> <span id="detail_thursday_hours"></span></div>
              <div><strong>Friday:</strong> <span id="detail_friday_hours"></span></div>
              <div><strong>Saturday:</strong> <span id="detail_saturday_hours"></span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
function formatAddress(store) {
    return [
        store.address,
        store.address_2,
        store.city,
        store.state,
        store.zip,
        store.country,
    ]
        .filter(Boolean)
        .map((part) => String(part).trim())
        .join(", ");
}
function buildGoogleMapsLink(store) {
    const fullAddress = formatAddress(store);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
}
function buildGoogleMapsDirectionsLink(store) {
    const fullAddress = formatAddress(store);
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
}
function buildWebsiteUrl(website) {
    if (!website)
        return "#";
    const trimmed = website.trim();
    if (!trimmed)
        return "#";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
    }
    return `https://${trimmed}`;
}
function getHoursValue(value) {
    return value && value.trim() ? value : "Not Available";
}
function getInputValue(id) {
    const element = document.getElementById(id);
    return element?.value ?? "";
}
function buildDayHours(openId, closeId) {
    const open = getInputValue(openId).trim();
    const close = getInputValue(closeId).trim();
    if (!open && !close)
        return "";
    if (open && close)
        return `${open} - ${close}`;
    if (open)
        return `Opens at ${open}`;
    return `Closes at ${close}`;
}
function getQuestBadgeSrc(store) {
    const nes = store.nes_quest === true;
    const n64 = store.n64_quest === true;
    const snes = store.snes_quest === true;
    if (nes && n64 && snes)
        return allQuestParticipant;
    if (snes)
        return snesQuestParticipant;
    if (n64)
        return n64QuestParticipant;
    if (nes)
        return nesQuestParticipant;
    return null;
}
function getQuestBadgeAlt(store) {
    const nes = store.nes_quest === true;
    const n64 = store.n64_quest === true;
    const snes = store.snes_quest === true;
    if (nes && n64 && snes) {
        return "Nintendo Quest, Super Nintendo Quest, and Nintendo 64 Quest Participant";
    }
    if (snes)
        return "Super Nintendo Quest Participant";
    if (n64)
        return "Nintendo 64 Quest Participant";
    if (nes)
        return "Nintendo Quest Participant";
    return "Quest Participant";
}
function openStoreDetailModal(store) {
    const modal = document.getElementById("storeDetailModal");
    if (!modal)
        return;
    const addressLink = document.getElementById("detail_address_link");
    const phoneLink = document.getElementById("detail_phone_link");
    const websiteLink = document.getElementById("detail_website_link");
    const directionsBtn = document.getElementById("detail_directions_btn");
    const copyBtn = document.getElementById("detail_copy_btn");
    const badgeImg = document.getElementById("detail_quest_badge");
    const storeNameEl = document.getElementById("detail_store_name");
    const sundayEl = document.getElementById("detail_sunday_hours");
    const mondayEl = document.getElementById("detail_monday_hours");
    const tuesdayEl = document.getElementById("detail_tuesday_hours");
    const wednesdayEl = document.getElementById("detail_wednesday_hours");
    const thursdayEl = document.getElementById("detail_thursday_hours");
    const fridayEl = document.getElementById("detail_friday_hours");
    const saturdayEl = document.getElementById("detail_saturday_hours");
    const fullAddress = formatAddress(store);
    const mapsUrl = fullAddress ? buildGoogleMapsLink(store) : "#";
    const directionsUrl = fullAddress ? buildGoogleMapsDirectionsLink(store) : "#";
    const badgeSrc = getQuestBadgeSrc(store);
    const websiteUrl = buildWebsiteUrl(store.website);
    const phoneNumber = store.phone_number?.trim() ?? "";
    const phoneHref = phoneNumber ? `tel:${phoneNumber.replace(/[^\d+]/g, "")}` : "#";
    const websiteText = store.website?.trim() ?? "";
    if (storeNameEl)
        storeNameEl.textContent = store.store_name ?? "";
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
            if (!fullAddress)
                return;
            window.location.href = directionsUrl;
        };
    }
    if (copyBtn) {
        copyBtn.disabled = !fullAddress;
        copyBtn.onclick = async () => {
            if (!fullAddress)
                return;
            try {
                await navigator.clipboard.writeText(fullAddress);
                showToast("Address copied 📋");
                setStatus("Address copied to clipboard.");
            }
            catch (error) {
                console.error("Failed to copy address:", error);
                showToast("Copy failed");
                setStatus("Could not copy address.");
            }
        };
    }
    if (badgeImg) {
        if (badgeSrc) {
            badgeImg.src = badgeSrc;
            badgeImg.alt = getQuestBadgeAlt(store);
            badgeImg.classList.remove("hidden");
        }
        else {
            badgeImg.removeAttribute("src");
            badgeImg.alt = "";
            badgeImg.classList.add("hidden");
        }
    }
    if (sundayEl)
        sundayEl.textContent = getHoursValue(store.sunday);
    if (mondayEl)
        mondayEl.textContent = getHoursValue(store.monday);
    if (tuesdayEl)
        tuesdayEl.textContent = getHoursValue(store.tuesday);
    if (wednesdayEl)
        wednesdayEl.textContent = getHoursValue(store.wednesday);
    if (thursdayEl)
        thursdayEl.textContent = getHoursValue(store.thursday);
    if (fridayEl)
        fridayEl.textContent = getHoursValue(store.friday);
    if (saturdayEl)
        saturdayEl.textContent = getHoursValue(store.saturday);
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}
function closeStoreDetailModal() {
    const modal = document.getElementById("storeDetailModal");
    if (!modal)
        return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}
const columnDefs = [
    {
        headerName: "Store Name",
        field: "store_name",
        sortable: true,
        filter: true,
        cellRenderer: (params) => {
            const link = document.createElement("a");
            link.href = "#";
            link.textContent = params.value ?? "";
            link.className = "store-link";
            link.addEventListener("click", (event) => {
                event.preventDefault();
                if (params.data)
                    openStoreDetailModal(params.data);
            });
            return link;
        },
    },
    { headerName: "Address", field: "address", sortable: true, filter: true },
    { headerName: "City", field: "city", sortable: true, filter: true },
    { headerName: "State", field: "state", sortable: true, filter: true },
    { headerName: "Zip", field: "zip", sortable: true, filter: true },
    { headerName: "Phone", field: "phone_number", sortable: true, filter: true },
    { headerName: "Country", field: "country", sortable: true, filter: true },
];
const gridElement = document.querySelector("#storeGrid");
if (!gridElement)
    throw new Error("Grid element not found.");
const gridOptions = {
    columnDefs,
    rowData: [],
    pagination: true,
    paginationPageSize: 25,
    defaultColDef: {
        resizable: true,
    },
};
const gridApi = (0, ag_grid_community_1.createGrid)(gridElement, gridOptions);
function setGridRows(rows) {
    const api = gridApi;
    if (typeof api.setGridOption === "function") {
        api.setGridOption("rowData", rows);
        return;
    }
    if (typeof api.setRowData === "function") {
        api.setRowData(rows);
        return;
    }
    console.error("No supported AG Grid row update method found.");
}
function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element)
        element.value = value;
}
function setStatus(message) {
    const status = document.getElementById("status");
    if (status)
        status.textContent = message;
}
function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast)
        return;
    toast.textContent = message;
    toast.classList.add("show");
    if (toastTimer !== null)
        window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        toast.classList.remove("show");
    }, 5000);
}
function openAddStoreModal() {
    const modal = document.getElementById("addStoreModal");
    if (!modal)
        return;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    const firstInput = document.getElementById("add_store_name");
    firstInput?.focus();
}
function closeAddStoreModal() {
    const modal = document.getElementById("addStoreModal");
    if (!modal)
        return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}
function getFormValues() {
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
function getNewStoreFormValues() {
    return {
        store_name: getInputValue("add_store_name"),
        address: getInputValue("add_address"),
        address_2: getInputValue("add_address_2"),
        city: getInputValue("add_city"),
        state: getInputValue("add_state"),
        zip: getInputValue("add_zip"),
        phone_number: getInputValue("add_phone_number"),
        country: getInputValue("add_country"),
        sunday_hours: buildDayHours("add_sun_open", "add_sun_close"),
        monday_hours: buildDayHours("add_mon_open", "add_mon_close"),
        tuesday_hours: buildDayHours("add_tue_open", "add_tue_close"),
        wednesday_hours: buildDayHours("add_wed_open", "add_wed_close"),
        thursday_hours: buildDayHours("add_thu_open", "add_thu_close"),
        friday_hours: buildDayHours("add_fri_open", "add_fri_close"),
        saturday_hours: buildDayHours("add_sat_open", "add_sat_close"),
    };
}
const SEARCH_FIELD_IDS = [
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
const ADD_FIELD_IDS = [
    "add_store_name",
    "add_address",
    "add_address_2",
    "add_city",
    "add_state",
    "add_zip",
    "add_phone_number",
    "add_country",
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
async function fetchStores() {
    setStatus("Loading...");
    try {
        const params = new URLSearchParams();
        const values = getFormValues();
        Object.entries(values).forEach(([key, value]) => {
            if (value !== "")
                params.append(key, value);
        });
        const queryString = params.toString();
        const url = queryString
            ? `${API_BASE}/api/stores?${queryString}`
            : `${API_BASE}/api/stores`;
        const response = await fetch(url, {
            method: "GET",
            mode: "cors",
            credentials: "omit",
        });
        if (!response.ok)
            throw new Error("Failed to fetch stores");
        const data = (await response.json());
        setGridRows(data);
        setStatus(`${data.length} store(s) found.`);
    }
    catch (error) {
        console.error(error);
        setStatus("Error loading store data.");
    }
}
function clearForm() {
    SEARCH_FIELD_IDS.forEach((id) => setInputValue(id, ""));
    setGridRows([]);
    setStatus("Filters cleared.");
}
function clearAddForm() {
    ADD_FIELD_IDS.forEach((id) => setInputValue(id, ""));
}
function loadAllStores() {
    clearForm();
    void fetchStores();
}
async function addStore() {
    const values = getNewStoreFormValues();
    if (!values.store_name ||
        !values.address ||
        !values.city ||
        !values.state ||
        !values.zip ||
        !values.phone_number ||
        !values.country) {
        setStatus("Please fill out all Join the Quest fields.");
        return;
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
            mode: "cors",
            credentials: "omit",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok) {
            setStatus(result.error || "Failed to add store.");
            return;
        }
        clearAddForm();
        closeAddStoreModal();
        showToast("Added to the Quest 🚀");
        setStatus(`Store added successfully. Store ID: ${result.store_id}`);
        await fetchStores();
    }
    catch (err) {
        console.error(err);
        setStatus("Error adding store.");
    }
}
function attachAutoSearch(id, eventName = "input") {
    document.getElementById(id)?.addEventListener(eventName, () => {
        void fetchStores();
    });
}
document.getElementById("searchBtn")?.addEventListener("click", () => {
    startMusic();
    playClick();
    void fetchStores();
});
document.getElementById("clearBtn")?.addEventListener("click", () => {
    startMusic();
    playClick();
    clearForm();
});
document.getElementById("loadAllBtn")?.addEventListener("click", () => {
    startMusic();
    playClick();
    loadAllStores();
});
document.getElementById("openModalBtn")?.addEventListener("click", () => {
    startMusic();
    playClick();
    openAddStoreModal();
});
document.getElementById("submitAddStoreBtn")?.addEventListener("click", () => {
    startMusic();
    playClick();
    void addStore();
});
document.getElementById("cancelAddStoreBtn")?.addEventListener("click", () => {
    playClick();
    closeAddStoreModal();
});
document.getElementById("closeAddStoreBtn")?.addEventListener("click", () => {
    playClick();
    closeAddStoreModal();
});
document.getElementById("closeStoreDetailBtn")?.addEventListener("click", () => {
    playClick();
    closeStoreDetailModal();
});
document.getElementById("addStoreModal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget)
        closeAddStoreModal();
});
document.getElementById("storeDetailModal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget)
        closeStoreDetailModal();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeAddStoreModal();
        closeStoreDetailModal();
    }
});
document.getElementById("musicToggleBtn")?.addEventListener("click", () => {
    playClick();
    toggleMusic();
});
document.getElementById("volumeSlider")?.addEventListener("input", (e) => {
    const target = e.target;
    const volume = Number(target.value) / 100;
    bgMusic.volume = volume;
    updateVolumeLabel(volume);
    if (volume === 0) {
        bgMusic.pause();
        musicMuted = true;
    }
    else {
        musicMuted = false;
    }
    updateMusicButton();
});
attachAutoSearch("store_name");
attachAutoSearch("address");
attachAutoSearch("address_2");
attachAutoSearch("city");
attachAutoSearch("state");
attachAutoSearch("zip");
attachAutoSearch("phone_number");
attachAutoSearch("country", "change");
attachAutoSearch("quest_filter", "change");
updateMusicButton();
updateVolumeLabel(bgMusic.volume);
setTimeout(() => {
    loadAllStores();
}, 750);
