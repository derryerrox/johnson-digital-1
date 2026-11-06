(() => {
  const config = window.JD_CONFIG || {};
  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".primary-nav");
  const header = document.querySelector(".site-header");
  const form = document.querySelector("#contact-form");
  const formStatus = document.querySelector("#form-status");

  document.querySelector("#current-year").textContent = new Date().getFullYear();

  if (config.siteUrl) {
    try {
      const siteUrl = new URL(config.siteUrl);
      if (siteUrl.protocol !== "https:" || siteUrl.pathname !== "/" || siteUrl.search || siteUrl.hash) {
        throw new Error("The site URL must be an HTTPS origin without a path, query, or fragment.");
      }
      document.querySelector('link[rel="canonical"]').href = siteUrl.href;
      document.querySelector('meta[property="og:url"]').content = siteUrl.href;
      document.querySelector('meta[property="og:image"]').content = new URL("assets/social-preview.png", siteUrl).href;
      document.querySelector('meta[name="twitter:image"]').content = new URL("assets/social-preview.png", siteUrl).href;
    } catch (error) {
      console.error("Configure a valid HTTPS site URL.", error);
    }
  }

  const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    navigation.classList.toggle("is-open", !isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      menuToggle.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
    }
  });

  const emailLink = document.querySelector(".contact-email");
  if (config.contactEmail) {
    emailLink.href = `mailto:${config.contactEmail}`;
    emailLink.textContent = config.contactEmail;
  }

  const phoneLink = document.querySelector(".contact-phone");
  if (config.telephoneNumber) {
    const phone = config.telephoneNumber.replace(/[^\d+]/g, "");
    phoneLink.href = `tel:${phone}`;
    phoneLink.textContent = config.telephoneNumber;
  }

  const whatsappLink = document.querySelector(".contact-whatsapp");
  if (config.whatsappNumber) {
    const number = config.whatsappNumber.replace(/\D/g, "");
    if (number) {
      whatsappLink.href = `https://wa.me/${number}`;
      whatsappLink.target = "_blank";
      whatsappLink.rel = "noopener noreferrer";
    }
  }

  const socialLinks = config.socialLinks || {};
  let hasSocialLink = false;
  document.querySelectorAll(".social-link").forEach((link) => {
    const url = socialLinks[link.dataset.social];
    if (!url) return;

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") return;
      link.href = parsedUrl.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.hidden = false;
      hasSocialLink = true;
    } catch (error) {
      console.error(`Invalid URL configured for ${link.dataset.social}.`, error);
    }
  });
  if (hasSocialLink) document.querySelector(".social-unconfigured").hidden = true;

  const endpointUrl = (action) => {
    const endpoint = new URL(config.formEndpoint);
    endpoint.searchParams.set("action", action);
    return endpoint;
  };

  const mediaAdminLink = document.querySelector(".media-admin-link");
  if (config.mediaAdminUrl) {
    try {
      const adminUrl = new URL(config.mediaAdminUrl);
      if (adminUrl.protocol !== "https:") throw new Error("The media admin URL must use HTTPS.");
      adminUrl.searchParams.set("page", "admin");
      adminUrl.searchParams.delete("action");
      mediaAdminLink.href = adminUrl.href;
      mediaAdminLink.target = "_blank";
      mediaAdminLink.rel = "noopener noreferrer";
      mediaAdminLink.hidden = false;
    } catch (error) {
      console.error("Configure a valid HTTPS media admin URL.", error);
    }
  }

  document.querySelectorAll("[data-industry]").forEach((link) => {
    link.addEventListener("click", () => {
      const serviceSelect = document.querySelector("#service-required");
      serviceSelect.value = "Industry-specific marketing";
    });
  });

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  if (config.formEndpoint) {
    try {
      const imageEndpoint = endpointUrl("images");
      if (imageEndpoint.protocol !== "https:") throw new Error("The image catalogue endpoint must use HTTPS.");
      fetch(imageEndpoint.href, { headers: { "Accept": "application/json" } })
        .then((response) => {
          if (!response.ok) throw new Error(`Image catalogue request failed (${response.status}).`);
          return response.json();
        })
        .then((result) => {
          if (!Array.isArray(result.images)) throw new Error("Image catalogue response is invalid.");
          const imageMap = new Map(result.images.map((image) => [image.image_key, image]));
          document.querySelectorAll("[data-image-key]").forEach((element) => {
            const image = imageMap.get(element.dataset.imageKey);
            if (!image || typeof image.public_url !== "string" || !image.public_url.startsWith("https://")) return;
            if (element instanceof HTMLImageElement) {
              element.src = image.public_url;
              if (image.alt_text) element.alt = image.alt_text;
            } else {
              element.style.backgroundImage = `url("${image.public_url.replace(/["\\\n\r]/g, "")}")`;
            }
          });
        })
        .catch((error) => console.error("Could not load managed website images.", error));
    } catch (error) {
      console.error("Configure a valid HTTPS image catalogue endpoint.", error);
    }
  }

  const turnstileStatus = document.querySelector("#turnstile-status");
  let turnstileWidgetId = null;
  if (!config.formEndpoint) {
    turnstileStatus.textContent = "Secure enquiry delivery is being configured. Please contact us by email or WhatsApp.";
  } else if (!config.turnstileSiteKey) {
    turnstileStatus.textContent = "The secure enquiry form will be available after CAPTCHA is configured.";
  } else {
    const turnstileScript = document.createElement("script");
    turnstileScript.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    turnstileScript.async = true;
    turnstileScript.defer = true;
    turnstileScript.onload = () => {
      turnstileWidgetId = window.turnstile.render("#turnstile-container", {
        sitekey: config.turnstileSiteKey,
        theme: "light"
      });
      turnstileStatus.textContent = "";
    };
    turnstileScript.onerror = () => {
      turnstileStatus.textContent = "CAPTCHA could not load. Check your connection and try again.";
    };
    document.head.appendChild(turnstileScript);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    formStatus.removeAttribute("data-state");

    if (!form.reportValidity()) return;

    if (!config.formEndpoint || !config.turnstileSiteKey) {
      formStatus.dataset.state = "error";
      formStatus.textContent = "Secure enquiry delivery is not configured yet. Please use the email or WhatsApp links.";
      return;
    }

    let endpoint;
    try {
      endpoint = endpointUrl("contact");
      if (endpoint.protocol !== "https:") throw new Error("The enquiry endpoint must use HTTPS.");
    } catch (error) {
      console.error("Configure a valid HTTPS enquiry endpoint.", error);
      formStatus.dataset.state = "error";
      formStatus.textContent = "The enquiry form needs a valid secure endpoint. Please try again later.";
      return;
    }

    if (form.elements.website.value) {
      formStatus.dataset.state = "error";
      formStatus.textContent = "Your enquiry could not be submitted. Please try again.";
      return;
    }

    const turnstileToken = window.turnstile?.getResponse(turnstileWidgetId);
    if (!turnstileToken) {
      formStatus.dataset.state = "error";
      formStatus.textContent = "Complete the CAPTCHA check before submitting your enquiry.";
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    formStatus.textContent = "Sending your enquiry…";

    try {
      const payload = Object.fromEntries(new FormData(form));
      payload.privacyConsent = form.elements.privacyConsent.checked;
      payload.turnstileToken = turnstileToken;
      const response = await fetch(endpoint.href, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || `Enquiry submission failed (${response.status}).`);
      }
      form.reset();
      formStatus.dataset.state = "success";
      formStatus.textContent = "Thank you. Your enquiry was accepted for delivery.";
    } catch (error) {
      console.error("Could not submit the enquiry form.", error);
      formStatus.dataset.state = "error";
      formStatus.textContent = error.message || "We couldn’t send your enquiry. Please try again later.";
    } finally {
      if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  });
})();
