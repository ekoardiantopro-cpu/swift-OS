import { db, auth } from "./firebase.js";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let products = [];
let cart = [];
let currentUser = null;
let currentRole = null;
let total = 0;

const productList = document.getElementById("product-list");
const cartItems = document.getElementById("cart-items");
const totalEl = document.getElementById("total");
const reportEl = document.getElementById("report");
const searchEl = document.getElementById("search");
const logoutBtn = document.getElementById("logoutBtn");
const chargeBtn = document.getElementById("chargeBtn");
const reportBtn = document.getElementById("reportBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.replace("index.html");
    return;
  }

  currentUser = user;

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) {
      alert("Data user tidak ditemukan.");
      await signOut(auth);
      location.replace("index.html");
      return;
    }

    currentRole = userSnap.data().role;

    if (currentRole !== "admin" && currentRole !== "cashier") {
      alert("Role tidak valid.");
      await signOut(auth);
      location.replace("index.html");
      return;
    }

    // Hanya admin yang dapat membaca laporan.
    if (currentRole !== "admin") {
      reportBtn.style.display = "none";
    }

    startProducts();
  } catch (error) {
    console.error(error);
    alert("Gagal memuat data user.");
  }
});

async function logout() {
  logoutBtn.disabled = true;

  try {
    await signOut(auth);
    cart = [];
    currentUser = null;
    currentRole = null;
    location.replace("index.html");
  } catch (error) {
    console.error("Logout error:", error);
    alert("Logout gagal: " + (error.message || error));
    logoutBtn.disabled = false;
  }
}

logoutBtn.addEventListener("click", logout);

function startProducts() {
  onSnapshot(
    collection(db, "products"),
    (snapshot) => {
      products = [];
      snapshot.forEach((item) => {
        products.push({ id: item.id, ...item.data() });
      });
      searchProduct();
    },
    (error) => {
      console.error(error);
      alert("Gagal membaca produk. Periksa Firebase Rules.");
    }
  );
}

function formatRupiah(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render(list) {
  productList.innerHTML = "";

  if (!list.length) {
    productList.innerHTML = "<p>Produk tidak ditemukan.</p>";
    return;
  }

  list.forEach((p) => {
    const stock = Number(p.stock || 0);

    productList.innerHTML += `
      <div class="product ${stock <= 0 ? "out-of-stock" : ""}"
           data-id="${p.id}">
        <h4>${escapeHtml(p.name)}</h4>
        <p>Rp ${formatRupiah(p.price)}</p>
        <small>${stock <= 0 ? "Stok habis" : "Stok: " + stock}</small>
      </div>
    `;
  });

  productList.querySelectorAll(".product").forEach((element) => {
    const id = element.dataset.id;
    const product = products.find((p) => p.id === id);

    if (product && Number(product.stock || 0) > 0) {
      element.addEventListener("click", () => addToCart(id));
    }
  });
}

function searchProduct() {
  const keyword = (searchEl.value || "").trim().toLowerCase();

  render(
    products.filter((p) =>
      String(p.name || "").toLowerCase().includes(keyword)
    )
  );
}

searchEl.addEventListener("input", searchProduct);

function addToCart(id) {
  const product = products.find((p) => p.id === id);

  if (!product) return;
  if (Number(product.stock || 0) <= 0) {
    alert("Stok habis.");
    return;
  }

  const existing = cart.find((item) => item.id === id);

  if (existing) {
    if (existing.qty >= Number(product.stock)) {
      alert("Stok kurang.");
      return;
    }
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  drawCart();
}

function drawCart() {
  total = 0;
  cartItems.innerHTML = "";

  cart.forEach((item) => {
    total += Number(item.price || 0) * item.qty;

    const row = document.createElement("p");
    row.textContent = `${item.name} x${item.qty} `;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "−";
    removeButton.addEventListener("click", () => removeFromCart(item.id));

    row.appendChild(removeButton);
    cartItems.appendChild(row);
  });

  totalEl.textContent = formatRupiah(total);
}

function removeFromCart(id) {
  const index = cart.findIndex((item) => item.id === id);
  if (index === -1) return;

  if (cart[index].qty > 1) {
    cart[index].qty--;
  } else {
    cart.splice(index, 1);
  }

  drawCart();
}

async function bayar() {
  if (!currentUser) {
    alert("Sesi login belum siap.");
    return;
  }

  if (!cart.length) {
    alert("Keranjang masih kosong.");
    return;
  }

  chargeBtn.disabled = true;

  try {
    const transactionItems = [];
    let transactionTotal = 0;
    let transactionProfit = 0;

    for (const item of cart) {
      const ref = doc(db, "products", item.id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        throw new Error(`Produk "${item.name}" tidak ditemukan.`);
      }

      const data = snap.data();
      const stock = Number(data.stock || 0);
      const qty = Number(item.qty || 0);
      const price = Number(data.price || 0);
      const cost = Number(data.cost || 0);

      if (stock < qty) {
        throw new Error(`Stok ${data.name} tidak mencukupi.`);
      }

      transactionTotal += price * qty;
      transactionProfit += (price - cost) * qty;

      transactionItems.push({
        productId: item.id,
        name: data.name,
        price,
        qty,
        subtotal: price * qty
      });
    }

    for (const item of cart) {
      const ref = doc(db, "products", item.id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        throw new Error("Produk tidak ditemukan saat update stok.");
      }

      const data = snap.data();
      const stock = Number(data.stock || 0);
      const qty = Number(item.qty || 0);

      if (stock < qty) {
        throw new Error(`Stok ${data.name} berubah. Silakan ulangi transaksi.`);
      }

      await updateDoc(ref, {
        stock: stock - qty
      });
    }

    await addDoc(collection(db, "transactions"), {
      items: transactionItems,
      total: transactionTotal,
      profit: transactionProfit,
      cashierId: currentUser.uid,
      cashierEmail: currentUser.email || "",
      date: new Date()
    });

    alert("Transaksi sukses.");
    cart = [];
    drawCart();
    searchProduct();
  } catch (error) {
    console.error(error);
    alert(error.message || "Transaksi gagal.");
  } finally {
    chargeBtn.disabled = false;
  }
}

chargeBtn.addEventListener("click", bayar);

async function loadReport() {
  if (currentRole !== "admin") {
    alert("Hanya admin yang dapat melihat laporan.");
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, "transactions"));

    let omzet = 0;
    let profit = 0;
    let count = 0;

    snapshot.forEach((item) => {
      const data = item.data();
      omzet += Number(data.total || 0);
      profit += Number(data.profit || 0);
      count++;
    });

    reportEl.innerHTML = `
      <p>Total transaksi: <strong>${count}</strong></p>
      <p>Omzet: <strong>Rp ${formatRupiah(omzet)}</strong></p>
      <p>Profit: <strong>Rp ${formatRupiah(profit)}</strong></p>
    `;
  } catch (error) {
    console.error(error);
    alert("Gagal memuat laporan.");
  }
}

reportBtn.addEventListener("click", loadReport);
