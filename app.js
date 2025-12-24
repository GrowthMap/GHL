// Main application logic for managing iframe configurations

class IframeManager {
    constructor() {
        this.locations = this.loadLocations();
        this.currentLocationId = null;
        this.editingWidgetId = null;
        this.init();
    }

    init() {
        this.renderLocations();
        this.attachEventListeners();
    }

    loadLocations() {
        const saved = localStorage.getItem('ghl-locations');
        return saved ? JSON.parse(saved) : [];
    }

    saveLocations() {
        localStorage.setItem('ghl-locations', JSON.stringify(this.locations));
    }

    renderLocations() {
        const list = document.getElementById('locationsList');
        list.innerHTML = '';

        if (this.locations.length === 0) {
            list.innerHTML = '<p style="color: #6c757d; font-size: 14px;">No locations yet. Create one to get started!</p>';
            return;
        }

        this.locations.forEach(location => {
            const item = document.createElement('div');
            item.className = 'location-item';
            if (location.id === this.currentLocationId) {
                item.classList.add('active');
            }
            item.innerHTML = `
                <div class="location-item-name">${this.escapeHtml(location.name)}</div>
                <div class="location-item-widgets">${location.widgets.length} widget(s)</div>
            `;
            item.addEventListener('click', () => this.selectLocation(location.id));
            list.appendChild(item);
        });
    }

    selectLocation(locationId) {
        this.currentLocationId = locationId;
        const location = this.locations.find(l => l.id === locationId);
        if (!location) return;

        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('locationEditor').style.display = 'block';
        document.getElementById('locationName').textContent = location.name;
        document.getElementById('locationNameInput').value = location.name;

        this.renderWidgets(location.widgets);
        this.renderLocations();
    }

