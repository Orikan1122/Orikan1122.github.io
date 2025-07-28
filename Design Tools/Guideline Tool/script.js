document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES FOR THE ENTIRE TOOL ---
    
    // Text Editor elements
    const textInput = document.getElementById('text-input');
    const fontSelect = document.getElementById('font-select');
    const fontSize = document.getElementById('font-size');
    const textColor = document.getElementById('text-color');
    const preview = document.getElementById('preview');

    // Color Palette elements
    const colorSwatches = document.querySelectorAll('.color-swatch');

    // Brand Asset elements
    const copyImageButtons = document.querySelectorAll('.copy-btn');


    // --- FUNCTIONS FOR THE TOOL ---

    // Function to update the text preview
    function updatePreview() {
        const text = textInput.value || 'This is a preview of your text.';
        preview.textContent = text;
        
        // Ensure preview exists before changing it
        if (preview) {
             // Toggling class for font family
            if (fontSelect.value === 'effra') {
                preview.classList.remove('bressay');
                preview.classList.add('effra');
            } else {
                preview.classList.remove('effra');
                preview.classList.add('bressay');
            }
            preview.style.fontSize = `${fontSize.value}px`;
            preview.style.color = textColor.value;
        }
    }


    // --- EVENT LISTENERS ---

    // Event listeners for the Text Editor
    if (textInput) textInput.addEventListener('input', updatePreview);
    if (fontSelect) fontSelect.addEventListener('change', updatePreview);
    if (fontSize) fontSize.addEventListener('input', updatePreview);
    if (textColor) textColor.addEventListener('change', updatePreview);

    // Event listener for the Color Palette swatches
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const color = swatch.dataset.color;
            navigator.clipboard.writeText(color).then(() => {
                alert(`Copied ${color} to clipboard!`);
            });
        });
    });

    // Event listeners for the Brand Asset 'Copy' buttons
    copyImageButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const imageUrl = button.dataset.src;
            if (!navigator.clipboard || !navigator.clipboard.write) {
                alert('Your browser does not support copying images to the clipboard.');
                return;
            }

            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                ]);

                const originalText = button.textContent;
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);

            } catch (err) {
                console.error('Failed to copy image: ', err);
                alert('Sorry, failed to copy image to clipboard.');
            }
        });
    });


    // --- INITIALIZE ---
    // Run updatePreview once on load to set the initial state
    updatePreview(); 
});
