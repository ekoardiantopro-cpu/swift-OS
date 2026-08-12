import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const content = document.getElementById("content");
const logoutBtn = document.getElementById("logoutBtn");
const cashierBtn = document.getElementById("cashierBtn");
const productsBtn = document.getElementById("productsBtn");
const reportBtn = document.getElementById("reportBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.replace("index.html");
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists() || userSnap.data().role !== "admin") {
      alert("Akses ditolak. Halaman ini hanya untuk admin.");
      location.replace("dashboard.html");
      return;
    }

    showProducts();
  } catch (error) {
    console.error(error);
    alert("Gagal memverifikasi role admin.");
    location.replace("dashboard.html");
  }
});

async function logout() {
  logoutBtn.disabled = true;

  try {
    await signOut(auth);
    location.replace("index.html");
  } catch (error) {
    console.error(error);
    alert("Logout gagal: " + (error.message || error));
    logoutBtn.disabled = false;
  }
}

logoutBtn.addEventListener("click", logout);
cashierBtn.addEventListener("click", () => location.replace("dashboard.html"));
productsBtn.addEventListener("click", showProducts);
reportBtn.addEventListener("click", showReport);

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

async function showProducts() {
  try {
    const snapshot = await getDocs(collection(db, "products"));

    let html = `
      <h2>Produk</h2>
      <button id="addProductBtn" type="button">+ Tambah Produk</button>
      <div class="admin-products">
    `;

    snapshot.forEach((item) => {
      const p = item.data();

      html += `
        <div class="admin-product">
          <strong>${escapeHtml(p.name)}</strong>
          <div>Harga: Rp ${formatRupiah(p.price)}</div>
          <div>Stok: ${Number(p.stock || 0)}</div>
          <div>Modal: Rp ${formatRupiah(p.cost)}</div>
          <button type="button" data-edit="${item.id}">Edit</button>
          <button type="button" data-delete="${item.id}">Hapus</button>
        </div>
      `;
    });

    html += "</div>";
    content.innerHTML = html;

    document.getElementById("addProductBtn").addEventListener("click", showForm);

    content.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => editProduct(button.dataset.edit));
    });

    content.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", () => deleteProduct(button.dataset.delete));
    });
  } catch (error) {
    console.error(error);
    content.innerHTML = "<p>Gagal memuat produk.</p>";
  }
}

function showForm() {
  content.innerHTML = `
    <h2>Tambah Produk</h2>
    <input id="name" placeholder="Nama">
    <input id="price" type="number" min="0" placeholder="Harga">
    <input id="stock" type="number" min="0" placeholder="Stok">
    <input id="cost" type="number" min="0" placeholder="Modal">
    <button id="saveBtn" type="button">Simpan</button>
    <button id="cancelBtn" type="button">Batal</button>
  `;

  document.getElementById("saveBtn").addEventListener("click", saveProduct);
  document.getElementById("cancelBtn").addEventListener("click", showProducts);
}

async function saveProduct() {
  try {
    const name = document.getElementById("name").value.trim();
    const price = Number(document.getElementById("price").value);
    const stock = Number(document.getElementById("stock").value);
    const cost = Number(document.getElementById("cost").value);

    if (!name) return alert("Nama produk wajib diisi.");
    if (price < 0 || stock < 0 || cost < 0) return alert("Nilai tidak boleh negatif.");

    await addDoc(collection(db, "products"), { name, price, stock, cost });
    await showProducts();
  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan produk.");
  }
}

async function deleteProduct(id) {
  if (!confirm("Hapus produk ini?")) return;

  try {
    await deleteDoc(doc(db, "products", id));
    await showProducts();
  } catch (error) {
    console.error(error);
    alert("Gagal menghapus produk.");
  }
}

async function editProduct(id) {
  try {
    const snapshot = await getDoc(doc(db, "products", id));

    if (!snapshot.exists()) {
      alert("Produk tidak ditemukan.");
      return;
    }

    const p = snapshot.data();

    content.innerHTML = `
      <h2>Edit Produk</h2>
      <input id="name" value="${escapeHtml(p.name)}">
      <input id="price" type="number" min="0" value="${Number(p.price || 0)}">
      <input id="stock" type="number" min="0" value="${Number(p.stock || 0)}">
      <input id="cost" type="number" min="0" value="${Number(p.cost || 0)}">
      <button id="updateBtn" type="button">Update</button>
      <button id="cancelBtn" type="button">Batal</button>
    `;

    document.getElementById("updateBtn").addEventListener("click", () => updateProduct(id));
    document.getElementById("cancelBtn").addEventListener("click", showProducts);
  } catch (error) {
    console.error(error);
    alert("Gagal membuka produk.");
  }
}

async function updateProduct(id) {
  try {
    const name = document.getElementById("name").value.trim();
    const price = Number(document.getElementById("price").value);
    const stock = Number(document.getElementById("stock").value);
    const cost = Number(document.getElementById("cost").value);

    if (!name) return alert("Nama produk wajib diisi.");
    if (price < 0 || stock < 0 || cost < 0) return alert("Nilai tidak boleh negatif.");

    await updateDoc(doc(db, "products", id), { name, price, stock, cost });
    await showProducts();
  } catch (error) {
    console.error(error);
    alert("Gagal mengubah produk.");
  }
}

async function showReport() {
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

    content.innerHTML = `
      <h2>Laporan</h2>
      <p>Total transaksi: <strong>${count}</strong></p>
      <p>Omzet: <strong>Rp ${formatRupiah(omzet)}</strong></p>
      <p>Profit: <strong>Rp ${formatRupiah(profit)}</strong></p>
    `;
  } catch (error) {
    console.error(error);
    content.innerHTML = "<p>Gagal memuat laporan.</p>";
  }
}
