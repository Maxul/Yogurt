const apiKeyInput = document.getElementById('apiKey');

window.onload = () => {
    const savedKey = localStorage.getItem('api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }
};

apiKeyInput.addEventListener('change', () => {
    localStorage.setItem('api_key', apiKeyInput.value);
});

async function llm_call(prompt) {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const model = "llama-3.1-8b-instant";
    const apiKey = apiKeyInput.value;
    if (!apiKey) {
        alert("API Key is missing! Please input it in the header.");
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt + " (output JSON only)" }],
            temperature: 0.1,
            max_completion_tokens: 1024,
            top_p: 1,
            stream: false,
            stop: null,
            response_format: { type: "json_object" }
        })
    });
    const data = await response.json();
    result = data.choices[0].message.content;
    // console.log(JSON.stringify(result));
    return result;
}

async function llm_do(intent) {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const model = "groq/compound";
    const apiKey = apiKeyInput.value;
    if (!apiKey) {
        alert("API Key is missing! Please input it in the header.");
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: intent }],
            temperature: 1,
            max_completion_tokens: 1024,
            top_p: 1,
            stream: false,
            stop: null,
            compound_custom: {
            "tools": {"enabled_tools": ["web_search", "code_interpreter", "visit_website"]}
        }}),
    });
    const data = await response.json();
    result = data.choices[0].message.content;
    console.log(JSON.stringify(result));
    return result;
}