// Custom System Dialogs using Existing Popups
let alertResolve = null;
let confirmResolve = null;
let deleteCommentContext = null;

function showCustomAlert(message) {
    return new Promise((resolve) => {
        alertResolve = resolve;
        const msgEl = document.getElementById('customAlertMessage');
        if (msgEl) msgEl.textContent = message;
        
        const popup = document.getElementById('customAlertPopup');
        if (popup) popup.classList.remove('hidden');
    });
}

function closeCustomAlert() {
    const popup = document.getElementById('customAlertPopup');
    if (popup) popup.classList.add('hidden');
    if (alertResolve) {
        alertResolve(true);
        alertResolve = null;
    }
}

function showCustomConfirm(message) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        const msgEl = document.getElementById('customConfirmMessage');
        if (msgEl) msgEl.textContent = message;
        
        const popup = document.getElementById('customConfirmPopup');
        if (popup) popup.classList.remove('hidden');
    });
}

function closeCustomConfirm(result) {
    const popup = document.getElementById('customConfirmPopup');
    if (popup) popup.classList.add('hidden');
    if (confirmResolve) {
        confirmResolve(result);
        confirmResolve = null;
    }
}


// --- Inline Error Helpers ---
function showInlineError(elementId, message) {
    const errEl = document.getElementById(elementId);
    if (errEl) {
        errEl.textContent = message;
        errEl.classList.add("show");
    }
}

// --- User Profile Popup ---
const TIER_CONFIG = {
    Bronze: {
        badge: '🥉',
        color: '#cd7f32',
        bg: '#fff0e6',
        border: 'rgba(205, 127, 50, 0.3)',
        headerGradientFrom: '#fff0e6',
        headerGradientTo: '#ffffff'
    },
    Silver: {
        badge: '🥈',
        color: '#999999',
        bg: '#f0f0f0',
        border: '#e5e7eb',
        headerGradientFrom: '#f0f0f0',
        headerGradientTo: '#ffffff'
    },
    Gold: {
        badge: '🥇',
        color: '#d4a017',
        bg: '#fff4cc',
        border: 'rgba(212, 160, 23, 0.3)',
        headerGradientFrom: '#fff4cc',
        headerGradientTo: '#ffffff'
    },
    Platinum: {
        badge: '💎',
        color: '#0284c7',
        bg: '#e0f2fe',
        border: 'rgba(2, 132, 199, 0.3)',
        headerGradientFrom: '#e0f2fe',
        headerGradientTo: '#ffffff'
    },
    Diamond: {
        badge: '💠',
        color: '#d94866',
        bg: '#ffe2ea',
        border: 'rgba(217, 72, 102, 0.3)',
        headerGradientFrom: '#ffe2ea',
        headerGradientTo: '#ffffff'
    }
};

function renderStarsNew(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    let html = '';
    for (let i = 0; i < fullStars; i++) {
        html += '<span class="modal-star full">★</span>';
    }
    if (hasHalf) {
        html += '<span class="modal-star half">★</span>';
    }
    for (let i = 0; i < emptyStars; i++) {
        html += '<span class="modal-star empty">★</span>';
    }
    return html;
}

async function showUserProfile(username) {
    const modal = document.getElementById('userProfileModal');
    if (!modal) return;

    // Reset UI
    document.getElementById('userName').textContent = 'Loading...';

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
        const response = await fetch(`/api/user/${username}`);
        if (!response.ok) throw new Error('User not found');
        const data = await response.json();

        // Tier Config Logic
        const tierName = data.tier || 'Bronze';
        const tierConfig = TIER_CONFIG[tierName] || TIER_CONFIG['Bronze'];

        // Set CSS variables
        const header = document.getElementById('modalHeader');
        header.style.setProperty('--header-gradient-from', tierConfig.headerGradientFrom);
        header.style.setProperty('--header-gradient-to', tierConfig.headerGradientTo);
        header.style.setProperty('--header-border', tierConfig.border);

        const tierPill = document.getElementById('userTier');
        tierPill.style.setProperty('--tier-bg', tierConfig.bg);
        tierPill.style.setProperty('--tier-color', tierConfig.color);
        tierPill.style.setProperty('--tier-border', tierConfig.border);

        // Populate Data
        document.getElementById('userAvatar').textContent = data.avatar || data.username.substring(0, 2).toUpperCase();
        document.getElementById('userName').textContent = data.name;
        document.getElementById('userUsername').textContent = `@${data.username}`;
        document.getElementById('userBio').textContent = data.bio || 'No bio yet.';
        document.getElementById('userJoined').textContent = `📅 Joined ${data.joinDate}`;

        // Badges
        document.getElementById('userTier').textContent = tierName;
        document.getElementById('statTierIcon').textContent = tierConfig.badge;
        document.getElementById('statTier').textContent = tierName;
        document.getElementById('statTier').style.color = tierConfig.color;

        // Verified Check
        const verifiedBadge = document.getElementById('verifiedBadge');
        if (data.verified) {
            verifiedBadge.classList.remove('hidden');
        } else {
            verifiedBadge.classList.add('hidden');
        }

        // Stats
        document.getElementById('statReviews').textContent = data.totalReviews;
        document.getElementById('statPoints').textContent = data.points;

        // Preferences
        document.getElementById('prefCuisine').textContent = data.topCuisine || 'None';
        document.getElementById('prefLocation').textContent = data.topLocation || 'None';

        // Ratings
        const ratingsSection = document.getElementById('ratingsSection');
        if (data.ratings && data.totalReviews > 0) {
            ratingsSection.classList.remove('hidden');

            const safeParseFloat = (val) => {
                const parsed = parseFloat(val);
                return isNaN(parsed) ? 0.0 : parsed;
            };

            const serviceVal = safeParseFloat(data.ratings.service);
            const tasteVal = safeParseFloat(data.ratings.taste);
            const ambianceVal = safeParseFloat(data.ratings.ambiance);

            document.getElementById('serviceStars').innerHTML = renderStarsNew(serviceVal);
            document.getElementById('serviceRating').textContent = serviceVal.toFixed(1);

            document.getElementById('tasteStars').innerHTML = renderStarsNew(tasteVal);
            document.getElementById('tasteRating').textContent = tasteVal.toFixed(1);

            document.getElementById('ambianceStars').innerHTML = renderStarsNew(ambianceVal);
            document.getElementById('ambianceRating').textContent = ambianceVal.toFixed(1);
        } else {
            ratingsSection.classList.add('hidden');
        }

    } catch (e) {
        console.error(e);
        document.getElementById('userName').textContent = 'Error loading profile';
    }
}

function closeModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function closeModalOnBackdrop(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal();
    }
}

function hideInlineError(elementId) {
    const errEl = document.getElementById(elementId);
    if (errEl) {
        errEl.classList.remove("show");
        errEl.textContent = "";
    }
}


function openLoginPopup() {
    document.getElementById("loginPopup").classList.remove("hidden");
    document.getElementById("signupPopup").classList.add("hidden");
    hideInlineError("login-error-msg");
}

function closeLoginPopup() {
    document.getElementById("loginPopup").classList.add("hidden");
    hideInlineError("login-error-msg");
}

function openSecurityRecoveryPopup() {
    closeLoginPopup();
    const popup = document.getElementById('securityRecoveryPopup');
    if (popup) popup.classList.remove('hidden');
    hideInlineError("recovery-email-error-msg");
}

function closeSecurityRecoveryPopup() {
    const popup = document.getElementById('securityRecoveryPopup');
    if (popup) popup.classList.add('hidden');
    hideInlineError("recovery-email-error-msg");
}

function openResetPasswordPopup() {
    const popup = document.getElementById('resetPasswordPopup');
    if (popup) popup.classList.remove('hidden');
    hideInlineError("change-pw-error-msg");
}

function closeResetPasswordPopup() {
    const popup = document.getElementById('resetPasswordPopup');
    if (popup) popup.classList.add('hidden');
    hideInlineError("change-pw-error-msg");
}

function openSignUpPopup() {
    document.getElementById("signupPopup").classList.remove("hidden");
    document.getElementById("loginPopup").classList.add("hidden");
    hideInlineError("signup-error-msg");
}

function closeSignUpPopup() {
    document.getElementById("signupPopup").classList.add("hidden");
    hideInlineError("signup-error-msg");
}

function switchToSignUp() {
    closeLoginPopup();
    openSignUpPopup();
}

function switchToLogin() {
    closeSignUpPopup();
    openLoginPopup();
}

function showAccountSuccess() {
    document.getElementById("signupPopup").classList.add("hidden");
    document.getElementById("accountCreatedPopup").classList.remove("hidden");
}

function closeAccountSuccess() {
    document.getElementById("accountCreatedPopup").classList.add("hidden");
}

function openEditProfilePopup() {
    document.getElementById("editProfilePopup").classList.remove("hidden");
}

function closeEditProfilePopup() {
    document.getElementById("editProfilePopup").classList.add("hidden");
}

// cookie logic
function saveStoredValue(key, value, durationDays) {
    let expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
    document.cookie = key + "=" + encodeURIComponent(value) + ";expires=" + expiryDate.toUTCString() + ";path=/";
}

// getting the saved value
function getStoredValue(key) {
    let cookieParts = document.cookie.split(";");

    for (let i = 0; i < cookieParts.length; i++) {
        let part = cookieParts[i].trim();
        let pair = part.split("=");

        if (pair[0] === key) {
            return decodeURIComponent(pair.slice(1).join("="));
        }
    }

    return null;
}

// clearing the saved data
function clearStoredValue(key) {
    document.cookie = key + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
}

function clearFeedFilterCookies() {
    clearStoredValue("feedCuisine");
    clearStoredValue("feedLocation");
    clearStoredValue("feedSort");
    clearStoredValue("feedSearch");
}

function clearFeedFilters() {
    clearFeedFilterCookies();

    let filterForm = document.getElementById("filterForm");
    if (filterForm) {
        let cuisineSelect = filterForm.querySelector("select[name='cuisine']");
        let locationSelect = filterForm.querySelector("select[name='location']");
        let sortSelect = filterForm.querySelector("select[name='sort']");
        let searchInput = filterForm.querySelector("input[name='search']");

        if (cuisineSelect) cuisineSelect.value = "";
        if (locationSelect) locationSelect.value = "";
        if (sortSelect) sortSelect.selectedIndex = 0;
        if (searchInput) searchInput.value = "";
    }

    window.location.href = "/feed";
}

