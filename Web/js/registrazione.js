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
        } else {
            event.preventDefault();
            
            // Se il form è valido, possiamo procedere con l'invio.
            const nome = document.getElementById('reg-nome').value;
            const cognome = document.getElementById('reg-cognome').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            
            const datiRegistrazione = {
                nome: nome,
                cognome: cognome,
                email: email,
                password: password
            };
            
            const jsonString = JSON.stringify(datiRegistrazione);
            localStorage.setItem('DatiUtente_' + nome + '_' + cognome, jsonString);
            
            // Salvare anche la sessione di login automaticamente dopo la registrazione
            localStorage.setItem('utenteAutenticato', JSON.stringify({
                nome: nome,
                cognome: cognome,
                email: email
            }));
            
            localStorage.setItem('ultimoLogin', new Date().toISOString());
            
            // Mostrare messaggio di successo e reindirizzare
            alert('Registrazione avvenuta con successo!');
            window.location.href = '../index.html';
        }
    });
}
