function openLoginPopup() {
    document.getElementById("loginPopup").classList.remove("hidden");
    document.getElementById("signupPopup").classList.add("hidden");
}

function closeLoginPopup() {
    document.getElementById("loginPopup").classList.add("hidden");
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

window.onclick = function(event) {
    const loginPopup = document.getElementById("loginPopup");
    const signUpPopup = document.getElementById("signupPopup");
    const successPopup = document.getElementById("successPopup");
    
    if (event.target === loginPopup) {
        loginPopup.classList.add("hidden");
    }
    if (event.target === signUpPopup) {
        signUpPopup.classList.add("hidden");
    }
    if (event.target === successPopup) {
        successPopup.classList.add("hidden");
    }
}
