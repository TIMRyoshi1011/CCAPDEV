function openLoginPopup() {
    document.getElementById("loginPopup").classList.remove("hidden");
    document.getElementById("signupPopup").classList.add("hidden");
}

function closeLoginPopup() {
    document.getElementById("loginPopup").classList.add("hidden");
}

function openForgotPasswordPopup() {
    closeLoginPopup();
    document.getElementById('forgotPasswordPopup').classList.remove('hidden');
}

function closeForgotPasswordPopup() {
    document.getElementById('forgotPasswordPopup').classList.add('hidden');
}

function openSignUpPopup() {
    document.getElementById("signupPopup").classList.remove("hidden");
    document.getElementById("loginPopup").classList.add("hidden");
}

function closeSignUpPopup() {
    document.getElementById("signupPopup").classList.add("hidden");
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

function openChangePassword() {
    document.getElementById("changePasswordPopup").classList.remove("hidden");
}

function closeChangePassword() {
    document.getElementById("changePasswordPopup").classList.add("hidden");
}

function openEditProfilePopup() {
    document.getElementById("editProfilePopup").classList.remove("hidden");
}

function closeEditProfilePopup() {
    document.getElementById("editProfilePopup").classList.add("hidden");
}

window.onclick = function(event) {
    const loginPopup = document.getElementById("loginPopup");
    const signUpPopup = document.getElementById("signupPopup");
    const successPopup = document.getElementById("successPopup");
    const editProfilePopup = document.getElementById("editProfilePopup");
    
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
}


// for ALL sidebar buttons, just change the href once u added the html file na
function goToFeed() {
    window.location.href = "/feed";
}

function goToNotifications() {
    window.location.href = "/notifications";
}

function goToProfile() {
    window.location.href = "/userprofile-reviews";
}

function goToActivity() {
    window.location.href = "/userprofile-activity";
}

function goToSettings() {
    window.location.href = "/settings";
}

function goToLanding() {
    window.location.href = "Landing.html";
}

function logout() {

    window.location.href = "Landing.html";
}

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
            alert(data.message || 'Failed to vote');
        }
    } catch (error) {
        console.error('Error voting:', error);
        alert('Failed to vote. Please try again.');
    }
}

// Comment toggle 
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('toggle-comments')) {
        const commentsSection = e.target.closest('.review-card-2').querySelector('.comments-section');
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
            const reviewCard = button.closest('.review-card-2');
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

// Forgot Password
async function submitForgotPassword() {
    const email = document.getElementById("forgot-email").value;
    const response = await fetch("/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
    });

    const data = await response.json();
    if (data.success) {
        window.resetEmail = email; 
        closeForgotPasswordPopup();
        openChangePassword();
    } else {
        alert(data.message);
    }
}

// Change Password
async function submitChangePassword() {
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }
    const response = await fetch("/change-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: window.resetEmail,
            newPassword: newPassword
        })
    });
    const data = await response.json();
    alert(data.message);
    closeChangePassword();
    openLoginPopup();
}

// Sign Up
signupForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const confirm = document.getElementById("signup-confirm").value;

    if (password !== confirm) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }) 
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById("accountName").textContent = name;

            showAccountSuccess();
        } else {
            alert(data.message); 
        }
    } catch (err) {
        console.error(err);
        alert("Something went wrong. Please try again.");
    }
});

// Login
const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            closeLoginPopup();
            window.location.href = "/feed";
        } else {
            alert(data.message); 
        }
    } catch (err) {
        console.error(err);
        alert("Something went wrong. Please try again.");
    }
});
