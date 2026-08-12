import { db } from './firebase.js';
import { collection,getDocs,addDoc,doc,deleteDoc,updateDoc,getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.showProducts=async()=>{
 let snap=await getDocs(collection(db,"products"));
 let html='<h2>Produk</h2><button onclick="form()">+Tambah</button>';
 snap.forEach(d=>{
  let p=d.data();
  html+=`<div>${p.name} - ${p.price}
  <button onclick="edit('${d.id}')">Edit</button>
  <button onclick="del('${d.id}')">Hapus</button></div>`;
 });
 content.innerHTML=html;
}

window.form=()=>{
 content.innerHTML=`
 <input id="name" placeholder="Nama">
 <input id="price" placeholder="Harga">
 <input id="stock" placeholder="Stok">
 <input id="cost" placeholder="Modal">
 <button onclick="save()">Simpan</button>`;
}

window.save=async()=>{
 await addDoc(collection(db,"products"),{
  name:name.value,
  price:+price.value,
  stock:+stock.value,
  cost:+cost.value
 });
 showProducts();
}

window.del=async(id)=>{
 await deleteDoc(doc(db,"products",id));
 showProducts();
}

window.edit=async(id)=>{
 let s=await getDoc(doc(db,"products",id));
 let p=s.data();
 content.innerHTML=`
 <input id="name" value="${p.name}">
 <input id="price" value="${p.price}">
 <input id="stock" value="${p.stock}">
 <input id="cost" value="${p.cost||0}">
 <button onclick="update('${id}')">Update</button>`;
}

window.update=async(id)=>{
 await updateDoc(doc(db,"products",id),{
  name:name.value,
  price:+price.value,
  stock:+stock.value,
  cost:+cost.value
 });
 showProducts();
}

window.showReport=async()=>{
 let snap=await getDocs(collection(db,"transactions"));
 let omzet=0,profit=0;
 snap.forEach(d=>{
  omzet+=d.data().total;
  profit+=d.data().profit;
 });
 content.innerHTML=`<h2>Laporan</h2>Omzet: ${omzet}<br>Profit: ${profit}`;
}

window.back=()=>location.href="dashboard.html";

showProducts();
