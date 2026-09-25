let currentData = {
    faculty: [],
    toppers: [],
    alumni: [],
    testimonials: []
};

let galleryData = [];


function getToken() {
    return localStorage.getItem("adminToken") || "";
}


async function apiFetch(url, options = {}) {

    options.headers = {
        ...(options.headers || {}),
        "Authorization": `Bearer ${getToken()}`
    };

    const response = await fetch(url, options);

    if (response.status === 401) {

        logout();

        throw new Error("Session expired");

    }

    return response;
}


// =========================================================
// LOGIN
// =========================================================

async function login(event) {

    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const errorBox = document.getElementById("loginError");

    errorBox.textContent = "";

    try {

        const formData = new FormData();

        formData.append("email", email);
        formData.append("password", password);

        const response = await fetch(
            "/api/login",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail || "Login failed"
            );

        }

        localStorage.setItem(
            "adminToken",
            data.token
        );

        document.getElementById(
            "loginPage"
        ).style.display = "none";

        document.getElementById(
            "adminApp"
        ).style.display = "flex";

        await loadAdminData();

        await loadAdminGallery();

    } catch (error) {

        errorBox.textContent = error.message;

    }
}


// =========================================================
// LOGOUT
// =========================================================

function logout() {

    localStorage.removeItem("adminToken");

    location.reload();

}


// =========================================================
// TAB
// =========================================================

function showTab(tabName) {

    document
        .querySelectorAll(".admin-section")
        .forEach(section => {

            section.classList.remove("active");

        });


    const selectedSection =
        document.getElementById(tabName);

    if (selectedSection) {

        selectedSection.classList.add("active");

    }


    const titles = {

        dashboard: "Dashboard",
        faculty: "Faculty",
        toppers: "Toppers",
        alumni: "Alumni",
        reviews: "Reviews",
        gallery: "Gallery"

    };


    document.getElementById(
        "pageTitle"
    ).textContent =
        titles[tabName] || "Dashboard";

}


// =========================================================
// LOAD ADMIN DATA
// =========================================================

async function loadAdminData() {

    try {

        const response =
            await apiFetch("/api/admin/data");

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail || "Failed to load data"
            );

        }

        currentData = data;

        renderFacultyAdmin(
            data.faculty || []
        );

        renderPeopleAdmin(
            data.toppers || [],
            "topperList",
            "topper"
        );

        renderPeopleAdmin(
            data.alumni || [],
            "alumniList",
            "alumni"
        );

        renderReviewsAdmin(
            data.testimonials || []
        );

        updateCounts();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to load admin data: " +
            error.message
        );

    }
}


// =========================================================
// COUNTS
// =========================================================

function updateCounts() {

    document.getElementById(
        "facultyCount"
    ).textContent =
        currentData.faculty?.length || 0;


    document.getElementById(
        "topCount"
    ).textContent =
        currentData.toppers?.length || 0;


    document.getElementById(
        "alumniCount"
    ).textContent =
        currentData.alumni?.length || 0;


    document.getElementById(
        "reviewCount"
    ).textContent =
        currentData.testimonials?.length || 0;


    document.getElementById(
        "galleryCount"
    ).textContent =
        galleryData.length || 0;

}


// =========================================================
// FACULTY
// =========================================================

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
                data.detail || "Failed to add faculty"
            );

        }

        alert(
            "Faculty added successfully!"
        );

        form.reset();

        await loadAdminData();

    } catch (error) {

        alert(
            "Failed: " +
            error.message
        );

    }
}


function renderFacultyAdmin(faculty) {

    const container =
        document.getElementById(
            "facultyList"
        );

    if (!faculty.length) {

        container.innerHTML =
            `<div class="empty-state">
                No faculty added yet.
            </div>`;

        return;
    }


    container.innerHTML =
        faculty.map(teacher => {

            const image =
                teacher.photo
                    ? `<img src="${getImageUrl(teacher.photo)}" alt="">`
                    : `<div class="admin-placeholder">V</div>`;

            return `

                <div class="admin-item">

                    <div class="admin-item-image">
                        ${image}
                    </div>

                    <div class="admin-item-content">

                        <h3>
                            ${escapeHTML(teacher.name)}
                        </h3>

                        <strong>
                            ${escapeHTML(teacher.subject)}
                        </strong>

                        <p>
                            ${escapeHTML(
                                teacher.description || ""
                            )}
                        </p>

                    </div>

                    <button
                        class="delete-btn"
                        onclick="deleteFaculty(${teacher.id})"
                    >
                        Delete
                    </button>

                </div>

            `;

        }).join("");

}


async function deleteFaculty(id) {

    if (
        !confirm(
            "Are you sure you want to delete this faculty?"
        )
    ) return;


    try {

        const response =
            await apiFetch(
                `/api/admin/faculty/${id}`,
                {
                    method: "DELETE"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail || "Delete failed"
            );

        }

        alert(
            "Faculty deleted successfully!"
        );

        await loadAdminData();

    } catch (error) {

        alert(
            "Delete failed: " +
            error.message
        );

    }
}


