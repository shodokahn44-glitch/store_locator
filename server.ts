import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import MongoStore from "connect-mongo";
import nodemailer from "nodemailer";

// @ts-ignore
import bcrypt from "bcryptjs";
import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import path from "path";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // IMPORTANT for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI || "";
const DB_NAME = process.env.MONGO_DB_NAME || "backend";

const STORE_COLLECTION_NAME =
  process.env.COLLECTION_NAME ||
  process.env.MONGO_COLLECTION_NAME ||
  "store_info";

const MEDIA_COLLECTION_NAME = process.env.MEDIA_COLLECTION_NAME || "media_info";

const CREW_COLLECTION_NAME = process.env.CREW_COLLECTION_NAME || "crew_info";

if (!MONGO_URI) {
  throw new Error("Missing MONGO_URI in environment variables.");
}

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      email: string;
    };
  }
}

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "retro-secret-change-me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
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
  }),
);

const appRoot = path.resolve();
app.use(express.static(path.join(appRoot, "dist")));

interface UserDocument {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  full_name?: string;
  approved?: boolean;
  createdAt: Date;
}

interface StoreDocument {
  _id?: ObjectId;
  store_id?: number;
  store_name?: string;
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

interface StoreApiResponse {
  _id?: string;
  store_id?: number;
  store_name?: string;
  address?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
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
}

interface MediaDocument {
  _id?: ObjectId;
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
}

interface MediaApiResponse {
  _id?: string;
  title?: string;
  media_title?: string;
  type?: string;
  media_type?: string;
  format?: string;
  genre?: string;
  platform?: string;
  year?: string;
  release_year?: string;
  company?: string;
  studio?: string;
  publisher?: string;
  location?: string;
  notes?: string;
  website?: string;
  image?: string;
}

interface CrewDocument {
  _id?: ObjectId;
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
}

interface CrewApiResponse {
  _id?: string;
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
}

let client: MongoClient;
let db: Db;
let usersCollection: Collection<UserDocument>;
let storesCollection: Collection<StoreDocument>;
let mediaCollection: Collection<MediaDocument>;
let crewCollection: Collection<CrewDocument>;

async function connectToMongo(): Promise<void> {
  client = new MongoClient(MONGO_URI);
  await client.connect();

  db = client.db(DB_NAME);
  usersCollection = db.collection<UserDocument>("users");
  storesCollection = db.collection<StoreDocument>(STORE_COLLECTION_NAME);
  mediaCollection = db.collection<MediaDocument>(MEDIA_COLLECTION_NAME);
  crewCollection = db.collection<CrewDocument>(CREW_COLLECTION_NAME);

  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await usersCollection.createIndex({ username: 1 }, { unique: true });

  console.log(`Connected to MongoDB database "${DB_NAME}"`);
  console.log(`Stores collection: "${STORE_COLLECTION_NAME}"`);
  console.log(`Media collection: "${MEDIA_COLLECTION_NAME}"`);
  console.log(`Crew collection: "${CREW_COLLECTION_NAME}"`);
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildContainsFilter(value?: string) {
  if (!value || !value.trim()) return undefined;
  return { $regex: escapeRegex(value.trim()), $options: "i" };
}

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function getAddress2Value(store: Partial<StoreDocument>): string {
  return normalizeString(store.address_2 ?? store["address 2"]);
}

function normalizeQuestFlags(store: Partial<StoreDocument>) {
  return {
    nes_quest: normalizeBoolean(store.nes_quest ?? store.nintendo_quest),
    snes_quest: normalizeBoolean(
      store.snes_quest ?? store.super_nintendo_quest,
    ),
    n64_quest: normalizeBoolean(store.n64_quest),
  };
}

function normalizeStoreDocument(doc: StoreDocument): StoreApiResponse {
  const questFlags = normalizeQuestFlags(doc);

  return {
    _id: doc._id ? String(doc._id) : undefined,
    store_id:
      typeof doc.store_id === "number"
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

function normalizeMediaDocument(doc: MediaDocument): MediaApiResponse {
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

function normalizeCrewDocument(doc: CrewDocument): CrewApiResponse {
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

async function getNextStoreId(): Promise<number> {
  const lastStore = await storesCollection
    .find({}, { projection: { store_id: 1 } })
    .sort({ store_id: -1 })
    .limit(1)
    .toArray();

  const highestRaw = lastStore[0]?.store_id;
  const highest =
    typeof highestRaw === "number"
      ? highestRaw
      : highestRaw !== undefined
        ? Number(highestRaw)
        : 0;

  return Number.isFinite(highest) ? highest + 1 : 1;
}

function buildQuestFilter(questFilter: string): Record<string, unknown> | null {
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
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await db.command({ ping: 1 });

    res.status(200).json({
      ok: true,
      db: DB_NAME,
      storesCollection: STORE_COLLECTION_NAME,
      mediaCollection: MEDIA_COLLECTION_NAME,
      crewCollection: CREW_COLLECTION_NAME,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      ok: false,
      error: "Database unavailable.",
    });
  }
});

// AUTH
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const full_name = normalizeString(req.body?.full_name);
    const username = normalizeString(req.body?.username);
    const email = normalizeString(req.body?.email).toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!full_name || !username || !email || !password) {
      return res.status(400).json({
        error: "Full name, username, email, and password are required.",
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

    const hash = await bcrypt.hash(password, 10);

    await usersCollection.insertOne({
      full_name,
      username,
      email,
      password: hash,
      approved: false,
      createdAt: new Date(),
    });

    // 🔥 SEND EMAIL HERE
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: "mail@nathansalyer.com",
        subject: "🚀 New User Registration - Approval Needed",
        html: `
      <h2>New User Request</h2>
      <p><strong>Name:</strong> ${full_name}</p>
      <p><strong>Username:</strong> ${username}</p>
      <p><strong>Email:</strong> ${email}</p>
    `,
      });

      console.log("✅ Approval email sent");
    } catch (err) {
      console.error("❌ Email failed (but user still created):", err);
    }

    return res.status(200).json({
      ok: true,
      message: "Registration submitted for approval.",
    });
  } catch (error) {
    console.error("Register failed:", error);
    return res.status(500).json({ error: "Register failed." });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
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

    const valid = await bcrypt.compare(password, user.password);

    if (!user.approved) {
      return res.status(403).json({
        error: "Your account is pending approval.",
      });
    }

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
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ error: "Login failed." });
  }
});

