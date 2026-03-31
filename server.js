"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var dotenv_1 = __importDefault(require("dotenv"));
var path_1 = __importDefault(require("path"));
var mongodb_1 = require("mongodb");
dotenv_1.default.config();
var app = (0, express_1.default)();
var PORT = Number((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000);
var MONGO_URI = process.env.MONGO_URI;
var DB_NAME = (_b = process.env.MONGO_DB_NAME) !== null && _b !== void 0 ? _b : "backend";
var COLLECTION_NAME = (_c = process.env.COLLECTION_NAME) !== null && _c !== void 0 ? _c : "store_info";
if (!MONGO_URI) {
    throw new Error("Missing MONGO_URI in environment.");
}
app.use((0, cors_1.default)());
app.use(express_1.default.json());
var client = new mongodb_1.MongoClient(MONGO_URI);
var distPath = path_1.default.join(__dirname, "dist");
function getDb() {
    return client.db(DB_NAME);
}
function getStoresCollection() {
    return getDb().collection(COLLECTION_NAME);
}
function getCountersCollection() {
    return getDb().collection("counters");
}
function normalizeText(value) {
    return String(value !== null && value !== void 0 ? value : "").trim();
}
function ensureCounterDocument() {
    return __awaiter(this, void 0, void 0, function () {
        var counters;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    counters = getCountersCollection();
                    return [4 /*yield*/, counters.updateOne({ _id: "store_id" }, { $setOnInsert: { seq: 0 } }, { upsert: true })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getNextStoreId() {
    return __awaiter(this, void 0, void 0, function () {
        var counters, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    counters = getCountersCollection();
                    return [4 /*yield*/, counters.findOneAndUpdate({ _id: "store_id" }, { $inc: { seq: 1 } }, {
                            upsert: true,
                            returnDocument: "after",
                        })];
                case 1:
                    result = _a.sent();
                    if (!result || typeof result.seq !== "number") {
                        throw new Error("Failed to generate unique store_id.");
                    }
                    return [2 /*return*/, result.seq];
            }
        });
    });
}
function ensureIndexes() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getStoresCollection().createIndex({ store_id: 1 }, { unique: true })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function syncStoreIdCounterToMax() {
    return __awaiter(this, void 0, void 0, function () {
        var stores, counters, highestStore, maxStoreId;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    stores = getStoresCollection();
                    counters = getCountersCollection();
                    return [4 /*yield*/, stores
                            .find({}, { projection: { store_id: 1 } })
                            .sort({ store_id: -1 })
                            .limit(1)
                            .next()];
                case 1:
                    highestStore = _b.sent();
                    maxStoreId = (_a = highestStore === null || highestStore === void 0 ? void 0 : highestStore.store_id) !== null && _a !== void 0 ? _a : 0;
                    return [4 /*yield*/, counters.updateOne({ _id: "store_id" }, { $max: { seq: maxStoreId } }, { upsert: true })];
                case 2:
                    _b.sent();
                    console.log("store_id counter synced to at least ".concat(maxStoreId));
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Redirect /index.html to /
 */
app.use(function (req, res, next) {
    if (req.path === "/index.html") {
        return res.redirect(301, "/");
    }
    next();
});
app.get("/api/health", function (_req, res) {
    res.json({ ok: true });
});
app.get("/api/stores", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stores, query_1, searchableFields, results, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                stores = getStoresCollection();
                query_1 = {};
                searchableFields = [
                    "store_name",
                    "address",
                    "address_2",
                    "city",
                    "state",
                    "zip",
                    "phone_number",
                    "country",
                ];
                searchableFields.forEach(function (field) {
                    var rawValue = req.query[field];
                    var value = normalizeText(rawValue);
                    if (value) {
                        query_1[field] = { $regex: value, $options: "i" };
                    }
                });
                return [4 /*yield*/, stores.find(query_1).sort({ store_name: 1 }).toArray()];
            case 1:
                results = _a.sent();
                res.json(results);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error("GET /api/stores failed:", error_1);
                res.status(500).json({ error: "Failed to fetch stores." });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post("/api/stores", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var payload, stores, now, attempts, maxAttempts, store_id, document_1, error_2, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 8, , 9]);
                payload = {
                    store_name: normalizeText(req.body.store_name),
                    address: normalizeText(req.body.address),
                    address_2: normalizeText(req.body.address_2),
                    city: normalizeText(req.body.city),
                    state: normalizeText(req.body.state),
                    zip: normalizeText(req.body.zip),
                    phone_number: normalizeText(req.body.phone_number),
                    country: normalizeText(req.body.country),
                    sunday_hours: normalizeText(req.body.sunday_hours),
                    monday_hours: normalizeText(req.body.monday_hours),
                    tuesday_hours: normalizeText(req.body.tuesday_hours),
                    wednesday_hours: normalizeText(req.body.wednesday_hours),
                    thursday_hours: normalizeText(req.body.thursday_hours),
                    friday_hours: normalizeText(req.body.friday_hours),
                    saturday_hours: normalizeText(req.body.saturday_hours),
                };
                if (!payload.store_name) {
                    return [2 /*return*/, res.status(400).json({ error: "store_name is required." })];
                }
                if (!payload.address) {
                    return [2 /*return*/, res.status(400).json({ error: "address is required." })];
                }
                if (!payload.city) {
                    return [2 /*return*/, res.status(400).json({ error: "city is required." })];
                }
                if (!payload.state) {
                    return [2 /*return*/, res.status(400).json({ error: "state is required." })];
                }
                if (!payload.zip) {
                    return [2 /*return*/, res.status(400).json({ error: "zip is required." })];
                }
                if (!payload.phone_number) {
                    return [2 /*return*/, res.status(400).json({ error: "phone_number is required." })];
                }
                if (!payload.country) {
                    return [2 /*return*/, res.status(400).json({ error: "country is required." })];
                }
                stores = getStoresCollection();
                now = new Date();
                attempts = 0;
                maxAttempts = 10;
                _a.label = 1;
            case 1:
                if (!(attempts < maxAttempts)) return [3 /*break*/, 7];
                attempts += 1;
                return [4 /*yield*/, getNextStoreId()];
            case 2:
                store_id = _a.sent();
                document_1 = {
                    store_id: store_id,
                    store_name: payload.store_name,
                    address: payload.address,
                    address_2: payload.address_2 || "",
                    city: payload.city,
                    state: payload.state,
                    zip: payload.zip,
                    phone_number: payload.phone_number,
                    country: payload.country,
                    sunday_hours: payload.sunday_hours || "",
                    monday_hours: payload.monday_hours || "",
                    tuesday_hours: payload.tuesday_hours || "",
                    wednesday_hours: payload.wednesday_hours || "",
                    thursday_hours: payload.thursday_hours || "",
                    friday_hours: payload.friday_hours || "",
                    saturday_hours: payload.saturday_hours || "",
                    created_at: now,
                    updated_at: now,
                };
                _a.label = 3;
            case 3:
                _a.trys.push([3, 5, , 6]);
                return [4 /*yield*/, stores.insertOne(document_1)];
            case 4:
                _a.sent();
                return [2 /*return*/, res.status(201).json({
                        success: true,
                        store_id: store_id,
                        store: document_1,
                    })];
            case 5:
                error_2 = _a.sent();
                if (error_2 instanceof mongodb_1.MongoServerError && error_2.code === 11000) {
                    console.warn("Duplicate store_id ".concat(store_id, " detected, retrying..."));
                    return [3 /*break*/, 1];
                }
                throw error_2;
            case 6: return [3 /*break*/, 1];
            case 7: return [2 /*return*/, res.status(409).json({
                    error: "Could not generate a unique store_id after multiple attempts.",
                })];
            case 8:
                error_3 = _a.sent();
                console.error("POST /api/stores failed:", error_3);
                return [2 /*return*/, res.status(500).json({ error: "Failed to add store." })];
            case 9: return [2 /*return*/];
        }
    });
}); });
/**
 * Serve the Vite build output
 */
app.use(express_1.default.static(distPath));
/**
 * SPA fallback:
 * - lets clean URLs work
 * - ignores API routes
 * - returns 404 for missing real file requests
 */
app.get("*", function (req, res) {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API route not found." });
    }
    if (path_1.default.extname(req.path)) {
        return res.status(404).send("File not found");
    }
    return res.sendFile(path_1.default.join(distPath, "index.html"));
});
function start() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client.connect()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, ensureIndexes()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, ensureCounterDocument()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, syncStoreIdCounterToMax()];
                case 4:
                    _a.sent();
                    app.listen(PORT, function () {
                        console.log("Store Locator running on port ".concat(PORT));
                        console.log("Frontend dist path: ".concat(distPath));
                        console.log("Mongo DB: ".concat(DB_NAME));
                        console.log("Collection: ".concat(COLLECTION_NAME));
                    });
                    return [2 /*return*/];
            }
        });
    });
}
void start().catch(function (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
});
