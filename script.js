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
const db = getDatabase(app);

// DOM elements
const drugForm = document.getElementById("drug-form");
const drugTableBody = document.querySelector("#drug-table tbody");
const inventoryDisplay = document.getElementById("inventory");
const importedList = document.getElementById("imported-list");
const searchInput = document.getElementById("search-input");
const printButton = document.getElementById("print-button");
const restoreButton = document.getElementById("restore-button");
const sortSelect = document.getElementById("sort-select");
let totalInventory = 0;
let lastDeletedDrug = null;

// Function to check if the drug is expired
function isExpired(expiryDate) {
  const currentDate = new Date();
  return new Date(expiryDate) < currentDate;
}

// Update inventory display
function updateInventoryDisplay() {
  inventoryDisplay.textContent = `Total Inventory: ${totalInventory} units`;
}

// Add drug to the table
function addDrugToTable(id, drug) {
  const newRow = document.createElement("tr");
  newRow.classList.add("fade-in");

  // Check if the drug is expired
  if (isExpired(drug.expiry)) {
    newRow.classList.add("expired");
    drug.quantity = 0; // Don't add expired drugs to total inventory
  }

  newRow.innerHTML = `
        <td>${drug.name}</td>
        <td>${drug.type}</td>
        <td>${drug.quantity}</td>
        <td>${drug.expiry}</td>
        <td><button class="delete-button" data-id="${id}">Delete</button></td>
    `;

  drugTableBody.appendChild(newRow);
  addToImportedList(drug);
}

// Add drug to the imported list
function addToImportedList(drug) {
  const listItem = document.createElement("li");
  listItem.textContent = `${drug.name} - ${drug.type} (Quantity: ${drug.quantity}, Expiry: ${drug.expiry})`;
  importedList.appendChild(listItem);
}

// Sort drugs
function sortDrugs() {
  const rows = Array.from(drugTableBody.querySelectorAll("tr"));
  const sortBy = sortSelect.value;

  rows.sort((a, b) => {
    const aText = a.children[sortBy === "quantity" ? 2 : 0].textContent;
    const bText = b.children[sortBy === "quantity" ? 2 : 0].textContent;
    return sortBy === "quantity"
      ? parseInt(aText) - parseInt(bText)
      : aText.localeCompare(bText);
  });

  rows.forEach((row) => drugTableBody.appendChild(row));
}

// Listen for real-time updates and add drugs to the table
const drugsRef = ref(db, "drugs");
onValue(drugsRef, (snapshot) => {
  drugTableBody.innerHTML = ""; // Clear the table body
  importedList.innerHTML = ""; // Clear the imported list
  totalInventory = 0; // Reset total inventory

  snapshot.forEach((childSnapshot) => {
    const drug = childSnapshot.val();
    addDrugToTable(childSnapshot.key, drug);

    // Only add to total inventory if it's not expired
    if (!isExpired(drug.expiry)) {
      totalInventory += drug.quantity;
    }
  });

  // Update inventory display
  updateInventoryDisplay();
  sortDrugs(); // Sort the drugs after loading
});

// Add new drug to Realtime Database
drugForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const drugName = document.getElementById("name").value;
  const drugType = document.getElementById("type").value;
  const drugQuantity = parseInt(document.getElementById("quantity").value);
  const drugExpiry = document.getElementById("expiry").value;

  if (isExpired(drugExpiry)) {
    alert("This drug is expired and cannot be added.");
    return;
  }

  onValue(
    ref(db, "drugs"),
    (snapshot) => {
      let drugExists = false;

      snapshot.forEach((childSnapshot) => {
        const drug = childSnapshot.val();
        if (drug.name === drugName && drug.type === drugType) {
          drugExists = true;
          const newQuantity = drug.quantity + drugQuantity;
          set(ref(db, `drugs/${childSnapshot.key}`), {
            ...drug,
            quantity: newQuantity,
          }).then(() => {
            totalInventory += drugQuantity;
            updateInventoryDisplay();
            drugForm.reset();
          });
        }
      });

      if (!drugExists) {
        const newDrugRef = push(ref(db, "drugs"));
        set(newDrugRef, {
          name: drugName,
          type: drugType,
          quantity: drugQuantity,
          expiry: drugExpiry,
        }).then(() => {
          totalInventory += drugQuantity;
          updateInventoryDisplay();
          drugForm.reset();
        });
      }
    },
    { onlyOnce: true }
  );
});

// Delete drug from Realtime Database
drugTableBody.addEventListener("click", function (e) {
  if (e.target.classList.contains("delete-button")) {
    const id = e.target.getAttribute("data-id");
    deleteDrug(id, e.target);
  }
});

// Delete function
function deleteDrug(id, button) {
  const drugRef = ref(db, `drugs/${id}`);
  onValue(drugRef, (snapshot) => {
    lastDeletedDrug = snapshot.val(); // Store last deleted drug
  });
  remove(drugRef).then(() => {
    const row = button.closest("tr");
    row.classList.add("fade-out");
    row.addEventListener("animationend", () => {
      row.remove();
    });

    // Adjust total inventory
    if (lastDeletedDrug && !isExpired(lastDeletedDrug.expiry)) {
      totalInventory -= lastDeletedDrug.quantity;
      updateInventoryDisplay();
    }
  });
}

// Restore last deleted drug
restoreButton.addEventListener("click", () => {
  if (lastDeletedDrug) {
    const newDrugRef = push(ref(db, "drugs"));
    set(newDrugRef, lastDeletedDrug).then(() => {
      if (!isExpired(lastDeletedDrug.expiry)) {
        totalInventory += lastDeletedDrug.quantity;
      }
      updateInventoryDisplay();
      addDrugToTable(newDrugRef.key, lastDeletedDrug);
      lastDeletedDrug = null; // Clear last deleted
    });
  } else {
    alert("No drug to restore!");
  }
});

// Print Receipt functionality
printButton.addEventListener("click", () => {
  const printContent = document.getElementById("drug-table").outerHTML;
  const printWindow = window.open("", "", "width=600,height=400");
  printWindow.document.write(`
        <html>
            <head>
                <title>Receipt</title>
                <style>
                    body { font-family: Arial; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; }
                    th { background-color: #4caf50; color: white; }
                </style>
            </head>
            <body>
                <h2>Drug Inventory Receipt</h2>
                <p>${inventoryDisplay.textContent}</p>
                ${printContent}
            </body>
        </html>
    `);
  printWindow.document.close();
  printWindow.print();
});

// Search functionality
searchInput.addEventListener("input", function () {
  const searchTerm = searchInput.value.toLowerCase();
  const drugRows = drugTableBody.querySelectorAll("tr");

  drugRows.forEach((row) => {
    const name = row.children[0].textContent.toLowerCase();
    const type = row.children[1].textContent.toLowerCase();
    if (name.includes(searchTerm) || type.includes(searchTerm)) {
      row.style.display = ""; // Show matching row
    } else {
      row.style.display = "none"; // Hide non-matching row
    }
  });
});

// Sort feature
sortSelect.addEventListener("change", function () {
  sortDrugs();
});

// Adjust the table display if many drugs are present
function adjustTableDisplay() {
  const rows = drugTableBody.querySelectorAll("tr");
  if (rows.length > 10) {
    document.getElementById("table-container").style.overflowY = "scroll";
    document.getElementById("table-container").style.maxHeight = "300px";
  } else {
    document.getElementById("table-container").style.overflowY = "hidden";
    document.getElementById("table-container").style.maxHeight = "none";
  }
}

// Call adjustTableDisplay after each update
onValue(drugsRef, adjustTableDisplay);
