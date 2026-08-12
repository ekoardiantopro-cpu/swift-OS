SWIFT-OS FINAL SETUP

1. Copy these files into the root of your existing swift-OS repository:
   firebase.js
   index.html
   dashboard.html
   app.js
   admin.html
   admin.js
   firestore.rules

2. IMPORTANT:
   Keep your existing assets/ folder and your existing style.css.
   This ZIP does not replace style.css.

3. Firebase Authentication:
   Create users in Firebase Authentication.

4. Firestore:
   Create collection:
     users
       DOCUMENT ID = the exact Firebase Authentication UID
       role = "admin"
   or:
       role = "cashier"

5. Login behavior:
   role=admin   -> admin.html
   role=cashier -> dashboard.html

6. Logout:
   Both admin and cashier use Firebase signOut(auth), then return to index.html.

7. Security:
   cashier cannot open admin.html successfully; admin.html checks the role again.
