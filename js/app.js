/* LAYL store — каталог, корзина, языки, валюты, тема, заказ в WhatsApp / Telegram */
(() => {
  const C = window.LAYL_CONFIG;
  const I = window.LAYL_I18N;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const byId = id => C.products.find(p => p.id === id);
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Язык ---------- */
  const LANG_KEY = 'layl-lang';
  const codes = I.languages.map(l => l.code);
  const pickLang = () => {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (codes.includes(fromUrl)) return fromUrl;
    const saved = store.get(LANG_KEY);
    if (codes.includes(saved)) return saved;
    for (const l of navigator.languages || [navigator.language]) {
      const base = (l || '').toLowerCase().split('-')[0];
      if (codes.includes(base)) return base;
    }
    return I.fallbackLang;
  };
  let lang = pickLang();
  const t = (key, vars = {}) => {
    let s = I.strings[lang]?.[key] ?? I.strings[I.defaultLang][key] ?? key;
    if (typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
    return s;
  };
  const pText = (p, field) => I.strings[lang]?.products?.[p.id]?.[field] ?? I.strings[I.defaultLang].products?.[p.id]?.[field] ?? p[field] ?? '';
  const numLocale = () => (lang === 'ar' ? 'ar-u-nu-latn' : lang);

  const langSelect = $('#lang');
  langSelect.innerHTML = I.languages.map(l => `<option value="${l.code}" title="${esc(l.name)}">${esc(l.label)}</option>`).join('');

  function applyLang() {
    const meta = I.languages.find(l => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir || 'ltr';
    langSelect.value = lang;
    document.title = t('metaTitle');
    $('meta[name="description"]').content = t('metaDesc');
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-lines]').forEach(el => { el.innerHTML = t(el.dataset.i18nLines).split('\n').map(esc).join('<br>'); });
    $$('[data-i18n-attr]').forEach(el => {
      el.dataset.i18nAttr.split(';').forEach(pair => { const [attr, key] = pair.split(':'); el.setAttribute(attr, t(key)); });
    });
    const delivery = t('delivery');
    const prev = $('#f-delivery').selectedIndex;
    $('#f-delivery').innerHTML = delivery.map((o, i) => `<option value="${i}">${esc(o)}</option>`).join('');
    $('#f-delivery').selectedIndex = Math.max(0, prev);
    renderFilters(); renderGrid(); renderCart(); applyTheme(false);
    if (current && pm.open) fillProduct();
    $('#cart-title').textContent = $('#checkout').hidden ? t('cartTitle') : t('checkoutTitle');
  }
  langSelect.addEventListener('change', () => {
    lang = langSelect.value;
    store.set(LANG_KEY, lang);
    const url = new URL(location.href); url.searchParams.delete('lang'); history.replaceState(null, '', url);
    applyLang();
  });

  /* ---------- Валюта ---------- */
  const CUR_KEY = 'layl-currency';
  let cur = C.currencies[store.get(CUR_KEY)] ? store.get(CUR_KEY) : C.defaultCurrency;
  const convert = (kzt, code = cur) => { const c = C.currencies[code]; return Math.round(kzt / c.rate / c.roundTo) * c.roundTo; };
  const fmt = (n, code = cur) => {
    const s = C.currencies[code].symbol, v = n.toLocaleString(numLocale());
    return code === 'USD' ? `${s}${v}` : `${v} ${s}`;
  };
  const money = (kzt, code = cur) => fmt(convert(kzt, code), code);
  const curSelect = $('#currency');
  curSelect.innerHTML = Object.entries(C.currencies).map(([k, c]) => `<option value="${k}">${esc(c.label)}</option>`).join('');
  curSelect.value = cur;
  curSelect.addEventListener('change', () => {
    cur = curSelect.value; store.set(CUR_KEY, cur);
    renderGrid(); renderCart();
    if (current) $('#pm-price').textContent = money(current.price);
  });

  /* ---------- Тема: системная / светлая / тёмная ---------- */
  const THEME_KEY = 'layl-theme';
  const themeBtn = $('#theme-toggle');
  const themeName = () => t({ system: 'themeSystem', light: 'themeLight', dark: 'themeDark' }[theme]);
  let theme = document.documentElement.dataset.theme || 'system';
  function applyTheme(announce) {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    themeBtn.querySelectorAll('[data-icon]').forEach(i => { i.hidden = i.dataset.icon !== theme; });
    themeBtn.setAttribute('aria-label', t('themeLabel', { name: themeName() }));
    themeBtn.title = t('themeToast', { name: themeName() });
    if (announce) toast(t('themeToast', { name: themeName() }));
  }
  themeBtn.addEventListener('click', () => {
    theme = { system: 'light', light: 'dark', dark: 'system' }[theme];
    store.set(THEME_KEY, theme === 'system' ? null : theme);
    applyTheme(true);
  });

  /* ---------- Хранилище корзины ---------- */
  const KEY = 'layl-cart-v1';
  let cart = [];
  try { cart = JSON.parse(store.get(KEY)) || []; } catch { cart = []; }
  cart = cart.filter(i => byId(i.id));
  const save = () => store.set(KEY, JSON.stringify(cart));
  let current = null;

  /* ---------- Статичные ссылки ---------- */
  $('#year').textContent = new Date().getFullYear();
  $('#footer-wa').href = C.whatsappLink || `https://wa.me/${C.whatsappNumber}`;
  $('#footer-tg').href = `https://t.me/${C.telegramUsername}`;

  /* ---------- Каталог ---------- */
  const catKey = { all: 'catAll', hoodies: 'catHoodies', pants: 'catPants', tees: 'catTees' };
  let activeCat = 'all';
  const filters = $('#filters');
  function renderFilters() {
    filters.innerHTML = C.categories.map(c => `<button class="chip" data-cat="${c.id}" aria-pressed="${c.id === activeCat}">${esc(catKey[c.id] ? t(catKey[c.id]) : c.label)}</button>`).join('');
  }
  const setCat = cat => { activeCat = cat; renderFilters(); renderGrid(); };
  filters.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setCat(b.dataset.cat); });
  $$('[data-cat-link]').forEach(a => a.addEventListener('click', () => setCat(a.dataset.catLink)));

  function renderGrid() {
    const items = C.products.filter(p => activeCat === 'all' || p.category === activeCat);
    $('#product-grid').innerHTML = items.map(p => `
      <li>
        <button class="card" data-open="${p.id}" aria-label="${esc(t('cardAria', { name: p.name, price: money(p.price) }))}">
          <div class="card__media">
            <img src="${p.image}" alt="" loading="lazy" width="400" height="500">
            ${p.badge ? `<span class="card__badge">${esc(t('badgeNew'))}</span>` : ''}
          </div>
          <div class="card__body">
            <span class="card__title">${esc(p.name)}</span>
            <span class="card__sub">${esc(pText(p, 'subtitle'))}</span>
            <span class="card__price">${money(p.price)}</span>
          </div>
        </button>
      </li>`).join('');
  }

  /* ---------- Карточка товара ---------- */
  const pm = $('#product-modal');
  let size = null, qty = 1;
  $('#product-grid').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openProduct(b.dataset.open); });

  function fillProduct() {
    $('#pm-img').src = current.image;
    $('#pm-img').alt = `${current.name} — ${pText(current, 'subtitle')}`;
    $('#pm-title').textContent = current.name;
    $('#pm-subtitle').textContent = pText(current, 'subtitle');
    $('#pm-price').textContent = money(current.price);
    $('#pm-desc').textContent = pText(current, 'description');
  }
  function openProduct(id) {
    current = byId(id); size = null; qty = 1;
    fillProduct();
    $('#pm-qty').textContent = qty;
    $('#pm-size-error').hidden = true;
    $('#pm-sizes').innerHTML = current.sizes.map(s => `<button type="button" class="size" aria-pressed="false" data-size="${s}">${s}</button>`).join('');
    pm.showModal();
  }
  $('#pm-sizes').addEventListener('click', e => {
    const b = e.target.closest('.size'); if (!b) return;
    size = b.dataset.size;
    $$('.size', $('#pm-sizes')).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#pm-size-error').hidden = true;
  });
  $('#pm-minus').onclick = () => { qty = Math.max(1, qty - 1); $('#pm-qty').textContent = qty; };
  $('#pm-plus').onclick = () => { qty = Math.min(10, qty + 1); $('#pm-qty').textContent = qty; };
  $('#pm-add').onclick = () => {
    if (!size) { $('#pm-size-error').hidden = false; $('#pm-sizes .size').focus(); return; }
    const line = cart.find(i => i.id === current.id && i.size === size);
    line ? (line.qty = Math.min(10, line.qty + qty)) : cart.push({ id: current.id, size, qty });
    save(); renderCart(); pm.close();
    toast(t('addedToast', { name: current.name, size }));
  };

  /* ---------- Диалоги: закрытие ---------- */
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) {
        d.close();
        if (e.target.closest('[data-goto-shop]')) $('#shop').scrollIntoView();
      }
    });
  });

  /* ---------- Корзина ---------- */
  const drawer = $('#cart-drawer');
  $('#cart-open').onclick = () => { showCartView(); drawer.showModal(); };
  const total = () => cart.reduce((s, i) => s + byId(i.id).price * i.qty, 0);

  function renderCart() {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const badge = $('#cart-count');
    badge.hidden = !count; badge.textContent = count;
    $('#cart-open').setAttribute('aria-label', count ? t('cartOpenCount', { n: count }) : t('cartOpen'));
    $('#cart-list').innerHTML = cart.map((i, n) => {
      const p = byId(i.id);
      return `<li class="cart-item">
        <div class="cart-item__img"><img src="${p.image}" alt=""></div>
        <div>
          <p class="cart-item__name">${esc(p.name)}</p>
          <p class="cart-item__meta">${esc(t('sizeLine', { size: i.size }))} · ${money(p.price)}</p>
          <div class="qty">
            <button type="button" class="qty__btn" data-dec="${n}" aria-label="${esc(t('qtyDec'))} — ${esc(p.name)}">−</button>
            <output>${i.qty}</output>
            <button type="button" class="qty__btn" data-inc="${n}" aria-label="${esc(t('qtyInc'))} — ${esc(p.name)}">+</button>
          </div>
        </div>
        <button type="button" class="cart-item__remove" data-del="${n}">${esc(t('remove'))}</button>
      </li>`;
    }).join('');
    $('#cart-empty').hidden = cart.length > 0;
    $('#cart-foot').hidden = cart.length === 0;
    $('#cart-total').textContent = money(total());
    const note = $('#cart-total-note');
    note.hidden = cur === C.baseCurrency;
    note.textContent = cur === C.baseCurrency ? '' : t('byRate', { amount: money(total(), C.baseCurrency) });
    if (!cart.length) showCartView();
  }

  $('#cart-list').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const { inc, dec, del } = b.dataset;
    if (inc != null) cart[inc].qty = Math.min(10, cart[inc].qty + 1);
    if (dec != null) cart[dec].qty = Math.max(1, cart[dec].qty - 1);
    if (del != null) cart.splice(del, 1);
    save(); renderCart();
  });

  function showCartView() {
    $('#cart-view').hidden = false; $('#checkout').hidden = true;
    $('#to-checkout').hidden = false; $('#send-order').hidden = true;
    $('#cart-title').textContent = t('cartTitle');
  }
  $('#to-checkout').onclick = () => {
    $('#cart-view').hidden = true; $('#checkout').hidden = false;
    $('#to-checkout').hidden = true; $('#send-order').hidden = false;
    $('#cart-title').textContent = t('checkoutTitle');
    $('#f-name').focus();
  };
  $('#back-to-cart').onclick = showCartView;

  /* ---------- Форма: проверка ---------- */
  const form = $('#checkout');
  const required = ['#f-name', '#f-phone', '#f-city'].map(s => $(s));
  const validate = input => {
    const ok = input.id === 'f-phone' ? input.value.replace(/\D/g, '').length >= 7 : input.value.trim().length > 1;
    input.setAttribute('aria-invalid', String(!ok));
    input.parentElement.querySelector('.error').hidden = ok;
    return ok;
  };
  required.forEach(i => {
    i.addEventListener('blur', () => i.value && validate(i));
    i.addEventListener('input', () => i.getAttribute('aria-invalid') === 'true' && validate(i));
  });

  /* ---------- Отправка заказа ---------- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = required.filter(i => !validate(i));
    if (bad.length) { bad[0].focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    const deliveryIdx = Number(data.delivery) || 0;
    const order = {
      id: orderId(),
      createdAt: new Date().toISOString(),
      lang,
      customer: {
        name: data.name.trim(), phone: data.phone.trim(), city: data.city.trim(), address: data.address.trim(),
        delivery: t('delivery')[deliveryIdx], deliveryRu: I.strings.ru.delivery[deliveryIdx], comment: data.comment.trim(),
      },
      channel: data.channel,
      items: cart.map(i => { const p = byId(i.id); return { id: p.id, name: p.name, size: i.size, qty: i.qty, price: p.price }; }),
      total: total(),                     // в тенге
      currency: C.baseCurrency,
      displayCurrency: cur,
      displayTotal: convert(total()),
    };
    const text = orderText(order);

    if (order.channel === 'whatsapp') {
      window.open(`https://wa.me/${C.whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      toast(t('waToast'));
    } else {
      copy(text);
      window.open(`https://t.me/${C.telegramUsername}`, '_blank', 'noopener');
      toast(t('tgToast'), 6000);
    }

    // Задел под Telegram-бота / CRM
    if (C.orderWebhookUrl) {
      fetch(C.orderWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) }).catch(() => {});
    }

    cart = []; save(); renderCart(); form.reset();
    setTimeout(() => drawer.close(), 400);
  });

  function orderText(o) {
    const lines = [
      t('orderHello', { id: o.id, brand: C.brand }),
      '',
      ...o.items.map((i, n) => t('orderLine', { n: n + 1, name: i.name, size: i.size, qty: i.qty, sum: money(i.price * i.qty) })),
      '',
      `${t('orderTotal')}: ${money(o.total)}` + (cur !== C.baseCurrency ? ` (${money(o.total, C.baseCurrency)})` : ''),
      '',
      `${t('orderName')}: ${o.customer.name}`,
      `${t('orderPhone')}: ${o.customer.phone}`,
      `${t('orderCity')}: ${o.customer.city}`,
      `${t('orderDelivery')}: ${o.customer.delivery}`,
    ];
    if (o.customer.address) lines.push(`${t('orderAddress')}: ${o.customer.address}`);
    if (o.customer.comment) lines.push(`${t('orderComment')}: ${o.customer.comment}`);
    if (lang !== 'ru') lines.push('', `${t('orderLang')}: ${I.languages.find(l => l.code === lang).name}`);
    return lines.join('\n');
  }
  function orderId() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `L${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
  function copy(text) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {}
      ta.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
  }

  /* ---------- Уведомление ---------- */
  let toastTimer;
  function toast(msg, ms = 3000) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  applyLang();
})();
