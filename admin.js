/* =========================================================
   CONFIG
========================================================= */

const API_URL =
    "https://vishnu-pcm-admin.onrender.com";


/* =========================================================
   ELEMENTS
========================================================= */

const loginPage =
    document.getElementById("loginPage");

const adminApp =
    document.getElementById("adminApp");

const editModal =
    document.getElementById("editModal");

const editForm =
    document.getElementById("editForm");

const editFields =
    document.getElementById("editFields");


/* =========================================================
   TOKEN
========================================================= */

function getToken() {

    return localStorage.getItem(
        "adminToken"
    );
}


function saveToken(token) {

    localStorage.setItem(
        "adminToken",
        token
    );
}


function clearToken() {

    localStorage.removeItem(
        "adminToken"
    );
}


/* =========================================================
   IMAGE URL
========================================================= */

function getImageValue(value) {

    if (!value) {
        return "";
    }

    if (typeof value === "string") {
        return value.trim();
    }

    if (
        typeof value === "object"
        && value !== null
    ) {

        return (
            value.url
            || value.secure_url
            || value.photo_url
            || value.photo
            || value.image_url
            || ""
        );
    }

    return "";
}


function normalizeImageUrl(url) {

    const value = getImageValue(url);

    if (!value) {
        return "";
    }

    if (
        value.startsWith("http://")
        || value.startsWith("https://")
    ) {

        return value;
    }

    if (value.startsWith("//")) {

        return "https:" + value;
    }

    if (value.startsWith("/")) {

        return API_URL + value;
    }

    return value;
}


/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHTML(value) {

    if (
        value === null
        || value === undefined
    ) {

        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

    return escapeHTML(value);
}


/* =========================================================
   IMAGE HTML
========================================================= */

function imageHTML(
    url,
    alt = "",
    fallbackText = "V"
) {

    const imageUrl =
        normalizeImageUrl(url);

    if (!imageUrl) {

        return `
            <div class="admin-item-image">
                <div class="image-fallback">
                    ${escapeHTML(fallbackText)}
                </div>
            </div>
        `;
    }

    return `
        <div class="admin-item-image">

            <img
                src="${escapeAttribute(imageUrl)}"
                alt="${escapeAttribute(alt)}"
                loading="lazy"
                onerror="
                    this.style.display='none';
                    this.parentElement
                    .querySelector('.image-fallback')
                    .style.display='grid';
                "
            >

            <div
                class="image-fallback"
                style="display:none;"
            >
                ${escapeHTML(fallbackText)}
            </div>

        </div>
    `;
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;


function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}


/* =========================================================
   API FETCH
========================================================= */

async function apiFetch(
    endpoint,
    options = {}
) {

    const token =
        getToken();

    const headers =
        options.headers || {};

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }

    options.headers = headers;

    const response =
        await fetch(
            API_URL + endpoint,
            options
        );

    if (response.status === 401) {

        clearToken();

        showLogin();

        throw new Error(
            "Session expired. Please login again."
        );
    }

    let data = {};

    try {

        data = await response.json();

    } catch {

        data = {};
    }

    if (!response.ok) {

        throw new Error(
            data.detail
            || "Something went wrong"
        );
    }

    return data;
}


/* =========================================================
   LOGIN
========================================================= */

async function login(event) {

    event.preventDefault();

    const email =
        document.getElementById(
            "email"
        ).value.trim();

    const password =
        document.getElementById(
            "password"
        ).value;

    const errorElement =
        document.getElementById(
            "loginError"
        );

    errorElement.textContent = "";

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

    try {

        const data =
            await fetch(
                API_URL + "/api/login",
                {
                    method: "POST",
                    body: formData
                }
            );

        const result =
            await data.json();

        if (!data.ok) {

            throw new Error(
                result.detail
                || "Login failed"
            );
        }

        saveToken(
            result.token
        );

        showAdmin();

        await refreshAll();

        showToast(
            "Login successful"
        );

    } catch (error) {

        errorElement.textContent =
            error.message;

    }
}


/* =========================================================
   SHOW / HIDE
========================================================= */

