const API_URL = "https://vishnu-pcm-admin.onrender.com";


let currentData = {
    faculty: [],
    toppers: [],
    alumni: [],
    testimonials: []
};


let galleryData = [];



/* =====================================================
   TOKEN
===================================================== */

function getToken() {

    return localStorage.getItem("adminToken");

}



function clearToken() {

    localStorage.removeItem("adminToken");

}



/* =====================================================
   API FETCH
===================================================== */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();


    const headers = new Headers(
        options.headers || {}
    );


    if (token) {

        headers.set(
            "Authorization",
            `Bearer ${token}`
        );

    }


    const response = await fetch(
        `${API_URL}${url}`,
        {
            ...options,
            headers
        }
    );


    if (response.status === 401) {

        clearToken();

        logout();

        throw new Error(
            "Session expired. Please login again."
        );

    }


    return response;

}



/* =====================================================
   LOGIN
===================================================== */

async function login(event) {

    event.preventDefault();


    const emailElement =
        document.getElementById("email");


    const passwordElement =
        document.getElementById("password");


    const errorBox =
        document.getElementById("loginError");


    if (!emailElement || !passwordElement) {

        alert(
            "Login form is not available."
        );

        return;

    }


    const email =
        emailElement.value.trim();


    const password =
        passwordElement.value;


    if (errorBox) {

        errorBox.textContent = "";

        errorBox.style.display = "none";

    }


    try {

        const formData =
            new FormData();


        formData.append(
            "email",
            email
        );


        formData.append(
            "password",
            password
        );


        const response =
            await fetch(
                `${API_URL}/api/login`,
                {
                    method: "POST",
                    body: formData
                }
            );


        let data = {};


        try {

            data =
                await response.json();

        } catch {

            data = {};

        }


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Invalid email or password."
            );

        }


        if (!data.token) {

            throw new Error(
                "Login successful but token was not received."
            );

        }


        localStorage.setItem(
            "adminToken",
            data.token
        );


        const loginPage =
            document.getElementById(
                "loginPage"
            );


        const adminApp =
            document.getElementById(
                "adminApp"
            );


        if (loginPage) {

            loginPage.style.display =
                "none";

        }


        if (adminApp) {

            adminApp.style.display =
                "flex";

        }


        await loadAdminData();

        await loadAdminGallery();


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        if (errorBox) {

            errorBox.textContent =
                error.message ||
                "Login failed.";

            errorBox.style.display =
                "block";

        } else {

            alert(
                error.message ||
                "Login failed."
            );

        }

    }

}



/* =====================================================
   LOGOUT
===================================================== */

function logout() {

    clearToken();


    const loginPage =
        document.getElementById(
            "loginPage"
        );


    const adminApp =
        document.getElementById(
            "adminApp"
        );


    if (adminApp) {

        adminApp.style.display =
            "none";

    }


    if (loginPage) {

        loginPage.style.display =
            "flex";

    }


    const email =
        document.getElementById(
            "email"
        );


    const password =
        document.getElementById(
            "password"
        );


    const error =
        document.getElementById(
            "loginError"
        );


    if (email) {

        email.value = "";

    }


    if (password) {

        password.value = "";

    }


    if (error) {

        error.textContent = "";

        error.style.display = "none";

    }

}



/* =====================================================
   SHOW TAB
===================================================== */

function showTab(tabName) {

    const sections =
        document.querySelectorAll(
            ".admin-section"
        );


    sections.forEach(
        section => {

            section.classList.remove(
                "active"
            );

        }
    );


    const selected =
        document.getElementById(
            tabName
        );


    if (selected) {

        selected.classList.add(
            "active"
        );

    }


    const pageTitle =
        document.getElementById(
            "pageTitle"
        );


    const titles = {

        dashboard:
            "Dashboard",

        faculty:
            "Faculty",

        toppers:
            "Toppers",

        alumni:
            "Alumni",

        reviews:
            "Reviews",

        gallery:
            "Gallery"

    };


    if (pageTitle) {

        pageTitle.textContent =
            titles[tabName] ||
            "Dashboard";

    }

}



