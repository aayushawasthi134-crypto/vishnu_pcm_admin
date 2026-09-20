from pathlib import Path
import sqlite3
import secrets
import shutil

from fastapi import FastAPI, Request, Form, UploadFile, File, HTTPException, Depends
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


BASE = Path(__file__).resolve().parent

DB = BASE / "vishnu.db"

UPLOAD_DIR = BASE / "static" / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# =====================================================
# ADMIN LOGIN
# =====================================================

ADMIN_EMAIL = "admin@gmail.com"
ADMIN_PASSWORD = "Admin@12345"

active_tokens = set()


# =====================================================
# FASTAPI
# =====================================================

app = FastAPI(
    title="Vishnu PCM Classes"
)


# =====================================================
# STATIC FILES
# =====================================================

app.mount(
    "/static",
    StaticFiles(directory=BASE / "static"),
    name="static"
)


# =====================================================
# DATABASE
# =====================================================

def get_db():

    connection = sqlite3.connect(DB)

    connection.row_factory = sqlite3.Row

    return connection


def init_database():

    connection = get_db()

    connection.executescript("""

        CREATE TABLE IF NOT EXISTS people (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            type TEXT NOT NULL,

            name TEXT NOT NULL,

            details TEXT DEFAULT '',

            review TEXT DEFAULT '',

            photo TEXT DEFAULT ''

        );


        CREATE TABLE IF NOT EXISTS testimonials (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            review TEXT NOT NULL

        );


        CREATE TABLE IF NOT EXISTS faculty (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            subject TEXT NOT NULL,

            description TEXT DEFAULT '',

            photo TEXT DEFAULT ''

        );

    """)

    connection.commit()

    connection.close()


init_database()


# =====================================================
# WEBSITE
# =====================================================

@app.get("/", response_class=HTMLResponse)
async def home():

    return FileResponse(
        BASE / "index.html"
    )


@app.get("/admin", response_class=HTMLResponse)
async def admin():

    return FileResponse(
        BASE / "admin.html"
    )


# =====================================================
# ASSETS
# =====================================================

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
async def style_css():

    return FileResponse(
        BASE / "style.css",
        media_type="text/css"
    )


@app.get("/assets/script.js")
async def script_js():

    return FileResponse(
        BASE / "script.js",
        media_type="application/javascript"
    )


# =====================================================
# LOGIN
# =====================================================

class LoginData(BaseModel):

    email: str

    password: str


@app.post("/api/login")
async def login(data: LoginData):

    if (
        data.email != ADMIN_EMAIL
        or
        data.password != ADMIN_PASSWORD
    ):

        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )


    token = secrets.token_urlsafe(32)

    active_tokens.add(token)


    return {
        "success": True,
        "access_token": token
    }


# =====================================================
# AUTHENTICATION
# =====================================================

def check_auth(request: Request):

    authorization = request.headers.get(
        "Authorization",
        ""
    )


    if not authorization.startswith("Bearer "):

        raise HTTPException(
            status_code=401,
            detail="Login required"
        )


    token = authorization.split(
        " ",
        1
    )[1]


    if token not in active_tokens:

        raise HTTPException(
            status_code=401,
            detail="Invalid session"
        )


    return True


# =====================================================
# PUBLIC DATA
# =====================================================

@app.get("/api/public")
async def public_data():

    connection = get_db()


    toppers = [
        dict(row)

        for row in connection.execute(
            """
            SELECT *
            FROM people
            WHERE type='topper'
            ORDER BY id DESC
            """
        ).fetchall()
    ]


    alumni = [
        dict(row)

        for row in connection.execute(
            """
            SELECT *
            FROM people
            WHERE type='alumni'
            ORDER BY id DESC
            """
        ).fetchall()
    ]


    testimonials = [
        dict(row)

        for row in connection.execute(
            """
            SELECT *
            FROM testimonials
            ORDER BY id DESC
            """
        ).fetchall()
    ]


    faculty = [
        dict(row)

        for row in connection.execute(
            """
            SELECT *
            FROM faculty
            ORDER BY id DESC
            """
        ).fetchall()
    ]


    connection.close()


    return {
        "toppers": toppers,
        "alumni": alumni,
        "testimonials": testimonials,
        "faculty": faculty
    }


# =====================================================
# ADMIN DATA
# =====================================================

