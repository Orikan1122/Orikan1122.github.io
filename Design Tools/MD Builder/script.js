document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const rawInput = document.getElementById('rawInput');
    const elementList = document.getElementById('elementList');
    const previewOutput = document.getElementById('previewOutput');
    const fileUpload = document.getElementById('fileUpload');
    
    // --- Controls ---
    const fontSelect = document.getElementById('fontSelect');
    const sizeInput = document.getElementById('sizeInput');
    const colorInput = document.getElementById('colorInput');
    
    // --- Buttons ---
    const promptBtn = document.getElementById('promptBtn');
    const copyHtmlBtn = document.getElementById('copyHtmlBtn');

    const root = document.documentElement;

    // 1. RENDER PREVIEW
    function updatePreview(markdownText) {
        previewOutput.innerHTML = marked.parse(markdownText);
    }

    // 2. RENDER BLOCK LIST
    function updateElementList(markdownText) {
        elementList.innerHTML = ''; 

        if (!markdownText.trim()) {
            elementList.innerHTML = '<p class="placeholder-text">Add text to see blocks...</p>';
            return;
        }

        const blocks = markdownText.split(/\n{2,}/);

        blocks.forEach((block, index) => {
            if(!block.trim()) return;

            const container = document.createElement('div');
            container.className = 'block-editor-item';

            let type = 'Paragraph';
            const start = block.trim().substring(0, 3);
            if (start.startsWith('#')) type = 'Heading';
            else if (start.startsWith('|') || start.includes('<table')) type = 'Table';
            else if (start.startsWith('-') || start.startsWith('*')) type = 'List';
            else if (start.startsWith('<')) type = 'HTML Block';

            const label = document.createElement('div');
            label.className = 'block-label';
            label.textContent = `${type} (Block ${index + 1})`;

            const textarea = document.createElement('textarea');
            textarea.className = 'block-textarea';
            textarea.value = block;
            
            textarea.addEventListener('input', () => {
                blocks[index] = textarea.value;
                const newFullText = blocks.join('\n\n');
                rawInput.value = newFullText;
                updatePreview(newFullText);
            });

            container.appendChild(label);
            container.appendChild(textarea);
            elementList.appendChild(container);
        });
    }

    // 3. EVENT LISTENERS
    rawInput.addEventListener('input', (e) => {
        const text = e.target.value;
        updatePreview(text);
        updateElementList(text);
    });

    fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            rawInput.value = content;
            updatePreview(content);
            updateElementList(content);
        };
        reader.readAsText(file);
    });

    fontSelect.addEventListener('change', (e) => { root.style.setProperty('--preview-font', e.target.value); });
    sizeInput.addEventListener('input', (e) => { root.style.setProperty('--preview-size', e.target.value + 'px'); });
    colorInput.addEventListener('input', (e) => { root.style.setProperty('--preview-color', e.target.value); });

    // --- NEW FEATURE: Copy AI Prompt ---
    promptBtn.addEventListener('click', () => {
        const aiInstruction = `
I need you to generate content for a specific Markdown Editor tool.
Please follow these strict guidelines:

1. **Standard Text**: Use standard Markdown for headers (#), lists (-), and bold/italics.
2. **Text Color**: Markdown does not support color. To color text, you MUST use this HTML format: 
   <span style="color: red;">Your text here</span> (Replace 'red' with hex codes or names).
3. **Colored Tables**: Standard Markdown tables do not support background colors. You MUST use raw HTML tables if I ask for cell colors. 
   Example: <table style="border-collapse: collapse; width: 100%;"><tr><td style="background-color: #f0f0f0; padding: 10px; border: 1px solid #ccc;">Cell Content</td></tr></table>
4. **Structure**: Keep the output clean and ready to copy-paste.

Please create a layout based on this request: 
        `;
        
        navigator.clipboard.writeText(aiInstruction.trim()).then(() => {
            const originalText = promptBtn.innerText;
            promptBtn.innerText = "✅ Copied!";
            setTimeout(() => promptBtn.innerText = originalText, 2000);
        });
    });

    // --- NEW FEATURE: Copy HTML Output ---
    copyHtmlBtn.addEventListener('click', () => {
        const htmlContent = previewOutput.innerHTML;
        
        navigator.clipboard.writeText(htmlContent).then(() => {
            const originalText = copyHtmlBtn.innerText;
            copyHtmlBtn.innerText = "✅ Copied!";
            setTimeout(() => copyHtmlBtn.innerText = originalText, 2000);
        });
    });
});