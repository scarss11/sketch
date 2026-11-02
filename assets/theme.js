/* Hagane — interacciones básicas */
(function () {
  document.documentElement.classList.remove('no-js');

  // Menú hamburguesa
  function setMenu(toggle, open) {
    var nav = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? toggle.dataset.labelClose : toggle.dataset.labelOpen);
    nav.classList.toggle('is-open', open);
  }

  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-menu-toggle]');
    if (toggle) {
      setMenu(toggle, toggle.getAttribute('aria-expanded') !== 'true');
      return;
    }
    // Cerrar al hacer clic fuera del encabezado
    var openToggle = document.querySelector('[data-menu-toggle][aria-expanded="true"]');
    if (openToggle && !e.target.closest('[data-header]')) setMenu(openToggle, false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var toggle = document.querySelector('[data-menu-toggle][aria-expanded="true"]');
    if (!toggle) return;
    setMenu(toggle, false);
    toggle.focus();
  });

  // Ocultar encabezado al bajar, mostrarlo al subir
  var header = document.querySelector('[data-header][data-hide-on-scroll]');
  if (header) {
    var wrapper = header.closest('.shopify-section, .shopify-section-group-header-group') || header.parentElement;
    var lastY = window.scrollY;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var y = window.scrollY;
        var menuOpen = header.querySelector('[data-menu-toggle][aria-expanded="true"]');
        if (Math.abs(y - lastY) > 6) {
          var hide = y > lastY && y > header.offsetHeight + 40 && !menuOpen;
          wrapper.classList.toggle('is-hidden', hide);
          lastY = y;
        }
        ticking = false;
      });
    }, { passive: true });
    // Si alguien navega con teclado dentro del encabezado, mostrarlo
    header.addEventListener('focusin', function () { wrapper.classList.remove('is-hidden'); });
  }

  // Cantidad +/-
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-qty]');
    if (!btn) return;
    var input = btn.parentElement.querySelector('input');
    var val = parseInt(input.value, 10) || 1;
    var min = parseInt(input.min, 10);
    if (isNaN(min)) min = 1;
    val = btn.dataset.qty === 'plus' ? val + 1 : Math.max(min, val - 1);
    input.value = val;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Selector de variantes
  document.querySelectorAll('[data-product-form]').forEach(function (form) {
    var dataEl = form.querySelector('[data-variants]');
    if (!dataEl) return;
    var variants = JSON.parse(dataEl.textContent);
    var idInput = form.querySelector('input[name="id"]');
    var submit = form.querySelector('[type="submit"]');
    var priceEl = document.querySelector('[data-product-price]');
    var compareEl = document.querySelector('[data-product-compare]');
    var money = form.dataset.moneyFormat || '${{amount}}';

    function formatMoney(cents) {
      var amount = (cents / 100).toFixed(2);
      var parts = amount.split('.');
      var withCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return money
        .replace(/\{\{\s*amount_no_decimals\s*\}\}/, withCommas)
        .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + parts[1])
        .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
        .replace(/\{\{\s*amount\s*\}\}/, withCommas + '.' + parts[1]);
    }

    form.addEventListener('change', function (e) {
      if (!e.target.matches('[data-option-index]')) return;
      var selected = [];
      form.querySelectorAll('fieldset[data-option-position]').forEach(function (fs) {
        var checked = fs.querySelector('input:checked');
        selected.push(checked ? checked.value : null);
      });
      var match = variants.find(function (v) {
        return v.options.every(function (o, i) { return o === selected[i]; });
      });
      if (!match) {
        submit.disabled = true;
        submit.textContent = submit.dataset.unavailable;
        return;
      }
      idInput.value = match.id;
      submit.disabled = !match.available;
      submit.textContent = match.available ? submit.dataset.add : submit.dataset.soldout;
      if (priceEl) priceEl.textContent = formatMoney(match.price);
      if (compareEl) {
        var onSale = match.compare_at_price && match.compare_at_price > match.price;
        compareEl.textContent = onSale ? formatMoney(match.compare_at_price) : '';
        compareEl.hidden = !onSale;
      }
      var url = new URL(window.location.href);
      url.searchParams.set('variant', match.id);
      window.history.replaceState({}, '', url.toString());
    });
  });
})();
