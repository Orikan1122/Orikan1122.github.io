document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const apiKeyInput = document.getElementById('apiKey');
    const fetchModelsBtn = document.getElementById('fetchModelsBtn');
    const modelSelect = document.getElementById('modelSelect');
    const freeModelsFilter = document.getElementById('freeModelsFilter');
    const creditsText = document.getElementById('creditsText');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');

    // State variables
    let allModels = [];
    let conversationHistory = [];

    // --- DATA & STATE MANAGEMENT ---

    const saveData = () => {
        localStorage.setItem('chatToolApiKey', apiKeyInput.value);
        localStorage.setItem('chatToolModel', modelSelect.value);
        localStorage.setItem('chatToolHistory', JSON.stringify(conversationHistory));
    };

    const loadSavedData = () => {
        const savedApiKey = localStorage.getItem('chatToolApiKey');
        const savedHistory = localStorage.getItem('chatToolHistory');

        if (savedHistory) {
            conversationHistory = JSON.parse(savedHistory);
            conversationHistory.forEach(msg => renderMessage(msg.role, msg.content));
        }

        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
            fetchData();
        }
    };

    const clearSavedData = () => {
        if (confirm('Are you sure you want to clear the chat history and all saved data?')) {
            localStorage.clear();
            location.reload();
        }
    };

    // --- UI & MESSAGE RENDERING ---

    const renderMessage = (role, content) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', role === 'user' ? 'user-message' : 'bot-message');
        messageDiv.textContent = content;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the bottom
    };

    const populateModelDropdown = () => {
        const showFreeOnly = freeModelsFilter.checked;
        const modelsToDisplay = showFreeOnly ? allModels.filter(m => m.isFree) : allModels;

        modelSelect.innerHTML = '';
        if (!modelsToDisplay || modelsToDisplay.length === 0) {
            modelSelect.innerHTML = '<option value="">-- No models found --</option>';
            return;
        }

        modelsToDisplay.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            const pricing = model.isFree ? '(Free)' : '';
            option.textContent = `${model.name} ${pricing}`;
            modelSelect.appendChild(option);
        });

        const savedModel = localStorage.getItem('chatToolModel');
        if (savedModel) modelSelect.value = savedModel;
    };


    // --- API & CORE LOGIC ---

    const fetchData = async () => {
        await fetchModels();
        await fetchCredits();
    }

    const fetchModels = async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter your OpenRouter API key first.');
            return;
        }
        modelSelect.innerHTML = '<option value="">-- Fetching models... --</option>';
        modelSelect.disabled = true;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/models');
            if (!response.ok) throw new Error('Failed to fetch models. Check your API key.');
            
            const { data } = await response.json();
            allModels = data.map(model => ({
                id: model.id,
                name: model.name,
                isFree: parseFloat(model.pricing.prompt) === 0 && parseFloat(model.pricing.completion) === 0
            })).sort((a, b) => a.name.localeCompare(b.name));
            
            populateModelDropdown();
            modelSelect.disabled = false;

        } catch (error) {
            console.error('Error fetching models:', error);
            alert(error.message);
            modelSelect.innerHTML = '<option value="">-- Fetching failed --</option>';
        }
    };

    const fetchCredits = async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) return;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/credits', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!response.ok) throw new Error('Failed to fetch credits.');

            const { data } = await response.json();
            const credits = data.limit || 0;
            creditsText.textContent = `$${credits.toFixed(4)}`;

        } catch (error) {
            console.error('Error fetching credits:', error);
            creditsText.textContent = 'Error';
        }
    };

    const sendMessage = async () => {
        const message = userInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;

        if (!message || !apiKey || !selectedModel) {
            alert('Please enter a message, provide an API key, and select a model.');
            return;
        }

        // Add user message to UI and history
        renderMessage('user', message);
        conversationHistory.push({ role: 'user', content: message });
        userInput.value = ''; // Clear input
        sendBtn.disabled = true;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: conversationHistory
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error.message || 'An error occurred'}`);
            }

            const data = await response.json();
            const botReply = data.choices[0].message.content;

            // Add bot message to UI and history
            renderMessage('assistant', botReply);
            conversationHistory.push({ role: 'assistant', content: botReply });
            saveData();

        } catch (error) {
            console.error('Error sending message:', error);
            renderMessage('assistant', `Error: ${error.message}`);
        } finally {
            sendBtn.disabled = false;
        }
    };

    // --- EVENT LISTENERS ---
    fetchModelsBtn.addEventListener('click', fetchData);
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    freeModelsFilter.addEventListener('change', populateModelDropdown);
    modelSelect.addEventListener('change', saveData);
    apiKeyInput.addEventListener('change', saveData);
    clearBtn.addEventListener('click', clearSavedData);

    // --- INITIAL LOAD ---
    loadSavedData();
});