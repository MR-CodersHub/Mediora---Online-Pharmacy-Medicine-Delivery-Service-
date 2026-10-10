/**
 * Mediora - Main Application Logic
 * Vanilla JavaScript implementation for cart, search, modals, filters,
 * prescription upload, and interactive UI behaviors.
 */

(function () {
  'use strict';

  // State Management
  const STATE_KEY = 'mediora_cart_v1';
  let cart = [];
  try {
    const saved = localStorage.getItem(STATE_KEY) || localStorage.getItem('pharmacare_cart_v1');
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    cart = [];
  }

  function saveCart() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
    updateCartUI();
  }

  // Toast System
  function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  // Cart Functions
  function addToCart(productId, qty = 1) {
    if (!window.PharmaData || !window.PharmaData.products) return;
    const product = window.PharmaData.products.find(p => p.id === Number(productId));
    if (!product) return;

    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        rxRequired: product.rxRequired,
        categoryName: product.categoryName,
        dosage: product.dosage,
        qty: qty
      });
    }

    saveCart();

    if (product.rxRequired) {
      showToast(`Added ${product.name}. Note: Rx verification required at checkout!`, 'success');
      // Also trigger friendly Rx Notice modal
      showRxNoticeModal(product);
    } else {
      showToast(`Added ${product.name} to cart!`, 'success');
    }
  }

  function updateQty(productId, delta) {
    const item = cart.find(i => i.id === Number(productId));
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      removeFromCart(productId);
      return;
    }
    saveCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== Number(productId));
    saveCart();
    showToast('Item removed from cart', 'info');
  }

  function updateCartUI() {
    const countBadges = document.querySelectorAll('.cart-badge-count');
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);

    countBadges.forEach(badge => {
      badge.textContent = totalCount;
      badge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    });

    const drawerBody = document.getElementById('cartDrawerBody');
    const subtotalEl = document.getElementById('cartSubtotal');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl = document.getElementById('cartTotal');
    const rxWarningBox = document.getElementById('cartRxWarningBox');

    if (!drawerBody) return;

    if (cart.length === 0) {
      drawerBody.innerHTML = `
        <div class="cart-empty-state">
          <i class="fa-solid fa-basket-shopping"></i>
          <h4>Your Cart is Empty</h4>
          <p style="font-size:0.85rem; color:var(--text-muted); margin: 8px 0 16px 0;">Browse our licensed dispensary for medicines, health devices & essentials.</p>
          <a href="products.html" class="btn btn-primary btn-sm">Shop Medicines</a>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = '$0.00';
      if (shippingEl) shippingEl.textContent = '$0.00';
      if (totalEl) totalEl.textContent = '$0.00';
      if (rxWarningBox) rxWarningBox.style.display = 'none';
      return;
    }

    let subtotal = 0;
    let hasRx = false;

    let itemsHtml = '';
    cart.forEach(item => {
      const lineTotal = item.price * item.qty;
      subtotal += lineTotal;
      if (item.rxRequired) hasRx = true;

      itemsHtml += `
        <div class="cart-item-row" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img">
          <div class="cart-item-info">
            <h5 class="cart-item-title">${item.name}</h5>
            ${item.rxRequired ? '<span class="badge badge-rx" style="font-size:0.68rem; padding:2px 6px;"><i class="fa-solid fa-prescription"></i> Rx Required</span>' : ''}
            <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            <div class="cart-item-qty">
              <button class="qty-btn" onclick="window.PharmaApp.updateQty(${item.id}, -1)">-</button>
              <span class="qty-val">${item.qty}</span>
              <button class="qty-btn" onclick="window.PharmaApp.updateQty(${item.id}, 1)">+</button>
            </div>
          </div>
          <button class="cart-item-remove" onclick="window.PharmaApp.removeFromCart(${item.id})" title="Remove">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    });

    drawerBody.innerHTML = itemsHtml;

    const shipping = subtotal >= 35 ? 0 : 4.99;
    const total = subtotal + shipping;

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    if (rxWarningBox) {
      rxWarningBox.style.display = hasRx ? 'block' : 'none';
    }
  }

  function openCartDrawer() {
    const overlay = document.getElementById('cartOverlay');
    const drawer = document.getElementById('cartDrawer');
    if (overlay && drawer) {
      overlay.classList.add('active');
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCartDrawer() {
    const overlay = document.getElementById('cartOverlay');
    const drawer = document.getElementById('cartDrawer');
    if (overlay && drawer) {
      overlay.classList.remove('active');
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Quick View Modal
  function openQuickView(productId) {
    if (!window.PharmaData || !window.PharmaData.products) return;
    const product = window.PharmaData.products.find(p => p.id === Number(productId));
    if (!product) return;

    const modal = document.getElementById('quickViewModal');
    if (!modal) return;

    document.getElementById('qvImage').src = product.image;
    document.getElementById('qvImage').alt = product.name;
    document.getElementById('qvTitle').textContent = product.name;
    document.getElementById('qvCategory').textContent = product.categoryName;
    document.getElementById('qvBrand').textContent = `Manufacturer: ${product.brand}`;
    document.getElementById('qvDosage').textContent = `Dosage / Form: ${product.dosage} (${product.dosageForm})`;
    document.getElementById('qvIngredient').textContent = `Active Ingredient: ${product.activeIngredient}`;
    document.getElementById('qvDesc').textContent = product.description;
    document.getElementById('qvUsage').textContent = product.usage;
    document.getElementById('qvPrice').textContent = `$${product.price.toFixed(2)}`;
    document.getElementById('qvOldPrice').textContent = product.oldPrice ? `$${product.oldPrice.toFixed(2)}` : '';

    const rxBadge = document.getElementById('qvRxBadge');
    if (rxBadge) {
      if (product.rxRequired) {
        rxBadge.className = 'badge badge-rx';
        rxBadge.innerHTML = '<i class="fa-solid fa-prescription"></i> Doctor Prescription Required';
      } else {
        rxBadge.className = 'badge badge-otc';
        rxBadge.innerHTML = '<i class="fa-solid fa-shield-check"></i> OTC / Direct Dispense';
      }
    }

    const addBtn = document.getElementById('qvAddBtn');
    if (addBtn) {
      addBtn.onclick = function () {
        addToCart(product.id, 1);
        closeModal('quickViewModal');
      };
    }

    modal.classList.add('active');
  }

  function showRxNoticeModal(product) {
    const modal = document.getElementById('rxNoticeModal');
    if (!modal) return;

    const nameEl = document.getElementById('rxNoticeProductName');
    if (nameEl) nameEl.textContent = product.name;

    modal.classList.add('active');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // Auth Modal Handler
  function openAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    switchAuthTab(tab);
    modal.classList.add('active');
  }

  function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTabBtn');
    const registerTab = document.getElementById('registerTabBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (tab === 'login') {
      if (loginTab) loginTab.classList.add('active');
      if (registerTab) registerTab.classList.remove('active');
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
    } else {
      if (loginTab) loginTab.classList.remove('active');
      if (registerTab) registerTab.classList.add('active');
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'block';
    }
  }

  function togglePasswordVisibility(fieldId, iconEl) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      iconEl.classList.remove('fa-eye');
      iconEl.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      iconEl.classList.remove('fa-eye-slash');
      iconEl.classList.add('fa-eye');
    }
  }

  // Sticky Header Scroll Controller
  function initStickyHeader() {
    const stickyContainer = document.querySelector('.header-sticky-container');
    if (!stickyContainer) return;

    const onScroll = () => {
      if (window.scrollY > 25) {
        stickyContainer.classList.add('is-sticky');
      } else {
        stickyContainer.classList.remove('is-sticky');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile Nav Toggle & Close on outside click
  function initMobileNav() {
    const toggleBtn = document.querySelector('.mobile-nav-toggle');
    const navBar = document.querySelector('.nav-bar');
    if (!toggleBtn || !navBar) return;

    const navInner = navBar.querySelector('.nav-inner');

    function updateToggleIcon(isOpen) {
      toggleBtn.classList.toggle('is-active', isOpen);
      toggleBtn.innerHTML = isOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    function closeNav() {
      if (navBar.classList.contains('mobile-open')) {
        navBar.classList.remove('mobile-open');
        updateToggleIcon(false);
      }
    }

    // Auto-inject mobile-menu blocks if not already present in markup
    if (navInner && !navInner.querySelector('.mobile-menu-account')) {
      const accountBlock = document.createElement('div');
      accountBlock.className = 'mobile-menu-account';
      accountBlock.innerHTML = `
        <div class="mobile-account-card">
          <div class="mobile-account-avatar"><i class="fa-regular fa-user"></i></div>
          <div class="mobile-account-info">
            <span class="mobile-account-label">Patient Access</span>
            <h5 class="mobile-account-name">My Account</h5>
          </div>
        </div>
        <div class="mobile-account-links">
          <a href="javascript:void(0)" class="mobile-account-link" id="mobLoginBtn">
            <i class="fa-solid fa-right-to-bracket"></i>
            <span>Login / Sign Up</span>
          </a>
          <a href="user-dashboard.html" class="mobile-account-link">
            <i class="fa-solid fa-id-card-clip"></i>
            <span>User Portal</span>
          </a>
          <a href="admin-dashboard.html" class="mobile-account-link">
            <i class="fa-solid fa-shield-halved"></i>
            <span>Admin</span>
          </a>
        </div>
      `;
      navInner.insertBefore(accountBlock, navInner.firstChild);

      const mobLogin = accountBlock.querySelector('#mobLoginBtn');
      if (mobLogin) {
        mobLogin.addEventListener('click', () => {
          closeNav();
          openAuthModal('login');
        });
      }
    }

    if (navInner && !navInner.querySelector('.mobile-menu-cart')) {
      const cartBlock = document.createElement('div');
      cartBlock.className = 'mobile-menu-cart';
      cartBlock.innerHTML = `
        <button type="button" class="mobile-menu-cart-btn" id="mobCartBtn">
          <div class="mobile-menu-cart-icon">
            <i class="fa-solid fa-cart-shopping"></i>
            <span class="cart-badge-count" style="display:none;">0</span>
          </div>
          <div class="mobile-menu-cart-info">
            <span class="mobile-menu-cart-sub">Order Summary</span>
            <strong class="mobile-menu-cart-title">View Shopping Cart</strong>
          </div>
          <i class="fa-solid fa-chevron-right mobile-menu-cart-arrow"></i>
        </button>
      `;
      const accountEl = navInner.querySelector('.mobile-menu-account');
      if (accountEl) {
        accountEl.insertAdjacentElement('afterend', cartBlock);
      } else {
        navInner.insertBefore(cartBlock, navInner.firstChild);
      }

      const mobCart = cartBlock.querySelector('#mobCartBtn');
      if (mobCart) {
        mobCart.addEventListener('click', () => {
          closeNav();
          openCartDrawer();
        });
      }
    }

    if (navInner && !navInner.querySelector('.mobile-menu-search')) {
      const searchBlock = document.createElement('div');
      searchBlock.className = 'mobile-menu-search';
      searchBlock.innerHTML = `
        <form action="products.html" method="GET">
          <input type="text" name="q" placeholder="Search medicines, vitamins..." aria-label="Search medicines in menu">
          <button type="submit" aria-label="Search"><i class="fa-solid fa-magnifying-glass"></i></button>
        </form>
      `;
      const cartEl = navInner.querySelector('.mobile-menu-cart');
      if (cartEl) {
        cartEl.insertAdjacentElement('afterend', searchBlock);
      }
    }

    if (navInner && !navInner.querySelector('.mobile-menu-cta-group')) {
      const ctaBlock = document.createElement('div');
      ctaBlock.className = 'mobile-menu-cta-group';
      ctaBlock.innerHTML = `
        <a href="upload-prescription.html" class="btn btn-primary mobile-cta-btn">
          <i class="fa-solid fa-file-arrow-up"></i> Upload Doctor's Rx Slip
        </a>
        <a href="tel:8005550199" class="nav-phone-cta">
          <i class="fa-solid fa-headset"></i>
          <span>24/7 Hotline: <strong>(800) 555-0199</strong></span>
        </a>
      `;
      navInner.appendChild(ctaBlock);
    }

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !navBar.classList.contains('mobile-open');
      navBar.classList.toggle('mobile-open', willOpen);
      updateToggleIcon(willOpen);
    });

    document.addEventListener('click', (e) => {
      if (!navBar.contains(e.target) && !toggleBtn.contains(e.target)) {
        closeNav();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navBar.classList.contains('mobile-open')) {
        closeNav();
      }
    });

    navBar.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        closeNav();
      });
    });

    // Sync badges right after init
    updateCartUI();
  }

  // Account Dropdown Toggle
  function initAccountDropdown() {
    const accountBtn = document.getElementById('accountBtn');
    const dropdown = document.getElementById('accountDropdown');

    if (accountBtn && dropdown) {
      accountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !accountBtn.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdown.classList.contains('active')) {
          dropdown.classList.remove('active');
        }
      });
    }
  }

  // Global Medicine Search Handler
  function initSearchHandlers() {
    const forms = document.querySelectorAll('.search-bar-form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('.search-input');
        const select = form.querySelector('.search-category-select');
        const query = input ? input.value.trim() : '';
        const category = select ? select.value : 'all';

        // Navigate to products.html with query parameters
        window.location.href = `products.html?q=${encodeURIComponent(query)}&cat=${encodeURIComponent(category)}`;
      });
    });
  }

  // Prescription Upload File Handlers
  function initPrescriptionUpload() {
    const dropzone = document.getElementById('prescriptionDropzone');
    const fileInput = document.getElementById('prescriptionFileInput');
    const previewBox = document.getElementById('filePreviewBox');
    const fileNameEl = document.getElementById('previewFileName');
    const fileSizeEl = document.getElementById('previewFileSize');
    const removeBtn = document.getElementById('removeFileBtn');
    const uploadForm = document.getElementById('rxUploadForm');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0]);
      }
    });

    function handleFileSelection(file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Please upload a valid PDF, JPG, or PNG document.', 'error');
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        showToast('File size exceeds the 15MB maximum limit.', 'error');
        return;
      }

      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileSizeEl) fileSizeEl.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB • Ready for review';
      if (previewBox) previewBox.classList.add('active');
      showToast(`Attached prescription: ${file.name}`, 'success');
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        fileInput.value = '';
        if (previewBox) previewBox.classList.remove('active');
        showToast('File attachment removed', 'info');
      });
    }

    if (uploadForm) {
      uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!fileInput.files.length && !fileNameEl.textContent) {
          showToast('Please select or drag your prescription file first.', 'error');
          return;
        }

        // Show confirmation modal
        const successModal = document.getElementById('rxSuccessModal');
        if (successModal) {
          successModal.classList.add('active');
        } else {
          showToast('Prescription submitted! Pharmacist review initiated.', 'success');
        }
      });
    }
  }

  // FAQ Accordion Handlers
  function initFaqAccordions() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      if (question) {
        question.addEventListener('click', () => {
          const isOpen = item.classList.contains('active');
          faqItems.forEach(other => other.classList.remove('active'));
          if (!isOpen) {
            item.classList.add('active');
          }
        });
      }
    });
  }

  // Checkout Demo Handler
  function initCheckoutDemo() {
    const checkoutBtn = document.getElementById('proceedCheckoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
          showToast('Your cart is empty!', 'error');
          return;
        }
        closeCartDrawer();
        const checkoutModal = document.getElementById('checkoutDemoModal');
        if (checkoutModal) {
          checkoutModal.classList.add('active');
        } else {
          showToast('Order demonstration placed successfully!', 'success');
        }
      });
    }
  }

  // =========================================================================
  // THEME & RTL SWITCHER SYSTEM
  // =========================================================================
  const THEME_KEY = 'mediora_theme_mode';
  const DIR_KEY = 'mediora_direction';

  function initThemeAndRTL() {
    // Check saved theme
    try {
      const savedTheme = localStorage.getItem(THEME_KEY) || localStorage.getItem('pharmacare_theme_mode');
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeToggleUI(true);
      } else {
        document.documentElement.removeAttribute('data-theme');
        updateThemeToggleUI(false);
      }
    } catch (e) {
      console.warn('Storage read failed:', e);
    }

    // Check saved direction
    try {
      const savedDir = localStorage.getItem(DIR_KEY) || localStorage.getItem('pharmacare_direction');
      if (savedDir === 'rtl') {
        document.documentElement.setAttribute('dir', 'rtl');
        updateRTLToggleUI(true);
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
        updateRTLToggleUI(false);
      }
    } catch (e) {
      console.warn('Storage read failed:', e);
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem(THEME_KEY, 'light'); } catch (e) {}
      updateThemeToggleUI(false);
      showToast('Switched to Light Mode', 'info');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem(THEME_KEY, 'dark'); } catch (e) {}
      updateThemeToggleUI(true);
      showToast('Switched to Dark Mode', 'info');
    }
  }

  function updateThemeToggleUI(isDark) {
    const btns = document.querySelectorAll('.theme-toggle-btn');
    btns.forEach(btn => {
      const icon = btn.querySelector('.theme-icon') || btn.querySelector('i');
      const text = btn.querySelector('.toggle-text');
      if (isDark) {
        if (icon) {
          icon.className = 'fa-solid fa-sun theme-icon';
          icon.style.color = '#FBBF24';
        }
        if (text) text.textContent = 'Light';
        btn.setAttribute('title', 'Switch to Light Mode');
      } else {
        if (icon) {
          icon.className = 'fa-solid fa-moon theme-icon';
          icon.style.color = '';
        }
        if (text) text.textContent = 'Dark';
        btn.setAttribute('title', 'Switch to Dark Mode');
      }
    });
  }

  function toggleRTL() {
    const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
    if (isRTL) {
      document.documentElement.setAttribute('dir', 'ltr');
      try { localStorage.setItem(DIR_KEY, 'ltr'); } catch (e) {}
      updateRTLToggleUI(false);
      showToast('Switched to LTR Layout', 'info');
    } else {
      document.documentElement.setAttribute('dir', 'rtl');
      try { localStorage.setItem(DIR_KEY, 'rtl'); } catch (e) {}
      updateRTLToggleUI(true);
      showToast('Switched to RTL Layout (Right-to-Left)', 'info');
    }
  }

  function updateRTLToggleUI(isRTL) {
    const btns = document.querySelectorAll('.rtl-toggle-btn');
    btns.forEach(btn => {
      const text = btn.querySelector('.toggle-text');
      if (isRTL) {
        if (text) text.textContent = 'LTR';
        btn.classList.add('active-rtl');
        btn.setAttribute('title', 'Switch to LTR Layout');
      } else {
        if (text) text.textContent = 'RTL';
        btn.classList.remove('active-rtl');
        btn.setAttribute('title', 'Switch to RTL Layout');
      }
    });
  }

  // Run immediate direction and theme application to prevent flash
  initThemeAndRTL();

  // Global App Object Exposed
  window.PharmaApp = {
    addToCart,
    updateQty,
    removeFromCart,
    openCartDrawer,
    closeCartDrawer,
    openQuickView,
    closeModal,
    openAuthModal,
    switchAuthTab,
    togglePasswordVisibility,
    showToast,
    toggleTheme,
    toggleRTL
  };

  // Medicine Batch Verification Helper
  window.verifyMedicineBatch = function() {
    const input = document.getElementById('batchVerifyInput');
    const val = input ? input.value.trim() : '';
    if (!val) {
      window.PharmaApp.showToast('Please enter a medicine batch or lot number', 'warning');
      return;
    }
    window.PharmaApp.showToast(`Batch #${val} Verified: 100% Genuine, Monitored Cold-Chain Dispatched!`, 'success');
    if (input) input.value = '';
  };

  // DOM Loaded Init
  document.addEventListener('DOMContentLoaded', () => {
    initThemeAndRTL();
    initStickyHeader();
    updateCartUI();
    initMobileNav();
    initAccountDropdown();
    initSearchHandlers();
    initPrescriptionUpload();
    initFaqAccordions();
    initCheckoutDemo();

    // Backdrop click listener to close modals
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    // Cart overlay click listener
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartOverlay) {
      cartOverlay.addEventListener('click', closeCartDrawer);
    }
  });

})();