// =========================================================
// TOPPERS / ALUMNI
// =========================================================

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
                data.detail || "Failed"
            );

        }

        alert(
            `${type} added successfully!`
        );

        form.reset();

        await loadAdminData();

    } catch (error) {

        alert(
            "Failed: " +
            error.message
        );

    }
}


function renderPeopleAdmin(
    people,
    containerId,
    type
) {

    const container =
        document.getElementById(
            containerId
        );

    if (!people.length) {

        container.innerHTML =
            `<div class="empty-state">
                No ${type}s added yet.
            </div>`;

        return;
    }


    container.innerHTML =
        people.map(person => {

            const image =
                person.photo
                    ? `<img src="${getImageUrl(person.photo)}" alt="">`
                    : `<div class="admin-placeholder">V</div>`;

            return `

                <div class="admin-item">

                    <div class="admin-item-image">

                        ${image}

                    </div>

                    <div class="admin-item-content">

                        <h3>
                            ${escapeHTML(person.name)}
                        </h3>

                        <strong>
                            ${escapeHTML(
                                person.details || ""
                            )}
                        </strong>

                        <p>
                            ${escapeHTML(
                                person.review || ""
                            )}
                        </p>

                    </div>

                    <button
                        class="delete-btn"
                        onclick="deletePerson(
                            '${type}',
                            ${person.id}
                        )"
                    >
                        Delete
                    </button>

                </div>

            `;

        }).join("");

}


async function deletePerson(
    type,
    id
) {

    if (
        !confirm(
            `Are you sure you want to delete this ${type}?`
        )
    ) return;


    try {

        const response =
            await apiFetch(
                `/api/admin/${type}/${id}`,
                {
                    method: "DELETE"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail || "Delete failed"
            );

        }

        alert(
            `${type} deleted successfully!`
        );

        await loadAdminData();

    } catch (error) {

        alert(
            "Delete failed: " +
            error.message
        );

    }
}


// =========================================================
// REVIEWS
// =========================================================

async function addReview(event) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    try {

        const response =
            await apiFetch(
                "/api/admin/testimonials",
                {
                    method: "POST",
                    body: formData
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail || "Failed"
            );

        }

        alert(
            "Review added successfully!"
        );

        form.reset();

        await loadAdminData();

    } catch (error) {

        alert(
            "Failed: " +
            error.message
        );

    }
}


function renderReviewsAdmin(
    reviews
) {

    const container =
        document.getElementById(
            "reviewList"
        );

    if (!reviews.length) {

        container.innerHTML =
            `<div class="empty-state">
                No reviews added yet.
            </div>`;

        return;
    }


    container.innerHTML =
        reviews.map(review => {

            return `

                <div class="admin-item">

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

                    <button
                        class="delete-btn"
                        onclick="deleteReview(${review.id})"
                    >
                        Delete
                    </button>

                </div>

            `;

        }).join("");

}


async function deleteReview(id) {

    if (
        !confirm(
            "Are you sure you want to delete this review?"
        )
    ) return;


    try {

        const response =
            await apiFetch(
                `/api/admin/review/${id}`,
                {
                    method: "DELETE"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail || "Delete failed"
            );

        }

        alert(
            "Review deleted successfully!"
        );

        await loadAdminData();

    } catch (error) {

        alert(
            "Delete failed: " +
            error.message
        );

    }
}


// =========================================================
// GALLERY
// =========================================================

async function loadAdminGallery() {

    try {

        const response =
            await apiFetch(
                "/api/admin/gallery"
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail || "Failed to load gallery"
            );

        }

        galleryData =
            data.gallery || [];

        renderAdminGallery();

        updateCounts();

    } catch (error) {

        console.error(
            "Gallery error:",
            error
        );

    }
}


// =========================================================
// CREATE EVENT
// =========================================================

async function createGalleryEvent(event) {

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
                "Failed to create event"
            );

        }

        alert(
            "Gallery event created successfully!"
        );

        form.reset();

        await loadAdminGallery();

    } catch (error) {

        alert(
            "Failed: " +
            error.message
        );

    }
}


// =========================================================
// RENDER GALLERY
// =========================================================

