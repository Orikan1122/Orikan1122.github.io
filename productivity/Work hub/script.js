document.addEventListener('DOMContentLoaded', () => {
    // --- FIREBASE SETUP ---
    const firebaseConfig = {
        apiKey: "AIzaSyBoZtDWEJwPFYvvR6LJgPM8fIqQWrQgDFs",
        authDomain: "json-database-1122.firebaseapp.com",
        projectId: "json-database-1122",
        storageBucket: "json-database-1122.appspot.com",
        messagingSenderId: "332768532067",
        appId: "1:332768532067:web:3bc80fee92d17c046c8a56"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    let currentUserId = null;
    let isLoggingOut = false;
    
    // NEUE WACHVARIABLE: Stellt sicher, dass die App nur einmal initialisiert wird.
    let appInitialized = false;


    // --- STATE & REFS ---
    let tools = [], categories = {}, todos = [];
    let currentCategoryFilter = 'all';
    let showDoneTodos = true;
    let toolSearchTerm = '';
    let todoSearchTerm = '';
    const STORAGE_KEY = 'workHubDataV10';

    // --- UI Element References ---
    const sidebar = document.getElementById('sidebar');
    const toolsPane = document.getElementById('tools-pane');
    const todosPane = document.getElementById('todos-pane');
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
    const summaryModalOverlay = document.getElementById('summary-modal-overlay');
    const summaryModalBody = document.getElementById('summary-modal-body');
    const showDoneTodosCheckbox = document.getElementById('show-done-todos');
    const toolSearchInput = document.getElementById('tool-search-input');
    const todoSearchInput = document.getElementById('todo-search-input');
    const saveToCloudBtn = document.getElementById('save-to-cloud-btn');
    const loadFromCloudBtn = document.getElementById('load-from-cloud-btn');
    const cloudStatusEl = document.getElementById('cloud-status');
    const authContainer = document.getElementById('auth-container');
    const userInfo = document.getElementById('user-info');
    const userDisplayName = document.getElementById('user-display-name');
    const loginSection = document.getElementById('login-section');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');


    // --- FIREBASE AUTH & DATA ---

    // Ergebnis der Weiterleitung zuerst abfangen
    auth.getRedirectResult()
        .then(result => {
            if (result.user) {
                console.log("Redirect result successful for user:", result.user.uid);
                showCloudStatus("Sign-in successful!", 'success');
            }
        })
        .catch(error => {
            console.error("Error processing redirect result:", error);
            showCloudStatus(`Error during sign-in: ${error.message}`, 'error', 0);
        });

    auth.onAuthStateChanged(user => {
        // Dieser Teil aktualisiert nur die UI basierend auf dem Login-Status
        if (user && !user.isAnonymous) {
            currentUserId = user.uid;
            console.log("Permanent user signed in:", currentUserId, user.displayName);
            if (userDisplayName) userDisplayName.textContent = user.displayName;
            if (userInfo) userInfo.style.display = 'block';
            if (loginSection) loginSection.style.display = 'none';
            showCloudStatus("Cloud connected.", 'success');
            if (saveToCloudBtn) saveToCloudBtn.disabled = false;
            if (loadFromCloudBtn) loadFromCloudBtn.disabled = false;
        } else if (user && user.isAnonymous) {
            currentUserId = user.uid;
            console.log("Anonymous user session active:", currentUserId);
            if (userInfo) userInfo.style.display = 'none';
            if (loginSection) loginSection.style.display = 'block';
            if (googleLoginBtn) googleLoginBtn.textContent = 'Sign In & Keep Data';
            showCloudStatus("Sign in with Google to sync your data.", 'loading', 0);
            if (saveToCloudBtn) saveToCloudBtn.disabled = false;
            if (loadFromCloudBtn) loadFromCloudBtn.disabled = false;
        } else {
            currentUserId = null;
            console.log("No user signed in.");
            if (userInfo) userInfo.style.display = 'none';
            if (loginSection) loginSection.style.display = 'block';
            if (googleLoginBtn) googleLoginBtn.textContent = 'Sign In with Google';
            showCloudStatus("Please sign in to use the cloud.", 'error', 0);
            if (saveToCloudBtn) saveToCloudBtn.disabled = true;
            if (loadFromCloudBtn) loadFromCloudBtn.disabled = true;

            if (!isLoggingOut) {
                auth.signInAnonymously().catch(e => console.error("Initial anonymous sign-in failed", e));
            }
            isLoggingOut = false;
        }

        // --- ENTSCHEIDENDE ÄNDERUNG ---
        // Initialisiere die App, nachdem der erste Auth-Status bekannt ist.
        if (!appInitialized) {
            initializeApp();
        }
    });

    /**
     * Diese Funktion wird nur EINMAL aufgerufen. Sie hängt alle permanenten
     * Event-Listener an und führt das erste Laden der Daten durch.
     */
    function initializeApp() {
        if (appInitialized) return; // Sicherheits-Check
        console.log("Initializing application event listeners...");

        // Alle Event-Listener hier bündeln
        attachEventListeners();

        // Lokale Daten laden und die Seite zum ersten Mal rendern
        loadData();
        render();

        appInitialized = true;
    }

    function handleGoogleLogin() {
        showCloudStatus("Redirecting to Google...", 'loading', 0);
        auth.signInWithRedirect(googleProvider);
    }
    
    function handleLogout() {
        isLoggingOut = true; 
        auth.signOut().then(() => {
            console.log("User logged out.");
        }).catch(error => {
            console.error("Logout failed:", error);
            isLoggingOut = false;
        });
    }

    // --- Alle Funktionen bleiben gleich, werden aber jetzt korrekt aufgerufen ---
    
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
    
    function saveToCloud() {
      if (!currentUserId) {
        showCloudStatus("Cannot save: User not authenticated.", 'error');
        return;
      }
      showCloudStatus("Saving to cloud...", 'loading', 0);
      const dataToSave = { tools, categories, todos };
      db.collection("userData").doc(currentUserId).set({ data: dataToSave })
        .then(() => {
            showCloudStatus("Data saved successfully!", 'success');
        })
        .catch(error => {
            console.error("Error saving data to Firestore:", error);
            showCloudStatus("Error: Failed to save data. " + error.message, 'error', 0);
        });
    }

    function loadFromCloud() {
        if (!currentUserId) {
            showCloudStatus("Cannot load: User not authenticated.", 'error');
            return;
        }
        if (!confirm("This will overwrite your current local data with the data from the cloud. Proceed?")) {
            return;
        }
        showCloudStatus("Loading from cloud...", 'loading', 0);
        
        db.collection("userData").doc(currentUserId).get()
            .then(doc => {
                if (doc.exists) {
                    const cloudData = doc.data().data;
                    tools = cloudData.tools || [];
                    categories = cloudData.categories || {};
                    todos = cloudData.todos || [];
                    
                    saveData();
                    render();
                    showCloudStatus("Data loaded successfully!", 'success');
                } else {
                    showCloudStatus("No data found in the cloud for this user.", 'error');
                }
            })
            .catch(error => {
                console.error("Error loading data from Firestore:", error);
                showCloudStatus("Error: Failed to load data.", 'error');
            });
    }

    function loadData() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const data = JSON.parse(storedData);
            tools = data.tools || [];
            categories = data.categories || {};
            todos = data.todos || [];
        }
        showDoneTodos = JSON.parse(localStorage.getItem('showDoneTodos')) ?? true;
        if(showDoneTodosCheckbox) showDoneTodosCheckbox.checked = showDoneTodos;
    }

    function saveData() {
        const data = { tools, categories, todos };
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

    function getWeekRange(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(d.setDate(diffToMonday));
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
    }

    function render() {
        renderCategories();
        renderTools();
        renderTodos();
        renderToolSelector();
    }

    function renderTools() {
        if (!toolListContainer) return;
        toolListContainer.innerHTML = '';
        const filteredTools = getFilteredTools();
        updateLaunchAllButton(filteredTools.length);

        if (filteredTools.length === 0) {
            toolListContainer.innerHTML = `<p style="color:#777">No tools found matching your criteria.</p>`;
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
            todoListContainer.innerHTML = `<p style="color:#777">No tasks found matching your criteria.</p>`;
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
    
    function updateLaunchAllButton(count) {
        if (!launchAllBtn) return;
        launchAllBtn.disabled = count === 0;
        launchAllBtn.textContent = count > 0 ? `Launch All (${count})` : 'Launch All';
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
        saveData();
        render();
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
        saveData();
        render();
    }
    
    /**
     * NEUE FUNKTION: Bündelt alle Event-Listener, die nicht direkt mit der Auth zu tun haben.
     */
    function attachEventListeners() {
        // Auth-Buttons
        googleLoginBtn?.addEventListener('click', handleGoogleLogin);
        logoutBtn?.addEventListener('click', handleLogout);
        
        // Cloud Actions
        saveToCloudBtn?.addEventListener('click', saveToCloud);
        loadFromCloudBtn?.addEventListener('click', loadFromCloud);

        // UI Toggles
        document.getElementById('toggle-sidebar')?.addEventListener('click', () => sidebar.classList.toggle('hidden'));
        document.getElementById('toggle-tools')?.addEventListener('click', () => toolsPane.classList.toggle('hidden'));
        document.getElementById('toggle-todos')?.addEventListener('click', () => todosPane.classList.toggle('hidden'));
        
        // Search and Filters
        toolSearchInput?.addEventListener('input', e => { toolSearchTerm = e.target.value; renderTools(); });
        todoSearchInput?.addEventListener('input', e => { todoSearchTerm = e.target.value; renderTodos(); });
        showDoneTodosCheckbox?.addEventListener('change', () => {
            showDoneTodos = showDoneTodosCheckbox.checked;
            saveData();
            renderTodos();
        });
        categoryFiltersContainer?.addEventListener('click', (e) => {
            const target = e.target.closest('.category-filter');
            if (target) {
                currentCategoryFilter = target.dataset.category;
                render();
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
            
            saveData();
            render();
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

            saveData();
            render();
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
                        saveData(); 
                        render(); 
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
                    saveData();
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
                    saveData(); 
                    render(); 
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

        // MODAL & DATA I/O HANDLERS
        document.getElementById('weekly-summary-btn')?.addEventListener('click', () => {
            const now = new Date();
            const thisWeek = getWeekRange(now);
            const nextWeekDate = new Date(new Date().setDate(now.getDate() + 7));
            const nextWeek = getWeekRange(nextWeekDate);

            const completedThisWeek = todos.filter(t => t.done && t.completionDate && new Date(t.completionDate) >= thisWeek.start && new Date(t.completionDate) <= thisWeek.end);
            const plannedForNextWeek = todos.filter(t => !t.done && t.dueDate && new Date(t.dueDate) >= nextWeek.start && new Date(t.dueDate) <= nextWeek.end);

            summaryModalBody.innerHTML = `
                <div class="summary-section" data-section="completed"><h4><span>Completed This Week (${completedThisWeek.length})</span><button class="btn btn-secondary btn-small" data-action="copy-summary">Copy</button></h4><ul>${completedThisWeek.length > 0 ? completedThisWeek.map(t => `<li>${t.text}</li>`).join('') : '<li>No tasks completed this week.</li>'}</ul></div>
                <div class="summary-section" data-section="planned"><h4><span>Planned for Next Week (${plannedForNextWeek.length})</span><button class="btn btn-secondary btn-small" data-action="copy-summary">Copy</button></h4><ul>${plannedForNextWeek.length > 0 ? plannedForNextWeek.map(t => `<li>${t.text} (Due: ${t.dueDate})</li>`).join('') : '<li>No tasks planned for next week.</li>'}</ul></div>`;
            if (summaryModalOverlay) summaryModalOverlay.style.display = 'flex';
        });

        document.getElementById('summary-modal-close-btn')?.addEventListener('click', () => { if(summaryModalOverlay) summaryModalOverlay.style.display = 'none' });
        summaryModalOverlay?.addEventListener('click', e => { if (e.target === summaryModalOverlay) summaryModalOverlay.style.display = 'none'; });
        
        summaryModalBody?.addEventListener('click', e => {
            const button = e.target.closest('button[data-action="copy-summary"]');
            if (button) {
                const section = button.closest('.summary-section');
                const title = section.querySelector('h4 span').textContent;
                const items = [...section.querySelectorAll('li')].map(li => `- ${li.textContent}`).join('\n');
                navigator.clipboard.writeText(`${title}\n${items}`).then(() => {
                    button.textContent = 'Copied!'; button.classList.add('copied');
                    setTimeout(() => { button.textContent = 'Copy'; button.classList.remove('copied'); }, 2000);
                });
            }
        });

        exportBtn?.addEventListener('click', () => {
            if (tools.length === 0 && todos.length === 0) { alert('No data to export.'); return; }
            const dataStr = JSON.stringify({ tools, categories, todos }, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `work-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        importFile?.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (!data.tools || !data.categories || !data.todos) throw new Error("JSON missing required data.");
                    if (confirm('This will overwrite all current data. Proceed?')) {
                        tools = data.tools; categories = data.categories; todos = data.todos;
                        saveData();
                        currentCategoryFilter = 'all';
                        render();
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

}); // Ende des DOMContentLoaded Listeners
