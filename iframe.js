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
        
        // Get configuration from localStorage
        let configStr = null;
        
        if (this.locationId) {
            // Load specific location by ID
            const allLocations = JSON.parse(localStorage.getItem('ghl-locations') || '[]');
            const location = allLocations.find(l => l.id === this.locationId);
            if (location) {
                this.config = location;
                return;
            }
        }
        
        // Fallback to current location (for preview mode)
        configStr = localStorage.getItem('ghl-current-location');
        if (configStr) {
            try {
                this.config = JSON.parse(configStr);
                if (this.config && this.config.id) {
                    this.locationId = this.config.id;
                }
                return;
            } catch (e) {
                console.error('Error parsing config:', e);
            }
        }
        
        // No configuration found
        document.getElementById('widgetsContainer').innerHTML = 
            '<div class="loading-state"><p>No configuration found. Please configure widgets in the main app or provide a locationId parameter.</p></div>';
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
        
        if (!this.config || !this.config.widgets || this.config.widgets.length === 0) {
            container.innerHTML = '<div class="loading-state"><p>No widgets configured.</p></div>';
            return;
        }

        container.innerHTML = '';

        this.config.widgets.forEach(widget => {
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
