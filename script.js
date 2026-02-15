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

function submitForgotPassword() {
    const email = document.getElementById('forgot-email').value;
    alert('Password reset link has been sent to ' + email);
    closeForgotPasswordPopup();
    return false;
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
    window.location.href = "Feed.html";
}

function goToNotifications() {
    window.location.href = "Notifs.html";
}

function goToProfile() {
    window.location.href = "UserProfile-Reviews.html";
}

function goToActivity() {
    window.location.href = "UserProfile-Activity.html";
}

function goToSettings() {
    window.location.href = "Settings.html";
}

function goToLanding() {
    window.location.href = "Landing.html";
}

function logout() {

    window.location.href = "Landing.html";
}
