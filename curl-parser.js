// Utility to parse cURL commands and convert them to fetch-compatible format

function parseCurlCommand(curlCommand) {
    // Remove extra whitespace and normalize
    let command = curlCommand.trim();
    
    // Remove 'curl' prefix if present
    command = command.replace(/^curl\s+/i, '');
    
    const result = {
        url: null,
        method: 'GET',
        headers: {},
        body: null
    };

    // Extract URL (usually the last argument or after -X)
    const urlMatch = command.match(/https?:\/\/[^\s'"]+/);
    if (urlMatch) {
        result.url = urlMatch[0];
    } else {
        throw new Error('Could not find URL in cURL command');
    }

    // Extract method (-X POST, -X GET, etc.)
    const methodMatch = command.match(/-X\s+(\w+)/i);
    if (methodMatch) {
        result.method = methodMatch[1].toUpperCase();
    }

    // Extract headers (-H "Header: Value")
    const headerMatches = command.matchAll(/-H\s+['"]([^'"]+)['"]/g);
    for (const match of headerMatches) {
        const header = match[1];
        const colonIndex = header.indexOf(':');
        if (colonIndex > 0) {
            const key = header.substring(0, colonIndex).trim();
            const value = header.substring(colonIndex + 1).trim();
            result.headers[key] = value;
        }
    }

    // Extract data/body (-d or --data)
    const dataMatch = command.match(/(?:-d|--data)\s+['"]([^'"]+)['"]/);
    if (dataMatch) {
        result.body = dataMatch[1];
    } else {
        // Try without quotes
        const dataMatch2 = command.match(/(?:-d|--data)\s+([^\s]+)/);
        if (dataMatch2) {
            result.body = dataMatch2[1];
        }
    }

    // Extract data-binary
    const dataBinaryMatch = command.match(/(?:--data-binary)\s+['"]([^'"]+)['"]/);
    if (dataBinaryMatch) {
        result.body = dataBinaryMatch[1];
    }

    // Extract JSON data (--data-raw)
    const dataRawMatch = command.match(/(?:--data-raw)\s+['"]([^'"]+)['"]/);
    if (dataRawMatch) {
        result.body = dataRawMatch[1];
    }

    // If body exists and no Content-Type header, try to detect JSON
    if (result.body && !result.headers['Content-Type']) {
        try {
            JSON.parse(result.body);
            result.headers['Content-Type'] = 'application/json';
        } catch (e) {
            // Not JSON, might be form data
            if (result.body.includes('=')) {
                result.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
        }
    }

    return result;
}

