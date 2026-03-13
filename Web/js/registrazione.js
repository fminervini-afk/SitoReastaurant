const registrationForm = document.getElementById("registration-form");
const passwordInput = document.getElementById("reg-password");
const passwordConfirmInput = document.getElementById("reg-password-confirm");

if (registrationForm && passwordInput && passwordConfirmInput) {
    const validatePasswords = () => {
        passwordInput.setCustomValidity("");
        passwordConfirmInput.setCustomValidity("");

        if (passwordInput.value.length < 8) {
            passwordInput.setCustomValidity("La password deve contenere almeno 8 caratteri.");
        }

        if (passwordConfirmInput.value && passwordInput.value !== passwordConfirmInput.value) {
            passwordConfirmInput.setCustomValidity("Le password non coincidono.");
        }
    };

    passwordInput.addEventListener("input", validatePasswords);
    passwordConfirmInput.addEventListener("input", validatePasswords);

    registrationForm.addEventListener("submit", (event) => {
        validatePasswords();

        if (!registrationForm.checkValidity()) {
            event.preventDefault();
            registrationForm.reportValidity();
        }
    });
}