function clearReviewDraftCookies(draftPrefix) {
    let cookieParts = document.cookie.split(";");

    for (let i = 0; i < cookieParts.length; i++) {
        let part = cookieParts[i].trim();
        if (!part) continue;

        let equalIndex = part.indexOf("=");
        let key = equalIndex >= 0 ? part.substring(0, equalIndex) : part;

        if (key.indexOf(draftPrefix) === 0) {
            clearStoredValue(key);
        }
    }
}

function clearStoredValuesByPrefix(prefix) {
    let cookieParts = document.cookie.split(";");

    for (let i = 0; i < cookieParts.length; i++) {
        let part = cookieParts[i].trim();
        if (!part) continue;

        let equalIndex = part.indexOf("=");
        let key = equalIndex >= 0 ? part.substring(0, equalIndex) : part;

        if (key.indexOf(prefix) === 0) {
            clearStoredValue(key);
        }
    }
}

window.onclick = function(event) {
    const loginPopup = document.getElementById("loginPopup");
    const signUpPopup = document.getElementById("signupPopup");
    const successPopup = document.getElementById("successPopup");
    const editProfilePopup = document.getElementById("editProfilePopup");
    const securityRecoveryPopup = document.getElementById("securityRecoveryPopup");
    const resetPasswordPopup = document.getElementById("resetPasswordPopup");
    
    if (event.target === loginPopup) {
        loginPopup.classList.add("hidden");
    }
    if (event.target === signUpPopup) {
        signUpPopup.classList.add("hidden");
    }
    if (event.target === successPopup) {
        successPopup.classList.add("hidden");
    }
    if (event.target === editProfilePopup) {
        editProfilePopup.classList.add("hidden");
    }
    if (event.target === securityRecoveryPopup) {
        securityRecoveryPopup.classList.add("hidden");
    }
    if (event.target === resetPasswordPopup) {
        resetPasswordPopup.classList.add("hidden");
    }
}


function goToFeed() {
    window.location.href = "/feed";
}

function goToNotifications() {
    window.location.href = "/notifications";
}

function goToProfile() {
    window.location.href = "/userprofile-reviews";
}

function goToSettings() {
    window.location.href = "/settings";
}

function goToLanding() {
    window.location.href = "/";
}

function logout() {
    clearFeedFilterCookies();

    fetch("/logout").then(() => {
        window.location.href = "/";
    });
}

document.addEventListener("DOMContentLoaded", function () {
    // get stored values
    let savedCuisine = getStoredValue("feedCuisine");
    let savedLocation = getStoredValue("feedLocation");
    let savedSort = getStoredValue("feedSort");
    let savedSearch = getStoredValue("feedSearch");

    // get page elements
    let filterForm = document.getElementById("filterForm");
    let cuisineSelect = null;
    let locationSelect = null;
    let sortSelect = null;
    let searchInput = null;

    if (filterForm) {
        cuisineSelect = filterForm.querySelector("select[name='cuisine']");
        locationSelect = filterForm.querySelector("select[name='location']");
        sortSelect = filterForm.querySelector("select[name='sort']");
        searchInput = filterForm.querySelector("input[name='search']");
    }

    // set defaults
    let hasQueryValues = window.location.search && window.location.search.length > 1;

    // override defaults if stored values exist
    if (filterForm && !hasQueryValues) {
        if (savedCuisine && cuisineSelect) cuisineSelect.value = savedCuisine;
        if (savedLocation && locationSelect) locationSelect.value = savedLocation;
        if (savedSort && sortSelect) sortSelect.value = savedSort;
        if (savedSearch && searchInput) searchInput.value = savedSearch;

        if (savedCuisine || savedLocation || savedSort || savedSearch) {
            let params = [];

            if (cuisineSelect && cuisineSelect.value !== "") {
                params.push("cuisine=" + encodeURIComponent(cuisineSelect.value));
            }

            if (locationSelect && locationSelect.value !== "") {
                params.push("location=" + encodeURIComponent(locationSelect.value));
            }

            if (sortSelect && sortSelect.value !== "") {
                params.push("sort=" + encodeURIComponent(sortSelect.value));
            }

            if (searchInput && searchInput.value.trim() !== "") {
                params.push("search=" + encodeURIComponent(searchInput.value.trim()));
            }

            if (params.length > 0) {
                window.location.href = "/feed?" + params.join("&");
                return;
            }
        }
    }

    // add button listeners
    if (filterForm) {
        filterForm.addEventListener("submit", function () {
            let cuisineValue = cuisineSelect ? cuisineSelect.value : "";
            let locationValue = locationSelect ? locationSelect.value : "";
            let sortValue = sortSelect ? sortSelect.value : "";
            let searchValue = searchInput ? searchInput.value.trim() : "";

            saveStoredValue("feedCuisine", cuisineValue, 7);
            saveStoredValue("feedLocation", locationValue, 7);
            saveStoredValue("feedSort", sortValue, 7);
            saveStoredValue("feedSearch", searchValue, 7);
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    let reviewForm = document.querySelector('form[action="/write-review"], form[action^="/edit-review/"]');
    if (!reviewForm) return;

    let action = reviewForm.getAttribute("action") || "";
    let modeKey = "write";

    if (action.indexOf("/edit-review/") === 0) {
        modeKey = action.replace("/", "").replace(/\//g, "-");
    }

    let draftPrefix = "reviewDraft-" + modeKey + "-";

    let fieldNames = [
        "restaurant",
        "cuisine",
        "customCuisine",
        "location",
        "customLocation",
        "foodRating",
        "serviceRating",
        "ambianceRating",
        "title",
        "content"
    ];

    function getFieldKey(fieldName) {
        return draftPrefix + fieldName;
    }

    // check and restore the saved values 
    for (let i = 0; i < fieldNames.length; i++) {
        let fieldName = fieldNames[i];
        let field = reviewForm.querySelector('[name="' + fieldName + '"]');
        if (!field) continue;

        let savedValue = getStoredValue(getFieldKey(fieldName));
        if (savedValue !== null && savedValue !== "") {
            field.value = savedValue;
        }
    }

    // js for the other option
    if (typeof toggleCustomCuisine === "function") {
        toggleCustomCuisine();
    }
    if (typeof toggleCustomLocation === "function") {
        toggleCustomLocation();
    }

    // save values on change
    for (let i = 0; i < fieldNames.length; i++) {
        let fieldName = fieldNames[i];
        let field = reviewForm.querySelector('[name="' + fieldName + '"]');
        if (!field) continue;

        let saveFn = function () {
            saveStoredValue(getFieldKey(fieldName), field.value || "", 7);
        };

        field.addEventListener("input", saveFn);
        field.addEventListener("change", saveFn);
    }

    // clear after submission
    reviewForm.addEventListener("submit", function () {
        clearReviewDraftCookies(draftPrefix);
    });
});

// Voting functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize vote button states
    document.querySelectorAll('.vote-btn').forEach(btn => {
        const postElement = btn.closest('.review-card-2');
        if (postElement) {
            const userVote = postElement.getAttribute('data-user-vote');
            if (userVote) {
                const action = btn.getAttribute('data-action');
                if (userVote === action) {
                    btn.classList.add('voted');
                }
            }
        }
    });

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('vote-btn')) {
            e.preventDefault();
            const button = e.target;
            const postId = button.getAttribute('data-post-id');
            const action = button.getAttribute('data-action');
            
            vote(postId, action, button);
        }
    });
});

