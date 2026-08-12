import { db, auth } from './firebase.js';
import {
 collection, addDoc, doc, getDoc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let products = [
 {id:"1",name:"Indomie",price:3000},
 {id:"2",name:"Aqua",price:5000},
 {id:"3",name:"Teh Botol",price:4000}
];

let cart = [];
let role="cashier";

onAuthStateChanged(auth, async user=>{
 if(!user) return location.href="index.html";

 const ref = doc(db,"users",user.uid);
 const snap = await getDoc(ref);

 if(!snap.exists()){
   await setDoc(ref,{email:user.email,role:"cashier"});
 }

 const data=(await getDoc(ref)).data();
 role=data.role;

 if(role==="admin"){
   document.getElementById("adminPanel").style.display="block";
 }

 renderProducts(products);
});

function renderProducts(list){
 const el=document.getElementById("product-list");
 el.innerHTML="";
 list.forEach(p=>{
  el.innerHTML+=`<div class="product" onclick="add('${p.id}')">
  <h4>${p.name}</h4><p>${p.price}</p></div>`;
 });
}

window.searchProduct=()=>{
 const key=search.value.toLowerCase();
 renderProducts(products.filter(p=>p.name.toLowerCase().includes(key)));
}

window.add=id=>{
 const item=products.find(p=>p.id===id);
 cart.push(item);
 renderCart();
}

function renderCart(){
 let total=0;
 cart-items.innerHTML="";
 cart.forEach(c=>{
  total+=c.price;
  cart-items.innerHTML+=`<p>${c.name}</p>`;
 });
 total.innerText=total;
}

window.bayar=async()=>{
 const totalVal=parseInt(total.innerText);
 await addDoc(collection(db,"transactions"),{
  total:totalVal,
  user:auth.currentUser.uid,
  date:new Date()
 });
 alert("Sukses");
 cart=[]; renderCart();
}

window.setRole=async(uid,newRole)=>{
 if(role!=="admin") return alert("Ditolak");
 await updateDoc(doc(db,"users",uid),{role:newRole});
 alert("Updated");
}

window.logout=()=>signOut(auth);
