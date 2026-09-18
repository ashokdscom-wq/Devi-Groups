
/*
 * DEVI GROUPS - Visual CMS Bridge
 * Runs only when the website URL contains ?admin=1
 *
 * This bridge lets the Visual Admin select page elements
 * and apply temporary text/image/link changes.
 * Saving to Supabase is handled by the Admin Panel.
 */

(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);

  // Run only inside the admin iframe.
  if (params.get("admin") !== "1" || window.parent === window) {
    return;
  }

  const CHANNEL = "devi-visual-cms";

  const SELECTABLE = [
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "span",
    "a",
    "button",
    "img",
    "video",
    "source",
    "section",
    "article",
    "[data-cms-key]",
    "[data-cms-editable]"
  ].join(",");

  let active = true;
  let selectedElement = null;
  let overlay = null;
  let lastHover = null;

  function getPage() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("about")) return "about";
    if (path.includes("company")) return "company";
    if (path.includes("product")) return "products";
    if (path.includes("sister")) return "sister-brand";
    if (path.includes("contact")) return "contact";

    return "home";
  }

  function safeString(value) {
    return value == null ? "" : String(value);
  }

  function getElementKey(element) {
    return (
      element.dataset.cmsKey ||
      element.dataset.cmsEditable ||
      element.id ||
      element.getAttribute("data-section-key") ||
      ""
    );
  }

  function getSectionKey(element) {
    return (
      element.dataset.sectionKey ||
      element.closest("[data-section-key]")?.dataset.sectionKey ||
      getPage()
    );
  }

  function getElementData(element) {
    const tag = element.tagName.toLowerCase();

    return {
      page: getPage(),
      section_key: getSectionKey(element),
      key: getElementKey(element),
      tag: tag,

      text: ["img", "video", "source"].includes(tag)
        ? ""
        : element.textContent.trim(),

      src: element.getAttribute("src") || "",
      href: element.getAttribute("href") || "",
      alt: element.getAttribute("alt") || "",
      title: element.getAttribute("title") || "",

      button_text:
        element.getAttribute("data-button-text") || "",

      button_url:
        element.getAttribute("data-button-url") || ""
    };
  }

  function post(type, payload = {}) {
    window.parent.postMessage(
      {
        source: CHANNEL,
        type,
        ...payload
      },
      window.location.origin
    );
  }

  function ensureOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "__devi_visual_cms_outline";

    Object.assign(overlay.style, {
      position: "fixed",
      zIndex: "2147483646",
      pointerEvents: "none",
      border: "2px solid #2563eb",
      background: "rgba(37, 99, 235, 0.08)",
      boxSizing: "border-box",
      display: "none"
    });

    document.documentElement.appendChild(overlay);

    return overlay;
  }

  function outline(element) {
    if (!element || !element.isConnected) {
      if (overlay) overlay.style.display = "none";
      return;
    }

    const rect = element.getBoundingClientRect();
    const box = ensureOverlay();

    Object.assign(box.style, {
      display: "block",
      left: `${Math.max(0, rect.left)}px`,
      top: `${Math.max(0, rect.top)}px`,
      width: `${Math.max(0, rect.width)}px`,
      height: `${Math.max(0, rect.height)}px`
    });
  }

  function isBridgeElement(element) {
    return (
      !element ||
      element === overlay ||
      element.closest("#__devi_visual_cms_outline")
    );
  }

  function onMouseOver(event) {
    if (!active) return;

    const element = event.target.closest?.(SELECTABLE);

    if (!element || isBridgeElement(element)) return;

    lastHover = element;
    outline(element);
  }

  function onClick(event) {
    if (!active) return;

    const element = event.target.closest?.(SELECTABLE);

    if (!element || isBridgeElement(element)) return;

    // Prevent normal navigation while selecting in the editor.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    selectedElement = element;

    outline(element);

    post("SELECT", {
      element: getElementData(element)
    });
  }

  function applyToElement(element, patch = {}) {
    if (!element || !element.isConnected) return false;

    const tag = element.tagName.toLowerCase();

    if (
      Object.prototype.hasOwnProperty.call(patch, "text") &&
      !["img", "video", "source"].includes(tag)
    ) {
      // textContent avoids inserting arbitrary HTML.
      element.textContent = safeString(patch.text);
    }

    if (
      Object.prototype.hasOwnProperty.call(patch, "src")
    ) {
      if (patch.src) {
        element.setAttribute("src", safeString(patch.src));
      } else {
        element.removeAttribute("src");
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(patch, "href")
    ) {
      if (patch.href) {
        element.setAttribute("href", safeString(patch.href));
      } else {
        element.removeAttribute("href");
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(patch, "alt")
    ) {
      element.setAttribute("alt", safeString(patch.alt));
    }

    if (
      Object.prototype.hasOwnProperty.call(patch, "title")
    ) {
      element.setAttribute("title", safeString(patch.title));
    }

    if (
      Object.prototype.hasOwnProperty.call(patch, "button_text")
    ) {
      element.textContent = safeString(patch.button_text);
    }

    if (
      Object.prototype.hasOwnProperty.call(patch, "button_url")
    ) {
      if (patch.button_url) {
        element.setAttribute(
          "href",
          safeString(patch.button_url)
        );
      }
    }

    return true;
  }

  function findTarget(selector, key) {
    if (
      selectedElement?.isConnected &&
      (!key || getElementKey(selectedElement) === key)
    ) {
      return selectedElement;
    }

    if (key) {
      const escapedKey = CSS.escape(key);

      const byData = document.querySelector(
        `[data-cms-key="${escapedKey}"],` +
        `[data-cms-editable="${escapedKey}"],` +
        `#${escapedKey}`
      );

      if (byData) return byData;
    }

    if (selector) {
      try {
        return document.querySelector(selector);
      } catch (error) {
        console.warn(
          "DEVI CMS: Invalid selector",
          selector,
          error
        );
      }
    }

    return null;
  }

  window.addEventListener("message", event => {
    if (event.source !== window.parent) return;

    if (event.origin !== window.location.origin) return;

    const message = event.data;

    if (!message || message.source !== CHANNEL) return;

    switch (message.type) {
      case "NAVIGATE": {
        active = true;

        if (message.page) {
          try {
            const url = new URL(
              message.page,
              window.location.href
            );

            if (url.origin === window.location.origin) {
              window.location.href = url.href;
            }
          } catch (error) {
            console.warn(
              "DEVI CMS: Invalid page URL",
              error
            );
          }
        }

        break;
      }

      case "APPLY": {
        const key =
          message.key ||
          message.element?.key ||
          "";

        const target = findTarget(
          message.selector,
          key
        );

        const patch =
          message.patch ||
          message.element ||
          message.data ||
          {};

        const ok = applyToElement(target, patch);

        post("APPLIED", {
          ok,
          key
        });

        break;
      }

      case "SET_MODE": {
        active = message.enabled !== false;

        if (!active && overlay) {
          overlay.style.display = "none";
        }

        break;
      }

      case "CLEAR_SELECTION": {
        selectedElement = null;

        if (overlay) {
          overlay.style.display = "none";
        }

        break;
      }

      default:
        break;
    }
  });

  // Capture phase lets the bridge intercept site clicks.
  document.addEventListener(
    "mouseover",
    onMouseOver,
    true
  );

  document.addEventListener(
    "click",
    onClick,
    true
  );

  window.addEventListener(
    "scroll",
    () => {
      if (selectedElement) {
        outline(selectedElement);
      } else if (lastHover) {
        outline(lastHover);
      }
    },
    true
  );

  window.addEventListener("resize", () => {
    if (selectedElement) {
      outline(selectedElement);
    } else if (lastHover) {
      outline(lastHover);
    }
  });

  post("READY", {
    page: getPage(),
    url: window.location.href
  });
})();