function showAdmin() {

    loginPage.style.display =
        "none";

    adminApp.style.display =
        "";

}


function showLogin() {

    adminApp.style.display =
        "none";

    loginPage.style.display =
        "grid";
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await apiFetch(
            "/api/logout",
            {
                method: "POST"
            }
        );

    } catch {

    }

    clearToken();

    showLogin();

    showToast(
        "Logged out"
    );
}


/* =========================================================
   SECTION NAVIGATION
========================================================= */

function showSection(
    sectionId,
    button
) {

    document
        .querySelectorAll(".admin-section")
        .forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });


    const section =
        document.getElementById(
            sectionId
        );

    if (section) {

        section.classList.add(
            "active-section"
        );
    }


    document
        .querySelectorAll(".nav-btn")
        .forEach(btn => {

            btn.classList.remove(
                "active"
            );

        });


    if (button) {

        button.classList.add(
            "active"
        );

    } else {

        const navButton =
            document.querySelector(
                `.nav-btn[data-section="${sectionId}"]`
            );

        if (navButton) {

            navButton.classList.add(
                "active"
            );
        }
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   LOAD ADMIN DATA
========================================================= */

let currentData = {

    faculty: [],
    toppers: [],
    alumni: [],
    testimonials: []

};


async function loadAdminData() {

    const data =
        await apiFetch(
            "/api/admin/data"
        );

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
}


/* =========================================================
   RENDER ALL DATA
========================================================= */

function renderAdminData() {

    renderFaculty();

    renderToppers();

    renderAlumni();

    renderReviews();


    document.getElementById(
        "facultyCount"
    ).textContent =
        currentData.faculty.length;


    document.getElementById(
        "topCount"
    ).textContent =
        currentData.toppers.length;


    document.getElementById(
        "alumniCount"
    ).textContent =
        currentData.alumni.length;


    document.getElementById(
        "reviewCount"
    ).textContent =
        currentData.testimonials.length;
}


/* =========================================================
   FACULTY
========================================================= */

function renderFaculty() {

    const container =
        document.getElementById(
            "facultyList"
        );

    if (!currentData.faculty.length) {

        container.innerHTML =
            emptyState(
                "No faculty added",
                "Add your first faculty member above."
            );

        return;
    }


    container.innerHTML =
        currentData.faculty
            .map(faculty => {

                const photo =
                    getImageValue(
                        faculty.photo
                    );

                const initial =
                    faculty.name
                        ? faculty.name
                            .charAt(0)
                            .toUpperCase()
                        : "F";

                return `
                    <div class="admin-item">

                        ${imageHTML(
                            photo,
                            faculty.name,
                            initial
                        )}

                        <div class="admin-item-content">

                            <h3>
                                ${escapeHTML(
                                    faculty.name
                                )}
                            </h3>

                            <div class="subject">
                                ${escapeHTML(
                                    faculty.subject
                                )}
                            </div>

                            <p>
                                ${escapeHTML(
                                    faculty.description
                                )}
                            </p>

                        </div>

                        <div class="admin-item-actions">

                            <button
                                type="button"
                                class="edit-btn"
                                onclick="openFacultyEdit(${faculty.id})"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="delete-btn"
                                onclick="deleteFaculty(${faculty.id})"
                            >
                                Delete
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   ADD FACULTY
========================================================= */

async function addFaculty(event) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    try {

        await apiFetch(
            "/api/admin/faculty",
            {
                method: "POST",
                body: formData
            }
        );

        form.reset();

        await loadAdminData();

        showToast(
            "Faculty added successfully"
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   EDIT FACULTY MODAL
========================================================= */

function openFacultyEdit(id) {

    const faculty =
        currentData.faculty.find(
            item => Number(item.id) === Number(id)
        );

    if (!faculty) return;

    document.getElementById(
        "editType"
    ).value = "faculty";

    document.getElementById(
        "editId"
    ).value = faculty.id;

    document.getElementById(
        "editModalTitle"
    ).textContent =
        "Edit Faculty";


    editFields.innerHTML = `

        <div class="form-group">

            <label>Name</label>

            <input
                type="text"
                id="editName"
                name="name"
                value="${escapeAttribute(
                    faculty.name
                )}"
                required
            >

        </div>


        <div class="form-group">

            <label>Subject</label>

            <input
                type="text"
                id="editSubject"
                name="subject"
                value="${escapeAttribute(
                    faculty.subject
                )}"
                required
            >

        </div>


        <div class="form-group full-width">

            <label>Description</label>

            <textarea
                id="editDescription"
                name="description"
                rows="5"
            >${escapeHTML(
                faculty.description || ""
            )}</textarea>

        </div>


        <div class="form-group full-width">

            <label>Current Photo</label>

            ${
                normalizeImageUrl(
                    faculty.photo
                )
                ? `
                    <div class="current-edit-image">

                        <img
                            src="${escapeAttribute(
                                normalizeImageUrl(
                                    faculty.photo
                                )
                            )}"
                            alt=""
                        >

                    </div>
                `
                : `
                    <div class="no-photo-text">
                        No photo uploaded.
                    </div>
                `
            }

        </div>


        <div class="form-group full-width">

            <label>
                Replace Photo
            </label>

            <input
                type="file"
                id="editPhoto"
                name="photo"
                accept=".jpg,.jpeg,.png,.webp"
            >

            <small>
                Leave empty to keep the current photo.
            </small>

        </div>

    `;

    openEditModal();
}


/* =========================================================
   TOPPERS
========================================================= */

function renderToppers() {

    const container =
        document.getElementById(
            "topperList"
        );

    if (!currentData.toppers.length) {

        container.innerHTML =
            emptyState(
                "No toppers added",
                "Add topper profiles above."
            );

        return;
    }


    container.innerHTML =
        currentData.toppers
            .map(person => {

                const initial =
                    person.name
                        ? person.name
                            .charAt(0)
                            .toUpperCase()
                        : "T";

                return `
                    <div class="admin-item">

                        ${imageHTML(
                            person.photo,
                            person.name,
                            initial
                        )}

                        <div class="admin-item-content">

                            <h3>
                                ${escapeHTML(
                                    person.name
                                )}
                            </h3>

                            <small>
                                ${escapeHTML(
                                    person.details
                                )}
                            </small>

                            <p>
                                ${escapeHTML(
                                    person.review
                                )}
                            </p>

                        </div>

                        <div class="admin-item-actions">

                            <button
                                type="button"
                                class="edit-btn"
                                onclick="openPersonEdit('topper', ${person.id})"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="delete-btn"
                                onclick="deleteTopper(${person.id})"
                            >
                                Delete
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   ADD TOPPER
========================================================= */

