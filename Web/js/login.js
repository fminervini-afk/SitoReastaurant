// Sistema di login con verifica su localStorage
const loginForm = document.querySelector('form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const rememberMeCheckbox = document.getElementById('remember-me');

if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const rememberMe = rememberMeCheckbox.checked;

        // Validare che i campi non siano vuoti
        if (!email || !password) {
            alert('Inserisci email e password.');
            return;
        }

        // Cercare l'utente negli utenti registrati salvati in localStorage
        const utenteAutenticato = verificaCredenziali(email, password);

        if (utenteAutenticato) {
            // Login riuscito
            salvaSessioneUtente(utenteAutenticato, rememberMe);
            alert(`Benvenuto ${utenteAutenticato.nome}!`);
            // Reindirizzare alla home o dashboard
            window.location.href = '../index.html';
        } else {
            // Login fallito
            alert('Email o password non corrette.');
            passwordInput.value = '';
        }
    });

    // Se c'è una sessione salvata, pre-compilare il form
    caricaSessioneUtente();
}

/**
 * Verifica le credenziali dell'utente confrontandole con i dati in localStorage
 * @param {string} email - Email dell'utente
 * @param {string} password - Password dell'utente
 * @returns {Object|null} L'oggetto utente se le credenziali sono corrette, null altrimenti
 */
function verificaCredenziali(email, password) {
    // Iterare su tutti gli oggetti salvati in localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const chiave = localStorage.key(i);

        // Cercare solo le chiavi che iniziano con 'DatiUtente_'
        if (chiave.startsWith('DatiUtente_')) {
            try {
                const datiUtente = JSON.parse(localStorage.getItem(chiave));

                // Confrontare email e password
                if (datiUtente.email === email && datiUtente.password === password) {
                    return datiUtente;
                }
            } catch (error) {
                console.error(`Errore nel parsing della chiave ${chiave}:`, error);
            }
        }
    }

    return null;
}

/**
 * Salva la sessione dell'utente autenticato in localStorage
 * @param {Object} utente - L'oggetto utente autenticato
 * @param {boolean} rememberMe - Se true, salva le credenziali
 */
function salvaSessioneUtente(utente, rememberMe) {
    // Salvare lo stato di login
    localStorage.setItem('utenteAutenticato', JSON.stringify({
        nome: utente.nome,
        cognome: utente.cognome,
        email: utente.email
    }));

    // Se l'utente ha spuntato "Ricordami", salvare anche le credenziali
    if (rememberMe) {
        localStorage.setItem('ricordaCredenziali', JSON.stringify({
            email: utente.email,
            password: utente.password
        }));
    } else {
        // Rimuovere le credenziali salvate se "Ricordami" non è spuntato
        localStorage.removeItem('ricordaCredenziali');
    }

    // Registrare l'orario del login
    localStorage.setItem('ultimoLogin', new Date().toISOString());
}

/**
 * Carica la sessione salvata e pre-compila il form se le credenziali sono ricordate
 */
function caricaSessioneUtente() {
    const credenziliSalvate = localStorage.getItem('ricordaCredenziali');

    if (credenziliSalvate) {
        try {
            const { email, password } = JSON.parse(credenziliSalvate);
            if (emailInput && passwordInput && rememberMeCheckbox) {
                emailInput.value = email;
                passwordInput.value = password;
                rememberMeCheckbox.checked = true;
            }
        } catch (error) {
            console.error('Errore nel caricamento delle credenziali salvate:', error);
        }
    }
}

/**
 * Funzione per effettuare il logout
 */
function effettuaLogout() {
    localStorage.removeItem('utenteAutenticato');
    localStorage.removeItem('ultimoLogin');
    // Nota: 'ricordaCredenziali' viene mantenuto se erano salvate
    alert('Logout effettuato.');
    window.location.href = 'login.html';
}

/**
 * Funzione per verificare se l'utente è attualmente loggato
 * @returns {Object|null} L'oggetto utente loggato, o null
 */
function getUtenteAutenticato() {
    const utente = localStorage.getItem('utenteAutenticato');
    return utente ? JSON.parse(utente) : null;
}
