// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "IzaSyC_OV9rMI-E0EcI5JxF9KAOFeXoX4rzjVo",
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
let lastDeletedDrugId = null; // Store deleted drug's ID

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

  // Skip inactive drugs
  if (!drug.is_active) return;

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

// Fetch and display the drug list (This refreshes UI)
function fetchAndDisplayDrugs() {
  onValue(ref(db, "drugs"), (snapshot) => {
    drugTableBody.innerHTML = ""; // Clear the table body
    importedList.innerHTML = ""; // Clear the imported list
    totalInventory = 0; // Reset total inventory

    snapshot.forEach((childSnapshot) => {
      const drug = childSnapshot.val();
      addDrugToTable(childSnapshot.key, drug);

      // Only add to total inventory if it's not expired and active
      if (!isExpired(drug.expiry) && drug.is_active) {
        totalInventory += drug.quantity;
      }
    });

    // Update inventory display
    updateInventoryDisplay();
    sortDrugs(); // Sort the drugs after loading
  });
}

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
          update(ref(db, `drugs/${childSnapshot.key}`), {
            ...drug,
            quantity: newQuantity,
            is_active: true, // Reactivate the drug if it was inactive
          }).then(() => {
            totalInventory += drugQuantity;
            updateInventoryDisplay();
            drugForm.reset();
            fetchAndDisplayDrugs(); // Refresh UI after adding a drug
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
          is_active: true, // Mark as active by default
        }).then(() => {
          totalInventory += drugQuantity;
          updateInventoryDisplay();
          drugForm.reset();
          fetchAndDisplayDrugs(); // Refresh UI after adding a drug
        });
      }
    },
    { onlyOnce: true }
  );
});

// Delete drug from Realtime Database (Soft Delete)
drugTableBody.addEventListener("click", function (e) {
  if (e.target.classList.contains("delete-button")) {
    const id = e.target.getAttribute("data-id");
    deleteDrug(id, e.target);
  }
});

// Soft Delete function (Mark drug as inactive)
function deleteDrug(id, button) {
  const drugRef = ref(db, `drugs/${id}`);
  onValue(drugRef, (snapshot) => {
    lastDeletedDrug = snapshot.val(); // Store last deleted drug
    lastDeletedDrugId = id; // Store drug's ID
  });

  update(drugRef, { is_active: false }).then(() => {
    const row = button.closest("tr");
    row.classList.add("fade-out");
    row.addEventListener("animationend", () => {
      row.remove();
      fetchAndDisplayDrugs(); // Refresh UI after deletion
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
  if (lastDeletedDrug && lastDeletedDrugId) {
    const drugRef = ref(db, `drugs/${lastDeletedDrugId}`);
    update(drugRef, { is_active: true }).then(() => {
      if (!isExpired(lastDeletedDrug.expiry)) {
        totalInventory += lastDeletedDrug.quantity;
        updateInventoryDisplay();
      }
      lastDeletedDrug = null; // Clear last deleted
      lastDeletedDrugId = null; // Clear last deleted ID
      fetchAndDisplayDrugs(); // Refresh UI after restore
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
            <body>${printContent}</body>
        </html>
    `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
});

// Search functionality
searchInput.addEventListener("input", function () {
  const query = searchInput.value.toLowerCase();
  const rows = drugTableBody.querySelectorAll("tr");
  rows.forEach((row) => {
    const drugName = row.cells[0].textContent.toLowerCase();
    const drugType = row.cells[1].textContent.toLowerCase();
    if (drugName.includes(query) || drugType.includes(query)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
});

// Sort functionality
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
onValue(ref(db, "drugs"), adjustTableDisplay);

// Fetch and display drugs on page load
fetchAndDisplayDrugs();
