import { db, auth } from './firebase.js';
import {
 collection, addDoc, doc, getDoc, setDoc, updateDoc, increment, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let products=[];
let cart=[];

onAuthStateChanged(auth, async user=>{
 if(!user) return location.href="index.html";

 const ref=doc(db,"users",user.uid);
 const snap=await getDoc(ref);

 if(!snap.exists()){
  await setDoc(ref,{email:user.email,role:"cashier"});
 }

 loadProductsRealtime();
});

function loadProductsRealtime(){
 onSnapshot(collection(db,"products"), (snapshot)=>{
  products=[];
  snapshot.forEach(doc=>{
    products.push({id:doc.id,...doc.data()});
  });
  renderProducts(products);
 });
}

function renderProducts(list){
 const el=document.getElementById("product-list");
 el.innerHTML="";
 list.forEach(p=>{
  el.innerHTML+=`<div class="product" onclick="add('${p.id}')">
    <h4>${p.name}</h4>
    <p>Rp ${p.price}</p>
  </div>`;
 });
}

window.searchProduct=()=>{
 const key=search.value.toLowerCase();
 renderProducts(products.filter(p=>p.name.toLowerCase().includes(key)));
}

window.add=id=>{
 const item=products.find(p=>p.id===id);
 cart.push({...item});
 renderCart();
}

function renderCart(){
 let total=0;
 document.getElementById("cart-items").innerHTML="";
 cart.forEach(c=>{
  total+=c.price;
  document.getElementById("cart-items").innerHTML+=`<p>${c.name}</p>`;
 });
 document.getElementById("total").innerText=total;
}

window.bayar=async()=>{
 let total=parseInt(document.getElementById("total").innerText);

 await addDoc(collection(db,"transactions"),{
  items:cart,total,user:auth.currentUser.uid,date:new Date()
 });

 for(let item of cart){
  await updateDoc(doc(db,"products",item.id),{
    stock:increment(-1)
  });
 }

 printStruk(total);
 cart=[];renderCart();
}

function printStruk(total){
 let w=window.open("");
 w.document.write("<h3>SwiftOS</h3><p>Total:"+total+"</p>");
 w.print();
}

window.startScanner=()=>{
 Quagga.init({
  inputStream:{type:"LiveStream",target:document.body},
  decoder:{readers:["code_128_reader","ean_reader"]}
 },()=>Quagga.start());

 Quagga.onDetected(res=>{
  let code=res.codeResult.code;
  let p=products.find(x=>x.barcode===code);
  if(p) add(p.id);
 });
}

window.logout=()=>signOut(auth);
