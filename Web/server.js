const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const CART_FILE_PATH = path.join(ROOT_DIR, "data", "carrello.json");
const USERS_FILE_PATH = path.join(ROOT_DIR, "data", "utenti.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".mp4": "video/mp4"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readUsersFile(callback) {
  fs.readFile(USERS_FILE_PATH, "utf8", (readErr, content) => {
    if (readErr) {
      if (readErr.code === "ENOENT") {
        callback(null, []);
        return;
      }
      callback(readErr);
      return;
    }

    try {
      const users = JSON.parse(content || "[]") || [];
      callback(null, users);
    } catch (parseErr) {
      callback(parseErr);
    }
  });
}

function writeUsersFile(users, callback) {
  fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), "utf8", callback);
}

function getUserCartFromUsers(userEmail, callback) {
  if (!userEmail) {
    callback(null, null);
    return;
  }

  readUsersFile((readErr, users) => {
    if (readErr) {
      callback(readErr);
      return;
    }

    const normalizedEmail = userEmail.trim().toLowerCase();
    const user = users.find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);

    if (!user) {
      callback(null, {});
      return;
    }

    callback(null, user.cart || {});
  });
}

function saveUserCart(userEmail, cart, callback) {
  if (!userEmail) {
    callback(new Error("User email required"));
    return;
  }

  readUsersFile((readErr, users) => {
    if (readErr) {
      callback(readErr);
      return;
    }

    const normalizedEmail = userEmail.trim().toLowerCase();
    let user = users.find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);

    if (!user) {
      user = { email: userEmail, cart };
      users.push(user);
    } else {
      user.cart = cart;
    }

    writeUsersFile(users, callback);
  });
}

function serveStaticFile(reqPath, res) {
  const safePath = reqPath === "/" ? "/index.html" : reqPath;
  const filePath = path.normalize(path.join(ROOT_DIR, safePath));

  if (!filePath.startsWith(ROOT_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (readError, fileBuffer) => {
    if (readError) {
      if (readError.code === "ENOENT") {
        sendJson(res, 404, { error: "File not found" });
        return;
      }

      sendJson(res, 500, { error: "Internal server error" });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(fileBuffer);
  });
}

function handleCartSave(req, res, queryUserEmail) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;

    if (body.length > 1_000_000) {
      req.destroy();
    }
  });

  req.on("end", () => {
    try {
      const parsed = JSON.parse(body || "{}");
      const userEmail = queryUserEmail || parsed.user;

      let cart;
      if (parsed.items && Array.isArray(parsed.items)) {
        // takeover from snapshot body
        cart = parsed.items.reduce((acc, item) => {
          if (item.key && item.quantity != null) {
            acc[item.key] = Number(item.quantity);
          }
          return acc;
        }, {});
      } else if (parsed.cart && typeof parsed.cart === "object") {
        cart = parsed.cart;
      } else {
        cart = parsed;
      }

      if (userEmail) {
        saveUserCart(userEmail, cart, (saveErr) => {
          if (saveErr) {
            sendJson(res, 500, { error: "Failed to save user cart" });
            return;
          }
          sendJson(res, 200, { ok: true });
        });
        return;
      }

      fs.writeFile(CART_FILE_PATH, JSON.stringify(cart, null, 2), "utf8", (writeError) => {
        if (writeError) {
          sendJson(res, 500, { error: "Failed to save cart file" });
          return;
        }

        sendJson(res, 200, { ok: true });
      });
    } catch (_error) {
      sendJson(res, 400, { error: "Invalid JSON payload" });
    }
  });
}

function handleRegistrazione(req, res) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;

    if (body.length > 1_000_000) {
      req.destroy();
    }
  });

  req.on("end", () => {
    try {
      const parsed = JSON.parse(body || "{}");
      const { nome, cognome, email } = parsed;

      if (!nome || !cognome || !email) {
        sendJson(res, 400, { error: "Dati mancanti" });
        return;
      }

      fs.readFile(USERS_FILE_PATH, "utf8", (readError, content) => {
        let users = [];
        if (!readError) {
          try {
            users = JSON.parse(content) || [];
          } catch (_e) {
            users = [];
          }
        }

        // (Opzionale) Evitiamo doppie registrazioni sulla stessa email.
        const emailEsistente = users.some((u) => u.email === email);
        if (emailEsistente) {
          sendJson(res, 409, { error: "Email già registrata" });
          return;
        }

        users.push({ nome, cognome, email });
        fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), "utf8", (writeError) => {
          if (writeError) {
            sendJson(res, 500, { error: "Failed to save users file" });
            return;
          }

          sendJson(res, 200, { ok: true });
        });
      });
    } catch (_error) {
      sendJson(res, 400, { error: "Invalid JSON payload" });
    }
  });
}

const server = http.createServer((req, res) => {
  if (!req.url || !req.method) {
    sendJson(res, 400, { error: "Bad request" });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/carrello" && req.method === "POST") {
    const userEmail = url.searchParams.get("email");
    handleCartSave(req, res, userEmail);
    return;
  }

  if (url.pathname === "/api/carrello" && req.method === "GET") {
    const userEmail = url.searchParams.get("email");

    if (userEmail) {
      getUserCartFromUsers(userEmail, (userErr, cart) => {
        if (userErr) {
          sendJson(res, 500, { error: "Failed to read user cart" });
          return;
        }

        sendJson(res, 200, cart || {});
      });
      return;
    }

    fs.readFile(CART_FILE_PATH, "utf8", (readError, content) => {
      if (readError) {
        if (readError.code === "ENOENT") {
          // Restituiamo carrello vuoto se non esiste file generico
          sendJson(res, 200, {});
          return;
        }

        sendJson(res, 500, { error: "Failed to read cart file" });
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(content);
    });
    return;
  }

  if (url.pathname === "/api/registrazione" && req.method === "POST") {
    handleRegistrazione(req, res);
    return;
  }

  if (url.pathname === "/api/registrazione" && req.method === "GET") {
    fs.readFile(USERS_FILE_PATH, "utf8", (readError, content) => {
      if (readError) {
        if (readError.code === "ENOENT") {
          // Nessun utente ancora registrato.
          sendJson(res, 200, []);
          return;
        }

        sendJson(res, 500, { error: "Failed to read users file" });
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(content);
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  serveStaticFile(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
