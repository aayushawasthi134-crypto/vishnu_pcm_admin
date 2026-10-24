const API_URL =
    (window.VISHNU_CONFIG && window.VISHNU_CONFIG.apiBaseUrl) ||
    document.querySelector('meta[name="api-base-url"]')?.content ||
    window.location.origin;


/* =========================================================
   AUTH
========================================================= */

function getToken() {
    return localStorage.getItem("adminToken");
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
   CURRENT DATA
========================================================= */

let currentData = {

    faculty: [],
    toppers: [],
    alumni: [],
    testimonials: [],
    pending_reviews: [],
    enquiries: []

};


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            character => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            }[character])
        );

}


function escapeAttribute(value) {

    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            character => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            }[character])
        );

}


function getImageValue(item) {

    if (!item) {
        return "";
    }

    return (
        item.photo ||
        item.photo_url ||
        ""
    );

}


function normalizeImageUrl(photo) {

    if (!photo) {
        return "";
    }

    if (
        photo.startsWith("http://") ||
        photo.startsWith("https://")
    ) {

        return photo;

    }

    return `${API_URL}${photo}`;

}


function imageHTML(
    photo,
    alt = ""
) {

    if (!photo) {

        return `
            <div class="image-fallback">
                📷
            </div>
        `;

    }


    return `

        <img
            src="${escapeAttribute(
                normalizeImageUrl(photo)
            )}"
            alt="${escapeAttribute(alt)}"
        >

    `;

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;


function showToast(
    message,
    type = "normal"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    toast.textContent = message;

    toast.className =
        `toast show ${type}`;


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {
                toast.className =
                    "toast";
            },
            3000
        );

}


/* =========================================================
   API
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

        headers[
            "Authorization"
        ] =
            `Bearer ${token}`;

    }


    options.headers =
        headers;


    const response =
        await fetch(
            `${API_URL}${endpoint}`,
            options
        );


    if (
        response.status === 401
    ) {

        clearToken();
        showLogin();

        throw new Error(
            "Session expired. Please login again."
        );

    }


    let data = null;


    try {

        data =
            await response.json();

    }

    catch {

        data = null;

    }


    if (!response.ok) {

        throw new Error(
            data?.detail ||
            "Request failed."
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


    const error =
        document.getElementById(
            "loginError"
        );


    error.textContent = "";


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


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                "Invalid email or password."
            );

        }


        saveToken(
            data.token
        );


        showAdmin();


        await refreshAll();


        showToast(
            "Login successful."
        );

    }

    catch (err) {

        error.textContent =
            err.message ||
            "Login failed.";

    }

}


/* =========================================================
   SHOW LOGIN / ADMIN
========================================================= */

function showAdmin() {

    document.getElementById(
        "loginPage"
    ).style.display = "none";


    document.getElementById(
        "adminApp"
    ).style.display = "flex";

}


function showLogin() {

    document.getElementById(
        "loginPage"
    ).style.display = "grid";


    document.getElementById(
        "adminApp"
    ).style.display = "none";

}


async function logout() {

    try {

        await apiFetch(
            "/api/logout",
            {
                method: "POST"
            }
        );

    }

    catch {

        // Logout locally even if server request fails.

    }


    clearToken();

    showLogin();

}


/* =========================================================
   SECTION NAVIGATION
========================================================= */

function showSection(
    sectionId,
    button
) {

    document
        .querySelectorAll(
            ".admin-section"
        )
        .forEach(
            section => {
                section.classList.remove(
                    "active-section"
                );
            }
        );


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
        .querySelectorAll(
            ".nav-btn"
        )
        .forEach(
            nav => {
                nav.classList.remove(
                    "active"
                );
            }
        );


    if (button) {

        button.classList.add(
            "active"
        );

    }

}


/* =========================================================
   LOAD ADMIN DATA
========================================================= */

