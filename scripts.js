const CONFIG = {
    GOOGLE_CLIENT_ID: '844692197206-n333q1h31ajev3jkvk0r7khl7jg6ofu2.apps.googleusercontent.com',
    
    GOOGLE_FORM_ACTION_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSeVOJoAOw7Gt04m2pv4eENyJ8Gwxswxhlby3QPfoAf3eM6Ftg/formResponse',
    FORM_FIELDS: {
        name: 'entry.1554280251',
        email: 'entry.264001980',
        contact: 'entry.563391938',
        attending: 'entry.309359023'
    }
};

// State
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initScrollEffects();
});

// Scroll to next section when clicking arrow
function scrollToNextSection() {
    const storySection = document.getElementById('story');
    if (storySection) {
        storySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Scroll to hero section
function scrollToHero() {
    const heroSection = document.getElementById('hero');
    if (heroSection) {
        heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Navigation
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });
}

// Scroll effects
function initScrollEffects() {
    const navbar = document.getElementById('navbar');
    const heroSection = document.getElementById('hero');
    const scrollToTopBtn = document.getElementById('scrollToTop');
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function updateNavbar() {
        const heroBottom = heroSection.offsetHeight;
        const scrollPosition = window.scrollY;

        // Show navbar when scrolling past hero section
        if (scrollPosition > heroBottom - 200) {
            navbar.classList.add('visible');
            if (scrollPosition > heroBottom) {
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            }
        } else {
            navbar.classList.remove('visible');
        }

        // Show scroll to top button when scrolled down
        if (scrollPosition > heroBottom) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }

        // Update active nav link based on scroll position
        let currentSection = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            // Check if we're in this section (with some offset for better UX)
            if (scrollPosition >= sectionTop - 300 && scrollPosition < sectionTop + sectionHeight - 300) {
                currentSection = section.getAttribute('id');
            }
        });

        // Remove active class from all links and add to current
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateNavbar);
    // Also update on page load in case user refreshed mid-page
    updateNavbar();
}

// Google Sign-In Callback
function handleCredentialResponse(response) {
    // Decode the JWT token to get user info
    const userInfo = parseJwt(response.credential);
    
    currentUser = {
        email: userInfo.email,
        name: userInfo.name,
        token: response.credential
    };

    // Check if user has already responded
    checkExistingRSVP(currentUser.email);
}

// Parse JWT token
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Check if user has already responded
function checkExistingRSVP(email) {
    // Check localStorage for previous submission
    const hasResponded = localStorage.getItem(`rsvp_${email}`);
    
    if (hasResponded) {
        showAlreadyResponded();
    } else {
        showRSVPForm();
    }
}

// Show RSVP form
function showRSVPForm() {
    document.getElementById('signInPrompt').style.display = 'none';
    document.getElementById('alreadyResponded').style.display = 'none';

    const form = document.getElementById('rsvpForm');
    form.style.display = 'block';

    // Pre-fill email and name
    document.getElementById('email').value = currentUser.email;
    document.getElementById('name').value = currentUser.name;

    // Pre-fill phone number with +63
    const contactInput = document.getElementById('contact');
    if (!contactInput.value) {
        contactInput.value = '+63 ';
    }

    // Add form submit listener
    form.addEventListener('submit', handleRSVPSubmit);
}

// Show already responded message
function showAlreadyResponded() {
    document.getElementById('signInPrompt').style.display = 'none';
    document.getElementById('rsvpForm').style.display = 'none';
    document.getElementById('alreadyResponded').style.display = 'block';
}

// Handle RSVP form submission
async function handleRSVPSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');

    // Get form data
    const contactValue = document.getElementById('contact').value.trim();

    // Validate contact number (must have more than just +63)
    if (contactValue === '+63' || contactValue === '+63 ' || contactValue.length < 8) {
        alert('Please enter a valid contact number.');
        return;
    }

    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        contact: contactValue,
        attending: document.querySelector('input[name="attending"]:checked').value
    };

    // Disable submit button
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    // Submit to Google Forms
    await submitToGoogleForms(formData);

    // Store in localStorage to prevent duplicate submissions
    localStorage.setItem(`rsvp_${formData.email}`, 'true');

    // Show success message
    showAlreadyResponded();
}