app.get("/api/auth/me", (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.status(200).json({
    ok: true,
    user: req.session.user,
  });
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
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
app.get("/api/stores", async (req: Request, res: Response) => {
  try {
    const {
      store_name,
      address,
      address_2,
      city,
      state,
      zip,
      phone_number,
      country,
      quest_filter,
    } = req.query;

    const query: Record<string, unknown> = {};

    const storeNameFilter = buildContainsFilter(String(store_name ?? ""));
    const addressFilter = buildContainsFilter(String(address ?? ""));
    const address2Filter = buildContainsFilter(String(address_2 ?? ""));
    const cityFilter = buildContainsFilter(String(city ?? ""));
    const stateFilter = buildContainsFilter(String(state ?? ""));
    const zipFilter = buildContainsFilter(String(zip ?? ""));
    const phoneFilter = buildContainsFilter(String(phone_number ?? ""));
    const countryFilter = buildContainsFilter(String(country ?? ""));

    if (storeNameFilter) query.store_name = storeNameFilter;
    if (addressFilter) query.address = addressFilter;
    if (address2Filter) {
      query.$or = [
        { address_2: address2Filter },
        { "address 2": address2Filter },
      ];
    }
    if (cityFilter) query.city = cityFilter;
    if (stateFilter) query.state = stateFilter;
    if (zipFilter) query.zip = zipFilter;
    if (phoneFilter) query.phone_number = phoneFilter;
    if (countryFilter) query.country = countryFilter;

    const questFilter = String(quest_filter ?? "").trim();
    const questQuery = buildQuestFilter(questFilter);

    if (questQuery) {
      if (query.$and && Array.isArray(query.$and)) {
        (query.$and as Record<string, unknown>[]).push(questQuery);
      } else if (query.$or) {
        const existingOr = query.$or;
        delete query.$or;
        query.$and = [{ $or: existingOr as unknown[] }, questQuery];
      } else {
        Object.assign(query, questQuery);
      }
    }

    const stores = await storesCollection
      .find(query)
      .sort({ store_name: 1 })
      .toArray();

    res.status(200).json(stores.map(normalizeStoreDocument));
  } catch (error) {
    console.error("Failed to fetch stores:", error);
    res.status(500).json({ error: "Failed to fetch stores." });
  }
});

app.post("/api/stores", requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      store_name,
      address,
      address_2,
      city,
      state,
      zip,
      phone_number,
      country,
      sunday,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      website,
      nes_quest,
      n64_quest,
      snes_quest,
      nintendo_quest,
      super_nintendo_quest,
    } = req.body ?? {};

    if (
      !normalizeString(store_name) ||
      !normalizeString(address) ||
      !normalizeString(city) ||
      !normalizeString(state) ||
      !normalizeString(zip) ||
      !normalizeString(phone_number) ||
      !normalizeString(country)
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: store_name, address, city, state, zip, phone_number, country",
      });
    }

    const nextStoreId = await getNextStoreId();

    const normalizedQuestFlags = {
      nes_quest: normalizeBoolean(nes_quest ?? nintendo_quest),
      snes_quest: normalizeBoolean(snes_quest ?? super_nintendo_quest),
      n64_quest: normalizeBoolean(n64_quest),
    };

    const newStore: StoreDocument = {
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
  } catch (error) {
    console.error("Failed to create store:", error);
    return res.status(500).json({ error: "Failed to create store." });
  }
});