@app.get("/api/admin/data")
async def admin_data(
    _: bool = Depends(check_auth)
):

    connection = get_db()


    toppers = [
        dict(row)

        for row in connection.execute(
            """
            SELECT *
            FROM people
            WHERE type='topper'
            ORDER BY id DESC
            """
        ).fetchall()
    ]


    alumni = [
        dict(row)

        for row in connection.execute(
            """
            SELECT *
            FROM people
            WHERE type='alumni'
            ORDER BY id DESC
            """
        ).fetchall()
    ]


    testimonials = [
        dict(row)

        for row in connection.execute(
            """
            SELECT *
            FROM testimonials
            ORDER BY id DESC
            """
        ).fetchall()
    ]


    faculty = [
        dict(row)

        for row in connection.execute(
            """
            SELECT *
            FROM faculty
            ORDER BY id DESC
            """
        ).fetchall()
    ]


    connection.close()


    return {
        "toppers": toppers,
        "alumni": alumni,
        "testimonials": testimonials,
        "faculty": faculty
    }


# =====================================================
# ADD TOPPER / ALUMNI
# =====================================================

@app.post("/api/admin/people")
async def add_person(

    type: str = Form(...),

    name: str = Form(...),

    details: str = Form(""),

    review: str = Form(""),

    photo: UploadFile | None = File(None),

    _: bool = Depends(check_auth)

):

    if type not in [
        "topper",
        "alumni"
    ]:

        raise HTTPException(
            status_code=400,
            detail="Invalid type"
        )


    photo_url = ""


    if photo and photo.filename:

        extension = Path(
            photo.filename
        ).suffix.lower()


        allowed_extensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        ]


        if extension not in allowed_extensions:

            raise HTTPException(
                status_code=400,
                detail="Only JPG, JPEG, PNG and WEBP images are allowed"
            )


        filename = (
            secrets.token_hex(12)
            +
            extension
        )


        file_path = (
            UPLOAD_DIR /
            filename
        )


        with file_path.open("wb") as buffer:

            shutil.copyfileobj(
                photo.file,
                buffer
            )


        photo_url = (
            "/static/uploads/"
            +
            filename
        )


    connection = get_db()


    cursor = connection.execute(
        """
        INSERT INTO people
        (
            type,
            name,
            details,
            review,
            photo
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            type,
            name,
            details,
            review,
            photo_url
        )
    )


    connection.commit()


    new_id = cursor.lastrowid

    connection.close()


    return {
        "success": True,
        "id": new_id,
        "photo": photo_url
    }


# =====================================================
# ADD REVIEW
# =====================================================

class ReviewData(BaseModel):

    name: str

    review: str


@app.post("/api/admin/testimonials")
async def add_testimonial(

    data: ReviewData,

    _: bool = Depends(check_auth)

):

    connection = get_db()


    cursor = connection.execute(
        """
        INSERT INTO testimonials
        (
            name,
            review
        )
        VALUES (?, ?)
        """,
        (
            data.name,
            data.review
        )
    )


    connection.commit()


    new_id = cursor.lastrowid

    connection.close()


    return {
        "success": True,
        "id": new_id
    }


# =====================================================
# ADD FACULTY
# =====================================================

@app.post("/api/admin/faculty")
async def add_faculty(

    name: str = Form(...),

    subject: str = Form(...),

    description: str = Form(""),

    photo: UploadFile | None = File(None),

    _: bool = Depends(check_auth)

):

    photo_url = ""


    if photo and photo.filename:

        extension = Path(
            photo.filename
        ).suffix.lower()


        allowed_extensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        ]


        if extension not in allowed_extensions:

            raise HTTPException(
                status_code=400,
                detail="Only JPG, JPEG, PNG and WEBP images are allowed"
            )


        filename = (
            secrets.token_hex(12)
            +
            extension
        )


        file_path = (
            UPLOAD_DIR /
            filename
        )


        with file_path.open("wb") as buffer:

            shutil.copyfileobj(
                photo.file,
                buffer
            )


        photo_url = (
            "/static/uploads/"
            +
            filename
        )


    connection = get_db()


    cursor = connection.execute(
        """
        INSERT INTO faculty
        (
            name,
            subject,
            description,
            photo
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            name,
            subject,
            description,
            photo_url
        )
    )


    connection.commit()


    new_id = cursor.lastrowid

    connection.close()


    return {
        "success": True,
        "id": new_id,
        "photo": photo_url
    }


