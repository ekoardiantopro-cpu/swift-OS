import { db, auth } from './firebase.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let products = [];
let cart = [];

async function loadProducts(){
  const res = await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1v/pub?output=csv");
  const text = await res.text();
  const rows = text.split("\n").slice(1);

  products = rows.map(r=>{
    const [id,name,price,stock,barcode]=r.split(",");
    return {id,name,price:+price,stock:+stock,barcode};
  });

  renderProducts(products);
}

function renderProducts(list){
  const el = document.getElementById("product-list");
  el.innerHTML="";
  list.forEach(p=>{
    el.innerHTML+=`
    <div class="product" onclick="addToCart('${p.id}')">
      <h4>${p.name}</h4>
      <p>Rp ${p.price}</p>
    </div>`;
  });
}

window.searchProduct=()=>{
  const key=document.getElementById("search").value.toLowerCase();
  renderProducts(products.filter(p=>p.name.toLowerCase().includes(key)));
}

window.addToCart=id=>{
  const item=products.find(p=>p.id===id);
  cart.push({...item,qty:1});
  renderCart();
}

function renderCart(){
  let total=0;
  const el=document.getElementById("cart-items");
  el.innerHTML="";
  cart.forEach(c=>{
    total+=c.price;
    el.innerHTML+=`<p>${c.name}</p>`;
  });
  document.getElementById("total").innerText=total;
}

window.bayar=async()=>{
  const totalVal=parseInt(document.getElementById("total").innerText);
  const bayarVal=parseInt(document.getElementById("bayar").value);

  if(bayarVal<totalVal) return alert("Uang kurang");

  await addDoc(collection(db,"transactions"),{
    items:cart,total:totalVal,date:new Date()
  });

  alert("Transaksi berhasil");
  cart=[];
  renderCart();
}

window.exportExcel=async()=>{
  const snap=await getDocs(collection(db,"transactions"));
  let data=[];
  snap.forEach(d=>data.push(d.data()));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, "laporan.xlsx");
}

window.logout=()=>{
  signOut(auth);
  location.href="index.html";
}

loadProducts();