function renderAdminGallery() {

    const container =
        document.getElementById(
            "galleryAdminList"
        );

    if (!galleryData.length) {

        container.innerHTML =
            `
            <div class="empty-state">
                <h3>
                    No gallery events yet
                </h3>

                <p>
                    Create your first event above.
                </p>
            </div>
            `;

        return;
    }


    container.innerHTML =
        galleryData.map(event => {

            const cover =
                event.cover_photo
                    ? `<img
                        src="${event.cover_photo}"
                        alt=""
                    >`
                    : `<div class="gallery-admin-cover-placeholder">
                        📷
                    </div>`;


            const photos =
                event.photos || [];


            return `

                <div class="gallery-event-admin">

                    <div class="gallery-event-header">

                        <div>

                            <h3>
                                ${escapeHTML(
                                    event.title
                                )}
                            </h3>

                            ${
                                event.event_date
                                    ? `<span>
                                        📅 ${escapeHTML(
                                            event.event_date
                                        )}
                                    </span>`
                                    : ""
                            }

                            <p>
                                ${escapeHTML(
                                    event.description || ""
                                )}
                            </p>

                            <strong>
                                ${photos.length} Photos
                            </strong>

                        </div>


                        <button
                            class="delete-btn"
                            onclick="deleteGalleryEvent(${event.id})"
                        >
                            Delete Event
                        </button>

                    </div>


                    <div class="gallery-cover-preview">

                        ${cover}

                    </div>


                    <div class="gallery-upload-box">

                        <label>
                            Add Photos
                        </label>

                        <input
                            type="file"
                            id="galleryFiles-${event.id}"
                            accept=".jpg,.jpeg,.png,.webp"
                            multiple
                        >

                        <button
                            class="primary-btn"
                            onclick="uploadGalleryPhotos(${event.id})"
                        >
                            Upload Photos
                        </button>

                    </div>


                    <div class="gallery-admin-photos">

                        ${
                            photos.length
                                ? photos.map(photo => `

                                    <div class="gallery-admin-photo">

                                        <img
                                            src="${photo.photo_url}"
                                            alt=""
                                        >

                                        ${
                                            event.cover_photo === photo.photo_url
                                                ? `<span class="cover-badge">
                                                    COVER
                                                </span>`
                                                : ""
                                        }

                                        <div class="gallery-photo-actions">

                                            ${
                                                event.cover_photo !== photo.photo_url
                                                    ? `<button
                                                        onclick="setGalleryCover(
                                                            ${event.id},
                                                            ${photo.id}
                                                        )"
                                                    >
                                                        Set Cover
                                                    </button>`
                                                    : ""
                                            }

                                            <button
                                                class="danger-small"
                                                onclick="deleteGalleryPhoto(
                                                    ${photo.id}
                                                )"
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </div>

                                `).join("")
                                : `<div class="gallery-no-photos">
                                    No photos uploaded yet.
                                </div>`
                        }

                    </div>

                </div>

            `;

        }).join("");

}


// =========================================================
// UPLOAD PHOTOS
// =========================================================

async function uploadGalleryPhotos(
    eventId
) {

    const fileInput =
        document.getElementById(
            `galleryFiles-${eventId}`
        );

    if (
        !fileInput ||
        !fileInput.files.length
    ) {

        alert(
            "Please select one or more photos."
        );

        return;
    }


    const formData =
        new FormData();


    Array.from(
        fileInput.files
    ).forEach(file => {

        formData.append(
            "photos",
            file
        );

    });


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
                "Upload failed"
            );

        }

        alert(
            `${data.count} photo(s) uploaded successfully!`
        );

        await loadAdminGallery();

    } catch (error) {

        alert(
            "Upload failed: " +
            error.message
        );

    }

}


// =========================================================
// SET COVER
// =========================================================

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
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to set cover"
            );

        }

        await loadAdminGallery();

    } catch (error) {

        alert(
            "Failed: " +
            error.message
        );

    }

}


// =========================================================
// DELETE PHOTO
// =========================================================

async function deleteGalleryPhoto(
    photoId
) {

    if (
        !confirm(
            "Delete this gallery photo?"
        )
    ) return;


    try {

        const response =
            await apiFetch(
                `/api/admin/gallery/photo/${photoId}`,
                {
                    method: "DELETE"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Delete failed"
            );

        }

        await loadAdminGallery();

    } catch (error) {

        alert(
            "Delete failed: " +
            error.message
        );

    }

}


// =========================================================
// DELETE EVENT
// =========================================================

async function deleteGalleryEvent(
    eventId
) {

    if (
        !confirm(
            "Delete this complete event and all its photos?"
        )
    ) return;


    try {

        const response =
            await apiFetch(
                `/api/admin/gallery/event/${eventId}`,
                {
                    method: "DELETE"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Delete failed"
            );

        }

        alert(
            "Gallery event deleted successfully!"
        );

        await loadAdminGallery();

    } catch (error) {

        alert(
            "Delete failed: " +
            error.message
        );

    }

}


// =========================================================
// IMAGE URL
// =========================================================

function getImageUrl(
    photo
) {

    if (!photo) {
        return "";
    }

    if (
        photo.startsWith("http://") ||
        photo.startsWith("https://")
    ) {

        return photo;

    }

    return photo;

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(
    value
) {

    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =========================================================
// PAGE LOAD
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const token =
            getToken();

        if (!token) {

            document.getElementById(
                "loginPage"
            ).style.display = "flex";

            document.getElementById(
                "adminApp"
            ).style.display = "none";

            return;

        }


        document.getElementById(
            "loginPage"
        ).style.display = "none";

        document.getElementById(
            "adminApp"
        ).style.display = "flex";


        await loadAdminData();

        await loadAdminGallery();

    }
);