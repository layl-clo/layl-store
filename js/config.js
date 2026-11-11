/* =========================================================
   LAYL — настройки магазина. Меняйте только этот файл.
   ========================================================= */
window.LAYL_CONFIG = {
  brand: 'LAYL',

  // Куда приходят заказы
  whatsappNumber: '393520535073',                           // номер для заказов (без «+»)
  whatsappLink: 'https://wa.me/message/UUZS4644TCP7C1',     // ссылка из QR-кода бизнес-аккаунта
  telegramUsername: 'sjaiwx',

  // Будущий Telegram-бот / CRM: если указать URL, заказ дополнительно
  // отправится туда POST-запросом в формате JSON (см. README.md)
  orderWebhookUrl: '',

  // Валюты. Все цены товаров указаны в тенге (KZT) и пересчитываются по курсу.
  // rate = сколько тенге стоит 1 единица валюты. Курс Нацбанка РК на 11.11.2026.
  baseCurrency: 'KZT',
  defaultCurrency: 'KZT',
  currencies: {
    KZT: { symbol: '₸', rate: 1,      roundTo: 1,  label: 'KZT ₸' },
    USD: { symbol: '$', rate: 447.52, roundTo: 1,  label: 'USD $' },
    EUR: { symbol: '€', rate: 502.21, roundTo: 1,  label: 'EUR €' },
    RUB: { symbol: '₽', rate: 5.41,   roundTo: 10, label: 'RUB ₽' },
  },

  announcement: 'Заказ в WhatsApp или Telegram — ответим в течение часа',

  categories: [
    { id: 'all', label: 'Все' },
    { id: 'hoodies', label: 'Худи' },
    { id: 'pants', label: 'Штаны' },
    { id: 'tees', label: 'Футболки' },
  ],

  // Товары. price — в тенге.
  products: [
    {
      id: 'hurriya-hoodie',
      name: 'Hurriya Hoodie',
      subtitle: 'Чёрный · принт «حرية» на спине',
      category: 'hoodies',
      price: 14990,
      badge: 'Новинка',
      image: 'img/hurriya-hoodie.jpg',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      description: '«حرية» — по-арабски «свобода». Плотный хлопковый худи оверсайз, крупный принт на спине и подпись LAYL.',
    },
    {
      id: 'coldest-hoodie',
      name: 'Coldest Hoodie',
      subtitle: 'Чёрный · голубой каллиграфический принт',
      category: 'hoodies',
      price: 14990,
      badge: 'Новинка',
      image: 'img/coldest-hoodie.jpg',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      description: '«You just do it for yourself». Худи с каллиграфической надписью на спине и логотипом LAYL.',
    },
    {
      id: 'hurriya-pants',
      name: 'Hurriya Pants',
      subtitle: 'Чёрные · прямой крой',
      category: 'pants',
      price: 14990,
      badge: '',
      image: 'img/hurriya-pants.jpg',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      description: 'Широкие спортивные штаны на резинке с вертикальным принтом «حرية» по ноге. В комплект к худи Hurriya.',
    },
    {
      id: 'signature-hoodie',
      name: 'Signature Hoodie',
      subtitle: 'Чёрный · логотип на груди',
      category: 'hoodies',
      price: 14990,
      badge: '',
      image: 'img/signature-hoodie.jpg',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      description: 'Базовый худи с карманом-кенгуру и белым логотипом LAYL на груди.',
    },
    {
      id: 'signature-tee',
      name: 'Signature Tee',
      subtitle: 'Белая · логотип на груди',
      category: 'tees',
      price: 14990,
      badge: '',
      image: 'img/signature-tee.jpg',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      description: 'Плотная белая футболка свободного кроя с чёрным логотипом LAYL.',
    },
  ],

  deliveryOptions: ['Курьер', 'Почта', 'Самовывоз'],
};