// MEDIA
app.get("/api/media", async (req: Request, res: Response) => {
  try {
    const {
      title,
      media_type,
      format,
      genre,
      platform,
      year,
      company,
      location,
    } = req.query;

    const query: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];

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

    if (formatFilter) query.format = formatFilter;
    if (genreFilter) query.genre = genreFilter;
    if (platformFilter) query.platform = platformFilter;

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

    if (locationFilter) query.location = locationFilter;

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const media = await mediaCollection
      .find(query)
      .sort({ title: 1 })
      .toArray();

    return res.status(200).json(media.map(normalizeMediaDocument));
  } catch (error) {
    console.error("Failed to fetch media:", error);
    return res.status(500).json({ error: "Failed to fetch media." });
  }
});

app.post("/api/media", requireAuth, async (req: Request, res: Response) => {
  try {
    const newMedia: MediaDocument = {
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
  } catch (error) {
    console.error("Failed to create media:", error);
    return res.status(500).json({ error: "Failed to create media." });
  }
});

// CREW
app.get("/api/crew", async (req: Request, res: Response) => {
  try {
    const {
      name,
      role,
      department,
      email,
      phone,
      city,
      state,
      country,
      company,
      project,
    } = req.query;

    const query: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];

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

    if (departmentFilter) query.department = departmentFilter;
    if (emailFilter) query.email = emailFilter;
    if (phoneFilter) query.phone = phoneFilter;
    if (cityFilter) query.city = cityFilter;
    if (stateFilter) query.state = stateFilter;
    if (countryFilter) query.country = countryFilter;
    if (companyFilter) query.company = companyFilter;
    if (projectFilter) query.project = projectFilter;

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const crew = await crewCollection.find(query).sort({ name: 1 }).toArray();

    return res.status(200).json(crew.map(normalizeCrewDocument));
  } catch (error) {
    console.error("Failed to fetch crew:", error);
    return res.status(500).json({ error: "Failed to fetch crew." });
  }
});

app.post("/api/crew", requireAuth, async (req: Request, res: Response) => {
  try {
    const newCrew: CrewDocument = {
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
  } catch (error) {
    console.error("Failed to create crew:", error);
    return res.status(500).json({ error: "Failed to create crew." });
  }
});

// FALLBACK
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(appRoot, "dist", "index.html"));
});

async function startServer(): Promise<void> {
  try {
    await connectToMongo();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
}

void startServer();
