import { db, auth } from './firebase.js';
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

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists() || snap.data().role !== "admin") {
      alert("Halaman ini hanya untuk admin.");
      location.href = "dashboard.html";
      return;
    }

    showProducts();
  } catch (error) {
    console.error(error);
    alert("Gagal memverifikasi akses admin.");
    location.href = "dashboard.html";
  }
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRupiah(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

window.showProducts = async () => {
  try {
    const snap = await getDocs(collection(db, "products"));

    let html = `
      <h2>Produk</h2>
      <button onclick="form()">+ Tambah Produk</button>
      <div class="admin-products">
    `;

    snap.forEach((d) => {
      const p = d.data();

      html += `
        <div class="admin-product">
          <strong>${escapeHtml(p.name)}</strong>
          <div>Harga: Rp ${formatRupiah(p.price)}</div>
          <div>Stok: ${Number(p.stock || 0)}</div>
          <div>Modal: Rp ${formatRupiah(p.cost)}</div>
          <button onclick="edit('${d.id}')">Edit</button>
          <button onclick="del('${d.id}')">Hapus</button>
        </div>`;
    });

    html += "</div>";
    content.innerHTML = html;
  } catch (error) {
    console.error(error);
    content.innerHTML = "<p>Gagal memuat produk.</p>";
  }
};

window.form = () => {
  content.innerHTML = `
    <h2>Tambah Produk</h2>

    <input id="name" placeholder="Nama">
    <input id="price" type="number" min="0" placeholder="Harga">
    <input id="stock" type="number" min="0" placeholder="Stok">
    <input id="cost" type="number" min="0" placeholder="Modal">

    <button onclick="save()">Simpan</button>
    <button onclick="showProducts()">Batal</button>
  `;
};

window.save = async () => {
  try {
    const name = document.getElementById("name").value.trim();
    const price = Number(document.getElementById("price").value);
    const stock = Number(document.getElementById("stock").value);
    const cost = Number(document.getElementById("cost").value);

    if (!name) return alert("Nama produk wajib diisi.");
    if (price < 0 || stock < 0 || cost < 0) {
      return alert("Nilai produk tidak boleh negatif.");
    }

    await addDoc(collection(db, "products"), {
      name,
      price,
      stock,
      cost
    });

    showProducts();
  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan produk.");
  }
};

window.del = async (id) => {
  if (!confirm("Hapus produk ini?")) return;

  try {
    await deleteDoc(doc(db, "products", id));
    showProducts();
  } catch (error) {
    console.error(error);
    alert("Gagal menghapus produk.");
  }
};

window.edit = async (id) => {
  try {
    const snap = await getDoc(doc(db, "products", id));

    if (!snap.exists()) {
      return alert("Produk tidak ditemukan.");
    }

    const p = snap.data();

    content.innerHTML = `
      <h2>Edit Produk</h2>

      <input id="name" value="${escapeHtml(p.name)}">
      <input id="price" type="number" min="0" value="${Number(p.price || 0)}">
      <input id="stock" type="number" min="0" value="${Number(p.stock || 0)}">
      <input id="cost" type="number" min="0" value="${Number(p.cost || 0)}">

      <button onclick="update('${id}')">Update</button>
      <button onclick="showProducts()">Batal</button>
    `;
  } catch (error) {
    console.error(error);
    alert("Gagal membuka produk.");
  }
};

window.update = async (id) => {
  try {
    const name = document.getElementById("name").value.trim();
    const price = Number(document.getElementById("price").value);
    const stock = Number(document.getElementById("stock").value);
    const cost = Number(document.getElementById("cost").value);

    if (!name) return alert("Nama produk wajib diisi.");
    if (price < 0 || stock < 0 || cost < 0) {
      return alert("Nilai produk tidak boleh negatif.");
    }

    await updateDoc(doc(db, "products", id), {
      name,
      price,
      stock,
      cost
    });

    showProducts();
  } catch (error) {
    console.error(error);
    alert("Gagal mengubah produk.");
  }
};

window.showReport = async () => {
  try {
    const snap = await getDocs(collection(db, "transactions"));

    let omzet = 0;
    let profit = 0;
    let jumlah = 0;

    snap.forEach((d) => {
      const data = d.data();
      omzet += Number(data.total || 0);
      profit += Number(data.profit || 0);
      jumlah++;
    });

    content.innerHTML = `
      <h2>Laporan</h2>
      <p>Total transaksi: <strong>${jumlah}</strong></p>
      <p>Omzet: <strong>Rp ${formatRupiah(omzet)}</strong></p>
      <p>Profit: <strong>Rp ${formatRupiah(profit)}</strong></p>
    `;
  } catch (error) {
    console.error(error);
    content.innerHTML = "<p>Gagal memuat laporan.</p>";
  }
};

window.back = () => {
  location.href = "dashboard.html";
};

window.logout = async () => {
  await signOut(auth);
  location.href = "index.html";
};