# =====================================================
# DELETE REVIEW
# =====================================================

@app.delete("/api/admin/review/{review_id}")
async def delete_review(

    review_id: int,

    _: bool = Depends(check_auth)

):

    connection = get_db()


    connection.execute(
        """
        DELETE FROM testimonials
        WHERE id=?
        """,
        (review_id,)
    )


    connection.commit()

    connection.close()


    return {
        "success": True
    }

# =====================================================
# DELETE TOPPER
# =====================================================

@app.delete("/api/admin/topper/{person_id}")
async def delete_topper(
    person_id: int,
    _: bool = Depends(check_auth)
):

    connection = get_db()

    person = connection.execute(
        """
        SELECT photo
        FROM people
        WHERE id=? AND type='topper'
        """,
        (person_id,)
    ).fetchone()

    if not person:
        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Topper not found"
        )

    if person["photo"]:

        image_path = (
            BASE /
            person["photo"].lstrip("/")
        )

        if image_path.exists():
            image_path.unlink()

    connection.execute(
        """
        DELETE FROM people
        WHERE id=? AND type='topper'
        """,
        (person_id,)
    )

    connection.commit()
    connection.close()

    return {
        "success": True
    }


# =====================================================
# DELETE ALUMNI
# =====================================================

@app.delete("/api/admin/alumni/{person_id}")
async def delete_alumni(
    person_id: int,
    _: bool = Depends(check_auth)
):

    connection = get_db()

    person = connection.execute(
        """
        SELECT photo
        FROM people
        WHERE id=? AND type='alumni'
        """,
        (person_id,)
    ).fetchone()

    if not person:
        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Alumni not found"
        )

    if person["photo"]:

        image_path = (
            BASE /
            person["photo"].lstrip("/")
        )

        if image_path.exists():
            image_path.unlink()

    connection.execute(
        """
        DELETE FROM people
        WHERE id=? AND type='alumni'
        """,
        (person_id,)
    )

    connection.commit()
    connection.close()

    return {
        "success": True
    }


# =====================================================
# DELETE FACULTY
# =====================================================

@app.delete("/api/admin/faculty/{faculty_id}")
async def delete_faculty(
    faculty_id: int,
    _: bool = Depends(check_auth)
):

    connection = get_db()

    faculty = connection.execute(
        """
        SELECT photo
        FROM faculty
        WHERE id=?
        """,
        (faculty_id,)
    ).fetchone()

    if not faculty:
        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Faculty not found"
        )

    if faculty["photo"]:

        image_path = (
            BASE /
            faculty["photo"].lstrip("/")
        )

        if image_path.exists():
            image_path.unlink()

    connection.execute(
        """
        DELETE FROM faculty
        WHERE id=?
        """,
        (faculty_id,)
    )

    connection.commit()
    connection.close()

    return {
        "success": True
    }


    # =========================================
    # FACULTY
    # =========================================

    if type == "faculty":

        person = connection.execute(
            """
            SELECT photo
            FROM faculty
            WHERE id=?
            """,
            (person_id,)
        ).fetchone()


        if not person:

            connection.close()

            raise HTTPException(
                status_code=404,
                detail="Faculty not found"
            )


        if person["photo"]:

            image_path = (
                BASE /
                person["photo"].lstrip("/")
            )


            if image_path.exists():

                image_path.unlink()


        connection.execute(
            """
            DELETE FROM faculty
            WHERE id=?
            """,
            (person_id,)
        )


    # =========================================
    # TOPPER / ALUMNI
    # =========================================

    else:

        person = connection.execute(
            """
            SELECT photo
            FROM people
            WHERE id=? AND type=?
            """,
            (
                person_id,
                type
            )
        ).fetchone()


        if not person:

            connection.close()

            raise HTTPException(
                status_code=404,
                detail="Record not found"
            )


        if person["photo"]:

            image_path = (
                BASE /
                person["photo"].lstrip("/")
            )


            if image_path.exists():

                image_path.unlink()


        connection.execute(
            """
            DELETE FROM people
            WHERE id=? AND type=?
            """,
            (
                person_id,
                type
            )
        )


    connection.commit()

    connection.close()


    return {
        "success": True,
        "message": "Deleted successfully"
    }