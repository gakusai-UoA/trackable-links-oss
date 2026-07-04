import { html } from 'hono/html';

export const locationViewHTML = (
	qrId: string,
	projectName: string,
	location: string,
	accessTime: string,
) => html`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR code info - ${projectName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            padding: 20px;
        }
        .container {
            background: white; border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 40px; max-width: 500px; width: 100%; text-align: center;
        }
        .icon {
            width: 80px; height: 80px; background: #f0f9ff; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 24px; font-size: 32px;
        }
        h1 { color: #1f2937; font-size: 24px; font-weight: 600; margin-bottom: 8px; }
        .subtitle { color: #6b7280; font-size: 16px; margin-bottom: 32px; line-height: 1.5; }
        .info-card { background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: left; }
        .info-item { margin-bottom: 16px; }
        .info-item:last-child { margin-bottom: 0; }
        .info-label { color: #374151; font-weight: 600; font-size: 14px; margin-bottom: 4px; display: block; }
        .info-value { color: #1f2937; font-size: 16px; word-break: break-all; }
        .qr-id { font-family: 'Courier New', monospace; background: #e5e7eb; padding: 8px 12px; border-radius: 6px; display: inline-block; font-size: 14px; }
        .location-value { background: #ecfdf5; border: 1px solid #d1fae5; padding: 12px; border-radius: 8px; color: #065f46; font-weight: 500; }
        .location-not-set { background: #fef3c7; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; color: #92400e; font-style: italic; }
        .access-time { color: #6b7280; font-size: 14px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .button {
            background: #3b82f6; color: white; border: none; padding: 14px 32px; border-radius: 8px;
            font-size: 16px; font-weight: 600; cursor: pointer; transition: background-color 0.2s;
            width: 100%; text-decoration: none; display: inline-block;
        }
        .button:hover { background: #2563eb; }
        .button.secondary { background: #6b7280; margin-top: 12px; }
        .button.secondary:hover { background: #4b5563; }
        .edit-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
        .edit-form { display: none; margin-top: 16px; }
        .edit-form.show { display: block; }
        .form-group { margin-bottom: 16px; text-align: left; }
        .form-group label { display: block; color: #374151; font-weight: 500; margin-bottom: 8px; font-size: 14px; }
        .form-group input, .form-group textarea {
            width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px;
            font-size: 16px; transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #3b82f6; }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .button-group { display: flex; gap: 12px; margin-top: 16px; }
        .button-group .button { flex: 1; margin: 0; }
        .button.danger { background: #dc2626; }
        .button.danger:hover { background: #b91c1c; }
        .error-message { color: #dc2626; font-size: 14px; margin-top: 8px; display: none; }
        .success-message { color: #059669; font-size: 14px; margin-top: 8px; display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📍</div>
        <h1>QR code info</h1>
        <p class="subtitle">Details for the scanned QR code</p>

        <div class="info-card">
            <div class="info-item">
                <span class="info-label">Project</span>
                <div class="info-value">${projectName}</div>
            </div>
            <div class="info-item">
                <span class="info-label">QR ID</span>
                <div class="info-value"><span class="qr-id">${qrId}</span></div>
            </div>
            <div class="info-item">
                <span class="info-label">Location</span>
                <div class="info-value">
                    ${
											location &&
											location.trim() !== '' &&
											location.trim() !== 'unset'
												? html`<div class="location-value">${location}</div>`
												: html`<div class="location-not-set">Location not set</div>`
										}
                </div>
            </div>
        </div>

        <div class="access-time">Viewed at: ${accessTime}</div>

        <a href="/?id=${qrId}" class="button">Open the original link</a>

        <div class="edit-section">
            <button onclick="toggleEditForm()" class="button secondary" id="editButton">Edit location</button>

            <div class="edit-form" id="editForm">
                <form id="locationEditForm">
                    <div class="form-group">
                        <label for="editPasscode">Passcode</label>
                        <input type="password" id="editPasscode" name="passcode" placeholder="Enter the setup passcode" required />
                    </div>
                    <div class="form-group">
                        <label for="editLocation">New location</label>
                        <textarea id="editLocation" name="location" placeholder="Enter the new location" required>${
													location &&
													location.trim() !== '' &&
													location.trim() !== 'unset'
														? location
														: ''
												}</textarea>
                    </div>
                    <div class="button-group">
                        <button type="submit" class="button" id="saveButton">Save</button>
                        <button type="button" onclick="cancelEdit()" class="button danger">Cancel</button>
                    </div>
                    <div class="error-message" id="editErrorMessage"></div>
                    <div class="success-message" id="editSuccessMessage"></div>
                </form>
            </div>
        </div>

        <button onclick="window.close()" class="button secondary" style="margin-top: 12px;">Close</button>
    </div>

    <script>
        function toggleEditForm() {
            const editForm = document.getElementById('editForm');
            const editButton = document.getElementById('editButton');
            if (editForm.classList.contains('show')) {
                editForm.classList.remove('show');
                editButton.textContent = 'Edit location';
            } else {
                editForm.classList.add('show');
                editButton.textContent = 'Cancel editing';
            }
        }

        function cancelEdit() {
            document.getElementById('editForm').classList.remove('show');
            document.getElementById('editButton').textContent = 'Edit location';
            document.getElementById('editErrorMessage').style.display = 'none';
            document.getElementById('editSuccessMessage').style.display = 'none';
            document.getElementById('locationEditForm').reset();
        }

        document.getElementById('locationEditForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const passcode = document.getElementById('editPasscode').value.trim();
            const location = document.getElementById('editLocation').value.trim();
            const saveButton = document.getElementById('saveButton');
            const errorMessage = document.getElementById('editErrorMessage');
            const successMessage = document.getElementById('editSuccessMessage');

            if (!passcode || !location) {
                errorMessage.textContent = 'Both fields are required';
                errorMessage.style.display = 'block';
                successMessage.style.display = 'none';
                return;
            }

            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';

            try {
                const response = await fetch('/api/edit-location/${qrId}', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ passcode, location }),
                });

                if (response.ok) {
                    successMessage.textContent = 'Location updated!';
                    successMessage.style.display = 'block';
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    const errorData = await response.json();
                    errorMessage.textContent = errorData.message || 'Failed to update location';
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = 'Network error';
                errorMessage.style.display = 'block';
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Save';
            }
        });
    </script>
</body>
</html>
`;
