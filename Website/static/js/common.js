$(document).ready(function() {

// Check for click events on the navbar burger icon
$(".navbar-burger").click(function() {

    // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");

});
});

function cookieDisplay() {
    (function() {
        'use strict';
        var storageKey = '__cookiesAccepted__';
        if (!isStorageAllowed() || isSetPreference()) return;
        initializeNotice();
        function initializeNotice() {
            var el = document.getElementsByClassName('cookie-notice')[0];
            var dismissEl = el.getElementsByClassName('cookie-notice-dismiss')[0];
    
            el.style.display = 'block';
    
            dismissEl.addEventListener('click', function() {
                el.style.display = 'none';
                setPreferenceAccepted();
            }, false);
        }
        
        function setPreferenceAccepted() {
            localStorage.setItem(storageKey, true);
        }
        
        function isSetPreference() {
            return JSON.parse(localStorage.getItem(storageKey) || false);
        }
        
        function isStorageAllowed() {
            var test = '__localStorageTest__';
    
            try {
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
    
                return true;
            } catch (e) {
                console.warn('Storage not allowed, please allow cookies');
                return false;
            }
        };
    }());
    }