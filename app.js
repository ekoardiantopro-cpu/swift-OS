import { db, auth } from './firebase.js';
import { collection,onSnapshot,addDoc,doc,getDoc,updateDoc,getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let products=[],cart=[],total=0;

onSnapshot(collection(db,"products"),snap=>{
 products=[];
 snap.forEach(d=>products.push({id:d.id,...d.data()}));
 render(products);
});

function render(list){
 product-list.innerHTML="";
 list.forEach(p=>{
  product-list.innerHTML+=`
  <div class="product" onclick="add('${p.id}')">
    <h4>${p.name}</h4>
    <p>Rp ${p.price}</p>
    <small>${p.stock}</small>
  </div>`;
 });
}

window.add=id=>{
 let p=products.find(x=>x.id===id);
 if(p.stock<=0)return alert("Stok habis");
 let e=cart.find(x=>x.id===id);
 if(e){if(e.qty>=p.stock)return alert("Stok kurang");e.qty++;}
 else cart.push({...p,qty:1});
 draw();
}

function draw(){
 total=0;cart-items.innerHTML="";
 cart.forEach(c=>{
  total+=c.price*c.qty;
  cart-items.innerHTML+=`<p>${c.name} x${c.qty}</p>`;
 });
 document.getElementById("total").innerText=total;
}

window.bayar=async()=>{
 let profit=0;
 for(let i of cart){
  let ref=doc(db,"products",i.id);
  let snap=await getDoc(ref);
  let d=snap.data();
  if(d.stock<i.qty)return alert("Stok berubah");
  await updateDoc(ref,{stock:d.stock-i.qty});
  profit+=(i.price-(d.cost||0))*i.qty;
 }
 await addDoc(collection(db,"transactions"),{items:cart,total,profit,date:new Date()});
 alert("Transaksi sukses");
 cart=[];draw();
}

window.loadReport=async()=>{
 let snap=await getDocs(collection(db,"transactions"));
 let omzet=0,profit=0;
 snap.forEach(d=>{
  omzet+=d.data().total;
  profit+=d.data().profit;
 });
 report.innerHTML=`Omzet: ${omzet} | Profit: ${profit}`;
}

window.logout=()=>{signOut(auth);location.href="index.html";}