async function loadAdminData() {

    const data =
        await apiFetch(
            "/api/admin/data"
        );


    currentData =
        data || {};


    currentData.faculty =
        currentData.faculty || [];


    currentData.toppers =
        currentData.toppers || [];


    currentData.alumni =
        currentData.alumni || [];


    currentData.testimonials =
        currentData.testimonials || [];


    currentData.pending_reviews =
        currentData.pending_reviews || [];

    currentData.enquiries =
        currentData.enquiries || [];


    renderAdminData();

}


/* =========================================================
   RENDER ALL DATA
========================================================= */


function renderAdminData() {
    renderFaculty(currentData.faculty);
    renderToppers(currentData.toppers);
    renderAlumni(currentData.alumni);

    const approvedReviews = currentData.testimonials.filter(
        review => review.status === "approved"
    );

    renderReviews(
        approvedReviews,
        currentData.pending_reviews
    );
    renderEnquiries(currentData.enquiries);

    document.getElementById("facultyCount").textContent =
        currentData.faculty.length;

    document.getElementById("topCount").textContent =
        currentData.toppers.length;

    document.getElementById("alumniCount").textContent =
        currentData.alumni.length;

    document.getElementById("reviewCount").textContent =
        approvedReviews.length;

    document.getElementById("pendingReviewCount").textContent =
        currentData.pending_reviews.length;

    document.getElementById("enquiryCount").textContent =
        currentData.enquiries.filter(enquiry => enquiry.status === "new").length;
}


/* =========================================================
   ENQUIRIES
========================================================= */

function renderEnquiries(enquiries) {
    const container = document.getElementById("enquiryList");

    if (!container) {
        return;
    }

    if (!enquiries.length) {
        container.innerHTML = emptyState("No website enquiries yet.");
        return;
    }

    container.innerHTML = enquiries.map(enquiry => {
        const phoneDigits = String(enquiry.phone || "").replace(/[^\d+]/g, "");
        const status = enquiry.status === "contacted" ? "CONTACTED" : "NEW";
        const createdAt = enquiry.created_at
            ? new Date(enquiry.created_at).toLocaleString()
            : "Date unavailable";

        return `
            <article class="admin-item">
                <div class="admin-item-content">
                    <div class="review-meta">
                        <span class="status-badge ${status === "NEW" ? "pending" : "approved"}">
                            ${status}
                        </span>
                        <small>${escapeHTML(createdAt)}</small>
                    </div>
                    <h3>${escapeHTML(enquiry.name)}</h3>
                    <p><a href="tel:${escapeAttribute(phoneDigits)}">${escapeHTML(enquiry.phone)}</a></p>
                    ${
                        enquiry.email
                            ? `<p><a href="mailto:${escapeAttribute(enquiry.email)}">${escapeHTML(enquiry.email)}</a></p>`
                            : ""
                    }
                    <p class="review-text">${escapeHTML(enquiry.message)}</p>
                </div>
                <div class="admin-item-actions">
                    ${
                        enquiry.status !== "contacted"
                            ? `<button class="approve-btn" onclick="markEnquiryContacted(${Number(enquiry.id)})">Mark contacted</button>`
                            : ""
                    }
                    <button class="delete-btn" onclick="deleteEnquiry(${Number(enquiry.id)})">Delete</button>
                </div>
            </article>
        `;
    }).join("");
}


async function markEnquiryContacted(id) {
    try {
        await apiFetch(
            `/api/admin/enquiries/${id}/contacted`,
            { method: "PUT" }
        );
        await loadAdminData();
        showToast("Enquiry marked as contacted.");
    } catch (error) {
        showToast(error.message, "error");
    }
}


async function deleteEnquiry(id) {
    if (!confirm("Delete this enquiry?")) {
        return;
    }

    try {
        await apiFetch(
            `/api/admin/enquiries/${id}`,
            { method: "DELETE" }
        );
        await loadAdminData();
        showToast("Enquiry deleted.");
    } catch (error) {
        showToast(error.message, "error");
    }
}


