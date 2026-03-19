/**
 * Script per gestire l'interfaccia di autenticazione
 * Mostra il nome dell'utente loggato al posto di Login e Registrati
 */

document.addEventListener('DOMContentLoaded', () => {
    const authLinksContainer = document.querySelector('.auth-links');
    
    if (!authLinksContainer) return;

    const utenteAutenticato = getUtenteAutenticato();

    if (utenteAutenticato) {
        // L'utente è loggato: mostrare il nome e un link di logout
        authLinksContainer.innerHTML = `
            <span class="utente-nome">👤 ${utenteAutenticato.nome} ${utenteAutenticato.cognome}</span>
            <a href="#" class="logout-link">Logout</a>
        `;

        // Aggiungere il listener per il logout
        const logoutLink = authLinksContainer.querySelector('.logout-link');
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            effettuaLogout();
        });
    } else {
        // L'utente non è loggato: mostrare i link di login e registrazione
        // (Manteniamo il default che è già impostato nell'HTML)
    }
});

/**
 * Funzione per verificare se l'utente è attualmente loggato
 * @returns {Object|null} L'oggetto utente loggato, o null
 */
function getUtenteAutenticato() {
    const utente = localStorage.getItem('utenteAutenticato');
    return utente ? JSON.parse(utente) : null;
}

/**
 * Funzione per effettuare il logout
 */
function effettuaLogout() {
    localStorage.removeItem('utenteAutenticato');
    localStorage.removeItem('ultimoLogin');
    alert('Logout effettuato. Arrivederci!');
    window.location.href = window.location.href; // Ricaricare la pagina per aggiornare l'interfaccia
}
