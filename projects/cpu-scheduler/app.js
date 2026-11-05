// CPU Scheduling Simulator: FCFS, SJF (non-preemptive), Priority (non-preemptive), Round Robin
var COLORS = ["#e2550e", "#1c1f24", "#2f6fb0", "#2e8b57", "#8a4fbf", "#b8860b", "#c2185b", "#00838f"];
var NOTES = {
  FCFS: "First-Come, First-Served: processes run in the order they arrive.",
  SJF: "Shortest Job First (non-preemptive): among arrived processes, the shortest burst runs next.",
  PRIORITY: "Priority (non-preemptive): among arrived processes, the lowest priority number runs next.",
  RR: "Round Robin: each process runs for at most one time quantum, then goes to the back of the queue."
};
var SAMPLE = [
  { arrival: 0, burst: 5, priority: 3 },
  { arrival: 1, burst: 3, priority: 1 },
  { arrival: 2, burst: 8, priority: 4 },
  { arrival: 3, burst: 6, priority: 2 }
];

var procs = SAMPLE.map(function (p) { return Object.assign({}, p); });
var algo = "FCFS";

function name(i) { return "P" + (i + 1); }

// ---- Algorithms: each returns a timeline of { p: index or -1 for idle, start, end } ----
function nonPreemptive(list, pickFn) {
  var done = [], time = 0, timeline = [];
  while (done.length < list.length) {
    var ready = list.map(function (p, i) { return i; })
      .filter(function (i) { return done.indexOf(i) === -1 && list[i].arrival <= time; });
    if (!ready.length) {
      var next = Math.min.apply(null, list.map(function (p, i) { return done.indexOf(i) === -1 ? p.arrival : Infinity; }));
      timeline.push({ p: -1, start: time, end: next });
      time = next;
      continue;
    }
    var i = ready.reduce(pickFn);
    timeline.push({ p: i, start: time, end: time + list[i].burst });
    time += list[i].burst;
    done.push(i);
  }
  return timeline;
}

function byArrival(a, b) { return procs[a].arrival < procs[b].arrival || (procs[a].arrival === procs[b].arrival && a < b) ? a : b; }
function tieBreak(a, b, va, vb) { return va < vb ? a : vb < va ? b : byArrival(a, b); }

var ALGOS = {
  FCFS: function (list) { return nonPreemptive(list, byArrival); },
  SJF: function (list) { return nonPreemptive(list, function (a, b) { return tieBreak(a, b, list[a].burst, list[b].burst); }); },
  PRIORITY: function (list) { return nonPreemptive(list, function (a, b) { return tieBreak(a, b, list[a].priority, list[b].priority); }); },
  RR: function (list, q) {
    var order = list.map(function (p, i) { return i; }).sort(function (a, b) { return list[a].arrival - list[b].arrival || a - b; });
    var remaining = list.map(function (p) { return p.burst; });
    var queue = [], timeline = [], time = 0, k = 0;
    function admit() { while (k < order.length && list[order[k]].arrival <= time) queue.push(order[k++]); }
    admit();
    while (queue.length || k < order.length) {
      if (!queue.length) {
        timeline.push({ p: -1, start: time, end: list[order[k]].arrival });
        time = list[order[k]].arrival; admit(); continue;
      }
      var i = queue.shift();
      var run = Math.min(q, remaining[i]);
      var last = timeline[timeline.length - 1];
      if (last && last.p === i && last.end === time) last.end += run; // merge back-to-back slices
      else timeline.push({ p: i, start: time, end: time + run });
      time += run;
      remaining[i] -= run;
      admit(); // new arrivals join before the preempted process
      if (remaining[i] > 0) queue.push(i);
    }
    return timeline;
  }
};

function stats(list, timeline) {
  var completion = list.map(function () { return 0; });
  timeline.forEach(function (s) { if (s.p >= 0) completion[s.p] = Math.max(completion[s.p], s.end); });
  var rows = list.map(function (p, i) {
    var tat = completion[i] - p.arrival;
    return { completion: completion[i], tat: tat, wait: tat - p.burst };
  });
  var avg = function (key) { return rows.reduce(function (s, r) { return s + r[key]; }, 0) / rows.length; };
  return { rows: rows, avgWait: avg("wait"), avgTat: avg("tat") };
}

function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(2); }

// ---- Rendering ----
function renderRows() {
  document.getElementById("rows").innerHTML = procs.map(function (p, i) {
    return "<tr><td class=\"pid\" style=\"color:" + COLORS[i % COLORS.length] + "\">" + name(i) + "</td>" +
      ["arrival", "burst", "priority"].map(function (f) {
        return '<td><input type="number" min="' + (f === "burst" ? 1 : 0) + '" data-i="' + i + '" data-f="' + f + '" value="' + p[f] + '" aria-label="' + name(i) + " " + f + '"></td>';
      }).join("") +
      '<td><button type="button" class="remove" data-rm="' + i + '" aria-label="Remove ' + name(i) + '">Remove</button></td></tr>';
  }).join("");
}