/* =========================================================
   FACULTY
========================================================= */

function renderFaculty(
    faculty
) {

    const container =
        document.getElementById(
            "facultyList"
        );


    if (!container) {
        return;
    }


    if (!faculty.length) {

        container.innerHTML =
            emptyState(
                "No faculty added yet."
            );

        return;

    }


    container.innerHTML =
        faculty.map(
            item => `

            <div class="admin-item">

                <div class="admin-item-image">
                    ${imageHTML(
                        getImageValue(item),
                        item.name
                    )}
                </div>


                <div class="admin-item-content">

                    <h3>
                        ${escapeHTML(
                            item.name
                        )}
                    </h3>

                    <span class="subject">
                        ${escapeHTML(
                            item.subject
                        )}
                    </span>

                    <p>
                        ${escapeHTML(
                            item.description
                        )}
                    </p>

                </div>


                <div class="admin-item-actions">

                    <button
                        class="edit-btn"
                        onclick="openFacultyEdit(${item.id})"
                    >
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deleteFaculty(${item.id})"
                    >
                        Delete
                    </button>

                </div>

            </div>

        `
        ).join("");

}


async function addFaculty(event) {

    event.preventDefault();


    const form =
        event.target;


    try {

        const data =
            new FormData(form);


        await apiFetch(
            "/api/admin/faculty",
            {
                method: "POST",
                body: data
            }
        );


        form.reset();

        await loadAdminData();

        showToast(
            "Faculty added successfully."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


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
            "Faculty deleted."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function openFacultyEdit(id) {

    const item =
        currentData.faculty.find(
            x => Number(x.id) === Number(id)
        );


    if (!item) {
        return;
    }


    openEditModal(
        "faculty",
        item
    );

}


/* =========================================================
   TOPPERS
========================================================= */

function renderToppers(
    toppers
) {

    const container =
        document.getElementById(
            "topperList"
        );


    if (!container) {
        return;
    }


    if (!toppers.length) {

        container.innerHTML =
            emptyState(
                "No toppers added yet."
            );

        return;

    }


    container.innerHTML =
        toppers.map(
            item => `

            <div class="admin-item">

                <div class="admin-item-image">
                    ${imageHTML(
                        getImageValue(item),
                        item.name
                    )}
                </div>


                <div class="admin-item-content">

                    <h3>
                        ${escapeHTML(
                            item.name
                        )}
                    </h3>

                    <span class="subject">
                        TOPPER
                    </span>

                    <p>
                        ${escapeHTML(
                            item.details
                        )}
                    </p>

                    ${
                        item.review
                        ?

                        `<p>
                            “${escapeHTML(
                                item.review
                            )}”
                        </p>`

                        :

                        ""
                    }

                </div>


                <div class="admin-item-actions">

                    <button
                        class="edit-btn"
                        onclick="openPersonEdit('topper', ${item.id})"
                    >
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deletePerson('topper', ${item.id})"
                    >
                        Delete
                    </button>

                </div>

            </div>

        `
        ).join("");

}


async function addTopper(event) {

    event.preventDefault();


    try {

        const data =
            new FormData(
                event.target
            );


        await apiFetch(
            "/api/admin/people",
            {
                method: "POST",
                body: data
            }
        );


        event.target.reset();


        await loadAdminData();


        showToast(
            "Topper added successfully."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* =========================================================
   ALUMNI
========================================================= */

function renderAlumni(
    alumni
) {

    const container =
        document.getElementById(
            "alumniList"
        );


    if (!container) {
        return;
    }


    if (!alumni.length) {

        container.innerHTML =
            emptyState(
                "No alumni added yet."
            );

        return;

    }


    container.innerHTML =
        alumni.map(
            item => `

            <div class="admin-item">

                <div class="admin-item-image">
                    ${imageHTML(
                        getImageValue(item),
                        item.name
                    )}
                </div>


                <div class="admin-item-content">

                    <h3>
                        ${escapeHTML(
                            item.name
                        )}
                    </h3>

                    <span class="subject">
                        ALUMNI
                    </span>

                    <p>
                        ${escapeHTML(
                            item.details
                        )}
                    </p>

                    ${
                        item.review
                        ?

                        `<p>
                            “${escapeHTML(
                                item.review
                            )}”
                        </p>`

                        :

                        ""
                    }

                </div>


                <div class="admin-item-actions">

                    <button
                        class="edit-btn"
                        onclick="openPersonEdit('alumni', ${item.id})"
                    >
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deletePerson('alumni', ${item.id})"
                    >
                        Delete
                    </button>

                </div>

            </div>

        `
        ).join("");

}


async function addAlumni(event) {

    event.preventDefault();


    try {

        const data =
            new FormData(
                event.target
            );


        await apiFetch(
            "/api/admin/people",
            {
                method: "POST",
                body: data
            }
        );


        event.target.reset();


        await loadAdminData();


        showToast(
            "Alumni added successfully."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function openPersonEdit(
    type,
    id
) {

    const source =
        type === "topper"
            ? currentData.toppers
            : currentData.alumni;


    const item =
        source.find(
            x => Number(x.id) === Number(id)
        );


    if (!item) {
        return;
    }


    openEditModal(
        type,
        item
    );

}


async function deletePerson(
    type,
    id
) {

    if (
        !confirm(
            `Delete this ${type}?`
        )
    ) {
        return;
    }


    try {

        await apiFetch(
            `/api/admin/${type}/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadAdminData();


        showToast(
            `${type} deleted.`
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* =========================================================
   REVIEWS
========================================================= */

function renderReviews(
    approved,
    pending
) {

    const pendingContainer =
        document.getElementById(
            "pendingReviewList"
        );


    const approvedContainer =
        document.getElementById(
            "reviewList"
        );


    const badge =
        document.getElementById(
            "pendingReviewBadge"
        );


    if (badge) {

        badge.textContent =
            `${pending.length} Pending`;

    }


    if (pendingContainer) {

        if (!pending.length) {

            pendingContainer.innerHTML =
                emptyState(
                    "No pending reviews. All caught up!"
                );

        }

        else {

            pendingContainer.innerHTML =
                pending.map(
                    review => `

                    <div class="admin-item pending-review-item">

                        <div class="review-status-icon">
                            ⏳
                        </div>


                        <div class="admin-item-content">

                            <div class="review-meta">

                                <span class="status-badge pending">
                                    PENDING
                                </span>

                            </div>


                            <h3>
                                ${escapeHTML(
                                    review.name
                                )}
                            </h3>


                            <p class="review-text">
                                “${escapeHTML(
                                    review.review
                                )}”
                            </p>


                            <small>
                                Submitted for approval
                            </small>

                        </div>


                        <div class="admin-item-actions">

                            <button
                                class="approve-btn"
                                onclick="approveReview(${review.id})"
                            >
                                ✓ Approve
                            </button>


                            <button
                                class="delete-btn"
                                onclick="rejectReview(${review.id})"
                            >
                                ✕ Reject
                            </button>

                        </div>

                    </div>

                `
                ).join("");

        }

    }


    if (approvedContainer) {

        if (!approved.length) {

            approvedContainer.innerHTML =
                emptyState(
                    "No approved reviews yet."
                );

        }

        else {

            approvedContainer.innerHTML =
                approved.map(
                    review => `

                    <div class="admin-item">

                        <div class="review-status-icon approved-icon">
                            ✓
                        </div>


                        <div class="admin-item-content">

                            <div class="review-meta">

                                <span class="status-badge approved">
                                    APPROVED
                                </span>

                            </div>


                            <h3>
                                ${escapeHTML(
                                    review.name
                                )}
                            </h3>


                            <p class="review-text">
                                “${escapeHTML(
                                    review.review
                                )}”
                            </p>

                        </div>


                        <div class="admin-item-actions">

                            <button
                                class="edit-btn"
                                onclick="openReviewEdit(${review.id})"
                            >
                                Edit
                            </button>


                            <button
                                class="delete-btn"
                                onclick="deleteReview(${review.id})"
                            >
                                Delete
                            </button>

                        </div>

                    </div>

                `
                ).join("");

        }

    }

}


async function addReview(event) {

    event.preventDefault();


    try {

        const data =
            new FormData(
                event.target
            );


        await apiFetch(
            "/api/admin/testimonials",
            {
                method: "POST",
                body: data
            }
        );


        event.target.reset();


        await loadAdminData();


        showToast(
            "Review added and approved."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function openReviewEdit(id) {

    const item =
        currentData.testimonials.find(
            x => Number(x.id) === Number(id)
        );


    if (!item) {
        return;
    }


    openEditModal(
        "review",
        item
    );

}


async function approveReview(id) {

    if (
        !confirm(
            "Approve this review and show it on the website?"
        )
    ) {
        return;
    }


    try {

        await apiFetch(
            `/api/admin/review/${id}/approve`,
            {
                method: "PUT"
            }
        );


        await loadAdminData();


        showToast(
            "Review approved. It is now visible on the website."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


async function rejectReview(id) {
    if (!confirm("Are you sure you want to reject this review?")) {
        return;
    }

    try {
        await apiFetch(
            `/api/admin/review/${id}/reject`,
            {
                method: "PUT"
            }
        );

        await loadAdminData();

        showToast("Review rejected successfully.");

    } catch (error) {
        showToast(error.message, "error");
    }
}



async function deleteReview(id) {

    if (
        !confirm(
            "Delete this approved review?"
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
            "Review deleted."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* =========================================================
   EDIT MODAL
========================================================= */

function openEditModal(
    type,
    item
) {

    const modal =
        document.getElementById(
            "editModal"
        );


    const fields =
        document.getElementById(
            "editFields"
        );


    document.getElementById(
        "editType"
    ).value =
        type;


    document.getElementById(
        "editId"
    ).value =
        item.id;


    let html = "";


    if (type === "faculty") {

        html = `

            <div class="form-group">

                <label>
                    Name
                </label>

                <input
                    name="name"
                    value="${escapeAttribute(
                        item.name
                    )}"
                    required
                >

            </div>


            <div class="form-group">

                <label>
                    Subject
                </label>

                <input
                    name="subject"
                    value="${escapeAttribute(
                        item.subject
                    )}"
                    required
                >

            </div>


            <div class="form-group full-width">

                <label>
                    Description
                </label>

                <textarea
                    name="description"
                    required
                >${escapeHTML(
                    item.description
                )}</textarea>

            </div>


            <div class="form-group full-width">

                <label>
                    Replace Photo
                </label>

                <input
                    type="file"
                    name="photo"
                    accept="image/*"
                >

            </div>

        `;

    }


    else if (
        type === "topper" ||
        type === "alumni"
    ) {

        html = `

            <div class="form-group">

                <label>
                    Name
                </label>

                <input
                    name="name"
                    value="${escapeAttribute(
                        item.name
                    )}"
                    required
                >

            </div>


            <div class="form-group">

                <label>
                    Details
                </label>

                <input
                    name="details"
                    value="${escapeAttribute(
                        item.details
                    )}"
                    placeholder="${type === "topper" ? "Class 12 | 97.5% | JEE percentile 99.2" : "Course / achievement"}"
                >

            </div>


            <div class="form-group full-width">

                <label>
                    Review / Message
                </label>

                <textarea
                    name="review"
                >${escapeHTML(
                    item.review
                )}</textarea>

            </div>


            <div class="form-group full-width">

                <label>
                    Replace Photo
                </label>

                <input
                    type="file"
                    name="photo"
                    accept="image/*"
                >

            </div>

        `;

    }


    else if (type === "review") {

        html = `

            <div class="form-group">

                <label>
                    Name
                </label>

                <input
                    name="name"
                    value="${escapeAttribute(
                        item.name
                    )}"
                    required
                >

            </div>


            <div class="form-group full-width">

                <label>
                    Review
                </label>

                <textarea
                    name="review"
                    required
                >${escapeHTML(
                    item.review
                )}</textarea>

            </div>

        `;

    }


    fields.innerHTML =
        html;


    modal.classList.add(
        "show"
    );

}


function closeEditModal() {

    const modal =
        document.getElementById(
            "editModal"
        );


    modal.classList.remove(
        "show"
    );

}


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


    const data =
        new FormData(
            event.target
        );


    let endpoint;


    if (type === "faculty") {

        endpoint =
            `/api/admin/faculty/${id}`;

    }

    else if (
        type === "topper" ||
        type === "alumni"
    ) {

        endpoint =
            `/api/admin/people/${id}`;

    }

    else if (type === "review") {

        endpoint =
            `/api/admin/testimonials/${id}`;

    }

    else {

        showToast(
            "Invalid edit type.",
            "error"
        );

        return;

    }


    try {

        await apiFetch(
            endpoint,
            {
                method: "PUT",
                body: data
            }
        );


        closeEditModal();


        await loadAdminData();


        showToast(
            "Changes saved successfully."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* =========================================================
   GALLERY
========================================================= */

async function loadAdminGallery() {

    try {

        const data =
            await apiFetch(
                "/api/admin/gallery"
            );


        renderAdminGallery(
            data || []
        );

    }

    catch (error) {

        console.error(
            "Gallery loading error:",
            error
        );

    }

}


function renderAdminGallery(
    events
) {

    const container =
        document.getElementById(
            "galleryAdminList"
        );


    if (!container) {
        return;
    }


    document.getElementById(
        "galleryCount"
    ).textContent =
        events.length;


    if (!events.length) {

        container.innerHTML =
            emptyState(
                "No gallery events yet."
            );

        return;

    }


    container.innerHTML =
        events.map(
            event => {

                const photos =
                    event.photos || [];


                const cover =
                    event.cover_photo ||
                    photos[0]?.photo_url ||
                    "";


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
                                    event.description || ""
                                )}
                            </p>

                            ${
                                event.event_date
                                ?

                                `<small>
                                    ${escapeHTML(
                                        String(
                                            event.event_date
                                        )
                                    )}
                                </small>`

                                :

                                ""
                            }

                        </div>


                        <div class="gallery-event-actions">

                            <button
                                class="edit-btn"
                                onclick="openGalleryEdit(${event.id})"
                            >
                                Edit
                            </button>


                            <button
                                class="delete-btn"
                                onclick="deleteGalleryEvent(${event.id})"
                            >
                                Delete Event
                            </button>

                        </div>

                    </div>


                    ${
                        cover

                        ?

                        `

                        <div class="gallery-cover-preview">

                            <img
                                src="${escapeAttribute(
                                    normalizeImageUrl(
                                        cover
                                    )
                                )}"
                                alt="${escapeAttribute(
                                    event.title
                                )}"
                            >

                            <span class="cover-label">
                                COVER PHOTO
                            </span>

                        </div>

                        `

                        :

                        ""
                    }


                    <div class="gallery-upload-box">

                        <form
                            onsubmit="uploadGalleryPhotos(event, ${event.id})"
                        >

                            <input
                                type="file"
                                name="photos"
                                accept="image/*"
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
                            photos.length

                            ?

                            photos.map(
                                photo => `

                                <div class="gallery-photo-item">

                                    <div class="gallery-photo-image">

                                        <img
                                            src="${escapeAttribute(
                                                normalizeImageUrl(
                                                    photo.photo_url
                                                )
                                            )}"
                                            alt="Gallery"
                                        >

                                    </div>


                                    <div class="gallery-photo-actions">

                                        <button
                                            class="cover-btn"
                                            onclick="setGalleryCover(${event.id}, ${photo.id})"
                                        >
                                            Set Cover
                                        </button>


                                        <button
                                            class="delete-btn"
                                            onclick="deleteGalleryPhoto(${photo.id})"
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>

                            `
                            ).join("")

                            :

                            `
                            <div class="empty-state">
                                No photos uploaded.
                            </div>
                            `
                        }

                    </div>

                </div>

            `;

            }
        ).join("");

}


