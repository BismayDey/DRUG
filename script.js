// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_OV9rMI-E0EcI5JxF9KAOFeXoX4rzjVo",
  authDomain: "drug-bf6b3.firebaseapp.com",
  databaseURL: "https://drug-bf6b3-default-rtdb.firebaseio.com/",
  projectId: "drug-bf6b3",
  storageBucket: "drug-bf6b3.appspot.com",
  messagingSenderId: "597780423769",
  appId: "1:597780423769:web:fa4f2d466ffd4c454efd48",
  measurementId: "G-0M5506DFW2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app); // Initialize the Realtime Database

// DOM elements
const drugForm = document.getElementById("drug-form");
const drugTableBody = document.querySelector("#drug-table tbody");
const inventoryDisplay = document.getElementById("inventory"); // Display total inventory
const importedList = document.getElementById("imported-list"); // List of imported drugs

let totalInventory = 0; // Track total inventory

// Add new drug to Realtime Database
drugForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const drug = {
    name: document.getElementById("name").value,
    type: document.getElementById("type").value,
    quantity: parseInt(document.getElementById("quantity").value),
    expiry: document.getElementById("expiry").value,
  };

  const newDrugRef = push(ref(db, "drugs"));
  set(newDrugRef, drug)
    .then(() => {
      console.log("Drug added successfully");
      drugForm.reset();
    })
    .catch((error) => {
      console.error("Error adding drug:", error);
    });
});

// Listen for real-time updates and add drugs to the table
const drugsRef = ref(db, "drugs");
onValue(drugsRef, (snapshot) => {
  drugTableBody.innerHTML = ""; // Clear the table body
  importedList.innerHTML = ""; // Clear imported drugs list
  totalInventory = 0; // Reset total inventory

  snapshot.forEach((childSnapshot) => {
    const drug = childSnapshot.val();
    const drugId = childSnapshot.key;
    totalInventory += drug.quantity; // Update total inventory
    addDrugToTable(drugId, drug);
    addDrugToList(drug); // Add drug to imported list
  });

  // Update inventory display
  inventoryDisplay.textContent = `Total Inventory: ${totalInventory} units`;
});

// Add drug to the table with a fade-in effect
function addDrugToTable(id, drug) {
  const newRow = document.createElement("tr");
  newRow.classList.add("fade-in");

  // Highlight drugs with low stock
  const lowStockClass = drug.quantity < 5 ? "low-stock" : "";

  newRow.innerHTML = `
        <td>${drug.name}</td>
        <td>${drug.type}</td>
        <td class="${lowStockClass}">${drug.quantity}</td>
        <td>${drug.expiry}</td>
        <td><button onclick="deleteDrug('${id}')">Delete</button></td>
    `;

  drugTableBody.appendChild(newRow);
}

// Add drug to the imported list (summary display)
function addDrugToList(drug) {
  const newListItem = document.createElement("li");
  newListItem.textContent = `${drug.name} (${drug.type}) - ${drug.quantity} units`;
  importedList.appendChild(newListItem);
}

// Delete drug from Realtime Database
function deleteDrug(id) {
  const drugRef = ref(db, `drugs/${id}`);
  remove(drugRef)
    .then(() => {
      console.log("Drug removed successfully");
    })
    .catch((error) => {
      console.error("Error removing drug:", error);
    });
}
