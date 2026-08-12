import { db, auth } from './firebase.js';
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
let total = 0;
let currentUser = null;

const productList = document.getElementById("product-list");
const cartItems = document.getElementById("cart-items");
const totalEl = document.getElementById("total");
const reportEl = document.getElementById("report");
const searchEl = document.getElementById("search");
const chargeBtn = document.querySelector('button[onclick="bayar()"]');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) {
      alert("Data pengguna tidak ditemukan.");
      await signOut(auth);
      location.href = "index.html";
      return;
    }

    const role = userSnap.data().role;

    if (role !== "admin" && role !== "cashier") {
      alert("Role pengguna tidak valid.");
      await signOut(auth);
      location.href = "index.html";
      return;
    }

    // Laporan hanya untuk admin.
    if (role !== "admin") {
      const reportButton = document.querySelector('button[onclick="loadReport()"]');
      if (reportButton) reportButton.style.display = "none";
    }

    startProductsListener();
  } catch (error) {
    console.error(error);
    alert("Gagal memuat profil pengguna.");
  }
});

function startProductsListener() {
  onSnapshot(
    collection(db, "products"),
    (snap) => {
      products = [];
      snap.forEach((d) => products.push({ id: d.id, ...d.data() }));
      searchProduct();
    },
    (error) => {
      console.error(error);
      alert("Gagal memuat produk. Periksa Firebase Rules.");
    }
  );
}

function render(list) {
  productList.innerHTML = "";

  if (!list.length) {
    productList.innerHTML = "<p>Produk tidak ditemukan.</p>";
    return;
  }

  list.forEach((p) => {
    const stock = Number(p.stock || 0);
    const disabled = stock <= 0 ? "disabled" : "";

    productList.innerHTML += `
      <div class="product ${stock <= 0 ? "out-of-stock" : ""}"
           onclick="${stock > 0 ? `add('${p.id}')` : ""}">
        <h4>${escapeHtml(p.name)}</h4>
        <p>Rp ${formatRupiah(p.price)}</p>
        <small>${stock <= 0 ? "Stok habis" : `Stok: ${stock}`}</small>
      </div>`;
  });
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

window.searchProduct = () => {
  const keyword = (searchEl?.value || "").trim().toLowerCase();

  const filtered = products.filter((p) =>
    String(p.name || "").toLowerCase().includes(keyword)
  );

  render(filtered);
};

window.add = (id) => {
  const p = products.find((x) => x.id === id);

  if (!p) return;
  if (Number(p.stock) <= 0) return alert("Stok habis");

  const existing = cart.find((x) => x.id === id);

  if (existing) {
    if (existing.qty >= Number(p.stock)) {
      return alert("Stok kurang");
    }
    existing.qty++;
  } else {
    cart.push({ ...p, qty: 1 });
  }

  draw();
};

function draw() {
  total = 0;
  cartItems.innerHTML = "";

  cart.forEach((c) => {
    total += Number(c.price || 0) * c.qty;

    cartItems.innerHTML += `
      <p>
        ${escapeHtml(c.name)} x${c.qty}
        <button onclick="removeFromCart('${c.id}')">−</button>
      </p>`;
  });

  totalEl.innerText = formatRupiah(total);
}

window.removeFromCart = (id) => {
  const index = cart.findIndex((x) => x.id === id);
  if (index === -1) return;

  if (cart[index].qty > 1) {
    cart[index].qty--;
  } else {
    cart.splice(index, 1);
  }

  draw();
};

window.bayar = async () => {
  if (!currentUser) return alert("Sesi login belum siap.");
  if (!cart.length) return alert("Keranjang masih kosong.");

  if (chargeBtn) chargeBtn.disabled = true;

  try {
    const transactionItems = [];
    let transactionTotal = 0;
    let transactionProfit = 0;

    // Ambil stok terbaru sebelum perubahan.
    for (const item of cart) {
      const ref = doc(db, "products", item.id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        throw new Error(`Produk "${item.name}" sudah tidak tersedia.`);
      }

      const data = snap.data();
      const currentStock = Number(data.stock || 0);
      const qty = Number(item.qty || 0);

      if (qty <= 0) {
        throw new Error("Jumlah produk tidak valid.");
      }

      if (currentStock < qty) {
        throw new Error(`Stok ${data.name} tidak mencukupi.`);
      }

      const price = Number(data.price || 0);
      const cost = Number(data.cost || 0);

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

    // Kurangi stok.
    for (const item of cart) {
      const ref = doc(db, "products", item.id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        throw new Error("Produk tidak ditemukan saat menyimpan transaksi.");
      }

      const data = snap.data();
      const currentStock = Number(data.stock || 0);
      const qty = Number(item.qty || 0);

      if (currentStock < qty) {
        throw new Error(`Stok ${data.name} berubah. Silakan ulangi transaksi.`);
      }

      await updateDoc(ref, {
        stock: currentStock - qty
      });
    }

    // Simpan transaksi final. Tidak dapat diedit/dihapus melalui rules.
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
    draw();
    searchProduct();
  } catch (error) {
    console.error(error);
    alert(error.message || "Transaksi gagal.");
  } finally {
    if (chargeBtn) chargeBtn.disabled = false;
  }
};

window.loadReport = async () => {
  if (!currentUser) return;

  try {
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (!userSnap.exists() || userSnap.data().role !== "admin") {
      return alert("Hanya admin yang dapat melihat laporan.");
    }

    const snap = await getDocs(collection(db, "transactions"));

    let omzet = 0;
    let profit = 0;

    snap.forEach((d) => {
      const data = d.data();
      omzet += Number(data.total || 0);
      profit += Number(data.profit || 0);
    });

    reportEl.innerHTML = `
      <strong>Omzet:</strong> Rp ${formatRupiah(omzet)}
      <br>
      <strong>Profit:</strong> Rp ${formatRupiah(profit)}
    `;
  } catch (error) {
    console.error(error);
    alert("Gagal memuat laporan.");
  }
};

window.logout = async () => {
  await signOut(auth);
  location.href = "index.html";
};

searchEl?.addEventListener("input", searchProduct);