async function createGalleryEvent(
    event
) {

    event.preventDefault();


    try {

        const data =
            new FormData(
                event.target
            );


        await apiFetch(
            "/api/admin/gallery/event",
            {
                method: "POST",
                body: data
            }
        );


        event.target.reset();


        await loadAdminGallery();


        showToast(
            "Gallery event created."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function openGalleryEdit(
    id
) {

    const title =
        prompt(
            "Enter new event title:"
        );


    if (title === null) {
        return;
    }


    const description =
        prompt(
            "Enter new description:"
        );


    const eventDate =
        prompt(
            "Enter event date (YYYY-MM-DD):"
        );


    const formData =
        new FormData();


    formData.append(
        "title",
        title.trim()
    );


    formData.append(
        "description",
        description || ""
    );


    formData.append(
        "event_date",
        eventDate || ""
    );


    apiFetch(
        `/api/admin/gallery/event/${id}`,
        {
            method: "PUT",
            body: formData
        }
    )
        .then(
            async () => {

                await loadAdminGallery();

                showToast(
                    "Gallery event updated."
                );

            }
        )
        .catch(
            error => {

                showToast(
                    error.message,
                    "error"
                );

            }
        );

}


async function uploadGalleryPhotos(
    event,
    eventId
) {

    event.preventDefault();


    try {

        const data =
            new FormData(
                event.target
            );


        await apiFetch(
            `/api/admin/gallery/${eventId}/photos`,
            {
                method: "POST",
                body: data
            }
        );


        event.target.reset();


        await loadAdminGallery();


        showToast(
            "Photos uploaded."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


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
            "Cover photo updated."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


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

        await apiFetch(
            `/api/admin/gallery/photo/${photoId}`,
            {
                method: "DELETE"
            }
        );


        await loadAdminGallery();


        showToast(
            "Photo deleted."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


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

        await apiFetch(
            `/api/admin/gallery/event/${eventId}`,
            {
                method: "DELETE"
            }
        );


        await loadAdminGallery();


        showToast(
            "Gallery event deleted."
        );

    }

    catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


/* =========================================================
   EMPTY STATE
========================================================= */

function emptyState(
    message
) {

    return `

        <div class="empty-state">

            <strong>
                Nothing here yet
            </strong>

            <span>
                ${escapeHTML(
                    message
                )}
            </span>

        </div>

    `;

}


/* =========================================================
   REFRESH
========================================================= */

async function refreshAll() {

    await Promise.all([
        loadAdminData(),
        loadAdminGallery()
    ]);

}


/* =========================================================
   MODAL ESC
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeEditModal();

        }

    }
);


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {
        const websiteLink = document.querySelector(".website-link");
        const configuredWebsiteUrl =
            (window.VISHNU_CONFIG && window.VISHNU_CONFIG.siteUrl) ||
            document.querySelector('meta[name="website-url"]')?.content;

        if (websiteLink && configuredWebsiteUrl) {
            websiteLink.href = configuredWebsiteUrl;
        }

        if (getToken()) {

            showAdmin();

            try {

                await refreshAll();

            }

            catch (error) {

                console.error(
                    error
                );

                clearToken();

                showLogin();

            }

        }

        else {

            showLogin();

        }

    }
);