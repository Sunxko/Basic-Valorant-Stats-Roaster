document.getElementById('roastBtn').addEventListener('click', async () => {
    const nameInput = document.getElementById('riotName').value.trim();
    const tagInput = document.getElementById('riotTag').value.trim();
    const resultBox = document.getElementById('resultBox');

    if (!nameInput || !tagInput) {
        alert('Please enter both Username and Tag!');
        return;
    }

    resultBox.classList.remove('hidden');
    resultBox.innerText = "Analyzing gameplay... Prepare to be roasted...";

    try {
        const response = await fetch('http://localhost:3000/api/roast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: nameInput, tag: tagInput })
        });

        const data = await response.json();

        if (data.error) {
            resultBox.innerText = "Error: " + data.error;
        } else {
            resultBox.innerText = data.roast;
        }
    } catch (error) {
        resultBox.innerText = "Failed to connect to the server. Is your backend running?";
    }
});// JavaScript source code
