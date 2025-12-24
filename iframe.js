// Iframe logic for displaying widgets and executing JavaScript code

class DashboardIframe {
    constructor() {
        const today = new Date().toISOString().split('T')[0];
        this.selectedDateStart = today;
        this.selectedDateEnd = today;
        this.config = null;
        this.locationId = null;
        this.init();
    }

    init() {
        this.loadConfig();
        this.setupDateSelector();
        this.renderWidgets();
    }

    loadConfig() {
        // Try to get location ID from URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        this.locationId = urlParams.get('locationId');
        
        // Try to get config from URL parameter (base64 encoded) - for cross-origin embedding
        const configParam = urlParams.get('config');
        if (configParam) {
            try {
                const decoded = decodeURIComponent(atob(configParam));
                this.config = JSON.parse(decoded);
                if (this.config && this.config.id) {
                    this.locationId = this.config.id;
                }
                console.log('Loaded config from URL parameter');
                return;
            } catch (e) {
                console.error('Error parsing config from URL:', e);
            }
        }
        
        // Get configuration from localStorage (works for same-origin)
        let configStr = null;
        
        if (this.locationId) {
            try {
                // Load specific location by ID
                const allLocations = JSON.parse(localStorage.getItem('ghl-locations') || '[]');
                const location = allLocations.find(l => l.id === this.locationId);
                if (location) {
                    this.config = location;
                    console.log('Loaded config from localStorage by locationId:', this.locationId);
                    return;
                } else {
                    console.warn('Location not found in localStorage:', this.locationId);
                }
            } catch (e) {
                console.error('Error accessing localStorage:', e);
            }
        }
        
        // Fallback to current location (for preview mode)
        try {
            configStr = localStorage.getItem('ghl-current-location');
            if (configStr) {
                try {
                    this.config = JSON.parse(configStr);
                    if (this.config && this.config.id) {
                        this.locationId = this.config.id;
                    }
                    console.log('Loaded config from ghl-current-location');
                    return;
                } catch (e) {
                    console.error('Error parsing config:', e);
                }
            }
        } catch (e) {
            console.error('Error accessing localStorage for current location:', e);
        }
        
        // If we have a locationId but no config yet, try to fetch from API
        if (this.locationId && !this.config) {
            this.fetchConfigFromAPI();
            return; // fetchConfigFromAPI will handle rendering
        }
        
        // No configuration found
        console.error('No configuration found. locationId:', this.locationId);
        
        // Show error (fetchConfigFromAPI was already called if locationId exists)
        if (!this.locationId) {
            this.showConfigError();
        }
    }

