document.getElementById('combineButton').addEventListener('click', () => {
    const files = document.getElementById('csvFileInput').files;
    if (files.length === 0) {
        alert('Please select one or more CSV files.');
        return;
    }

    let combinedCsv = '';
    let isFirstFile = true;

    Array.from(files).forEach(file => {
        const reader = new FileReader();

        reader.onload = function(e) {
            let content = e.target.result;
            if (!isFirstFile) {
                // Remove header from subsequent files
                content = content.substring(content.indexOf('\n') + 1);
            }
            combinedCsv += content;
            isFirstFile = false;

            // Check if this is the last file
            if (file === files[files.length - 1]) {
                downloadCsv(combinedCsv);
            }
        };

        reader.readAsText(file);
    });
});

function downloadCsv(csv) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'combined.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
