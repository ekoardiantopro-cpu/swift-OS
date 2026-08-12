import { db, auth } from './firebase.js';
import { collection,onSnapshot,addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let products=[],cart=[],total=0;

onSnapshot(collection(db,"products"),snap=>{
 products=[];
 snap.forEach(d=>products.push({id:d.id,...d.data()}));
 render(products);
 loadChart();
});

function render(list){
 let el=document.getElementById("product-list");el.innerHTML="";
 list.forEach(p=>{
  el.innerHTML+=`<div class="product" onclick="add('${p.id}')">
  <img src="${p.image||''}">
  <h4>${p.name}</h4>
  <p>Rp ${p.price}</p>
  </div>`;
 });
}

window.searchProduct=()=>{
 let k=search.value.toLowerCase();
 render(products.filter(p=>p.name.toLowerCase().includes(k)));
}

window.add=id=>{
 let p=products.find(x=>x.id===id);
 let exist=cart.find(x=>x.id===id);
 if(exist) exist.qty++;
 else cart.push({...p,qty:1});
 draw();
}

function draw(){
 total=0;
 cart-items.innerHTML="";
 cart.forEach(c=>{
  total+=c.price*c.qty;
  cart-items.innerHTML+=`<p>${c.name} x${c.qty}</p>`;
 });
 document.getElementById("total").innerText=total;
}

window.applyDiscount=()=>{
 let d=parseInt(discount.value||0);
 let t=total-(total*d/100);
 document.getElementById("total").innerText=parseInt(t);
}

window.bayar=async()=>{
 await addDoc(collection(db,"transactions"),{items:cart,total:total});
 alert("Sukses");
 cart=[];draw();
}

window.exportExcel=()=>{
 let csv="Nama,Qty\n";
 cart.forEach(c=>csv+=`${c.name},${c.qty}\n`);
 let blob=new Blob([csv]);
 let a=document.createElement("a");
 a.href=URL.createObjectURL(blob);
 a.download="laporan.csv";
 a.click();
}

window.printStruk=()=>{
 window.print();
}

function loadChart(){
 let data={};
 products.forEach(p=>data[p.name]=p.stock);

 new Chart(document.getElementById("chart"),{
  type:'bar',
  data:{labels:Object.keys(data),datasets:[{data:Object.values(data)}]}
 });
}
