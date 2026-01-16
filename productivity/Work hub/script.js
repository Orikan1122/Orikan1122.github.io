document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIG & STATE ---
    // Standard WorkHub State
    let tools = [], categories = {}, todos = [];
    let currentCategoryFilter = 'all';
    let showDoneTodos = true;
    let toolSearchTerm = '';
    let todoSearchTerm = '';
    let isDarkMode = false;

    // Calendar State
    let calendarData = {
        events: {
            "2026-01-01": { name: "Neujahrstag", type: "Holiday", time: "0:00", highlight: true }
        },
        categories: [
            { name: "Holiday", color: "#ffc000" },
            { name: "Birthday", color: "#ff99cc" },
            { name: "Vacation", color: "#66ccff" },
            { name: "Work", color: "#ccff99" },
            { name: "Other", color: "#e0e0e0" }
        ],
        config: {
            year: 2026,
            janWeeks: 5,
            decWeeks: 6,
            weekPattern: [] 
        }
    };
    
    // Calendar Runtime Variables (Not saved directly, calculated)
    const MONTHS_TOP = ["January", "February", "March", "April", "May", "June"];
    const MONTHS_BOTTOM = ["July", "August", "September", "October", "November", "December"];
    let monthCols = {
        "January": 5, "February": 4, "March": 5, "April": 4, "May": 4, "June": 5,
        "July": 4, "August": 4, "September": 5, "October": 4, "November": 4, "December": 5
    };
    let anchorDate = null;
    let selectedDateKey = null;

    // Storage Keys
    const STORAGE_KEY = 'workHubDataV11'; // Incremented version
    const CONFIG_KEY = 'workHubDriveConfig';
    const THEME_KEY = 'workHubTheme';

    // --- UI Element References ---
    const sidebar = document.getElementById('sidebar');
    const toolsPane = document.getElementById('tools-pane');
    const calendarPane = document.getElementById('calendar-pane');
    const todosPane = document.getElementById('todos-pane');
    const mainContent = document.getElementById('main-content');
    
    const gutter1 = document.getElementById('gutter-1');
    const gutter2 = document.getElementById('gutter-2');
    
    const themeToggleBtn = document.getElementById('theme-toggle');
    
    // WorkHub Inputs
    const addToolForm = document.getElementById('add-tool-form');
    const addTodoForm = document.getElementById('add-todo-form');
    const toolListContainer = document.getElementById('tool-list-container');
    const todoListContainer = document.getElementById('todo-list-container');
    const toolSelector = document.getElementById('todo-linked-tools');
    const categoryFiltersContainer = document.getElementById('category-filters');
    const categorySuggestions = document.getElementById('category-suggestions');
    const toolCategoryInput = document.getElementById('tool-category');
    const toolCategoryColorInput = document.getElementById('tool-category-color');
    const todoCategoryInput = document.getElementById('todo-category');
    const todoCategoryColorInput = document.getElementById('todo-category-color');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    const launchAllBtn = document.getElementById('launch-all-btn');
    const showDoneTodosCheckbox = document.getElementById('show-done-todos');
    const toolSearchInput = document.getElementById('tool-search-input');
    const todoSearchInput = document.getElementById('todo-search-input');
    const saveToCloudBtn = document.getElementById('save-to-cloud-btn');
    const loadFromCloudBtn = document.getElementById('load-from-cloud-btn');
    const cloudStatusEl = document.getElementById('cloud-status');
    const confUrlInput = document.getElementById('conf-url');
    const confIdInput = document.getElementById('conf-id');
    const confPwInput = document.getElementById('conf-pw');
    const saveConfigBtn = document.getElementById('save-config-btn');
    const vaultUser = document.getElementById('vault-user');
    const vaultPass = document.getElementById('vault-pass');
    const vaultLoginBtn = document.getElementById('vault-login-btn');
    // Calendar Inputs
    const calConfigYear = document.getElementById('config-year');
    const calWJan = document.getElementById('w-jan');
    const calWDec = document.getElementById('w-dec');
    const calWeekPatternInput = document.getElementById('week-pattern-input');
    const calCopyTargetYear = document.getElementById('copy-target-year');
    const calNewCatName = document.getElementById('new-cat-name');
    const calNewCatColor = document.getElementById('new-cat-color');
    const calInputStartDate = document.getElementById('input-start-date');
    const calInputEndDate = document.getElementById('input-end-date');
    const calEventType = document.getElementById('event-type');
    const calEventName = document.getElementById('event-name');
    const calEventTime = document.getElementById('event-time');
    const calEventHighlight = document.getElementById('event-highlight');

    // --- INITIALIZATION ---
    function initializeApp() {
        loadTheme();
        loadLocalData();
        loadConfig();
        attachEventListeners();
        setupSplitScreen();
        
        // Render WorkHub
        renderHub();
        // Render Calendar
        initCalendar();
        
        console.log("App initialized.");
    }

    initializeApp();

    // --- THEME MANAGEMENT ---
    function loadTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        isDarkMode = savedTheme === 'dark';
        applyTheme();
    }

    function toggleTheme() {
        isDarkMode = !isDarkMode;
        localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
        applyTheme();
    }

    function applyTheme() {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            themeToggleBtn.textContent = '☀️';
            themeToggleBtn.title = 'Switch to Light Mode';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggleBtn.textContent = '🌙';
            themeToggleBtn.title = 'Switch to Dark Mode';
        }
    }

    // --- SPLIT SCREEN LOGIC ---
    function setupSplitScreen() {
        // Toggle Buttons
        document.getElementById('toggle-sidebar')?.addEventListener('click', () => sidebar.classList.toggle('hidden'));
        
        document.getElementById('toggle-tools')?.addEventListener('click', () => {
             toolsPane.classList.toggle('hidden');
             updateGutters();
        });
        
        document.getElementById('toggle-calendar')?.addEventListener('click', () => {
            calendarPane.classList.toggle('hidden');
            updateGutters();
        });

        document.getElementById('toggle-todos')?.addEventListener('click', () => {
            todosPane.classList.toggle('hidden');
            updateGutters();
        });

        // Initialize Gutters
        updateGutters();

        // Drag Logic for Gutter 1 (Between Tools and Calendar)
        setupDrag(gutter1, toolsPane, calendarPane);
        // Drag Logic for Gutter 2 (Between Calendar and Todos)
        setupDrag(gutter2, calendarPane, todosPane);
    }

    function updateGutters() {
        const tHidden = toolsPane.classList.contains('hidden');
        const cHidden = calendarPane.classList.contains('hidden');
        const tdHidden = todosPane.classList.contains('hidden');

        // Gutter 1 is visible if Tools is visible AND (Calendar OR Todos) is visible
        if (!tHidden && (!cHidden || !tdHidden)) {
            gutter1.classList.remove('hidden');
        } else {
            gutter1.classList.add('hidden');
        }

        // Gutter 2 is visible if Calendar is visible AND Todos is visible
        if (!cHidden && !tdHidden) {
            gutter2.classList.remove('hidden');
        } else {
            gutter2.classList.add('hidden');
        }
    }

    function setupDrag(gutter, leftEl, rightEl) {
        let isDragging = false;
        gutter.addEventListener('mousedown', (e) => {
            isDragging = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const containerRect = mainContent.getBoundingClientRect();
            // Simple flex-basis adjustment based on mouse position relative to container
            // This is a simplified split logic for 3 panes
            const pointerX = e.clientX - containerRect.left;
            const percent = (pointerX / containerRect.width) * 100;
            
            // Apply size preference to left element
            leftEl.style.flexBasis = `${percent}%`;
            leftEl.style.flexGrow = '0';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

// --- UPDATED: VAULT LOGIN & CLOUD BRIDGE ---
    const VAULT_URL = "https://script.google.com/macros/s/AKfycbxsM9fmYDvprjDea64dg8DYv5OUq_MmkHVXu0zbxqiGqmrQId_QyXummxb2r6JLZYmbKg/exec"

    async function handleVaultLogin() {
        console.log("Login button clicked..."); // Debug 1
        
        const u = vaultUser.value.trim();
        const p = vaultPass.value.trim();

        if (!u || !p) {
            alert("Please enter both Username and Password.");
            return;
        }

        showCloudStatus("Connecting to Vault...", 'loading', 0);

        try {
            console.log("Fetching from Vault URL:", VAULT_URL); // Debug 2
            const response = await fetch(`${VAULT_URL}?u=${encodeURIComponent(u)}&p=${encodeURIComponent(p)}`);
            const result = await response.json();
            console.log("Vault Response:", result); // Debug 3

            if (result.success) {
                // Set values to hidden fields
                confUrlInput.value = result.config.cfgUrl;
                confIdInput.value = result.config.cfgId;
                confPwInput.value = result.config.cfgPw;
                
                saveConfig();
                showCloudStatus("Vault Synced!", 'success');
                
                // Immediately try to load data
                loadFromCloud();
            } else {
                showCloudStatus("Login Failed: Incorrect credentials", 'error');
            }
        } catch (error) {
            showCloudStatus("Connection Error", 'error');
            console.error("Critical Vault Error:", error);
        }
    }

    function getDriveConfig() {
        return {
            url: confUrlInput.value.trim(),
            id: confIdInput.value.trim(),
            pw: confPwInput.value.trim()
        };
    }

    function saveConfig() {
        const config = getDriveConfig();
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }

    function loadConfig() {
        const storedConfig = localStorage.getItem(CONFIG_KEY);
        if (storedConfig) {
            const config = JSON.parse(storedConfig);
            if(confUrlInput) confUrlInput.value = config.url || '';
            if(confIdInput) confIdInput.value = config.id || '';
            if(confPwInput) confPwInput.value = config.pw || '';
        }
    }

    async function saveToCloud() {
        const cfg = getDriveConfig();
        if (!cfg.url || !cfg.id) {
            showCloudStatus("No config. Please Login to Vault.", 'error');
            return;
        }

        showCloudStatus("Saving...", 'loading', 0);
        const dataToSave = { tools, categories, todos, calendarData };
        
        try {
            const response = await fetch(`${cfg.url}?id=${cfg.id}&pw=${cfg.pw}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(dataToSave)
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            showCloudStatus("Cloud Sync Complete!", 'success');
        } catch (error) {
            showCloudStatus(`Save Failed: ${error.message}`, 'error', 0);
        }
    }

    async function loadFromCloud() {
        const cfg = getDriveConfig();
        if (!cfg.url || !cfg.id) {
            showCloudStatus("No config. Please Login to Vault.", 'error');
            return;
        }

        showCloudStatus("Loading...", 'loading', 0);
        try {
            const response = await fetch(`${cfg.url}?id=${cfg.id}&pw=${cfg.pw}&t=${Date.now()}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error);
            
            if (data.tools) tools = data.tools;
            if (data.categories) categories = data.categories;
            if (data.todos) todos = data.todos;
            if (data.calendarData) calendarData = data.calendarData;

            saveLocalData(); 
            renderHub();
            initCalendar();
            showCloudStatus("Data Restored from Cloud", 'success');
        } catch (error) {
            showCloudStatus(`Load Failed: ${error.message}`, 'error', 0);
        }
    }
    // --- DATA HELPERS (WorkHub) ---
    function showCloudStatus(message, type = 'loading', duration = 3000) {
        if (!cloudStatusEl) return;
        cloudStatusEl.textContent = message;
        cloudStatusEl.className = `cloud-status-indicator ${type}`;
        if (duration > 0) {
            setTimeout(() => {
                cloudStatusEl.className = 'cloud-status-indicator';
            }, duration);
        }
    }

    function loadLocalData() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const data = JSON.parse(storedData);
            tools = data.tools || [];
            categories = data.categories || {};
            todos = data.todos || [];
            if(data.calendarData) calendarData = data.calendarData;
        }
        showDoneTodos = JSON.parse(localStorage.getItem('showDoneTodos')) ?? true;
        if(showDoneTodosCheckbox) showDoneTodosCheckbox.checked = showDoneTodos;
    }

    function saveLocalData() {
        const data = { tools, categories, todos, calendarData };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem('showDoneTodos', JSON.stringify(showDoneTodos));
    }
    
    function getFilteredTools() {
        const term = toolSearchTerm.toLowerCase();
        return tools.filter(tool => {
            const inCategory = currentCategoryFilter === 'all' || (tool.category || '').toLowerCase() === currentCategoryFilter;
            const matchesSearch = !term || tool.name.toLowerCase().includes(term) || (tool.description || '').toLowerCase().includes(term);
            return inCategory && matchesSearch;
        });
    }

    function getFilteredTodos() {
        const term = todoSearchTerm.toLowerCase();
        return todos.filter(todo => {
            const inCategory = currentCategoryFilter === 'all' || (todo.category || '').toLowerCase() === currentCategoryFilter;
            const matchesSearch = !term || (todo.text || '').toLowerCase().includes(term);
            const isVisible = showDoneTodos || !todo.done;
            return inCategory && matchesSearch && isVisible;
        });
    }
    
    function pruneOrphanedCategories() {
        const allUsedCategories = new Set([
            ...tools.map(t => (t.category || '').toLowerCase()),
            ...todos.map(t => (t.category || '').toLowerCase())
        ].filter(Boolean));
        
        for (const categoryKey in categories) {
            if (!allUsedCategories.has(categoryKey)) {
                delete categories[categoryKey];
            }
        }
    }

    // --- RENDER WORKHUB ---
    function renderHub() {
        renderCategories();
        renderTools();
        renderTodos();
        renderToolSelector();
    }

    function renderTools() {
        if (!toolListContainer) return;
        toolListContainer.innerHTML = '';
        const filteredTools = getFilteredTools();
        if (launchAllBtn) launchAllBtn.disabled = filteredTools.length === 0;
        if (launchAllBtn) launchAllBtn.textContent = filteredTools.length > 0 ? `Launch All (${filteredTools.length})` : 'Launch All';

        if (filteredTools.length === 0) {
            toolListContainer.innerHTML = `<p style="color:var(--text-muted)">No tools found matching your criteria.</p>`;
            return;
        }
        filteredTools.forEach(tool => {
            const card = document.createElement('div');
            card.className = 'tool-card';
            card.dataset.id = tool.id;
            const statusClass = tool.status || 'not-set';
            const statusText = statusClass.replace(/-/g, ' ');
            const isLocalFile = (tool.url || '').startsWith('file:///');
            const categoryKey = (tool.category || '').toLowerCase();
            const categoryStyle = categories[categoryKey] || { color: '#7f8c8d' };

            card.innerHTML = `
                <div class="card-content">
                    <div class="tool-card-header">
                        <h3>${tool.name}</h3>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <span class="category-tag" style="background-color: ${categoryStyle.color};">${tool.category || 'Uncategorized'}</span>
                    <p class="tool-description">${tool.description || 'No description provided.'}</p>
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-small" data-action="copy-path" ${!isLocalFile ? 'disabled title="Only for local file URLs"' : ''}>Copy Path</button>
                    <button class="btn btn-secondary btn-small" data-action="edit-tool">Edit</button>
                    <a href="${tool.url}" target="_blank" rel="noopener noreferrer" class="btn btn-small">Launch</a>
                    <button class="btn btn-danger btn-small" data-action="delete-tool">Delete</button>
                </div>
            `;
            toolListContainer.appendChild(card);
        });
    }

    function renderCategories() {
        if (!categoryFiltersContainer || !categorySuggestions) return;
        categoryFiltersContainer.innerHTML = '';
        categorySuggestions.innerHTML = '';
        
        const allFilter = document.createElement('span');
        allFilter.className = 'category-filter';
        allFilter.textContent = 'all';
        allFilter.dataset.category = 'all';
        allFilter.style.backgroundColor = '#7f8c8d';
        if ('all' === currentCategoryFilter) allFilter.classList.add('active');
        categoryFiltersContainer.appendChild(allFilter);

        Object.keys(categories).sort().forEach(key => {
            const category = categories[key];
            const filterEl = document.createElement('span');
            filterEl.className = 'category-filter';
            filterEl.textContent = key;
            filterEl.dataset.category = key;
            filterEl.style.backgroundColor = category.color;
            if (key === currentCategoryFilter) filterEl.classList.add('active');
            categoryFiltersContainer.appendChild(filterEl);
            
            const optionEl = document.createElement('option');
            optionEl.value = key;
            categorySuggestions.appendChild(optionEl);
        });
    }
    
    function renderTodos() {
        if (!todoListContainer) return;
        todoListContainer.innerHTML = '';
        const filteredTodos = getFilteredTodos();
        
        const sortedTodos = filteredTodos.sort((a, b) => {
            if (a.done !== b.done) return a.done ? 1 : -1;
            if (!a.dueDate) return 1; if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        if (sortedTodos.length === 0) {
            todoListContainer.innerHTML = `<p style="color:var(--text-muted)">No tasks found matching your criteria.</p>`;
        } else {
            sortedTodos.forEach(todo => {
                const card = document.createElement('div');
                card.className = 'todo-card';
                card.dataset.id = todo.id;
                const today = new Date();
                today.setHours(0,0,0,0);
                const dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
                if (todo.done) card.classList.add('done');
                if (!todo.done && dueDate && dueDate < today) card.classList.add('overdue');
                const categoryKey = (todo.category || '').toLowerCase();
                const categoryStyle = categories[categoryKey] || { color: '#7f8c8d' };

                let linkedToolsHtml = '';
                (todo.linkedTools || []).forEach(toolId => {
                    const tool = tools.find(t => t.id === toolId);
                    if (tool) linkedToolsHtml += `<a href="${tool.url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-small">${tool.name}</a>`;
                });

                card.innerHTML = `
                    <div class="card-content">
                        <div class="todo-card-header">
                            <input type="checkbox" data-action="toggle-done" ${todo.done ? 'checked' : ''}>
                            <p class="todo-text">${todo.text.replace(/\n/g, '<br>')}</p>
                        </div>
                        <span class="category-tag" style="background-color: ${categoryStyle.color};">${todo.category || 'Uncategorized'}</span>
                        <div class="todo-card-footer">
                             <span class="due-date">${todo.dueDate ? `Due: ${todo.dueDate}` : 'No due date'}</span>
                             <div class="todo-linked-tools">${linkedToolsHtml}</div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-small" data-action="edit-todo">Edit</button>
                        <button class="btn btn-danger btn-small" data-action="delete-todo" title="Delete Task">✖</button>
                    </div>
                `;
                todoListContainer.appendChild(card);
            });
        }
    }

    function renderToolSelector() {
        if (!toolSelector) return;
        toolSelector.innerHTML = '';
        tools.sort((a, b) => a.name.localeCompare(b.name)).forEach(tool => {
            const option = document.createElement('option');
            option.value = tool.id;
            option.textContent = tool.name;
            toolSelector.appendChild(option);
        });
    }

    function toggleToolEditMode(card, tool) {
        const statusOptions = ['not-set', 'working', 'unfinished', 'issues-to-be-fixed'];
        let statusOptionsHTML = statusOptions.map(s => 
            `<option value="${s}" ${tool.status === s ? 'selected' : ''}>${s.replace(/-/g, ' ')}</option>`
        ).join('');

        card.innerHTML = `
            <div class="edit-area">
                <div class="form-group"><label>Name</label><input class="edit-tool-name" value="${tool.name}"></div>
                <div class="form-group"><label>URL</label><input class="edit-tool-url" value="${tool.url}"></div>
                <div class="form-group"><label>Category</label><input class="edit-tool-category" value="${tool.category || ''}" list="category-suggestions"></div>
                <div class="form-group"><label>Status</label><select class="edit-tool-status">${statusOptionsHTML}</select></div>
                <div class="form-group"><label>Description</label><textarea class="edit-tool-description">${tool.description || ''}</textarea></div>
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary btn-small" data-action="cancel-edit-tool">Cancel</button>
                <button class="btn btn-small" data-action="save-tool">Save</button>
            </div>
        `;
    }

    function saveToolEdit(card, tool) {
        const newCategoryName = card.querySelector('.edit-tool-category').value.trim();
        const newCategoryKey = newCategoryName.toLowerCase();
        
        tool.name = card.querySelector('.edit-tool-name').value.trim();
        tool.url = card.querySelector('.edit-tool-url').value.trim();
        tool.category = newCategoryName || 'Uncategorized';
        tool.status = card.querySelector('.edit-tool-status').value;
        tool.description = card.querySelector('.edit-tool-description').value.trim();
        
        if (newCategoryName && !categories[newCategoryKey]) {
            categories[newCategoryKey] = { color: '#3498db' };
        }
        
        pruneOrphanedCategories();
        saveLocalData();
        renderHub();
    }

    function toggleTodoEditMode(card, todo) {
        let toolOptionsHTML = '';
        tools.sort((a,b) => a.name.localeCompare(b.name)).forEach(t => {
            const isSelected = (todo.linkedTools || []).includes(t.id);
            toolOptionsHTML += `<option value="${t.id}" ${isSelected ? 'selected' : ''}>${t.name}</option>`;
        });

        card.innerHTML = `
            <div class="edit-area">
                <div class="form-group"><label>Task</label><textarea class="edit-todo-text">${todo.text}</textarea></div>
                <div class="form-group"><label>Category</label><input type="text" class="edit-todo-category" value="${todo.category || ''}" list="category-suggestions"></div>
                <div class="form-group"><label>Due Date</label><input type="date" class="edit-todo-due-date" value="${todo.dueDate || ''}"></div>
                <div class="form-group"><label>Linked Tools</label><select class="edit-todo-linked-tools" multiple>${toolOptionsHTML}</select></div>
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary btn-small" data-action="cancel-edit-todo">Cancel</button>
                <button class="btn btn-small" data-action="save-todo">Save</button>
            </div>
        `;
    }

    function saveTodoEdit(card, todo) {
        const newCategoryName = card.querySelector('.edit-todo-category').value.trim();
        const newCategoryKey = newCategoryName.toLowerCase();
        
        todo.text = card.querySelector('.edit-todo-text').value.trim();
        todo.dueDate = card.querySelector('.edit-todo-due-date').value;
        todo.category = newCategoryName || 'Uncategorized';
        todo.linkedTools = [...card.querySelector('.edit-todo-linked-tools').selectedOptions].map(opt => Number(opt.value));
        
        if (newCategoryName && !categories[newCategoryKey]) {
            categories[newCategoryKey] = { color: '#3498db' };
        }
        
        pruneOrphanedCategories();
        saveLocalData();
        renderHub();
    }
    
    // --- CALENDAR FUNCTIONS (Ported & Integrated) ---
// --- CALENDAR FUNCTIONS (Updated for Multi-Event Support) ---
    function initCalendar() {
        if (!calendarData.config) {
             calendarData.config = { year: 2026, janWeeks: 5, decWeeks: 6, weekPattern: [] };
        }
        
        // MIGRATION: Convert old single-object events to Arrays
        Object.keys(calendarData.events).forEach(key => {
            if (!Array.isArray(calendarData.events[key])) {
                calendarData.events[key] = [calendarData.events[key]];
            }
        });

        // Populate inputs
        calConfigYear.value = calendarData.config.year;
        calWJan.value = calendarData.config.janWeeks;
        calWDec.value = calendarData.config.decWeeks;
        calWeekPatternInput.value = (calendarData.config.weekPattern || []).join(', ');

        updateCategoryDropdown();
        renderCalendarCategoryTags();
        recalcDateAnchor();
        updateSmartHeader();
        
        setInterval(updateSmartHeader, 60000);
    }

    let editingEventIndex = -1; // Track which sub-event we are editing

    function updateSmartHeader() {
        const now = new Date(); 
        const d = String(now.getDate()).padStart(2,'0');
        const m = String(now.getMonth()+1).padStart(2,'0');
        const y = now.getFullYear();
        
        const oneJan = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now - oneJan) / 86400000);
        const wkNum = Math.ceil((now.getDay() + 1 + days) / 7);

        document.getElementById("smart-date-display").innerHTML = 
            `Today is ${d}.${m}.${y} <span style="opacity:0.7">| Cal Week ${wkNum}</span>`;

        const keyToday = formatDateKey(now);
        const tmr = new Date(now); tmr.setDate(now.getDate()+1);
        const keyTmr = formatDateKey(tmr);

        // Helper to get names from array
        const getNames = (k) => {
            if(!calendarData.events[k]) return "No events";
            return calendarData.events[k].map(e => e.name).join(", ");
        };

        document.getElementById("smart-event-display").innerHTML = `
            <div><strong>Today:</strong> ${getNames(keyToday)}</div>
            <div><strong>Tomorrow:</strong> ${getNames(keyTmr)}</div>
        `;
    }

    function recalcDateAnchor() {
        const year = parseInt(calConfigYear.value);
        calendarData.config.year = year;
        
        const jan1 = new Date(year, 0, 1);
        const dayOfWeek = jan1.getDay(); 
        let jsDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
        const monday = new Date(jan1);
        monday.setDate(jan1.getDate() - jsDay);
        anchorDate = monday;
        
        if (calendarData.config.weekPattern && calendarData.config.weekPattern.length > 0) {
            renderFromPattern();
        } else {
            resetPattern();
        }
    }
    
    function updateStructure() {
        monthCols["January"] = parseInt(calWJan.value);
        monthCols["December"] = parseInt(calWDec.value);
        calendarData.config.janWeeks = monthCols["January"];
        calendarData.config.decWeeks = monthCols["December"];
        resetPattern();
    }

    function resetPattern() {
        monthCols["January"] = parseInt(calWJan.value);
        monthCols["December"] = parseInt(calWDec.value);
        const totalWeeks = Object.values(monthCols).reduce((a,b) => a+b, 0);
        let arr = []; for(let i=1; i<=totalWeeks; i++) arr.push(i);
        calendarData.config.weekPattern = arr;
        calWeekPatternInput.value = arr.join(", ");
        saveLocalData();
        renderFromPattern();
    }
    
    function renderFromPattern() {
        const txt = calWeekPatternInput.value;
        if(txt) calendarData.config.weekPattern = txt.split(",").map(s => s.trim());
        renderCalendarAll();
    }

    function renderCalendarAll() {
        const year = parseInt(calConfigYear.value);
        const topConfig = MONTHS_TOP.map(m => ({ name: m, cols: monthCols[m] }));
        const bottomConfig = MONTHS_BOTTOM.map(m => ({ name: m, cols: monthCols[m] }));
        
        let topTotalWeeks = topConfig.reduce((a,b) => a + b.cols, 0);
        const fullPattern = calendarData.config.weekPattern || [];
        const topWeeksArr = fullPattern.slice(0, topTotalWeeks);
        const botWeeksArr = fullPattern.slice(topTotalWeeks);

        createTable("calendar-top", topConfig, topWeeksArr, anchorDate, year, 0);
        createTable("calendar-bottom", bottomConfig, botWeeksArr, anchorDate, year, topTotalWeeks);
        renderListGroups(year);
    }

    function createTable(containerId, config, weekLabels, anchorDate, targetYear, weekOffsetGlobal) {
        const container = document.getElementById(containerId);
        container.innerHTML = "";
        const table = document.createElement("table");
        table.className = "cal-grid"; 

        const trMonth = document.createElement("tr");
        trMonth.className = "header-row";
        const thYear = document.createElement("th"); thYear.innerText = targetYear; thYear.style.width="50px"; trMonth.appendChild(thYear);
        config.forEach(m => {
            const th = document.createElement("th"); th.colSpan = m.cols; th.innerText = m.name; th.className = "month-end-border"; trMonth.appendChild(th);
        });
        table.appendChild(trMonth);

        const trWeek = document.createElement("tr"); trWeek.className = "wk-header-row";
        const thLabel = document.createElement("th"); thLabel.innerText = "Wk#"; trWeek.appendChild(thLabel);
        let flatColIndex = 0;
        config.forEach(m => {
            for(let i=0; i<m.cols; i++) {
                const th = document.createElement("th"); th.innerText = weekLabels[flatColIndex] || "?";
                if(i === m.cols - 1) th.classList.add("month-end-border");
                trWeek.appendChild(th); flatColIndex++;
            }
        });
        table.appendChild(trWeek);

        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        days.forEach((dName, dIndex) => {
            const tr = document.createElement("tr");
            if(dIndex >= 5) tr.className = "weekend-row";
            const tdLabel = document.createElement("td"); tdLabel.className = "day-label"; tdLabel.innerText = dName; tr.appendChild(tdLabel);
            
            let localWeekOffset = 0;
            config.forEach(m => {
                for(let i=0; i<m.cols; i++) {
                    const td = document.createElement("td");
                    const totalWeeks = weekOffsetGlobal + localWeekOffset;
                    const daysToAdd = (totalWeeks * 7) + dIndex;
                    const cellDate = new Date(anchorDate);
                    cellDate.setDate(anchorDate.getDate() + daysToAdd);
                    
                    if (cellDate.getFullYear() !== targetYear) {
                         td.className = "empty-cell";
                    } else {
                        const dateKey = formatDateKey(cellDate);
                        td.innerText = String(cellDate.getDate()).padStart(2, '0');
                        td.dataset.date = dateKey;
                        
                        const eventsArr = calendarData.events[dateKey];
                        if (eventsArr && eventsArr.length > 0) {
                            // Find primary event to color (first highlighted, or just first)
                            const primary = eventsArr.find(e => e.highlight) || eventsArr[0];
                            if(primary.highlight) {
                                td.style.backgroundColor = getCalendarCategoryColor(primary.type);
                                td.style.fontWeight = "bold";
                            }
                            // Add dot if multiple events
                            if (eventsArr.length > 1) {
                                const dot = document.createElement('div');
                                dot.className = 'multi-event-dot';
                                td.appendChild(dot);
                            }
                        }
                        
                        if (dateKey === selectedDateKey) td.classList.add("selected");
                        td.addEventListener('click', () => selectDate(dateKey));
                    }
                    if(i === m.cols - 1) td.classList.add("month-end-border");
                    tr.appendChild(td); localWeekOffset++;
                }
            });
            table.appendChild(tr);
        });
        container.appendChild(table);
    }

    function renderListGroups(filterYear) {
        const container = document.getElementById("lists-container");
        container.innerHTML = "";
        filterYear = String(filterYear);

        // Group by type
        let grouped = {};
        Object.keys(calendarData.events).sort().forEach(dateKey => {
            if(dateKey.startsWith(filterYear)) {
                // Loop through all events on this day
                const evList = calendarData.events[dateKey];
                evList.forEach(ev => {
                    const type = ev.type || "Other";
                    if(!grouped[type]) grouped[type] = [];
                    const parts = dateKey.split("-");
                    const dObj = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                    grouped[type].push({ dateKey: dateKey, dateObj: dObj, ...ev });
                });
            }
        });

        Object.keys(grouped).forEach(type => {
            const box = document.createElement("div"); box.className = "category-box";
            const header = document.createElement("div"); header.className = "category-header";
            const col = getCalendarCategoryColor(type);
            header.innerText = type; header.style.borderBottom = `3px solid ${col}`;
            box.appendChild(header);

            const table = document.createElement("table"); table.className = "compact-list";
            table.innerHTML = `<thead><tr><th style="width:30px"></th><th>Date</th><th>Event</th><th>Time</th></tr></thead>`;
            const tbody = document.createElement("tbody");

            let list = grouped[type];
            if(list.length > 0) {
                // Sort by date
                list.sort((a,b) => a.dateObj - b.dateObj);
                
                let currentStart = list[0];
                let currentEnd = list[0];
                let count = 1;

                for (let i = 1; i < list.length; i++) {
                    const prev = list[i-1];
                    const curr = list[i];
                    
                    const isConsecutive = (curr.dateObj - prev.dateObj) === 86400000;
                    const isSameName = curr.name === prev.name;

                    if (isConsecutive && isSameName) {
                        currentEnd = curr;
                        count++;
                    } else {
                        tbody.appendChild(createRow(currentStart, currentEnd, count, type));
                        currentStart = curr;
                        currentEnd = curr;
                        count = 1;
                    }
                }
                tbody.appendChild(createRow(currentStart, currentEnd, count, type));
            }

            table.appendChild(tbody);
            box.appendChild(table);
            container.appendChild(box);
        });
    }

    function createRow(startItem, endItem, count, typeFilter) {
        const tr = document.createElement("tr");

        const tdDel = document.createElement("td");
        const btnDel = document.createElement("button");
        btnDel.className = "btn-list-del";
        btnDel.innerHTML = "×";
        btnDel.title = "Delete Event Series";
        btnDel.onclick = (e) => {
            e.stopPropagation(); 
            deleteRange(startItem.dateObj, endItem.dateObj, typeFilter);
        };
        tdDel.appendChild(btnDel);

        let dateText = count > 1 ? `${formatDisplayDate(startItem.dateKey)} - ${formatDisplayDate(endItem.dateKey)}` : formatDisplayDate(startItem.dateKey);
        let timeText = count > 1 ? `<b>${count} Days</b>` : startItem.time;

        const tdDate = document.createElement("td"); tdDate.innerHTML = dateText;
        const tdName = document.createElement("td"); tdName.innerHTML = startItem.name;
        const tdTime = document.createElement("td"); tdTime.innerHTML = timeText;

        tr.appendChild(tdDel);
        tr.appendChild(tdDate);
        tr.appendChild(tdName);
        tr.appendChild(tdTime);
        tr.onclick = () => selectDate(startItem.dateKey);
        return tr;
    }

    function deleteRange(startDateObj, endDateObj, typeFilter) {
        if(!confirm(`Delete "${typeFilter}" events in this range?`)) return;
        
        let curr = new Date(startDateObj);
        while(curr <= endDateObj) {
            const k = formatDateKey(curr);
            if (calendarData.events[k]) {
                // Only remove events matching the type
                calendarData.events[k] = calendarData.events[k].filter(e => e.type !== typeFilter);
                if(calendarData.events[k].length === 0) delete calendarData.events[k];
            }
            curr.setDate(curr.getDate() + 1);
        }
        saveLocalData();
        renderCalendarAll(); 
        updateSmartHeader();
    }

    function selectDate(dateKey) {
        selectedDateKey = dateKey;
        editingEventIndex = -1; // Reset editing mode
        
        document.querySelectorAll(".selected").forEach(e=>e.classList.remove("selected"));
        const cell = document.querySelector(`td[data-date="${dateKey}"]`);
        if(cell) cell.classList.add("selected");

        calInputStartDate.value = dateKey;
        calInputEndDate.value = ""; 
        
        // Reset Inputs
        calEventName.value = "";
        calEventTime.value = "0:00";
        calEventHighlight.checked = true;

        renderDayEventsList(dateKey);
    }
    
    function renderDayEventsList(dateKey) {
        const container = document.getElementById("day-events-list");
        if(!container) return;
        container.innerHTML = "";
        
        const eventsArr = calendarData.events[dateKey] || [];
        
        // "New Event" pill
        const newPill = document.createElement("div");
        newPill.className = `event-pill ${editingEventIndex === -1 ? 'active' : ''}`;
        newPill.innerHTML = `<span>+ New Event</span>`;
        newPill.onclick = () => {
            editingEventIndex = -1;
            calEventName.value = "";
            calEventTime.value = "0:00";
            calEventHighlight.checked = true;
            renderDayEventsList(dateKey);
        };
        container.appendChild(newPill);

        // Existing Events pills
        eventsArr.forEach((ev, idx) => {
            const pill = document.createElement("div");
            pill.className = `event-pill ${editingEventIndex === idx ? 'active' : ''}`;
            const color = getCalendarCategoryColor(ev.type);
            pill.innerHTML = `<span class="pill-color" style="background:${color}"></span> <span>${ev.name}</span>`;
            
            pill.onclick = () => {
                editingEventIndex = idx;
                calEventName.value = ev.name;
                calEventTime.value = ev.time;
                calEventType.value = ev.type;
                calEventHighlight.checked = ev.highlight;
                renderDayEventsList(dateKey); // Re-render to highlight active pill
            };
            container.appendChild(pill);
        });
    }

    function saveEvent() {
        const startVal = calInputStartDate.value;
        const endVal = calInputEndDate.value;
        const name = calEventName.value;
        const time = calEventTime.value;
        const type = calEventType.value;
        const highlight = calEventHighlight.checked;

        if(!startVal || !name) return alert("Start Date and Name required");

        const newEventObj = { name, time, type, highlight };

        if (!endVal || endVal === startVal) {
            // Single Day
            if (!calendarData.events[startVal]) calendarData.events[startVal] = [];
            
            if (editingEventIndex > -1) {
                // Update existing
                calendarData.events[startVal][editingEventIndex] = newEventObj;
            } else {
                // Add new
                calendarData.events[startVal].push(newEventObj);
            }
            selectDate(startVal); // Refresh view
        } else {
            // Range
            const sDate = new Date(startVal);
            const eDate = new Date(endVal);
            if(eDate < sDate) return alert("End date error");
            
            let curr = new Date(sDate);
            while (curr <= eDate) {
                const k = formatDateKey(curr);
                if (!calendarData.events[k]) calendarData.events[k] = [];
                // For ranges, we always append (Add) currently, as matching indices across days is complex
                calendarData.events[k].push({ ...newEventObj }); 
                curr.setDate(curr.getDate() + 1);
            }
            selectDate(startVal);
        }
        
        saveLocalData();
        renderCalendarAll(); 
        updateSmartHeader();
    }

    function deleteEvent() {
        const dateKey = calInputStartDate.value;
        if(dateKey && calendarData.events[dateKey]) {
            if (editingEventIndex > -1) {
                // Delete specific sub-event
                calendarData.events[dateKey].splice(editingEventIndex, 1);
                if (calendarData.events[dateKey].length === 0) delete calendarData.events[dateKey];
                selectDate(dateKey); // Reset
            } else {
                alert("Please select a specific event from the list below to delete it.");
            }
            saveLocalData();
            renderCalendarAll(); 
            updateSmartHeader();
        }
    }

    function copyEventsToYear() {
        const currentYearStr = calConfigYear.value;
        const targetYearStr = calCopyTargetYear.value;
        
        if(!targetYearStr) return alert("Enter target year");
        if(currentYearStr === targetYearStr) return alert("Target year must be different");

        if(!confirm(`Copy all events from ${currentYearStr} to ${targetYearStr}?`)) return;

        let count = 0;
        Object.keys(calendarData.events).forEach(key => {
            if(key.startsWith(currentYearStr)) {
                const parts = key.split("-");
                const newKey = `${targetYearStr}-${parts[1]}-${parts[2]}`;
                
                if(!calendarData.events[newKey]) calendarData.events[newKey] = [];
                
                // Copy all events from source day to target day
                calendarData.events[key].forEach(ev => {
                    calendarData.events[newKey].push({ ...ev });
                });
                count++;
            }
        });

        saveLocalData();
        alert(`Copied events from ${count} days to ${targetYearStr}.`);
    }

    // --- CALENDAR CATEGORIES ---
    function updateCategoryDropdown() {
        calEventType.innerHTML = "";
        calendarData.categories.forEach(c => {
            const opt = document.createElement("option"); opt.value = c.name; opt.innerText = c.name; calEventType.appendChild(opt);
        });
    }
    
    function renderCalendarCategoryTags() {
        const div = document.getElementById("cat-list-display"); 
        div.innerHTML = "";
        calendarData.categories.forEach((c, index) => {
            const tag = document.createElement("div"); 
            tag.className = "cat-tag"; 
            tag.style.borderLeft = `5px solid ${c.color}`;
            tag.innerHTML = `${c.name}`;
            const closeSpan = document.createElement("span");
            closeSpan.innerHTML = "&times;";
            closeSpan.onclick = () => removeCalendarCategory(index);
            tag.appendChild(closeSpan);
            div.appendChild(tag);
        });
    }
    
    function addCalendarCategory() {
        const name = calNewCatName.value;
        const color = calNewCatColor.value;
        if(name) { 
            calendarData.categories.push({ name, color }); 
            saveLocalData();
            updateCategoryDropdown(); 
            renderCalendarCategoryTags(); 
            renderCalendarAll(); 
        }
    }
    
    function removeCalendarCategory(index) {
        if(confirm("Remove category?")) { 
            calendarData.categories.splice(index, 1); 
            saveLocalData();
            updateCategoryDropdown(); 
            renderCalendarCategoryTags(); 
            renderCalendarAll(); 
        }
    }
    
    function getCalendarCategoryColor(typeName) {
        const found = calendarData.categories.find(c => c.name === typeName); 
        return found ? found.color : "#ccc";
    }

    function formatDateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
    function formatDisplayDate(s) { const d = new Date(s); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${d.getDate()}-${m[d.getMonth()]}`; }

    // --- EVENT LISTENERS ---
    function attachEventListeners() {
        
        // Theme
        themeToggleBtn?.addEventListener('click', toggleTheme);

        // Cloud Actions
        document.getElementById('vault-login-btn')?.addEventListener('click', handleVaultLogin);
        saveToCloudBtn?.addEventListener('click', saveToCloud);
        loadFromCloudBtn?.addEventListener('click', loadFromCloud);
        // Correct listener for the Vault button
        vaultLoginBtn?.addEventListener('click', handleVaultLogin);
        // WorkHub Search and Filters
        toolSearchInput?.addEventListener('input', e => { toolSearchTerm = e.target.value; renderTools(); });
        todoSearchInput?.addEventListener('input', e => { todoSearchTerm = e.target.value; renderTodos(); });
        showDoneTodosCheckbox?.addEventListener('change', () => {
            showDoneTodos = showDoneTodosCheckbox.checked;
            saveLocalData();
            renderTodos();
        });
        categoryFiltersContainer?.addEventListener('click', (e) => {
            const target = e.target.closest('.category-filter');
            if (target) {
                currentCategoryFilter = target.dataset.category;
                renderHub();
            }
        });

        // Forms and Inputs
        [toolCategoryInput, todoCategoryInput].forEach(input => {
            if(input) input.addEventListener('input', e => {
                const categoryKey = e.target.value.toLowerCase();
                if (categories[categoryKey]) {
                    const color = categories[categoryKey].color;
                    if(toolCategoryColorInput) toolCategoryColorInput.value = color;
                    if(todoCategoryColorInput) todoCategoryColorInput.value = color;
                }
            });
        });

        addToolForm?.addEventListener('submit', e => {
            e.preventDefault();
            const categoryName = toolCategoryInput.value.trim();
            const categoryKey = categoryName.toLowerCase();
            
            tools.push({
                id: Date.now(),
                name: document.getElementById('tool-name').value.trim(),
                url: document.getElementById('tool-url').value.trim(),
                category: categoryName || 'Uncategorized',
                status: document.getElementById('tool-status').value,
                description: document.getElementById('tool-description').value.trim(),
            });
            
            if (categoryName && !categories[categoryKey]) {
                categories[categoryKey] = { color: toolCategoryColorInput.value };
            }
            
            saveLocalData();
            renderHub();
            addToolForm.reset();
            toolCategoryColorInput.value = '#3498db';
        });
        
        addTodoForm?.addEventListener('submit', e => {
            e.preventDefault();
            const categoryName = todoCategoryInput.value.trim();
            const categoryKey = categoryName.toLowerCase();

            todos.push({
                id: Date.now(),
                text: document.getElementById('todo-text').value.trim(),
                dueDate: document.getElementById('todo-due-date').value,
                done: false,
                completionDate: null,
                category: categoryName || 'Uncategorized',
                linkedTools: [...toolSelector.selectedOptions].map(opt => Number(opt.value))
            });
            
            if (categoryName && !categories[categoryKey]) {
                categories[categoryKey] = { color: todoCategoryColorInput.value };
            }

            saveLocalData();
            renderHub();
            addTodoForm.reset();
            todoCategoryColorInput.value = '#3498db';
        });

        // Card Actions (Todos)
        todoListContainer?.addEventListener('click', e => {
            const button = e.target.closest('button[data-action]');
            const checkbox = e.target.closest('input[data-action="toggle-done"]');

            if (button) {
                const action = button.dataset.action;
                const card = button.closest('.todo-card');
                const todoId = Number(card.dataset.id);
                const todo = todos.find(t => t.id === todoId);

                if (action === 'delete-todo') { 
                    if (confirm('Delete this task?')) { 
                        todos = todos.filter(t => t.id !== todoId); 
                        pruneOrphanedCategories();
                        saveLocalData(); 
                        renderHub(); 
                    } 
                }
                else if (action === 'edit-todo') { toggleTodoEditMode(card, todo); }
                else if (action === 'save-todo') { saveTodoEdit(card, todo); }
                else if (action === 'cancel-edit-todo') { renderTodos(); }
            } else if (checkbox) {
                const todoId = Number(checkbox.closest('.todo-card').dataset.id);
                const todo = todos.find(t => t.id === todoId);
                if (todo) {
                    todo.done = checkbox.checked;
                    todo.completionDate = todo.done ? new Date().toISOString() : null;
                    saveLocalData();
                    renderTodos();
                }
            }
        });
        
        // Card Actions (Tools)
        launchAllBtn?.addEventListener('click', () => {
            getFilteredTools().forEach(tool => window.open(tool.url, '_blank'));
        });
        
        toolListContainer?.addEventListener('click', e => {
            const button = e.target.closest('button[data-action], a[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            if (!action || action === 'launch') return;

            e.preventDefault();
            const card = button.closest('.tool-card');
            const toolId = Number(card.dataset.id);
            const tool = tools.find(t => t.id === toolId);
            
            if (action === 'delete-tool') { 
                if (confirm(`Delete "${tool.name}"?`)) { 
                    tools = tools.filter(t => t.id !== toolId); 
                    pruneOrphanedCategories();
                    saveLocalData(); 
                    renderHub(); 
                } 
            }
            else if (action === 'edit-tool') { toggleToolEditMode(card, tool); }
            else if (action === 'save-tool') { saveToolEdit(card, tool); }
            else if (action === 'cancel-edit-tool') { renderTools(); }
            else if (action === 'copy-path') {
                if ((tool.url || '').startsWith('file:///')) {
                    const osPath = decodeURIComponent(tool.url.substring(0, tool.url.lastIndexOf('/'))).replace('file:///', '');
                    navigator.clipboard.writeText(osPath.replace(/\//g, '\\')).then(() => {
                        button.textContent = 'Copied!'; button.classList.add('copied');
                        setTimeout(() => { button.textContent = 'Copy Path'; button.classList.remove('copied'); }, 2000);
                    });
                }
            }
        });

        // --- CALENDAR LISTENERS ---
        calConfigYear?.addEventListener('change', recalcDateAnchor);
        calWJan?.addEventListener('change', updateStructure);
        calWDec?.addEventListener('change', updateStructure);
        calWeekPatternInput?.addEventListener('change', renderFromPattern);
        calInputStartDate?.addEventListener('change', () => {
             const val = calInputStartDate.value;
             if(val) selectDate(val);
        });
        
        document.getElementById('btn-reset-pattern')?.addEventListener('click', resetPattern);
        document.getElementById('btn-copy-year')?.addEventListener('click', copyEventsToYear);
        document.getElementById('btn-add-cat')?.addEventListener('click', addCalendarCategory);
        document.getElementById('btn-save-event')?.addEventListener('click', saveEvent);
        document.getElementById('btn-del-event')?.addEventListener('click', deleteEvent);

        // DATA I/O HANDLERS
        exportBtn?.addEventListener('click', () => {
            const dataStr = JSON.stringify({ tools, categories, todos, calendarData }, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `work-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
        document.getElementById('toggle-cal-settings-btn')?.addEventListener('click', (e) => {
            const content = document.getElementById('cal-settings-content');
            content.classList.toggle('collapsed');
            
            // Optional: Change button symbol based on state
            if (content.classList.contains('collapsed')) {
                e.target.textContent = '+'; // Symbol when closed
            } else {
                e.target.textContent = '_'; // Symbol when open
            }
        });
        importFile?.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const data = JSON.parse(event.target.result);
                    // Basic validation
                    if (!data.tools) throw new Error("JSON missing required data.");
                    
                    if (confirm('This will overwrite all current data. Proceed?')) {
                        tools = data.tools || [];
                        categories = data.categories || {};
                        todos = data.todos || [];
                        calendarData = data.calendarData || calendarData; // Fallback if old JSON format
                        
                        saveLocalData();
                        currentCategoryFilter = 'all';
                        renderHub();
                        initCalendar();
                        alert('Data imported successfully!');
                    }
                } catch (error) {
                    alert('Failed to import file.\nError: ' + error.message);
                } finally {
                    importFile.value = '';
                }
            };
            reader.readAsText(file);
        });
    }

});