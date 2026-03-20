const CART_API_ENDPOINT = "/api/carrello";

const PRODUCT_CATALOG = {
  burrata: { name: "Burrata di Andria", price: 8.5 },
  taralli: { name: "Taralli artigianali", price: 4.0 },
  orecchiette: { name: "Orecchiette fresche", price: 5.5 },
  olio: { name: "Olio EVO Terra di Bari", price: 11.0 },
  friselle: { name: "Friselle integrali", price: 4.8 },
  capocollo: { name: "Capocollo di Martina Franca", price: 9.5 }
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(amount);
}

function getUtenteAutenticato() {
  const utente = localStorage.getItem('utenteAutenticato');
  return utente ? JSON.parse(utente) : null;
}

function getUserStorageKey() {
  const utente = getUtenteAutenticato();
  if (!utente || !utente.nome || !utente.cognome) {
    return null;
  }
  return `DatiUtente_${utente.nome}_${utente.cognome}`;
}

function readUserData() {
  const key = getUserStorageKey();
  if (!key) {
    return null;
  }

  try {
    const data = localStorage.getItem(key);
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (_error) {
    return null;
  }
}

function writeUserData(userData) {
  const key = getUserStorageKey();
  if (!key) {
    return;
  }

  localStorage.setItem(key, JSON.stringify(userData));
}

async function syncCartFromServer() {
  const utente = getUtenteAutenticato();
  if (!utente || !utente.email) {
    return;
  }

  try {
    const response = await fetch(`${CART_API_ENDPOINT}?email=${encodeURIComponent(utente.email)}`);
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const userData = readUserData() || { nome: utente.nome, cognome: utente.cognome, email: utente.email };
      userData.cart = data;
      writeUserData(userData);
    }
  } catch (_error) {
    // Non bloccante
  }
}

function readCart() {
  try {
    const key = getUserStorageKey();

    if (key) {
      const userData = readUserData();
      if (userData && userData.cart && typeof userData.cart === "object") {
        return userData.cart;
      }
      return {};
    }

    const storedCart = localStorage.getItem("tikiFishCart");

    if (!storedCart) {
      return {};
    }

    const parsedCart = JSON.parse(storedCart);

    if (!parsedCart || typeof parsedCart !== "object") {
      return {};
    }

    return parsedCart;
  } catch (_error) {
    return {};
  }
}

function writeCart(cart) {
  const key = getUserStorageKey();

  if (!key) {
    // Fallback in localStorage per utenti anonimi
    localStorage.setItem("tikiFishCart", JSON.stringify(cart));
  } else {
    const userData = readUserData() || getUtenteAutenticato();
    if (userData) {
      userData.cart = cart;
      writeUserData(userData);
    }
  }

  saveCartSnapshotToJsonFile(cart);
}

function saveCartSnapshotToJsonFile(cart) {
  const items = getCartItems(cart);
  const snapshot = {
    updatedAt: new Date().toISOString(),
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
    totalPrice: Number(getCartTotal(items).toFixed(2)),
    items: items.map((item) => ({
      key: item.key,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      subtotal: Number(item.subtotal.toFixed(2))
    }))
  };

  void persistCartSnapshot(snapshot);
}

async function persistCartSnapshot(snapshot) {
  const wasWrittenToServerFile = await writeSnapshotToServerFile(snapshot);

  if (!wasWrittenToServerFile) {
    // Keep the cart functional even if the local server is not active.
    console.warn("Impossibile salvare su data/carrello.json. Avvia il server locale con: .\\server.ps1");
  }
}