// Submit to Google Forms
async function submitToGoogleForms(data) {
    // Create a hidden iframe to submit the form
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.name = 'hidden_iframe';
    document.body.appendChild(iframe);

    // Create a temporary form
    const form = document.createElement('form');
    form.action = CONFIG.GOOGLE_FORM_ACTION_URL;
    form.method = 'POST';
    form.target = 'hidden_iframe';

    // Add form fields
    Object.entries({
        [CONFIG.FORM_FIELDS.name]: data.name,
        [CONFIG.FORM_FIELDS.email]: data.email,
        [CONFIG.FORM_FIELDS.contact]: data.contact,
        [CONFIG.FORM_FIELDS.attending]: data.attending
    }).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
    });

    document.body.appendChild(form);

    // Submit the form
    form.submit();

    // Wait a moment to ensure submission completes
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Cleanup
    if (form.parentNode) form.parentNode.removeChild(form);
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
}

// Map functionality
function openMap(location) {
    const modal = document.getElementById('mapModal');
    const mapContainer = document.getElementById('mapContainer');
    
    // Map coordinates (replace with your actual locations)
    const locations = {
        ceremony: {
            name: "St. Mary's Cathedral",
            embed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3151.835434509374!2d144.95373631531677!3d-37.81720997975195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad65d4c2b349649%3A0xb6899234e561db11!2sEnvato!5e0!3m2!1sen!2sau!4v1234567890123!5m2!1sen!2sau"
        },
        reception: {
            name: "Grand Ballroom",
            embed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3151.835434509374!2d144.95373631531677!3d-37.81720997975195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad65d4c2b349649%3A0xb6899234e561db11!2sEnvato!5e0!3m2!1sen!2sau!4v1234567890123!5m2!1sen!2sau"
        }
    };
    
    const selectedLocation = locations[location];
    mapContainer.innerHTML = `
        <h3>${selectedLocation.name}</h3>
        <iframe src="${selectedLocation.embed}" 
                allowfullscreen="" 
                loading="lazy" 
                referrerpolicy="no-referrer-when-downgrade">
        </iframe>
    `;
    
    modal.style.display = 'block';
}

function openParkingMap() {
    const modal = document.getElementById('mapModal');
    const mapContainer = document.getElementById('mapContainer');
    
    // You can either show an embedded Google Map or an uploaded parking diagram
    mapContainer.innerHTML = `
        <h3>Parking Map</h3>
        <p style="text-align: center; margin-bottom: 1rem;">
            Parking is available at both ceremony and reception venues.
        </p>
        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3151.835434509374!2d144.95373631531677!3d-37.81720997975195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad65d4c2b349649%3A0xb6899234e561db11!2sEnvato!5e0!3m2!1sen!2sau!4v1234567890123!5m2!1sen!2sau" 
                allowfullscreen="" 
                loading="lazy" 
                referrerpolicy="no-referrer-when-downgrade">
        </iframe>
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('mapModal').style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('mapModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Phone number formatting (optional enhancement)
document.addEventListener('DOMContentLoaded', function() {
    const contactInput = document.getElementById('contact');
    if (contactInput) {
        contactInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            // Format as +63 XXX XXX XXXX for Philippine numbers
            if (value.startsWith('63')) {
                if (value.length > 2) {
                    value = '+63 ' + value.substring(2);
                }
                if (value.length > 7) {
                    value = value.substring(0, 7) + ' ' + value.substring(7);
                }
                if (value.length > 11) {
                    value = value.substring(0, 11) + ' ' + value.substring(11, 15);
                }
            }
            
            e.target.value = value;
        });
    }
});