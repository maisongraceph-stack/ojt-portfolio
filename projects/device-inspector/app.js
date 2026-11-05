// Device Info Inspector: collects device details with standard browser APIs.
// Everything runs locally; nothing is sent to a server.

function detectOS(ua, platform) {
  if (/Windows NT 10/.test(ua)) return "Windows 10 / 11";
  if (/Windows NT 6\.3/.test(ua)) return "Windows 8.1";
  if (/Windows NT 6\.1/.test(ua)) return "Windows 7";
  if (/Android ([\d.]+)/.test(ua)) return "Android " + ua.match(/Android ([\d.]+)/)[1];
  if (/(iPhone|iPad|iPod).*OS ([\d_]+)/.test(ua)) return "iOS " + ua.match(/OS ([\d_]+)/)[1].replace(/_/g, ".");
  if (/Mac OS X ([\d_]+)/.test(ua)) return "macOS " + ua.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g, ".");
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua) || /Linux/.test(platform)) return "Linux";
  return "Unknown";
}

function detectBrowser(ua) {
  var m;
  if ((m = ua.match(/Edg\/([\d.]+)/))) return "Microsoft Edge " + m[1].split(".")[0];
  if ((m = ua.match(/OPR\/([\d.]+)/))) return "Opera " + m[1].split(".")[0];
  if ((m = ua.match(/Firefox\/([\d.]+)/))) return "Firefox " + m[1].split(".")[0];
  if ((m = ua.match(/Chrome\/([\d.]+)/))) return "Chrome " + m[1].split(".")[0];
  if ((m = ua.match(/Version\/([\d.]+).*Safari/))) return "Safari " + m[1];
  return "Unknown";
}

function collect() {
  var nav = window.navigator;
  var ua = nav.userAgent || "";
  var conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  var tz = "Unknown";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) { /* ignore */ }

  return [
    { title: "System", items: [
      ["Operating system", detectOS(ua, nav.platform || "")],
      ["Browser", detectBrowser(ua)],
      ["CPU cores", nav.hardwareConcurrency ? nav.hardwareConcurrency + " logical cores" : null],
      ["Memory", nav.deviceMemory ? "About " + nav.deviceMemory + " GB" : null],
      ["Touch screen", nav.maxTouchPoints > 0 ? "Yes (" + nav.maxTouchPoints + " points)" : "No"]
    ]},
    { title: "Display", items: [
      ["Screen", screen.width + " × " + screen.height + " px"],
      ["Browser window", window.innerWidth + " × " + window.innerHeight + " px"],
      ["Pixel ratio", String(window.devicePixelRatio || 1)],
      ["Color depth", screen.colorDepth + "-bit"],
      ["Orientation", screen.orientation ? screen.orientation.type.replace("-primary", "").replace("-secondary", "") : (window.innerWidth > window.innerHeight ? "landscape" : "portrait")]
    ]},
    { title: "Network & locale", items: [
      ["Status", nav.onLine ? "Online" : "Offline", nav.onLine ? "ok" : "bad"],
      ["Connection", conn && conn.effectiveType ? conn.effectiveType.toUpperCase() + (conn.downlink ? " · ~" + conn.downlink + " Mbps" : "") : null],
      ["Language", nav.language || null],
      ["Time zone", tz],
      ["Cookies", nav.cookieEnabled ? "Enabled" : "Disabled", nav.cookieEnabled ? "ok" : "bad"]
    ]}
  ];
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function render() {
  var groups = collect();
  document.getElementById("groups").innerHTML = groups.map(function (g) {
    return '<section class="group"><h2>' + g.title + "</h2><dl>" + g.items.map(function (it) {
      var val = it[1] === null ? '<span class="na">Not available in this browser</span>' : esc(it[1]);
      return "<div><dt>" + it[0] + '</dt><dd class="' + (it[2] || "") + '">' + val + "</dd></div>";
    }).join("") + "</dl></section>";
  }).join("");

  var note = document.getElementById("note").value.trim();
  var lines = ["DEVICE SUPPORT REPORT", "Generated: " + new Date().toLocaleString("en-PH"), ""];
  if (note) lines.push("Problem: " + note, "");
  groups.forEach(function (g) {
    lines.push("[" + g.title + "]");
    g.items.forEach(function (it) { lines.push("  " + it[0] + ": " + (it[1] === null ? "Not available" : it[1])); });
    lines.push("");
  });
  document.getElementById("report").textContent = lines.join("\n").trim();
}

function setStatus(msg) {
  var el = document.getElementById("status");
  el.textContent = msg;
  clearTimeout(setStatus.t);
  setStatus.t = setTimeout(function () { el.textContent = ""; }, 3000);
}

document.getElementById("copy").addEventListener("click", function () {
  var text = document.getElementById("report").textContent;
  function fallback() {
    var range = document.createRange();
    range.selectNodeContents(document.getElementById("report"));
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    setStatus("Report selected. Press Ctrl+C (or long-press) to copy.");
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { setStatus("Report copied. Paste it into your ticket."); }, fallback);
  } else { fallback(); }
});

document.getElementById("refresh").addEventListener("click", function () { render(); setStatus("Details refreshed."); });
document.getElementById("note").addEventListener("input", render);
window.addEventListener("online", render);
window.addEventListener("offline", render);
window.addEventListener("resize", function () { clearTimeout(render.t); render.t = setTimeout(render, 200); });

render();