async function writeSnapshotToServerFile(snapshot) {
  try {
    const utente = getUtenteAutenticato();
    const url = utente ? `${CART_API_ENDPOINT}?email=${encodeURIComponent(utente.email)}` : CART_API_ENDPOINT;
    const payload = {
      ...snapshot,
      user: utente ? utente.email : undefined
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (_error) {
    return false;
  }
}

function getCartItems(cart) {
  return Object.entries(cart)
    .filter(([key, quantity]) => PRODUCT_CATALOG[key] && Number(quantity) > 0)
    .map(([key, quantity]) => {
      const item = PRODUCT_CATALOG[key];
      const qty = Number(quantity);

      return {
        key,
        name: item.name,
        price: item.price,
        quantity: qty,
        subtotal: item.price * qty
      };
    });
}

function getCartTotal(items) {
  return items.reduce((total, item) => total + item.subtotal, 0);
}

document.addEventListener("DOMContentLoaded", async () => {
  await syncCartFromServer();

  const revealSelectors = "h2, p, img, video, blockquote, table, ol, ul, form, .card";
  const revealEls = document.querySelectorAll(revealSelectors);

  revealEls.forEach((el) => {
    el.classList.add("reveal");
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealEls.forEach((el) => observer.observe(el));


  const nav = document.querySelector(".nav");

  if (nav) {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); 
  }



  const navLinks = document.querySelectorAll(".nav a");
  const currentPath = window.location.pathname.replace(/\\/g, "/");

  navLinks.forEach((link) => {
    const linkPath = new URL(link.href).pathname.replace(/\\/g, "/");
    if (currentPath.endsWith(linkPath) || linkPath.endsWith(currentPath)) {
      link.classList.add("active");
    }
  });

  const productQtyInputs = document.querySelectorAll(".product-qty");
  const productsTotal = document.querySelector("#products-total");
  const cartItemsBody = document.querySelector("#cart-items-body");
  const cartProductsTotal = document.querySelector("#cart-products-total");
  const cartSummaryTotal = document.querySelector("#cart-summary-total");
  const cartEmptyMessage = document.querySelector("#cart-empty-message");

  const updateProductsTotal = (cart) => {
    if (!productsTotal) {
      return;
    }

    const total = getCartTotal(getCartItems(cart));
    productsTotal.textContent = formatCurrency(total);
  };

  if (productQtyInputs.length) {
    const initialCart = readCart();

    const syncCart = (inputEl) => {
      const productKey = inputEl.dataset.productKey;
      if (!productKey) return;

      const nextCart = readCart();
      const quantity = Math.max(0, Math.floor(Number(inputEl.value) || 0));
      inputEl.value = String(quantity);

      if (quantity > 0) {
        nextCart[productKey] = quantity;
      } else {
        delete nextCart[productKey];
      }

      writeCart(nextCart);
      updateProductsTotal(nextCart);
    };

    productQtyInputs.forEach((input) => {
      const productKey = input.dataset.productKey;
      if (!productKey) return;

      input.value = String(Number(initialCart[productKey] || 0));

      input.addEventListener("change", () => {
        syncCart(input);
      });

      const wrapper = input.closest(".qty-control");
      if (!wrapper) return;

      const decrementBtn = wrapper.querySelector(".qty-btn.decrement");
      const incrementBtn = wrapper.querySelector(".qty-btn.increment");

      if (decrementBtn) {
        decrementBtn.addEventListener("click", () => {
          input.value = String(Math.max(0, Number(input.value || 0) - 1));
          syncCart(input);
        });
      }
      if (incrementBtn) {
        incrementBtn.addEventListener("click", () => {
          input.value = String(Math.max(0, Number(input.value || 0) + 1));
          syncCart(input);
        });
      }
    });

    updateProductsTotal(initialCart);
  }

  const renderCart = () => {
    if (!cartItemsBody || !cartProductsTotal || !cartSummaryTotal) {
      return;
    }

    const cart = readCart();
    const items = getCartItems(cart);
    const total = getCartTotal(items);

    if (!items.length) {
      cartItemsBody.innerHTML = "<tr><td colspan=\"5\">Nessun prodotto nel carrello.</td></tr>";
      cartProductsTotal.textContent = formatCurrency(0);
      cartSummaryTotal.textContent = formatCurrency(0);

      if (cartEmptyMessage) {
        cartEmptyMessage.hidden = false;
      }

      return;
    }

    cartItemsBody.innerHTML = items
      .map(
        (item) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency(item.subtotal)}</td>
            <td>
              <div class="cart-actions">
                <button type="button" class="cart-action-btn" data-action="decrease" data-product-key="${item.key}" aria-label="Riduci quantita di ${item.name}">-</button>
                <button type="button" class="cart-action-btn" data-action="increase" data-product-key="${item.key}" aria-label="Aumenta quantita di ${item.name}">+</button>
                <button type="button" class="cart-action-btn remove" data-action="remove" data-product-key="${item.key}">Rimuovi</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");

    cartProductsTotal.textContent = formatCurrency(total);
    cartSummaryTotal.textContent = formatCurrency(total);

    if (cartEmptyMessage) {
      cartEmptyMessage.hidden = true;
    }
  };

  if (cartItemsBody && cartProductsTotal && cartSummaryTotal) {
    renderCart();

    cartItemsBody.addEventListener("click", (event) => {
      const targetButton = event.target.closest("button[data-action]");

      if (!targetButton) {
        return;
      }

      const action = targetButton.dataset.action;
      const productKey = targetButton.dataset.productKey;

      if (!action || !productKey || !PRODUCT_CATALOG[productKey]) {
        return;
      }

      const updatedCart = readCart();
      const currentQuantity = Number(updatedCart[productKey] || 0);

      if (action === "increase") {
        updatedCart[productKey] = currentQuantity + 1;
      }

      if (action === "decrease") {
        const nextQuantity = Math.max(currentQuantity - 1, 0);

        if (nextQuantity > 0) {
          updatedCart[productKey] = nextQuantity;
        } else {
          delete updatedCart[productKey];
        }
      }

      if (action === "remove") {
        delete updatedCart[productKey];
      }

      writeCart(updatedCart);
      renderCart();
    });
  }

  const cartForm = document.querySelector("#cart-form");
  const purchaseCard = document.querySelector("#purchase-card");
  const purchaseFeedback = document.querySelector("#purchase-feedback");

  if (cartForm && purchaseCard && purchaseFeedback) {
    cartForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!getCartItems(readCart()).length) {
        window.alert("Il carrello e vuoto. Aggiungi almeno un prodotto prima di confermare.");
        return;
      }

      if (!cartForm.reportValidity()) {
        return;
      }

      purchaseFeedback.hidden = false;
      purchaseCard.classList.remove("purchase-complete");
      purchaseFeedback.classList.remove("is-visible");

      window.requestAnimationFrame(() => {
        purchaseCard.classList.add("purchase-complete");
        purchaseFeedback.classList.add("is-visible");
      });

      cartForm.reset();
    });
  }

});
