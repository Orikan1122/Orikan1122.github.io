document.addEventListener('DOMContentLoaded', () => {
    let imageData = [];
    const UNCATEGORIZED = "Uncategorized";
    let categories = [UNCATEGORIZED];

    // --- DOM ELEMENT REFERENCES ---
    const gallery = document.getElementById('gallery');
    const filterContainer = document.querySelector('.filter-container');
    const sortSelect = document.getElementById('sort-select');
    const importFile = document.getElementById('importFile');

    // --- Image Editor Globals ---
    let imageEditor = null;
    let currentlyEditing = {
        cardId: null,
        imageType: null
    };

    // --- COOKIE HANDLING ---
    function saveDataToCookies() {
        try {
            const dataString = JSON.stringify({ categories, cards: imageData });
            document.cookie = `aiCardData=${dataString};path=/;max-age=31536000`;
        } catch (e) {
            console.error("Error saving data. It might be too large for cookies.", e);
            alert("Could not save data. The collection might be too large.");
        }
    }

    function loadDataFromCookies() {
        const cookieString = document.cookie.split('; ').find(row => row.startsWith('aiCardData='));
        if (cookieString) {
            try {
                const data = JSON.parse(cookieString.split('=')[1]);
                if (data.cards && data.categories) {
                    imageData = data.cards;
                    categories = data.categories;
                }
            } catch (e) {
                console.error("Could not parse cookie data:", e);
            }
        }
    }

    // --- TOP-LEVEL RENDER FUNCTION ---
    function renderEverything() {
        if (imageData.length === 0) {
            gallery.innerHTML = `<p class="placeholder-text">Your collection is empty. Import a file or create a new card.</p>`;
        } else {
            sortData();
        }
        updateFilterButtons();
        updateCategoryDropdowns();
        saveDataToCookies();
    }

    // --- CORE DISPLAY LOGIC ---
    function renderGallery() {
        gallery.innerHTML = '';
        const currentFilter = document.querySelector('.filter-btn.active')?.dataset.category || 'all';
        imageData.forEach(image => {
            const card = createCard(image);
            if (currentFilter !== 'all' && image.category !== currentFilter) {
                card.style.display = 'none';
            }
            gallery.appendChild(card);
        });
    }

    function createCard(image) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = image.id;

        const imageStack = document.createElement('div');
        imageStack.className = 'card-image-stack';

        // --- MODIFIED: Adds a "Replace" button ---
        const createLabeledImage = (src, label, imageType) => {
            const container = document.createElement('div');
            container.className = 'card-image-container';
            const img = document.createElement('img');
            img.src = src;

            const labelDiv = document.createElement('div');
            labelDiv.className = 'image-label';
            labelDiv.textContent = label;

            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'card-image-actions';

            const editBtn = createActionButton('Edit', (e) => {
                e.stopPropagation();
                openImageEditor(image.id, imageType);
            });

            const replaceBtn = createActionButton('Replace', (e) => {
                e.stopPropagation();
                promptToReplaceImage(image.id, imageType);
            });

            actionsContainer.append(editBtn, replaceBtn);
            container.append(img, labelDiv, actionsContainer);
            return container;
        };

        imageStack.append(
            createLabeledImage(image.front, 'Front', 'front'),
            createLabeledImage(image.frame, 'Frame', 'frame'),
            createLabeledImage(image.back, 'Back', 'back')
        );

        addCardInfoAndActions(card, image);
        card.prepend(imageStack);
        return card;
    }

    function addCardInfoAndActions(card, image) {
        const info = document.createElement('div');
        info.className = 'card-info';
        info.textContent = `Category: ${image.category}`;

        const actions = document.createElement('div');
        actions.className = 'card-actions';

        const deleteBtn = createActionButton('Delete Card', () => deleteCard(image.id));
        deleteBtn.classList.add('btn-delete-card');

        actions.append(
            createActionButton('View Prompts', () => showViewPromptsModal(image)),
            createActionButton('Edit Details', () => showEditModal(image)),
            createActionButton('Download All', () => downloadAllCardImages(image)),
            deleteBtn
        );
        card.append(info, actions);
    }

    // --- NEW: Logic to replace an image ---
    function promptToReplaceImage(cardId, imageType) {
        // Create a hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';

        // When the user selects a file, process it
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) {
                document.body.removeChild(input); // Clean up
                return;
            }

            try {
                // Convert the new image to Base64
                const base64 = await readFileAsDataURL(file);
                const card = imageData.find(c => c.id === cardId);
                if (card) {
                    // Update the data model
                    card[imageType] = base64;
                    // Re-render everything to show the change
                    renderEverything();
                }
            } catch (error) {
                alert("Could not load the new image.");
                console.error("Error replacing image:", error);
            } finally {
                document.body.removeChild(input); // Clean up
            }
        };

        document.body.appendChild(input);
        input.click(); // Open the file picker for the user
    }


    // --- ASYNC HELPER for reading files ---
    const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    // --- NEW CARD CREATION (ASYNCHRONOUS) ---
    async function addNewCard() {
        const createBtn = document.getElementById('saveNewCardBtn');
        const frontFile = document.getElementById('newCardFront').files[0];
        const frameFile = document.getElementById('newCardFrame').files[0];
        const backFile = document.getElementById('newCardBack').files[0];
        const frontPrompt = document.getElementById('newCardFrontPrompt').value;
        const framePrompt = document.getElementById('newCardFramePrompt').value;
        const backPrompt = document.getElementById('newCardBackPrompt').value;
        const category = document.getElementById('newCardCategorySelect').value;

        if (!frontFile || !frameFile || !backFile || !frontPrompt) {
            alert("Please select all three images and provide at least a front prompt.");
            return;
        }

        createBtn.disabled = true;
        createBtn.textContent = 'Processing...';

        try {
            const [frontBase64, frameBase64, backBase64] = await Promise.all([
                readFileAsDataURL(frontFile),
                readFileAsDataURL(frameFile),
                readFileAsDataURL(backFile)
            ]);

            const newCard = {
                id: Date.now(),
                front: frontBase64,
                frame: frameBase64,
                back: backBase64,
                frontPrompt: frontPrompt,
                framePrompt: framePrompt || "N/A",
                backPrompt: backPrompt || "N/A",
                category: category || UNCATEGORIZED
            };

            imageData.push(newCard);
            closeModal(document.getElementById('newCardModal'));
            document.getElementById('newCardModal').querySelector('form').reset();
            renderEverything();

        } catch (error) {
            console.error("Failed to read files:", error);
            alert("There was an error processing the image files.");
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = 'Create Card';
        }
    }

    // --- CARD DELETION ---
    function deleteCard(cardId) {
        if (confirm("Are you sure you want to permanently delete this card?")) {
            imageData = imageData.filter(card => card.id !== cardId);
            renderEverything();
        }
    }

    // --- CATEGORY MANAGEMENT ---
    function updateFilterButtons() {
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.category || 'all';
        filterContainer.innerHTML = '';
        const filterCategories = ['all', ...categories.sort()];

        filterCategories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.dataset.category = category;
            button.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            if (category === activeFilter) button.classList.add('active');

            button.addEventListener('click', () => {
                document.querySelector('.filter-btn.active')?.classList.remove('active');
                button.classList.add('active');
                renderGallery();
            });
            filterContainer.appendChild(button);
        });
    }

    function updateCategoryDropdowns() {
        const editSelect = document.getElementById('editCategorySelect');
        const newCardSelect = document.getElementById('newCardCategorySelect');
        if (!editSelect || !newCardSelect) return;

        const lastEditVal = editSelect.value;
        const lastNewVal = newCardSelect.value;

        editSelect.innerHTML = '';
        newCardSelect.innerHTML = '';

        categories.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            editSelect.appendChild(option);
            newCardSelect.appendChild(option.cloneNode(true));
        });

        editSelect.value = lastEditVal;
        newCardSelect.value = lastNewVal;
    }

    function openCategoryManager() {
        const categoryList = document.getElementById('categoryList');
        categoryList.innerHTML = '';

        categories.sort().forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${cat}</span>`;

            if (cat !== UNCATEGORIZED) {
                li.innerHTML += `
                    <div class="category-actions">
                        <button class="btn-rename">Rename</button>
                        <button class="btn-delete">Delete</button>
                    </div>
                `;
                li.querySelector('.btn-rename').addEventListener('click', () => renameCategory(cat));
                li.querySelector('.btn-delete').addEventListener('click', () => deleteCategory(cat));
            }
            categoryList.appendChild(li);
        });
        showModal(document.getElementById('categoryModal'));
    }

    function createNewCategory() {
        const input = document.getElementById('newCategoryName');
        const newCat = input.value.trim();

        if (!newCat) {
            alert("Category name cannot be empty.");
            return;
        }
        if (categories.map(c => c.toLowerCase()).includes(newCat.toLowerCase())) {
            alert(`Category "${newCat}" already exists.`);
            return;
        }

        categories.push(newCat);
        input.value = '';
        openCategoryManager();
        renderEverything();
    }

    function renameCategory(oldName) {
        const newName = prompt(`Rename category "${oldName}" to:`, oldName);
        if (!newName || !newName.trim() || newName.trim().toLowerCase() === oldName.toLowerCase()) {
            return;
        }
        if (categories.map(c => c.toLowerCase()).includes(newName.trim().toLowerCase())) {
            alert(`Category "${newName}" already exists.`);
            return;
        }

        const newNameTrimmed = newName.trim();
        categories = categories.map(c => c === oldName ? newNameTrimmed : c);

        imageData.forEach(img => {
            if (img.category === oldName) {
                img.category = newNameTrimmed;
            }
        });
        openCategoryManager();
        renderEverything();
    }

    function deleteCategory(catName) {
        if (confirm(`Are you sure you want to delete "${catName}"? All cards in this category will be moved to "${UNCATEGORIZED}".`)) {
            categories = categories.filter(c => c !== catName);
            imageData.forEach(img => {
                if (img.category === catName) {
                    img.category = UNCATEGORIZED;
                }
            });
            openCategoryManager();
            renderEverything();
        }
    }

    // --- MODAL HANDLING ---
    function showModal(modal) {
        modal.style.display = 'block';
    }

    function closeModal(modal) {
        if (!modal) return;
        if (modal.id === 'imageEditorModal' && imageEditor) {
            imageEditor.destroy();
            imageEditor = null;
        }
        modal.style.display = 'none';
    }

    function showViewPromptsModal(image) {
        document.getElementById('viewFrontPromptText').textContent = image.frontPrompt;
        document.getElementById('viewFramePromptText').textContent = image.framePrompt;
        document.getElementById('viewBackPromptText').textContent = image.backPrompt;
        showModal(document.getElementById('viewPromptsModal'));
    }

    function showEditModal(image) {
        updateCategoryDropdowns();
        document.getElementById('editCardId').value = image.id;
        document.getElementById('editFrontPrompt').value = image.frontPrompt;
        document.getElementById('editFramePrompt').value = image.framePrompt;
        document.getElementById('editBackPrompt').value = image.backPrompt;
        document.getElementById('editCategorySelect').value = image.category;
        showModal(document.getElementById('editModal'));
    }

    function saveCardChanges() {
        const id = parseInt(document.getElementById('editCardId').value);
        const cardData = imageData.find(img => img.id === id);

        if (cardData) {
            cardData.frontPrompt = document.getElementById('editFrontPrompt').value;
            cardData.framePrompt = document.getElementById('editFramePrompt').value || "N/A";
            cardData.backPrompt = document.getElementById('editBackPrompt').value || "N/A";
            cardData.category = document.getElementById('editCategorySelect').value;
        }
        closeModal(document.getElementById('editModal'));
        renderEverything();
    }

    // --- IMAGE EDITOR LOGIC ---
    function openImageEditor(cardId, imageType) {
        const card = imageData.find(c => c.id === cardId);
        if (!card) return;

        currentlyEditing = {
            cardId,
            imageType
        };
        const modal = document.getElementById('imageEditorModal');
        showModal(modal);

        if (imageEditor) {
            imageEditor.destroy();
        }

        imageEditor = new tui.ImageEditor('#tui-image-editor-container', {
            includeUI: {
                loadImage: {
                    path: card[imageType],
                    name: `${cardId}_${imageType}`
                },
                theme: 'white-theme',
                menu: ['crop', 'flip', 'rotate', 'draw', 'shape', 'icon', 'text', 'mask', 'filter'],
                initMenu: 'filter',
                uiSize: {
                    width: '100%',
                    height: 'calc(100% - 70px)'
                },
                menuBarPosition: 'bottom'
            },
            cssMaxWidth: 700,
            cssMaxHeight: 500,
            usageStatistics: false
        });
        window.dispatchEvent(new Event('resize'));
    }

    function saveEditorChanges() {
        if (!imageEditor || !currentlyEditing.cardId) {
            alert("No image is currently being edited.");
            return;
        }

        const {
            cardId,
            imageType
        } = currentlyEditing;
        const card = imageData.find(c => c.id === cardId);
        const dataURL = imageEditor.toDataURL();

        if (card) {
            card[imageType] = dataURL;
            closeModal(document.getElementById('imageEditorModal'));
            renderEverything();
        }
    }

    // --- UTILITIES (Sorting, I/O, Helpers) ---
    function sortData() {
        const sortBy = sortSelect.value;
        imageData.sort((a, b) => {
            if (sortBy === 'id') return a.id - b.id;
            const valA = a[sortBy] || '';
            const valB = b[sortBy] || '';
            if (valA.toLowerCase() < valB.toLowerCase()) return -1;
            if (valA.toLowerCase() > valB.toLowerCase()) return 1;
            return 0;
        });
        renderGallery();
    }

    function exportData() {
        if (imageData.length === 0) {
            alert("Nothing to export. Create some cards first.");
            return;
        }
        const jsonString = JSON.stringify({
            categories,
            cards: imageData
        }, null, 2);
        const blob = new Blob([jsonString], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'card-data.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported.cards && imported.categories) {
                    const combined = new Set([...categories, ...imported.categories]);
                    categories = [...combined];
                    imageData = imported.cards;
                } else {
                    throw new Error("Invalid format. Missing 'cards' or 'categories'.");
                }
                renderEverything();
                alert('Data imported successfully!');
            } catch (error) {
                alert('Error: Could not parse JSON file. It might be corrupted or in an invalid format.');
                console.error(error);
            }
        };
        reader.readAsText(file);
        event.target.value = null;
    }

    function createActionButton(text, onClick) {
        const btn = document.createElement('button');
        btn.className = 'card-action-btn';
        btn.textContent = text;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick(e);
        });
        return btn;
    }

    function downloadImage(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || url.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadAllCardImages(image) {
        downloadImage(image.front, `${image.id}_front.png`);
        setTimeout(() => downloadImage(image.frame, `${image.id}_frame.png`), 300);
        setTimeout(() => downloadImage(image.back, `${image.id}_back.png`), 600);
    }

    // --- EVENT LISTENERS ---
    document.getElementById('createCardBtn').addEventListener('click', () => {
        updateCategoryDropdowns();
        showModal(document.getElementById('newCardModal'));
    });
    document.getElementById('saveNewCardBtn').addEventListener('click', addNewCard);
    document.getElementById('manageCategoriesBtn').addEventListener('click', openCategoryManager);
    document.getElementById('createCategoryBtn').addEventListener('click', createNewCategory);
    document.getElementById('saveEditBtn').addEventListener('click', saveCardChanges);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    sortSelect.addEventListener('change', sortData);
    importFile.addEventListener('change', importData);

    document.getElementById('saveImageEditorChanges').addEventListener('click', saveEditorChanges);
    document.getElementById('closeEditorBtn').addEventListener('click', () => {
        closeModal(document.getElementById('imageEditorModal'));
    });

    document.querySelectorAll('.modal .close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal')));
    });
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    });

    // --- INITIALIZATION ---
    loadDataFromCookies();
    renderEverything();
});