    setupDateSelector() {
        const dateStartInput = document.getElementById('dateStart');
        const dateEndInput = document.getElementById('dateEnd');
        const maxDate = new Date().toISOString().split('T')[0]; // Prevent future dates

        dateStartInput.value = this.selectedDateStart;
        dateStartInput.max = maxDate;
        
        dateEndInput.value = this.selectedDateEnd;
        dateEndInput.max = maxDate;

        // Update end date min to be at least the start date
        dateStartInput.addEventListener('change', (e) => {
            this.selectedDateStart = e.target.value;
            if (this.selectedDateStart > this.selectedDateEnd) {
                this.selectedDateEnd = this.selectedDateStart;
                dateEndInput.value = this.selectedDateEnd;
            }
            dateEndInput.min = this.selectedDateStart;
            this.renderWidgets();
        });

        dateEndInput.addEventListener('change', (e) => {
            this.selectedDateEnd = e.target.value;
            if (this.selectedDateEnd < this.selectedDateStart) {
                this.selectedDateStart = this.selectedDateEnd;
                dateStartInput.value = this.selectedDateStart;
            }
            this.renderWidgets();
        });

        // Set initial min for end date
        dateEndInput.min = this.selectedDateStart;

        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.renderWidgets();
        });
    }

    // Convert date string (YYYY-MM-DD) to ISO format with time
    // gt: start of day (00:00:00.000Z)
    // lt: end of day (23:59:59.999Z)
    getDateGT(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString + 'T00:00:00.000Z');
        return date.toISOString();
    }

    getDateLT(dateString) {
        if (!dateString) return null;
        // End of day: 23:59:59.999Z
        const date = new Date(dateString + 'T23:59:59.999Z');
        return date.toISOString();
    }

    renderWidgets() {
        const container = document.getElementById('widgetsContainer');
        
        console.log('renderWidgets called. Config:', this.config);
        
        if (!this.config) {
            console.error('No config available');
            container.innerHTML = '<div class="loading-state"><p>No configuration loaded.</p></div>';
            return;
        }
        
        if (!this.config.widgets || this.config.widgets.length === 0) {
            console.warn('Config loaded but no widgets found');
            container.innerHTML = '<div class="loading-state"><p>No widgets configured.</p></div>';
            return;
        }

        console.log(`Rendering ${this.config.widgets.length} widget(s)`);
        container.innerHTML = '';

        this.config.widgets.forEach((widget, index) => {
            console.log(`Creating widget ${index + 1}:`, widget.name);
            const widgetElement = this.createWidgetElement(widget);
            container.appendChild(widgetElement);
            this.executeWidgetCode(widget, widgetElement);
        });
    }

    createWidgetElement(widget) {
        const div = document.createElement('div');
        div.className = 'widget';
        div.id = `widget-${widget.id}`;
        
        div.innerHTML = `
            <div class="widget-header">
                <p class="widget-title">${this.escapeHtml(widget.name)}</p>
            </div>
            <div class="widget-content">
                <div class="widget-value loading">Loading...</div>
            </div>
        `;

        return div;
    }

    async executeWidgetCode(widget, widgetElement) {
        try {
            const valueElement = widgetElement.querySelector('.widget-value');
            const errorElement = widgetElement.querySelector('.widget-error');
            
            if (errorElement) {
                errorElement.remove();
            }

            valueElement.textContent = 'Loading...';
            valueElement.classList.add('loading');

            if (!widget.code) {
                throw new Error('No code provided for widget');
            }

            // Create a safe execution context with available variables
            const selectedDateStart = this.selectedDateStart; // YYYY-MM-DD format
            const selectedDateEnd = this.selectedDateEnd; // YYYY-MM-DD format
            const selectedDateGT = this.getDateGT(this.selectedDateStart); // ISO format for gt (greater than)
            const selectedDateLT = this.getDateLT(this.selectedDateEnd); // ISO format for lt (less than)
            const locationId = this.locationId;
            const fetch = window.fetch.bind(window);

            // Execute the widget code
            // Create an async function that executes the user's code
            const executeCode = new Function('selectedDateStart', 'selectedDateEnd', 'selectedDateGT', 'selectedDateLT', 'locationId', 'fetch', `
                return (async function() {
                    ${widget.code}
                })();
            `);

            const result = await executeCode(selectedDateStart, selectedDateEnd, selectedDateGT, selectedDateLT, locationId, fetch);
            
            // Convert result to string
            let displayValue = '';
            if (result !== null && result !== undefined) {
                displayValue = String(result);
            } else {
                displayValue = 'N/A';
            }

            // Update widget with result
            valueElement.textContent = displayValue;
            valueElement.classList.remove('loading');

        } catch (error) {
            console.error('Error executing widget code:', error);
            const valueElement = widgetElement.querySelector('.widget-value');
            valueElement.textContent = 'Error';
            valueElement.classList.remove('loading');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'widget-error';
            errorDiv.textContent = error.message;
            widgetElement.querySelector('.widget-content').appendChild(errorDiv);
        }
    }

    async fetchConfigFromAPI() {
        if (!this.locationId) {
            this.showConfigError('No locationId provided');
            return;
        }

        const container = document.getElementById('widgetsContainer');
        container.innerHTML = '<div class="loading-state"><p>Loading configuration...</p></div>';

        try {
            // Try to fetch from API endpoint
            // Construct API URL from current origin
            const apiUrl = `${window.location.origin}${window.location.pathname.replace('iframe.html', '')}api/config/${this.locationId}`;
            
            console.log('Attempting to fetch config from API:', apiUrl);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                this.config = await response.json();
                console.log('Loaded config from API');
                this.renderWidgets();
                return;
            } else if (response.status === 404) {
                // API endpoint doesn't exist, show helpful message
                this.showConfigError('API endpoint not available. Configuration must be provided via URL parameter or localStorage.');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching config from API:', error);
            // API fetch failed, show error
            this.showConfigError('Could not load configuration. API endpoint may not be available.');
        }
    }

    showConfigError(customMessage = null) {
        const container = document.getElementById('widgetsContainer');
        
        // Check if we're in a cross-origin iframe
        let errorMessage = '<div class="loading-state">';
        errorMessage += '<p><strong>No configuration found.</strong></p>';
        errorMessage += '<p style="font-size: 14px; margin-top: 10px;">';
        
        if (customMessage) {
            errorMessage += customMessage;
        } else {
            try {
                // Try to access parent to see if we're in an iframe
                if (window.parent !== window) {
                    errorMessage += 'The iframe is embedded cross-origin and cannot access localStorage.<br>';
                    errorMessage += 'The configuration is too large to include in the URL.<br><br>';
                    errorMessage += '<strong>Solution:</strong> Implement a backend API endpoint at <code>/api/config/:locationId</code> to serve configurations.';
                } else {
                    errorMessage += 'Please configure widgets in the main app or provide a locationId parameter.';
                }
            } catch (e) {
                // Cross-origin error accessing parent
                errorMessage += 'The iframe is embedded cross-origin and cannot access localStorage.<br>';
                errorMessage += 'The configuration is too large to include in the URL.<br><br>';
                errorMessage += '<strong>Solution:</strong> Implement a backend API endpoint at <code>/api/config/:locationId</code> to serve configurations.';
            }
        }
        
        errorMessage += '</p>';
        errorMessage += '<p style="font-size: 12px; margin-top: 10px; color: #666;">Location ID: ' + (this.locationId || 'none') + '</p>';
        errorMessage += '</div>';
        
        container.innerHTML = errorMessage;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize iframe when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DashboardIframe();
});
