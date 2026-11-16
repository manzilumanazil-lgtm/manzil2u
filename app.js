function makeArchSvgDataUri(titleText, bgHex1, bgHex2, accentHex) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" width="800" height="520">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${bgHex1}"/>
            <stop offset="100%" stop-color="${bgHex2}"/>
          </linearGradient>
        </defs>
        <rect width="800" height="520" fill="url(#g)"/>
        <rect x="60" y="70" width="680" height="380" rx="22" fill="none" stroke="${accentHex}" stroke-width="2" stroke-opacity="0.35"/>
        <path d="M140 420 L140 190 L290 120 L440 190 L440 420 Z" fill="${accentHex}" fill-opacity="0.12" stroke="${accentHex}" stroke-width="3"/>
        <path d="M380 420 L380 150 L530 95 L660 150 L660 420 Z" fill="#FFFFFF" fill-opacity="0.07" stroke="${accentHex}" stroke-width="2.5"/>
        <rect x="190" y="220" width="45" height="65" rx="6" fill="${accentHex}" fill-opacity="0.45"/>
        <rect x="265" y="220" width="45" height="65" rx="6" fill="${accentHex}" fill-opacity="0.45"/>
        <rect x="190" y="310" width="45" height="65" rx="6" fill="${accentHex}" fill-opacity="0.3"/>
        <rect x="265" y="310" width="45" height="65" rx="6" fill="${accentHex}" fill-opacity="0.3"/>
        <rect x="445" y="185" width="60" height="80" rx="8" fill="${accentHex}" fill-opacity="0.4"/>
        <rect x="530" y="185" width="60" height="80" rx="8" fill="${accentHex}" fill-opacity="0.4"/>
        <line x1="90" y1="420" x2="710" y2="420" stroke="${accentHex}" stroke-width="4"/>
        <text x="400" y="472" text-anchor="middle" fill="${accentHex}" font-family="Cairo, sans-serif" font-size="22" font-weight="700">Manzil2U • ${titleText}</text>
      </svg>`;
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }

    const PRESET_IMAGES = [
      makeArchSvgDataUri('وحدة سكنية فاخرة', '#0B2217', '#1B4D35', '#C5A059'),
      makeArchSvgDataUri('دوبلكس بتصميم عصري', '#122620', '#1E3F30', '#D9B872'),
      makeArchSvgDataUri('بنتهاوس بإطلالة بانورامية', '#141E19', '#123524', '#C5A059'),
      makeArchSvgDataUri('شقة عائلية مميزة', '#182C23', '#0D261A', '#E0C17E')
    ];

    const STORAGE_KEY = 'manzil2u_brokerage_clean_v2';

    function escapeHtml(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    async function sha256Hash(text) {
      try {
        const msgBuffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
      } catch (e) {
        return 'hashed_' + String(text).length;
      }
    }

    function getDefaultState() {
      return {
        currentUserId: 'u1',
        dashboardScopeAll: true,
        minRoomsFilter: 0,
        savedOnlyFilter: false,
        activeChatThreadId: 't_welcome',
        customUploadDataUri: null,
        users: [
          {
            id: 'u1',
            name: 'مسؤول تجريبي',
            role: 'أدمن تجريبي لشركة Manzil2U',
            isAdmin: true,
            email: 'admin@example.invalid',
            phone: '',
            city: 'المنيا الجديدة',
            avatar: 'م',
            verified: true,
            passHash: 'admin_sha256_verified'
          },
          {
            id: 'u2',
            name: 'عميل تجريبي',
            role: 'مالك عقار / عميل تجريبي',
            isAdmin: false,
            email: 'client@example.invalid',
            phone: '',
            city: 'المنيا الجديدة',
            avatar: 'أ',
            verified: true,
            passHash: 'client_sha256_verified'
          }
        ],
        savedPropertyIds: [],
        properties: [],
        chatThreads: [
          {
            id: 't_welcome',
            propertyId: null,
            participantIds: ['u1', 'u2'],
            unreadCount: 0,
            messages: [
              {
                id: 'm_init',
                senderId: 'u1',
                text: 'مرحباً بك في غرفة تواصل شركة Manzil2U العقارية. أي عميل يراسل الشركة بخصوص شقة معروضة ستظهر رسالته هنا للأدمن لربطه بالمالك.',
                time: 'الآن',
                type: 'text'
              }
            ]
          }
        ],
        appointments: []
      };
    }

    let state = loadState();
    let viewsChartInstance = null;
    let citiesChartInstance = null;

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.properties) && Array.isArray(parsed.users)) {
            return parsed;
          }
        }
      } catch (err) {}
      return getDefaultState();
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {}
    }

    function resetDemoState() {
      state = getDefaultState();
      saveState();
      refreshAllUI();
      renderDashboard();
      showToast('تم تفريغ الموقع بالكامل وإعادته للحالة الفارغة الجاهزة للنشر ✓');
    }

    function formatCurrency(num) {
      const n = Number(num) || 0;
      return n.toLocaleString('ar-EG') + ' ج.م';
    }

    function getCurrentUser() {
      if (!state.currentUserId) return null;
      return state.users.find(u => u.id === state.currentUserId) || null;
    }

    function isCurrentUserAdmin() {
      const u = getCurrentUser();
      return Boolean(u && u.isAdmin);
    }

    function getUserById(userId) {
      return state.users.find(u => u.id === userId) || {
        id: 'guest',
        name: 'زائر غير مسجل',
        role: 'زائر',
        isAdmin: false,
        email: '-',
        phone: '-',
        city: '-',
        avatar: 'ز'
      };
    }

    function getPropertyById(propId) {
      if (!propId) return null;
      return state.properties.find(p => p.id === propId) || null;
    }

    function showToast(message, tone = 'success') {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const toast = document.createElement('div');
      const borderClass = tone === 'gold' ? 'border-bronzeChampagne' : 'border-emerald-400';
      toast.className = `pointer-events-auto luxury-gradient text-ivoryWarm border-r-4 ${borderClass} px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-bold animate-fade`;
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-bronzeChampagne text-base">✦</span>
          <span>${escapeHtml(message)}</span>
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="text-ivoryWarm/60 hover:text-ivoryWarm text-xs">✕</button>
      `;
      container.appendChild(toast);
      setTimeout(() => {
        if (toast && toast.parentElement) toast.remove();
      }, 4000);
    }

    function switchView(viewName) {
      const views = ['explore', 'add', 'chat', 'dashboard', 'auth'];
      views.forEach(v => {
        const section = document.getElementById(`view-${v}`);
        if (section) {
          if (v === viewName) section.classList.remove('hidden');
          else section.classList.add('hidden');
        }
        const navBtn = document.getElementById(`nav-${v}`);
        if (navBtn) {
          if (v === viewName) {
            navBtn.classList.add('nav-btn-active');
            navBtn.classList.remove('text-ivoryWarm/90');
          } else {
            navBtn.classList.remove('nav-btn-active');
            navBtn.classList.add('text-ivoryWarm/90');
          }
        }
        const mnavBtn = document.getElementById(`mnav-${v}`);
        if (mnavBtn) {
          if (v === viewName) {
            mnavBtn.classList.add('nav-btn-active');
            mnavBtn.classList.remove('text-ivoryWarm/90');
          } else {
            mnavBtn.classList.remove('nav-btn-active');
            mnavBtn.classList.add('text-ivoryWarm/90');
          }
        }
      });

      if (viewName === 'explore') renderProperties();
      if (viewName === 'add') renderAddPropertyAccess();
      if (viewName === 'chat') {
        renderChatThreadsList();
        renderActiveChatWindow();
      }
      if (viewName === 'dashboard') {
        renderDashboard();
      }
      if (viewName === 'auth') {
        renderAuthAndProfile();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderAddPropertyAccess() {
      const currentUser = getCurrentUser();
      const guestGate = document.getElementById('addPropertyGuestGate');
      const formWrapper = document.getElementById('addPropertyFormWrapper');
      const previewImg = document.getElementById('newPropPreviewImg');
      if (previewImg && !previewImg.getAttribute('src')) {
        previewImg.src = PRESET_IMAGES[0];
      }

      if (!currentUser) {
        guestGate.classList.remove('hidden');
        formWrapper.classList.add('hidden');
      } else {
        guestGate.classList.add('hidden');
        formWrapper.classList.remove('hidden');
        document.getElementById('postFormOwnerName').textContent = `${currentUser.name} (${currentUser.phone})`;
        document.getElementById('propOwnerRealName').value = currentUser.name;
        document.getElementById('propOwnerSecretPhone').value = currentUser.phone;
        document.getElementById('postFormBadgeRole').textContent = currentUser.isAdmin
          ? '🏢 نشر وحدة رسمية باسم شركة Manzil2U العقارية'
          : '👤 عرض شقة من مالك مسجل (بوساطة وإشراف شركة Manzil2U)';
      }
    }

    function toggleUserMenu() {
      const menu = document.getElementById('userDropdownMenu');
      if (menu) menu.classList.toggle('hidden');
    }

    function closeUserMenu() {
      const menu = document.getElementById('userDropdownMenu');
      if (menu) menu.classList.add('hidden');
    }

    function logoutToGuest() {
      state.currentUserId = null;
      saveState();
      closeUserMenu();
      refreshAllUI();
      showToast('تم تسجيل الخروج (أنت الآن تتصفح كزائر غير مسجل)');
    }

    function switchActiveUser(userId) {
      state.currentUserId = userId;
      saveState();
      closeUserMenu();
      refreshAllUI();
      const user = getUserById(userId);
      showToast(`تم التبديل إلى: ${user.name} (${user.isAdmin ? 'صلاحية الأدمن الكاملة' : 'عميل مسجل'})`, 'gold');
    }

    function renderUserHeader() {
      const currentUser = getCurrentUser();
      const isAdmin = isCurrentUserAdmin();

      if (currentUser) {
        document.getElementById('headerUserAvatar').textContent = currentUser.avatar;
        document.getElementById('headerUserName').textContent = currentUser.name;
        document.getElementById('headerUserRole').innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'} inline-block"></span>
          <span>${escapeHtml(currentUser.role)}</span>
        `;
        document.getElementById('dropdownActiveEmail').textContent = `${currentUser.email} • ${currentUser.phone}`;
        document.getElementById('chatCurrentAccountTag').textContent = currentUser.name;
      } else {
        document.getElementById('headerUserAvatar').textContent = 'ز';
        document.getElementById('headerUserName').textContent = 'زائر (غير مسجل)';
        document.getElementById('headerUserRole').innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
          <span>اضغط لتسجيل الدخول</span>
        `;
        document.getElementById('dropdownActiveEmail').textContent = 'غير مسجل دخول حالياً';
        document.getElementById('chatCurrentAccountTag').textContent = 'زائر';
      }

      const dashBtn = document.getElementById('nav-dashboard');
      if (dashBtn) {
        dashBtn.style.opacity = isAdmin ? '1' : '0.65';
      }

      const listEl = document.getElementById('quickSwitchAccountsList');
      listEl.innerHTML = state.users.map(u => {
        const isCurrent = u.id === state.currentUserId;
        return `
          <button type="button" onclick="switchActiveUser('${u.id}')" class="w-full text-right px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition ${isCurrent ? 'bg-emeraldLight text-emeraldDeep font-extrabold border border-emeraldDeep/20' : 'hover:bg-gray-100 text-slateInk'}">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg luxury-gradient text-bronzeChampagne flex items-center justify-center font-bold text-[11px]">${escapeHtml(u.avatar)}</span>
              <div>
                <div>${escapeHtml(u.name)}</div>
                <div class="text-[10px] text-gray-500">${escapeHtml(u.role)}</div>
              </div>
            </div>
            ${isCurrent ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-emeraldDeep text-bronzeChampagne">نشط</span>' : '<span class="text-[10px] text-bronzeDark">تبديل ←</span>'}
          </button>
        `;
      }).join('');

      const totalUnread = state.chatThreads.reduce((acc, t) => acc + (Number(t.unreadCount) || 0), 0);
      document.getElementById('unreadBadgeNav').textContent = totalUnread;
      document.getElementById('unreadBadgeMobile').textContent = totalUnread;
      document.getElementById('savedCountChip').textContent = state.savedPropertyIds.length;
      document.getElementById('heroStatListings').textContent = state.properties.length;
      document.getElementById('heroStatUsers').textContent = state.users.length;
    }

    function setRoomFilter(minRooms) {
      state.minRoomsFilter = minRooms;
      [0, 2, 3, 4].forEach(r => {
        const btn = document.getElementById(`roomBtn-${r}`);
        if (btn) {
          btn.className = (r === minRooms)
            ? 'px-3 py-1 rounded-lg font-bold bg-emeraldDeep text-ivoryWarm'
            : 'px-3 py-1 rounded-lg font-semibold bg-ivoryWarm text-slateInk hover:bg-bronzeSoft';
        }
      });
      renderProperties();
    }

    function toggleSavedFilter() {
      state.savedOnlyFilter = !state.savedOnlyFilter;
      const icon = document.getElementById('savedFilterIcon');
      icon.textContent = state.savedOnlyFilter ? '❤️' : '🤍';
      renderProperties();
    }

    function resetFilters() {
      document.getElementById('searchInput').value = '';
      document.getElementById('filterPurpose').value = 'all';
      document.getElementById('filterCity').value = 'all';
      document.getElementById('filterType').value = 'all';
      document.getElementById('sortOrder').value = 'featured';
      state.savedOnlyFilter = false;
      document.getElementById('savedFilterIcon').textContent = '🤍';
      setRoomFilter(0);
    }

    function toggleSaveProperty(propId) {
      const idx = state.savedPropertyIds.indexOf(propId);
      if (idx === -1) {
        state.savedPropertyIds.push(propId);
        showToast('تم حفظ الوحدة في قائمة المفضلة ❤️');
      } else {
        state.savedPropertyIds.splice(idx, 1);
        showToast('تمت إزالة الوحدة من المفضلة');
      }
      saveState();
      renderUserHeader();
      renderProperties();
    }

    function renderProperties() {
      const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
      const purpose = document.getElementById('filterPurpose')?.value || 'all';
      const city = document.getElementById('filterCity')?.value || 'all';
      const type = document.getElementById('filterType')?.value || 'all';
      const sort = document.getElementById('sortOrder')?.value || 'featured';

      let filtered = state.properties.filter(p => {
        if (purpose !== 'all' && p.purpose !== purpose) return false;
        if (city !== 'all' && p.city !== city) return false;
        if (type !== 'all' && p.type !== type) return false;
        if (state.minRoomsFilter > 0 && p.beds < state.minRoomsFilter) return false;
        if (state.savedOnlyFilter && !state.savedPropertyIds.includes(p.id)) return false;
        if (query) {
          const hay = `${p.code || ''} ${p.title} ${p.city} ${p.district} ${p.type} ${p.description}`.toLowerCase();
          if (!hay.includes(query)) return false;
        }
        return true;
      });

      if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
      else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
      else if (sort === 'area-desc') filtered.sort((a, b) => b.area - a.area);

      document.getElementById('resultsCounterText').textContent = `عرض ${filtered.length} وحدات عقارية`;

      const grid = document.getElementById('propertiesGrid');

      if (state.properties.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full bg-ivoryCard rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed border-bronzeChampagne/50 card-shadow max-w-3xl mx-auto space-y-4 my-4">
            <div class="w-16 h-16 rounded-2xl luxury-gradient text-bronzeChampagne flex items-center justify-center mx-auto text-3xl shadow-lg">🏢</div>
            <h3 class="text-xl sm:text-2xl font-black text-emeraldDeep">المعرض العقاري جاهز لإضافة أولى شقق شركة Manzil2U</h3>
            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xl mx-auto">
              الموقع الآن فارغ وجاهز تماماً كما طلبت لتبدأ بنشر شققك الخاصة كشركة، أو استقبال الشقق من الملاك المسجلين (مع حفظ أرقام هواتفهم سرياً في لوحة الأدمن فقط).
            </p>
            <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button type="button" onclick="switchView('add')" class="bronze-gradient text-emeraldDeep font-black px-6 py-3 rounded-2xl text-xs sm:text-sm shadow-lg hover:opacity-95 transition">
                + أضف أول شقة الآن في الموقع
              </button>
              <button type="button" onclick="addSamplePropertyForTesting()" class="px-5 py-3 rounded-2xl bg-emeraldLight text-emeraldDeep font-bold text-xs sm:text-sm hover:bg-emeraldDeep hover:text-ivoryWarm transition">
                ✨ إضافة شقة تجريبية لمعاينة شكل العرض والوساطة
              </button>
            </div>
          </div>
        `;
        return;
      }

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full bg-ivoryCard rounded-3xl p-10 text-center border border-bronzeChampagne/30 space-y-3">
            <h3 class="text-lg font-extrabold text-emeraldDeep">لا توجد شقق مطابقة لبحثك</h3>
            <button type="button" onclick="resetFilters()" class="bronze-gradient text-emeraldDeep font-extrabold px-5 py-2.5 rounded-xl text-xs">إظهار كل الشقق</button>
          </div>
        `;
        return;
      }

      const isAdmin = isCurrentUserAdmin();

      grid.innerHTML = filtered.map(p => {
        const isSaved = state.savedPropertyIds.includes(p.id);
        const statusBadgeClass = p.status === 'متاح'
          ? 'bg-emerald-600 text-white'
          : (p.status === 'محجوز' ? 'bg-amber-600 text-white' : 'bg-red-700 text-white');

        return `
          <article class="bg-ivoryCard rounded-3xl border border-bronzeChampagne/30 card-shadow overflow-hidden flex flex-col justify-between group hover:-translate-y-1 transition-all duration-200">
            <div>
              <div class="relative h-52 overflow-hidden bg-emeraldDeep">
                <img src="${p.image}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>

                <div class="absolute top-3 right-3 flex flex-wrap items-center gap-1.5">
                  <span class="px-2.5 py-1 rounded-xl text-[11px] font-extrabold luxury-gradient text-bronzeChampagne border border-bronzeChampagne/40">
                    ${escapeHtml(p.code || '#M2U')} • ${escapeHtml(p.purpose)}
                  </span>
                  <span class="px-2.5 py-1 rounded-xl text-[11px] font-bold ${statusBadgeClass}">
                    ${escapeHtml(p.status)}
                  </span>
                </div>

                <button type="button" onclick="toggleSaveProperty('${p.id}')" class="absolute top-3 left-3 w-9 h-9 rounded-xl bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition">
                  <span>${isSaved ? '❤️' : '🤍'}</span>
                </button>

                <div class="absolute bottom-3 right-3 left-3 flex items-end justify-between text-white">
                  <div>
                    <div class="text-[11px] text-bronzeChampagne font-bold">${escapeHtml(p.city)} • ${escapeHtml(p.type)}</div>
                    <div class="text-xl font-black">${formatCurrency(p.price)}</div>
                  </div>
                  <span class="text-[11px] bg-black/50 px-2 py-0.5 rounded-lg">👁️ ${p.views}</span>
                </div>
              </div>

              <div class="p-5 space-y-3">
                <h3 class="font-extrabold text-base text-emeraldDeep line-clamp-1 hover:text-bronzeDark cursor-pointer" onclick="openPropertyModal('${p.id}')">${escapeHtml(p.title)}</h3>
                <p class="text-xs text-gray-600 line-clamp-1">📍 ${escapeHtml(p.district)}</p>

                <div class="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-2xl bg-ivoryWarm border border-gray-200/80 text-center text-xs">
                  <div>
                    <span class="font-extrabold text-emeraldDeep">${p.area} م²</span>
                    <div class="text-[10px] text-gray-500">المساحة</div>
                  </div>
                  <div class="border-x border-gray-200">
                    <span class="font-extrabold text-emeraldDeep">${p.beds} غرف</span>
                    <div class="text-[10px] text-gray-500">النوم</div>
                  </div>
                  <div>
                    <span class="font-extrabold text-emeraldDeep">${p.baths} حمام</span>
                    <div class="text-[10px] text-gray-500">التشطيب</div>
                  </div>
                </div>

                ${isAdmin ? `
                  <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900 flex items-center justify-between">
                    <span>🔒 <strong>للأدمن فقط:</strong> المالك: ${escapeHtml(p.ownerRealName)}</span>
                    <span dir="ltr" class="font-black">${escapeHtml(p.ownerSecretPhone)}</span>
                  </div>
                ` : `
                  <div class="p-2 rounded-xl bg-emeraldLight/60 text-[11px] text-emeraldDeep font-semibold flex items-center justify-between">
                    <span>🏢 الوسيط المعتمد: شركة Manzil2U</span>
                    <span>بيانات المالك مؤمّنة ✓</span>
                  </div>
                `}
              </div>
            </div>

            <div class="px-5 pb-5 pt-3 border-t border-gray-100 space-y-2.5">
              <div class="grid grid-cols-2 gap-2">
                <button type="button" onclick="openPropertyModal('${p.id}')" class="py-2.5 px-3 rounded-xl border border-emeraldDeep text-emeraldDeep hover:bg-emeraldLight font-bold text-xs transition">
                  التفاصيل وحاسبة القسط
                </button>
                <button type="button" onclick="startChatWithOwner('${p.id}')" class="py-2.5 px-3 rounded-xl luxury-gradient text-bronzeChampagne hover:opacity-95 font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow">
                  <span>💬 تواصل مع الشركة</span>
                </button>
              </div>
            </div>
          </article>
        `;
      }).join('');
    }

    function openPropertyModal(propId) {
      const p = getPropertyById(propId);
      if (!p) return;
      p.views = (Number(p.views) || 0) + 1;
      saveState();
      renderProperties();

      const isAdmin = isCurrentUserAdmin();
      const downPayment20 = Math.round(p.price * 0.2);
      const monthly5Years = Math.round((p.price * 0.8) / 60);

      const content = document.getElementById('propertyModalContent');
      content.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-12">
          <div class="lg:col-span-6 bg-emeraldDeep text-ivoryWarm flex flex-col justify-between">
            <div class="relative h-64 sm:h-72">
              <img src="${p.image}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover" />
              <button type="button" onclick="closePropertyModal()" class="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/60 text-white font-bold flex items-center justify-center hover:bg-black">✕</button>
              <div class="absolute bottom-3 right-3 bg-black/70 px-3 py-1.5 rounded-xl text-xs font-bold text-bronzeChampagne">
                كود الوحدة: ${escapeHtml(p.code || '#M2U')} • ${escapeHtml(p.city)}
              </div>
            </div>

            <div class="p-6 space-y-4">
              <div class="flex items-center justify-between">
                <span class="px-3 py-1 rounded-full bg-bronzeChampagne/20 text-bronzeChampagne border border-bronzeChampagne/40 text-xs font-bold">${escapeHtml(p.sourceType || 'إشراف شركة Manzil2U')}</span>
                <span class="text-xs text-ivoryWarm/75">👁️ ${p.views} مشاهدة</span>
              </div>
              <h3 class="text-xl font-extrabold text-ivoryWarm">${escapeHtml(p.title)}</h3>
              <div class="text-2xl font-black text-bronzeChampagne">${formatCurrency(p.price)}</div>
              <p class="text-xs text-ivoryWarm/85 leading-relaxed">${escapeHtml(p.description)}</p>

              <div class="p-4 rounded-2xl bg-black/30 border border-bronzeChampagne/30 space-y-2">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs font-black text-bronzeChampagne">🏢 جهة التواصل والوساطة: شركة Manzil2U العقارية</div>
                    <div class="text-[11px] text-ivoryWarm/80">تواصل مع الشركة لتحديد موعد معاينة وتوصيلك بمالك العقار</div>
                  </div>
                  <button type="button" onclick="closePropertyModal(); startChatWithOwner('${p.id}');" class="px-4 py-2 rounded-xl bronze-gradient text-emeraldDeep font-black text-xs shadow">
                    💬 كلم الشركة الآن
                  </button>
                </div>
                ${isAdmin ? `
                  <div class="pt-2 border-t border-white/15 text-[11px] text-amber-300 flex items-center justify-between">
                    <span>🔒 <strong>بيانات المالك السرية (تظهر لك كأدمن فقط):</strong> ${escapeHtml(p.ownerRealName)}</span>
                    <span dir="ltr" class="font-black">${escapeHtml(p.ownerSecretPhone)}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="lg:col-span-6 p-6 sm:p-7 space-y-5 bg-ivoryCard text-slateInk">
            <div class="flex items-center justify-between border-b border-gray-200 pb-3">
              <h4 class="text-base font-extrabold text-emeraldDeep">تفاصيل الشقة وطلب الوساطة</h4>
              <button type="button" onclick="closePropertyModal()" class="text-xs font-bold text-gray-500 hover:text-emeraldDeep">إغلاق ✕</button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div class="p-3 rounded-xl bg-ivoryWarm border border-gray-200">
                <div class="text-gray-500">المساحة</div>
                <div class="font-extrabold text-emeraldDeep text-sm mt-0.5">${p.area} م²</div>
              </div>
              <div class="p-3 rounded-xl bg-ivoryWarm border border-gray-200">
                <div class="text-gray-500">الغرف</div>
                <div class="font-extrabold text-emeraldDeep text-sm mt-0.5">${p.beds} غرف</div>
              </div>
              <div class="p-3 rounded-xl bg-ivoryWarm border border-gray-200">
                <div class="text-gray-500">الحمامات</div>
                <div class="font-extrabold text-emeraldDeep text-sm mt-0.5">${p.baths} حمام</div>
              </div>
              <div class="p-3 rounded-xl bg-ivoryWarm border border-gray-200">
                <div class="text-gray-500">سعر المتر</div>
                <div class="font-extrabold text-bronzeDark text-sm mt-0.5">${Math.round(p.price / (p.area || 1)).toLocaleString('ar-EG')}</div>
              </div>
            </div>

            <div class="text-xs space-y-1.5">
              <div><strong class="text-emeraldDeep">المنطقة:</strong> ${escapeHtml(p.district)}</div>
              <div><strong class="text-emeraldDeep">الدور والتشطيب:</strong> ${escapeHtml(p.floor)}</div>
              <div><strong class="text-emeraldDeep">نظام الدفع:</strong> ${escapeHtml(p.payment)}</div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                ${(p.amenities || []).map(a => `<span class="px-2.5 py-1 rounded-lg bg-emeraldLight text-emeraldDeep font-bold text-[11px]">✓ ${escapeHtml(a)}</span>`).join('')}
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-ivoryWarm border border-bronzeChampagne/40 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold text-emeraldDeep">🧮 حاسبة التقسيط التقديرية</span>
                <span class="text-[11px] text-bronzeDark font-bold">تفاعلية</span>
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label class="block text-gray-600 mb-1">نسبة المقدم (%)</label>
                  <input id="calcDownPercent" type="range" min="10" max="70" step="5" value="20" oninput="updateModalCalculator(${p.price})" class="w-full accent-emeraldDeep" />
                  <div id="calcDownLabel" class="font-bold text-emeraldDeep mt-0.5">20% (${formatCurrency(downPayment20)})</div>
                </div>
                <div>
                  <label class="block text-gray-600 mb-1">فترة السداد (سنوات)</label>
                  <input id="calcYears" type="range" min="1" max="10" step="1" value="5" oninput="updateModalCalculator(${p.price})" class="w-full accent-emeraldDeep" />
                  <div id="calcYearsLabel" class="font-bold text-emeraldDeep mt-0.5">5 سنوات (60 شهراً)</div>
                </div>
              </div>
              <div class="pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
                <span class="font-bold text-gray-600">القسط الشهري التقديري:</span>
                <span id="calcMonthlyOutput" class="text-base font-extrabold text-emeraldDeep">${formatCurrency(monthly5Years)} / شهرياً</span>
              </div>
            </div>

            <form onsubmit="handleBookAppointment(event, '${p.id}')" class="p-4 rounded-2xl bg-emeraldLight/70 border border-emeraldDeep/20 space-y-3">
              <div class="text-xs font-extrabold text-emeraldDeep">🤝 اطلب من شركة Manzil2U توصيلك بالمالك وتحديد موعد معاينة:</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input id="bookDateInput" type="text" required placeholder="الموعد المناسب لك (مثال: الجمعة 5م)" class="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:outline-none focus:border-emeraldDeep" />
                <input id="bookPhoneInput" type="tel" required placeholder="رقم موبايلك ليتواصل معك الأدمن" value="${getCurrentUser() ? escapeHtml(getCurrentUser().phone) : ''}" class="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:outline-none focus:border-emeraldDeep" />
              </div>
              <button type="submit" class="w-full luxury-gradient text-bronzeChampagne font-extrabold py-2.5 rounded-xl text-xs shadow">
                إرسال طلب المعاينة والوساطة لإدارة الشركة
              </button>
            </form>
          </div>
        </div>
      `;

      document.getElementById('propertyModal').classList.remove('hidden');
    }

    function updateModalCalculator(totalPrice) {
      const pct = Number(document.getElementById('calcDownPercent')?.value || 20);
      const yrs = Number(document.getElementById('calcYears')?.value || 5);
      const downAmount = Math.round(totalPrice * (pct / 100));
      const months = yrs * 12;
      const monthly = Math.round((totalPrice - downAmount) / months);
      document.getElementById('calcDownLabel').textContent = `${pct}% (${formatCurrency(downAmount)})`;
      document.getElementById('calcYearsLabel').textContent = `${yrs} سنوات (${months} شهراً)`;
      document.getElementById('calcMonthlyOutput').textContent = `${formatCurrency(monthly)} / شهرياً`;
    }

    function closePropertyModal() {
      document.getElementById('propertyModal').classList.add('hidden');
    }

    function handleBookAppointment(e, propId) {
      e.preventDefault();
      const dateText = document.getElementById('bookDateInput').value.trim();
      const phone = document.getElementById('bookPhoneInput').value.trim();
      const currentUser = getCurrentUser();
      if (!dateText || !phone) return;

      state.appointments.unshift({
        id: 'a_' + Date.now(),
        propertyId: propId,
        clientName: currentUser ? currentUser.name : 'مشتري مهتم',
        clientPhone: phone,
        dateText: dateText,
        type: 'طلب معاينة وربط بالمالك',
        status: 'بانتظار تواصل الأدمن'
      });
      saveState();
      closePropertyModal();
      showToast('تم إرسال طلبك لشركة Manzil2U! سيقوم الأدمن بالتواصل معك وتوصيلك بالمالك 📞', 'gold');
    }

    function updateImagePreviewFromPreset() {
      const idx = Number(document.getElementById('propImagePreset').value || 0);
      state.customUploadDataUri = null;
      document.getElementById('newPropPreviewImg').src = PRESET_IMAGES[idx] || PRESET_IMAGES[0];
    }

    function handleCustomImageUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          const maxW = 900;
          const scale = Math.min(1, maxW / (img.width || maxW));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          state.customUploadDataUri = canvas.toDataURL('image/jpeg', 0.82);
          document.getElementById('newPropPreviewImg').src = state.customUploadDataUri;
          showToast('تم ضغط ورفع صورة الشقة بأعلى أداء ✓');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function fillDemoListing() {
      const u = getCurrentUser();
      document.getElementById('propOwnerRealName').value = u ? u.name : 'م. ماجد ميلاد';
      document.getElementById('propOwnerSecretPhone').value = u ? u.phone : '';
      document.getElementById('propTitle').value = 'شقة ناصية فاخرة بالمنيا الجديدة — الحي السياحي المتميز';
      document.getElementById('propCity').value = 'المنيا الجديدة';
      document.getElementById('propDistrict').value = 'الحي السياحي — قرب كمين الصفا والنادي';
      document.getElementById('propPurpose').value = 'تمليك';
      document.getElementById('propType').value = 'شقة فاخرة';
      document.getElementById('propPrice').value = '2650000';
      document.getElementById('propArea').value = '195';
      document.getElementById('propFloor').value = 'الدور الثالث • تشطيب الترا سوبر لوكس';
      document.getElementById('propBeds').value = '3';
      document.getElementById('propBaths').value = '2';
      document.getElementById('propDesc').value = 'شقة ناصية بحري صريح بتشطيب معماري فاخر، 3 غرف نوم وريسبشن 3 قطع، مسجلة وجاهزة للمعاينة الفورية عن طريق شركة Manzil2U.';
      showToast('تمت تعبئة البيانات التجريبية، اضغط "نشر الشقة" لإضافتها!', 'gold');
    }

    function addSamplePropertyForTesting() {
      const sampleCode = '#M2U-' + (101 + state.properties.length);
      state.properties.unshift({
        id: 'p_' + Date.now(),
        code: sampleCode,
        title: 'شقة فاخرة بالمنيا الجديدة — الحي المتميز (إشراف شركة Manzil2U)',
        city: 'المنيا الجديدة',
        district: 'الحي المتميز — خطوات من الخدمات والنادي',
        purpose: 'تمليك',
        type: 'شقة فاخرة',
        price: 2550000,
        area: 190,
        beds: 3,
        baths: 2,
        floor: 'الدور الثاني • الترا سوبر لوكس',
        payment: 'كاش أو تقسيط مرن',
        ownerId: state.currentUserId || 'u1',
        ownerRealName: 'م. ماجد ميلاد / مالك موثق',
        ownerSecretPhone: '',
        sourceType: 'وحدة حصرية لشركة Manzil2U',
        views: 1,
        status: 'متاح',
        featured: true,
        image: PRESET_IMAGES[state.properties.length % PRESET_IMAGES.length],
        amenities: ['أسانسير حديث', 'حصة في الجراج', 'عدادات كاملة', 'فيو مفتوح عالحديقة'],
        description: 'وحدة عقارية معروضة حصرياً بوساطة شركة Manzil2U العقارية. رقم المالك محفوظ سرياً في لوحة الأدمن، وللمعاينة يرجى التواصل مع الشركة.'
      });
      saveState();
      refreshAllUI();
      if (!document.getElementById('view-dashboard').classList.contains('hidden')) {
        renderDashboard();
      }
      showToast(`تمت إضافة الوحدة (${sampleCode}) بنجاح! يمكنك معاينتها أو حذفها في أي وقت.`, 'gold');
    }

    function handleCreateProperty(e) {
      e.preventDefault();
      const currentUser = getCurrentUser();
      if (!currentUser) {
        showToast('يجب تسجيل الدخول أولاً لعرض شقتك');
        switchView('auth');
        return;
      }

      const ownerRealName = document.getElementById('propOwnerRealName').value.trim();
      const ownerSecretPhone = document.getElementById('propOwnerSecretPhone').value.trim();
      const sourceType = document.getElementById('propSourceType').value;
      const title = document.getElementById('propTitle').value.trim();
      const city = document.getElementById('propCity').value;
      const district = document.getElementById('propDistrict').value.trim();
      const purpose = document.getElementById('propPurpose').value;
      const type = document.getElementById('propType').value;
      const price = Number(document.getElementById('propPrice').value) || 2000000;
      const area = Number(document.getElementById('propArea').value) || 160;
      const floor = document.getElementById('propFloor').value.trim();
      const beds = Number(document.getElementById('propBeds').value) || 3;
      const baths = Number(document.getElementById('propBaths').value) || 2;
      const payment = document.getElementById('propPayment').value;
      const description = document.getElementById('propDesc').value.trim();
      const presetIdx = Number(document.getElementById('propImagePreset').value || 0);

      if (!ownerSecretPhone || ownerSecretPhone.length < 10) {
        showToast('يرجى إدخال رقم موبايل صحيح للمالك ليظهر للأدمن');
        return;
      }

      const checkedAmenities = Array.from(document.querySelectorAll('input[name="propAmenity"]:checked')).map(el => el.value);
      const code = '#M2U-' + (101 + state.properties.length);

      const newProp = {
        id: 'p_' + Date.now(),
        code,
        title,
        city,
        district,
        purpose,
        type,
        price,
        area,
        beds,
        baths,
        floor,
        payment,
        ownerId: currentUser.id,
        ownerRealName: ownerRealName || currentUser.name,
        ownerSecretPhone,
        sourceType,
        views: 1,
        status: 'متاح',
        featured: true,
        image: state.customUploadDataUri || PRESET_IMAGES[presetIdx] || PRESET_IMAGES[0],
        amenities: checkedAmenities.length ? checkedAmenities : ['عدادات كاملة', 'أسانسير حديث'],
        description
      };

      state.properties.unshift(newProp);
      state.customUploadDataUri = null;
      saveState();
      e.target.reset();
      refreshAllUI();
      switchView('explore');
      showToast(`تم نشر الشقة بكود (${code})! رقم المالك محفوظ سرياً لدى الأدمن فقط 🔒`, 'gold');
    }

    function startChatWithOwner(propId) {
      const prop = getPropertyById(propId);
      if (!prop) return;

      let thread = state.chatThreads.find(t => t.propertyId === propId);
      const activeId = state.currentUserId || 'u2';

      if (!thread) {
        thread = {
          id: 't_' + Date.now(),
          propertyId: propId,
          participantIds: ['u1', activeId],
          unreadCount: 1,
          messages: [
            {
              id: 'm_' + Date.now(),
              senderId: activeId,
              text: `مرحباً شركة Manzil2U، أود الاستفسار عن الوحدة (${prop.code}: ${prop.title}) المعروضة بسعر ${formatCurrency(prop.price)} وتحديد موعد معاينة.`,
              time: 'الآن',
              type: 'text'
            }
          ]
        };
        state.chatThreads.unshift(thread);
      }

      state.activeChatThreadId = thread.id;
      saveState();
      renderUserHeader();
      switchView('chat');
    }

    function selectChatThread(threadId) {
      state.activeChatThreadId = threadId;
      const thread = state.chatThreads.find(t => t.id === threadId);
      if (thread) thread.unreadCount = 0;
      saveState();
      renderUserHeader();
      renderChatThreadsList();
      renderActiveChatWindow();
    }

    function renderChatThreadsList() {
      const searchQ = (document.getElementById('chatSearchInput')?.value || '').trim().toLowerCase();
      const listEl = document.getElementById('chatThreadsList');
      if (!listEl) return;

      const filteredThreads = state.chatThreads.filter(t => {
        const prop = getPropertyById(t.propertyId);
        if (!searchQ) return true;
        const hay = `${prop?.code || ''} ${prop?.title || ''} شركة Manzil2U`.toLowerCase();
        return hay.includes(searchQ);
      });

      listEl.innerHTML = filteredThreads.map(t => {
        const prop = getPropertyById(t.propertyId);
        const lastMsg = t.messages[t.messages.length - 1];
        const isActive = t.id === state.activeChatThreadId;

        return `
          <button type="button" onclick="selectChatThread('${t.id}')" class="w-full text-right p-4 transition flex items-start gap-3 ${isActive ? 'bg-bronzeSoft/80 border-r-4 border-emeraldDeep' : 'hover:bg-ivoryWarm'}">
            <div class="w-11 h-11 rounded-2xl luxury-gradient text-bronzeChampagne font-extrabold flex items-center justify-center shrink-0 shadow text-xs">
              M2U
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <span class="font-extrabold text-xs sm:text-sm text-emeraldDeep truncate">فريق مبيعات Manzil2U</span>
                <span class="text-[10px] text-gray-500 whitespace-nowrap">${lastMsg ? escapeHtml(lastMsg.time) : ''}</span>
              </div>
              <div class="text-[11px] font-bold text-bronzeDark truncate mt-0.5">🏠 ${prop ? escapeHtml(prop.code + ' • ' + prop.title) : 'استفسار عام للشركة'}</div>
              <p class="text-xs text-gray-600 truncate mt-1">${lastMsg ? escapeHtml(lastMsg.text) : ''}</p>
            </div>
            ${t.unreadCount > 0 ? `<span class="bg-emeraldDeep text-bronzeChampagne text-[10px] font-extrabold px-2 py-0.5 rounded-full">${t.unreadCount}</span>` : ''}
          </button>
        `;
      }).join('');
    }

    function renderActiveChatWindow() {
      const thread = state.chatThreads.find(t => t.id === state.activeChatThreadId) || state.chatThreads[0];
      if (!thread) return;

      const prop = getPropertyById(thread.propertyId);
      const isAdmin = isCurrentUserAdmin();

      const headerEl = document.getElementById('activeChatHeader');
      headerEl.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl luxury-gradient text-bronzeChampagne font-black flex items-center justify-center shadow text-xs">
            M2U
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm sm:text-base font-extrabold text-emeraldDeep">خدمة عملاء ووساطة شركة Manzil2U</h3>
              <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> متصل الآن
              </span>
            </div>
            <p class="text-xs text-gray-500">الشركة تستقبل طلبك وتقوم بتوصيلك بالمالك وتنسيق المعاينة الرسمية</p>
          </div>
        </div>

        ${prop ? `
          <div class="flex items-center gap-3 bg-ivoryCard p-2 rounded-2xl border border-bronzeChampagne/40">
            <img src="${prop.image}" alt="${escapeHtml(prop.title)}" class="w-12 h-10 object-cover rounded-xl" />
            <div class="text-xs">
              <div class="font-bold text-emeraldDeep line-clamp-1 max-w-[180px]">${escapeHtml(prop.code)} • ${escapeHtml(prop.title)}</div>
              <div class="font-extrabold text-bronzeDark">${formatCurrency(prop.price)} ${isAdmin ? `• 🔒 المالك: ${escapeHtml(prop.ownerSecretPhone)}` : ''}</div>
            </div>
            <button type="button" onclick="openPropertyModal('${prop.id}')" class="px-2.5 py-1.5 rounded-xl bg-emeraldLight text-emeraldDeep font-bold text-xs hover:bg-emeraldDeep hover:text-ivoryWarm transition">
              التفاصيل
            </button>
          </div>
        ` : ''}
      `;

      const feedEl = document.getElementById('chatMessagesContainer');
      const myId = state.currentUserId || 'guest';

      feedEl.innerHTML = thread.messages.map(m => {
        const isMe = m.senderId === myId;
        const sender = getUserById(m.senderId);
        if (m.type === 'offer') {
          return `
            <div class="flex ${isMe ? 'justify-start' : 'justify-end'}">
              <div class="max-w-md w-full rounded-2xl p-4 bronze-gradient text-emeraldDeep shadow-md border border-emeraldDeep/20 space-y-1.5">
                <div class="flex items-center justify-between text-xs font-extrabold">
                  <span>💰 عرض شراء رسمي مرسل لإدارة الشركة</span>
                  <span>${escapeHtml(m.time)}</span>
                </div>
                <div class="text-lg font-black">${formatCurrency(m.offerAmount || 0)}</div>
                <div class="text-xs font-bold">طريقة السداد: ${escapeHtml(m.offerPayment || 'كاش')}</div>
                <p class="text-xs">${escapeHtml(m.text)}</p>
              </div>
            </div>
          `;
        }
        return `
          <div class="flex ${isMe ? 'justify-start' : 'justify-end'}">
            <div class="max-w-md rounded-2xl px-4 py-3 shadow-sm ${isMe ? 'luxury-gradient text-ivoryWarm rounded-tr-none' : 'bg-white text-slateInk border border-gray-200 rounded-tl-none'}">
              <div class="flex items-center justify-between gap-4 mb-1">
                <span class="text-[11px] font-bold ${isMe ? 'text-bronzeChampagne' : 'text-emeraldDeep'}">${escapeHtml(sender.name)}</span>
                <span class="text-[10px] ${isMe ? 'text-ivoryWarm/70' : 'text-gray-400'}">${escapeHtml(m.time)}</span>
              </div>
              <p class="text-xs sm:text-sm leading-relaxed">${escapeHtml(m.text)}</p>
            </div>
          </div>
        `;
      }).join('');

      feedEl.scrollTop = feedEl.scrollHeight;
    }

    function appendChatMessage(text, type = 'text', extra = {}) {
      const thread = state.chatThreads.find(t => t.id === state.activeChatThreadId) || state.chatThreads[0];
      if (!thread) return;

      const senderId = state.currentUserId || 'u2';
      const nowStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      thread.messages.push({
        id: 'm_' + Date.now(),
        senderId,
        text,
        time: nowStr,
        type,
        ...extra
      });

      saveState();
      renderChatThreadsList();
      renderActiveChatWindow();

      if (senderId !== 'u1') {
        const prop = getPropertyById(thread.propertyId);
        setTimeout(() => {
          const replyText = type === 'offer'
            ? `شكراً لك! تم استلام عرض السعر الرسمي (${formatCurrency(extra.offerAmount)}) في داش بورد إدارة شركة Manzil2U، وسيقوم الأدمن بمراجعة العرض مع مالك الشقة والتواصل معك فوراً.`
            : `أهلاً بك في شركة Manzil2U العقارية. تم تسجيل استفسارك بخصوص "${prop ? prop.title : 'الوحدة العقارية'}" لدى الأدمن، وسنتواصل مع المالك لتنسيق موعد المعاينة والرد عليك.`;

          thread.messages.push({
            id: 'm_' + (Date.now() + 1),
            senderId: 'u1',
            text: replyText,
            time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            type: 'text'
          });
          saveState();
          renderChatThreadsList();
          renderActiveChatWindow();
        }, 700);
      }
    }

    function handleSendMessage(e) {
      e.preventDefault();
      const input = document.getElementById('chatMessageInput');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      appendChatMessage(text, 'text');
    }

    function sendQuickChatText(text) {
      appendChatMessage(text, 'text');
    }

    function openPriceOfferPrompt() {
      const thread = state.chatThreads.find(t => t.id === state.activeChatThreadId) || state.chatThreads[0];
      const prop = thread ? getPropertyById(thread.propertyId) : null;
      if (prop) {
        document.getElementById('offerAmountInput').value = Math.round(prop.price * 0.95);
      }
      document.getElementById('offerModal').classList.remove('hidden');
    }

    function closeOfferModal() {
      document.getElementById('offerModal').classList.add('hidden');
    }

    function submitPriceOffer(e) {
      e.preventDefault();
      const amount = Number(document.getElementById('offerAmountInput').value) || 0;
      const payment = document.getElementById('offerPaymentType').value;
      const note = document.getElementById('offerNoteInput').value.trim() || 'جاهز للتنفيذ عبر شركة Manzil2U';
      const thread = state.chatThreads.find(t => t.id === state.activeChatThreadId) || state.chatThreads[0];
      const currentUser = getCurrentUser();

      state.appointments.unshift({
        id: 'a_' + Date.now(),
        propertyId: thread ? thread.propertyId : null,
        clientName: currentUser ? currentUser.name : 'عميل مشتري',
        clientPhone: currentUser ? currentUser.phone : note,
        dateText: `عرض شراء: ${formatCurrency(amount)} (${payment})`,
        type: 'عرض سعر رسمي للشركة',
        status: 'بانتظار مراجعة الأدمن'
      });

      closeOfferModal();
      appendChatMessage(note, 'offer', { offerAmount: amount, offerPayment: payment });
      showToast('تم إرسال عرض السعر لإدارة شركة Manzil2U وتسجيله في داش بورد الأدمن 💰', 'gold');
    }

    function switchDashboardScope() {
      addSamplePropertyForTesting();
    }

    function cyclePropertyStatus(propId) {
      if (!isCurrentUserAdmin()) return;
      const prop = getPropertyById(propId);
      if (!prop) return;
      const order = ['متاح', 'محجوز', 'تم البيع'];
      const nextIdx = (order.indexOf(prop.status) + 1) % order.length;
      prop.status = order[nextIdx];
      saveState();
      renderDashboard();
      renderProperties();
      showToast(`تم تحديث حالة الوحدة (${prop.code}) إلى: ${prop.status}`);
    }

    function deletePropertyListing(propId) {
      if (!isCurrentUserAdmin()) return;
      state.properties = state.properties.filter(p => p.id !== propId);
      saveState();
      refreshAllUI();
      renderDashboard();
      showToast('تم حذف الإعلان العقاري من المنصة');
    }

    function toggleAppointmentStatus(appId) {
      if (!isCurrentUserAdmin()) return;
      const app = state.appointments.find(a => a.id === appId);
      if (!app) return;
      app.status = app.status === 'تم الربط مع المالك ✓' ? 'بانتظار تواصل الأدمن' : 'تم الربط مع المالك ✓';
      saveState();
      renderDashboard();
      showToast(`تم تحديث حالة الوساطة إلى: ${app.status}`);
    }

    function exportDatabaseJson() {
      if (!isCurrentUserAdmin()) return;
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', 'manzil2u_admin_backup.json');
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('تم تصدير نسخة احتياطية كاملة لقاعدة بيانات الأدمن (JSON) 📥');
    }

    function renderDashboard() {
      const isAdmin = isCurrentUserAdmin();
      const deniedGate = document.getElementById('adminAccessDeniedGate');
      const adminContent = document.getElementById('adminDashboardContent');

      if (!isAdmin) {
        deniedGate.classList.remove('hidden');
        adminContent.classList.add('hidden');
        return;
      }

      deniedGate.classList.add('hidden');
      adminContent.classList.remove('hidden');

      const currentUser = getCurrentUser();
      document.getElementById('dashUserName').textContent = currentUser.name;

      const saleValue = state.properties.filter(p => p.purpose === 'تمليك').reduce((acc, p) => acc + (Number(p.price) || 0), 0);
      const expectedCommission = Math.round(saleValue * 0.025);

      document.getElementById('kpiListingsCount').textContent = state.properties.length;
      document.getElementById('kpiListingsSub').textContent = state.properties.length === 0
        ? 'الموقع فارغ وجاهز لإضافة شققك'
        : `${state.properties.length} وحدات تحت إشراف الشركة`;
      document.getElementById('kpiTotalViews').textContent = state.properties.length + state.users.length;
      document.getElementById('kpiActiveLeads').textContent = state.appointments.length;
      document.getElementById('kpiPortfolioValue').textContent = formatCurrency(expectedCommission);

      const tbody = document.getElementById('dashboardPropertiesTable');
      if (state.properties.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="py-8 text-center text-gray-500 text-xs">
              لا توجد شقق معروضة حالياً. اضغط على <strong>"+ إضافة عقار للشركة"</strong> أو <strong>"+ إضافة شقة تجريبية للمعاينة"</strong> لإضافة أول شقة.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = state.properties.map(p => {
          const statusColor = p.status === 'متاح'
            ? 'bg-emerald-100 text-emerald-800'
            : (p.status === 'محجوز' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800');
          return `
            <tr class="hover:bg-ivoryWarm/60 transition">
              <td class="py-3 px-3">
                <div class="font-extrabold text-emeraldDeep">${escapeHtml(p.code || '#M2U')} — ${escapeHtml(p.title)}</div>
                <div class="text-[11px] text-gray-500">${escapeHtml(p.city)} • ${p.area} م² • ${escapeHtml(p.sourceType || '')}</div>
              </td>
              <td class="py-3 px-3">
                <div class="p-2 rounded-xl bg-amber-50 border border-amber-200">
                  <div class="font-bold text-slateInk">👤 ${escapeHtml(p.ownerRealName)}</div>
                  <div class="font-black text-emeraldDeep mt-0.5" dir="ltr">📞 ${escapeHtml(p.ownerSecretPhone)}</div>
                </div>
              </td>
              <td class="py-3 px-3 font-black text-bronzeDark whitespace-nowrap">${formatCurrency(p.price)}</td>
              <td class="py-3 px-3">
                <button type="button" onclick="cyclePropertyStatus('${p.id}')" class="px-2.5 py-1 rounded-full text-[11px] font-extrabold ${statusColor}">
                  ${escapeHtml(p.status)} ↻
                </button>
              </td>
              <td class="py-3 px-3">
                <div class="flex items-center gap-1.5">
                  <button type="button" onclick="openPropertyModal('${p.id}')" class="px-2.5 py-1 rounded-lg bg-emeraldLight text-emeraldDeep font-bold text-xs hover:bg-emeraldDeep hover:text-white transition">معاينة</button>
                  <button type="button" onclick="deletePropertyListing('${p.id}')" class="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold text-xs hover:bg-red-600 hover:text-white transition">حذف</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }

      document.getElementById('appointmentsCountBadge').textContent = state.appointments.length;
      const appList = document.getElementById('dashboardAppointmentsList');
      if (state.appointments.length === 0) {
        appList.innerHTML = `<div class="p-4 rounded-2xl bg-ivoryWarm text-center text-xs text-gray-500">لا توجد طلبات معاينة أو وساطة حتى الآن.</div>`;
      } else {
        appList.innerHTML = state.appointments.map(a => {
          const prop = getPropertyById(a.propertyId);
          const isDone = a.status.includes('تم الربط');
          return `
            <div class="p-3.5 rounded-2xl bg-ivoryWarm border border-gray-200 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded bg-bronzeSoft text-bronzeDark">${escapeHtml(a.type)}</span>
                <button type="button" onclick="toggleAppointmentStatus('${a.id}')" class="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${isDone ? 'bg-emerald-600 text-white' : 'bg-amber-200 text-amber-900'}">
                  ${escapeHtml(a.status)}
                </button>
              </div>
              <div class="font-extrabold text-emeraldDeep">${prop ? escapeHtml(prop.code + ' • ' + prop.title) : 'طلب عام للشركة'}</div>
              <div class="p-2 rounded-xl bg-white border border-gray-200 space-y-1">
                <div>🙋‍♂️ <strong>المشتري:</strong> ${escapeHtml(a.clientName)} (<span dir="ltr" class="font-bold">${escapeHtml(a.clientPhone)}</span>)</div>
                ${prop ? `<div class="text-amber-900">🔒 <strong>رقم المالك السري:</strong> <span dir="ltr" class="font-black">${escapeHtml(prop.ownerSecretPhone)}</span></div>` : ''}
              </div>
              <div class="font-bold text-bronzeDark">🕒 ${escapeHtml(a.dateText)}</div>
            </div>
          `;
        }).join('');
      }

      const usersDir = document.getElementById('adminRegisteredUsersList');
      usersDir.innerHTML = state.users.map(u => `
        <div class="p-2 rounded-xl bg-ivoryWarm border border-gray-200 flex items-center justify-between">
          <div>
            <span class="font-bold text-emeraldDeep">${escapeHtml(u.name)}</span>
            <span class="text-[10px] text-gray-500 block">${escapeHtml(u.role)} • ${escapeHtml(u.email)}</span>
          </div>
          <span dir="ltr" class="font-black text-bronzeDark">${escapeHtml(u.phone)}</span>
        </div>
      `).join('');

      renderDashboardCharts();
    }

    function renderDashboardCharts() {
      if (typeof Chart === 'undefined') return;

      const viewsCtx = document.getElementById('viewsChartCanvas')?.getContext('2d');
      if (viewsCtx) {
        if (viewsChartInstance) viewsChartInstance.destroy();
        viewsChartInstance = new Chart(viewsCtx, {
          type: 'line',
          data: {
            labels: ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع الحالي'],
            datasets: [
              {
                label: 'الوحدات المعروضة',
                data: [0, 0, 0, state.properties.length],
                borderColor: '#123524',
                backgroundColor: 'rgba(18, 53, 36, 0.12)',
                fill: true,
                tension: 0.35
              },
              {
                label: 'طلبات المشترين والوساطة',
                data: [0, 0, 0, state.appointments.length],
                borderColor: '#C5A059',
                backgroundColor: 'rgba(197, 160, 89, 0.15)',
                fill: false,
                tension: 0.35
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
          }
        });
      }

      const citiesCtx = document.getElementById('citiesChartCanvas')?.getContext('2d');
      if (citiesCtx) {
        if (citiesChartInstance) citiesChartInstance.destroy();
        const cityCounts = {
          'المنيا الجديدة': 0,
          'المنيا': 0,
          'القاهرة الجديدة': 0,
          'الشيخ زايد': 0,
          'الإسكندرية': 0
        };
        state.properties.forEach(p => {
          cityCounts[p.city] = (cityCounts[p.city] || 0) + 1;
        });
        const total = Object.values(cityCounts).reduce((a, b) => a + b, 0);

        citiesChartInstance = new Chart(citiesCtx, {
          type: 'doughnut',
          data: {
            labels: total === 0 ? ['في انتظار إضافة شققك'] : Object.keys(cityCounts),
            datasets: [{
              data: total === 0 ? [1] : Object.values(cityCounts),
              backgroundColor: total === 0 ? ['#E8F0EC'] : ['#123524', '#C5A059', '#1B4D35', '#9E7B36', '#2E6F4E'],
              borderWidth: 2,
              borderColor: '#FFFFFF'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
    }

    function setAuthTab(mode) {
      const loginForm = document.getElementById('loginForm');
      const registerForm = document.getElementById('registerForm');
      const tabLogin = document.getElementById('authTabLogin');
      const tabRegister = document.getElementById('authTabRegister');

      if (mode === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.className = 'py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-bronzeChampagne text-emeraldDeep transition';
        tabRegister.className = 'py-2.5 rounded-xl text-xs sm:text-sm font-bold text-ivoryWarm hover:bg-white/10 transition';
      } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabRegister.className = 'py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-bronzeChampagne text-emeraldDeep transition';
        tabLogin.className = 'py-2.5 rounded-xl text-xs sm:text-sm font-bold text-ivoryWarm hover:bg-white/10 transition';
      }
    }

    async function handleLoginSubmit(e) {
      e.preventDefault();
      const emailOrPhone = document.getElementById('loginEmail').value.trim().toLowerCase();
      const found = state.users.find(u => u.email.toLowerCase() === emailOrPhone || u.phone.includes(emailOrPhone));
      if (found) {
        state.currentUserId = found.id;
        saveState();
        refreshAllUI();
        showToast(`تم تسجيل الدخول بنجاح بحساب: ${found.name}`);
        switchView(found.isAdmin ? 'dashboard' : 'explore');
      } else {
        showToast('لم يتم العثور على الحساب، يمكنك إنشاء حساب جديد في ثوانٍ');
      }
    }

    async function handleRegisterSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const role = document.getElementById('regRole').value;
      const email = document.getElementById('regEmail').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const city = document.getElementById('regCity').value;
      const pass = document.getElementById('regPass').value;

      if (!name || !email || phone.length < 10) {
        showToast('يرجى إدخال الاسم ورقم موبايل صحيح مكون من 11 رقماً');
        return;
      }

      const passHash = await sha256Hash(pass);
      const newUser = {
        id: 'u_' + Date.now(),
        name,
        role,
        isAdmin: false,
        email,
        phone,
        city,
        avatar: name.trim().charAt(0) || 'ع',
        verified: true,
        passHash
      };

      state.users.push(newUser);
      state.currentUserId = newUser.id;
      saveState();
      e.target.reset();
      refreshAllUI();
      showToast(`تم تسجيل حسابك (${newUser.name}) وحفظ رقمك سرياً لدى إدارة الشركة! يمكنك الآن عرض شقتك.`, 'gold');
      switchView('add');
    }

    function renderAuthAndProfile() {
      const u = getCurrentUser() || getUserById('guest');
      document.getElementById('profileCardAvatar').textContent = u.avatar;
      document.getElementById('profileCardName').textContent = u.name;
      document.getElementById('profileCardRole').textContent = u.role;
      document.getElementById('profileCardCity').textContent = `📍 ${u.city}`;
      document.getElementById('profileCardEmail').textContent = u.email;
      document.getElementById('profileCardPhone').textContent = u.phone;
      document.getElementById('profileVerifiedBadge').textContent = u.isAdmin ? 'الأدمن العام ✓' : (state.currentUserId ? 'عضو مسجل ✓' : 'زائر');

      const userProps = state.properties.filter(p => p.ownerId === u.id);
      document.getElementById('profileStatOwned').textContent = userProps.length;
      document.getElementById('profileStatSaved').textContent = state.savedPropertyIds.length;
      document.getElementById('profileStatChats').textContent = state.chatThreads.length;

      const grid = document.getElementById('authPageAccountsGrid');
      grid.innerHTML = state.users.map(acc => {
        const isCurrent = acc.id === state.currentUserId;
        return `
          <button type="button" onclick="switchActiveUser('${acc.id}')" class="p-3 rounded-2xl border text-right transition flex items-center justify-between ${isCurrent ? 'bg-emeraldLight border-emeraldDeep text-emeraldDeep font-bold' : 'bg-ivoryWarm border-gray-200 hover:border-bronzeChampagne'}">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl luxury-gradient text-bronzeChampagne font-extrabold flex items-center justify-center text-xs">${escapeHtml(acc.avatar)}</span>
              <div>
                <div class="text-xs font-extrabold text-emeraldDeep">${escapeHtml(acc.name)}</div>
                <div class="text-[10px] text-gray-500">${escapeHtml(acc.role)}</div>
              </div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isCurrent ? 'bg-emeraldDeep text-bronzeChampagne' : 'bg-bronzeSoft text-emeraldDeep'}">
              ${isCurrent ? 'نشط' : 'دخول'}
            </span>
          </button>
        `;
      }).join('') + `
        <button type="button" onclick="logoutToGuest()" class="p-3 rounded-2xl border text-right transition flex items-center justify-between ${!state.currentUserId ? 'bg-red-50 border-red-400 font-bold' : 'bg-ivoryWarm border-gray-200'}">
          <div class="text-xs font-bold text-slateInk">👤 تصفح كزائر (لرؤية قفل عرض الشقق ولوحة الأدمن)</div>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-800">تجربة</span>
        </button>
      `;

      const myPropsContainer = document.getElementById('profileUserListings');
      if (userProps.length === 0) {
        myPropsContainer.innerHTML = `
          <div class="p-4 rounded-2xl bg-ivoryWarm text-center text-xs text-gray-500 space-y-2">
            <p>لا توجد شقق مضافة تحت هذا الحساب حالياً.</p>
            <button type="button" onclick="switchView('add')" class="px-3 py-1.5 rounded-xl bg-emeraldDeep text-bronzeChampagne font-bold">+ أضف شقة الآن</button>
          </div>
        `;
      } else {
        myPropsContainer.innerHTML = userProps.map(p => `
          <div class="p-2.5 rounded-2xl bg-ivoryWarm border border-gray-200 flex items-center justify-between gap-2 text-xs">
            <div class="min-w-0">
              <div class="font-bold text-emeraldDeep truncate">${escapeHtml(p.code)} • ${escapeHtml(p.title)}</div>
              <div class="text-[11px] text-bronzeDark font-extrabold">${formatCurrency(p.price)}</div>
            </div>
            <button type="button" onclick="openPropertyModal('${p.id}')" class="px-2.5 py-1 rounded-lg bg-white border border-gray-300 font-bold text-[11px] shrink-0">عرض</button>
          </div>
        `).join('');
      }
    }

    function refreshAllUI() {
      renderUserHeader();
      renderProperties();
      renderAddPropertyAccess();
      renderChatThreadsList();
      renderActiveChatWindow();
      renderAuthAndProfile();
    }

    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('newPropPreviewImg').src = PRESET_IMAGES[0];
      refreshAllUI();
    });
