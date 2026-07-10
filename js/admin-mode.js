// js/admin-mode.js
const AdminMode = {
  container: null,
  currentTab: 'webapps',

  init(container) {
    this.container = container;

    // Build modal structure
    this.container.innerHTML = `
      <div class="admin-modal">
        <div class="admin-header">
          <h2>관리자 모드</h2>
          <button class="close-btn" id="admin-close">&times;</button>
        </div>

        <div class="admin-tabs">
          <button class="tab-btn active" data-tab="webapps">웹앱 관리</button>
          <button class="tab-btn" data-tab="settings">설정</button>
        </div>

        <div class="admin-content">
          <div id="tab-webapps" class="tab-panel active">
            <!-- Webapp list will be rendered here -->
          </div>

          <div id="tab-settings" class="tab-panel">
            <!-- Settings will be rendered here -->
          </div>
        </div>

        <div class="admin-footer">
          <button class="btn btn-exit" id="admin-exit">앱 종료</button>
        </div>
      </div>
    `;

    // Attach event listeners
    document.getElementById('admin-close').addEventListener('click', () => this.hide());
    document.getElementById('admin-exit').addEventListener('click', () => this._showExitConfirm());

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this._switchTab(tab);
      });
    });

    // Initial render
    this._renderWebappList();
    this._renderSettings();
  },

  show() {
    this.container.classList.remove('hidden');
    this.refreshWebappList();
  },

  hide() {
    this.container.classList.add('hidden');
  },

  refreshWebappList() {
    this._renderWebappList();
  },

  _switchTab(tabName) {
    this.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      if (panel.id === `tab-${tabName}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
  },

  _renderWebappList() {
    const webapps = Storage.loadWebapps();
    const defaultId = Storage.getDefaultWebappId();
    const panel = document.getElementById('tab-webapps');

    if (webapps.length === 0) {
      panel.innerHTML = `
        <div class="empty-state">
          <h3>등록된 웹앱이 없습니다</h3>
          <p>첫 웹앱을 추가해보세요</p>
        </div>
        <button class="btn btn-primary btn-add" id="btn-add-webapp">+ 새 웹앱 추가</button>
      `;
    } else {
      let html = '<div class="webapp-list">';

      webapps.forEach(webapp => {
        const isDefault = webapp.id === defaultId;
        html += `
          <div class="webapp-item ${isDefault ? 'is-default' : ''}" data-id="${webapp.id}">
            <input type="radio" class="webapp-radio" name="default-webapp"
                   ${isDefault ? 'checked' : ''} data-id="${webapp.id}">
            <div class="webapp-info">
              <div class="webapp-name">${this._escapeHtml(webapp.name)}</div>
              <div class="webapp-url">${this._escapeHtml(webapp.url)}</div>
            </div>
            ${isDefault ? '<span class="webapp-badge">기본</span>' : ''}
            <div class="webapp-actions">
              <button class="btn btn-secondary" data-action="edit" data-id="${webapp.id}">편집</button>
              <button class="btn btn-danger" data-action="delete" data-id="${webapp.id}">삭제</button>
            </div>
          </div>
        `;
      });

      html += '</div>';
      html += '<button class="btn btn-primary btn-add" id="btn-add-webapp">+ 새 웹앱 추가</button>';
      html += '<button class="btn btn-primary btn-add" id="btn-open-webapp">선택한 웹앱 열기</button>';

      panel.innerHTML = html;

      // Attach event listeners
      panel.querySelectorAll('.webapp-radio').forEach(radio => {
        radio.addEventListener('change', (e) => {
          Storage.setDefaultWebappId(e.target.dataset.id);
          this.refreshWebappList();
        });
      });

      panel.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
          this._showEditWebappModal(btn.dataset.id);
        });
      });

      panel.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => {
          this._showDeleteConfirm(btn.dataset.id);
        });
      });
    }

    const addBtn = document.getElementById('btn-add-webapp');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._showAddWebappModal());
    }

    const openBtn = document.getElementById('btn-open-webapp');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        const defaultId = Storage.getDefaultWebappId();
        if (defaultId) {
          KioskMode.loadWebapp(defaultId);
          this.hide();
        } else {
          alert('기본 웹앱을 선택해주세요');
        }
      });
    }
  },

  _renderSettings() {
    const hiddenTouch = Storage.getHiddenTouchConfig();
    const settings = Storage.getSettings();
    const panel = document.getElementById('tab-settings');

    panel.innerHTML = `
      <div class="settings-form">
        <div class="form-group">
          <label class="form-label">히든 터치 위치</label>
          <select class="form-select" id="setting-zone">
            <option value="top-left" ${hiddenTouch.zone === 'top-left' ? 'selected' : ''}>좌측 상단</option>
            <option value="top-right" ${hiddenTouch.zone === 'top-right' ? 'selected' : ''}>우측 상단</option>
            <option value="bottom-left" ${hiddenTouch.zone === 'bottom-left' ? 'selected' : ''}>좌측 하단</option>
            <option value="bottom-right" ${hiddenTouch.zone === 'bottom-right' ? 'selected' : ''}>우측 하단</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">탭 횟수</label>
          <input type="number" class="form-input" id="setting-tap-count"
                 value="${hiddenTouch.tapCount}" min="3" max="10">
        </div>

        <div class="form-group">
          <label class="form-label">자동 재시도</label>
          <div class="form-toggle">
            <label class="toggle-switch">
              <input type="checkbox" id="setting-auto-retry"
                     ${settings.autoRetryEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <span>${settings.autoRetryEnabled ? '켜짐' : '꺼짐'}</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">재시도 간격 (초)</label>
          <input type="number" class="form-input" id="setting-retry-interval"
                 value="${settings.retryInterval / 1000}" min="1" max="10">
        </div>

        <div class="form-group">
          <label class="form-label">최대 재시도 횟수</label>
          <input type="number" class="form-input" id="setting-max-attempts"
                 value="${settings.retryMaxAttempts}" min="1" max="20">
        </div>

        <button class="btn btn-primary" id="btn-save-settings">설정 저장</button>
      </div>
    `;

    // Placeholder for now - will implement save in Task 6
    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      alert('설정 저장 기능은 Task 6에서 구현됩니다');
    });
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  _showAddWebappModal() {
    // Placeholder - will implement in Task 5
    alert('웹앱 추가 모달은 Task 5에서 구현됩니다');
  },

  _showEditWebappModal(webappId) {
    // Placeholder - will implement in Task 5
    alert(`웹앱 편집 모달 (ID: ${webappId})은 Task 5에서 구현됩니다`);
  },

  _showDeleteConfirm(webappId) {
    // Placeholder - will implement in Task 5
    if (confirm('정말 삭제하시겠습니까?')) {
      Storage.deleteWebapp(webappId);
      this.refreshWebappList();
    }
  },

  _showExitConfirm() {
    if (confirm('앱을 종료하시겠습니까?')) {
      alert('PWA 종료는 홈 화면으로 돌아가거나 앱 스위처에서 종료하세요');
    }
  }
};