async function addTopper(event) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    try {

        await apiFetch(
            "/api/admin/people",
            {
                method: "POST",
                body: formData
            }
        );

        form.reset();

        await loadAdminData();

        showToast(
            "Topper added successfully"
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   EDIT TOPPER / ALUMNI
========================================================= */

function openPersonEdit(
    type,
    id
) {

    const list =
        type === "topper"
            ? currentData.toppers
            : currentData.alumni;

    const person =
        list.find(
            item => Number(item.id) === Number(id)
        );

    if (!person) return;


    document.getElementById(
        "editType"
    ).value = type;

    document.getElementById(
        "editId"
    ).value = person.id;

    document.getElementById(
        "editModalTitle"
    ).textContent =
        type === "topper"
            ? "Edit Topper"
            : "Edit Alumni";


    editFields.innerHTML = `

        <div class="form-group">

            <label>Name</label>

            <input
                type="text"
                name="name"
                value="${escapeAttribute(
                    person.name
                )}"
                required
            >

        </div>


        <div class="form-group">

            <label>Details</label>

            <input
                type="text"
                name="details"
                value="${escapeAttribute(
                    person.details || ""
                )}"
            >

        </div>


        <div class="form-group full-width">

            <label>Review / Message</label>

            <textarea
                name="review"
                rows="5"
            >${escapeHTML(
                person.review || ""
            )}</textarea>

        </div>


        <div class="form-group full-width">

            <label>Current Photo</label>

            ${
                normalizeImageUrl(
                    person.photo
                )
                ? `
                    <div class="current-edit-image">

                        <img
                            src="${escapeAttribute(
                                normalizeImageUrl(
                                    person.photo
                                )
                            )}"
                            alt=""
                        >

                    </div>
                `
                : `
                    <div class="no-photo-text">
                        No photo uploaded.
                    </div>
                `
            }

        </div>


        <div class="form-group full-width">

            <label>
                Replace Photo
            </label>

            <input
                type="file"
                name="photo"
                accept=".jpg,.jpeg,.png,.webp"
            >

            <small>
                Leave empty to keep the current photo.
            </small>

        </div>

    `;

    openEditModal();
}