function valid() {
  if (!procs.length) return "Add at least one process.";
  for (var i = 0; i < procs.length; i++) {
    var p = procs[i];
    if (!Number.isInteger(p.arrival) || p.arrival < 0) return name(i) + ": arrival time must be a whole number 0 or higher.";
    if (!Number.isInteger(p.burst) || p.burst < 1) return name(i) + ": burst time must be a whole number 1 or higher.";
    if (!Number.isInteger(p.priority) || p.priority < 0) return name(i) + ": priority must be a whole number 0 or higher.";
  }
  var q = Number(document.getElementById("quantum").value);
  if (algo === "RR" && (!Number.isInteger(q) || q < 1)) return "The time quantum must be a whole number 1 or higher.";
  return "";
}

function run() {
  document.getElementById("algo-note").textContent = NOTES[algo];
  document.getElementById("quantum-wrap").hidden = algo !== "RR";
  var err = valid();
  document.getElementById("error").textContent = err;
  if (err) return;

  var q = Number(document.getElementById("quantum").value);
  var timeline = ALGOS[algo](procs, q);
  var total = timeline[timeline.length - 1].end;
  var unit = Math.max(26, Math.min(60, 760 / total));

  document.getElementById("gantt").innerHTML = timeline.map(function (s, idx) {
    var w = (s.end - s.start) * unit;
    var bg = s.p >= 0 ? ' style="width:' + w + "px;background:" + COLORS[s.p % COLORS.length] + '"' : ' style="width:' + w + 'px"';
    return '<div class="slot' + (s.p < 0 ? " idle" : "") + '"' + bg + ">" + (s.p >= 0 ? name(s.p) : "idle") +
      '<span class="tick">' + s.start + "</span>" + (idx === timeline.length - 1 ? '<span class="tick end">' + s.end + "</span>" : "") + "</div>";
  }).join("");

  var st = stats(procs, timeline);
  document.getElementById("results").innerHTML = st.rows.map(function (r, i) {
    return "<tr><td class=\"pid\">" + name(i) + "</td><td>" + r.completion + "</td><td>" + r.tat + "</td><td>" + r.wait + "</td></tr>";
  }).join("");
  document.getElementById("avg-wait").textContent = fmt(st.avgWait);
  document.getElementById("avg-tat").textContent = fmt(st.avgTat);

  // Compare every algorithm on the same input
  var results = Object.keys(ALGOS).map(function (k) { return { k: k, w: stats(procs, ALGOS[k](procs, q)).avgWait }; });
  var max = Math.max.apply(null, results.map(function (r) { return r.w; })) || 1;
  var best = Math.min.apply(null, results.map(function (r) { return r.w; }));
  var labels = { FCFS: "FCFS", SJF: "SJF", PRIORITY: "Priority", RR: "Round Robin (q=" + q + ")" };
  document.getElementById("compare").innerHTML = results.map(function (r) {
    return '<div class="bar-row' + (r.w === best ? " best" : "") + '"><span>' + labels[r.k] + '</span><div class="bar-track"><div class="bar-fill" style="width:' +
      Math.max(2, (r.w / max) * 100) + '%"></div></div><span class="bar-val">' + fmt(r.w) + "</span></div>";
  }).join("");
}

document.getElementById("rows").addEventListener("input", function (e) {
  var t = e.target;
  if (!t.dataset.f) return;
  procs[Number(t.dataset.i)][t.dataset.f] = t.value === "" ? NaN : Number(t.value);
  run();
});
document.getElementById("rows").addEventListener("click", function (e) {
  if (!e.target.dataset.rm) return;
  procs.splice(Number(e.target.dataset.rm), 1);
  renderRows(); run();
});
document.getElementById("add").addEventListener("click", function () {
  if (procs.length >= 8) { document.getElementById("error").textContent = "This simulator supports up to 8 processes."; return; }
  var lastArrival = procs.length ? procs[procs.length - 1].arrival : 0;
  procs.push({ arrival: (lastArrival || 0) + 1, burst: 4, priority: procs.length + 1 });
  renderRows(); run();
});
document.getElementById("sample").addEventListener("click", function () {
  procs = SAMPLE.map(function (p) { return Object.assign({}, p); });
  renderRows(); run();
});
document.getElementById("algos").addEventListener("click", function (e) {
  var b = e.target.closest("button");
  if (!b) return;
  algo = b.dataset.a;
  document.querySelectorAll("#algos button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
  run();
});
document.getElementById("quantum").addEventListener("input", run);

renderRows();
run();
