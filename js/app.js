/* LAYL store — каталог, корзина, оформление заказа в WhatsApp / Telegram */
(() => {
  const C = window.LAYL_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const byId = id => C.products.find(p => p.id === id);

  /* ---------- Валюта ---------- */
  const CUR_KEY = 'layl-currency';
  let cur = C.defaultCurrency;
  try { const s = localStorage.getItem(CUR_KEY); if (C.currencies[s]) cur = s; } catch {}
  // цены в config.js указаны в базовой валюте (тенге)
  const convert = (kzt, code = cur) => {
    const c = C.currencies[code];
    return Math.round(kzt / c.rate / c.roundTo) * c.roundTo;
  };
  const fmt = (n, code = cur) => {
    const s = C.currencies[code].symbol, v = n.toLocaleString('ru-RU');
    return code === 'USD' ? `${s}${v}` : `${v} ${s}`;
  };
  const money = (kzt, code = cur) => fmt(convert(kzt, code), code);
  const curSelect = $('#currency');
  curSelect.innerHTML = Object.entries(C.currencies).map(([k, c]) => `<option value="${k}">${c.label}</option>`).join('');
  curSelect.value = cur;
  curSelect.addEventListener('change', () => {
    cur = curSelect.value;
    try { localStorage.setItem(CUR_KEY, cur); } catch {}
    renderGrid(); renderCart();
    if (current) $('#pm-price').textContent = money(current.price);
  });

  /* ---------- Тема: системная / светлая / тёмная ---------- */
  const THEME_KEY = 'layl-theme';
  const themeBtn = $('#theme-toggle');
  const themeNames = { system: 'как в системе', light: 'светлая', dark: 'тёмная' };
  let theme = document.documentElement.dataset.theme || 'system';
  const applyTheme = () => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    themeBtn.querySelectorAll('[data-icon]').forEach(i => { i.hidden = i.dataset.icon !== theme; });
    themeBtn.setAttribute('aria-label', `Тема: ${themeNames[theme]}. Нажмите, чтобы сменить`);
    themeBtn.title = `Тема: ${themeNames[theme]}`;
  };
  themeBtn.addEventListener('click', () => {
    theme = { system: 'light', light: 'dark', dark: 'system' }[theme];
    try { theme === 'system' ? localStorage.removeItem(THEME_KEY) : localStorage.setItem(THEME_KEY, theme); } catch {}
    applyTheme();
    toast(`Тема: ${themeNames[theme]}`);
  });
  applyTheme();

  /* ---------- Хранилище корзины ---------- */
  let current = null;
  const KEY = 'layl-cart-v1';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch { cart = []; }
  cart = cart.filter(i => byId(i.id));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} };

  /* ---------- Статичные тексты ---------- */
  $('#announce-text').textContent = C.announcement;
  $('#year').textContent = new Date().getFullYear();
  $('#footer-wa').href = C.whatsappLink || `https://wa.me/${C.whatsappNumber}`;
  $('#footer-tg').href = `https://t.me/${C.telegramUsername}`;
  $('#f-delivery').innerHTML = C.deliveryOptions.map(o => `<option>${o}</option>`).join('');


  /* ---------- Каталог ---------- */
  let activeCat = 'all';
  const filters = $('#filters');
  filters.innerHTML = C.categories.map(c => `<button class="chip" data-cat="${c.id}" aria-pressed="${c.id === 'all'}">${c.label}</button>`).join('');
  const setCat = cat => {
    activeCat = cat;
    filters.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
    renderGrid();
  };
  filters.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setCat(b.dataset.cat); });
  document.querySelectorAll('[data-cat-link]').forEach(a => a.addEventListener('click', () => setCat(a.dataset.catLink)));

  function renderGrid() {
    const items = C.products.filter(p => activeCat === 'all' || p.category === activeCat);
    $('#product-grid').innerHTML = items.map(p => `
      <li>
        <button class="card" data-open="${p.id}" aria-label="${p.name}, ${money(p.price)}. Выбрать размер">
          <div class="card__media">
            <img src="${p.image}" alt="" loading="lazy" width="400" height="500">
            ${p.badge ? `<span class="card__badge">${p.badge}</span>` : ''}
          </div>
          <div class="card__body">
            <span class="card__title">${p.name}</span>
            <span class="card__sub">${p.subtitle}</span>
            <span class="card__price">${money(p.price)}</span>
          </div>
        </button>
      </li>`).join('');
  }
  renderGrid();

  /* ---------- Карточка товара ---------- */
  const pm = $('#product-modal');
  let size = null, qty = 1;
  $('#product-grid').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openProduct(b.dataset.open); });

  function openProduct(id) {
    current = byId(id); size = null; qty = 1;
    $('#pm-img').src = current.image;
    $('#pm-img').alt = `${current.name} — ${current.subtitle}`;
    $('#pm-title').textContent = current.name;
    $('#pm-subtitle').textContent = current.subtitle;
    $('#pm-price').textContent = money(current.price);
    $('#pm-desc').textContent = current.description;
    $('#pm-qty').textContent = qty;
    $('#pm-size-error').hidden = true;
    $('#pm-sizes').innerHTML = current.sizes.map(s => `<button type="button" class="size" aria-pressed="false" data-size="${s}">${s}</button>`).join('');
    pm.showModal();
  }
  $('#pm-sizes').addEventListener('click', e => {
    const b = e.target.closest('.size'); if (!b) return;
    size = b.dataset.size;
    $('#pm-sizes').querySelectorAll('.size').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#pm-size-error').hidden = true;
  });
  $('#pm-minus').onclick = () => { qty = Math.max(1, qty - 1); $('#pm-qty').textContent = qty; };
  $('#pm-plus').onclick = () => { qty = Math.min(10, qty + 1); $('#pm-qty').textContent = qty; };
  $('#pm-add').onclick = () => {
    if (!size) { $('#pm-size-error').hidden = false; $('#pm-sizes .size').focus(); return; }
    const line = cart.find(i => i.id === current.id && i.size === size);
    line ? (line.qty = Math.min(10, line.qty + qty)) : cart.push({ id: current.id, size, qty });
    save(); renderCart(); pm.close();
    toast(`${current.name} (${size}) добавлен в корзину`);
  };

  /* ---------- Диалоги: закрытие ---------- */
  document.querySelectorAll('dialog').forEach(d => {
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

  function renderCart() {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const badge = $('#cart-count');
    badge.hidden = !count; badge.textContent = count;
    $('#cart-open').setAttribute('aria-label', count ? `Открыть корзину, товаров: ${count}` : 'Открыть корзину');
    $('#cart-list').innerHTML = cart.map((i, n) => {
      const p = byId(i.id);
      return `<li class="cart-item">
        <div class="cart-item__img"><img src="${p.image}" alt=""></div>
        <div>
          <p class="cart-item__name">${p.name}</p>
          <p class="cart-item__meta">Размер ${i.size} · ${money(p.price)}</p>
          <div class="qty">
            <button type="button" class="qty__btn" data-dec="${n}" aria-label="Уменьшить количество ${p.name}">−</button>
            <output>${i.qty}</output>
            <button type="button" class="qty__btn" data-inc="${n}" aria-label="Увеличить количество ${p.name}">+</button>
          </div>
        </div>
        <button type="button" class="cart-item__remove" data-del="${n}">Удалить</button>
      </li>`;
    }).join('');
    $('#cart-empty').hidden = cart.length > 0;
    $('#cart-foot').hidden = cart.length === 0;
    $('#cart-total').textContent = money(total());
    $('#cart-total-note').textContent = cur !== C.baseCurrency ? `${money(total(), C.baseCurrency)} по курсу` : '';
    $('#cart-total-note').hidden = cur === C.baseCurrency;
    if (!cart.length) showCartView();
  }
  const total = () => cart.reduce((s, i) => s + byId(i.id).price * i.qty, 0);

  $('#cart-list').addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    const { inc, dec, del } = t.dataset;
    if (inc != null) cart[inc].qty = Math.min(10, cart[inc].qty + 1);
    if (dec != null) cart[dec].qty = Math.max(1, cart[dec].qty - 1);
    if (del != null) cart.splice(del, 1);
    save(); renderCart();
  });

  function showCartView() {
    $('#cart-view').hidden = false; $('#checkout').hidden = true;
    $('#to-checkout').hidden = false; $('#send-order').hidden = true;
    $('#cart-title').textContent = 'Корзина';
  }
  $('#to-checkout').onclick = () => {
    $('#cart-view').hidden = true; $('#checkout').hidden = false;
    $('#to-checkout').hidden = true; $('#send-order').hidden = false;
    $('#cart-title').textContent = 'Оформление';
    $('#f-name').focus();
  };
  $('#back-to-cart').onclick = showCartView;
  renderCart();

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
    const order = {
      id: orderId(),
      createdAt: new Date().toISOString(),
      customer: { name: data.name.trim(), phone: data.phone.trim(), city: data.city.trim(), address: data.address.trim(), delivery: data.delivery, comment: data.comment.trim() },
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
      toast('Открываем WhatsApp — нажмите «Отправить» в чате');
    } else {
      copy(text);
      window.open(`https://t.me/${C.telegramUsername}`, '_blank', 'noopener');
      toast('Заказ скопирован. Вставьте его в чат Telegram и отправьте', 6000);
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
      `Здравствуйте! Новый заказ ${o.id} на сайте ${C.brand}`,
      '',
      ...o.items.map((i, n) => `${n + 1}. ${i.name} — размер ${i.size} × ${i.qty} = ${money(i.price * i.qty)}`),
      '',
      `Итого: ${money(o.total)}` + (cur !== C.baseCurrency ? ` (${money(o.total, C.baseCurrency)})` : ''),
      '',
      `Имя: ${o.customer.name}`,
      `Телефон: ${o.customer.phone}`,
      `Город: ${o.customer.city}`,
      `Доставка: ${o.customer.delivery}`,
    ];
    if (o.customer.address) lines.push(`Адрес: ${o.customer.address}`);
    if (o.customer.comment) lines.push(`Комментарий: ${o.customer.comment}`);
    return lines.join('\n');
  }
  function orderId() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `L${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).catch(() => fallback()); return; }
    fallback();
    function fallback() {
      const t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch {}
      t.remove();
    }
  }

  /* ---------- Уведомление ---------- */
  let toastTimer;
  function toast(msg, ms = 3000) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }
})();
