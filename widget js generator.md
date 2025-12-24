I need JavaScript code for a dashboard widget that will be executed in a specific context. Please generate the code according to these requirements:

**EXECUTION CONTEXT:**
- The code will be wrapped in an async function and executed immediately
- The code MUST return a value (not just execute code)
- The returned value will be automatically converted to a string and displayed in the widget
- If the code returns null or undefined, the widget will display "N/A"
- If the code throws an error, the widget will display "Error" with the error message

**AVAILABLE VARIABLES:**
- `selectedDateGT` (string): Start date in ISO 8601 format for "greater than" queries (e.g., "2024-01-15T00:00:00.000Z")
- `selectedDateLT` (string): End date in ISO 8601 format for "less than" queries (e.g., "2024-01-20T23:59:59.999Z")
- `fetch` (function): Standard fetch API for making HTTP requests

**REQUIREMENTS:**
1. The code MUST end with a `return` statement that returns the final value to display
2. You can use async/await since the code runs in an async context
3. You can make multiple POST/GET requests using the `fetch` function
4. The return value can be a string, number, or any value (it will be converted to string)
5. Handle errors appropriately - either with try/catch or let them bubble up (they will be caught and displayed)

**WIDGET SPECIFICATIONS:**

We will have to call to POST requests. Here is cUrl for

Total Webinar Registrations

curl -L 'https://services.leadconnectorhq.com/contacts/search' \
-H 'Content-Type: application/json' \
-H 'Version: 2021-07-28' \
-H 'Authorization: Bearer pit-6ef0dc9e-0216-4da6-b384-0be64cab8652' \
-d '{
  "locationId": "o525E31QSTYfIkbtnCqU",
  "page": 1,
  "pageLimit": 500,
  "filters": [
    {
      "group": "AND",
      "filters": [
        {
          "field": "tags",
          "operator": "eq",
          "value": ["booked"]
        },
        {
          "field": "customFields.WVT8a6Veh1pk0NaUnKvl",
          "operator": "range",
          "value": {
            "gt": "selectedDateGT",
            "lt": "selectedDateLT"
          }
        }
      ]
    }
  ]
}'


New Buyers From Webinar No show

curl -L 'https://services.leadconnectorhq.com/contacts/search' \
-H 'Content-Type: application/json' \
-H 'Version: 2021-07-28' \
-H 'Authorization: Bearer pit-6ef0dc9e-0216-4da6-b384-0be64cab8652' \
-d '{
  "locationId": "o525E31QSTYfIkbtnCqU",
  "page": 1,
  "pageLimit": 500,
  "filters": [
    {
      "group": "AND",
      "filters": [
        {
          "field": "type",
          "operator": "eq",
          "value": "customer"
        },
         {
          "field": "tags",
          "operator": "eq",
          "value": ["webinar no show"]
        },
        {
          "field": "customFields.WVT8a6Veh1pk0NaUnKvl",
          "operator": "range",
          "value": {
            "gt": "selectedDateGT",
            "lt": "selectedDateLT"
          }
        }
      ]
    }
  ]
}'



I want to output New No Show Buyers / total registrants. So, I get Conversion Rate From No Show as output. I want to output this as a percentage string like "3.05%" for example


**EXAMPLE STRUCTURE:**ipt
async function getWidgetData() {
  // Your code here
  // Use selectedDateGT and selectedDateLT for date range queries
  // Make fetch requests, perform calculations, etc.
  return 'final value to display';
}

return await getWidgetData();Please generate the complete JavaScript code that I can paste directly into the widget configuration.