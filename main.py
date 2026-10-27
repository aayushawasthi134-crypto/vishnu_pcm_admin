import os
import sqlite3
import secrets
import re
import hmac
from pathlib import Path
from datetime import datetime

import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

from fastapi import (
    FastAPI,
    Request,
    Form,
    UploadFile,
    File,
    HTTPException,
    Depends
)
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware


# =========================================================
# APP
# =========================================================

app = FastAPI(title="Vishnu PCM Classes Admin")


# =========================================================
# PATHS
# =========================================================

BASE = Path(__file__).resolve().parent

load_dotenv(BASE / ".env")

DB = BASE / "vishnu.db"

UPLOAD_DIR = BASE / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
# DATABASE
# =========================================================

DATABASE_URL = os.getenv("DATABASE_URL")

USE_POSTGRES = bool(DATABASE_URL)

if USE_POSTGRES:
    import psycopg
    from psycopg.rows import dict_row


def get_db():

    if USE_POSTGRES:

        connection = psycopg.connect(
            DATABASE_URL,
            row_factory=dict_row
        )

        connection.execute(
            "SET search_path TO public"
        )

        return connection

    connection = sqlite3.connect(DB)

    connection.row_factory = sqlite3.Row

    return connection


def db_execute(connection, query, params=()):

    if USE_POSTGRES:
        query = query.replace("?", "%s")

    return connection.execute(
        query,
        params
    )


def rows_as_dict(rows):

    return [dict(row) for row in rows]


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

