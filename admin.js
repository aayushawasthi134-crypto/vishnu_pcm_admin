/* =========================================
   VISHNU PCM CLASSES - ADMIN JAVASCRIPT
========================================= */


/* =========================================
   LOGIN
========================================= */

async function login(event) {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const loginMsg =
        document.getElementById("loginMsg");

    loginMsg.textContent = "Logging in...";
    loginMsg.style.color = "#777";

    try {

        const response = await fetch("/api/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                password: password
            })

        });


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail || "Login failed"
            );

        }


        localStorage.setItem(
            "adminToken",
            data.access_token
        );


        document
            .getElementById("login")
            .classList.add("hidden");


        document
            .getElementById("app")
            .classList.remove("hidden");


        loadAdminData();

    }

    catch (error) {

        loginMsg.textContent =
            error.message;

        loginMsg.style.color =
            "#d33";

    }

}


/* =========================================
   LOGOUT
========================================= */

function logout() {

    localStorage.removeItem(
        "adminToken"
    );

    location.reload();

}


/* =========================================
   AUTH TOKEN
========================================= */

function getToken() {

    return localStorage.getItem(
        "adminToken"
    );

}


/* =========================================
   AUTH FETCH
========================================= */

async function apiFetch(
    url,
    options = {}
) {

    const token =
        getToken();


    if (!token) {

        throw new Error(
            "Login required"
        );

    }


    options.headers = {

        ...(options.headers || {}),

        "Authorization":
            "Bearer " + token

    };


    const response =
        await fetch(
            url,
            options
        );


    if (response.status === 401) {

        localStorage.removeItem(
            "adminToken"
        );

        location.reload();

        throw new Error(
            "Session expired"
        );

    }


    return response;

}


/* =========================================
   TAB SYSTEM
========================================= */

function showTab(tabName) {

    const tabs =
        document.querySelectorAll(
            ".tab"
        );


    tabs.forEach(
        tab => {

            tab.classList.add(
                "hidden"
            );

        }
    );


    const selected =
        document.getElementById(
            tabName
        );


    if (selected) {

        selected.classList.remove(
            "hidden"
        );

    }


    const titles = {

        dashboard: "Dashboard",

        faculty: "Faculty",

        toppers: "Toppers",

        alumni: "Alumni",

        reviews: "Reviews"

    };


    document.getElementById(
        "pageTitle"
    ).textContent =
        titles[tabName] || "Dashboard";

}


/* =========================================
   LOAD ADMIN DATA
========================================= */

async function loadAdminData() {

    try {

        const response =
            await apiFetch(
                "/api/admin/data"
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load admin data"
            );

        }


        const data =
            await response.json();


        renderFacultyAdmin(
            data.faculty || []
        );


        renderPeopleAdmin(
            data.toppers || [],
            "topper"
        );


        renderPeopleAdmin(
            data.alumni || [],
            "alumni"
        );


        renderReviewsAdmin(
            data.testimonials || []
        );


        updateCounts(
            data
        );

    }

    catch (error) {

        console.error(
            error
        );

    }

}


/* =========================================
   DASHBOARD COUNTS
========================================= */

function updateCounts(data) {

    document.getElementById(
        "facultyCount"
    ).textContent =
        (data.faculty || []).length;


    document.getElementById(
        "topCount"
    ).textContent =
        (data.toppers || []).length;


    document.getElementById(
        "alumniCount"
    ).textContent =
        (data.alumni || []).length;


    document.getElementById(
        "reviewCount"
    ).textContent =
        (data.testimonials || []).length;

}


/* =========================================
   ADD FACULTY
========================================= */

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
                "Failed to add faculty"
            );

        }


        alert(
            "Faculty added successfully!"
        );


        form.reset();


        loadAdminData();


        showTab(
            "faculty"
        );

    }

    catch (error) {

        alert(
            error.message
        );

    }

}


/* =========================================
   RENDER FACULTY
========================================= */

