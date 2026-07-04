import { html } from 'hono/html';

export const locationSetupHTML = (qrId: string, projectName: string) => html`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Set location - ${projectName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        .icon {
            width: 80px; height: 80px;
            background: #f0f9ff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 24px;
            font-size: 32px;
        }
        h1 { color: #1f2937; font-size: 24px; font-weight: 600; margin-bottom: 8px; }
        .subtitle { color: #6b7280; font-size: 16px; margin-bottom: 32px; line-height: 1.5; }
        .form-group { margin-bottom: 24px; text-align: left; }
        label { display: block; color: #374151; font-weight: 500; margin-bottom: 8px; font-size: 14px; }
        input, textarea {
            width: 100%; padding: 12px 16px;
            border: 2px solid #e5e7eb; border-radius: 8px;
            font-size: 16px; transition: border-color 0.2s;
        }
        input:focus, textarea:focus { outline: none; border-color: #3b82f6; }
        textarea { resize: vertical; min-height: 100px; }
        .button {
            background: #3b82f6; color: white; border: none;
            padding: 14px 32px; border-radius: 8px;
            font-size: 16px; font-weight: 600; cursor: pointer;
            transition: background-color 0.2s; width: 100%;
        }
        .button:hover { background: #2563eb; }
        .button:disabled { background: #9ca3af; cursor: not-allowed; }
        .loading { display: none; margin-top: 16px; color: #6b7280; font-size: 14px; }
        .error { color: #dc2626; font-size: 14px; margin-top: 8px; display: none; }
        .qr-info {
            background: #f9fafb; border-radius: 8px; padding: 16px;
            margin-bottom: 24px; font-size: 14px; color: #6b7280;
        }
        .qr-id {
            font-family: monospace; background: #e5e7eb;
            padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📍</div>
        <h1>Location setup required</h1>
        <p class="subtitle">Set the physical location of this QR code before it can redirect visitors.</p>

        <div class="qr-info">
            <strong>Project:</strong> ${projectName}<br>
            <strong>QR ID:</strong> <span class="qr-id">${qrId}</span>
        </div>

        <form id="locationForm">
            <div class="form-group">
                <label for="passcode">Passcode</label>
                <input type="password" id="passcode" name="passcode" placeholder="Enter the setup passcode" required />
            </div>
            <div class="form-group">
                <label for="location">Location</label>
                <textarea id="location" name="location" required></textarea>
                <div class="error" id="errorMessage"></div>
            </div>
            <button type="submit" class="button" id="submitButton">Save and continue</button>
            <div class="loading" id="loading">Saving...</div>
        </form>
    </div>

    <script>
        document.getElementById('locationForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const passcode = document.getElementById('passcode').value.trim();
            const location = document.getElementById('location').value.trim();
            const submitButton = document.getElementById('submitButton');
            const loading = document.getElementById('loading');
            const errorMessage = document.getElementById('errorMessage');

            if (!passcode || !location) {
                errorMessage.textContent = 'Both fields are required';
                errorMessage.style.display = 'block';
                return;
            }

            submitButton.disabled = true;
            loading.style.display = 'block';
            errorMessage.style.display = 'none';

            try {
                const response = await fetch('/api/set-location', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qrId: '${qrId}', passcode, location }),
                });

                if (response.ok) {
                    submitButton.textContent = 'Saved!';
                    submitButton.style.background = '#10b981';
                    loading.style.display = 'none';
                    setTimeout(() => {
                        window.close();
                        if (!window.closed) {
                            document.body.innerHTML = '<div class="container"><div class="icon">✅</div><h1>Done</h1><p class="subtitle">Location saved. You can close this tab.</p></div>';
                        }
                    }, 2000);
                } else {
                    const errorData = await response.json();
                    errorMessage.textContent = errorData.message || 'Failed to save location';
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = 'Network error';
                errorMessage.style.display = 'block';
            } finally {
                submitButton.disabled = false;
                loading.style.display = 'none';
            }
        });
    </script>
</body>
</html>
`;
