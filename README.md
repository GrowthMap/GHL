# GHL Dashboard Iframe App

A custom iframe application for GoHighLevel dashboard that allows you to create dynamic metric widgets with custom JavaScript code and API integrations.

## Features

- **Location Management**: Create and manage multiple locations, each with its own set of widgets
- **JavaScript-Based Widgets**: Write custom JavaScript code for each widget with full flexibility
- **Multiple POST Requests**: Make multiple API calls and perform custom calculations per widget
- **Date Selection**: Each iframe includes a date selector - the selected date is available as `selectedDate` variable
- **Custom Styling**: Widgets use a specific design matching GoHighLevel dashboard style
- **Live Preview**: Preview your iframe before embedding

## Getting Started

1. Open `index.html` in your web browser
2. Click "New Location" to create your first location
3. Add widgets by clicking "+ Add Widget"
4. Write JavaScript code that returns a string to display
5. Preview your iframe using the "Preview" button

## Widget Configuration

### JavaScript Code

Each widget executes JavaScript code that must return a string. The code has access to:

- **`selectedDateStart`**: The start date of the range (string format: YYYY-MM-DD)
- **`selectedDateEnd`**: The end date of the range (string format: YYYY-MM-DD)
- **`selectedDateGT`**: Start date in ISO format for "greater than" queries (format: `YYYY-MM-DDTHH:mm:ss.SSSZ`, e.g., `"2024-01-15T00:00:00.000Z"`)
- **`selectedDateLT`**: End date in ISO format for "less than" queries (format: `YYYY-MM-DDTHH:mm:ss.SSSZ`, e.g., `"2024-01-15T23:59:59.999Z"`)
- **`locationId`**: The current location ID (string)
- **`fetch`**: The standard fetch API for making HTTP requests

### Example Widget Code with Date Range

```javascript
async function getWidgetData() {
  // Make a POST request with date range using gt and lt
  const response = await fetch('https://api.example.com/metrics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({
      field: 'dateUpdated',
      operator: 'range',
      value: {
        gt: selectedDateGT,  // ISO format: "2024-01-15T00:00:00.000Z"
        lt: selectedDateLT   // ISO format: "2024-01-20T23:59:59.999Z"
      },
      locationId: locationId
    })
  });
  
  const data = await response.json();
  
  // Make another request if needed
  const response2 = await fetch('https://api.example.com/other', {
    method: 'POST',
    body: JSON.stringify({ 
      dateStart: selectedDateStart,  // "2024-01-15"
      dateEnd: selectedDateEnd       // "2024-01-20"
    })
  });
  const data2 = await response2.json();
  
  // Perform custom calculations
  const total = data.total + data2.additional;
  const percentage = ((total / data.goal) * 100).toFixed(1);
  
  // Return the string to display
  return `$${total.toLocaleString()} (${percentage}%)`;
}

return await getWidgetData();
```

### Multiple Requests with Date Range Example

```javascript
async function getWidgetData() {
  // First request with date range
  const req1 = fetch('https://api.example.com/revenue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filter: {
        dateUpdated: {
          gte: selectedDateGT,
          lte: selectedDateLT
        }
      }
    })
  });
  
  // Second request (parallel) with same date range
  const req2 = fetch('https://api.example.com/costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filter: {
        dateUpdated: {
          gt: selectedDateGT,
          lt: selectedDateLT
        }
      }
    })
  });
  
  // Wait for both
  const [res1, res2] = await Promise.all([req1, req2]);
  const data1 = await res1.json();
  const data2 = await res2.json();
  
  // Calculate profit
  const profit = data1.revenue - data2.costs;
  
  return `$${profit.toLocaleString()}`;
}

return await getWidgetData();
```

### Date Format Reference

- **`selectedDateGT`**: ISO string format for "greater than or equal" queries
  - Format: `"YYYY-MM-DDTHH:mm:ss.SSSZ"`
  - Example: `"2024-01-15T00:00:00.000Z"` (start of day)
  - Use for: `gt`, `gte` operators

- **`selectedDateLT`**: ISO string format for "less than" queries
  - Format: `"YYYY-MM-DDTHH:mm:ss.SSSZ"`
  - Example: `"2024-01-20T23:59:59.999Z"` (end of day)
  - Use for: `lt`, `lte` operators

- **`selectedDateStart`**: Simple date string (YYYY-MM-DD)
  - Example: `"2024-01-15"`
  - Use when you need just the date without time

- **`selectedDateEnd`**: Simple date string (YYYY-MM-DD)
  - Example: `"2024-01-20"`
  - Use when you need just the date without time

## Widget Design

Each widget has a specific design matching GoHighLevel dashboard:
- Fixed dimensions: 142.896px width × 308px height
- White background with subtle border
- Roboto font family
- Centered content display
- The returned string is displayed as-is in the widget

## Embedding in GoHighLevel

1. Configure your widgets in the main app
2. Click "Copy Iframe URL" to get the embeddable URL
3. Embed in your GoHighLevel dashboard using an iframe widget
4. The iframe will automatically load the configuration using the `locationId` parameter

## Storage

All configurations are stored in browser localStorage under the key `ghl-locations`. This means:
- Configurations persist between sessions
- Each browser has its own set of configurations
- For production use, consider implementing a backend API

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Uses localStorage API

## Customization

### Styling
- Main app styles: `styles.css`
- Iframe styles: `iframe-styles.css`

### Widget Colors
Each widget can have a custom color that appears as a top border.

## Troubleshooting

### Widget Not Loading
- Check browser console for errors
- Verify your JavaScript code syntax is correct
- Ensure the code returns a value (or uses `return` statement)
- Check that API endpoints are accessible
- Verify CORS settings if making cross-origin requests

### Code Execution Errors
- Make sure your code is wrapped in an async function if using `await`
- Ensure you're using `return` to return the final value
- Check that all variables are properly defined
- Use `console.log()` for debugging (check browser console)

### Date Range Not Working
- The date range variables are automatically available in your code
- `selectedDateGT` and `selectedDateLT` are in ISO format: `"YYYY-MM-DDTHH:mm:ss.SSSZ"`
- `selectedDateStart` and `selectedDateEnd` are simple date strings: `"YYYY-MM-DD"`
- Use `selectedDateGT` for `gt`/`gte` operators and `selectedDateLT` for `lt`/`lte` operators
- The end date picker automatically prevents selecting dates before the start date

### Configuration Not Saving
- Check browser localStorage is enabled
- Clear browser cache if issues persist
- Ensure you're using the same browser/domain

## Code Tips

- Always use `async/await` for fetch requests
- Handle errors with try/catch if needed
- Format numbers with `.toLocaleString()` for better display
- Use `Promise.all()` for parallel requests
- Return a string - numbers will be converted automatically