function renderFacultyAdmin(
    faculty
) {

    const container =
        document.getElementById(
            "facultyList"
        );


    if (!faculty.length) {

        container.innerHTML = `

            <div class="welcome-card">

                <h3>
                    No Faculty Added
                </h3>

                <p>
                    Add your first teacher
                    using the form above.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        faculty.map(
            teacher => `

            <div
                class="admin-item"
            >

                <div
                    class="admin-item-left"
                >

                    ${
                        teacher.photo

                        ?

                        `
                        <img
                            src="${teacher.photo}"
                            alt="Teacher"
                        >
                        `

                        :

                        `
                        <div class="no-photo">
                            👨‍🏫
                        </div>
                        `
                    }


                    <div>

                        <h3>
                            ${escapeHTML(
                                teacher.name
                            )}
                        </h3>


                        <p class="subject">
                            ${escapeHTML(
                                teacher.subject
                            )}
                        </p>


                        <p>
                            ${escapeHTML(
                                teacher.description ||
                                "No description added."
                            )}
                        </p>

                    </div>

                </div>


                <button class="delete-btn" onclick="deleteFaculty(${teacher.id})">
    Delete
</button>

            </div>

        `
        ).join("");

}


/* =========================================
   DELETE FACULTY
========================================= */

async function deleteFaculty(id) {
    if (!confirm("Are you sure you want to delete this faculty?")) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/faculty/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${getToken()}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Delete failed");
        }

        alert("Faculty deleted successfully!");
        loadAdminData();

    } catch (error) {
        console.error(error);
        alert("Delete failed: " + error.message);
    }
}


/* =========================================
   ADD TOPPER / ALUMNI
========================================= */

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
                "Failed to add"
            );

        }


        alert(
            type === "topper"
                ? "Topper added successfully!"
                : "Alumni added successfully!"
        );


        form.reset();


        loadAdminData();

    }

    catch (error) {

        alert(
            error.message
        );

    }

}


/* =========================================
   RENDER TOPPERS / ALUMNI
========================================= */

function renderPeopleAdmin(
    people,
    type
) {

    const container =
        document.getElementById(
            type === "topper"
                ? "topperList"
                : "alumniList"
        );


    if (!people.length) {

        container.innerHTML = `

            <div class="welcome-card">

                <h3>
                    No ${
                        type === "topper"
                            ? "Toppers"
                            : "Alumni"
                    } Added
                </h3>

            </div>

        `;

        return;

    }


    container.innerHTML =
        people.map(
            person => `

            <div
                class="admin-item"
            >

                <div
                    class="admin-item-left"
                >

                    ${
                        person.photo

                        ?

                        `
                        <img
                            src="${person.photo}"
                            alt=""
                        >
                        `

                        :

                        `
                        <div class="no-photo">
                            ${
                                type === "topper"
                                    ? "🏆"
                                    : "🎓"
                            }
                        </div>
                        `
                    }


                    <div>

                        <h3>
                            ${escapeHTML(
                                person.name
                            )}
                        </h3>


                        <p class="subject">
                            ${escapeHTML(
                                person.details || ""
                            )}
                        </p>


                        ${
                            person.review

                            ?

                            `
                            <p>
                                ${escapeHTML(
                                    person.review
                                )}
                            </p>
                            `

                            :

                            ""
                        }

                    </div>

                </div>


                <button class="delete-btn" onclick="deletePerson('${person.type}', ${person.id})">
    Delete
</button>

            </div>

        `
        ).join("");

}


/* =========================================
   DELETE TOPPER / ALUMNI
========================================= */

async function deletePerson(type, id) {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/${type}/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${getToken()}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Delete failed");
        }

        alert(`${type} deleted successfully!`);
        loadAdminData();

    } catch (error) {
        console.error(error);
        alert("Delete failed: " + error.message);
    }
}


/* =========================================
   ADD REVIEW
========================================= */

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

                    body: JSON.stringify({

                        name: name,

                        review: review

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to add review"
            );

        }


        alert(
            "Review added successfully!"
        );


        form.reset();


        loadAdminData();

    }

    catch (error) {

        alert(
            error.message
        );

    }

}


/* =========================================
   RENDER REVIEWS
========================================= */

function renderReviewsAdmin(
    reviews
) {

    const container =
        document.getElementById(
            "reviewList"
        );


    if (!reviews.length) {

        container.innerHTML = `

            <div class="welcome-card">

                <h3>
                    No Reviews Added
                </h3>

            </div>

        `;

        return;

    }


    container.innerHTML =
        reviews.map(
            review => `

            <div
                class="admin-item"
            >

                <div>

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

        `
        ).join("");

}


/* =========================================
   DELETE REVIEW
========================================= */

async function deleteReview(
    reviewId
) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this review?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await apiFetch(
                `/api/admin/review/${reviewId}`,
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
            "Review deleted successfully!"
        );


        loadAdminData();

    }

    catch (error) {

        alert(
            "Delete failed: " +
            error.message
        );

    }

}


/* =========================================
   SECURITY
========================================= */

function escapeHTML(
    value
) {

    return String(value)
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


/* =========================================
   CHECK LOGIN ON PAGE LOAD
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const token =
            getToken();


        if (token) {

            document
                .getElementById("login")
                .classList.add("hidden");


            document
                .getElementById("app")
                .classList.remove("hidden");


            loadAdminData();

        }

    }
);