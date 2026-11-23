/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : โหลดสินค้า, ปุ่มกรอง mood, ปุ่มสั่งซื้อ
   - order.html   : เติมข้อมูลจาก URL ลงฟอร์ม, ส่งออเดอร์ไป Apps Script
   - admin.html   : อ่าน CSV จาก Google Sheet มาแสดงเป็นตาราง
   สคริปต์ตรวจจากว่าหน้านั้นมี element ไหน แล้วทำงานเฉพาะส่วนนั้น
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     ค่าคงที่
     ------------------------------------------------------------------------ */
  var PRODUCTS_URL = 'products.json';

  var ORDER_ENDPOINT =
    'https://script.google.com/macros/s/AKfycby_aADTX-B3n7R1xbjD8b8bscj_uVIG485T_FHRI8gmyBQmw8Wq4Eaqy0nHrOEIxBtG/exec';

  var ORDERS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSx1jPGJrTmumvSd4C_pqKsmDND7W7ayPGhtqrZlxi93N3MZoBV3hWIH3Yl-qVoSDJplIlSc7LTkmdD/pub?gid=0&single=true&output=csv';

  var MOODS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  var MOOD_LABELS = {
    fresh: 'Fresh',
    sweet: 'Sweet',
    confident: 'Confident',
    romance: 'Romance'
  };

  /* ------------------------------------------------------------------------
     ตัวช่วย
     ------------------------------------------------------------------------ */
  function $(selector) {
    return document.querySelector(selector);
  }

  // สร้าง element (ใช้ textContent เสมอ ไม่ใช้ innerHTML กับข้อมูลภายนอก)
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatNumber(value) {
    var n = Number(String(value).replace(/,/g, ''));
    return isFinite(n) ? n.toLocaleString('th-TH') : String(value);
  }

  /* ========================================================================
     1. หน้า product.html
     ======================================================================== */
  function initProductPage() {
    var filterBar = $('#filter-bar');
    var list = $('#product-list');
    if (!filterBar || !list) return;

    var products = [];
    var currentMood = 'all';

    // อ่าน ?mood=xxx (ถ้าไม่ตรงกับ mood ที่มี ให้แสดงทั้งหมด)
    var moodParam = (new URLSearchParams(window.location.search).get('mood') || '').toLowerCase();
    if (MOOD_LABELS[moodParam]) currentMood = moodParam;

    function buildFilterBar() {
      filterBar.textContent = '';
      filterBar.classList.add('filters');

      MOODS.forEach(function (mood) {
        var btn = el('button', 'filter' + (mood.key === 'all' ? '' : ' mood--' + mood.key));
        btn.type = 'button';
        btn.dataset.mood = mood.key;

        if (mood.key !== 'all') btn.appendChild(el('span', 'mood-dot'));
        btn.appendChild(document.createTextNode(mood.label));

        btn.addEventListener('click', function () {
          setMood(mood.key);
        });
        filterBar.appendChild(btn);
      });
    }

    function updateFilterState() {
      filterBar.querySelectorAll('.filter').forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.dataset.mood === currentMood ? 'true' : 'false');
      });
    }

    function setMood(mood) {
      currentMood = mood;
      updateFilterState();
      render();

      // อัปเดต URL ให้แชร์ลิงก์ที่กรองแล้วได้ (ไม่เพิ่มประวัติย้อนกลับ)
      var url = new URL(window.location.href);
      if (mood === 'all') url.searchParams.delete('mood');
      else url.searchParams.set('mood', mood);
      window.history.replaceState(null, '', url);
    }

    function buildOrderLink(product) {
      var itemName = [product.name, product.size].filter(Boolean).join(' ');
      var params = new URLSearchParams();
      params.set('item', itemName);
      params.set('price', product.price);
      return 'order.html?' + params.toString();
    }

    function buildCard(product) {
      var card = el('article', 'product-card mood--' + product.mood);

      var media = el('div', 'product-card__media');
      var img = el('img');
      img.src = product.image;
      img.alt = product.name;
      img.loading = 'lazy';
      media.appendChild(img);
      card.appendChild(media);

      var body = el('div', 'product-card__body');

      var label = el('span', 'mood-label');
      label.appendChild(el('span', 'mood-dot'));
      label.appendChild(document.createTextNode(MOOD_LABELS[product.mood] || product.mood));
      body.appendChild(label);

      body.appendChild(el('h3', 'product-card__name', product.name));
      body.appendChild(el('p', 'product-card__meta', product.size || 'โรลออน'));

      var footer = el('div', 'product-card__footer');
      var price = el('span', 'price', formatNumber(product.price) + ' ');
      price.appendChild(el('small', null, 'บาท'));
      footer.appendChild(price);

      var order = el('a', 'btn btn--small', 'สั่งซื้อ');
      order.href = buildOrderLink(product);
      footer.appendChild(order);

      body.appendChild(footer);
      card.appendChild(body);
      return card;
    }

    function render() {
      list.textContent = '';
      list.classList.add('product-grid');

      var visible = products.filter(function (p) {
        return currentMood === 'all' || p.mood === currentMood;
      });

      if (visible.length === 0) {
        list.appendChild(el('p', null, 'ไม่พบสินค้าในหมวดนี้'));
        return;
      }

      visible.forEach(function (p) {
        list.appendChild(buildCard(p));
      });
    }

    buildFilterBar();
    updateFilterState();
    list.appendChild(el('p', null, 'กำลังโหลดสินค้า...'));

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        render();
      })
      .catch(function (error) {
        console.error(error);
        list.textContent = '';
        list.appendChild(el('p', null, 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง'));
      });
  }

  /* ========================================================================
     2. หน้า order.html
     ======================================================================== */
  function initOrderPage() {
    var form = $('#orderForm');
    if (!form) return;

    var itemsField = $('#items');
    var totalField = $('#total');

    // เติมชื่อสินค้าและราคาจาก URL parameter ทันทีที่โหลดหน้า
    var params = new URLSearchParams(window.location.search);
    var item = params.get('item');
    var price = params.get('price');

    if (itemsField && item) itemsField.value = item;
    if (totalField && price) totalField.value = price;

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var payload = {
        customerName: $('#customerName').value.trim(),
        contact: $('#contact').value.trim(),
        items: $('#items').value.trim(),
        total: $('#total').value.trim(),
        note: $('#note').value.trim()
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
        .then(() => { window.location.href = 'thankyou.html'; })
        .catch(error => {
          console.error(error);
          alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ========================================================================
     3. หน้า admin.html
     ======================================================================== */

  // parse CSV เอง: รองรับ "..." ที่มี comma / ขึ้นบรรทัดใหม่ / "" (quote ซ้อน) ในช่อง
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }

    // แถวสุดท้าย (กรณีไฟล์ไม่ลงท้ายด้วยขึ้นบรรทัดใหม่)
    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่างทิ้ง
    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ''; });
    });
  }

  function initAdminPage() {
    var tbody = $('#ordersTable tbody');
    if (!tbody) return;

    var COLUMNS = 6;

    function showMessage(message) {
      tbody.textContent = '';
      var tr = el('tr');
      var td = el('td', null, message);
      td.colSpan = COLUMNS;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage('กำลังโหลดข้อมูล...');

    fetch(ORDERS_CSV_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);

        // แถวแรกคือหัวคอลัมน์ ตัดทิ้ง
        var orders = rows.slice(1);
        if (orders.length === 0) {
          showMessage('ยังไม่มีรายการสั่งซื้อ');
          return;
        }

        // รายการใหม่อยู่ท้ายชีต จึงกลับลำดับให้ล่าสุดขึ้นก่อน
        orders.reverse();

        tbody.textContent = '';
        orders.forEach(function (cols) {
          var tr = el('tr');
          // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
          for (var i = 0; i < COLUMNS; i++) {
            var value = cols[i] !== undefined ? cols[i] : '';
            if (i === 4 && value !== '') value = formatNumber(value) + ' บาท';
            tr.appendChild(el('td', null, value));
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage('โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง');
      });
  }

  /* ------------------------------------------------------------------------
     เริ่มทำงาน
     ------------------------------------------------------------------------ */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