/* =========================================================
   ALUMNI
========================================================= */

function renderAlumni() {

    const container =
        document.getElementById(
            "alumniList"
        );

    if (!currentData.alumni.length) {

        container.innerHTML =
            emptyState(
                "No alumni added",
                "Add alumni profiles above."
            );

        return;
    }


    container.innerHTML =
        currentData.alumni
            .map(person => {

                const initial =
                    person.name
                        ? person.name
                            .charAt(0)
                            .toUpperCase()
                        : "A";

                return `
                    <div class="admin-item">

                        ${imageHTML(
                            person.photo,
                            person.name,
                            initial
                        )}

                        <div class="admin-item-content">

                            <h3>
                                ${escapeHTML(
                                    person.name
                                )}
                            </h3>

                            <small>
                                ${escapeHTML(
                                    person.details
                                )}
                            </small>

                            <p>
                                ${escapeHTML(
                                    person.review
                                )}
                            </p>

                        </div>

                        <div class="admin-item-actions">

                            <button
                                type="button"
                                class="edit-btn"
                                onclick="openPersonEdit('alumni', ${person.id})"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="delete-btn"
                                onclick="deleteAlumni(${person.id})"
                            >
                                Delete
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   ADD ALUMNI
========================================================= */

async function addAlumni(event) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    try {

        await apiFetch(
            "/api/admin/people",
            {
                method: "POST",
                body: formData
            }
        );

        form.reset();

        await loadAdminData();

        showToast(
            "Alumni added successfully"
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   REVIEWS
========================================================= */

function renderReviews() {

    const container =
        document.getElementById(
            "reviewList"
        );

    if (!currentData.testimonials.length) {

        container.innerHTML =
            emptyState(
                "No reviews added",
                "Add your first review above."
            );

        return;
    }


    container.innerHTML =
        currentData.testimonials
            .map(review => {

                const initial =
                    review.name
                        ? review.name
                            .charAt(0)
                            .toUpperCase()
                        : "R";

                return `
                    <div class="admin-item">

                        <div class="admin-item-image">

                            <div class="image-fallback">
                                ${escapeHTML(
                                    initial
                                )}
                            </div>

                        </div>

                        <div class="admin-item-content">

                            <h3>
                                ${escapeHTML(
                                    review.name
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    review.review
                                )}
                            </p>

                        </div>

                        <div class="admin-item-actions">

                            <button
                                type="button"
                                class="edit-btn"
                                onclick="openReviewEdit(${review.id})"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="delete-btn"
                                onclick="deleteReview(${review.id})"
                            >
                                Delete
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   ADD REVIEW
========================================================= */

async function addReview(event) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    try {

        await apiFetch(
            "/api/admin/testimonials",
            {
                method: "POST",
                body: formData
            }
        );

        form.reset();

        await loadAdminData();

        showToast(
            "Review added successfully"
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   EDIT REVIEW
========================================================= */

function openReviewEdit(id) {

    const review =
        currentData.testimonials.find(
            item => Number(item.id) === Number(id)
        );

    if (!review) return;


    document.getElementById(
        "editType"
    ).value = "review";

    document.getElementById(
        "editId"
    ).value = review.id;

    document.getElementById(
        "editModalTitle"
    ).textContent =
        "Edit Review";


    editFields.innerHTML = `

        <div class="form-group full-width">

            <label>Name</label>

            <input
                type="text"
                name="name"
                value="${escapeAttribute(
                    review.name
                )}"
                required
            >

        </div>


        <div class="form-group full-width">

            <label>Review</label>

            <textarea
                name="review"
                rows="6"
                required
            >${escapeHTML(
                review.review || ""
            )}</textarea>

        </div>

    `;

    openEditModal();
}


/* =========================================================
   SUBMIT EDIT
========================================================= */

async function submitEdit(event) {

    event.preventDefault();

    const type =
        document.getElementById(
            "editType"
        ).value;

    const id =
        document.getElementById(
            "editId"
        ).value;


    const formData =
        new FormData(
            editForm
        );


    let endpoint = "";


    if (type === "faculty") {

        endpoint =
            `/api/admin/faculty/${id}`;

    } else if (
        type === "topper"
        || type === "alumni"
    ) {

        formData.append(
            "type",
            type
        );

        endpoint =
            `/api/admin/people/${id}`;

    } else if (type === "review") {

        endpoint =
            `/api/admin/testimonials/${id}`;

    } else if (type === "gallery") {

        endpoint =
            `/api/admin/gallery/event/${id}`;
    }


    try {

        await apiFetch(
            endpoint,
            {
                method: "PUT",
                body: formData
            }
        );

        closeEditModal();

        await refreshAll();

        showToast(
            "Changes saved successfully"
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   MODAL
========================================================= */

function openEditModal() {

    editModal.classList.add(
        "show"
    );

    document.body.style.overflow =
        "hidden";
}


function closeEditModal() {

    editModal.classList.remove(
        "show"
    );

    document.body.style.overflow =
        "";

    editForm.reset();

    editFields.innerHTML =
        "";
}


function closeEditModalOnOverlay(
    event
) {

    if (
        event.target === editModal
    ) {

        closeEditModal();

    }
}


/* =========================================================
   DELETE FUNCTIONS
========================================================= */

async function deleteFaculty(id) {

    if (
        !confirm(
            "Delete this faculty member?"
        )
    ) {

        return;
    }

    try {

        await apiFetch(
            `/api/admin/faculty/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadAdminData();

        showToast(
            "Faculty deleted"
        );

    } catch (error) {

        alert(error.message);

    }
}


async function deleteTopper(id) {

    if (
        !confirm(
            "Delete this topper?"
        )
    ) {

        return;
    }

    try {

        await apiFetch(
            `/api/admin/topper/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadAdminData();

        showToast(
            "Topper deleted"
        );

    } catch (error) {

        alert(error.message);

    }
}


async function deleteAlumni(id) {

    if (
        !confirm(
            "Delete this alumni?"
        )
    ) {

        return;
    }

    try {

        await apiFetch(
            `/api/admin/alumni/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadAdminData();

        showToast(
            "Alumni deleted"
        );

    } catch (error) {

        alert(error.message);

    }
}


async function deleteReview(id) {

    if (
        !confirm(
            "Delete this review?"
        )
    ) {

        return;
    }

    try {

        await apiFetch(
            `/api/admin/review/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadAdminData();

        showToast(
            "Review deleted"
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   GALLERY
========================================================= */

let galleryData = [];


async function loadAdminGallery() {

    const data =
        await apiFetch(
            "/api/admin/gallery"
        );

    if (Array.isArray(data)) {

        galleryData = data;

    } else if (
        Array.isArray(data.gallery)
    ) {

        galleryData = data.gallery;

    } else if (
        Array.isArray(data.events)
    ) {

        galleryData = data.events;

    } else {

        galleryData = [];

    }

    renderAdminGallery();


    document.getElementById(
        "galleryCount"
    ).textContent =
        galleryData.length;
}


/* =========================================================
   RENDER GALLERY
========================================================= */

function renderAdminGallery() {

    const container =
        document.getElementById(
            "galleryAdminList"
        );


    if (!galleryData.length) {

        container.innerHTML =
            emptyState(
                "No gallery events",
                "Create your first gallery event above."
            );

        return;
    }


    container.innerHTML =
        galleryData
            .map(event => {

                const cover =
                    getImageValue(
                        event.cover_photo
                    );


                const photos =
                    Array.isArray(event.photos)
                        ? event.photos
                        : [];


                const photosHTML =
                    photos.length
                        ? photos
                            .map(photo => {

                                const photoURL =
                                    getImageValue(
                                        photo.photo_url
                                        || photo.url
                                        || photo.photo
                                        || photo.image_url
                                    );

                                return `
                                    <div class="gallery-photo-item">

                                        <div class="gallery-photo-image">

                                            ${
                                                photoURL
                                                ? `
                                                    <img
                                                        src="${escapeAttribute(
                                                            normalizeImageUrl(
                                                                photoURL
                                                            )
                                                        )}"
                                                        alt=""
                                                        loading="lazy"
                                                        onerror="
                                                            this.style.display='none';
                                                            this.parentElement
                                                            .querySelector('.image-fallback')
                                                            .style.display='grid';
                                                        "
                                                    >
                                                `
                                                : ""
                                            }

                                            <div
                                                class="image-fallback"
                                                style="${
                                                    photoURL
                                                        ? "display:none;"
                                                        : "display:grid;"
                                                }"
                                            >
                                                🖼️
                                            </div>

                                        </div>


                                        <div class="gallery-photo-actions">

                                            <button
                                                type="button"
                                                class="cover-btn"
                                                onclick="setGalleryCover(${event.id}, ${photo.id})"
                                            >
                                                Cover
                                            </button>

                                            <button
                                                type="button"
                                                class="delete-btn"
                                                onclick="deleteGalleryPhoto(${photo.id})"
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </div>
                                `;

                            })
                            .join("")
                        : `
                            <div class="empty-state">
                                <strong>
                                    No photos yet
                                </strong>
                                Upload photos for this event above.
                            </div>
                        `;


                return `
                    <div class="gallery-admin-card">

                        <div class="gallery-admin-header">

                            <div>

                                <h2>
                                    ${escapeHTML(
                                        event.title
                                    )}
                                </h2>

                                <p>
                                    ${escapeHTML(
                                        event.description
                                    )}
                                </p>

                                ${
                                    event.event_date
                                    ? `
                                        <small>
                                            ${escapeHTML(
                                                event.event_date
                                            )}
                                        </small>
                                    `
                                    : ""
                                }

                            </div>


                            <div class="gallery-event-actions">

                                <button
                                    type="button"
                                    class="edit-btn"
                                    onclick="openGalleryEdit(${event.id})"
                                >
                                    Edit Event
                                </button>

                                <button
                                    type="button"
                                    class="delete-btn"
                                    onclick="deleteGalleryEvent(${event.id})"
                                >
                                    Delete Event
                                </button>

                            </div>

                        </div>


                        ${
                            cover
                            ? `
                                <div class="gallery-cover-preview">

                                    <img
                                        src="${escapeAttribute(
                                            normalizeImageUrl(
                                                cover
                                            )
                                        )}"
                                        alt="Gallery cover"
                                        loading="lazy"
                                    >

                                    <span class="cover-label">
                                        Current Cover
                                    </span>

                                </div>
                            `
                            : `
                                <div class="empty-state">
                                    No cover photo selected.
                                </div>
                            `
                        }


                        <div class="gallery-upload-box">

                            <form
                                onsubmit="uploadGalleryPhotos(event, ${event.id})"
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

                            ${photosHTML}

                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   CREATE GALLERY EVENT
========================================================= */

async function createGalleryEvent(
    event
) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    try {

        await apiFetch(
            "/api/admin/gallery/event",
            {
                method: "POST",
                body: formData
            }
        );

        form.reset();

        await loadAdminGallery();

        showToast(
            "Gallery event created"
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   EDIT GALLERY EVENT
========================================================= */

function openGalleryEdit(id) {

    const event =
        galleryData.find(
            item => Number(item.id) === Number(id)
        );

    if (!event) return;


    document.getElementById(
        "editType"
    ).value = "gallery";

    document.getElementById(
        "editId"
    ).value = event.id;

    document.getElementById(
        "editModalTitle"
    ).textContent =
        "Edit Gallery Event";


    editFields.innerHTML = `

        <div class="form-group">

            <label>
                Event Title
            </label>

            <input
                type="text"
                name="title"
                value="${escapeAttribute(
                    event.title
                )}"
                required
            >

        </div>


        <div class="form-group">

            <label>
                Event Date
            </label>

            <input
                type="date"
                name="event_date"
                value="${escapeAttribute(
                    event.event_date || ""
                )}"
            >

        </div>


        <div class="form-group full-width">

            <label>
                Description
            </label>

            <textarea
                name="description"
                rows="5"
            >${escapeHTML(
                event.description || ""
            )}</textarea>

        </div>


        <div class="form-group full-width">

            <label>
                Current Cover
            </label>

            ${
                normalizeImageUrl(
                    event.cover_photo
                )
                ? `
                    <div class="current-edit-image">

                        <img
                            src="${escapeAttribute(
                                normalizeImageUrl(
                                    event.cover_photo
                                )
                            )}"
                            alt=""
                        >

                    </div>
                `
                : `
                    <div class="no-photo-text">
                        No cover photo.
                    </div>
                `
            }

        </div>


        <div class="form-group full-width">

            <label>
                Replace Cover Photo
            </label>

            <input
                type="file"
                name="cover_photo"
                accept=".jpg,.jpeg,.png,.webp"
            >

            <small>
                Leave empty to keep the current cover.
            </small>

        </div>

    `;

    openEditModal();
}


/* =========================================================
   UPLOAD GALLERY PHOTOS
========================================================= */

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

        const result =
            await apiFetch(
                `/api/admin/gallery/${eventId}/photos`,
                {
                    method: "POST",
                    body: formData
                }
            );

        form.reset();

        await loadAdminGallery();

        showToast(
            `${result.count || 0} photo(s) uploaded`
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   SET GALLERY COVER
========================================================= */

async function setGalleryCover(
    eventId,
    photoId
) {

    try {

        await apiFetch(
            `/api/admin/gallery/${eventId}/cover/${photoId}`,
            {
                method: "PUT"
            }
        );

        await loadAdminGallery();

        showToast(
            "Cover photo updated"
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   DELETE GALLERY PHOTO
========================================================= */

async function deleteGalleryPhoto(
    photoId
) {

    if (
        !confirm(
            "Delete this gallery photo?"
        )
    ) {

        return;
    }

    try {

        await apiFetch(
            `/api/admin/gallery/photo/${photoId}`,
            {
                method: "DELETE"
            }
        );

        await loadAdminGallery();

        showToast(
            "Photo deleted"
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   DELETE GALLERY EVENT
========================================================= */

async function deleteGalleryEvent(
    eventId
) {

    if (
        !confirm(
            "Delete this event and all its photos?"
        )
    ) {

        return;
    }

    try {

        await apiFetch(
            `/api/admin/gallery/event/${eventId}`,
            {
                method: "DELETE"
            }
        );

        await loadAdminGallery();

        showToast(
            "Gallery event deleted"
        );

    } catch (error) {

        alert(error.message);

    }
}


/* =========================================================
   EMPTY STATE
========================================================= */

function emptyState(
    title,
    message
) {

    return `
        <div class="empty-state">

            <strong>
                ${escapeHTML(title)}
            </strong>

            ${escapeHTML(message)}

        </div>
    `;
}


/* =========================================================
   REFRESH
========================================================= */

async function refreshAll() {

    try {

        await Promise.all([
            loadAdminData(),
            loadAdminGallery()
        ]);

    } catch (error) {

        console.error(error);

        if (
            getToken()
        ) {

            showToast(
                error.message
            );
        }
    }
}


/* =========================================================
   ESC KEY FOR MODAL
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
            && editModal.classList.contains("show")
        ) {

            closeEditModal();

        }

    }
);


/* =========================================================
   INITIAL LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (getToken()) {

            showAdmin();

            try {

                await refreshAll();

            } catch {

                clearToken();

                showLogin();

            }

        } else {

            showLogin();

        }

    }
);