def init_db():

    conn = get_db()

    try:

        if USE_POSTGRES:

            # ---------------------------------------------
            # PEOPLE
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS people (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    type VARCHAR(50) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    details TEXT,
                    review TEXT,
                    photo TEXT
                )
            """)

            # ---------------------------------------------
            # TESTIMONIALS
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS testimonials (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    review TEXT NOT NULL,
                    status VARCHAR(20) DEFAULT 'approved'
                )
            """)

            # ---------------------------------------------
            # FACULTY
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS faculty (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    subject VARCHAR(255),
                    description TEXT,
                    photo TEXT
                )
            """)

            # ---------------------------------------------
            # GALLERY EVENTS
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS gallery_events (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    event_date VARCHAR(100),
                    cover_photo TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # ---------------------------------------------
            # GALLERY PHOTOS
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS gallery_photos (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    event_id INTEGER NOT NULL,
                    photo_url TEXT NOT NULL,
                    public_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # ---------------------------------------------
            # AUTH TOKENS
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS active_tokens (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    token TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS enquiries (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    phone VARCHAR(30) NOT NULL,
                    email VARCHAR(255),
                    message TEXT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'new',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # ---------------------------------------------
            # MIGRATION
            # ---------------------------------------------

            conn.execute("""
                ALTER TABLE testimonials
                ADD COLUMN IF NOT EXISTS status VARCHAR(20)
                DEFAULT 'approved'
            """)

            conn.execute("""
                UPDATE testimonials
                SET status = 'approved'
                WHERE status IS NULL
            """)

            conn.execute("""
                ALTER TABLE active_tokens
                ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP
            """)

            conn.execute("""
                UPDATE active_tokens
                SET expires_at = created_at + INTERVAL '12 hours'
                WHERE expires_at IS NULL
            """)

        else:

            # ---------------------------------------------
            # PEOPLE
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS people (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    details TEXT,
                    review TEXT,
                    photo TEXT
                )
            """)

            # ---------------------------------------------
            # TESTIMONIALS
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS testimonials (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    review TEXT NOT NULL,
                    status TEXT DEFAULT 'approved'
                )
            """)

            # ---------------------------------------------
            # FACULTY
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS faculty (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    subject TEXT,
                    description TEXT,
                    photo TEXT
                )
            """)

            # ---------------------------------------------
            # GALLERY EVENTS
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS gallery_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    event_date TEXT,
                    cover_photo TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # ---------------------------------------------
            # GALLERY PHOTOS
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS gallery_photos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id INTEGER NOT NULL,
                    photo_url TEXT NOT NULL,
                    public_id TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # ---------------------------------------------
            # AUTH TOKENS
            # ---------------------------------------------

            conn.execute("""
                CREATE TABLE IF NOT EXISTS active_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token TEXT UNIQUE NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    expires_at TEXT
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS enquiries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT,
                    message TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'new',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # ---------------------------------------------
            # SQLITE MIGRATION
            # ---------------------------------------------

            columns = conn.execute(
                "PRAGMA table_info(testimonials)"
            ).fetchall()

            column_names = [
                column["name"]
                for column in columns
            ]

            if "status" not in column_names:

                conn.execute("""
                    ALTER TABLE testimonials
                    ADD COLUMN status TEXT DEFAULT 'approved'
                """)

            conn.execute("""
                UPDATE testimonials
                SET status = 'approved'
                WHERE status IS NULL
            """)

            token_columns = conn.execute(
                "PRAGMA table_info(active_tokens)"
            ).fetchall()
            token_column_names = [
                column["name"]
                for column in token_columns
            ]

            if "expires_at" not in token_column_names:
                conn.execute("""
                    ALTER TABLE active_tokens
                    ADD COLUMN expires_at TEXT
                """)

            conn.execute("""
                UPDATE active_tokens
                SET expires_at = datetime(created_at, '+12 hours')
                WHERE expires_at IS NULL
            """)

        conn.commit()

    finally:

        conn.close()


# =========================================================
# STARTUP
# =========================================================

@app.on_event("startup")
def startup():

    init_db()


# =========================================================
# CLOUDINARY
# =========================================================

CLOUDINARY_CLOUD_NAME = os.getenv(
    "CLOUDINARY_CLOUD_NAME"
)

CLOUDINARY_API_KEY = os.getenv(
    "CLOUDINARY_API_KEY"
)

CLOUDINARY_API_SECRET = os.getenv(
    "CLOUDINARY_API_SECRET"
)


if (
    CLOUDINARY_CLOUD_NAME
    and CLOUDINARY_API_KEY
    and CLOUDINARY_API_SECRET
):

    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip().rstrip("/")
        for origin in os.getenv(
            "WEBSITE_ORIGINS",
            "https://vishnupcmwebsite.vercel.app,http://localhost:5500,http://127.0.0.1:5500"
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =========================================================
# STATIC FILES
# =========================================================

app.mount(
    "/static",
    StaticFiles(directory=str(BASE / "static")),
    name="static"
)


# =========================================================
# ADMIN TOKEN
# =========================================================

def get_token_from_request(request: Request):

    auth = request.headers.get("Authorization")

    if not auth:
        return None

    if not auth.startswith("Bearer "):
        return None

    return auth.replace(
        "Bearer ",
        "",
        1
    ).strip()


def check_auth(request: Request):

    token = get_token_from_request(request)

    if not token:

        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    conn = get_db()

    try:
        session = db_execute(
            conn,
            """
            SELECT id
            FROM active_tokens
            WHERE token = ?
              AND expires_at > CURRENT_TIMESTAMP
            """,
            (token,)
        ).fetchone()

        if not session:
            raise HTTPException(
                status_code=401,
                detail="Session expired. Please login again."
            )

        return True
    finally:
        conn.close()


# =========================================================
# IMAGE HELPERS
# =========================================================

async def upload_image_to_cloudinary(
    photo: UploadFile,
    folder="vishnu-pcm"
):

    if not photo or not photo.filename:
        return None

    if not (
        CLOUDINARY_CLOUD_NAME
        and CLOUDINARY_API_KEY
        and CLOUDINARY_API_SECRET
    ):

        filename = (
            secrets.token_hex(8)
            + "_"
            + re.sub(
                r"[^a-zA-Z0-9._-]",
                "_",
                photo.filename
            )
        )

        filepath = UPLOAD_DIR / filename

        content = await photo.read()

        with open(filepath, "wb") as f:
            f.write(content)

        return "/static/uploads/" + filename

    content = await photo.read()

    result = cloudinary.uploader.upload(
        content,
        folder=folder
    )

    return result.get("secure_url")


async def upload_gallery_image_to_cloudinary(
    photo: UploadFile,
    folder="vishnu-pcm/gallery"
):

    if not photo or not photo.filename:
        return None, None

    if not (
        CLOUDINARY_CLOUD_NAME
        and CLOUDINARY_API_KEY
        and CLOUDINARY_API_SECRET
    ):

        filename = (
            secrets.token_hex(8)
            + "_"
            + re.sub(
                r"[^a-zA-Z0-9._-]",
                "_",
                photo.filename
            )
        )

        filepath = UPLOAD_DIR / filename

        content = await photo.read()

        with open(filepath, "wb") as f:
            f.write(content)

        return (
            "/static/uploads/" + filename,
            None
        )

    content = await photo.read()

    result = cloudinary.uploader.upload(
        content,
        folder=folder
    )

    return (
        result.get("secure_url"),
        result.get("public_id")
    )


def delete_cloudinary_image(public_id):

    if not public_id:
        return

    if not (
        CLOUDINARY_CLOUD_NAME
        and CLOUDINARY_API_KEY
        and CLOUDINARY_API_SECRET
    ):
        return

    try:

        cloudinary.uploader.destroy(
            public_id,
            resource_type="image"
        )

    except Exception:

        pass


# =========================================================
# BASIC PAGES
# =========================================================

@app.get("/", response_class=HTMLResponse)
async def root():

    file = BASE / "admin.html"

    if file.exists():
        return FileResponse(file)

    return HTMLResponse(
        "<h1>Admin panel</h1>"
    )


@app.get("/admin", response_class=HTMLResponse)
async def admin_page():

    file = BASE / "admin.html"

    if file.exists():
        return FileResponse(file)

    return HTMLResponse(
        "<h1>Admin panel</h1>"
    )


@app.get("/assets/admin.css")
async def admin_css():

    return FileResponse(
        BASE / "admin.css",
        media_type="text/css"
    )


@app.get("/assets/admin.js")
async def admin_js():

    return FileResponse(
        BASE / "admin.js",
        media_type="application/javascript"
    )


@app.get("/assets/style.css")
async def public_css():

    return FileResponse(
        BASE / "style.css",
        media_type="text/css"
    )


@app.get("/assets/script.js")
async def public_js():

    return FileResponse(
        BASE / "script.js",
        media_type="application/javascript"
    )


# =========================================================
# LOGIN
# =========================================================

@app.post("/api/login")
async def login(
    email: str = Form(...),
    password: str = Form(...)
):

    admin_email = os.getenv("admin@gmail.com")
    admin_password = os.getenv("Admin@12345")

    if not admin_email or not admin_password:
        raise HTTPException(
            status_code=503,
            detail="Admin credentials are not configured."
        )

    if (
        not hmac.compare_digest(
            email.strip().lower(),
            admin_email.strip().lower()
        )
        or not hmac.compare_digest(password, admin_password)
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = secrets.token_urlsafe(32)

    conn = get_db()

    try:
        if USE_POSTGRES:
            db_execute(
                conn,
                """
                INSERT INTO active_tokens(token, expires_at)
                VALUES (?, CURRENT_TIMESTAMP + INTERVAL '12 hours')
                """,
                (token,)
            )
        else:
            db_execute(
                conn,
                """
                INSERT INTO active_tokens(token, expires_at)
                VALUES (?, datetime('now', '+12 hours'))
                """,
                (token,)
            )

        conn.commit()
    finally:

        conn.close()

    return {
        "success": True,
        "token": token
    }


# =========================================================
# LOGOUT
# =========================================================

@app.post("/api/logout")
async def logout(
    request: Request
):

    token = get_token_from_request(request)

    if token:
        conn = get_db()

        try:

            db_execute(
                conn,
                """
                DELETE FROM active_tokens
                WHERE token = ?
                """,
                (token,)
            )

            conn.commit()

        finally:

            conn.close()

    return {
        "success": True
    }


# =========================================================
# PUBLIC WEBSITE DATA
# =========================================================

@app.get("/api/public")
async def public_data():

    conn = get_db()

    try:

        toppers = db_execute(
            conn,
            """
            SELECT *
            FROM people
            WHERE type = 'topper'
            ORDER BY id DESC
            """
        ).fetchall()

        alumni = db_execute(
            conn,
            """
            SELECT *
            FROM people
            WHERE type = 'alumni'
            ORDER BY id DESC
            """
        ).fetchall()

        faculty = db_execute(
            conn,
            """
            SELECT *
            FROM faculty
            ORDER BY id DESC
            """
        ).fetchall()

        # IMPORTANT:
        # ONLY APPROVED REVIEWS ARE PUBLIC

        testimonials = db_execute(
            conn,
            """
            SELECT id, name, review, status
            FROM testimonials
            WHERE status = 'approved'
            ORDER BY id DESC
            """
        ).fetchall()

        return {
            "toppers": rows_as_dict(toppers),
            "alumni": rows_as_dict(alumni),
            "faculty": rows_as_dict(faculty),
            "testimonials": rows_as_dict(testimonials)
        }

    finally:

        conn.close()


# =========================================================
# PUBLIC REVIEW SUBMISSION
# =========================================================

@app.post("/api/reviews")
async def submit_public_review(
    name: str = Form(...),
    review: str = Form(...)
):

    name = name.strip()
    review = review.strip()

    if len(name) < 2:

        raise HTTPException(
            status_code=400,
            detail="Please enter a valid name."
        )

    if len(name) > 100:

        raise HTTPException(
            status_code=400,
            detail="Name is too long."
        )

    if len(review) < 5:

        raise HTTPException(
            status_code=400,
            detail="Review must contain at least 5 characters."
        )

    if len(review) > 1000:

        raise HTTPException(
            status_code=400,
            detail="Review is too long."
        )

    conn = get_db()

    try:

        db_execute(
            conn,
            """
            INSERT INTO testimonials
            (name, review, status)
            VALUES (?, ?, 'pending')
            """,
            (
                name,
                review
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": (
                "Thank you! Your review has been "
                "submitted and is waiting for approval."
            )
        }

    finally:

        conn.close()


# =========================================================
# PUBLIC ENQUIRY SUBMISSION
# =========================================================

@app.post("/api/enquiries")
async def submit_public_enquiry(
    name: str = Form(...),
    phone: str = Form(...),
    email: str = Form(""),
    message: str = Form(...)
):
    name = name.strip()
    phone = phone.strip()
    email = email.strip()
    message = message.strip()
    phone_digits = re.sub(r"\D", "", phone)

    if len(name) < 2 or len(name) > 100:
        raise HTTPException(
            status_code=400,
            detail="Please enter a name between 2 and 100 characters."
        )

    if (
        len(phone) > 30
        or not re.fullmatch(r"[+\d\s().-]+", phone)
        or not 7 <= len(phone_digits) <= 15
    ):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid phone number."
        )

    if email and (
        len(email) > 254
        or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email)
    ):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email address."
        )

    if len(message) < 5 or len(message) > 2000:
        raise HTTPException(
            status_code=400,
            detail="Please enter a query between 5 and 2000 characters."
        )

    conn = get_db()

    try:
        db_execute(
            conn,
            """
            INSERT INTO enquiries (name, phone, email, message)
            VALUES (?, ?, ?, ?)
            """,
            (name, phone, email or None, message)
        )
        conn.commit()

        return {
            "success": True,
            "message": "Enquiry received."
        }
    finally:
        conn.close()


# =========================================================
# ADMIN DATA
# =========================================================

@app.get("/api/admin/data")
async def admin_data(
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        faculty = db_execute(
            conn,
            """
            SELECT *
            FROM faculty
            ORDER BY id DESC
            """
        ).fetchall()

        toppers = db_execute(
            conn,
            """
            SELECT *
            FROM people
            WHERE type = 'topper'
            ORDER BY id DESC
            """
        ).fetchall()

        alumni = db_execute(
            conn,
            """
            SELECT *
            FROM people
            WHERE type = 'alumni'
            ORDER BY id DESC
            """
        ).fetchall()

        all_reviews = db_execute(
            conn,
            """
            SELECT *
            FROM testimonials
            ORDER BY id DESC
            """
        ).fetchall()

        pending_reviews = db_execute(
            conn,
            """
            SELECT *
            FROM testimonials
            WHERE status = 'pending'
            ORDER BY id DESC
            """
        ).fetchall()

        enquiries = db_execute(
            conn,
            """
            SELECT *
            FROM enquiries
            ORDER BY id DESC
            """
        ).fetchall()

        return {
            "faculty": rows_as_dict(faculty),
            "toppers": rows_as_dict(toppers),
            "alumni": rows_as_dict(alumni),
            "testimonials": rows_as_dict(all_reviews),
            "pending_reviews": rows_as_dict(pending_reviews),
            "enquiries": rows_as_dict(enquiries)
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - UPDATE / DELETE ENQUIRIES
# =========================================================

@app.put("/api/admin/enquiries/{enquiry_id}/contacted")
async def mark_enquiry_contacted(
    enquiry_id: int,
    _: bool = Depends(check_auth)
):
    conn = get_db()

    try:
        result = db_execute(
            conn,
            """
            UPDATE enquiries
            SET status = 'contacted'
            WHERE id = ?
            """,
            (enquiry_id,)
        )
        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Enquiry not found."
            )
        conn.commit()

        return {"success": True, "message": "Enquiry marked as contacted."}
    finally:
        conn.close()


@app.delete("/api/admin/enquiries/{enquiry_id}")
async def delete_enquiry(
    enquiry_id: int,
    _: bool = Depends(check_auth)
):
    conn = get_db()

    try:
        result = db_execute(
            conn,
            "DELETE FROM enquiries WHERE id = ?",
            (enquiry_id,)
        )
        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Enquiry not found."
            )
        conn.commit()

        return {"success": True, "message": "Enquiry deleted."}
    finally:
        conn.close()


# =========================================================
# ADMIN - ADD PERSON
# =========================================================

@app.post("/api/admin/people")
async def add_person(
    type: str = Form(...),
    name: str = Form(...),
    details: str = Form(""),
    review: str = Form(""),
    photo: UploadFile | None = File(None),
    _: bool = Depends(check_auth)
):

    if type not in ["topper", "alumni"]:

        raise HTTPException(
            status_code=400,
            detail="Invalid person type."
        )

    name = name.strip()
    details = details.strip()
    review = review.strip()

    if len(name) < 2 or len(name) > 100:
        raise HTTPException(
            status_code=400,
            detail="Name must be between 2 and 100 characters."
        )

    if len(details) > 500 or len(review) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Details or message is too long."
        )

    image_url = None

    if photo:

        image_url = await upload_image_to_cloudinary(
            photo,
            "vishnu-pcm/" + type
        )

    conn = get_db()

    try:

        db_execute(
            conn,
            """
            INSERT INTO people
            (type, name, details, review, photo)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                type,
                name,
                details,
                review,
                image_url
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Added successfully."
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - EDIT PERSON
# =========================================================

@app.put("/api/admin/people/{person_id}")
async def edit_person(
    person_id: int,
    type: str = Form(...),
    name: str = Form(...),
    details: str = Form(""),
    review: str = Form(""),
    photo: UploadFile | None = File(None),
    _: bool = Depends(check_auth)
):
    if type not in ["topper", "alumni"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid person type."
        )

    name = name.strip()
    details = details.strip()
    review = review.strip()

    if len(name) < 2 or len(name) > 100:
        raise HTTPException(
            status_code=400,
            detail="Name must be between 2 and 100 characters."
        )

    if len(details) > 500 or len(review) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Details or message is too long."
        )


    conn = get_db()

    try:

        existing = db_execute(
            conn,
            """
            SELECT *
            FROM people
            WHERE id = ?
            """,
            (person_id,)
        ).fetchone()

        if not existing:

            raise HTTPException(
                status_code=404,
                detail="Person not found."
            )

        image_url = existing["photo"]

        if photo:

            image_url = await upload_image_to_cloudinary(
                photo,
                "vishnu-pcm/" + type
            )

        db_execute(
            conn,
            """
            UPDATE people
            SET
                type = ?,
                name = ?,
                details = ?,
                review = ?,
                photo = ?
            WHERE id = ?
            """,
            (
                type,
                name,
                details,
                review,
                image_url,
                person_id
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Updated successfully."
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - DELETE TOPPER
# =========================================================

@app.delete("/api/admin/topper/{person_id}")
async def delete_topper(
    person_id: int,
    _: bool = Depends(check_auth)
):

    return await delete_person(person_id, "topper")


# =========================================================
# ADMIN - DELETE ALUMNI
# =========================================================

@app.delete("/api/admin/alumni/{person_id}")
async def delete_alumni(
    person_id: int,
    _: bool = Depends(check_auth)
):

    return await delete_person(person_id, "alumni")


async def delete_person(
    person_id: int,
    person_type: str
):

    conn = get_db()

    try:

        person = db_execute(
            conn,
            """
            SELECT *
            FROM people
            WHERE id = ?
            AND type = ?
            """,
            (
                person_id,
                person_type
            )
        ).fetchone()

        if not person:

            raise HTTPException(
                status_code=404,
                detail="Person not found."
            )

        db_execute(
            conn,
            """
            DELETE FROM people
            WHERE id = ?
            """,
            (person_id,)
        )

        conn.commit()

        return {
            "success": True,
            "message": "Deleted successfully."
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - ADD FACULTY
# =========================================================

@app.post("/api/admin/faculty")
async def add_faculty(
    name: str = Form(...),
    subject: str = Form(""),
    description: str = Form(""),
    photo: UploadFile | None = File(None),
    _: bool = Depends(check_auth)
):

    image_url = None

    if photo:

        image_url = await upload_image_to_cloudinary(
            photo,
            "vishnu-pcm/faculty"
        )

    conn = get_db()

    try:

        db_execute(
            conn,
            """
            INSERT INTO faculty
            (name, subject, description, photo)
            VALUES (?, ?, ?, ?)
            """,
            (
                name.strip(),
                subject.strip(),
                description.strip(),
                image_url
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Faculty added successfully."
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - EDIT FACULTY
# =========================================================

@app.put("/api/admin/faculty/{faculty_id}")
async def edit_faculty(
    faculty_id: int,
    name: str = Form(...),
    subject: str = Form(""),
    description: str = Form(""),
    photo: UploadFile | None = File(None),
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        existing = db_execute(
            conn,
            """
            SELECT *
            FROM faculty
            WHERE id = ?
            """,
            (faculty_id,)
        ).fetchone()

        if not existing:

            raise HTTPException(
                status_code=404,
                detail="Faculty not found."
            )

        image_url = existing["photo"]

        if photo:

            image_url = await upload_image_to_cloudinary(
                photo,
                "vishnu-pcm/faculty"
            )

        db_execute(
            conn,
            """
            UPDATE faculty
            SET
                name = ?,
                subject = ?,
                description = ?,
                photo = ?
            WHERE id = ?
            """,
            (
                name.strip(),
                subject.strip(),
                description.strip(),
                image_url,
                faculty_id
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Faculty updated successfully."
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - DELETE FACULTY
# =========================================================

@app.delete("/api/admin/faculty/{faculty_id}")
async def delete_faculty(
    faculty_id: int,
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        faculty = db_execute(
            conn,
            """
            SELECT *
            FROM faculty
            WHERE id = ?
            """,
            (faculty_id,)
        ).fetchone()

        if not faculty:

            raise HTTPException(
                status_code=404,
                detail="Faculty not found."
            )

        db_execute(
            conn,
            """
            DELETE FROM faculty
            WHERE id = ?
            """,
            (faculty_id,)
        )

        conn.commit()

        return {
            "success": True,
            "message": "Faculty deleted."
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - ADD REVIEW
# =========================================================

@app.post("/api/admin/testimonials")
async def admin_add_review(
    name: str = Form(...),
    review: str = Form(...),
    _: bool = Depends(check_auth)
):

    name = name.strip()
    review = review.strip()

    if not name or not review:

        raise HTTPException(
            status_code=400,
            detail="Name and review are required."
        )

    conn = get_db()

    try:

        # Reviews added by admin are automatically approved.

        db_execute(
            conn,
            """
            INSERT INTO testimonials
            (name, review, status)
            VALUES (?, ?, 'approved')
            """,
            (
                name,
                review
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Review added and approved."
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - EDIT REVIEW
# =========================================================

@app.put("/api/admin/testimonials/{review_id}")
async def edit_review(
    review_id: int,
    name: str = Form(...),
    review: str = Form(...),
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        existing = db_execute(
            conn,
            """
            SELECT *
            FROM testimonials
            WHERE id = ?
            """,
            (review_id,)
        ).fetchone()

        if not existing:

            raise HTTPException(
                status_code=404,
                detail="Review not found."
            )

        db_execute(
            conn,
            """
            UPDATE testimonials
            SET
                name = ?,
                review = ?
            WHERE id = ?
            """,
            (
                name.strip(),
                review.strip(),
                review_id
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Review updated."
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - APPROVE REVIEW
# =========================================================

@app.put("/api/admin/review/{review_id}/approve")
async def approve_review(
    review_id: int,
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        review = db_execute(
            conn,
            """
            SELECT *
            FROM testimonials
            WHERE id = ?
            """,
            (review_id,)
        ).fetchone()

        if not review:

            raise HTTPException(
                status_code=404,
                detail="Review not found."
            )

        db_execute(
            conn,
            """
            UPDATE testimonials
            SET status = 'approved'
            WHERE id = ?
            """,
            (review_id,)
        )

        conn.commit()

        return {
            "success": True,
            "message": "Review approved successfully."
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - REJECT REVIEW
# =========================================================

@app.put("/api/admin/review/{review_id}/reject")
async def reject_review(
    review_id: int,
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        review = db_execute(
            conn,
            """
            SELECT *
            FROM testimonials
            WHERE id = ?
            """,
            (review_id,)
        ).fetchone()

        if not review:

            raise HTTPException(
                status_code=404,
                detail="Review not found."
            )

        db_execute(
            conn,
            """
            UPDATE testimonials
            SET status = 'rejected'
            WHERE id = ?
            """,
            (review_id,)
        )

        conn.commit()

        return {
            "success": True,
            "message": "Review rejected."
        }

    finally:

        conn.close()


# =========================================================
# ADMIN - DELETE REVIEW
# =========================================================

@app.delete("/api/admin/review/{review_id}")
async def delete_review(
    review_id: int,
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        review = db_execute(
            conn,
            """
            SELECT *
            FROM testimonials
            WHERE id = ?
            """,
            (review_id,)
        ).fetchone()

        if not review:

            raise HTTPException(
                status_code=404,
                detail="Review not found."
            )

        db_execute(
            conn,
            """
            DELETE FROM testimonials
            WHERE id = ?
            """,
            (review_id,)
        )

        conn.commit()

        return {
            "success": True,
            "message": "Review deleted."
        }

    finally:

        conn.close()


# =========================================================
# GALLERY - PUBLIC
# =========================================================

@app.get("/api/gallery")
async def public_gallery():

    conn = get_db()

    try:

        events = db_execute(
            conn,
            """
            SELECT *
            FROM gallery_events
            ORDER BY id DESC
            """
        ).fetchall()

        result = []

        for event in events:

            photos = db_execute(
                conn,
                """
                SELECT *
                FROM gallery_photos
                WHERE event_id = ?
                ORDER BY id DESC
                """,
                (event["id"],)
            ).fetchall()

            event_data = dict(event)

            event_data["photos"] = rows_as_dict(
                photos
            )

            result.append(event_data)

        return result

    finally:

        conn.close()


# =========================================================
# GALLERY - ADMIN
# =========================================================

@app.get("/api/admin/gallery")
async def admin_gallery(
    _: bool = Depends(check_auth)
):

    return await public_gallery()


# =========================================================
# GALLERY - CREATE EVENT
# =========================================================

@app.post("/api/admin/gallery/event")
async def create_gallery_event(
    title: str = Form(...),
    description: str = Form(""),
    event_date: str = Form(""),
    cover: UploadFile | None = File(None),
    _: bool = Depends(check_auth)
):

    cover_url = None

    if cover:

        cover_url = await upload_image_to_cloudinary(
            cover,
            "vishnu-pcm/gallery"
        )

    conn = get_db()

    try:

        db_execute(
            conn,
            """
            INSERT INTO gallery_events
            (title, description, event_date, cover_photo)
            VALUES (?, ?, ?, ?)
            """,
            (
                title.strip(),
                description.strip(),
                event_date.strip(),
                cover_url
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Gallery event created."
        }

    finally:

        conn.close()


# =========================================================
# GALLERY - EDIT EVENT
# =========================================================

@app.put("/api/admin/gallery/event/{event_id}")
async def edit_gallery_event(
    event_id: int,
    title: str = Form(...),
    description: str = Form(""),
    event_date: str = Form(""),
    cover: UploadFile | None = File(None),
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        event = db_execute(
            conn,
            """
            SELECT *
            FROM gallery_events
            WHERE id = ?
            """,
            (event_id,)
        ).fetchone()

        if not event:

            raise HTTPException(
                status_code=404,
                detail="Gallery event not found."
            )

        cover_url = event["cover_photo"]

        if cover:

            cover_url = await upload_image_to_cloudinary(
                cover,
                "vishnu-pcm/gallery"
            )

        db_execute(
            conn,
            """
            UPDATE gallery_events
            SET
                title = ?,
                description = ?,
                event_date = ?,
                cover_photo = ?
            WHERE id = ?
            """,
            (
                title.strip(),
                description.strip(),
                event_date.strip(),
                cover_url,
                event_id
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Gallery event updated."
        }

    finally:

        conn.close()


# =========================================================
# GALLERY - UPLOAD PHOTOS
# =========================================================

@app.post("/api/admin/gallery/{event_id}/photos")
async def upload_gallery_photos(
    event_id: int,
    photos: list[UploadFile] = File(...),
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        event = db_execute(
            conn,
            """
            SELECT *
            FROM gallery_events
            WHERE id = ?
            """,
            (event_id,)
        ).fetchone()

        if not event:

            raise HTTPException(
                status_code=404,
                detail="Gallery event not found."
            )

        for photo in photos:

            photo_url, public_id = (
                await upload_gallery_image_to_cloudinary(
                    photo
                )
            )

            if not photo_url:
                continue

            db_execute(
                conn,
                """
                INSERT INTO gallery_photos
                (event_id, photo_url, public_id)
                VALUES (?, ?, ?)
                """,
                (
                    event_id,
                    photo_url,
                    public_id
                )
            )

        conn.commit()

        return {
            "success": True,
            "message": "Photos uploaded successfully."
        }

    finally:

        conn.close()


# =========================================================
# GALLERY - SET COVER
# =========================================================

@app.put("/api/admin/gallery/{event_id}/cover/{photo_id}")
async def set_gallery_cover(
    event_id: int,
    photo_id: int,
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        photo = db_execute(
            conn,
            """
            SELECT *
            FROM gallery_photos
            WHERE id = ?
            AND event_id = ?
            """,
            (
                photo_id,
                event_id
            )
        ).fetchone()

        if not photo:

            raise HTTPException(
                status_code=404,
                detail="Photo not found."
            )

        db_execute(
            conn,
            """
            UPDATE gallery_events
            SET cover_photo = ?
            WHERE id = ?
            """,
            (
                photo["photo_url"],
                event_id
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "Cover photo updated."
        }

    finally:

        conn.close()


# =========================================================
# GALLERY - DELETE PHOTO
# =========================================================

@app.delete("/api/admin/gallery/photo/{photo_id}")
async def delete_gallery_photo(
    photo_id: int,
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        photo = db_execute(
            conn,
            """
            SELECT *
            FROM gallery_photos
            WHERE id = ?
            """,
            (photo_id,)
        ).fetchone()

        if not photo:

            raise HTTPException(
                status_code=404,
                detail="Photo not found."
            )

        delete_cloudinary_image(
            photo["public_id"]
        )

        db_execute(
            conn,
            """
            DELETE FROM gallery_photos
            WHERE id = ?
            """,
            (photo_id,)
        )

        conn.commit()

        return {
            "success": True,
            "message": "Photo deleted."
        }

    finally:

        conn.close()


# =========================================================
# GALLERY - DELETE EVENT
# =========================================================

@app.delete("/api/admin/gallery/event/{event_id}")
async def delete_gallery_event(
    event_id: int,
    _: bool = Depends(check_auth)
):

    conn = get_db()

    try:

        event = db_execute(
            conn,
            """
            SELECT *
            FROM gallery_events
            WHERE id = ?
            """,
            (event_id,)
        ).fetchone()

        if not event:

            raise HTTPException(
                status_code=404,
                detail="Gallery event not found."
            )

        photos = db_execute(
            conn,
            """
            SELECT *
            FROM gallery_photos
            WHERE event_id = ?
            """,
            (event_id,)
        ).fetchall()

        for photo in photos:

            delete_cloudinary_image(
                photo["public_id"]
            )

        db_execute(
            conn,
            """
            DELETE FROM gallery_photos
            WHERE event_id = ?
            """,
            (event_id,)
        )

        db_execute(
            conn,
            """
            DELETE FROM gallery_events
            WHERE id = ?
            """,
            (event_id,)
        )

        conn.commit()

        return {
            "success": True,
            "message": "Gallery event deleted."
        }

    finally:

        conn.close()


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
async def health():

    return {
        "status": "ok",
        "database": "postgresql" if USE_POSTGRES else "sqlite"
    }