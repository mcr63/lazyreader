(function() {
  var subjectSelectors = [".t_subject", ".message-subject", "td.subject", ".subject"];

  function isNoMessage(text) {
    return /\(nm\)\s*$/i.test((text || "").trim());
  }

  function isLikelyMessageHref(href) {
    return /message\.html|\/message\/|\/post\//i.test(href || "");
  }

  function findMessageLink(post) {
    var links = Array.prototype.slice.call(post.querySelectorAll("a[href]"));
    var preferred = links.find(function(link) {
      return isLikelyMessageHref(link.href || link.getAttribute("href") || "");
    });

    if (preferred) {
      return preferred;
    }

    // Conservative fallback: only accept a single link in the subject container.
    if (links.length === 1) {
      return links[0];
    }

    return null;
  }

  function createPreviewContainer() {
    var div = document.createElement("div");
    div.className = "popcontents";
    div.style.display = "none";
    div.style.marginTop = "-5px";
    div.style.marginLeft = "20px";
    div.style.background = "rgba(228,232,237,0.95)";
    div.style.borderRadius = "5px";
    div.style.color = "#000";
    div.style.position = "absolute";
    div.style.zIndex = "98";
    div.style.padding = "5px 15px";
    div.style.border = "1px solid navy";
    div.style.maxWidth = "700px";
    div.style.maxHeight = "500px";
    div.style.overflow = "auto";
    return div;
  }

  function firstMatchingContent(doc, candidates) {
    for (var i = 0; i < candidates.length; i++) {
      var match = doc.querySelector(candidates[i]);
      if (match && (match.textContent || "").trim().length > 20) {
        return match;
      }
    }

    return null;
  }

  function extractBody(doc) {
    var candidates = [
      "#m_body > div",
      "#m_body",
      ".message-body",
      ".post-body",
      "#messageBody",
      "article .body",
      "article"
    ];

    return firstMatchingContent(doc, candidates);
  }

  function loadPreview(container, href) {
    if (!href || container.dataset.loaded === "true" || container.dataset.loading === "true") {
      return;
    }

    container.dataset.loading = "true";
    container.textContent = "Loading...";

    fetch(href, { credentials: "same-origin" })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("Request failed");
        }

        return response.text();
      })
      .then(function(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");
        var body = extractBody(doc);

        if (!body) {
          container.textContent = "Unable to find message content for preview.";
          container.dataset.loaded = "false";
          return;
        }

        container.innerHTML = "";
        container.appendChild(body.cloneNode(true));
        container.dataset.loaded = "true";
      })
      .catch(function() {
        container.textContent = "Unable to load message preview.";
        container.dataset.loaded = "false";
      })
      .finally(function() {
        container.dataset.loading = "false";
      });
  }

  function init() {
    var subjects = Array.prototype.slice.call(document.querySelectorAll(subjectSelectors.join(",")));

    subjects.forEach(function(post) {
      if (isNoMessage(post.textContent || "")) {
        return;
      }

      if (post.querySelector("div.popcontents")) {
        return;
      }

      var link = findMessageLink(post);
      if (!link || !link.href) {
        return;
      }

      var preview = createPreviewContainer();
      post.appendChild(preview);
      post._lazyreaderPreview = preview;
      post._lazyreaderHref = link.href;

      post.addEventListener("mouseenter", function() {
        var localPreview = post._lazyreaderPreview;
        if (!localPreview) {
          return;
        }

        loadPreview(localPreview, post._lazyreaderHref);
        localPreview.style.display = "block";
      });

      post.addEventListener("mouseleave", function() {
        var localPreview = post._lazyreaderPreview;
        if (localPreview) {
          localPreview.style.display = "none";
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