async function vote(postId, action, button) {
    try {
        const response = await fetch('/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postId: postId,
                action: action
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Update vote counts
            const reviewActions = button.closest('.review-actions');
            const upvoteBtn = reviewActions.querySelector('.upvote-btn');
            const downvoteBtn = reviewActions.querySelector('.downvote-btn');
            
            upvoteBtn.textContent = `👍 ${data.likes}`;
            downvoteBtn.textContent = `👎 ${data.dislikes}`;
            
            // Update button states based on user's current vote
            upvoteBtn.classList.toggle('voted', data.userVote === 'upvote');
            downvoteBtn.classList.toggle('voted', data.userVote === 'downvote');

            // Add animation effect
            button.style.transform = 'scale(1.1)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 150);

        } else {
            // Use custom popup instead of alert
            showCustomAlert(data.message || 'Failed to vote');
        }
    } catch (error) {
        console.error('Error voting:', error);
        showCustomAlert('Failed to vote. Please try again.');
    }
}

// Comment toggle
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('toggle-comments')) {
        const reviewCard = e.target.closest('.review-card-2') || e.target.closest('.review-card-3');
        const commentsSection = reviewCard.querySelector('.comments-section');
        commentsSection.classList.toggle('show');

        const currentText = e.target.textContent;
        const newArrow = currentText.includes('▶') ? '▼' : '▶';
        e.target.innerHTML = currentText.replace(/[▶▼]/, newArrow);
    }
});

// Comment submission functionality
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('comment-submit-btn')) {
        const button = e.target;
        const postId = button.getAttribute('data-post-id');
        const input = button.closest('.comment-input-container').querySelector('.comment-input');
        const commentText = input.value.trim();
        
        if (commentText) {
            submitComment(postId, commentText, button, input);
        }
    }
});

document.addEventListener('keypress', function(e) {
    if (e.target.classList.contains('comment-input') && e.key === 'Enter') {
        const input = e.target;
        const postId = input.getAttribute('data-post-id');
        const commentText = input.value.trim();
        const button = input.closest('.comment-input-container').querySelector('.comment-submit-btn');
        
        if (commentText) {
            submitComment(postId, commentText, button, input);
        }
    }
});

async function submitComment(postId, text, button, input) {
    try {
        button.disabled = true;
        button.textContent = 'Posting...';
        
        const response = await fetch('/comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postId: postId,
                text: text
            })
        });

        const data = await response.json();

        if (response.ok) {
            input.value = '';

            // Update comment count in toggle button
            const reviewCard = button.closest('.review-card-2') || button.closest('.review-card-3');
            const toggleBtn = reviewCard.querySelector('.toggle-comments');
            const currentText = toggleBtn.textContent;
            const newCount = data.commentCount;
            toggleBtn.innerHTML = `💬 ${newCount} Comments ${currentText.includes('▼') ? '▼' : '▶'}`;

            // Add new comment to the comments section
            const commentsSection = reviewCard.querySelector('.comments-section');
            const addCommentDiv = commentsSection.querySelector('.add-comment');

            const commentHTML = `
                <div class="comment-item">
                    <div class="comment-avatar ${data.comment.currentUser.rankClass}">${data.comment.currentUser.initials}</div>
                    <div class="review-user-info">
                        <highlight>${data.comment.currentUser.name} <span class="review-date">· ${data.comment.date}</span></highlight>
                        <div class="review-text-2">${data.comment.text}</div>
                    </div>
                </div>
            `;

            addCommentDiv.insertAdjacentHTML('beforebegin', commentHTML);

            commentsSection.classList.add('show');
            toggleBtn.innerHTML = `💬 ${newCount} Comments ▼`;

        } else {
            alert(data.message || 'Failed to add comment');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Failed to add comment. Please try again.');
    } finally {
        button.disabled = false;
        button.textContent = 'Post';
    }
}

