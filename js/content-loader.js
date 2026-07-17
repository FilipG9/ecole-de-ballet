(function () {
  "use strict";

  var loaderScript = document.currentScript;
  var siteRoot = new URL("../", loaderScript && loaderScript.src ? loaderScript.src : document.baseURI);

  function nonEmptyString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function finiteNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
  }

  function resolveAssetPath(value) {
    var path = nonEmptyString(value);
    if (!path || /^(?:https?:|data:|blob:)/i.test(path)) {
      return path;
    }

    if (path.charAt(0) === "/") {
      path = path.slice(1);
    }

    return path;
  }

  function setText(selector, value, root) {
    var text = nonEmptyString(value);
    var element = (root || document).querySelector(selector);
    if (element && text) {
      element.textContent = text;
    }
  }

  function setAttribute(selector, attribute, value, root) {
    var text = nonEmptyString(value);
    var element = (root || document).querySelector(selector);
    if (element && text) {
      element.setAttribute(attribute, text);
    }
  }

  function setMultilineText(selector, value, root) {
    var text = nonEmptyString(value);
    var element = (root || document).querySelector(selector);
    if (!element || !text) {
      return;
    }

    var lines = text.split(/\r?\n/);
    element.replaceChildren();
    lines.forEach(function (line, index) {
      if (index) {
        element.appendChild(document.createElement("br"));
      }
      element.appendChild(document.createTextNode(line));
    });
  }

  function setImage(selector, imagePath, altText, positionX, positionY, root) {
    var image = (root || document).querySelector(selector);
    var resolvedPath = resolveAssetPath(imagePath);
    if (!image || !resolvedPath) {
      return;
    }

    if (!image.dataset.cmsFallbackSrc) {
      image.dataset.cmsFallbackSrc = image.getAttribute("src") || "";
      image.dataset.cmsFallbackAlt = image.getAttribute("alt") || "";
      image.dataset.cmsFallbackPosition = image.style.objectPosition || "";
    }

    image.addEventListener("error", function restoreFallback() {
      var fallback = image.dataset.cmsFallbackSrc;
      if (fallback && image.getAttribute("src") !== fallback) {
        image.setAttribute("src", fallback);
        image.setAttribute("alt", image.dataset.cmsFallbackAlt || "");
        image.style.objectPosition = image.dataset.cmsFallbackPosition || "";
      }
    }, { once: true });

    image.setAttribute("src", resolvedPath);
    if (typeof altText === "string") {
      image.setAttribute("alt", altText.trim());
    }
    image.style.objectPosition = finiteNumber(positionX, 50) + "% " + finiteNumber(positionY, 50) + "%";
  }

  function setPlaceholder(selector, value) {
    var text = nonEmptyString(value);
    var field = document.querySelector(selector);
    if (field && text) {
      field.setAttribute("placeholder", text);
    }
  }

  function updateTextPairs(elementsSelector, items, titleSelector, textSelector) {
    if (!Array.isArray(items) || !items.length) {
      return;
    }

    document.querySelectorAll(elementsSelector).forEach(function (element, index) {
      var item = items[index];
      if (!item) {
        return;
      }
      setText(titleSelector, item.title, element);
      setText(textSelector, item.text, element);
    });
  }

  function textOr(value, fallback) {
    return nonEmptyString(value) || nonEmptyString(fallback) || "";
  }

  function arrayOr(value, fallback) {
    return Array.isArray(value) && value.length ? value : (Array.isArray(fallback) ? fallback : []);
  }

  function contentId(element, fallback) {
    return nonEmptyString(element && element.dataset ? element.dataset.contentId : "") || fallback;
  }

  function captureCourseFallbacks() {
    var fallbacks = {};
    var scheduleCards = {};

    document.querySelectorAll(".schedule-grid .schedule-card").forEach(function (card, index) {
      var id = contentId(card, "course-" + (index + 1));
      scheduleCards[id] = Array.from(card.querySelectorAll(".schedule-slot")).map(function (slot) {
        return {
          day: slot.querySelector("span") ? slot.querySelector("span").textContent.trim() : "",
          time: slot.querySelector("time") ? slot.querySelector("time").textContent.trim() : ""
        };
      });
    });

    document.querySelectorAll(".course-grid .course-card").forEach(function (card, index) {
      var id = contentId(card, "course-" + (index + 1));
      var image = card.querySelector("img");
      fallbacks[id] = {
        id: id,
        published: true,
        order: index + 1,
        wide: card.classList.contains("wide"),
        title: card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "Corso",
        description: card.querySelector("p") ? card.querySelector("p").textContent.trim() : "",
        image: image ? image.getAttribute("src") : "",
        imageAlt: image ? image.getAttribute("alt") : "",
        imagePositionX: 50,
        imagePositionY: 50,
        features: Array.from(card.querySelectorAll("li")).map(function (item) { return item.textContent.trim(); }),
        schedule: scheduleCards[id] || []
      };
    });

    return fallbacks;
  }

  function captureTeacherFallbacks() {
    var fallbacks = {};
    document.querySelectorAll(".team-grid .person").forEach(function (card, index) {
      var id = contentId(card, "teacher-" + (index + 1));
      var image = card.querySelector("img");
      fallbacks[id] = {
        id: id,
        published: true,
        order: index + 1,
        name: card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "Insegnante",
        role: card.querySelector("p") ? card.querySelector("p").textContent.trim() : "Docente",
        image: image ? image.getAttribute("src") : "",
        imageAlt: image ? image.getAttribute("alt") : "",
        imagePositionX: 50,
        imagePositionY: 0
      };
    });
    return fallbacks;
  }

  function createImage(imagePath, altText, positionX, positionY, fallback) {
    var image = document.createElement("img");
    var fallbackPath = resolveAssetPath(fallback && fallback.image);
    var requestedPath = resolveAssetPath(imagePath) || fallbackPath;

    image.alt = textOr(altText, fallback && fallback.imageAlt);
    image.style.objectPosition = finiteNumber(positionX, finiteNumber(fallback && fallback.imagePositionX, 50)) + "% " + finiteNumber(positionY, finiteNumber(fallback && fallback.imagePositionY, 50)) + "%";
    image.addEventListener("error", function restoreFallback() {
      if (fallbackPath && image.getAttribute("src") !== fallbackPath) {
        image.setAttribute("src", fallbackPath);
        image.alt = textOr(fallback && fallback.imageAlt, altText);
      }
    }, { once: true });
    if (requestedPath) {
      image.src = requestedPath;
    }
    return image;
  }

  function sortPublished(items) {
    return items.filter(function (item) { return item && item.published !== false; });
  }

  function createCourseCard(course, fallback) {
    var card = document.createElement("article");
    card.className = "course-card" + ((typeof course.wide === "boolean" ? course.wide : fallback.wide) ? " wide" : "");
    card.dataset.contentId = textOr(course.id, fallback.id);

    card.appendChild(createImage(course.image, course.imageAlt, course.imagePositionX, course.imagePositionY, fallback));

    var copy = document.createElement("div");
    copy.className = "course-copy";
    var title = document.createElement("h3");
    title.textContent = textOr(course.title, fallback.title) || "Corso";
    var description = document.createElement("p");
    description.textContent = textOr(course.description, fallback.description);
    var features = document.createElement("ul");
    arrayOr(course.features, fallback.features).forEach(function (feature) {
      var text = nonEmptyString(feature);
      if (text) {
        var item = document.createElement("li");
        item.textContent = text;
        features.appendChild(item);
      }
    });

    copy.append(title, description, features);
    card.appendChild(copy);
    return card;
  }

  function createScheduleCard(course, fallback, index) {
    var card = document.createElement("article");
    card.className = "schedule-card";
    card.dataset.contentId = textOr(course.id, fallback.id);

    var top = document.createElement("div");
    top.className = "schedule-top";
    var title = document.createElement("h3");
    title.textContent = textOr(course.title, fallback.title) || "Corso";
    var number = document.createElement("span");
    number.className = "schedule-index";
    number.textContent = String(index + 1).padStart(2, "0");
    top.append(title, number);

    var slots = document.createElement("div");
    slots.className = "schedule-slots";
    arrayOr(course.schedule, fallback.schedule).forEach(function (entry) {
      if (!entry) {
        return;
      }
      var day = textOr(entry.day, "Giorno da confermare");
      var timeText = textOr(entry.time, "Orario da confermare");
      var slot = document.createElement("div");
      slot.className = "schedule-slot";
      var dayElement = document.createElement("span");
      dayElement.textContent = day;
      var timeElement = document.createElement("time");
      timeElement.textContent = timeText;
      var machineTime = timeText.match(/\d{1,2}:\d{2}/);
      if (machineTime) {
        timeElement.setAttribute("datetime", machineTime[0]);
      }
      slot.append(dayElement, timeElement);
      slots.appendChild(slot);
    });

    card.append(top, slots);
    return card;
  }

  function renderCourses(data, fallbacks) {
    var courseGrid = document.querySelector(".course-grid");
    var scheduleGrid = document.querySelector(".schedule-grid");
    if (!courseGrid || !scheduleGrid || !data || !Array.isArray(data.courses) || !data.courses.length) {
      return;
    }

    var fallbackList = Object.keys(fallbacks).map(function (key) { return fallbacks[key]; });
    var courses = sortPublished(data.courses);
    var courseFragment = document.createDocumentFragment();
    var scheduleFragment = document.createDocumentFragment();

    courses.forEach(function (course, index) {
      var id = nonEmptyString(course.id);
      var fallback = (id && fallbacks[id]) || fallbackList[index] || {
        id: id || "course-" + (index + 1), title: "Corso", description: "", image: "", imageAlt: "",
        imagePositionX: 50, imagePositionY: 50, features: [], schedule: [], wide: false
      };
      courseFragment.appendChild(createCourseCard(course, fallback));
      scheduleFragment.appendChild(createScheduleCard(course, fallback, index));
    });

    courseGrid.replaceChildren(courseFragment);
    scheduleGrid.replaceChildren(scheduleFragment);
  }

  function createTeacherCard(teacher, fallback) {
    var card = document.createElement("article");
    card.className = "person";
    card.dataset.contentId = textOr(teacher.id, fallback.id);

    var photo = document.createElement("div");
    photo.className = "person-photo";
    photo.appendChild(createImage(teacher.image, teacher.imageAlt, teacher.imagePositionX, teacher.imagePositionY, fallback));

    var info = document.createElement("div");
    info.className = "person-info";
    var name = document.createElement("h3");
    name.textContent = textOr(teacher.name, fallback.name) || "Insegnante";
    var role = document.createElement("p");
    role.textContent = textOr(teacher.role, fallback.role) || "Docente";
    info.append(name, role);
    card.append(photo, info);
    return card;
  }

  function renderTeachers(data, fallbacks) {
    var grid = document.querySelector(".team-grid");
    if (!grid || !data || !Array.isArray(data.teachers) || !data.teachers.length) {
      return;
    }

    var fallbackList = Object.keys(fallbacks).map(function (key) { return fallbacks[key]; });
    var teachers = sortPublished(data.teachers);
    var fragment = document.createDocumentFragment();
    teachers.forEach(function (teacher, index) {
      var id = nonEmptyString(teacher.id);
      var fallback = (id && fallbacks[id]) || fallbackList[index] || {
        id: id || "teacher-" + (index + 1), name: "Insegnante", role: "Docente", image: "", imageAlt: "",
        imagePositionX: 50, imagePositionY: 0
      };
      fragment.appendChild(createTeacherCard(teacher, fallback));
    });
    grid.replaceChildren(fragment);
  }

  function renderGallery(data) {
    var container = document.querySelector("[data-cms-gallery]");
    if (!container || !data || !Array.isArray(data.items)) {
      return;
    }

    var fragment = document.createDocumentFragment();
    sortPublished(data.items).forEach(function (item, index) {
      var tile = document.createElement("figure");
      tile.className = "gallery-tile";
      tile.dataset.contentId = textOr(item.id, "gallery-" + (index + 1));
      tile.appendChild(createImage(item.image, item.imageAlt, item.imagePositionX, item.imagePositionY, {}));
      var captionText = nonEmptyString(item.caption);
      if (captionText) {
        var caption = document.createElement("figcaption");
        caption.className = "gallery-label";
        caption.textContent = captionText;
        tile.appendChild(caption);
      }
      fragment.appendChild(tile);
    });
    container.replaceChildren(fragment);
  }

  function applyOptionalContactItem(itemSelector, valueSelector, value) {
    var item = document.querySelector(itemSelector);
    var text = nonEmptyString(value);
    if (!item) {
      return;
    }
    item.hidden = !text;
    if (text) {
      setText(valueSelector, text, item);
    }
  }

  function applySocials(socials) {
    var item = document.querySelector("[data-cms-contact-socials]");
    var container = item ? item.querySelector("[data-cms-social-links]") : null;
    var validSocials = Array.isArray(socials) ? socials.filter(function (social) {
      return social && nonEmptyString(social.label) && nonEmptyString(social.url);
    }) : [];

    if (!item || !container) {
      return;
    }

    item.hidden = validSocials.length === 0;
    if (!validSocials.length) {
      return;
    }

    container.replaceChildren();
    validSocials.forEach(function (social, index) {
      if (index) {
        container.appendChild(document.createTextNode(" · "));
      }
      var link = document.createElement("a");
      link.textContent = social.label.trim();
      link.href = social.url.trim();
      link.rel = "noopener noreferrer";
      container.appendChild(link);
    });
  }

  function applySiteContent(site) {
    if (!site || typeof site !== "object") {
      return;
    }

    if (site.meta) {
      var pageTitle = nonEmptyString(site.meta.title);
      if (pageTitle) {
        document.title = pageTitle;
      }
      setAttribute('meta[name="description"]', "content", site.meta.description);
    }

    setText(".topbar", site.topbar);

    if (site.brand) {
      setText(".brand strong", site.brand.name);
      setText(".brand strong + span", site.brand.descriptor);
      setImage(".brand img", site.brand.logo, site.brand.logoAlt, 50, 50);
      setImage(".footer-brand img", site.brand.footerLogo, site.brand.footerLogoAlt, 50, 50);
    }

    if (site.hero) {
      setText(".hero .kicker", site.hero.eyebrow);
      setText(".hero h1", site.hero.title);
      setText(".hero h1 + p", site.hero.text);
      setText('.hero .actions a[href="#corsi"]', site.hero.primaryButtonLabel);
      setText('.hero .actions a[href="#contatti"]', site.hero.secondaryButtonLabel);
      setText(".hero-panel b", site.hero.panelTitle);
      setText(".hero-panel span", site.hero.panelText);
      setImage(".hero > img", site.hero.image, site.hero.imageAlt, site.hero.imagePositionX, site.hero.imagePositionY);
    }

    if (site.studio) {
      setText("#studio .eyebrow", site.studio.eyebrow);
      setText("#studio h2", site.studio.title);
      setImage("#studio .logo-card img", site.studio.image, site.studio.imageAlt, site.studio.imagePositionX, site.studio.imagePositionY);
      if (Array.isArray(site.studio.paragraphs)) {
        document.querySelectorAll("#studio .intro-text > p").forEach(function (paragraph, index) {
          var text = nonEmptyString(site.studio.paragraphs[index]);
          if (text) {
            paragraph.textContent = text;
          }
        });
      }
      updateTextPairs("#studio .value", site.studio.values, "b", "span");
    }

    if (site.coursesSection) {
      setText("#corsi .section-head .eyebrow", site.coursesSection.eyebrow);
      setText("#corsi .section-head h2", site.coursesSection.title);
      setText("#corsi .section-head .lead", site.coursesSection.text);
    }

    if (site.method) {
      setText("#metodo .eyebrow", site.method.eyebrow);
      setText("#metodo h2", site.method.title);
      setText("#metodo .lead", site.method.text);
      setImage("#metodo .method-image img", site.method.image, site.method.imageAlt, site.method.imagePositionX, site.method.imagePositionY);
      updateTextPairs("#metodo .method-point", site.method.points, "b", "span");
    }

    if (site.scheduleSection) {
      setText("#orari .section-head .eyebrow", site.scheduleSection.eyebrow);
      setText("#orari .section-head h2", site.scheduleSection.title);
      setText("#orari .section-head .lead", site.scheduleSection.text);
      setText("#orari .schedule-note strong", site.scheduleSection.noteLabel);
      var scheduleNote = document.querySelector("#orari .schedule-note");
      var noteText = nonEmptyString(site.scheduleSection.noteText);
      if (scheduleNote && noteText) {
        Array.from(scheduleNote.childNodes).forEach(function (node) {
          if (node.nodeType === Node.TEXT_NODE) {
            node.remove();
          }
        });
        scheduleNote.appendChild(document.createTextNode(" " + noteText));
      }
    }

    if (site.teachersSection) {
      setText("#socie .section-head .eyebrow", site.teachersSection.eyebrow);
      setText("#socie .section-head h2", site.teachersSection.title);
      setText("#socie .section-head .lead", site.teachersSection.text);
      setImage("#socie .team-group-photo img", site.teachersSection.groupImage, site.teachersSection.groupImageAlt, site.teachersSection.groupImagePositionX, site.teachersSection.groupImagePositionY);
      setText("#socie .team-story-copy .eyebrow", site.teachersSection.storyEyebrow);
      setText("#socie .team-story-copy h3", site.teachersSection.storyTitle);
      setText("#socie .team-story-copy p", site.teachersSection.storyText);
    }

    if (site.cta) {
      setText(".cta .eyebrow", site.cta.eyebrow);
      setText(".cta h2", site.cta.title);
      setText(".cta p", site.cta.text);
      setText(".cta .btn", site.cta.buttonLabel);
      var cta = document.querySelector(".cta");
      var ctaImage = resolveAssetPath(site.cta.backgroundImage);
      if (cta && ctaImage) {
        cta.style.setProperty("--cta-image", "url(" + JSON.stringify(ctaImage) + ")");
        cta.style.backgroundPosition = "0 0, " + finiteNumber(site.cta.backgroundPositionX, 50) + "% " + finiteNumber(site.cta.backgroundPositionY, 50) + "%";
      }
    }

    if (site.newsletter) {
      setText(".newsletter .eyebrow", site.newsletter.eyebrow);
      setText(".newsletter h2", site.newsletter.title);
      setText(".newsletter p", site.newsletter.text);
      setPlaceholder('.newsletter input[name="newsletter-email"]', site.newsletter.emailPlaceholder);
      setText(".newsletter button", site.newsletter.buttonLabel);
      setText(".newsletter-note", site.newsletter.technicalNote);
    }

    if (site.contact) {
      setText("#contatti .eyebrow", site.contact.eyebrow);
      setText("#contatti h2", site.contact.title);
      setText("#contatti .contact-card > p", site.contact.text);
      setText("[data-cms-address] b", site.contact.addressLabel);
      setMultilineText("[data-cms-address] span", site.contact.address);
      setText("[data-cms-phone] b", site.contact.phoneLabel);
      setText("[data-cms-phone] span", site.contact.phone);
      setText("[data-cms-contact-email] b", site.contact.emailLabel);
      applyOptionalContactItem("[data-cms-contact-email]", "span", site.contact.email);
      setText("[data-cms-contact-socials] b", site.contact.socialLabel);
      applySocials(site.contact.socials);

      if (site.contact.form) {
        setPlaceholder('#contatti input[name="nome"]', site.contact.form.namePlaceholder);
        setPlaceholder('#contatti input[name="email"]', site.contact.form.emailPlaceholder);
        setPlaceholder('#contatti input[name="corso"]', site.contact.form.coursePlaceholder);
        setPlaceholder('#contatti input[name="telefono"]', site.contact.form.phonePlaceholder);
        setPlaceholder('#contatti textarea[name="messaggio"]', site.contact.form.messagePlaceholder);
        setText("#contatti .form button", site.contact.form.buttonLabel);
      }
    }

    if (site.footer) {
      setText(".footer-brand b", site.footer.name);
      setText(".footer-brand span", site.footer.tagline);
    }
  }

  async function fetchJson(relativePath) {
    try {
      var response = await fetch(new URL(relativePath, siteRoot), { cache: "no-store" });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return await response.json();
    } catch (error) {
      console.warn("Contenuti CMS non disponibili per " + relativePath + ". Uso dei fallback HTML.", error);
      return null;
    }
  }

  async function initialiseContent() {
    var courseFallbacks = captureCourseFallbacks();
    var teacherFallbacks = captureTeacherFallbacks();
    var results = await Promise.all([
      fetchJson("content/site.json"),
      fetchJson("content/courses.json"),
      fetchJson("content/teachers.json"),
      fetchJson("content/gallery.json")
    ]);
    var site = results[0];
    if (site) {
      applySiteContent(site);
    }
    if (results[1]) {
      renderCourses(results[1], courseFallbacks);
    }
    if (results[2]) {
      renderTeachers(results[2], teacherFallbacks);
    }
    if (results[3]) {
      renderGallery(results[3]);
    }
    document.documentElement.dataset.cmsReady = "true";
    document.dispatchEvent(new CustomEvent("cms:content-ready"));
  }

  initialiseContent();
})();
