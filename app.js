var form = document.getElementById("form");
var descInput = document.getElementById("desc");
var amountInput = document.getElementById("amount");
var typeInput = document.getElementById("type");
var categoryInput = document.getElementById("category");
var dateInput = document.getElementById("date");
var submitBtn = document.getElementById("submitBtn");
var cancelBtn = document.getElementById("cancelBtn");
var listEl = document.getElementById("list");
var filterEl = document.getElementById("filter");
var statusEl = document.getElementById("form-status");

// Single source of truth
var transactions = [];
try {
  transactions = JSON.parse(localStorage.getItem("budget-transactions") || "[]");
} catch(e) { transactions = []; }
var editId = null;

dateInput.value = new Date().toISOString().slice(0,10);

function money(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function save() {
  localStorage.setItem("budget-transactions", JSON.stringify(transactions));
}
function showError(id, msg) {
  document.getElementById(id).textContent = msg;
}
function validate() {
  var ok = true;
  showError("desc-error", ""); showError("amount-error", ""); showError("category-error", "");
  if (!descInput.value.trim()) { showError("desc-error", "Enter a description."); ok = false; }
  var amt = Number(amountInput.value);
  if (!amountInput.value || isNaN(amt) || amt <= 0) { showError("amount-error", "Enter an amount more than 0."); ok = false; }
  if (!categoryInput.value) { showError("category-error", "Choose a category."); ok = false; }
  return ok;
}
function resetForm() {
  form.reset();
  dateInput.value = new Date().toISOString().slice(0,10);
  editId = null;
  submitBtn.textContent = "Add Transaction";
  cancelBtn.hidden = true;
}

form.addEventListener("submit", function(e) {
  e.preventDefault();
  if (!validate()) return;
  var data = {
    id: editId || Date.now().toString(),
    desc: descInput.value.trim(),
    amount: Math.round(Number(amountInput.value) * 100) / 100,
    type: typeInput.value,
    category: categoryInput.value,
    date: dateInput.value
  };
  if (editId) {
    var idx = transactions.findIndex(function(t){ return t.id === editId; });
    if (idx > -1) transactions[idx] = data;
    statusEl.textContent = "Transaction updated.";
  } else {
    transactions.unshift(data);
    statusEl.textContent = "Transaction added.";
  }
  save(); render(); resetForm();
});
cancelBtn.addEventListener("click", function(){ resetForm(); statusEl.textContent = "Edit cancelled."; });
filterEl.addEventListener("change", render);
document.getElementById("clearBtn").addEventListener("click", function(){
  if (!confirm("Delete all transactions?")) return;
  transactions = []; save(); render(); statusEl.textContent = "All transactions cleared.";
});

function render() {
  // Totals
  var income = 0, expense = 0;
  transactions.forEach(function(t){ if (t.type === "income") income += t.amount; else expense += t.amount; });
  document.getElementById("totalIncome").textContent = money(income);
  document.getElementById("totalExpense").textContent = money(expense);
  document.getElementById("balance").textContent = money(income - expense);

  // List
  var filter = filterEl.value;
  var shown = transactions.filter(function(t){ return filter === "all" || t.type === filter; });
  listEl.innerHTML = "";
  document.getElementById("list-empty").hidden = shown.length > 0;
  shown.forEach(function(t){
    var li = document.createElement("li");
    var left = document.createElement("div");
    var sign = t.type === "income" ? "+ " : "- ";
    var label = document.createElement("strong");
    label.textContent = t.desc + " - " + t.category;
    var meta = document.createElement("div");
    meta.textContent = t.date + " - " + (t.type === "income" ? "Income" : "Expense");
    left.append(label, meta);
    var right = document.createElement("div");
    var amt = document.createElement("span");
    amt.className = "badge " + (t.type === "income" ? "income-text" : "expense-text");
    amt.textContent = sign + money(t.amount);
    var editBtn = document.createElement("button");
    editBtn.type = "button"; editBtn.textContent = "Edit";
    editBtn.addEventListener("click", function(){
      editId = t.id;
      descInput.value = t.desc; amountInput.value = t.amount;
      typeInput.value = t.type; categoryInput.value = t.category; dateInput.value = t.date;
      submitBtn.textContent = "Save Changes"; cancelBtn.hidden = false;
      descInput.focus();
    });
    var delBtn = document.createElement("button");
    delBtn.type = "button"; delBtn.textContent = "Delete";
    delBtn.addEventListener("click", function(){
      transactions = transactions.filter(function(x){ return x.id !== t.id; });
      save(); render(); statusEl.textContent = "Transaction deleted.";
    });
    var btnWrap = document.createElement("span");
    btnWrap.className = "item-btns";
    btnWrap.append(editBtn, delBtn);
    right.append(amt, btnWrap);
    li.append(left, right);
    listEl.append(li);
  });

  // Chart - spending by category
  var byCat = {};
  transactions.forEach(function(t){ if (t.type === "expense") byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  var chart = document.getElementById("chart");
  chart.innerHTML = "";
  var cats = Object.keys(byCat);
  document.getElementById("chart-empty").hidden = cats.length > 0;
  var max = 0;
  cats.forEach(function(c){ if (byCat[c] > max) max = byCat[c]; });
  var summary = cats.length ? cats.map(function(c){ return c + ": " + money(byCat[c]); }).join(", ") : "No expenses yet.";
  document.getElementById("chart-summary").textContent = "Spending by category: " + summary;
  cats.forEach(function(c){
    var wrap = document.createElement("div"); wrap.className = "bar-wrap";
    var val = document.createElement("span"); val.className = "bar-value"; val.textContent = money(byCat[c]);
    var bar = document.createElement("div"); bar.className = "bar"; bar.style.height = Math.max(8, (byCat[c] / max) * 140) + "px";
    bar.title = c + ": " + money(byCat[c]);
    var lab = document.createElement("span"); lab.className = "bar-label"; lab.textContent = c;
    wrap.append(val, bar, lab); chart.append(wrap);
  });
}
render();