    renderWidgets(widgets) {
        const container = document.getElementById('widgetsList');
        container.innerHTML = '';

        if (widgets.length === 0) {
            container.innerHTML = '<p style="color: #6c757d; text-align: center; padding: 20px;">No widgets yet. Add one to get started!</p>';
            return;
        }

        widgets.forEach((widget, index) => {
            const card = document.createElement('div');
            card.className = 'widget-card';
            card.innerHTML = `
                <div class="widget-card-header">
                    <div class="widget-card-title">${this.escapeHtml(widget.name)}</div>
                    <div class="widget-card-actions">
                        <button class="btn btn-secondary btn-sm edit-widget" data-index="${index}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-widget" data-index="${index}">Delete</button>
                    </div>
                </div>
                <div class="widget-card-info">
                    <div class="widget-card-info-item"><strong>Code:</strong> ${this.escapeHtml(widget.code ? widget.code.substring(0, 100) + (widget.code.length > 100 ? '...' : '') : 'N/A')}</div>
                </div>
            `;
            container.appendChild(card);
        });

        // Attach event listeners
        container.querySelectorAll('.edit-widget').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.editWidget(index);
            });
        });

        container.querySelectorAll('.delete-widget').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.deleteWidget(index);
            });
        });
    }

    attachEventListeners() {
        // New location button
        document.getElementById('newLocationBtn').addEventListener('click', () => this.createNewLocation());

        // Save location button
        document.getElementById('saveBtn').addEventListener('click', () => this.saveCurrentLocation());

        // Delete location button
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteCurrentLocation());

        // Add widget button
        document.getElementById('addWidgetBtn').addEventListener('click', () => this.openWidgetModal());

        // Widget modal
        const modal = document.getElementById('widgetModal');
        document.querySelector('#widgetModal .close').addEventListener('click', () => this.closeWidgetModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeWidgetModal());
        document.getElementById('saveWidgetBtn').addEventListener('click', () => this.saveWidget());

        // Preview button
        document.getElementById('previewBtn').addEventListener('click', () => this.previewIframe());

        // Copy URL button
        document.getElementById('copyUrlBtn').addEventListener('click', () => this.copyIframeUrl());

        // Preview modal
        document.querySelector('#previewModal .close').addEventListener('click', () => {
            document.getElementById('previewModal').style.display = 'none';
        });

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.id === 'widgetModal') {
                this.closeWidgetModal();
            }
            if (e.target.id === 'previewModal') {
                document.getElementById('previewModal').style.display = 'none';
            }
        });
    }

    createNewLocation() {
        const name = prompt('Enter location name:');
        if (!name) return;

        const location = {
            id: Date.now().toString(),
            name: name.trim(),
            widgets: []
        };

        this.locations.push(location);
        this.saveLocations();
        this.selectLocation(location.id);
    }

    saveCurrentLocation() {
        if (!this.currentLocationId) return;

        const location = this.locations.find(l => l.id === this.currentLocationId);
        if (!location) return;

        const name = document.getElementById('locationNameInput').value.trim();
        if (!name) {
            alert('Please enter a location name');
            return;
        }

        location.name = name;
        this.saveLocations();
        this.renderLocations();
        document.getElementById('locationName').textContent = name;
        alert('Location saved successfully!');
    }

    deleteCurrentLocation() {
        if (!this.currentLocationId) return;

        if (!confirm('Are you sure you want to delete this location?')) return;

        this.locations = this.locations.filter(l => l.id !== this.currentLocationId);
        this.saveLocations();
        this.currentLocationId = null;

        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('locationEditor').style.display = 'none';
        this.renderLocations();
    }

    openWidgetModal(widgetIndex = null) {
        this.editingWidgetId = widgetIndex;
        const modal = document.getElementById('widgetModal');
        const title = document.getElementById('modalTitle');

        if (widgetIndex !== null) {
            const location = this.locations.find(l => l.id === this.currentLocationId);
            const widget = location.widgets[widgetIndex];
            title.textContent = 'Edit Widget';
            document.getElementById('widgetName').value = widget.name;
            document.getElementById('widgetCode').value = widget.code || '';
        } else {
            title.textContent = 'Add Widget';
            document.getElementById('widgetName').value = '';
            document.getElementById('widgetCode').value = `async function getWidgetData() {
  // Your code here
  // Make POST requests, do calculations, etc.
  // Available variables:
  // - selectedDateStart, selectedDateEnd (YYYY-MM-DD format)
  // - selectedDateGT, selectedDateLT (ISO format for gt/lt queries)
  // - locationId, fetch
  
  // Example: Make a POST request with date range
  const response = await fetch('https://api.example.com/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field: 'dateUpdated',
      operator: 'range',
      value: {
        gt: selectedDateGT,  // ISO format: "2024-01-15T00:00:00.000Z"
        lt: selectedDateLT   // ISO format: "2024-01-20T23:59:59.999Z"
      }
    })
  });
  
  const data = await response.json();
  return data.value || '0';
}

return await getWidgetData();`;
        }

        modal.style.display = 'block';
    }

    closeWidgetModal() {
        document.getElementById('widgetModal').style.display = 'none';
        this.editingWidgetId = null;
    }

    async saveWidget() {
        const name = document.getElementById('widgetName').value.trim();
        const code = document.getElementById('widgetCode').value.trim();

        if (!name) {
            alert('Please enter a widget name');
            return;
        }

        if (!code) {
            alert('Please enter JavaScript code');
            return;
        }

        // Basic syntax validation
        try {
            // Try to create a function to validate syntax
            new Function(code);
        } catch (error) {
            if (!confirm('There may be a syntax error in your code. Save anyway?')) {
                return;
            }
        }
        
        const widget = {
            id: this.editingWidgetId !== null ? 
                this.locations.find(l => l.id === this.currentLocationId).widgets[this.editingWidgetId].id :
                Date.now().toString(),
            name,
            code
        };

        const location = this.locations.find(l => l.id === this.currentLocationId);
        if (this.editingWidgetId !== null) {
            location.widgets[this.editingWidgetId] = widget;
        } else {
            location.widgets.push(widget);
        }

        this.saveLocations();
        this.renderWidgets(location.widgets);
        this.closeWidgetModal();
    }

    editWidget(index) {
        this.openWidgetModal(index);
    }

    deleteWidget(index) {
        if (!confirm('Are you sure you want to delete this widget?')) return;

        const location = this.locations.find(l => l.id === this.currentLocationId);
        location.widgets.splice(index, 1);
        this.saveLocations();
        this.renderWidgets(location.widgets);
    }

    previewIframe() {
        if (!this.currentLocationId) return;

        const location = this.locations.find(l => l.id === this.currentLocationId);
        if (!location || location.widgets.length === 0) {
            alert('Please add at least one widget before previewing');
            return;
        }

        // Save configuration to localStorage for iframe to read
        localStorage.setItem('ghl-current-location', JSON.stringify(location));

        const modal = document.getElementById('previewModal');
        const iframe = document.getElementById('previewIframe');
        // Pass locationId as URL parameter for better compatibility
        iframe.src = `iframe.html?locationId=${location.id}&t=${Date.now()}`; // Force reload
        modal.style.display = 'block';
    }

    getIframeUrl(locationId) {
        // Generate iframe URL for embedding
        const location = this.locations.find(l => l.id === locationId);
        if (!location) return null;
        
        // Get current page URL to construct absolute path
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        return `${baseUrl}iframe.html?locationId=${locationId}`;
    }

    copyIframeUrl() {
        if (!this.currentLocationId) {
            alert('Please select a location first');
            return;
        }

        const url = this.getIframeUrl(this.currentLocationId);
        if (!url) {
            alert('Could not generate URL');
            return;
        }

        // Copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('Iframe URL copied to clipboard!\n\nUse this URL to embed in GoHighLevel:\n' + url);
        }).catch(err => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('Iframe URL copied to clipboard!\n\nUse this URL to embed in GoHighLevel:\n' + url);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new IframeManager();
});

