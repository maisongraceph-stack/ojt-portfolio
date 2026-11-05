// Highlights the nav link for the section currently on screen.
document.addEventListener("DOMContentLoaded", function () {
  var links = document.querySelectorAll(".site-header nav a");

  function update() {
    var y = window.scrollY + 120;
    links.forEach(function (link) {
      var section = document.querySelector(link.getAttribute("href"));
      var inView = section && section.offsetTop <= y && section.offsetTop + section.offsetHeight > y;
      link.classList.toggle("active", !!inView);
    });
  }

  window.addEventListener("scroll", update, { passive: true });
  update();
});