/* =====================================================
   LOAD ADMIN DATA
===================================================== */

async function loadAdminData() {

    try {

        const response =
            await apiFetch(
                "/api/admin/data"
            );


        if (!response.ok) {

            const data =
                await response.json()
                    .catch(() => ({}));


            throw new Error(
                data.detail ||
                "Unable to load admin data."
            );

        }


        const data =
            await response.json();


        currentData = {

            faculty:
                Array.isArray(data.faculty)
                    ? data.faculty
                    : [],

            toppers:
                Array.isArray(data.toppers)
                    ? data.toppers
                    : [],

            alumni:
                Array.isArray(data.alumni)
                    ? data.alumni
                    : [],

            testimonials:
                Array.isArray(data.testimonials)
                    ? data.testimonials
                    : []

        };


        renderAdminData();


    } catch (error) {

        console.error(
            "Admin data error:",
            error
        );

    }

}



/* =====================================================
   RENDER ADMIN DATA
===================================================== */

function renderAdminData() {

    renderFacultyList();

    renderTopperList();

    renderAlumniList();

    renderReviewList();

    updateDashboardCounts();

}



/* =====================================================
   DASHBOARD COUNTS
===================================================== */

function updateDashboardCounts() {

    setText(
        "facultyCount",
        currentData.faculty.length
    );


    setText(
        "topCount",
        currentData.toppers.length
    );


    setText(
        "alumniCount",
        currentData.alumni.length
    );


    setText(
        "reviewCount",
        currentData.testimonials.length
    );


    setText(
        "galleryCount",
        galleryData.length
    );

}



function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}



/* =====================================================
   ADD FACULTY
===================================================== */