function deleteComment(btn) {
    const commentItem = btn.closest('.comment-item');
    const postId = commentItem.dataset.postId;
    const commentIndex = commentItem.dataset.commentIndex;
    
    deleteCommentContext = { commentItem, postId, commentIndex };
    openDeleteCommentPopup();
}

function editComment(btn) {
    const commentItem = btn.closest('.comment-item');
    const postId = commentItem.dataset.postId;
    const commentIndex = commentItem.dataset.commentIndex;
    const textDiv = commentItem.querySelector('.review-text-2');
    const currentText = textDiv.textContent.trim();

    // Replace text with input
    textDiv.innerHTML = `
        <div class="comment-edit-wrapper">
            <input type="text" class="comment-input" value="${currentText}">
            <div class="comment-edit-actions">
                <button class="comment-save-btn" onclick="submitEditComment(this)">Save</button>
                <button class="comment-cancel-btn" onclick="cancelEditComment(this, '${currentText}')">Cancel</button>
            </div>
        </div>
    `;
}

function submitEditComment(btn) {
    const commentItem = btn.closest('.comment-item');
    const postId = commentItem.dataset.postId;
    const commentIndex = commentItem.dataset.commentIndex;
    const newText = commentItem.querySelector('.comment-input').value.trim();

    if (!newText) return alert("Comment cannot be empty");

    fetch(`/comment/${postId}/${commentIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message === "Comment updated") {
            commentItem.querySelector('.review-text-2').innerHTML = data.text;
        }
    });
}

function cancelEditComment(btn, originalText) {
    const textDiv = btn.closest('.comment-item').querySelector('.review-text-2');
    textDiv.textContent = originalText;
}

// Security Question Recovery
async function submitSecurityRecoveryStep() {
    const emailEl = document.getElementById("recovery-email-step");
    const resetEmailEl = document.getElementById("reset-email");
    const questionEl = document.getElementById("recovery-question");
    const email = emailEl ? emailEl.value.trim() : "";

    hideInlineError("recovery-email-error-msg");

    if (!email) {
        showInlineError("recovery-email-error-msg", "Please enter your email.");
        return;
    }

    try {
        const response = await fetch("/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            data = { message: "Something went wrong. Please try again." };
        }

        const message = data.message || "Could not load security question.";
        const resolvedQuestion = ((data && data.securityQuestion) || "").trim();

        if (response.ok && data && data.success && resolvedQuestion && questionEl) {
            questionEl.value = resolvedQuestion;
            if (resetEmailEl) {
                resetEmailEl.value = email;
            }
            saveStoredValue("recoveryEmail", email, 7);
            closeSecurityRecoveryPopup();
            openResetPasswordPopup();
        } else {
            if (questionEl) questionEl.value = "";
            showInlineError("recovery-email-error-msg", message);
        }
    } catch (err) {
        console.error("Security question error:", err);
        showInlineError("recovery-email-error-msg", "Something went wrong. Please try again.");
    }
}

async function submitSecurityRecovery() {
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const email = (document.getElementById("reset-email") || {}).value || "";
    const securityAnswer = (document.getElementById("recovery-answer") || {}).value || "";
    const securityQuestion = (document.getElementById("recovery-question") || {}).value || "";

    hideInlineError("change-pw-error-msg");

    if (!email.trim()) {
        showInlineError("change-pw-error-msg", "Please enter your email.");
        return;
    }

    if (!securityQuestion.trim()) {
        showInlineError("change-pw-error-msg", "Load your security question first.");
        return;
    }

    if (!securityAnswer.trim()) {
        showInlineError("change-pw-error-msg", "Please enter your security answer.");
        return;
    }

    if (newPassword.length < 6) {
        showInlineError("change-pw-error-msg", "Password must be at least 6 characters.");
        return;
    }

    if (newPassword !== confirmPassword) {
        showInlineError("change-pw-error-msg", "Passwords do not match");
        return;
    }

    try {
        const response = await fetch("/change-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email.trim(),
                securityAnswer: securityAnswer,
                newPassword: newPassword
            })
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            data = { message: "Something went wrong. Please try again." };
        }

        const message = data.message || "Could not reset password.";
        console.log("Response:", data);

        if (response.ok) {
            clearStoredValue("recoveryEmail");
            closeResetPasswordPopup();
            openSuccessPassword();
        } else {
            showInlineError("change-pw-error-msg", message);
        }
    } catch (error) {
        console.error("Error changing password:", error);
        showInlineError("change-pw-error-msg", "Something went wrong. Please try again.");
    }
}

// Sign Up
const signupForm = document.getElementById("signupForm");
if (signupForm) {
    const signupCookiePrefix = "signupDraft-";

    const signupName = document.getElementById("signup-name");
    const signupEmail = document.getElementById("signup-email");
    const signupSecurityQuestion = document.getElementById("signup-security-question");
    const signupSecurityQuestionCustom = document.getElementById("signup-security-question-custom");

    if (signupName) signupName.value = getStoredValue(signupCookiePrefix + "name") || signupName.value;
    if (signupEmail) signupEmail.value = getStoredValue(signupCookiePrefix + "email") || signupEmail.value;
    if (signupSecurityQuestion) signupSecurityQuestion.value = getStoredValue(signupCookiePrefix + "securityQuestion") || signupSecurityQuestion.value;
    if (signupSecurityQuestionCustom) signupSecurityQuestionCustom.value = getStoredValue(signupCookiePrefix + "securityQuestionCustom") || signupSecurityQuestionCustom.value;

    if (typeof toggleCustomSecurityQuestion === "function") {
        toggleCustomSecurityQuestion();
    }

    if (signupName) {
        signupName.addEventListener("input", function() {
            saveStoredValue(signupCookiePrefix + "name", signupName.value || "", 7);
        });
    }

    if (signupEmail) {
        signupEmail.addEventListener("input", function() {
            saveStoredValue(signupCookiePrefix + "email", signupEmail.value || "", 7);
        });
    }

    if (signupSecurityQuestion) {
        signupSecurityQuestion.addEventListener("change", function() {
            saveStoredValue(signupCookiePrefix + "securityQuestion", signupSecurityQuestion.value || "", 7);
        });
    }

    if (signupSecurityQuestionCustom) {
        signupSecurityQuestionCustom.addEventListener("input", function() {
            saveStoredValue(signupCookiePrefix + "securityQuestionCustom", signupSecurityQuestionCustom.value || "", 7);
        });
    }

    signupForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const name = document.getElementById("signup-name").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;
        const confirm = document.getElementById("signup-confirm").value;
        const securityQuestion = (document.getElementById("signup-security-question") || {}).value || "";
        const securityQuestionCustom = (document.getElementById("signup-security-question-custom") || {}).value || "";
        const securityAnswer = (document.getElementById("signup-security-answer") || {}).value || "";

        hideInlineError("signup-error-msg");

        if (!securityQuestion) {
            showInlineError("signup-error-msg", "Please select a security question.");
            return;
        }

        if (securityQuestion === "Other" && !securityQuestionCustom.trim()) {
            showInlineError("signup-error-msg", "Please enter your custom security question.");
            return;
        }

        if (!securityAnswer.trim()) {
            showInlineError("signup-error-msg", "Please provide a security answer.");
            return;
        }

        if (password.length < 6 ) {
            showInlineError("signup-error-msg", "Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirm) {
            showInlineError("signup-error-msg", "Passwords do not match!");
            return;
        }

        try {
            const response = await fetch("/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ name, email, password, securityQuestion, securityQuestionCustom, securityAnswer }) 
            });

            const data = await response.json();

            if (response.ok) {
                clearStoredValuesByPrefix(signupCookiePrefix);
                document.getElementById("accountName").textContent = name;

                showAccountSuccess();
            } else {
                showInlineError("signup-error-msg", data.message); 
            }
        } catch (err) {
            console.error(err);
            showInlineError("signup-error-msg", "Something went wrong. Please try again.");
        }
    });
}

// Login
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    const loginEmailInput = document.getElementById("login-email");
    const savedLoginEmail = getStoredValue("loginEmail");

    if (loginEmailInput && savedLoginEmail) {
        loginEmailInput.value = savedLoginEmail;
    }

    if (loginEmailInput) {
        loginEmailInput.addEventListener("input", function() {
            saveStoredValue("loginEmail", loginEmailInput.value || "", 7);
        });
    }

    loginForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        hideInlineError("login-error-msg");
        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ email, password })
            });

            let data = {};
            try {
                data = await response.json();
            } catch (parseErr) {
                data = {};
            }

            if (response.ok) {
                saveStoredValue("loginEmail", email, 7);
                closeLoginPopup();
                window.location.href = "/feed";
            } else {
                showInlineError("login-error-msg", data.message || "Login failed. Please try again.");
            }
        } catch (err) {
            console.error(err);
            showInlineError("login-error-msg", "Something went wrong. Please try again.");
        }
    });
}

// Dropdown toggle logic
document.addEventListener('DOMContentLoaded', () => {
    // Initialize vote button states on page load
    const voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(button => {
        const postId = button.getAttribute('data-post-id');
        const action = button.getAttribute('data-action');
    });

    // We use a delegated event listener since elements might be dynamically added or not present initially
    document.body.addEventListener('click', function(e) {
        if (e.target.closest('.options') || e.target.closest('.comment-options')) {
            e.stopPropagation();
            const trigger = e.target.closest('.options') || e.target.closest('.comment-options');
            
            // Try to find container
            const container = trigger.closest('.options-container') || trigger.closest('.options-container-3') || trigger.closest('.comment-options-container');
            
            if (container) {
                // Try to find dropdown
                const dropdown = container.querySelector('.options-dropdown') || container.querySelector('.options-dropdown-3') || container.querySelector('.comment-options-dropdown');
                
                if (dropdown) {
                    const wasVisible = dropdown.classList.contains('show');
                    
                    // Close all others first
                    document.querySelectorAll('.options-dropdown.show, .options-dropdown-3.show, .comment-options-dropdown.show').forEach(d => {
                        d.classList.remove('show');
                    });
                    
                    // Toggle current one
                    if (!wasVisible) {
                        dropdown.classList.add('show');
                    }
                }
            }
        } else {
             // Close dropdowns when clicking outside
             document.querySelectorAll('.options-dropdown.show, .options-dropdown-3.show, .comment-options-dropdown.show').forEach(d => {
                d.classList.remove('show');
            });
        }
    });

});

// Post Actions
async function deleteReview(id) {
    const isConfirmed = await showCustomConfirm("Are you sure you want to delete this review?");
    if (isConfirmed) {
        try {
            const response = await fetch(`/delete-review/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // If on feed, refresh feed, if on profile, refresh profile
                // Simplest is to reload page
                window.location.reload();
            } else {
                const data = await response.json();
                showCustomAlert(data.message || "Failed to delete review");
            }
        } catch (err) {
            console.error(err);
            showCustomAlert("Error deleting review");
        }
    }
}

