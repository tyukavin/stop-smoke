import aiosqlite
from bot.config import settings

DB_PATH = settings.database_path


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id        INTEGER PRIMARY KEY,
                username       TEXT,
                first_name     TEXT,
                quit_date      TEXT,            -- ISO-8601 datetime when user quit
                cigarettes_per_day  INTEGER DEFAULT 20,
                price_per_pack REAL DEFAULT 250.0,
                cigarettes_in_pack  INTEGER DEFAULT 20,
                years_smoking  INTEGER DEFAULT 5,
                timezone_offset INTEGER DEFAULT 3,   -- UTC offset in hours
                motivation     TEXT DEFAULT '',       -- personal reason to quit
                created_at     TEXT DEFAULT (datetime('now')),
                onboarding_complete INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS cravings (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                intensity   INTEGER DEFAULT 5,   -- 1-10
                trigger     TEXT DEFAULT '',
                coping_used TEXT DEFAULT '',
                resisted    INTEGER DEFAULT 1,   -- 1 = resisted, 0 = smoked
                created_at  TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );

            CREATE TABLE IF NOT EXISTS achievements (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                code        TEXT NOT NULL,
                unlocked_at TEXT DEFAULT (datetime('now')),
                UNIQUE(user_id, code),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );

            CREATE TABLE IF NOT EXISTS mood_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                mood        INTEGER DEFAULT 5,   -- 1-10
                note        TEXT DEFAULT '',
                created_at  TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );

            CREATE TABLE IF NOT EXISTS daily_checkins (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                smoke_free  INTEGER DEFAULT 1,
                created_at  TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );
            """
        )
        await db.commit()


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db
