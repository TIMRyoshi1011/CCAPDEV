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

function filterRestaurants() {
    const searchInput = document.getElementById('restaurantSearch').value.toLowerCase();
    const restaurantCards = document.querySelectorAll('.restaurant-card');
    
    restaurantCards.forEach(card => {
        const restaurantName = card.querySelector('h3').textContent.toLowerCase();
        const cuisine = card.querySelector('.cuisine-tag').textContent.toLowerCase();
        const location = card.querySelector('.location-pin').textContent.toLowerCase();
        
        if (restaurantName.includes(searchInput) || cuisine.includes(searchInput) || location.includes(searchInput)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function selectRestaurant(name, cuisine, location, rating) {
    // initials for restaurant image as placeholder for restaurant display
    const initials = name.split(' ').map(word => word[0]).join('').substring(0, 2);
    
    document.getElementById('selectedRestaurantName').textContent = name;
    document.getElementById('selectedCuisine').textContent = cuisine;
    document.getElementById('selectedLocation').textContent = '📍 ' + location;
    document.getElementById('selectedRestaurantImage').textContent = initials;
    
    // change to step 2 styling
    document.getElementById('step1-content').style.display = 'none';
    document.getElementById('step2-content').style.display = 'block';
    
    document.getElementById('step1-crumb').style.color = '#6b7280';
    document.getElementById('step2-crumb').style.color = '#173829';
    document.getElementById('step2-crumb').style.fontWeight = '600';
}

// change restaurant (go back to step 1)
function changeRestaurant() {
    document.getElementById('step1-content').style.display = 'block';
    document.getElementById('step2-content').style.display = 'none';
    
    document.getElementById('step1-crumb').style.color = '#173829';
    document.getElementById('step1-crumb').style.fontWeight = '600';
    document.getElementById('step2-crumb').style.color = '#6b7280';
    document.getElementById('step2-crumb').style.fontWeight = '400';
}

document.addEventListener('DOMContentLoaded', function() {
    const starRatings = document.querySelectorAll('.star-rating');
    
    starRatings.forEach(ratingDiv => {
        const stars = ratingDiv.querySelectorAll('.star');
        
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const value = parseInt(this.getAttribute('data-value'));
                const category = ratingDiv.getAttribute('data-category');
                
                ratingDiv.setAttribute('data-rating', value);
                
                stars.forEach((s, index) => {
                    if (index < value) {
                        s.textContent = '★';
                        s.style.color = '#f59e0b';
                    } else {
                        s.textContent = '☆';
                        s.style.color = '#d1d5db';
                    }
                });
                
                const ratingRow = ratingDiv.closest('.rating-row');
                ratingRow.querySelector('.rating-value').textContent = value + '/5';
                
                updateOverallRating();
                
                checkFormCompletion();
            });
            
            star.addEventListener('mouseenter', function() {
                const value = parseInt(this.getAttribute('data-value'));
                stars.forEach((s, index) => {
                    if (index < value) {
                        s.style.color = '#f59e0b';
                    } else {
                        s.style.color = '#d1d5db';
                    }
                });
            });
        });
        
        ratingDiv.addEventListener('mouseleave', function() {
            const currentRating = parseInt(ratingDiv.getAttribute('data-rating'));
            stars.forEach((s, index) => {
                if (index < currentRating) {
                    s.textContent = '★';
                    s.style.color = '#f59e0b';
                } else {
                    s.textContent = '☆';
                    s.style.color = '#d1d5db';
                }
            });
        });
    });
    
    // Form field listeners
    const reviewTitle = document.getElementById('reviewTitle');
    const reviewText = document.getElementById('reviewText');
    
    if (reviewTitle) {
        reviewTitle.addEventListener('input', checkFormCompletion);
    }
    if (reviewText) {
        reviewText.addEventListener('input', checkFormCompletion);
    }
});

// Calculate overall rating
function updateOverallRating() {
    const serviceRating = parseInt(document.querySelector('[data-category="service"]').getAttribute('data-rating')) || 0;
    const tasteRating = parseInt(document.querySelector('[data-category="taste"]').getAttribute('data-rating')) || 0;
    const ambianceRating = parseInt(document.querySelector('[data-category="ambiance"]').getAttribute('data-rating')) || 0;
    
    const overall = ((serviceRating + tasteRating + ambianceRating) / 3).toFixed(1);
    
    // Update overall rating display
    const overallValue = document.querySelector('.overall-value');
    const overallStars = document.querySelector('.overall-stars');
    
    if (overallValue) {
        overallValue.textContent = overall + '/5';
        
        // Update star display
        const fullStars = Math.floor(parseFloat(overall));
        let starsHTML = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                starsHTML += '<span style="color: #f59e0b;">★</span>';
            } else {
                starsHTML += '<span style="color: #d1d5db;">☆</span>';
            }
        }
        overallStars.innerHTML = starsHTML;
    }
}

function checkFormCompletion() {
    const serviceRating = parseInt(document.querySelector('[data-category="service"]').getAttribute('data-rating')) || 0;
    const tasteRating = parseInt(document.querySelector('[data-category="taste"]').getAttribute('data-rating')) || 0;
    const ambianceRating = parseInt(document.querySelector('[data-category="ambiance"]').getAttribute('data-rating')) || 0;
    const reviewTitle = document.getElementById('reviewTitle')?.value.trim();
    const reviewText = document.getElementById('reviewText')?.value.trim();
    const submitBtn = document.getElementById('submitBtn');
    
    if (submitBtn) {
        if (serviceRating > 0 && tasteRating > 0 && ambianceRating > 0 && reviewTitle && reviewText) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Review';
            submitBtn.style.background = '#36734e';
            submitBtn.style.cursor = 'pointer';
        } else {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Fill all fields to continue';
            submitBtn.style.background = '#d1d5db';
            submitBtn.style.cursor = 'not-allowed';
        }
    }
}

function cancelReview() {
    if (confirm('Are you sure you want to cancel? All your progress will be lost.')) {
        window.location.href = 'Feed.html';
    }
}

function submitReview() {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn && !submitBtn.disabled) {
        alert('Review submitted successfully! 🎉');
        window.location.href = 'Feed.html';
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
