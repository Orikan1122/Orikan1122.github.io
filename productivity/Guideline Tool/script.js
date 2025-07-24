// Add this code to the end of your file
document.addEventListener('DOMContentLoaded', () => {
    const copyImageButtons = document.querySelectorAll('.copy-btn');

    copyImageButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const imageUrl = button.dataset.src;
            // Check for Clipboard API support
            if (!navigator.clipboard || !navigator.clipboard.write) {
                alert('Your browser does not support copying images to the clipboard.');
                return;
            }

            try {
                // Fetch the image
                const response = await fetch(imageUrl);
                const blob = await response.blob();

                // Use the Clipboard API to copy the image
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob
                    })
                ]);

                // Provide user feedback
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
});