async function addFaculty(event) {

    event.preventDefault();


    const form =
        event.target;


    const formData =
        new FormData(form);


    try {

        const response =
            await apiFetch(
                "/api/admin/faculty",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to add faculty."
            );

        }


        alert(
            "Faculty added successfully."
        );


        form.reset();


        await loadAdminData();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   FACULTY LIST
===================================================== */

function renderFacultyList() {

    const container =
        document.getElementById(
            "facultyList"
        );


    if (!container) {

        return;

    }


    if (!currentData.faculty.length) {

        container.innerHTML =
            `
            <div class="empty-state">
                No faculty added yet.
            </div>
            `;

        return;

    }


    container.innerHTML =
        currentData.faculty
            .map(
                faculty => {

                    const image =
                        faculty.photo
                            ? `
                                <img
                                    src="${escapeAttribute(faculty.photo)}"
                                    alt=""
                                >
                              `
                            : "";


                    return `
                        <div class="admin-item">

                            <div class="admin-item-info">

                                ${image}

                                <div>

                                    <h3>
                                        ${escapeHTML(faculty.name)}
                                    </h3>

                                    <p>
                                        ${escapeHTML(faculty.subject || "")}
                                    </p>

                                    <small>
                                        ${escapeHTML(faculty.description || "")}
                                    </small>

                                </div>

                            </div>


                            <button
                                type="button"
                                class="delete-btn"
                                onclick="deleteFaculty(${Number(faculty.id)})"
                            >
                                Delete
                            </button>

                        </div>
                    `;

                }
            )
            .join("");

}



/* =====================================================
   DELETE FACULTY
===================================================== */

async function deleteFaculty(
    id
) {

    if (
        !confirm(
            "Delete this faculty member?"
        )
    ) {

        return;

    }


    try {

        const response =
            await apiFetch(
                `/api/admin/faculty/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to delete faculty."
            );

        }


        await loadAdminData();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   ADD TOPPER / ALUMNI
===================================================== */

async function addPerson(
    event,
    type
) {

    event.preventDefault();


    const form =
        event.target;


    const formData =
        new FormData(form);


    formData.append(
        "type",
        type
    );


    try {

        const response =
            await apiFetch(
                "/api/admin/people",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                `Unable to add ${type}.`
            );

        }


        alert(
            type === "topper"
                ? "Topper added successfully."
                : "Alumni added successfully."
        );


        form.reset();


        await loadAdminData();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   TOPPER LIST
===================================================== */

function renderTopperList() {

    const container =
        document.getElementById(
            "topperList"
        );


    if (!container) {

        return;

    }


    if (!currentData.toppers.length) {

        container.innerHTML =
            `
            <div class="empty-state">
                No toppers added yet.
            </div>
            `;

        return;

    }


    container.innerHTML =
        currentData.toppers
            .map(
                topper => {

                    const image =
                        topper.photo
                            ? `
                                <img
                                    src="${escapeAttribute(topper.photo)}"
                                    alt=""
                                >
                              `
                            : "";


                    return `
                        <div class="admin-item">

                            <div class="admin-item-info">

                                ${image}

                                <div>

                                    <h3>
                                        ${escapeHTML(topper.name)}
                                    </h3>

                                    <p>
                                        ${escapeHTML(topper.details || "")}
                                    </p>

                                    <small>
                                        ${escapeHTML(topper.review || "")}
                                    </small>

                                </div>

                            </div>


                            <button
                                type="button"
                                class="delete-btn"
                                onclick="deleteTopper(${Number(topper.id)})"
                            >
                                Delete
                            </button>

                        </div>
                    `;

                }
            )
            .join("");

}



/* =====================================================
   DELETE TOPPER
===================================================== */

async function deleteTopper(
    id
) {

    if (
        !confirm(
            "Delete this topper?"
        )
    ) {

        return;

    }


    try {

        const response =
            await apiFetch(
                `/api/admin/topper/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to delete topper."
            );

        }


        await loadAdminData();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   ALUMNI LIST
===================================================== */

function renderAlumniList() {

    const container =
        document.getElementById(
            "alumniList"
        );


    if (!container) {

        return;

    }


    if (!currentData.alumni.length) {

        container.innerHTML =
            `
            <div class="empty-state">
                No alumni added yet.
            </div>
            `;

        return;

    }


    container.innerHTML =
        currentData.alumni
            .map(
                alumni => {

                    const image =
                        alumni.photo
                            ? `
                                <img
                                    src="${escapeAttribute(alumni.photo)}"
                                    alt=""
                                >
                              `
                            : "";


                    return `
                        <div class="admin-item">

                            <div class="admin-item-info">

                                ${image}

                                <div>

                                    <h3>
                                        ${escapeHTML(alumni.name)}
                                    </h3>

                                    <p>
                                        ${escapeHTML(alumni.details || "")}
                                    </p>

                                    <small>
                                        ${escapeHTML(alumni.review || "")}
                                    </small>

                                </div>

                            </div>


                            <button
                                type="button"
                                class="delete-btn"
                                onclick="deleteAlumni(${Number(alumni.id)})"
                            >
                                Delete
                            </button>

                        </div>
                    `;

                }
            )
            .join("");

}



/* =====================================================
   DELETE ALUMNI
===================================================== */

async function deleteAlumni(
    id
) {

    if (
        !confirm(
            "Delete this alumni?"
        )
    ) {

        return;

    }


    try {

        const response =
            await apiFetch(
                `/api/admin/alumni/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to delete alumni."
            );

        }


        await loadAdminData();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   ADD REVIEW
===================================================== */

async function addReview(
    event
) {

    event.preventDefault();


    const form =
        event.target;


    const name =
        form.elements.name.value.trim();


    const review =
        form.elements.review.value.trim();


    try {

        const response =
            await apiFetch(
                "/api/admin/testimonials",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            name,
                            review
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to add review."
            );

        }


        alert(
            "Review added successfully."
        );


        form.reset();


        await loadAdminData();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   REVIEW LIST
===================================================== */

function renderReviewList() {

    const container =
        document.getElementById(
            "reviewList"
        );


    if (!container) {

        return;

    }


    if (!currentData.testimonials.length) {

        container.innerHTML =
            `
            <div class="empty-state">
                No reviews added yet.
            </div>
            `;

        return;

    }


    container.innerHTML =
        currentData.testimonials
            .map(
                review => {

                    return `
                        <div class="admin-item">

                            <div class="admin-item-info">

                                <div>

                                    <h3>
                                        ${escapeHTML(review.name)}
                                    </h3>

                                    <p>
                                        ${escapeHTML(review.review)}
                                    </p>

                                </div>

                            </div>


                            <button
                                type="button"
                                class="delete-btn"
                                onclick="deleteReview(${Number(review.id)})"
                            >
                                Delete
                            </button>

                        </div>
                    `;

                }
            )
            .join("");

}



/* =====================================================
   DELETE REVIEW
===================================================== */

async function deleteReview(
    id
) {

    if (
        !confirm(
            "Delete this review?"
        )
    ) {

        return;

    }


    try {

        const response =
            await apiFetch(
                `/api/admin/review/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to delete review."
            );

        }


        await loadAdminData();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   GALLERY LOAD
===================================================== */

async function loadAdminGallery() {

    try {

        const response =
            await apiFetch(
                "/api/admin/gallery"
            );


        if (!response.ok) {

            const data =
                await response.json()
                    .catch(() => ({}));


            throw new Error(
                data.detail ||
                "Unable to load gallery."
            );

        }


        const data =
            await response.json();


        if (Array.isArray(data)) {

            galleryData =
                data;

        } else if (
            Array.isArray(data.events)
        ) {

            galleryData =
                data.events;

        } else if (
            Array.isArray(data.gallery)
        ) {

            galleryData =
                data.gallery;

        } else {

            galleryData = [];

        }


        renderGallery();

        updateDashboardCounts();


    } catch (error) {

        console.error(
            "Gallery error:",
            error
        );

    }

}



/* =====================================================
   CREATE GALLERY EVENT
===================================================== */

async function createGalleryEvent(
    event
) {

    event.preventDefault();


    const form =
        event.target;


    const formData =
        new FormData(form);


    try {

        const response =
            await apiFetch(
                "/api/admin/gallery/event",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to create gallery event."
            );

        }


        alert(
            "Gallery event created successfully."
        );


        form.reset();


        await loadAdminGallery();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   RENDER GALLERY
===================================================== */

function renderGallery() {

    const container =
        document.getElementById(
            "galleryAdminList"
        );


    if (!container) {

        return;

    }


    if (!galleryData.length) {

        container.innerHTML =
            `
            <div class="empty-state">
                No gallery events created yet.
            </div>
            `;

        return;

    }


    container.innerHTML =
        galleryData
            .map(
                event => {

                    const eventId =
                        Number(
                            event.id
                        );


                    const photos =
                        Array.isArray(
                            event.photos
                        )
                            ? event.photos
                            : [];


                    const cover =
                        event.cover_photo ||
                        event.cover ||
                        "";


                    const photosHTML =
                        photos
                            .map(
                                photo => {

                                    const photoId =
                                        Number(
                                            photo.id
                                        );


                                    const photoURL =
                                        photo.url ||
                                        photo.photo ||
                                        photo.image_url ||
                                        photo.photo_url ||
                                        "";


                                    return `
                                        <div class="gallery-photo-item">

                                            <img
                                                src="${escapeAttribute(photoURL)}"
                                                alt=""
                                            >

                                            <div class="gallery-photo-actions">

                                                <button
                                                    type="button"
                                                    onclick="setGalleryCover(${eventId}, ${photoId})"
                                                >
                                                    Set Cover
                                                </button>

                                                <button
                                                    type="button"
                                                    class="delete-btn"
                                                    onclick="deleteGalleryPhoto(${photoId})"
                                                >
                                                    Delete
                                                </button>

                                            </div>

                                        </div>
                                    `;

                                }
                            )
                            .join("");


                    return `
                        <div class="gallery-admin-card">

                            <div class="gallery-admin-header">

                                <div>

                                    <h3>
                                        ${escapeHTML(
                                            event.title ||
                                            event.name ||
                                            "Gallery Event"
                                        )}
                                    </h3>

                                    <p>
                                        ${escapeHTML(
                                            event.event_date ||
                                            ""
                                        )}
                                    </p>

                                    <small>
                                        ${escapeHTML(
                                            event.description ||
                                            ""
                                        )}
                                    </small>

                                </div>


                                <button
                                    type="button"
                                    class="delete-btn"
                                    onclick="deleteGalleryEvent(${eventId})"
                                >
                                    Delete Event
                                </button>

                            </div>


                            ${
                                cover
                                    ? `
                                        <div class="gallery-cover-preview">

                                            <img
                                                src="${escapeAttribute(cover)}"
                                                alt=""
                                            >

                                            <span>
                                                Current Cover
                                            </span>

                                        </div>
                                      `
                                    : ""
                            }


                            <div class="gallery-upload-box">

                                <form
                                    onsubmit="uploadGalleryPhotos(event, ${eventId})"
                                    enctype="multipart/form-data"
                                >

                                    <input
                                        type="file"
                                        name="photos"
                                        accept=".jpg,.jpeg,.png,.webp"
                                        multiple
                                        required
                                    >


                                    <button
                                        type="submit"
                                        class="primary-btn"
                                    >
                                        Upload Photos
                                    </button>

                                </form>

                            </div>


                            <div class="gallery-admin-grid">

                                ${
                                    photosHTML ||
                                    `
                                    <div class="empty-state">
                                        No photos uploaded yet.
                                    </div>
                                    `
                                }

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}



/* =====================================================
   UPLOAD GALLERY PHOTOS
===================================================== */

async function uploadGalleryPhotos(
    event,
    eventId
) {

    event.preventDefault();


    const form =
        event.target;


    const formData =
        new FormData(form);


    try {

        const response =
            await apiFetch(
                `/api/admin/gallery/${eventId}/photos`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to upload gallery photos."
            );

        }


        alert(
            "Photos uploaded successfully."
        );


        form.reset();


        await loadAdminGallery();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   SET GALLERY COVER
===================================================== */

async function setGalleryCover(
    eventId,
    photoId
) {

    try {

        const response =
            await apiFetch(
                `/api/admin/gallery/${eventId}/cover/${photoId}`,
                {
                    method: "PUT"
                }
            );


        const data =
            await response.json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to set cover."
            );

        }


        await loadAdminGallery();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   DELETE GALLERY PHOTO
===================================================== */

async function deleteGalleryPhoto(
    photoId
) {

    if (
        !confirm(
            "Delete this photo?"
        )
    ) {

        return;

    }


    try {

        const response =
            await apiFetch(
                `/api/admin/gallery/photo/${photoId}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to delete photo."
            );

        }


        await loadAdminGallery();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   DELETE GALLERY EVENT
===================================================== */

async function deleteGalleryEvent(
    eventId
) {

    if (
        !confirm(
            "Delete this gallery event and all its photos?"
        )
    ) {

        return;

    }


    try {

        const response =
            await apiFetch(
                `/api/admin/gallery/event/${eventId}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to delete gallery event."
            );

        }


        await loadAdminGallery();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

}



/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /[&<>"']/g,
            character => {

                const map = {

                    "&":
                        "&amp;",

                    "<":
                        "&lt;",

                    ">":
                        "&gt;",

                    '"':
                        "&quot;",

                    "'":
                        "&#039;"

                };


                return map[
                    character
                ];

            }
        );

}



function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}



/* =====================================================
   INITIAL LOAD
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const token =
            getToken();


        const loginPage =
            document.getElementById(
                "loginPage"
            );


        const adminApp =
            document.getElementById(
                "adminApp"
            );


        /*
           IMPORTANT:
           Never call classList on a
           missing element.
        */

        if (!token) {

            if (loginPage) {

                loginPage.style.display =
                    "flex";

            }


            if (adminApp) {

                adminApp.style.display =
                    "none";

            }


            return;

        }


        if (loginPage) {

            loginPage.style.display =
                "none";

        }


        if (adminApp) {

            adminApp.style.display =
                "flex";

        }


        try {

            await loadAdminData();

            await loadAdminGallery();

        } catch (error) {

            console.error(
                "Initial loading error:",
                error
            );

        }

    }
);