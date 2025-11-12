document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const mainContent = document.getElementById('main-content');
    const videoPlayer = document.getElementById('video-player');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const fpsInput = document.getElementById('fps');
    const widthInput = document.getElementById('gif-width');
    const convertBtn = document.getElementById('convert-btn');
    const statusText = document.getElementById('status-text');
    const progressBar = document.getElementById('progress-bar');
    const outputArea = document.getElementById('output-area');
    const outputGif = document.getElementById('output-gif');
    const downloadLink = document.getElementById('download-link');

    let videoFile = null;

    fileInput.addEventListener('change', (e) => {
        videoFile = e.target.files[0];
        if (videoFile) {
            const videoURL = URL.createObjectURL(videoFile);
            videoPlayer.src = videoURL;
            mainContent.classList.remove('hidden');
            statusText.textContent = 'Video loaded. Adjust settings and click "Convert".';
        }
    });

    videoPlayer.addEventListener('loadedmetadata', () => {
        // Set default end time to video duration or 10s, whichever is smaller
        endTimeInput.value = Math.min(videoPlayer.duration, 10).toFixed(1);
        endTimeInput.max = videoPlayer.duration.toFixed(1);
    });

    convertBtn.addEventListener('click', async () => {
        if (!videoFile) {
            alert('Please select a video file first.');
            return;
        }

        const startTime = parseFloat(startTimeInput.value);
        const endTime = parseFloat(endTimeInput.value);
        const fps = parseInt(fpsInput.value);
        const gifWidth = parseInt(widthInput.value);

        // Validation
        if (startTime >= endTime) {
            alert('Start time must be less than end time.');
            return;
        }
        if (endTime > videoPlayer.duration) {
            alert(`End time cannot exceed video duration (${videoPlayer.duration.toFixed(1)}s).`);
            return;
        }

        // --- UI Updates for Conversion Start ---
        convertBtn.disabled = true;
        statusText.textContent = 'Starting conversion...';
        progressBar.classList.remove('hidden');
        progressBar.value = 0;
        outputArea.classList.add('hidden');
        outputGif.src = '';


        // --- Frame Extraction ---
        const frames = await extractFrames(startTime, endTime, fps);

        if (!frames) return; // Error occurred

        // --- GIF Encoding ---
        createGif(frames, gifWidth);
    });

    async function extractFrames(startTime, endTime, fps) {
        statusText.textContent = 'Extracting frames from video...';
        const frames = [];
        const interval = 1 / fps;
        const totalFrames = Math.round((endTime - startTime) * fps);
        let capturedFrames = 0;

        // Create an offscreen canvas for drawing
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        return new Promise((resolve) => {
            const captureFrame = (currentTime) => {
                videoPlayer.currentTime = currentTime;
            };

            videoPlayer.addEventListener('seeked', async function onSeeked() {
                // Set canvas dimensions based on video's aspect ratio
                const aspectRatio = videoPlayer.videoWidth / videoPlayer.videoHeight;
                canvas.width = fpsInput.value;
                canvas.height = canvas.width / aspectRatio;
                
                context.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
                frames.push(canvas.toDataURL('image/jpeg'));

                capturedFrames++;
                const progress = (capturedFrames / totalFrames) * 50; // Extraction is 50% of the job
                progressBar.value = progress;

                const nextTime = startTime + capturedFrames * interval;

                if (nextTime <= endTime) {
                    captureFrame(nextTime);
                } else {
                    videoPlayer.removeEventListener('seeked', onSeeked);
                    resolve(frames);
                }
            });

            // Start the process
            captureFrame(startTime);
        });
    }

    function createGif(frames, width) {
        statusText.textContent = 'Encoding GIF... This may take a while.';

        const gif = new GIF({
            workers: 2,
            quality: 10, // Lower is better
            width: width,
            // height is auto-calculated based on first frame's aspect ratio
        });

        const tempImage = new Image();
        let loadedFrames = 0;
        
        frames.forEach((frameDataURL, index) => {
            const img = new Image();
            img.onload = () => {
                gif.addFrame(img, { delay: 1000 / fpsInput.value });
                loadedFrames++;
                if (loadedFrames === frames.length) {
                    gif.render();
                }
            };
            img.src = frameDataURL;
        });


        gif.on('progress', (p) => {
            // progress is 0-1, represents encoding. We use 50-100% of progress bar.
            progressBar.value = 50 + p * 50; 
        });

        gif.on('finished', (blob) => {
            const url = URL.createObjectURL(blob);
            outputGif.src = url;
            downloadLink.href = url;
            outputArea.classList.remove('hidden');

            statusText.textContent = 'Conversion complete!';
            progressBar.classList.add('hidden');
            convertBtn.disabled = false;
        });
    }
});