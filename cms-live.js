/* DEVI GROUPS - Live CMS */
(() => {
  const SUPABASE_URL = 'https://bgkymxdbmvbplnlehakd.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_J3m0j2EknLIDDQW9ZRLJ-Q_FxOlUFN7';

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const $ = (s) => document.querySelector(s);

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setText(el, value) {
    if (el) el.textContent = value ?? '';
  }

  async function applyContent() {
    try {
      const { data, error } = await client
        .from('site_content')
        .select('*')
        .eq('active', true);

      if (error) throw error;

      if (!data) return;

      data.forEach((r) => {
        const key = r.key || r.section_key;

        if (!key) return;

        const els = document.querySelectorAll(`[data-cms="${key}"]`);

        els.forEach((el) => {
          const raw = r.content;
          let visual = null;

          // Visual Admin stores a serialized element patch in content.
          if (typeof raw === 'string' && raw.trim().startsWith('{')) {
            try { visual = JSON.parse(raw); } catch (_) { visual = null; }
          }

          if (visual && typeof visual === 'object') {
            const target = visual.key ? document.getElementById(String(visual.key)) : el;
            if (!target) return;
            const tag = target.tagName.toLowerCase();
            if (Object.prototype.hasOwnProperty.call(visual, 'text') && !['img','video','source'].includes(tag)) {
              target.textContent = String(visual.text ?? '');
            }
            if (Object.prototype.hasOwnProperty.call(visual, 'src') && ['img','video','source'].includes(tag)) {
              if (visual.src) target.setAttribute('src', String(visual.src));
              else target.removeAttribute('src');
            }
            if (Object.prototype.hasOwnProperty.call(visual, 'href') && (tag === 'a' || tag === 'area')) {
              if (visual.href) target.setAttribute('href', String(visual.href));
              else target.removeAttribute('href');
            }
            if (Object.prototype.hasOwnProperty.call(visual, 'alt') && tag === 'img') target.setAttribute('alt', String(visual.alt ?? ''));
            if (Object.prototype.hasOwnProperty.call(visual, 'title')) target.setAttribute('title', String(visual.title ?? ''));
            if (Object.prototype.hasOwnProperty.call(visual, 'hidden')) target.hidden = Boolean(visual.hidden);
          } else if (raw !== null && raw !== undefined) {
            // Treat database content as text, not executable HTML.
            el.textContent = String(raw);
          } else if (r.title) {
            el.textContent = r.title;
          }
        });
      });
    } catch (e) {
      console.warn('CMS content load skipped:', e);
    }
  }

  async function applyCompany() {
    try {
      const { data, error } = await client
        .from('company_info')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return;

      document.querySelectorAll('[data-company="company_name"]').forEach((el) => {
        el.textContent = data.company_name || '';
      });

      document.querySelectorAll('[data-company="owner_name"]').forEach((el) => {
        el.textContent = data.owner_name || '';
      });

      document.querySelectorAll('[data-company="email"]').forEach((el) => {
        el.textContent = data.email || '';
      });

      document.querySelectorAll('[data-company="phone"]').forEach((el) => {
        el.textContent = data.phone || '';
      });

      document.querySelectorAll('[data-company="whatsapp"]').forEach((el) => {
        el.textContent = data.whatsapp || '';
      });

      document.querySelectorAll('[data-company="website"]').forEach((el) => {
        el.textContent = data.website || '';
      });

      document.querySelectorAll('[data-company="address"]').forEach((el) => {
        el.textContent = data.address || '';
      });

      document.querySelectorAll('[data-company="india_office"]').forEach((el) => {
        el.textContent = data.india_office || '';
      });

      document.querySelectorAll('[data-company="kenya_office"]').forEach((el) => {
        el.textContent = data.kenya_office || '';
      });

      document.querySelectorAll('[data-company="description"]').forEach((el) => {
        el.textContent = data.description || '';
      });
    } catch (e) {
      console.warn('CMS company load skipped:', e);
    }
  }

  async function applyBusinessUnits() {
    try {
      const { data, error } = await client
        .from('business_units')
        .select('*')
        .order('name');

      if (error) throw error;
      if (!data) return;

      const containers = document.querySelectorAll('[data-business-units]');

      containers.forEach((container) => {
        container.innerHTML = data
          .map(
            (r) => `
              <div class="business-unit">
                ${
                  r.image_url
                    ? `<img src="${esc(r.image_url)}" alt="${esc(r.name || '')}">`
                    : ''
                }
                <h3>${esc(r.name || '')}</h3>
                <p>${esc(r.description || '')}</p>
                ${
                  r.website
                    ? `<a href="${esc(r.website)}" target="_blank" rel="noopener">Visit Website</a>`
                    : ''
                }
              </div>
            `
          )
          .join('');
      });
    } catch (e) {
      console.warn('CMS business units load skipped:', e);
    }
  }

  async function applyProducts() {
    try {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      if (!data) return;

      const containers = document.querySelectorAll('[data-products]');

      containers.forEach((container) => {
        container.innerHTML = data
          .map(
            (r) => `
              <div class="product-item">
                ${
                  r.image_url
                    ? `<img src="${esc(r.image_url)}" alt="${esc(r.name || '')}">`
                    : ''
                }
                <h3>${esc(r.name || '')}</h3>
                ${
                  r.product_code
                    ? `<div class="product-code">${esc(r.product_code)}</div>`
                    : ''
                }
                ${
                  r.category
                    ? `<div class="product-category">${esc(r.category)}</div>`
                    : ''
                }
                <p>${esc(r.description || '')}</p>
                ${
                  r.packing
                    ? `<div class="product-packing">${esc(r.packing)}</div>`
                    : ''
                }
                ${
                  r.brochure_url
                    ? `<a href="${esc(r.brochure_url)}" target="_blank" rel="noopener">Brochure</a>`
                    : ''
                }
              </div>
            `
          )
          .join('');
      });
    } catch (e) {
      console.warn('CMS products load skipped:', e);
    }
  }

  async function applyReviews() {
    try {
      const { data, error } = await client
        .from('reviews')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const active = data || [];
      const grid = $('#reviews-grid');

      if (!grid) return;

      grid.innerHTML = active
        .map(
          (r) => `
            <div class="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div class="text-amber-500 text-xs mb-2">
                ${'⭐'.repeat(Number(r.stars || r.rating || 0))}
              </div>

              <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-200 italic mb-4">
                "${esc(r.message || r.msg || r.review || '')}"
              </p>

              <strong class="text-xs font-bold text-slate-800 dark:text-white block">
                ${esc(r.name || '')}
              </strong>

              <span class="text-[10px] text-slate-500">
                ${esc(r.country || '')}
              </span>
            </div>
          `
        )
        .join('');
    } catch (e) {
      console.warn('CMS reviews load skipped:', e);
    }
  }

  async function patchTracking() {
    const original = window.trackShipment;

    window.trackShipment = async function () {
      const raw = $('#tracking-input')?.value.trim().toUpperCase();
      const err = $('#tracking-error');
      const res = $('#tracking-result');

      if (!raw) {
        if (err) {
          err.textContent = 'Please enter your Bill or Invoice Number.';
          err.classList.remove('hidden');
        }
        return;
      }

      try {
        const { data, error } = await client
          .from('tracking')
          .select('*')
          .ilike('tracking_number', raw)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          if (res) res.classList.add('hidden');

          if (err) {
            err.innerHTML = `Reference <strong>"${esc(
              raw
            )}"</strong> not found in live cargo records.`;

            err.classList.remove('hidden');
          }

          return;
        }

        if (err) err.classList.add('hidden');
        if (res) res.classList.remove('hidden');

        setText($('#tr-id'), data.tracking_number);
        setText($('#tr-item'), data.item || data.description || '');
        setText($('#tr-dest'), data.destination || '');
        setText(
          $('#tr-status-text'),
          'Live Status: ' + (data.status || '')
        );
        setText($('#tr-eta'), data.eta || '');
      } catch (e) {
        console.warn(
          'CMS tracking failed, using original:',
          e
        );

        if (typeof original === 'function') {
          return original();
        }
      }
    };
  }

  /*
   * REVIEW SUBMIT
   * FIXED:
   * Supabase reviews tableમાં "review" column NOT NULL છે.
   * તેથી હવે review અને message બંનેમાં review text save થશે.
   */

  window.handleReviewSubmit = async function (e) {
    e.preventDefault();

    const name =
      $('#rev-name')?.value.trim() || '';

    const country =
      $('#rev-country')?.value.trim() || '';

    const stars =
      Number($('#rev-rating')?.value || 0);

    const message =
      $('#rev-msg')?.value.trim() || '';

    if (!name || !stars || !message) {
      alert('Please complete your review.');
      return;
    }

    try {
      const { error } = await client
        .from('reviews')
        .insert({
          name: name,
          country: country,
          stars: stars,

          // FIX: databaseનું required "review" field
          review: message,

          // Websiteમાં existing field
          message: message,

          status: 'pending',
          active: false
        });

      if (error) {
        console.error('Review submit error:', error);
        throw error;
      }

      $('#review-form')?.reset();

      alert(
        'Thank you! Your review has been submitted for approval.'
      );
    } catch (err) {
      console.error(
        'Review submit error:',
        err
      );

      alert(
        err?.message ||
          'Unable to submit review.'
      );
    }
  };

  async function init() {
    await Promise.allSettled([
      applyContent(),
      applyCompany(),
      applyBusinessUnits(),
      applyProducts(),
      applyReviews()
    ]);

    patchTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
