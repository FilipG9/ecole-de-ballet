(function () {
  "use strict";

  function nonEmptyString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function setText(name, value) {
    var text = nonEmptyString(value);
    var element = document.querySelector('[data-privacy="' + name + '"]');
    if (element && text) {
      element.textContent = text;
    }
  }

  async function loadPrivacy() {
    try {
      var response = await fetch("content/site.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      var site = await response.json();
      var privacy = site && site.privacy;
      if (!privacy) {
        return;
      }

      [
        "lastUpdated",
        "controllerName",
        "controllerAddress",
        "legalDetails",
        "websiteHost",
        "newsletterProvider",
        "newsletterRetention",
        "contactRetention",
        "additionalRecipients",
        "complaintAuthority"
      ].forEach(function (field) {
        setText(field, privacy[field]);
      });

      var email = nonEmptyString(privacy.controllerEmail);
      var emailLink = document.querySelector("[data-privacy-email]");
      if (emailLink && email) {
        emailLink.textContent = email;
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          emailLink.href = "mailto:" + email;
        } else {
          emailLink.removeAttribute("href");
        }
      }

      var incomplete = Object.keys(privacy).some(function (key) {
        return typeof privacy[key] === "string" && /DA COMPLETARE/i.test(privacy[key]);
      });
      var warning = document.querySelector("[data-privacy-warning]");
      if (warning) {
        warning.hidden = !incomplete;
      }
    } catch (error) {
      console.warn("Informazioni privacy CMS non disponibili. Uso dei testi di riserva.", error);
    }
  }

  loadPrivacy();
})();
