"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
// @ts-ignore
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongodb_1 = require("mongodb");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI || "";
const DB_NAME = process.env.MONGO_DB_NAME || "backend";
const STORE_COLLECTION_NAME = process.env.COLLECTION_NAME ||
    process.env.MONGO_COLLECTION_NAME ||
    "store_info";
const MEDIA_COLLECTION_NAME = process.env.MEDIA_COLLECTION_NAME || "media_info";
const CREW_COLLECTION_NAME = process.env.CREW_COLLECTION_NAME || "crew_info";
if (!MONGO_URI) {
    throw new Error("Missing MONGO_URI in environment variables.");
}
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "retro-secret-change-me",
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({
        mongoUrl: MONGO_URI,
        dbName: DB_NAME,
        collectionName: "sessions",
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
    },
}));
const appRoot = path_1.default.resolve();
app.use(express_1.default.static(path_1.default.join(appRoot, "dist")));
let client;
let db;
let usersCollection;
let storesCollection;
let mediaCollection;
let crewCollection;
async function connectToMongo() {
    client = new mongodb_1.MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    usersCollection = db.collection("users");
    storesCollection = db.collection(STORE_COLLECTION_NAME);
    mediaCollection = db.collection(MEDIA_COLLECTION_NAME);
    crewCollection = db.collection(CREW_COLLECTION_NAME);
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    console.log(`Connected to MongoDB database "${DB_NAME}"`);
    console.log(`Stores collection: "${STORE_COLLECTION_NAME}"`);
    console.log(`Media collection: "${MEDIA_COLLECTION_NAME}"`);
    console.log(`Crew collection: "${CREW_COLLECTION_NAME}"`);
}
function requireAuth(req, res, next) {
    if (!req.session.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildContainsFilter(value) {
    if (!value || !value.trim())
        return undefined;
    return { $regex: escapeRegex(value.trim()), $options: "i" };
}
function normalizeString(value) {
    return String(value ?? "").trim();
}
function normalizeBoolean(value) {
    return value === true || value === "true" || value === 1 || value === "1";
}
function getAddress2Value(store) {
    return normalizeString(store.address_2 ?? store["address 2"]);
}
function normalizeQuestFlags(store) {
    return {
        nes_quest: normalizeBoolean(store.nes_quest ?? store.nintendo_quest),
        snes_quest: normalizeBoolean(store.snes_quest ?? store.super_nintendo_quest),
        n64_quest: normalizeBoolean(store.n64_quest),
    };
}
function normalizeStoreDocument(doc) {
    const questFlags = normalizeQuestFlags(doc);
    return {
        _id: doc._id ? String(doc._id) : undefined,
        store_id: typeof doc.store_id === "number"
            ? doc.store_id
            : doc.store_id !== undefined
                ? Number(doc.store_id)
                : undefined,
        store_name: normalizeString(doc.store_name),
        address: normalizeString(doc.address),
        address_2: getAddress2Value(doc),
        city: normalizeString(doc.city),
        state: normalizeString(doc.state),
        zip: normalizeString(doc.zip),
        phone_number: normalizeString(doc.phone_number),
        country: normalizeString(doc.country),
        sunday: normalizeString(doc.sunday),
        monday: normalizeString(doc.monday),
        tuesday: normalizeString(doc.tuesday),
        wednesday: normalizeString(doc.wednesday),
        thursday: normalizeString(doc.thursday),
        friday: normalizeString(doc.friday),
        saturday: normalizeString(doc.saturday),
        website: normalizeString(doc.website),
        nes_quest: questFlags.nes_quest,
        snes_quest: questFlags.snes_quest,
        n64_quest: questFlags.n64_quest,
    };
}
function normalizeMediaDocument(doc) {
    return {
        _id: doc._id ? String(doc._id) : undefined,
        title: normalizeString(doc.title),
        media_title: normalizeString(doc.media_title),
        type: normalizeString(doc.type),
        media_type: normalizeString(doc.media_type),
        format: normalizeString(doc.format),
        genre: normalizeString(doc.genre),
        platform: normalizeString(doc.platform),
        year: normalizeString(doc.year),
        release_year: normalizeString(doc.release_year),
        company: normalizeString(doc.company),
        studio: normalizeString(doc.studio),
        publisher: normalizeString(doc.publisher),
        location: normalizeString(doc.location),
        notes: normalizeString(doc.notes),
        website: normalizeString(doc.website),
        image: normalizeString(doc.image),
    };
}
function normalizeCrewDocument(doc) {
    return {
        _id: doc._id ? String(doc._id) : undefined,
        name: normalizeString(doc.name),
        first_name: normalizeString(doc.first_name),
        last_name: normalizeString(doc.last_name),
        role: normalizeString(doc.role),
        title: normalizeString(doc.title),
        department: normalizeString(doc.department),
        email: normalizeString(doc.email),
        phone: normalizeString(doc.phone),
        city: normalizeString(doc.city),
        state: normalizeString(doc.state),
        country: normalizeString(doc.country),
        company: normalizeString(doc.company),
        project: normalizeString(doc.project),
        notes: normalizeString(doc.notes),
        website: normalizeString(doc.website),
    };
}
async function getNextStoreId() {
    const lastStore = await storesCollection
        .find({}, { projection: { store_id: 1 } })
        .sort({ store_id: -1 })
        .limit(1)
        .toArray();
    const highestRaw = lastStore[0]?.store_id;
    const highest = typeof highestRaw === "number"
        ? highestRaw
        : highestRaw !== undefined
            ? Number(highestRaw)
            : 0;
    return Number.isFinite(highest) ? highest + 1 : 1;
}
function buildQuestFilter(questFilter) {
    switch (questFilter) {
        case "nes_quest":
            return {
                $or: [{ nes_quest: true }, { nintendo_quest: true }],
            };
        case "snes_quest":
            return {
                $or: [{ snes_quest: true }, { super_nintendo_quest: true }],
            };
        case "n64_quest":
            return {
                $or: [{ n64_quest: true }],
            };
        default:
            return null;
    }
}
// HEALTH
app.get("/health", async (_req, res) => {
    try {
        await db.command({ ping: 1 });
        res.status(200).json({
            ok: true,
            db: DB_NAME,
            storesCollection: STORE_COLLECTION_NAME,
            mediaCollection: MEDIA_COLLECTION_NAME,
            crewCollection: CREW_COLLECTION_NAME,
        });
    }
    catch (error) {
        console.error("Health check failed:", error);
        res.status(500).json({
            ok: false,
            error: "Database unavailable.",
        });
    }
});
// AUTH
app.post("/api/auth/register", async (req, res) => {
    try {
        const username = normalizeString(req.body?.username);
        const email = normalizeString(req.body?.email).toLowerCase();
        const password = String(req.body?.password ?? "");
        if (!username || !email || !password) {
            return res.status(400).json({
                error: "Username, email, and password are required.",
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters.",
            });
        }
        const existing = await usersCollection.findOne({
            $or: [{ email }, { username }],
        });
        if (existing) {
            return res.status(409).json({
                error: "A user with that email or username already exists.",
            });
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        const result = await usersCollection.insertOne({
            username,
            email,
            password: hash,
            createdAt: new Date(),
        });
        req.session.user = {
            id: String(result.insertedId),
            username,
            email,
        };
        return res.status(200).json({
            ok: true,
            user: req.session.user,
        });
    }
    catch (error) {
        console.error("Register failed:", error);
        return res.status(500).json({ error: "Register failed." });
    }
});
app.post("/api/auth/login", async (req, res) => {
    try {
        const email = normalizeString(req.body?.email).toLowerCase();
        const password = String(req.body?.password ?? "");
        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required.",
            });
        }
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password." });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: "Invalid email or password." });
        }
        req.session.user = {
            id: String(user._id),
            username: user.username,
            email: user.email,
        };
        return res.status(200).json({
            ok: true,
            user: req.session.user,
        });
    }
    catch (error) {
        console.error("Login failed:", error);
        return res.status(500).json({ error: "Login failed." });
    }
});
app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    return res.status(200).json({
        ok: true,
        user: req.session.user,
    });
});
app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error("Logout failed:", error);
            return res.status(500).json({ error: "Logout failed." });
        }
        res.clearCookie("connect.sid");
        return res.status(200).json({ ok: true });
    });
});
// STORES
app.get("/api/stores", async (req, res) => {
    try {
        const { store_name, address, address_2, city, state, zip, phone_number, country, quest_filter, } = req.query;
        const query = {};
        const storeNameFilter = buildContainsFilter(String(store_name ?? ""));
        const addressFilter = buildContainsFilter(String(address ?? ""));
        const address2Filter = buildContainsFilter(String(address_2 ?? ""));
        const cityFilter = buildContainsFilter(String(city ?? ""));
        const stateFilter = buildContainsFilter(String(state ?? ""));
        const zipFilter = buildContainsFilter(String(zip ?? ""));
        const phoneFilter = buildContainsFilter(String(phone_number ?? ""));
        const countryFilter = buildContainsFilter(String(country ?? ""));
        if (storeNameFilter)
            query.store_name = storeNameFilter;
        if (addressFilter)
            query.address = addressFilter;
        if (address2Filter) {
            query.$or = [
                { address_2: address2Filter },
                { "address 2": address2Filter },
            ];
        }
        if (cityFilter)
            query.city = cityFilter;
        if (stateFilter)
            query.state = stateFilter;
        if (zipFilter)
            query.zip = zipFilter;
        if (phoneFilter)
            query.phone_number = phoneFilter;
        if (countryFilter)
            query.country = countryFilter;
        const questFilter = String(quest_filter ?? "").trim();
        const questQuery = buildQuestFilter(questFilter);
        if (questQuery) {
            if (query.$and && Array.isArray(query.$and)) {
                query.$and.push(questQuery);
            }
            else if (query.$or) {
                const existingOr = query.$or;
                delete query.$or;
                query.$and = [{ $or: existingOr }, questQuery];
            }
            else {
                Object.assign(query, questQuery);
            }
        }
        const stores = await storesCollection
            .find(query)
            .sort({ store_name: 1 })
            .toArray();
        res.status(200).json(stores.map(normalizeStoreDocument));
    }
    catch (error) {
        console.error("Failed to fetch stores:", error);
        res.status(500).json({ error: "Failed to fetch stores." });
    }
});
app.post("/api/stores", requireAuth, async (req, res) => {
    try {
        const { store_name, address, address_2, city, state, zip, phone_number, country, sunday, monday, tuesday, wednesday, thursday, friday, saturday, website, nes_quest, n64_quest, snes_quest, nintendo_quest, super_nintendo_quest, } = req.body ?? {};
        if (!normalizeString(store_name) ||
            !normalizeString(address) ||
            !normalizeString(city) ||
            !normalizeString(state) ||
            !normalizeString(zip) ||
            !normalizeString(phone_number) ||
            !normalizeString(country)) {
            return res.status(400).json({
                error: "Missing required fields: store_name, address, city, state, zip, phone_number, country",
            });
        }
        const nextStoreId = await getNextStoreId();
        const normalizedQuestFlags = {
            nes_quest: normalizeBoolean(nes_quest ?? nintendo_quest),
            snes_quest: normalizeBoolean(snes_quest ?? super_nintendo_quest),
            n64_quest: normalizeBoolean(n64_quest),
        };
        const newStore = {
            store_id: nextStoreId,
            store_name: normalizeString(store_name),
            address: normalizeString(address),
            address_2: normalizeString(address_2),
            city: normalizeString(city),
            state: normalizeString(state),
            zip: normalizeString(zip),
            phone_number: normalizeString(phone_number),
            country: normalizeString(country),
            sunday: normalizeString(sunday),
            monday: normalizeString(monday),
            tuesday: normalizeString(tuesday),
            wednesday: normalizeString(wednesday),
            thursday: normalizeString(thursday),
            friday: normalizeString(friday),
            saturday: normalizeString(saturday),
            website: normalizeString(website),
            nes_quest: normalizedQuestFlags.nes_quest,
            snes_quest: normalizedQuestFlags.snes_quest,
            n64_quest: normalizedQuestFlags.n64_quest,
        };
        const result = await storesCollection.insertOne(newStore);
        return res.status(201).json({
            ok: true,
            insertedId: String(result.insertedId),
            store: normalizeStoreDocument({
                ...newStore,
                _id: result.insertedId,
            }),
        });
    }
    catch (error) {
        console.error("Failed to create store:", error);
        return res.status(500).json({ error: "Failed to create store." });
    }
});
// MEDIA
app.get("/api/media", async (req, res) => {
    try {
        const { title, media_type, format, genre, platform, year, company, location, } = req.query;
        const query = {};
        const andConditions = [];
        const titleFilter = buildContainsFilter(String(title ?? ""));
        const mediaTypeFilter = buildContainsFilter(String(media_type ?? ""));
        const formatFilter = buildContainsFilter(String(format ?? ""));
        const genreFilter = buildContainsFilter(String(genre ?? ""));
        const platformFilter = buildContainsFilter(String(platform ?? ""));
        const yearFilter = buildContainsFilter(String(year ?? ""));
        const companyFilter = buildContainsFilter(String(company ?? ""));
        const locationFilter = buildContainsFilter(String(location ?? ""));
        if (titleFilter) {
            andConditions.push({
                $or: [{ title: titleFilter }, { media_title: titleFilter }],
            });
        }
        if (mediaTypeFilter) {
            andConditions.push({
                $or: [{ media_type: mediaTypeFilter }, { type: mediaTypeFilter }],
            });
        }
        if (formatFilter)
            query.format = formatFilter;
        if (genreFilter)
            query.genre = genreFilter;
        if (platformFilter)
            query.platform = platformFilter;
        if (yearFilter) {
            andConditions.push({
                $or: [{ year: yearFilter }, { release_year: yearFilter }],
            });
        }
        if (companyFilter) {
            andConditions.push({
                $or: [
                    { company: companyFilter },
                    { studio: companyFilter },
                    { publisher: companyFilter },
                ],
            });
        }
        if (locationFilter)
            query.location = locationFilter;
        if (andConditions.length > 0) {
            query.$and = andConditions;
        }
        const media = await mediaCollection
            .find(query)
            .sort({ title: 1 })
            .toArray();
        return res.status(200).json(media.map(normalizeMediaDocument));
    }
    catch (error) {
        console.error("Failed to fetch media:", error);
        return res.status(500).json({ error: "Failed to fetch media." });
    }
});
app.post("/api/media", requireAuth, async (req, res) => {
    try {
        const newMedia = {
            title: normalizeString(req.body?.title),
            media_type: normalizeString(req.body?.media_type),
            format: normalizeString(req.body?.format),
            genre: normalizeString(req.body?.genre),
            platform: normalizeString(req.body?.platform),
            year: normalizeString(req.body?.year),
            company: normalizeString(req.body?.company),
            location: normalizeString(req.body?.location),
            website: normalizeString(req.body?.website),
            notes: normalizeString(req.body?.notes),
        };
        if (!newMedia.title) {
            return res.status(400).json({ error: "Title is required." });
        }
        const result = await mediaCollection.insertOne(newMedia);
        return res.status(201).json({
            ok: true,
            insertedId: String(result.insertedId),
            media: normalizeMediaDocument({
                ...newMedia,
                _id: result.insertedId,
            }),
        });
    }
    catch (error) {
        console.error("Failed to create media:", error);
        return res.status(500).json({ error: "Failed to create media." });
    }
});
// CREW
app.get("/api/crew", async (req, res) => {
    try {
        const { name, role, department, email, phone, city, state, country, company, project, } = req.query;
        const query = {};
        const andConditions = [];
        const nameFilter = buildContainsFilter(String(name ?? ""));
        const roleFilter = buildContainsFilter(String(role ?? ""));
        const departmentFilter = buildContainsFilter(String(department ?? ""));
        const emailFilter = buildContainsFilter(String(email ?? ""));
        const phoneFilter = buildContainsFilter(String(phone ?? ""));
        const cityFilter = buildContainsFilter(String(city ?? ""));
        const stateFilter = buildContainsFilter(String(state ?? ""));
        const countryFilter = buildContainsFilter(String(country ?? ""));
        const companyFilter = buildContainsFilter(String(company ?? ""));
        const projectFilter = buildContainsFilter(String(project ?? ""));
        if (nameFilter) {
            andConditions.push({
                $or: [
                    { name: nameFilter },
                    { first_name: nameFilter },
                    { last_name: nameFilter },
                ],
            });
        }
        if (roleFilter) {
            andConditions.push({
                $or: [{ role: roleFilter }, { title: roleFilter }],
            });
        }
        if (departmentFilter)
            query.department = departmentFilter;
        if (emailFilter)
            query.email = emailFilter;
        if (phoneFilter)
            query.phone = phoneFilter;
        if (cityFilter)
            query.city = cityFilter;
        if (stateFilter)
            query.state = stateFilter;
        if (countryFilter)
            query.country = countryFilter;
        if (companyFilter)
            query.company = companyFilter;
        if (projectFilter)
            query.project = projectFilter;
        if (andConditions.length > 0) {
            query.$and = andConditions;
        }
        const crew = await crewCollection.find(query).sort({ name: 1 }).toArray();
        return res.status(200).json(crew.map(normalizeCrewDocument));
    }
    catch (error) {
        console.error("Failed to fetch crew:", error);
        return res.status(500).json({ error: "Failed to fetch crew." });
    }
});
app.post("/api/crew", requireAuth, async (req, res) => {
    try {
        const newCrew = {
            name: normalizeString(req.body?.name),
            role: normalizeString(req.body?.role),
            department: normalizeString(req.body?.department),
            email: normalizeString(req.body?.email),
            phone: normalizeString(req.body?.phone),
            city: normalizeString(req.body?.city),
            state: normalizeString(req.body?.state),
            country: normalizeString(req.body?.country),
            company: normalizeString(req.body?.company),
            project: normalizeString(req.body?.project),
            website: normalizeString(req.body?.website),
            notes: normalizeString(req.body?.notes),
        };
        if (!newCrew.name) {
            return res.status(400).json({ error: "Name is required." });
        }
        const result = await crewCollection.insertOne(newCrew);
        return res.status(201).json({
            ok: true,
            insertedId: String(result.insertedId),
            crew: normalizeCrewDocument({
                ...newCrew,
                _id: result.insertedId,
            }),
        });
    }
    catch (error) {
        console.error("Failed to create crew:", error);
        return res.status(500).json({ error: "Failed to create crew." });
    }
});
// FALLBACK
app.get("*", (_req, res) => {
    res.sendFile(path_1.default.join(appRoot, "dist", "index.html"));
});
async function startServer() {
    try {
        await connectToMongo();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("Server failed to start:", error);
        process.exit(1);
    }
}
void startServer();
