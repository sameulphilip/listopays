(function () {
  var LOGO = "/brand/leez-lockup.png";
  var pending = false;

  function isLogo(img) {
    var src = (img.getAttribute("src") || "").toLowerCase();
    if (src.indexOf("/brand/leez") !== -1) return false;
    var key = src + " " + (img.getAttribute("alt") || "").toLowerCase();
    return /logo|listopay/.test(key);
  }

  function notifyPaid() {
    var match = String(location.pathname).match(/\/payment\/([^/]+)\/(success|fail|failed|failure|error|declined|rejected|cancel|cancelled|canceled|expired)\/?$/i);
    if (!match || window.__lpPaidSent) return;
    window.__lpPaidSent = true;
    fetch("/api/checkout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: match[1] }),
      keepalive: true,
    })
      .then(function (res) {
        if (!res.ok) window.__lpPaidSent = false;
      })
      .catch(function () {
        window.__lpPaidSent = false;
      });
  }

  function apply() {
    notifyPaid();
    document.title = "Leez Pay";
    var images = document.querySelectorAll("img");
    for (var i = 0; i < images.length; i += 1) {
      var img = images[i];
      if (!isLogo(img)) continue;
      img.setAttribute("src", LOGO);
      img.setAttribute("alt", "Leez Pay");
      img.removeAttribute("srcset");
    }
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      apply();
    });
  }

  apply();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  }
  window.addEventListener("load", apply);
  window.setInterval(notifyPaid, 1000);

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset", "alt"],
  });
})();