function editReview(id) {
    // Redirect to edit page
    window.location.href = `/edit-review/${id}`;
}

let currentReportPostId = null;
let currentReportElement = null;

function reportReview(id, element) {
    if (element && element.dataset.reported === 'true') {
        return; // Already reported
    }
    currentReportPostId = id;
    currentReportElement = element;
    
    // Reset report form
    const reasonInput = document.getElementById("report-reason");
    if (reasonInput) reasonInput.value = "";
    hideInlineError("report-error-msg");
    
    const popup = document.getElementById("reportReviewPopup");
    if (popup) popup.classList.remove("hidden");
}

function closeReportPopup() {
    const popup = document.getElementById("reportReviewPopup");
    if (popup) popup.classList.add("hidden");
    currentReportPostId = null;
    currentReportElement = null;
}

function closeReportSuccessPopup() {
    const popup = document.getElementById("reportSuccessPopup");
    if (popup) popup.classList.add("hidden");
}

async function submitReport() {
    const reasonInput = document.getElementById("report-reason");
    const reason = reasonInput ? reasonInput.value.trim() : "";
    
    if (!reason) {
        showInlineError("report-error-msg", "Please provide a reason for reporting.");
        return;
    }

    try {
        const response = await fetch(`/report-review/${currentReportPostId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();
        
        if (response.ok) {
            const reportEl = currentReportElement;
            closeReportPopup();
            
            // showCustomAlert("Report successful!");
            const popup = document.getElementById("reportSuccessPopup");
            if (popup) popup.classList.remove("hidden");
            
            // Update the UI
            if (reportEl) {
                reportEl.innerHTML = "🚩 Reported";
                reportEl.style.color = "#d94866";
                reportEl.dataset.reported = "true";
                reportEl.style.cursor = "default";
            }
        } else {
            showInlineError("report-error-msg", data.message || "Failed to report.");
        }

    } catch (err) {
        console.error(err);
        showInlineError("report-error-msg", "Something went wrong.");
    }
}


// --- UPDATE PASSWORD LOGIC ---
function openUpdatePassword() {
    console.log("Opening update password popup...");
    const popup = document.getElementById("updatePasswordPopup");
    if (popup) {
        popup.classList.remove("hidden");
        const form = document.getElementById("updatePasswordForm");
        if (form) form.reset();
        hideInlineError("update-pw-error-msg");
        console.log("Popup opened.");
    } else {
        console.error("Update password popup not found!");
        // Create popup dynamically if missing? No, user should fix layout.
        // Alert user for fallback
        alert("Password popup not found. Please refresh the page.");
    }
}

function closeUpdatePassword() {
    const popup = document.getElementById("updatePasswordPopup");
    if (popup) {
        popup.classList.add("hidden");
    }
}

async function submitUpdatePassword(e) {
    if (e) e.preventDefault();
    hideInlineError("update-pw-error-msg");

    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-update-password").value;
    const confirmPassword = document.getElementById("confirm-update-password").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showInlineError("update-pw-error-msg", "All fields are required.");
        return;
    }

    if (newPassword.length < 6) {
        showInlineError("update-pw-error-msg", "New password must be at least 6 characters long.");
        return;
    }

    if (newPassword === currentPassword) {
        showInlineError("update-pw-error-msg", "New password must not be the same as current password.");
        return;
    }

    if (newPassword !== confirmPassword) {
        showInlineError("update-pw-error-msg", "New passwords do not match.");
        return;
    }

    try {
        const response = await fetch("/update-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeUpdatePassword();
            openSuccessPassword();
        } else {
            showInlineError("update-pw-error-msg", data.message || "Failed to update password.");
        }
    } catch (err) {
        showInlineError("update-pw-error-msg", "An error occurred. Please try again.");
    }
}

function openSuccessPassword() {
    const popup = document.getElementById("successPasswordPopup");
    if (popup) popup.classList.remove("hidden");
}

function closeSuccessPassword() {
    const popup = document.getElementById("successPasswordPopup");
    if (popup) popup.classList.add("hidden");
}

function toggleCustomCuisine() { //!CHECK
    const select = document.getElementById('cuisineSelect');
    const input = document.getElementById('customCuisineInput');
    if (select.value === 'Other') {
        input.style.display = 'block';
        input.required = true;
    } else {
        input.style.display = 'none';
        input.required = false;
        input.value = '';
    }
}

function toggleCustomLocation() {//!CHECK
    const select = document.getElementById('locationSelect');
    const input = document.getElementById('customLocationInput');
    if (select.value === 'Other') {
        input.style.display = 'block';
        input.required = true;
    } else {
        input.style.display = 'none';
        input.required = false;
        input.value = '';
    }
}

function toggleCustomSecurityQuestion() {
    const select = document.getElementById('signup-security-question');
    const group = document.getElementById('signup-custom-security-question-group');
    const input = document.getElementById('signup-security-question-custom');

    if (!select || !group || !input) return;

    if (select.value === 'Other') {
        group.style.display = 'block';
        input.required = true;
    } else {
        group.style.display = 'none';
        input.required = false;
        input.value = '';
    }
}


// Profile Update
async function submitProfileUpdate(event) {
    event.preventDefault();

    const form = event.target;
    const nameField = form.querySelector('[name="name"]');
    const usernameField = form.querySelector('[name="username"]');
    const bioField = form.querySelector('[name="bio"]');

    const currentName = (nameField?.defaultValue || '').trim();
    const currentUsername = (usernameField?.defaultValue || '').trim();
    const currentBio = (bioField?.defaultValue || '').trim();

    const nextName = (nameField?.value || '').trim();
    const nextUsername = (usernameField?.value || '').trim();
    const nextBio = (bioField?.value || '').trim();

    const usernameChanged = nextUsername !== currentUsername;
    const profileChanged = nextName !== currentName || usernameChanged || nextBio !== currentBio;

    if (!profileChanged) {
        clearStoredValuesByPrefix('profileDraft-');
        closeEditProfilePopup();
        return;
    }

    const updateData = {
        name: nextName,
        username: nextUsername,
        bio: nextBio
    };

    try {
        const response = await fetch('/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            clearStoredValuesByPrefix('profileDraft-');
            if (data.usernameChanged) {
                await showCustomAlert('Username changed successfully!');
            }
            closeEditProfilePopup();
            window.location.reload();
        } else {
            await showCustomAlert(data.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        await showCustomAlert('Failed to update profile. Please try again.');
    }
}

document.addEventListener("DOMContentLoaded", function () {
    let profileForm = document.querySelector('#editProfilePopup form');
    if (!profileForm) return;

    let profileCookiePrefix = 'profileDraft-';
    let fields = ['name', 'username', 'email', 'bio'];

    for (let i = 0; i < fields.length; i++) {
        let fieldName = fields[i];
        let field = profileForm.querySelector('[name="' + fieldName + '"]');
        if (!field) continue;

        let savedValue = getStoredValue(profileCookiePrefix + fieldName);
        if (savedValue !== null && savedValue !== '') {
            field.value = savedValue;
        }

        let saveFn = function () {
            saveStoredValue(profileCookiePrefix + fieldName, field.value || '', 7);
        };

        field.addEventListener('input', saveFn);
        field.addEventListener('change', saveFn);
    }
});

document.addEventListener("DOMContentLoaded", function () {
    let recoveryEmailInput = document.getElementById("recovery-email-step");
    let resetEmailInput = document.getElementById("reset-email");
    if (!recoveryEmailInput && !resetEmailInput) return;

    let savedRecoveryEmail = getStoredValue("recoveryEmail");
    if (savedRecoveryEmail) {
        if (recoveryEmailInput) recoveryEmailInput.value = savedRecoveryEmail;
        if (resetEmailInput) resetEmailInput.value = savedRecoveryEmail;
    }

    if (recoveryEmailInput) {
        recoveryEmailInput.addEventListener("input", function () {
            saveStoredValue("recoveryEmail", recoveryEmailInput.value || "", 7);
            if (resetEmailInput) resetEmailInput.value = recoveryEmailInput.value || "";
        });
    }
});

// --- Delete Account Logic ---
function openDeleteAccountConfirm() {
    const popup = document.getElementById('deleteAccountConfirmPopup');
    if (popup) {
        popup.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeDeleteAccountConfirm() {
    const popup = document.getElementById('deleteAccountConfirmPopup');
    if (popup) {
        popup.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

async function submitDeleteAccount() {
    try {
        const response = await fetch('/delete-user', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            window.location.href = '/'; 
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to delete account');
            closeDeleteAccountConfirm();
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('An error occurred. Please try again.');
        closeDeleteAccountConfirm();
    }
}

function openDeleteCommentPopup() {
    const popup = document.getElementById('deleteCommentPopup');
    if (popup) popup.classList.remove('hidden');
}

function closeDeleteCommentPopup() {
     const popup = document.getElementById('deleteCommentPopup');
     if (popup) popup.classList.add('hidden');
    deleteCommentContext = null;
}

function confirmDeleteComment() {
    if (!deleteCommentContext) return;
    const { commentItem, postId, commentIndex } = deleteCommentContext;

    fetch(`/comment/${postId}/${commentIndex}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.message === "Comment deleted") {
                commentItem.remove();
            } else {
                showCustomAlert(data.message);
            }
        })
        .catch(err => {
            console.error('Error deleting comment:', err);
            showCustomAlert('Failed to delete comment. Please try again.');
        })
        .finally(() => {
             closeDeleteCommentPopup();
        });
}

